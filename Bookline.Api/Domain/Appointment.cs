using System.ComponentModel.DataAnnotations;

namespace Bookline.Api.Domain;

public class Appointment
{
    public int Id { get; set; }
    public int BusinessId { get; set; }
    public int StaffId { get; set; }
    public int ServiceId { get; set; }
    public int CustomerId { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public AppointmentStatus Status { get; set; }
    public int PricePence { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public Business Business { get; set; } = null!;
    public Staff Staff { get; set; } = null!;
    public Service Service { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
}
