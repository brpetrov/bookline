using Bookline.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Bookline.Api.Controllers;

[ApiController]
[Route("api/public/{slug}")]
public class PublicController(AvailabilityService availability) : ControllerBase
{
    [HttpGet("availability")]
    public async Task<ActionResult<List<DayAvailability>>> GetAvailability(
        string slug,
        [FromQuery] int serviceId,
        [FromQuery] int? staffId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken ct)
    {
        var start = from ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var end = to ?? start.AddDays(13);

        if (end < start)
        {
            return Problem(
                title: "Invalid date range",
                detail: "'to' must not be earlier than 'from'.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (end.DayNumber - start.DayNumber > 30)
        {
            return Problem(
                title: "Range too large",
                detail: "Availability can be requested for at most 31 days.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var days = await availability.GetAvailabilityAsync(slug, serviceId, staffId, start, end, ct);
        return Ok(days);
    }
}
