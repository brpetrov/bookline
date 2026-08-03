namespace Bookline.Api.Domain;

public class OpeningHour
{
    public int Id { get; set; }
    public int BusinessId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly OpenTime { get; set; }
    public TimeOnly CloseTime { get; set; }

    public Business Business { get; set; } = null!;
}
