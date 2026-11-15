# NEXORA | design_guidelines.md

**Version:** Proposed 2.0  
**Prepared:** November 15, 2026  
**Status:** DRAFT, owner review required  
**Scope:** Existing Guest Website and Admin Dashboard; target changes are proposals, not installed features  
**Implementation:** No CSS, JSX, source, or existing project documentation changes authorized

## 1. Authority, baseline, and design goals

NEXORA is a single-property Condotel Management System with two React/JSX applications. Preserve React, Vite, React Router, Axios, plain CSS, and Lucide React. Retain the current modular-monolith REST API boundaries and backend authorization.

**Documented approved visual direction:** NEXORA-only branding, luxury hospitality character, navy blue, white, restrained gold, large and useful room photographs, readable prices and booking actions, a dark-navy admin sidebar, a light admin work area, clear tables and filters, consistent statuses, and responsive layouts.

**Existing implementation:** Guest style values are in `frontend/guest-web/src/styles/tokens.css`; admin values are in `frontend/admin-web/src/styles/tokens.css`. These files contain existing application-specific values extracted during the November 10 responsibility refactor. Their values were not rewritten in that refactor. Preserve those live values unless a separate visual change is approved. Media queries and layout expressions may remain in existing stylesheets.

**Current-state evidence:** The November 11 owner-confirmed `AGENTS.md` checkpoint records the Admin Dashboard redesign as completed. This document does not reopen accepted designs. The `ADMIN_UI_UX_IMPLEMENTATION_PLAN.md` is historical screen guidance, not proof every reference control is supported.

**Business-rule revision:** The old `design_guidelines.md` says guest account creation is optional. The owner subsequently approved **mandatory registration and email verification before new bookings**. Treat this as a proposed architecture revision, not an existing installed flow. Preserve secure access for historical accountless reservations.

### Design objectives

1. Make primary guest booking actions obvious and trustworthy.
2. Keep operational information scannable for reception and management.
3. Maintain accessible, keyboard-operable interfaces.
4. Reuse existing components, patterns, and CSS variables instead of creating a new UI framework.
5. Display backend-authoritative prices, inventory, reservations, payment states, and permissions.
6. Clearly distinguish existing features, proposed functionality, and simulations.

## 2. CSS design-token specification

Token names and palette values in **Table A** are sourced from the existing guidelines as **proposed starting values**. They are not asserted to equal current `tokens.css` contents. Existing token values prevail during maintenance until a redesign is separately authorized.

### 2.1 Table A: Color tokens (documented proposed palette)

| CSS custom property | Proposed value | Purpose / restrictions |
|---|---|---|
| `--color-background` | `#f5f7fb` | Light app-page background |
| `--color-surface` | `#ffffff` | Cards, forms, primary workspace surfaces |
| `--color-text` | `#172033` | Primary readable foreground |
| `--color-text-muted` | `#526078` | Supporting content, still subject to contrast checks |
| `--color-primary` | `#14263f` | Navy navigation, primary brand actions |
| `--color-on-primary` | `#ffffff` | Text on navy |
| `--color-gold` | `#b58b3b` | Restrained accent, not an assumed accessible text color |
| `--color-on-gold` | `#172033` | Dark foreground on gold where contrast is verified |
| `--color-border` | `#d6dde8` | Form and surface boundaries |
| `--color-success` | `#166534` | Success emphasis, with text label |
| `--color-warning` | `#854d0e` | Warning emphasis, with text label |
| `--color-danger` | `#b91c1c` | Destructive/error emphasis, with text label |
| `--color-focus` | `#2563eb` | Visible keyboard focus treatment |

**Color rules:** Use gold as an accent rather than a default body text color. Verify all actual text/background and interactive-state pairs against WCAG 2.2 AA contrast requirements. Do not assume every combination in this palette passes. Never rely on color alone to communicate status. Success/error colors must not masquerade as authorization or payment verification.

### 2.2 Table B: Spacing tokens (existing proposed scale)

| CSS custom property | Value | Typical use |
|---|---|---|
| `--space-1` | `0.25rem` | Compact icon/text separation |
| `--space-2` | `0.5rem` | Tight form, badge spacing |
| `--space-3` | `0.75rem` | Small component gaps |
| `--space-4` | `1rem` | Default internal control/card spacing |
| `--space-6` | `1.5rem` | Section/card padding |
| `--space-8` | `2rem` | Larger section spacing |
| `--space-12` | `3rem` | Major page-section separation |

Use the existing application spacing tokens consistently. Do not introduce multiple near-identical values merely to restyle one screen. Support text resizing without fixed-height clipping.

### 2.3 Table C: Border-radius tokens (existing proposed scale)

| CSS custom property | Value | Typical use |
|---|---|---|
| `--radius-small` | `0.375rem` | Small controls and labels |
| `--radius-medium` | `0.75rem` | Form panels, cards, dialogs |
| `--radius-large` | `1rem` | Highlighted section containers |

Avoid heavily rounded operational tables where sharp alignment and efficient reading matter more.

### 2.4 Typography tokens and type scale

**Existing proposed body-font token:** `--font-body: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

The following are **new proposed specifications**, not verified existing variables:

| Suggested token | Proposed value | Application |
|---|---|---|
| `--font-size-xs` | `0.75rem` | Noncritical supplemental labels only |
| `--font-size-sm` | `0.875rem` | Secondary labels and dense tables, subject to readability |
| `--font-size-base` | `1rem` | Body and form text |
| `--font-size-lg` | `1.125rem` | Introductory/lead text |
| `--font-size-xl` | `1.25rem` | Card/section headings |
| `--font-size-2xl` | `1.5rem` | Page headings on narrower screens |
| `--font-size-3xl` | `1.875rem` | Larger page headings |
| `--line-height-body` | `1.5` | Continuous reading |
| `--line-height-heading` | `1.2` | Headings |
| `--font-weight-regular` | `400` | Body |
| `--font-weight-medium` | `500` | Labels |
| `--font-weight-semibold` | `600` | Section headings and primary emphasis |
| `--font-weight-bold` | `700` | Page titles and major figures |

**Typography rules:** Use one body family by default. Maintain semantic heading order, clear label alignment, readable table text, and sensible line length. Show currency in Philippine peso format. Use one timezone-aware date/time presentation convention suitable for `Asia/Manila`. Prices and reservation identifiers need prominent, consistent formatting. Do not add a remote or decorative font without approval.

### 2.5 Shadows and elevation

The existing guidelines say each frontend has shadow tokens but do not document their current variable names or values. The following values are **proposed**, not source-verified:

| Suggested token | Proposed value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgb(23 32 51 / 8%)` | Subtle separation of cards |
| `--shadow-md` | `0 4px 14px rgb(23 32 51 / 10%)` | Floating menus, modest elevation |
| `--shadow-lg` | `0 12px 30px rgb(23 32 51 / 16%)` | Modal/dialog surfaces where needed |

Prefer borders and spacing to stacked shadows. Focus indication must not depend on shadows alone.

### 2.6 Interaction and size tokens

Proposed guidelines, pending token reconciliation:

- Minimum comfortable pointer target: `44px` by `44px` for high-frequency touch actions when practical. WCAG 2.2 AA also specifies a narrower target-size criterion with exceptions; prefer the more generous target for the prototype.
- Visible focus indicator: an outline or equivalent clearly distinguishable treatment, never remove it without a replacement.
- Transition: short, nonessential transitions only; disable decorative motion when reduced motion is requested.
- Prefer flexible `min-height` to hard-coded fixed heights for translated, zoomed, or wrapped controls.
- Use design tokens as values, not scattered repeated literals.

## 3. Layout architecture

### 3.1 Shared principles

- Use existing React Router layouts and route guards.
- Use one clear page heading and consistent landmarks: header, navigation, main, and footer where appropriate.
- Keep page action placement stable across screens.
- Allow content to reflow without horizontal page scrolling at narrow widths, aside from intentionally scrollable data regions.
- Preserve existing component and style ownership boundaries.
- Do not duplicate the entire layout in page components.

### 3.2 Guest Website structure

```text
Skip link
  -> Header (brand, primary navigation, account/session state)
  -> Main
       -> Page heading / room imagery
       -> Availability search or room details
       -> Backend quote and booking call-to-action
       -> Supporting booking/policy information
  -> Footer (property information, policies, relevant links)
```

- Put the most important booking path in the primary reading order.
- Room-category pages use large, correctly cropped photographs and useful alternative text.
- Clearly label displayed per-duration pricing and distinguish an estimate from the final backend quote.
- Rental forms must show hourly/nightly/weekly/monthly selection as approved functionality only after the backend supports it.
- Registration and email verification are prerequisites for **new target bookings** once implemented.
- Keep old accountless booking access safe for historical reservations until approved migration handling is complete.

### 3.3 Admin application structure

```text
Skip link
  -> Sidebar / compact navigation
       -> Brand
       -> Authorized route groups
       -> Current user and sign-out
  -> Main workspace
       -> Header / title / contextual action
       -> Status and feedback region
       -> KPIs or contextual summaries
       -> Search and filters
       -> Table / cards / detail content
       -> Pagination / next actions
```

- **Sidebar:** Dark navy, current-route indication, clear labels, logical grouping, role-aware visibility. Preserve the existing sidebar/navigation components and authorization checks.
- **Header:** Consistent heading and contextual actions. Global search or notification bells are not operational controls unless supported by approved APIs and interactions.
- **Workspace:** Light surface, readable tables, sufficient whitespace, restrained accent styling.
- **Dashboard:** Preserve owner-accepted design and recorded metric definitions. Do not fabricate historical trend data or revenue values.
- **Responsive admin:** Provide accessible drawer navigation or an equivalent compact navigation pattern. Keep drawer control labeled, keyboard-accessible, and focus-managed.

### 3.4 Breakpoint guidance

Existing documentation intentionally leaves exact breakpoints to actual content behavior and the existing stylesheets. The values below are **proposed review anchors**, not mandated replacements for current media queries:

| Reference width | Intended verification |
|---|---|
| `320px` | Smallest narrow-screen baseline; no clipped primary actions |
| `375px` | Typical compact mobile screen |
| `768px` | Tablet/navigation reflow |
| `1024px` | Wide tablet and compact desktop layout |
| `1280px+` | Desktop admin density and multi-column summaries |

Proposed breakpoint candidates, if real content requires them: `48rem` (768px) for tablet reflow and `64rem` (1024px) for expanded admin navigation. Reuse existing breakpoints whenever they already work. Zoom, large text, and browser viewport changes matter more than device names.

### 3.5 Responsive data and forms

- Stack details into one column when necessary.
- Reflow grid-based KPIs without truncating values.
- Prefer horizontal scrolling inside a labeled table container to hiding critical data columns without user choice.
- Ensure filters remain accessible without a mouse.
- Dialogs must fit the viewport and scroll internally when content is long.
- Keep primary actions visible within logical reading order; avoid inaccessible sticky controls.

## 4. Reusable component guidelines

Create or extract components only where repetition or meaningful separation is established. Maintain feature-local components when a shared abstraction would add complexity.

### 4.1 Buttons

| Variant | Use | Behavioral contract |
|---|---|---|
| Primary | One preferred action per immediate context | Clear label, enabled only when valid and authorized |
| Secondary | Alternative non-destructive action | Distinct from primary |
| Quiet/text | Low-emphasis navigation or action | Still visually recognizable |
| Destructive | Cancel, deactivate, approved removal | Explain impact; require confirmation where consequential |
| Icon-only | Compact supported action | Accessible name, visible focus, sufficient target |

- Preserve pending/disabled state and avoid duplicate requests.
- Disabled does not replace a meaningful validation explanation.
- Use actual buttons for actions and links for navigation.
- Do not promise success before backend confirmation.

### 4.2 Cards

- Use consistent padding, radius, and heading structure.
- Room cards show image, room-category name, included/maximum occupancy context, key amenities, labeled rate basis, availability context, and View Details action.
- Admin summary cards show accurately defined metrics, reporting time context, and meaningful navigation only where supported.
- Full-card links must retain clear focus and distinguish any nested actions.
- Do not fill cards with fabricated records or unsupported trends.

### 4.3 Data tables

- One clear table title and optional explanatory description.
- Semantic column headers, predictable alignment, and legible numeric formatting.
- Provide backed-by-API search, filtering, and pagination only where supported.
- Label active filters and results count where applicable.
- Use text statuses alongside color.
- Present empty, loading, error, and access-denied states separately.
- Row actions must be keyboard-reachable and permission-aware.
- Support responsive scrolling with discernible boundaries; never hide essential financial data without another accessible route.
- Preserve payment, room-operation, and reservation status as separate columns where necessary.

### 4.4 Badges and statuses

- Define a consistent visual mapping within each status domain, without implying identical meaning across domains.
- Reservation states: PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, EXPIRED, as documented by the current database baseline.
- Payment states must be shown independently: UNPAID, PENDING, PARTIALLY_PAID, PAID, FAILED, PARTIALLY_REFUNDED, REFUNDED, subject to the actual API.
- Physical-room readiness remains distinct from date-based availability.
- Use human-readable labels and, where relevant, a short explanatory tooltip or accompanying text.
- For provider-unknown payments, show review/pending rather than paid.
- Do not use colored badges as the only source of essential information.

### 4.5 Forms and form fields

- Every field requires a visible label and appropriate control type.
- Identify required fields and give format examples when useful.
- Associate help text and field errors with the field.
- Keep user input after recoverable validation or request failures.
- Show backend validation errors without revealing sensitive internals.
- For dependent fields such as rental duration and arrival/departure, revalidate when upstream values change.
- State whether displayed money is a rate, fee, deposit, estimated total, or verified paid amount.
- Never allow client-side form math to become the authoritative reservation total.
- Before destructive or financial submission, summarize consequences and require appropriate confirmation.

### 4.6 Dialogs, toasts, alerts, and feedback

- Confirmation dialogs must identify the affected booking, user, room, or financial entry and state the actual consequence.
- Manage focus on open, close, cancel, and completion.
- Do not use a toast alone for a critical error requiring corrective action.
- Announce status changes accessibly and avoid repeated noisy announcements.
- Distinguish success, failed validation, network errors, unauthorized access, conflicts, expired sessions, and provider-unknown outcomes.
- Provide a safe path back when a flow expires or inventory changes.

### 4.7 Component ownership and reuse

Prioritize existing components such as Button, FormField, StatusBadge, LoadingState, EmptyState, ErrorState, Modal, Pagination, RoomCard, ReservationSummary, and AdminPageHeader **only when present and suitable**. The names were examples in prior documentation, not a verified component inventory. Follow actual repository naming and established CSS scoping.

## 5. Screen-level application rules

### 5.1 Guest booking experience

The approved target sequence is:

1. Register and verify email.
2. Search room categories with valid rental period and occupancy.
3. Review selected room category and amenities.
4. Review backend-provided quote, fee breakdown, rental policy, and applicable cancellation terms.
5. Submit eligible reservation and establish the backend two-hour hold.
6. Choose PayMongo test checkout or Pay at Property.
7. Show backend-authoritative reservation/payment status.
8. Permit retries only where eligible; after expiration, require a fresh reservation and inventory check.

Do not add a visible payment countdown solely because the server enforces a hold. Do not show a confirmed booking from a PayMongo browser redirect alone. Clearly show when reconciliation is required.

### 5.2 Admin operational experience

- Reception tasks: arrivals, unpaid bookings, contact reminders, expected arrival, room assignment, check-in/out, housekeeping, and approved property-payment recording.
- Manager review: recorded damage/late-checkout charges and applicable rate management.
- Admin: permitted ordinary staff management.
- Super Admin: system-wide controls, sensitive financial exceptions, Admin-account management, and audit-log viewing.
- Frontend route and action visibility follow the user's permissions, but the backend remains the final enforcement point.
- Do not display reference-screenshot functions as implemented until API and source evidence confirm them.

### 5.3 Financial display rules

- Clearly separate reservation status, payment status, deposit balance, and approved additional charges.
- Show PHP currency consistently and derive final values from integer-centavo backend data.
- Do not call net collections profit.
- Distinguish authorized correction/refund from forbidden voluntary paid-booking cancellation.
- Payment exceptions and unknown results remain visible until backend reconciliation supplies an authoritative outcome.

## 6. Accessibility and interaction checklist

Target WCAG 2.2 AA where practical, without claiming conformance until tested.

### 6.1 Semantic structure and navigation

- [ ] One logical main landmark and appropriate header/nav/footer landmarks.
- [ ] One clear page-level heading; descending headings follow a meaningful hierarchy.
- [ ] Skip-to-main-content link works.
- [ ] All navigation works via keyboard and direct URL refresh.
- [ ] Current page is identified programmatically where appropriate.
- [ ] Route changes have a meaningful page title and focus/announcement behavior.

### 6.2 Visual legibility

- [ ] Normal text meets at least 4.5:1 contrast except applicable WCAG exceptions.
- [ ] Large text meets at least 3:1 contrast where applicable.
- [ ] Essential UI boundaries and graphics meet non-text contrast requirements.
- [ ] Status is understandable without color.
- [ ] Content remains usable at 200% text resizing and representative zoom/reflow settings.
- [ ] Long labels, prices, and reservation references do not clip.

### 6.3 Keyboard and focus

- [ ] All operable controls work without a mouse.
- [ ] Visible focus is not removed or obscured.
- [ ] Focus order matches visual and task order.
- [ ] Opening a modal moves focus appropriately; closing it returns focus predictably.
- [ ] Sidebar/mobile drawers support escape/close and focus containment as applicable.
- [ ] Icon-only actions have accessible names.
- [ ] Touch targets are usable without accidental selection.

### 6.4 Forms and error recovery

- [ ] Every input has an associated visible label.
- [ ] Required controls are identified in text.
- [ ] Field-level errors identify what must change.
- [ ] Errors are programmatically associated with inputs where applicable.
- [ ] Recoverable failure preserves safe entered values.
- [ ] Financial/cancellation actions require clear review and confirmation.
- [ ] Duplicate submission protections work across network latency and retries.
- [ ] Session expiration and access denial do not expose private data.

### 6.5 Images, tables, and motion

- [ ] Room images have useful alt text; decorative imagery is identified as decorative.
- [ ] Data tables use proper headers and readable column associations.
- [ ] Scrollable table regions remain keyboard-operable.
- [ ] Respect `prefers-reduced-motion` for nonessential movement.
- [ ] Loading indicators have appropriate accessible descriptions.
- [ ] Notifications use appropriate accessible status behavior without announcing sensitive details to unintended users.

### 6.6 State and business-integrity checks

- [ ] Loading, empty, success, validation-error, request-error, access-denied, and session-expired states exist where relevant.
- [ ] Stale availability and reservation conflicts show actionable next steps.
- [ ] Price changes require fresh backend confirmation.
- [ ] PayMongo return states reflect verified backend records, not query strings.
- [ ] No paid reservation offers an unauthorized voluntary cancellation action.
- [ ] Historic accountless bookings are not silently lost after mandatory registration is introduced.
- [ ] NFC areas are explicitly marked postponed, not functioning.
- [ ] Synthetic data and test-mode payment information are visibly labeled.

## 7. Responsive and cross-browser review matrix

| Test scenario | Guest Website | Admin Dashboard |
|---|---|---|
| 320px viewport | Navigation, room cards, search, checkout controls | Compact nav, cards, tables, action menus |
| 375px viewport | Pricing, validation, booking progression | Filters, details, dialogs |
| 768px viewport | Search-to-results reflow | Sidebar transition and table handling |
| 1024px viewport | Two-column content where appropriate | Workspace width and navigation grouping |
| Desktop | Images, reading width, summary visibility | Dense data layout and role-aware controls |
| Keyboard only | All guest journeys | All authorized staff journeys |
| 200% zoom | Forms and summaries remain usable | Tables, dialogs, focus, no loss of actions |
| Request failure | Recoverable inputs and next steps | Safe retry, stale state handling |
| Session expired | Re-authentication without private leakage | Clear privileged state and safe sign-in |

Use actual browser checks and owner-reported results rather than claiming completion from a checklist alone.

## 8. Design review and approval gates

1. Review the existing screen and related source/CSS tokens.
2. Confirm current user journeys, API support, and access permissions.
3. Identify whether changes are visual, interaction-only, or backend-dependent.
4. Propose exact affected files and a minimal component design.
5. Verify intended responsive and accessibility behavior.
6. Request owner approval and `EggPie` before implementation code or source changes.
7. After authorized implementation, perform the owner-approved verification steps.
8. Record tested results, limitations, and owner acceptance without overstating progress.

This design document does not authorize the implementation of new features, role changes, or API endpoints.

## 9. Unresolved design decisions

| Question | Current status | Required action |
|---|---|---|
| Exact live guest/admin CSS token values | Not inspected in source during this documentation task | Reconcile with each existing `tokens.css` before any restyling |
| Exact sidebar width and collapse behavior | Existing layout details require source inspection | Preserve working behavior unless owner approves change |
| Exact header height and nav breakpoint | Not documented as universal values | Use existing styles and actual content behavior |
| Typography scale and shadow variable names | Proposed values in this draft | Approve only if needed, no automatic token replacement |
| Guest registration and verification screens | Approved target business requirement, implementation unverified | Review API, routes, and historical guest access |
| Discounts and their staff permissions | Unresolved | Define before exposing related UI |
| Standard nightly checkout time | Unresolved | Finalize prior to check-out UI changes |
| Late-checkout partial-hour billing | Unresolved | Finalize billing display wording |
| Actual room prices and fee amounts | Property configuration not settled in this draft | Use backend records and approved property values |
| Historical occupancy trend UI | Deferred pending supported data source | Do not fabricate analytics |
| Global admin search and bell notifications | Reference UI ideas, not established working features | Require separate API and UX approval |

## 10. Sources and document control

**Consulted source files:**

- `design_guidelines.md` (existing design direction, token proposal, guest/admin layout, a11y requirements)
- `ADMIN_UI_UX_IMPLEMENTATION_PLAN.md` (admin design history, accepted checkpoint, screen patterns and verification requirements)
- `SCREEN_FLOWS_PROPOSED.md` (screen hierarchy, existing guest routes, proposed account/operations flows)
- `TECHNICAL_PLAN_APPROVED.md` (owner-approved target architecture and UI/security constraints)
- `AGENTS.md` (owner-confirmed current checkpoint and frontend responsibility refactor)

**Hierarchy:** Latest owner-confirmed `AGENTS.md` governs development status. `NEXORA_ARCHITECTURE_V2.1.md` remains the approved architecture until formally revised. This document adds proposed interface specifications without claiming installed source changes.

**Documentation change boundary:** This file is a new proposal for review. Do not overwrite the existing `design_guidelines.md` without separate owner approval. Never modify `spec.md`. No implementation code, package changes, database migrations, tests, deployments, or source files are authorized by this draft.
