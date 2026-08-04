using Microsoft.AspNetCore.Identity;

namespace Bookline.Api.Domain;

/// <summary>
/// An admin/staff login. Separate from <see cref="Staff"/> on purpose: not every
/// stylist needs an account, and not every account belongs to a stylist.
/// </summary>
public class AppUser : IdentityUser
{
    public string? DisplayName { get; set; }

    public int? BusinessId { get; set; }

    /// <summary>Set when this login corresponds to a stylist on the calendar.</summary>
    public int? StaffId { get; set; }
}
