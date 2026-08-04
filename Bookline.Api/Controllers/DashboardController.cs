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
[Route("api/dashboard")]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> Summary(
        [FromQuery] DateTime from,
        [FromQuery] DateTime to,
        CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Problem(
                title: "No business on this account",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var fromUtc = DateTime.SpecifyKind(from, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(to, DateTimeKind.Utc);

        var appointments = await db.Appointments
            .Where(a => a.BusinessId == businessId && a.StartsAt >= fromUtc && a.StartsAt < toUtc)
            .Select(a => new
            {
                a.StartsAt,
                a.EndsAt,
                a.PricePence,
                a.Status,
                ServiceName = a.Service.Name,
            })
            .ToListAsync(ct);

        var billable = appointments
            .Where(a => a.Status != AppointmentStatus.Cancelled)
            .ToList();

        var bookedMinutes = billable.Sum(a => (a.EndsAt - a.StartsAt).TotalMinutes);

        // Capacity = every active staff member's shift minutes for each day in the range.
        var shifts = await db.StaffShifts
            .Where(s => s.Staff.BusinessId == businessId && s.Staff.IsActive)
            .Select(s => new { s.DayOfWeek, s.StartTime, s.EndTime })
            .ToListAsync(ct);

        var capacityMinutes = 0d;
        for (var day = DateOnly.FromDateTime(fromUtc); day < DateOnly.FromDateTime(toUtc); day = day.AddDays(1))
        {
            capacityMinutes += shifts
                .Where(s => s.DayOfWeek == day.DayOfWeek)
                .Sum(s => (s.EndTime - s.StartTime).TotalMinutes);
        }

        var utilisation = capacityMinutes > 0
            ? Math.Round(bookedMinutes / capacityMinutes * 100, 1)
            : 0;

        var topServices = billable
            .GroupBy(a => a.ServiceName)
            .Select(g => new NamedCountDto(g.Key, g.Count(), g.Sum(a => a.PricePence)))
            .OrderByDescending(s => s.Count)
            .Take(5)
            .ToArray();

        var perDay = billable
            .GroupBy(a => DateOnly.FromDateTime(a.StartsAt))
            .Select(g => new DayCountDto(
                g.Key.ToString("yyyy-MM-dd"),
                g.Count(),
                g.Sum(a => a.PricePence)))
            .OrderBy(d => d.Date)
            .ToArray();

        var statusMix = appointments
            .GroupBy(a => a.Status)
            .Select(g => new NamedCountDto(g.Key.ToString(), g.Count(), g.Sum(a => a.PricePence)))
            .OrderByDescending(s => s.Count)
            .ToArray();

        return Ok(new DashboardSummaryDto(
            Bookings: billable.Count,
            RevenuePence: billable.Sum(a => a.PricePence),
            UtilisationPercent: utilisation,
            CancellationCount: appointments.Count(a => a.Status == AppointmentStatus.Cancelled),
            TopServices: topServices,
            BookingsPerDay: perDay,
            StatusMix: statusMix));
    }
}
