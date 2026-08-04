using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Bookline.Api.Domain;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Bookline.Api.Auth;

public class TokenService(IOptions<JwtOptions> options)
{
    private readonly JwtOptions _jwt = options.Value;

    public (string Token, DateTime ExpiresAtUtc) Create(AppUser user, IEnumerable<string> roles)
    {
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new("name", user.DisplayName ?? user.UserName ?? string.Empty),
        };

        if (user.BusinessId is not null)
        {
            claims.Add(new Claim("businessId", user.BusinessId.Value.ToString()));
        }

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SigningKey)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
    }
}
