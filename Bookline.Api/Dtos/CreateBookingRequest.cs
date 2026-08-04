namespace Bookline.Api.Dtos;

public record CreateBookingRequest(
    int ServiceId,
    int StaffId,
    DateTime StartsAtUtc,
    string CustomerName,
    string CustomerEmail,
    string CustomerPhone,
    string? Notes);
