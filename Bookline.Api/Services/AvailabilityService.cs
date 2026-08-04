using Bookline.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Bookline.Api.Services;

public class AvailabilityService(AppDbContext db)
{
    public async Task<List<DayAvailability>> GetAvailabilityAsync(
        string businessSlug,
        int serviceId,
        int? staffId,
        DateOnly from,
        DateOnly to,
        CancellationToken ct = default)
    {
        var business = await db.Businesses
            .Include(b => b.OpeningHours)
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Slug == businessSlug, ct);

        if (business is null)
        {
            return [];
        }

        var service = await db.Services
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == serviceId && s.BusinessId == business.Id, ct);

        if (service is null)
        {
            return [];
        }

        var staffQuery = db.Staff
            .Where(s => s.BusinessId == business.Id && s.IsActive)
            .Where(s => s.StaffServices.Any(ss => ss.ServiceId == serviceId));

        if (staffId is not null)
        {
            staffQuery = staffQuery.Where(s => s.Id == staffId);
        }

        var staff = await staffQuery
            .Include(s => s.Shifts)
            .Include(s => s.TimeOff)
            .AsNoTracking()
            .ToListAsync(ct);

        if (staff.Count == 0)
        {
            return [];
        }

        // Deliberately loose bounds: this only has to be a *superset*. The calculator
        // does the exact overlap arithmetic, so ±1 day covers any timezone offset.
        // SpecifyKind(Utc) matters — see note below.
        var rangeStartUtc = DateTime.SpecifyKind(
            from.AddDays(-1).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
        var rangeEndUtc = DateTime.SpecifyKind(
            to.AddDays(2).ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

        var staffIds = staff.Select(s => s.Id).ToList();

        var existing = await db.Appointments
            .Where(a => staffIds.Contains(a.StaffId)
                        && a.StartsAt < rangeEndUtc
                        && a.EndsAt >= rangeStartUtc)
            .Include(a => a.Service)
            .AsNoTracking()
            .ToListAsync(ct);

        var timezone = TimeZoneInfo.FindSystemTimeZoneById(business.Timezone);

        return AvailabilityCalculator.Calculate(
            from, to, service, staff, existing,
            [.. business.OpeningHours], timezone, DateTime.UtcNow);
    }
}
