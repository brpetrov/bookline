namespace Bookline.Api.Dtos;

public record AppointmentDto(
    int Id,
    int StaffId,
    string StaffName,
    string StaffColour,
    int ServiceId,
    string ServiceName,
    string ServiceColour,
    int DurationMinutes,
    int CustomerId,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    string Status,
    int PricePence,
    string? Notes,
    DateTime CreatedAtUtc);

public record CreateAppointmentRequest(
    int StaffId,
    int ServiceId,
    DateTime StartsAtUtc,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string? Notes);

/// <summary>Every field optional - a PATCH changes only what it sends.</summary>
public record UpdateAppointmentRequest(
    DateTime? StartsAtUtc,
    int? StaffId,
    string? Status,
    string? Notes);

public record ServiceWriteRequest(
    string Name,
    int DurationMinutes,
    int PricePence,
    string Colour,
    int BufferMinutes);

public record StaffWriteRequest(
    string Name,
    string Email,
    string Colour,
    string? AvatarUrl,
    bool IsActive,
    int[] ServiceIds);

public record StaffAdminDto(
    int Id,
    string Name,
    string Email,
    string Colour,
    string? AvatarUrl,
    bool IsActive,
    int[] ServiceIds);

public record OpeningHourDto(int Id, int DayOfWeek, string OpenTime, string CloseTime);

public record OpeningHourWriteRequest(int DayOfWeek, string OpenTime, string CloseTime);

public record DashboardSummaryDto(
    int Bookings,
    int RevenuePence,
    double UtilisationPercent,
    int CancellationCount,
    NamedCountDto[] TopServices,
    DayCountDto[] BookingsPerDay,
    NamedCountDto[] StatusMix);

public record NamedCountDto(string Name, int Count, int ValuePence);

public record DayCountDto(string Date, int Count, int RevenuePence);
