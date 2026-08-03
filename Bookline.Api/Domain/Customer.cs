using System.ComponentModel.DataAnnotations;

namespace Bookline.Api.Domain;

public class Customer
{
    public int Id { get; set; }
    public int BusinessId { get; set; }

    [MaxLength(200)]
    public required string Name { get; set; }

    [MaxLength(256)]
    public required string Email { get; set; }

    [MaxLength(32)]
    public required string Phone { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }

    public Business Business { get; set; } = null!;
    public ICollection<Appointment> Appointments { get; set; } = [];
}
