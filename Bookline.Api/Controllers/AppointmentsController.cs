using System.Linq.Expressions;
using Bookline.Api.Auth;
using Bookline.Api.Data;
using Bookline.Api.Domain;
using Bookline.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bookline.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/appointments")]
public class AppointmentsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AppointmentDto>>> GetRange(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return NoBusiness();
        }

        if (to <= from)
        {
            return Problem(
                title: "Invalid range",
                detail: "'to' must be after 'from'.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var fromUtc = AsUtc(from);
        var toUtc = AsUtc(to);

        var appointments = await db.Appointments
            .Where(a => a.BusinessId == businessId && a.StartsAt < toUtc && a.EndsAt > fromUtc)
            .OrderBy(a => a.StartsAt)
            .Select(ToDto)
            .ToListAsync(ct);

        return Ok(appointments);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AppointmentDto>> GetOne(int id, CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return NoBusiness();
        }

        var appointment = await db.Appointments
            .Where(a => a.Id == id && a.BusinessId == businessId)
            .Select(ToDto)
            .FirstOrDefaultAsync(ct);

        return appointment is null ? NotFoundAppointment(id) : Ok(appointment);
    }

    [HttpPost]
    public async Task<ActionResult<AppointmentDto>> Create(
        CreateAppointmentRequest request,
        CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return NoBusiness();
        }

        var service = await db.Services
            .FirstOrDefaultAsync(s => s.Id == request.ServiceId && s.BusinessId == businessId, ct);

        if (service is null)
        {
            return Problem(title: "Service not found", statusCode: StatusCodes.Status404NotFound);
        }

        var staffExists = await db.Staff
            .AnyAsync(s => s.Id == request.StaffId && s.BusinessId == businessId, ct);

        if (!staffExists)
        {
            return Problem(title: "Staff member not found", statusCode: StatusCodes.Status404NotFound);
        }

        var startsAt = AsUtc(request.StartsAtUtc);
        var endsAt = startsAt.AddMinutes(service.DurationMinutes);

        if (await OverlapsAsync(businessId, request.StaffId, startsAt, endsAt, null, ct))
        {
            return Conflict409();
        }

        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.BusinessId == businessId && c.Email == request.CustomerEmail, ct)
            ?? new Customer
            {
                BusinessId = businessId,
                Name = request.CustomerName,
                Email = request.CustomerEmail,
                Phone = request.CustomerPhone,
                CreatedAt = DateTime.UtcNow,
            };

        var appointment = new Appointment
        {
            BusinessId = businessId,
            StaffId = request.StaffId,
            ServiceId = service.Id,
            Customer = customer,
            StartsAt = startsAt,
            EndsAt = endsAt,
            Status = AppointmentStatus.Confirmed,
            PricePence = service.PricePence,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(ct);

        return await GetOne(appointment.Id, ct);
    }

    /// <summary>
    /// Reschedule, reassign, change status or edit notes. Unlike the public booking
    /// endpoint this does NOT enforce opening hours or shifts - staff legitimately
    /// squeeze people in outside them. It only refuses to double-book a person.
    /// </summary>
    [HttpPatch("{id:int}")]
    public async Task<ActionResult<AppointmentDto>> Update(
        int id,
        UpdateAppointmentRequest request,
        CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return NoBusiness();
        }

        var appointment = await db.Appointments
            .Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.Id == id && a.BusinessId == businessId, ct);

        if (appointment is null)
        {
            return NotFoundAppointment(id);
        }

        if (request.Status is not null)
        {
            if (!Enum.TryParse<AppointmentStatus>(request.Status, ignoreCase: true, out var status))
            {
                return Problem(
                    title: "Unknown status",
                    detail: $"'{request.Status}' is not one of: {string.Join(", ", Enum.GetNames<AppointmentStatus>())}.",
                    statusCode: StatusCodes.Status400BadRequest);
            }

            appointment.Status = status;
        }

        if (request.StaffId is int newStaffId && newStaffId != appointment.StaffId)
        {
            var canDo = await db.StaffServices
                .AnyAsync(ss => ss.StaffId == newStaffId && ss.ServiceId == appointment.ServiceId, ct);

            if (!canDo)
            {
                return Problem(
                    title: "Staff member cannot perform this service",
                    detail: "Assign a stylist who offers this service.",
                    statusCode: StatusCodes.Status409Conflict);
            }

            appointment.StaffId = newStaffId;
        }

        if (request.StartsAtUtc is DateTime newStart)
        {
            var startsAt = AsUtc(newStart);
            appointment.StartsAt = startsAt;
            appointment.EndsAt = startsAt.AddMinutes(appointment.Service.DurationMinutes);
        }

        if (request.Notes is not null)
        {
            appointment.Notes = request.Notes.Length == 0 ? null : request.Notes;
        }

        if (appointment.Status != AppointmentStatus.Cancelled &&
            await OverlapsAsync(businessId, appointment.StaffId, appointment.StartsAt, appointment.EndsAt, appointment.Id, ct))
        {
            return Conflict409();
        }

        await db.SaveChangesAsync(ct);

        return await GetOne(appointment.Id, ct);
    }

    /// <summary>Cancels rather than deletes - history must survive.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Cancel(int id, CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return NoBusiness();
        }

        var appointment = await db.Appointments
            .FirstOrDefaultAsync(a => a.Id == id && a.BusinessId == businessId, ct);

        if (appointment is null)
        {
            return NotFoundAppointment(id);
        }

        appointment.Status = AppointmentStatus.Cancelled;
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    private Task<bool> OverlapsAsync(
        int businessId,
        int staffId,
        DateTime startsAt,
        DateTime endsAt,
        int? ignoreId,
        CancellationToken ct) =>
        db.Appointments.AnyAsync(a =>
            a.BusinessId == businessId &&
            a.StaffId == staffId &&
            a.Id != ignoreId &&
            a.Status != AppointmentStatus.Cancelled &&
            a.StartsAt < endsAt &&
            startsAt < a.EndsAt, ct);

    private static DateTime AsUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
    };

    /// <summary>
    /// An Expression, not a method: EF Core can read into an expression tree and turn it
    /// into SQL joins. A method body is opaque to it, so EF would materialise entities and
    /// run the method client-side - where the navigation properties are null.
    /// </summary>
    private static readonly Expression<Func<Appointment, AppointmentDto>> ToDto = a => new AppointmentDto(
        a.Id,
        a.StaffId,
        a.Staff.Name,
        a.Staff.Colour,
        a.ServiceId,
        a.Service.Name,
        a.Service.Colour,
        a.Service.DurationMinutes,
        a.CustomerId,
        a.Customer.Name,
        a.Customer.Email,
        a.Customer.Phone,
        a.StartsAt,
        a.EndsAt,
        a.Status.ToString(),
        a.PricePence,
        a.Notes,
        a.CreatedAt);

    private ObjectResult NoBusiness() => Problem(
        title: "No business on this account",
        detail: "This login is not associated with a business.",
        statusCode: StatusCodes.Status403Forbidden);

    private ObjectResult NotFoundAppointment(int id) => Problem(
        title: "Appointment not found",
        detail: $"No appointment with id {id} exists for this business.",
        statusCode: StatusCodes.Status404NotFound);

    private ObjectResult Conflict409() => Problem(
        title: "Overlapping appointment",
        detail: "That stylist already has an appointment covering this time.",
        statusCode: StatusCodes.Status409Conflict);
}
