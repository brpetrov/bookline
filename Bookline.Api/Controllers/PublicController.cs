using Bookline.Api.Data;
using Bookline.Api.Domain;
using Bookline.Api.Dtos;
using Bookline.Api.Hubs;
using Bookline.Api.Services;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bookline.Api.Controllers;

[ApiController]
[Route("api/public/{slug}")]
public class PublicController(
    AvailabilityService availability,
    AppDbContext db,
    IValidator<CreateBookingRequest> bookingValidator,
    ScheduleNotifier notifier) : ControllerBase
{    
    [HttpGet("services")]
    public async Task<ActionResult<List<ServiceDto>>> GetServices(string slug, CancellationToken ct)
    {
        var businessId = await FindBusinessIdAsync(slug, ct);
        if (businessId is null)
        {
            return BusinessNotFound(slug);
        }

        var services = await db.Services
            .Where(s => s.BusinessId == businessId)
            .OrderBy(s => s.Name)
            .Select(s => new ServiceDto(s.Id, s.Name, s.DurationMinutes, s.PricePence, s.Colour))
            .ToListAsync(ct);

        return Ok(services);
    }

    [HttpGet("staff")]
    public async Task<ActionResult<List<StaffDto>>> GetStaff(
        string slug,
        [FromQuery] int? serviceId,
        CancellationToken ct)
    {
        var businessId = await FindBusinessIdAsync(slug, ct);
        if (businessId is null)
        {
            return BusinessNotFound(slug);
        }

        var query = db.Staff.Where(s => s.BusinessId == businessId && s.IsActive);

        if (serviceId is not null)
        {
            query = query.Where(s => s.StaffServices.Any(ss => ss.ServiceId == serviceId));
        }

        var staff = await query
            .OrderBy(s => s.Name)
            .Select(s => new StaffDto(s.Id, s.Name, s.Colour, s.AvatarUrl))
            .ToListAsync(ct);

        return Ok(staff);
    }

    [HttpPost("bookings")]
    public async Task<ActionResult<BookingConfirmationDto>> CreateBooking(
        string slug,
        CreateBookingRequest request,
        CancellationToken ct)
    {
        var validation = await bookingValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            foreach (var error in validation.Errors)
            {
                ModelState.AddModelError(error.PropertyName, error.ErrorMessage);
            }

            return ValidationProblem(ModelState);
        }

        var business = await db.Businesses
            .Where(b => b.Slug == slug)
            .Select(b => new { b.Id, b.Timezone })
            .FirstOrDefaultAsync(ct);

        if (business is null)
        {
            return BusinessNotFound(slug);
        }

        var service = await db.Services
            .FirstOrDefaultAsync(s => s.Id == request.ServiceId && s.BusinessId == business.Id, ct);

        if (service is null)
        {
            return Problem(
                title: "Service not found",
                detail: $"No service with id {request.ServiceId} exists for this business.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var staff = await db.Staff
            .FirstOrDefaultAsync(s => s.Id == request.StaffId
                                    && s.BusinessId == business.Id
                                    && s.IsActive, ct);

        if (staff is null)
        {
            return Problem(
                title: "Staff member not found",
                detail: $"No active staff member with id {request.StaffId} exists for this business.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var startsAtUtc = request.StartsAtUtc.ToUniversalTime();

        // Never trust the client's slot: re-derive availability and confirm it's still there.
        var timezone = TimeZoneInfo.FindSystemTimeZoneById(business.Timezone);
        var localDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(startsAtUtc, timezone));

        var days = await availability.GetAvailabilityAsync(
            slug, service.Id, staff.Id, localDate, localDate, ct);

        var bookable = days
            .SelectMany(d => d.Slots)
            .Any(s => s.StartsAtUtc == startsAtUtc && s.StaffId == staff.Id);

        if (!bookable)
        {
            return Problem(
                title: "Slot not available",
                detail: "That time is not a bookable slot, or it has just been taken.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var customer = await db.Customers
            .FirstOrDefaultAsync(c => c.BusinessId == business.Id
                                    && c.Email == request.CustomerEmail, ct);

        if (customer is null)
        {
            customer = new Customer
            {
                BusinessId = business.Id,
                Name = request.CustomerName,
                Email = request.CustomerEmail,
                Phone = request.CustomerPhone,
                CreatedAt = DateTime.UtcNow,
            };

            db.Customers.Add(customer);
        }

        var appointment = new Appointment
        {
            BusinessId = business.Id,
            StaffId = staff.Id,
            ServiceId = service.Id,
            Customer = customer,
            StartsAt = startsAtUtc,
            EndsAt = startsAtUtc.AddMinutes(service.DurationMinutes),
            Status = AppointmentStatus.Confirmed,
            PricePence = service.PricePence,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow,
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync(ct);

        await notifier.AppointmentCreated(business.Id, appointment.Id);

        return Ok(new BookingConfirmationDto(
            appointment.Id,
            service.Name,
            staff.Name,
            appointment.StartsAt,
            appointment.EndsAt,
            appointment.PricePence,
            customer.Name,
            customer.Email));
    }


    [HttpGet("availability")]
    public async Task<ActionResult<List<DayAvailability>>> GetAvailability(
        string slug,
        [FromQuery] int serviceId,
        [FromQuery] int? staffId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct)
    {
        var businessId = await FindBusinessIdAsync(slug, ct);
        if (businessId is null)
        {
            return BusinessNotFound(slug);
        }

        var start = from ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var end = to ?? start.AddDays(13);

        if (end < start)
        {
            return Problem(
                title: "Invalid date range",
                detail: "'to' must not be earlier than 'from'.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (end.DayNumber - start.DayNumber > 30)
        {
            return Problem(
                title: "Range too large",
                detail: "Availability can be requested for at most 31 days.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var days = await availability.GetAvailabilityAsync(slug, serviceId, staffId, start, end, ct);
        return Ok(days);
    }

    private Task<int?> FindBusinessIdAsync(string slug, CancellationToken ct) =>
        db.Businesses
            .Where(b => b.Slug == slug)
            .Select(b => (int?)b.Id)
            .FirstOrDefaultAsync(ct);

    private ObjectResult BusinessNotFound(string slug) => Problem(
        title: "Business not found",
        detail: $"No business exists with slug '{slug}'.",
        statusCode: StatusCodes.Status404NotFound);
}
