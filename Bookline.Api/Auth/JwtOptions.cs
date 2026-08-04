namespace Bookline.Api.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "bookline";

    public string Audience { get; set; } = "bookline";

    /// <summary>
    /// HMAC-SHA256 signing key. Never committed - set via `dotnet user-secrets`
    /// in development and an environment variable in production.
    /// </summary>
    public string SigningKey { get; set; } = string.Empty;

    public int ExpiryMinutes { get; set; } = 120;
}
