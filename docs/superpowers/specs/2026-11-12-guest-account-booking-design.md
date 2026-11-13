# Guest accounts and booking design

Design approved by the owner on 2026-11-12, including deferred password recovery.
Implementation is pending under the step-specific EggPie/Pandecoco workflow.

## Purpose

Require a verified guest account before a visitor creates a website booking.
Give each guest access to their own reservations through My Bookings. Redesign
the shared website header using the supplied Home reference and the existing
system logo. Use the supplied Login reference for the sign-in page.

## Owner decisions

- NEXORA is a prototype. Existing accountless reservations are development data.
- Remove accountless booking from the guest website and backend entry points.
- Keep implementation simple and follow docs/CODING_PRINCIPLES.md.
- Keep the existing system logo.
- Provide code in chat after EggPie. Apply the approved code after Pandecoco.
- The owner runs tests, lint, builds, and browser checks.

## Existing foundations

The current guest App.jsx has public room browsing, checkout, booking-access,
payment-return, and a private single-booking page. GuestLayout renders Navbar.
RegistrationService already creates a GUEST user and a Guest profile linked
through Guest.userId. Login, refresh, logout, and email verification services
exist. OwnershipService already checks reservation.guest.userId.

GuestBookingsController currently permits accountless requests. Its booking
creation and recovery use separate booking credentials and private sessions.
These need an account-based entry point and ownership checks. Adding a login
screen alone would leave accountless API booking available.

The frontend and backend branches have separate recent changes. Implementation
must inspect the combined source before editing shared authentication or booking
code. This design does not establish branch integration or runtime success.

## Approach

Extend existing authentication, profile relationships, booking services, and
ownership checks. This is the recommended approach because the required account
and reservation relationships already exist.

A separate guest authentication backend would duplicate working services.
Keeping both accountless and account-based booking would conflict with the
owner's chosen flow. The plan therefore uses the existing shared backend with
required guest authentication for website reservation operations.

## Guest journey

Public visitors can browse rooms, prices, and availability. Selecting Reserve
opens sign-in when needed. Registration collects first name, last name, email,
and password. Reuse the existing email verification and resend behavior.

After sign-in, return to the selected room and stay dates using a validated
internal destination. Recheck availability and prices before booking. The guest
can choose the existing Pay at Property or PayMongo test checkout method.

The backend obtains the guest identity from the authenticated session. Resolve
the Guest profile through userId and attach the reservation to that profile.
Use its verified email as the booking contact email. Collect any required phone
or stay details in the booking form. Reject client attempts to select another
account as the reservation owner.

My Bookings lists the signed-in guest's reservations with status, room type,
stay dates, and totals. Opening a reservation displays its details and existing
permitted payment or cancellation actions. Reuse existing business rules.
Every read and action must check ownership in the backend.

## Shared header

Use the reference's navy background, horizontal desktop navigation, gold active
underline, outlined Sign In button, and gold Explore Rooms button. Reuse the
actual existing logo asset. Public links are Home, Rooms, About, Contact, and
Policies. Signed-in guests receive My Bookings and Sign Out. Replace Find
Booking navigation and related footer links with the account-based flow.

Use the existing Navbar component and styles where practical. Include an
accessible mobile menu, visible keyboard focus, and menu closing on navigation.
Show clear session-loading and sign-out feedback.

## Retiring the accountless flow

Remove guest-facing email-link booking lookup, accountless booking creation,
and accountless reservation access routes from the supported website flow.
Retired public API endpoints must stop granting access or creating reservations.
Audit payment-return, checkout recovery, cancellation, and payment summaries so
these use the signed-in account and ownership checks.

Keep internal helpers that still serve staff operations, payment processing,
or booking reliability. Preserve payment verification, inventory checks, and
duplicate-request protection. Scope booking retries and recovery to the account.

Existing sample reservations remain development records. New-account booking
demonstrations use new reservations. Data deletion, database resets, and
historical account-claiming features are outside this change.

## Simplicity and implementation decisions

Reuse the approved React/JSX, Router, Axios, plain CSS, NestJS, and Prisma stack.
Use focused components, hooks, API services, DTOs, and existing backend services.
Keep password hashing, validation, role checks, and ownership enforcement.

Password recovery is deferred from this prototype slice because the inspected
auth module has no existing reset flow. The initial slice includes registration,
verification, login, session restore, and logout. The owner approved this scope.

## Implementation order

1. Confirm this design and update affected account/booking requirements.
2. Add guest authentication pages and session handling using the existing API.
3. Redesign Navbar and connect navigation to guest session state.
4. Require guest authentication in booking creation and associate reservations
   with the account. Adapt payment and recovery entry points together.
5. Add My Bookings and reservation details with backend ownership enforcement.
6. Retire remaining accountless routes and links after replacements are wired.
7. Update API, business-flow, security, and current-status documentation to match
   the source. The owner performs acceptance checks before marking completion.

## Owner acceptance checks

- Register, verify email, sign in, refresh the page, and sign out.
- Return from login to the selected room and dates safely.
- Reject anonymous booking requests through the API as well as the website.
- Show each guest only their own reservations and reject another guest's IDs.
- Complete Pay at Property and PayMongo test booking flows using existing rules.
- Recover an interrupted submission without creating duplicate reservations.
- Handle expired sessions and unavailable requests with useful feedback.
- Confirm retired accountless endpoints cannot create or expose bookings.
- Check the shared header, actual logo, mobile menu, and keyboard interaction.
- Confirm staff booking and administration entry points still work.

No acceptance checks have been executed for this proposed change.
