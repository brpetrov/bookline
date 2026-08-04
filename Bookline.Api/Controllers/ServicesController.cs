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
[Route("api/services")]
public class ServicesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ServiceDto>>> GetAll(CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Forbid403();
        }

        var services = await db.Services
            .Where(s => s.BusinessId == businessId)
            .OrderBy(s => s.Name)
            .Select(s => new ServiceDto(s.Id, s.Name, s.DurationMinutes, s.PricePence, s.Colour))
            .ToListAsync(ct);

        return Ok(services);
    }

    [HttpPost]
    public async Task<ActionResult<ServiceDto>> Create(ServiceWriteRequest request, CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Forbid403();
        }

        var service = new Service
        {
            BusinessId = businessId,
            Name = request.Name,
            DurationMinutes = request.DurationMinutes,
            PricePence = request.PricePence,
            Colour = request.Colour,
            BufferMinutes = request.BufferMinutes,
        };

        db.Services.Add(service);
        await db.SaveChangesAsync(ct);

        return Ok(new ServiceDto(
            service.Id, service.Name, service.DurationMinutes, service.PricePence, service.Colour));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ServiceDto>> Update(
        int id,
        ServiceWriteRequest request,
        CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Forbid403();
        }

        var service = await db.Services
            .FirstOrDefaultAsync(s => s.Id == id && s.BusinessId == businessId, ct);

        if (service is null)
        {
            return NotFound404(id);
        }

        service.Name = request.Name;
        service.DurationMinutes = request.DurationMinutes;
        service.PricePence = request.PricePence;
        service.Colour = request.Colour;
        service.BufferMinutes = request.BufferMinutes;

        await db.SaveChangesAsync(ct);

        return Ok(new ServiceDto(
            service.Id, service.Name, service.DurationMinutes, service.PricePence, service.Colour));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Forbid403();
        }

        var service = await db.Services
            .FirstOrDefaultAsync(s => s.Id == id && s.BusinessId == businessId, ct);

        if (service is null)
        {
            return NotFound404(id);
        }

        var used = await db.Appointments.AnyAsync(a => a.ServiceId == id, ct);

        if (used)
        {
            return Problem(
                title: "Service is in use",
                detail: "Appointments reference this service, so it cannot be deleted. "
                        + "Rename or reprice it instead.",
                statusCode: StatusCodes.Status409Conflict);
        }

        db.Services.Remove(service);
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    private ObjectResult Forbid403() => Problem(
        title: "No business on this account",
        statusCode: StatusCodes.Status403Forbidden);

    private ObjectResult NotFound404(int id) => Problem(
        title: "Service not found",
        detail: $"No service with id {id} exists for this business.",
        statusCode: StatusCodes.Status404NotFound);
}
