namespace Bookline.Api.Dtos;

public record LoginRequest(string Email, string Password);

public record LoginResponse(
    string Token,
    DateTime ExpiresAtUtc,
    string Email,
    string DisplayName,
    string[] Roles);
