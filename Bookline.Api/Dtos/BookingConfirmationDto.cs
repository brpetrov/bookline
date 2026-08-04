namespace Bookline.Api.Dtos;

public record BookingConfirmationDto(
    int AppointmentId,
    string ServiceName,
    string StaffName,
    DateTime StartsAtUtc,
    DateTime EndsAtUtc,
    int PricePence,
    string CustomerName,
    string CustomerEmail);
