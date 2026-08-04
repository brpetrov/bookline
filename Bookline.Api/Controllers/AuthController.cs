using Bookline.Api.Auth;
using Bookline.Api.Domain;
using Bookline.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Bookline.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<AppUser> users,
    SignInManager<AppUser> signIn,
    TokenService tokens) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email);

        // Same response whether the email is unknown or the password is wrong, so the
        // endpoint can't be used to discover which accounts exist.
        if (user is null)
        {
            return InvalidCredentials();
        }

        var result = await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (result.IsLockedOut)
        {
            return Problem(
                title: "Account locked",
                detail: "Too many failed attempts. Try again later.",
                statusCode: StatusCodes.Status423Locked);
        }

        if (!result.Succeeded)
        {
            return InvalidCredentials();
        }

        var roles = await users.GetRolesAsync(user);
        var (token, expiresAtUtc) = tokens.Create(user, roles);

        return Ok(new LoginResponse(
            token,
            expiresAtUtc,
            user.Email!,
            user.DisplayName ?? user.Email!,
            [.. roles]));
    }

    [Authorize]
    [HttpGet("me")]
    public ActionResult<LoginResponse> Me()
    {
        return Ok(new LoginResponse(
            string.Empty,
            DateTime.MinValue,
            User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? string.Empty,
            User.FindFirst("name")?.Value ?? string.Empty,
            [.. User.Claims
                .Where(c => c.Type == System.Security.Claims.ClaimTypes.Role)
                .Select(c => c.Value)]));
    }

    private ObjectResult InvalidCredentials() => Problem(
        title: "Invalid credentials",
        detail: "That email and password combination is not recognised.",
        statusCode: StatusCodes.Status401Unauthorized);
}
