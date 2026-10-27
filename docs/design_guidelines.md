# NEXORA — Design Guidelines

## 1. Design Direction

Approved direction:

- NEXORA branding only.
- Luxury hospitality presentation.
- Navy blue, white, and subtle gold.
- Large room photographs.
- Clear prices and booking actions.
- Dark navy admin sidebar.
- Light admin workspace.
- Readable tables, filters, and status labels.
- Responsive layouts.

The sample documentation screenshots guide document structure.
Their lending-system branding and business rules do not belong in NEXORA.

Exact tokens below are proposed starting values.

## 2. Proposed Design Tokens

Keep shared visual values in CSS variables.

```css
:root {
  --color-background: #f5f7fb;
  --color-surface: #ffffff;
  --color-text: #172033;
  --color-text-muted: #526078;
  --color-primary: #14263f;
  --color-on-primary: #ffffff;
  --color-gold: #b58b3b;
  --color-on-gold: #172033;
  --color-border: #d6dde8;

  --color-success: #166534;
  --color-warning: #854d0e;
  --color-danger: #b91c1c;
  --color-focus: #2563eb;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;

  --radius-small: 0.375rem;
  --radius-medium: 0.75rem;
  --radius-large: 1rem;

  --font-body: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

Use tokens consistently.

Verify contrast for actual foreground/background combinations.
Do not assume a palette is accessible in every combination.

## 3. Typography

- Use one readable body-font family initially.
- Maintain a clear heading hierarchy.
- Use comfortable body-text size and line height.
- Keep prices, dates, and reservation references easy to scan.
- Use consistent currency and date formatting.
- Avoid decorative fonts in operational tables.

Additional fonts require a clear visual purpose.

## 4. Guest Layout

```text
Header and navigation
        ↓
Page title or room photography
        ↓
Search / room information
        ↓
Booking action
        ↓
Supporting information and policies
        ↓
Footer
```

Room cards should show:

- Room image and useful alternative text.
- Room-type name.
- Capacity.
- Important amenities.
- Nightly rate.
- Availability context.
- View Details action.

Explain whether a displayed rate is per night.
Show the full calculated stay amount before final submission.

## 5. Booking Interface

Recommended sequence:

1. Select dates and guest count.
2. Choose a room type.
3. Enter guest details.
4. Review price and policies.
5. Select payment method.
6. Submit.
7. Display the backend-confirmed result.

Account creation must remain optional.

If a hold expires:

- Explain the expiration.
- Recheck inventory and price.
- Require a fresh confirmation when terms change.

Do not display a booking as paid based on a redirect.

## 6. Admin Layout

```text
Sidebar | Page heading and main action
        | Summary or context
        | Search and filters
        | Table or operational content
        | Pagination and feedback
```

Use consistent:

- Navigation labels.
- Page titles.
- Primary-action placement.
- Table spacing.
- Filter controls.
- Status badges.
- Confirmation dialogs.

## 7. Reusable Components

Create components when repeated needs are established.

Likely components:

- Button.
- FormField.
- StatusBadge.
- LoadingState.
- EmptyState.
- ErrorState.
- Modal.
- Pagination.
- RoomCard.
- ReservationSummary.
- AdminPageHeader.

Do not build a universal component framework in advance.

## 8. Forms and Feedback

- Give every input a visible label.
- Associate field errors with their inputs.
- Preserve entered values after recoverable failures.
- Explain required fields.
- Prevent accidental duplicate submission.
- Restore controls after a failed request.
- Show actionable messages.
- Confirm consequential actions such as cancellation or refund.

Frontend submission controls supplement backend idempotency.

## 9. Status Display

Display reservation and payment states separately.

Example:

Reservation: Confirmed
Payment: Unpaid
Method: Pay at Property

Never use color as the only status indicator.

NFC simulation screens must visibly say Simulation.
Pending device revocation must remain visible until acknowledged.

## 10. Responsive and Accessible Behavior

- Support narrow screens without hiding essential actions.
- Collapse navigation when space requires it.
- Keep tables usable through controlled scrolling or alternate layouts.
- Support keyboard navigation.
- Show visible focus.
- Use semantic HTML.
- Provide meaningful image alternative text.
- Label icon-only buttons.
- Manage focus when dialogs open and close.
- Respect reduced-motion preferences.

Choose breakpoints based on content behavior.
Exact breakpoint values remain implementation choices.

## 11. Required Interface States

Every data-driven screen should address:

| State | Expected behavior |
|---|---|
| Loading | Explain that data is being retrieved |
| Empty | Explain why no records are shown |
| Success | Show the result clearly |
| Validation failure | Identify correctable input problems |
| Request failure | Offer an appropriate retry or next step |
| Access denied | Explain unavailable access without exposing private data |
| Session expired | Guide the user through sign-in safely |

## 12. Visual Review

Before approving a screen:

1. Check NEXORA branding.
2. Check desktop and narrow layouts.
3. Check text and control contrast.
4. Test keyboard interaction.
5. Review all required states.
6. Confirm prices and statuses match backend data.
7. Check that screenshots and demo data contain no private records.
