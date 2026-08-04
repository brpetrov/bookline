using Bookline.Api.Dtos;
using FluentValidation;

namespace Bookline.Api.Validation;

public class CreateBookingRequestValidator : AbstractValidator<CreateBookingRequest>
{
    public CreateBookingRequestValidator()
    {
        RuleFor(x => x.ServiceId).GreaterThan(0);
        RuleFor(x => x.StaffId).GreaterThan(0);

        RuleFor(x => x.StartsAtUtc)
            .Must(v => v.Kind != DateTimeKind.Unspecified)
            .WithMessage("StartsAtUtc must include a timezone designator, e.g. 2026-08-06T13:30:00Z.");

        RuleFor(x => x.StartsAtUtc)
            .Must(v => v.ToUniversalTime() > DateTime.UtcNow)
            .When(x => x.StartsAtUtc.Kind != DateTimeKind.Unspecified)
            .WithMessage("The requested start time must be in the future.");

        RuleFor(x => x.CustomerName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CustomerEmail).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(x => x.CustomerPhone).NotEmpty().MaximumLength(32);
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}
