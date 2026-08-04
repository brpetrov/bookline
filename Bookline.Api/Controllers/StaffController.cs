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
[Route("api/staff")]
public class StaffController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<StaffAdminDto>>> GetAll(CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Forbid403();
        }

        var staff = await db.Staff
            .Where(s => s.BusinessId == businessId)
            .OrderBy(s => s.Name)
            .Select(s => new StaffAdminDto(
                s.Id,
                s.Name,
                s.Email,
                s.Colour,
                s.AvatarUrl,
                s.IsActive,
                s.StaffServices.Select(ss => ss.ServiceId).ToArray()))
            .ToListAsync(ct);

        return Ok(staff);
    }

    [HttpPost]
    public async Task<ActionResult<StaffAdminDto>> Create(StaffWriteRequest request, CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Forbid403();
        }

        var member = new Staff
        {
            BusinessId = businessId,
            Name = request.Name,
            Email = request.Email,
            Colour = request.Colour,
            AvatarUrl = request.AvatarUrl,
            IsActive = request.IsActive,
        };

        db.Staff.Add(member);
        await db.SaveChangesAsync(ct);

        await SetServicesAsync(member.Id, businessId, request.ServiceIds, ct);

        return await GetOne(member.Id, businessId, ct);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<StaffAdminDto>> Update(
        int id,
        StaffWriteRequest request,
        CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Forbid403();
        }

        var member = await db.Staff
            .FirstOrDefaultAsync(s => s.Id == id && s.BusinessId == businessId, ct);

        if (member is null)
        {
            return NotFound404(id);
        }

        member.Name = request.Name;
        member.Email = request.Email;
        member.Colour = request.Colour;
        member.AvatarUrl = request.AvatarUrl;
        member.IsActive = request.IsActive;

        await db.SaveChangesAsync(ct);
        await SetServicesAsync(member.Id, businessId, request.ServiceIds, ct);

        return await GetOne(member.Id, businessId, ct);
    }

    /// <summary>Deactivates rather than deletes - appointment history references staff.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Deactivate(int id, CancellationToken ct)
    {
        if (User.BusinessId() is not int businessId)
        {
            return Forbid403();
        }

        var member = await db.Staff
            .FirstOrDefaultAsync(s => s.Id == id && s.BusinessId == businessId, ct);

        if (member is null)
        {
            return NotFound404(id);
        }

        member.IsActive = false;
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    private async Task SetServicesAsync(
        int staffId,
        int businessId,
        int[] serviceIds,
        CancellationToken ct)
    {
        var valid = await db.Services
            .Where(s => s.BusinessId == businessId && serviceIds.Contains(s.Id))
            .Select(s => s.Id)
            .ToListAsync(ct);

        var existing = await db.StaffServices
            .Where(ss => ss.StaffId == staffId)
            .ToListAsync(ct);

        db.StaffServices.RemoveRange(existing.Where(ss => !valid.Contains(ss.ServiceId)));

        foreach (var serviceId in valid.Where(id => existing.All(ss => ss.ServiceId != id)))
        {
            db.StaffServices.Add(new StaffService { StaffId = staffId, ServiceId = serviceId });
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task<ActionResult<StaffAdminDto>> GetOne(
        int id,
        int businessId,
        CancellationToken ct)
    {
        var dto = await db.Staff
            .Where(s => s.Id == id && s.BusinessId == businessId)
            .Select(s => new StaffAdminDto(
                s.Id,
                s.Name,
                s.Email,
                s.Colour,
                s.AvatarUrl,
                s.IsActive,
                s.StaffServices.Select(ss => ss.ServiceId).ToArray()))
            .FirstOrDefaultAsync(ct);

        return dto is null ? NotFound404(id) : Ok(dto);
    }

    private ObjectResult Forbid403() => Problem(
        title: "No business on this account",
        statusCode: StatusCodes.Status403Forbidden);

    private ObjectResult NotFound404(int id) => Problem(
        title: "Staff member not found",
        detail: $"No staff member with id {id} exists for this business.",
        statusCode: StatusCodes.Status404NotFound);
}
