# Guest-web responsibility separation

**Goal:** Separate guest-web logic, presentation, fixed content, and style values while preserving current behavior and appearance.

**Architecture:** Keep the existing pages/components/hooks/services/utils structure. Extract state, effects, handlers, and derived screen data into focused JavaScript hooks. Keep JSX, classes, text, routes, effect dependencies, request guards, and existing API services unchanged. Put fixed page content in constants and keep plain CSS.

**Authorization:** The owner explicitly approved implementation on November 10, 2026. Use local docs only; do not access Obsidian. Work in the current directory. No keyword, commits, new dependencies, backend edits, or deployment are required.

## Tasks

- [x] Record lint/build baselines and preserve source for comparison.
- [x] Extract screen logic from Rooms, RoomDetails, Checkout, BookingAccess, MyBooking, PaymentReturn, and Policies into hooks. Move room availability response validation into a utility.
- [x] Extract interactive component/layout logic into hooks: search forms, payment, receipt, header, gallery, room cards, featured rooms, backend status, and route focus.
- [x] Move static Home/About/Contact/Policies content into constants. Arrange extracted screen subcomponents under components by feature.
- [x] Consolidate existing shared visual values into styles/tokens.css, preserving every existing value and CSS cascade; move component CSS into styles and update imports.
- [x] Verify validation edge cases, compare render markup and original logic/JSX, compare expanded CSS against the baseline, and run lint/build. Record runtime limits honestly.

## Review focus

- Preserve component identity, keys, hook order, effect dependencies, abort cleanup, and timer intervals.
- Preserve checkout recovery, payment idempotency guards, uncertainty handling, and private booking token cleanup.
- Preserve Philippine date/time behavior, validation messages, and server pricing.
- Preserve keyboard focus, policy tabs, image fallbacks, and mobile navigation.
- Preserve CSS rule order, media queries, selectors, literal values, and intentional screen differences.

## Verification record

- Baseline: guest-web lint and production build passed on November 10, 2026.
- Final guest-web lint and production build passed without warnings.
- Native Node validation tests passed: 14 tests in src/utils/availabilityValidation.test.js. They cover malformed availability data, duplicate IDs, integer centavo amounts, stay-length matching, legacy date/guest limits, and currency formatting.
- Temporary comparison harness: 53 original/refactored server-rendered scenarios produced identical markup, including screen loading/error states, room galleries, private bookings, receipts, and payment preferences.
- All 18 applicable stylesheets matched after expanding design tokens and normalizing whitespace and equivalent hex notation. Selectors, rule order, and media-query order matched.
- Every useEffect callback and dependency array matched the original syntax tree. A separate source reviewer found no blocking regression in extraction, early returns, component keys/props, payment guards, or private-access cleanup.
- No full browser, live API, booking submission, or PayMongo interaction was exercised. Browser acceptance is still pending. Server rendering does not verify event execution or layout in a real browser.
- The original Rooms introduction references free variables status/rooms; this predates the refactor. Its existing behavior was retained.

Run the maintained checks from frontend/guest-web:

```powershell
npm.cmd run lint
npm.cmd run build
node --test src/utils/availabilityValidation.test.js
```

## Resulting organization

Paths below are relative to frontend/guest-web/src/.

| Location | Responsibility |
|---|---|
| pages/ | Route screens and rendered states; stateful behavior comes from hooks |
| components/rooms/ | Room catalog, availability results, and search presentation |
| components/checkout/ | Checkout form presentation |
| components/booking/ | Private booking, return summary, and summary rows |
| hooks/ | State, effects, validation coordination, event handlers, recovery, and payment coordination |
| services/ | Existing API clients, preserved unchanged |
| utils/ | Availability validation, derived search summaries, and date/money formatting |
| constants/ | Existing Home/About/Contact/Policies content and checkout API scope |
| styles/tokens.css | Existing color, typography, spacing, radius, and shadow values |
| styles/ | Shared and screen/component CSS; original selectors and responsive rules retained |

CSS media-query breakpoints and layout expressions remain in their original rules. CSS custom properties cannot replace breakpoints in ordinary media queries. Intentional differences between current screens retain distinct values rather than being restyled to one value.

## Decisions

- Use CSS custom properties for style constants, matching local design_guidelines.md.
- Extract existing logic mechanically where possible; avoid changing existing business rules.
- This is an in-place refactor, so no worktree or integration action is needed.
