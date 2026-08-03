using System.ComponentModel.DataAnnotations;

namespace Bookline.Api.Domain;

public class TimeOff
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }

    [MaxLength(200)]
    public string? Reason { get; set; }

    public Staff Staff { get; set; } = null!;
}
