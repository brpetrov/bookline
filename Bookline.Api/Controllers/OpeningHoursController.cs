using Bookline.Api.Auth;
using Bookline.Api.Data;
using Bookline.Api.Domain;
using Bookline.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bookline.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/opening-hours")]
public class OpeningHoursController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<OpeningHourDto>>> GetAll(CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Forbid403();
        }

        var hours = await db.OpeningHours
            .Where(o => o.BusinessId == businessId)
            .OrderBy(o => o.DayOfWeek)
            .Select(o => new OpeningHourDto(
                o.Id,
                (int)o.DayOfWeek,
                o.OpenTime.ToString("HH:mm"),
                o.CloseTime.ToString("HH:mm")))
            .ToListAsync(ct);

        return Ok(hours);
    }

    [HttpPut]
    public async Task<ActionResult<List<OpeningHourDto>>> Replace(
        OpeningHourWriteRequest[] request,
        CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Forbid403();
        }

        var parsed = new List<OpeningHour>();

        foreach (var row in request)
        {
            if (row.DayOfWeek is < 0 or > 6)
            {
                return Problem(
                    title: "Invalid day",
                    detail: $"dayOfWeek must be 0 (Sunday) to 6 (Saturday); got {row.DayOfWeek}.",
                    statusCode: StatusCodes.Status400BadRequest);
            }

            if (!TimeOnly.TryParse(row.OpenTime, out var open) ||
                !TimeOnly.TryParse(row.CloseTime, out var close))
            {
                return Problem(
                    title: "Invalid time",
                    detail: "Times must be HH:mm, e.g. 09:00.",
                    statusCode: StatusCodes.Status400BadRequest);
            }

            if (close <= open)
            {
                return Problem(
                    title: "Invalid range",
                    detail: $"Closing time must be after opening time for day {row.DayOfWeek}.",
                    statusCode: StatusCodes.Status400BadRequest);
            }

            parsed.Add(new OpeningHour
            {
                BusinessId = businessId,
                DayOfWeek = (DayOfWeek)row.DayOfWeek,
                OpenTime = open,
                CloseTime = close,
            });
        }

        var existing = await db.OpeningHours
            .Where(o => o.BusinessId == businessId)
            .ToListAsync(ct);

        db.OpeningHours.RemoveRange(existing);
        db.OpeningHours.AddRange(parsed);
        await db.SaveChangesAsync(ct);

        return await GetAll(ct);
    }

    private ObjectResult Forbid403() => Problem(
        title: "No business on this account",
        statusCode: StatusCodes.Status403Forbidden);
}
