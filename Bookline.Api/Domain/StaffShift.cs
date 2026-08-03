namespace Bookline.Api.Domain;

public class StaffShift
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    public Staff Staff { get; set; } = null!;
}
