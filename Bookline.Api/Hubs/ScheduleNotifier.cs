using Microsoft.AspNetCore.SignalR;

namespace Bookline.Api.Hubs;

public class ScheduleNotifier(IHubContext<ScheduleHub> hub)
{
    public Task AppointmentCreated(int businessId, int appointmentId) =>
        Send(businessId, "AppointmentCreated", appointmentId);

    public Task AppointmentUpdated(int businessId, int appointmentId) =>
        Send(businessId, "AppointmentUpdated", appointmentId);

    public Task AppointmentCancelled(int businessId, int appointmentId) =>
        Send(businessId, "AppointmentCancelled", appointmentId);

    private Task Send(int businessId, string eventName, int appointmentId) =>
        hub.Clients
            .Group(ScheduleHub.GroupFor(businessId))
            .SendAsync(eventName, new { appointmentId });
}
