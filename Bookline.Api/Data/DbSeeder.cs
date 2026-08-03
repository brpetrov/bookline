using Bookline.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Bookline.Api.Data;

/// <summary>
/// Populates the demo salon "Kestrel &amp; Co, Leeds" with realistic data.
/// Dates are generated relative to today so the calendar is never empty.
/// </summary>
public static class DbSeeder
{
    private static readonly TimeZoneInfo Tz = TimeZoneInfo.FindSystemTimeZoneById("Europe/London");

    // Fixed seed: the "random" clustering is the same every time the database is rebuilt.
    private const int RandomSeed = 20260803;

    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Businesses.AnyAsync())
        {
            return;
        }

        var rnd = new Random(RandomSeed);

        var business = new Business
        {
            Name = "Kestrel & Co",
            Slug = "kestrel-and-co",
            Timezone = "Europe/London",
        };

        var services = CreateServices();
        var staff = CreateStaff();
        LinkStaffToServices(staff, services);

        var openingHours = CreateOpeningHours();

        business.Services = services;
        business.Staff = staff;
        business.OpeningHours = openingHours;

        AddShifts(staff);

        var customers = CreateCustomers();
        business.Customers = customers;

        var appointments = CreateAppointments(staff, customers, openingHours, rnd);
        business.Appointments = appointments;

        AddTimeOff(staff);

        db.Businesses.Add(business);
        await db.SaveChangesAsync();
    }

    // ── Services ────────────────────────────────────────────────────────────

    private static List<Service> CreateServices() =>
    [
        new() { Name = "Cut & Finish",   DurationMinutes = 45,  PricePence = 3800, BufferMinutes = 10, Colour = "#4f46e5" },
        new() { Name = "Colour & Gloss", DurationMinutes = 120, PricePence = 9500, BufferMinutes = 15, Colour = "#8b5cf6" },
        new() { Name = "Beard Trim",     DurationMinutes = 20,  PricePence = 1500, BufferMinutes = 5,  Colour = "#0ea5e9" },
        new() { Name = "Kids Cut",       DurationMinutes = 25,  PricePence = 1800, BufferMinutes = 5,  Colour = "#f59e0b" },
        new() { Name = "Consultation",   DurationMinutes = 15,  PricePence = 0,    BufferMinutes = 0,  Colour = "#64748b" },
    ];

    // ── Staff ───────────────────────────────────────────────────────────────

    private static List<Staff> CreateStaff() =>
    [
        new() { Name = "Amara Ellis",     Email = "amara@kestrelandco.com",  Colour = "#8b5cf6" },
        new() { Name = "Tomasz Nowak",    Email = "tomasz@kestrelandco.com", Colour = "#10b981" },
        new() { Name = "Priya Raman",     Email = "priya@kestrelandco.com",  Colour = "#f59e0b" },
        new() { Name = "Jordan Michaels", Email = "jordan@kestrelandco.com", Colour = "#0ea5e9" },
    ];

    /// <summary>Not everyone does everything — Tomasz and Jordan don't colour.</summary>
    private static void LinkStaffToServices(List<Staff> staff, List<Service> services)
    {
        Service Svc(string name) => services.First(s => s.Name == name);

        string[][] skills =
        [
            ["Cut & Finish", "Colour & Gloss", "Beard Trim", "Kids Cut", "Consultation"], // Amara
            ["Cut & Finish", "Beard Trim", "Kids Cut", "Consultation"],                   // Tomasz
            ["Cut & Finish", "Colour & Gloss", "Consultation"],                           // Priya
            ["Cut & Finish", "Beard Trim", "Kids Cut"],                                    // Jordan
        ];

        for (var i = 0; i < staff.Count; i++)
        {
            foreach (var name in skills[i])
            {
                staff[i].StaffServices.Add(new StaffService { Staff = staff[i], Service = Svc(name) });
            }
        }
    }

    // ── Opening hours ───────────────────────────────────────────────────────
    // Closed Sunday and Monday, as most salons are. Late on Thursday.

    private static List<OpeningHour> CreateOpeningHours() =>
    [
        new() { DayOfWeek = DayOfWeek.Tuesday,   OpenTime = new(9, 0),  CloseTime = new(18, 0) },
        new() { DayOfWeek = DayOfWeek.Wednesday, OpenTime = new(9, 0),  CloseTime = new(18, 0) },
        new() { DayOfWeek = DayOfWeek.Thursday,  OpenTime = new(9, 0),  CloseTime = new(20, 0) },
        new() { DayOfWeek = DayOfWeek.Friday,    OpenTime = new(9, 0),  CloseTime = new(18, 0) },
        new() { DayOfWeek = DayOfWeek.Saturday,  OpenTime = new(8, 30), CloseTime = new(17, 0) },
    ];

    private static void AddShifts(List<Staff> staff)
    {
        // (dayOfWeek, start, end) per staff member — deliberately uneven.
        (DayOfWeek Day, TimeOnly Start, TimeOnly End)[][] shifts =
        [
            [ // Amara — Tue-Sat, late on Thursday
                (DayOfWeek.Tuesday, new(9, 0), new(17, 0)),
                (DayOfWeek.Wednesday, new(9, 0), new(17, 0)),
                (DayOfWeek.Thursday, new(11, 0), new(20, 0)),
                (DayOfWeek.Friday, new(9, 0), new(17, 0)),
                (DayOfWeek.Saturday, new(8, 30), new(17, 0)),
            ],
            [ // Tomasz — Tue-Fri only
                (DayOfWeek.Tuesday, new(9, 0), new(18, 0)),
                (DayOfWeek.Wednesday, new(9, 0), new(18, 0)),
                (DayOfWeek.Thursday, new(9, 0), new(18, 0)),
                (DayOfWeek.Friday, new(9, 0), new(18, 0)),
            ],
            [ // Priya — Wed-Sat
                (DayOfWeek.Wednesday, new(10, 0), new(18, 0)),
                (DayOfWeek.Thursday, new(12, 0), new(20, 0)),
                (DayOfWeek.Friday, new(10, 0), new(18, 0)),
                (DayOfWeek.Saturday, new(8, 30), new(17, 0)),
            ],
            [ // Jordan — part-time, Thu-Sat
                (DayOfWeek.Thursday, new(12, 0), new(20, 0)),
                (DayOfWeek.Friday, new(12, 0), new(18, 0)),
                (DayOfWeek.Saturday, new(8, 30), new(17, 0)),
            ],
        ];

        for (var i = 0; i < staff.Count; i++)
        {
            foreach (var (day, start, end) in shifts[i])
            {
                staff[i].Shifts.Add(new StaffShift { DayOfWeek = day, StartTime = start, EndTime = end });
            }
        }
    }

    private static void AddTimeOff(List<Staff> staff)
    {
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Tz);
        var start = DateOnly.FromDateTime(localNow).AddDays(9);

        staff[2].TimeOff.Add(new TimeOff
        {
            StartsAt = ToUtc(start, new TimeOnly(0, 0)),
            EndsAt = ToUtc(start.AddDays(3), new TimeOnly(23, 59)),
            Reason = "Annual leave",
        });
    }

    // ── Customers ───────────────────────────────────────────────────────────
    // 07700 900xxx is Ofcom's range reserved for fiction. Email domains end in
    // ".con", not ".com", so no address here can ever resolve to a real person.

    private static List<Customer> CreateCustomers()
    {
        string[] providers =
        [
            "gmail.con", "outlook.con", "hotmail.con", "yahoo.con", "icloud.con",
        ];

        string[] names =
        [
            "Emily Whitaker", "Daniel Osei", "Sophie Bramwell", "Aisha Khan", "Callum Fraser",
            "Grace Underhill", "Rhys Morgan", "Lauren Petrie", "Hassan Iqbal", "Chloe Danforth",
            "Owen Pritchard", "Freya Lindsay", "Marcus Ellery", "Nadia Rahman", "Toby Grierson",
            "Isla Cavendish", "Jamie Holloway", "Ruth Sandoval", "Ben Tomlinson", "Amelia Rooke",
            "Zoe Hartnell", "Liam Docherty", "Priti Sharma", "Elliot Vance", "Harriet Boyle",
            "Samir Chaudhry", "Megan Ainsworth", "Joel Bannerman", "Verity Cole", "Adam Sheridan",
        ];

        var createdAt = DateTime.UtcNow.AddMonths(-8);

        return [.. names.Select((name, i) => new Customer
        {
            Name = name,
            Email = $"{name.ToLowerInvariant().Replace(' ', '.')}@{providers[i % providers.Length]}",
            Phone = $"07700 900{i + 1:000}",
            CreatedAt = createdAt.AddDays(i * 7),
        })];
    }

    // ── Appointments ────────────────────────────────────────────────────────

    private static List<Appointment> CreateAppointments(
        List<Staff> staff,
        List<Customer> customers,
        List<OpeningHour> openingHours,
        Random rnd)
    {
        var appointments = new List<Appointment>();
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Tz);
        var today = DateOnly.FromDateTime(localNow);

        // Monday of the current week. DayOfWeek.Sunday is 0, so shift by 6 to make Monday 0.
        var monday = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));

        // Last week and this week: last week gives completed history for the dashboard.
        for (var offset = -7; offset < 7; offset++)
        {
            var date = monday.AddDays(offset);
            var opening = openingHours.FirstOrDefault(o => o.DayOfWeek == date.DayOfWeek);
            if (opening is null)
            {
                continue; // closed
            }

            foreach (var member in staff)
            {
                var shift = member.Shifts.FirstOrDefault(s => s.DayOfWeek == date.DayOfWeek);
                if (shift is null)
                {
                    continue; // not working
                }

                var bookable = member.StaffServices.Select(ss => ss.Service).ToList();
                var cursor = shift.StartTime > opening.OpenTime ? shift.StartTime : opening.OpenTime;
                var finish = shift.EndTime < opening.CloseTime ? shift.EndTime : opening.CloseTime;

                while (cursor < finish)
                {
                    if (rnd.NextDouble() >= Density(date.DayOfWeek, cursor))
                    {
                        cursor = cursor.AddMinutes(15);
                        continue;
                    }

                    var service = bookable[rnd.Next(bookable.Count)];
                    var endsAt = cursor.AddMinutes(service.DurationMinutes);
                    var freeAgain = cursor.AddMinutes(service.DurationMinutes + service.BufferMinutes);

                    if (freeAgain > finish)
                    {
                        break; // no room left in the shift
                    }

                    var startUtc = ToUtc(date, cursor);
                    var endUtc = ToUtc(date, endsAt);

                    appointments.Add(new Appointment
                    {
                        Staff = member,
                        Service = service,
                        Customer = customers[rnd.Next(customers.Count)],
                        StartsAt = startUtc,
                        EndsAt = endUtc,
                        PricePence = service.PricePence,
                        Status = endUtc < DateTime.UtcNow
                            ? AppointmentStatus.Completed
                            : rnd.NextDouble() < 0.25
                                ? AppointmentStatus.Pending
                                : AppointmentStatus.Confirmed,
                        CreatedAt = startUtc.AddDays(-rnd.Next(1, 21)),
                    });

                    cursor = freeAgain;
                }
            }
        }

        ForceOneOfEachStatus(appointments);
        return appointments;
    }

    /// <summary>PLAN.md §7: every status colour must appear in a screenshot.</summary>
    private static void ForceOneOfEachStatus(List<Appointment> appointments)
    {
        var now = DateTime.UtcNow;

        var past = appointments.FirstOrDefault(a => a.EndsAt < now);
        if (past is not null)
        {
            past.Status = AppointmentStatus.NoShow;
        }

        var upcoming = appointments.FirstOrDefault(a => a.StartsAt > now);
        if (upcoming is not null)
        {
            upcoming.Status = AppointmentStatus.Cancelled;
        }
    }

    /// <summary>Busy Thursday evening and Saturday, quiet Tuesday morning.</summary>
    private static double Density(DayOfWeek day, TimeOnly time) => day switch
    {
        DayOfWeek.Tuesday when time.Hour < 12 => 0.15,
        DayOfWeek.Thursday when time.Hour >= 16 => 0.85,
        DayOfWeek.Saturday => 0.65,
        _ => 0.30,
    };

    /// <summary>
    /// Converts a salon-local wall-clock date+time to UTC. Safe here because the
    /// salon never opens during the 01:00-02:00 window that DST makes ambiguous.
    /// </summary>
    private static DateTime ToUtc(DateOnly date, TimeOnly time)
    {
        var local = DateTime.SpecifyKind(date.ToDateTime(time), DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(local, Tz);
    }
}
