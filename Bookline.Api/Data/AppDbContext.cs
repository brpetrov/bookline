using Bookline.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Bookline.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<StaffService> StaffServices => Set<StaffService>();
    public DbSet<OpeningHour> OpeningHours => Set<OpeningHour>();
    public DbSet<StaffShift> StaffShifts => Set<StaffShift>();
    public DbSet<TimeOff> TimeOff => Set<TimeOff>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Appointment> Appointments => Set<Appointment>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        builder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<Business>()
            .HasIndex(b => b.Slug)
            .IsUnique();

        builder.Entity<StaffService>()
            .HasKey(ss => new { ss.StaffId, ss.ServiceId });

        builder.Entity<Appointment>()
            .Property(a => a.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Entity<Appointment>()
            .HasIndex(a => new { a.StaffId, a.StartsAt });

        // Deleting a business removes its data; but a staff member, service or
        // customer cannot be deleted while appointments reference them.
        builder.Entity<Appointment>().HasOne(a => a.Staff)
            .WithMany(s => s.Appointments).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<Appointment>().HasOne(a => a.Service)
            .WithMany(s => s.Appointments).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<Appointment>().HasOne(a => a.Customer)
            .WithMany(c => c.Appointments).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<StaffService>().HasOne(ss => ss.Service)
            .WithMany(s => s.StaffServices).OnDelete(DeleteBehavior.Restrict);
    }
}
