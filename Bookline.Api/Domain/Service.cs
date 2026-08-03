using System.ComponentModel.DataAnnotations;

namespace Bookline.Api.Domain;

public class Service
{
    public int Id { get; set; }
    public int BusinessId { get; set; }

    [MaxLength(200)]
    public required string Name { get; set; }

    public int DurationMinutes { get; set; }
    public int PricePence { get; set; }

    [MaxLength(32)]
    public required string Colour { get; set; }

    public int BufferMinutes { get; set; }

    public Business Business { get; set; } = null!;
    public ICollection<StaffService> StaffServices { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
}
