using System.ComponentModel.DataAnnotations;

namespace Bookline.Api.Domain;

public class Staff
{
    public int Id { get; set; }
    public int BusinessId { get; set; }

    [MaxLength(200)]
    public required string Name { get; set; }

    [MaxLength(256)]
    public required string Email { get; set; }

    [MaxLength(32)]
    public required string Colour { get; set; }

    [MaxLength(512)]
    public string? AvatarUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public Business Business { get; set; } = null!;
    public ICollection<StaffService> StaffServices { get; set; } = [];
    public ICollection<StaffShift> Shifts { get; set; } = [];
    public ICollection<TimeOff> TimeOff { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
}
