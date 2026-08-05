namespace Bookline.Api.Dtos;

public record BusinessProfileDto(
    string Name,
    string Timezone,
    List<OpeningHourSummaryDto> OpeningHours);

/// <summary>Opening hours as the public page needs them - no id, no business id.</summary>
public record OpeningHourSummaryDto(int DayOfWeek, string OpenTime, string CloseTime);
