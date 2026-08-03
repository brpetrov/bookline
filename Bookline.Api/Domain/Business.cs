using System.ComponentModel.DataAnnotations;

namespace Bookline.Api.Domain;

public class Business
{
    public int Id { get; set; }

    [MaxLength(200)]
    public required string Name { get; set; }

    [MaxLength(100)]
    public required string Slug { get; set; }

    [MaxLength(64)]
    public required string Timezone { get; set; }

    public ICollection<Staff> Staff { get; set; } = [];
    public ICollection<Service> Services { get; set; } = [];
    public ICollection<OpeningHour> OpeningHours { get; set; } = [];
    public ICollection<Customer> Customers { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
}
