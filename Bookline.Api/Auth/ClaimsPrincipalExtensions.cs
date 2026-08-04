using System.Security.Claims;

namespace Bookline.Api.Auth;

public static class ClaimsPrincipalExtensions
{
    /// <summary>The business this login administers, taken from the JWT's businessId claim.</summary>
    public static int? BusinessId(this ClaimsPrincipal user) =>
        int.TryParse(user.FindFirst("businessId")?.Value, out var id) ? id : null;
}
