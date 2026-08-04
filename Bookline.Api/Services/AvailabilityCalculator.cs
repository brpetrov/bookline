using Bookline.Api.Domain;

namespace Bookline.Api.Services;

public record AvailableSlot(DateTime StartsAtUtc, int StaffId);

public record DayAvailability(DateOnly Date, List<AvailableSlot> Slots);

/// <summary>
/// (opening hours ∩ staff shift) − time off − existing appointments − buffers,
/// stepped by the slot interval. Pure: no database, no clock, no I/O.
/// </summary>
public static class AvailabilityCalculator
{
    public static List<DayAvailability> Calculate(
        DateOnly from,
        DateOnly to,
        Service service,
        IReadOnlyList<Staff> staff,
        IReadOnlyList<Appointment> existing,
        IReadOnlyList<OpeningHour> openingHours,
        TimeZoneInfo timezone,
        DateTime nowUtc,
        int slotIntervalMinutes = 15)
    {
        var days = new List<DayAvailability>();

        for (var date = from; date <= to; date = date.AddDays(1))
        {
            var slots = new List<AvailableSlot>();
            var opening = openingHours.FirstOrDefault(o => o.DayOfWeek == date.DayOfWeek);

            if (opening is not null)
            {
                foreach (var member in staff)
                {
                    slots.AddRange(SlotsFor(
                        date, service, member, existing, opening,
                        timezone, nowUtc, slotIntervalMinutes));
                }
            }

            days.Add(new DayAvailability(
                date,
                [.. slots.OrderBy(s => s.StartsAtUtc).ThenBy(s => s.StaffId)]));
        }

        return days;
    }

    private static IEnumerable<AvailableSlot> SlotsFor(
        DateOnly date,
        Service service,
        Staff member,
        IReadOnlyList<Appointment> existing,
        OpeningHour opening,
        TimeZoneInfo timezone,
        DateTime nowUtc,
        int slotIntervalMinutes)
    {
        var shift = member.Shifts.FirstOrDefault(s => s.DayOfWeek == date.DayOfWeek);
        if (shift is null)
        {
            yield break; // not working that day
        }

        var windowOpen = Later(opening.OpenTime, shift.StartTime);
        var windowClose = Earlier(opening.CloseTime, shift.EndTime);
        if (windowOpen >= windowClose)
        {
            yield break; // shift and opening hours don't overlap
        }

        var openUtc = ToUtc(date, windowOpen, timezone);
        var closeUtc = ToUtc(date, windowClose, timezone);
        var blocked = BlockedSpans(member, existing).ToList();

        for (var start = openUtc;
             start.AddMinutes(service.DurationMinutes) <= closeUtc;
             start = start.AddMinutes(slotIntervalMinutes))
        {
            if (start < nowUtc)
            {
                continue; // already in the past
            }

            // The candidate occupies its duration plus its own turnaround.
            var end = start.AddMinutes(service.DurationMinutes + service.BufferMinutes);

            if (blocked.Any(b => start < b.End && b.Start < end))
            {
                continue;
            }

            yield return new AvailableSlot(start, member.Id);
        }
    }

    /// <summary>
    /// Everything that makes a staff member unavailable. Appointments block their
    /// own time plus the turnaround after them. Cancelled ones block nothing.
    /// Requires <see cref="Appointment.Service"/> to be loaded.
    /// </summary>
    private static IEnumerable<(DateTime Start, DateTime End)> BlockedSpans(
        Staff member,
        IReadOnlyList<Appointment> existing)
    {
        foreach (var off in member.TimeOff)
        {
            yield return (off.StartsAt, off.EndsAt);
        }

        foreach (var appointment in existing.Where(a =>
                     a.StaffId == member.Id &&
                     a.Status != AppointmentStatus.Cancelled))
        {
            yield return (
                appointment.StartsAt,
                appointment.EndsAt.AddMinutes(appointment.Service.BufferMinutes));
        }
    }

    private static TimeOnly Later(TimeOnly a, TimeOnly b) => a > b ? a : b;

    private static TimeOnly Earlier(TimeOnly a, TimeOnly b) => a < b ? a : b;

    private static DateTime ToUtc(DateOnly date, TimeOnly time, TimeZoneInfo timezone)
    {
        var local = DateTime.SpecifyKind(date.ToDateTime(time), DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(local, timezone);
    }
}
