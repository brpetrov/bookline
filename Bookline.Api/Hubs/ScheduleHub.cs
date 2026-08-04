using Bookline.Api.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Bookline.Api.Hubs;

/// <summary>
/// Pushes schedule changes to any open calendar. Clients are grouped per business
/// so one salon never receives another's traffic.
/// </summary>
[Authorize]
public class ScheduleHub : Hub
{
    public static string GroupFor(int businessId) => $"business-{businessId}";

    public override async Task OnConnectedAsync()
    {
        if (Context.User?.BusinessId() is int businessId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupFor(businessId));
        }

        await base.OnConnectedAsync();
    }
}
