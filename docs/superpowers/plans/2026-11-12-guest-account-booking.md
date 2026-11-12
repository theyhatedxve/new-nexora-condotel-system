# Guest accounts and booking implementation plan

> For agentic workers, use superpowers:executing-plans to implement this plan task by task. Follow the owner's code delivery and verification workflow.

## Goal

Require verified guest login for website bookings, provide My Bookings, and
redesign the shared header using the existing system logo.

## Architecture and stack

Extend the existing React/JSX, Vite, Router, Axios, and plain CSS guest website.
Reuse the shared NestJS API, Prisma Guest.userId relationship, authentication,
ownership helpers, reservation acquisition, and payment services.

The approved design is at
`docs/superpowers/specs/2026-11-12-guest-account-booking-design.md`.

## Global constraints

- Keep the work suitable for a prototype and follow CODING_PRINCIPLES.md.
- Reuse existing services and add focused modules only where needed.
- Retain the existing logo asset and use the supplied Home and Login references.
- Password recovery is deferred by owner approval.
- Existing accountless reservations are development records. Use new bookings
  for account-based demonstrations. Database cleanup requires a separate request.
- EggPie requests complete implementation code in chat for the next step.
- Pandecoco authorizes applying that approved code and reporting saved files.
- The owner executes tests, lint, builds, apps, and browser checks.
- Produce no automatic commits, merges, dependency additions, or database changes.
- Verify the current branch and source before every implementation step. Recent
  staff authentication changes exist separately on backend and frontend branches.

## Review focus

1. Anonymous callers must fail at backend booking and private read endpoints.
2. A signed-in guest must never read, pay for, cancel, or recover another account's reservation.
3. Interrupted submissions and payment attempts must recover without duplicates.
4. Expired sessions and invalid return destinations must have safe navigation.
5. Retiring private booking cookies must preserve provider webhooks, staff
   operations, inventory checks, and existing payment confirmation rules.

## Step 1 — Guest account pages and session state

Create these files inside `frontend/guest-web/src/`.

- `auth/GuestAuthProvider.jsx`, `auth/useGuestAuth.js`, and `auth/GuestRoute.jsx`
  own session context and protect guest-only routes.
- `services/guestAuthApi.js` owns registration, verification, resend, login,
  refresh, current identity, and logout requests.
- `hooks/useGuestSession.js` subscribes to session state.
- `hooks/useGuestLogin.js` and `hooks/useGuestRegistration.js` coordinate forms.
- `pages/Login.jsx`, `pages/Register.jsx`, and `pages/VerifyEmail.jsx` present
  account forms and verification feedback.
- `styles/guest-auth.css` provides responsive forms matching the Login reference.
- `utils/guestReturnPath.js` validates internal booking return destinations.

Modify `services/api.js` for credentialed session requests while preserving its
named api export, image URL resolution, and existing callers. Modify `App.jsx`
to register `/login`, `/register`, and `/verify-email` inside GuestLayout.

Reuse `/api/auth/register`, `/verify-email`, `/resend-verification`, `/login`,
`/refresh`, `/logout`, and `/me`. Inspect their individual response envelopes.
Registration submits firstName, lastName, email, and password. Verified active
GUEST identities may book. Staff identities receive a clear staff-access link.

Session state exposes loading, anonymous, authenticated, and error states with
user, message, login, logout, and retry operations. Store access credentials in
memory and reuse refresh cookies. Clear private data when the identity changes.
Avoid silent write retries following authentication errors.

The shared backend currently uses one refresh cookie. Handle identity changes
between guest and admin tabs through existing identity checks and role guards.
Record any proposed cookie configuration change for owner review before applying.

Return paths must resolve to the current origin and an allowed guest booking
route. Reject external origins, protocol-relative URLs, and auth redirect loops.
Carry selected room and dates through registration and verification. Recheck
availability later. Never place passwords in URLs or persistent browser storage.

- [ ] Prepare complete Step 1 code after EggPie.
- [ ] Apply after Pandecoco and report each saved file.
- [ ] Owner checks registration, verification, resend, login, refresh, logout,
  invalid credentials, unavailable server, and rejected redirect destinations.

## Step 2 — Shared header

Modify `frontend/guest-web/src/components/Navbar.jsx`,
`hooks/useGuestNavigation.js`, and `styles/guest-header.css`.
Reuse `assets/branding/logo-horizontal-dark.svg` as the existing logo asset.
Adjust its surrounding surface if needed for legibility against navy.

Provide Home, Rooms, About, Contact, and Policies navigation, gold active text
and underline, an outlined Sign In action, and gold Explore Rooms action.
Signed-in guests receive My Bookings and Sign Out. Use the session from Step 1.
Keep the mobile menu keyboard accessible, close it on navigation, and display
session-loading and sign-out failures clearly. Add My Bookings with Step 4's
route so the header never exposes an unfinished destination.

- [ ] Deliver and apply the header through the same approval workflow.
- [ ] Owner checks the existing logo, active links, desktop spacing, mobile menu,
  keyboard focus, anonymous state, authenticated state, and sign-out failure.

## Step 3 — Account-owned booking and checkout

Modify these backend files as a coordinated change.

- `src/reservations/guest-bookings.controller.ts`
- `src/reservations/guest-booking.service.ts`
- `src/reservations/dto/create-guest-booking.dto.ts`
- `src/reservations/dto/recover-guest-booking.dto.ts`
- `src/reservations/reservation-acquisition.service.ts`
- `src/reservations/reservation-validation.service.ts`
- Relevant booking security helpers and `reservations.module.ts` as needed.

Move supported website creation and recovery to authenticated GUEST endpoints
under `/api/guest/reservations`. Require allowed Origin on writes. Obtain the
Guest profile using the JWT identity and recheck active account eligibility in
the booking transaction. Use the verified account email and linked profile.
Accept room type, stay dates, guest count, arrival details, payment preference,
phone, and existing request/recovery credentials. Reject supplied owner IDs.

Extend the acquisition boundary with an optional trusted Guest profile argument
for authenticated creation. Preserve existing staff callers. Use the linked
Guest directly instead of creating an extra Guest for each account booking.
Keep inventory acquisition, totals, timing rules, and audit writes transactional.

Bind attempt fingerprints and recovery proofs to the authenticated account as
well as the request and payload. Verify this binding before returning an existing
attempt, including attempts still processing. Reuse the existing durable attempt
record and recovery helpers. Confirm whether this can use current fields before
proposing any schema change. Every persisted attempt must have an unambiguous
owner from its creation, including failure and retry paths.

Modify frontend `services/guestBookingApi.js`, `hooks/useGuestCheckout.js`,
`hooks/useGuestBookingReceipt.js`, `hooks/useCheckoutForm.js`,
`components/checkout/CheckoutForm.jsx`, `pages/Checkout.jsx`, and
`utils/bookingAttempt.js` to use authenticated creation and recovery. Key local
attempt context by account. Keep passwords and bearer credentials out of it.
Protect `/checkout/:roomTypeId` with GuestRoute and restore selected stay values
after login. Derive account contact identity from the server.

Adapt payment calls in `services/bookingPaymentsApi.js`,
`hooks/useBookingPayment.js`, and `pages/PaymentReturn.jsx` to the existing
owned endpoints in `backend/src/payments/payments.controller.ts`.
These already expose reservation checkout GET/POST and payment summaries.
Require sign-in after a provider return if the session expired, then re-fetch
the owned reservation. Provider return parameters never establish payment success.

- [ ] Deliver creation, recovery, checkout, and payment-return changes together.
- [ ] Owner checks API rejection without login, contact identity, changed
  availability, duplicate submission, interrupted-response recovery, wrong-account
  recovery, and both payment methods using isolated development checks.

## Step 4 — My Bookings and reservation details

Create backend `src/reservations/guest-reservations.controller.ts`,
`guest-reservations.service.ts`, and `dto/guest-reservation-list.dto.ts`.
Register them in `reservations.module.ts`.

Provide GUEST-only GET `/api/guest/reservations` with page and limit query
parameters, using 20 records per page. Return items, total, page, limit, and
totalPages inside data. Filter by `guest.userId` using the authenticated identity.
Provide GET `/api/guest/reservations/:id` with the same ownership restriction.
Order by createdAt descending and id descending. Return private 404 for a
foreign or missing reservation and use no-store headers for private responses.

Project reservation ID, reference, status, room type, stay dates, guests,
payment preference, arrival details, and snapshotted centavo totals. Reuse
existing ownership, cancellation policy, and financial-summary helpers.

Create frontend `services/guestReservationsApi.js`, `hooks/useGuestBookings.js`,
`pages/MyBookings.jsx`, and `styles/my-bookings.css`. Adapt `pages/MyBooking.jsx`
and its focused view/context hooks to fetch by authenticated account and route ID.
Register `/my-bookings` and `/my-bookings/:reservationId` behind GuestRoute.
Pass reservation IDs explicitly to payment and cancellation operations.

- [ ] Owner checks empty and paginated lists, detail refresh, two guest accounts,
  forbidden ownership attempts, expired sessions, and permitted cancellation.

## Step 5 — Retire accountless entry points and update documentation

Modify frontend `App.jsx`, `components/Footer.jsx`, and links in pages/components
that still use `/booking-access` or `/my-booking` without a reservation ID.
Replace prompts with Sign In or My Bookings according to session state.
Remove obsolete BookingAccess page/hook/service imports and code after checking
their remaining callers. Remove obsolete single-booking context requirements.

Remove public access handlers from backend `booking-access.controller.ts` and
unregister unused services in `reservations.module.ts`. Inventory every public
booking route, including `reservations.controller.ts`, so an alternate anonymous
creation path cannot remain. Preserve staff creation and internal dependencies.
Retired API routes return the normal unavailable-route response and grant no
access, including when a browser still has an old private booking cookie.

Revise relevant existing automated checks to expect authenticated ownership and
retired access behavior. The owner runs them with the approved isolated test
database configuration. Keep provider webhook coverage and staff regression
checks applicable to the retained flows. Report the exact targeted commands
when delivering this step, using the actual existing test filenames.

Update only affected sections of `docs/NEXORA_ARCHITECTURE_V2.1.md`,
`CODING_PRINCIPLES.md`, `BUSINESS_FLOWS.md`, `API.md`, `SECURITY.md`,
`DIRECTORY_STRUCTURE.md`, and `AGENTS.md`. Describe mandatory guest accounts as
the owner-approved replacement for optional accountless website booking.
Keep implementation status distinct from owner acceptance results.

- [ ] Owner checks retired routes, stale cookies, navigation, staff operations,
  account ownership, both payment flows, and responsive access screens.
- [ ] Mark completion only after the owner supplies acceptance results.

## Owner commands

Run these from `D:\Web-JSX\NEXORA` after the relevant step is applied.

```powershell
npm.cmd --prefix frontend/guest-web run lint
npm.cmd --prefix frontend/guest-web run build
```

Backend source changes also need the owner's isolated targeted regression checks,
followed by lint and build from the backend directory. Confirm its installed
Prisma client matches the selected branch before starting. Any generation or
migration action needs its own explanation and the owner's execution.

## Current status

The design is approved. This implementation plan is prepared. Application
implementation and owner verification are pending. Start with Step 1 code
delivery when the owner says EggPie, then apply that code after Pandecoco.
