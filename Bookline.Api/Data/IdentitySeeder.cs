using Bookline.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Bookline.Api.Data;

/// <summary>
/// Creates the roles and the demo login advertised on the sign-in screen (PLAN.md §11).
/// </summary>
public static class IdentitySeeder
{
    public const string DemoEmail = "demo@bookline.app";
    public const string DemoPassword = "demo";

    public static async Task SeedAsync(
        UserManager<AppUser> users,
        RoleManager<IdentityRole> roles,
        AppDbContext db)
    {
        foreach (var role in new[] { "Admin", "Staff" })
        {
            if (!await roles.RoleExistsAsync(role))
            {
                await roles.CreateAsync(new IdentityRole(role));
            }
        }

        if (await users.FindByEmailAsync(DemoEmail) is not null)
        {
            return;
        }

        var businessId = await db.Businesses.Select(b => b.Id).FirstOrDefaultAsync();

        var demo = new AppUser
        {
            UserName = DemoEmail,
            Email = DemoEmail,
            EmailConfirmed = true,
            DisplayName = "Demo Admin",
            BusinessId = businessId == 0 ? null : businessId,
        };

        var created = await users.CreateAsync(demo, DemoPassword);

        if (created.Succeeded)
        {
            await users.AddToRoleAsync(demo, "Admin");
        }
    }
}
