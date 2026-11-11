# NEXORA guest booking/payment redesign — AI continuation handoff

Updated 2026-11-03. This is a continuation of implemented work, not a request to
restart the redesign. Read [AGENTS.md](AGENTS.md), especially section J, and the
relevant guides before proposing another change. This document is suitable for
uploading to another AI account; it contains no credentials or guest records.

**Source organization update (2026-11-10):** The historical redesign/transfer
record below is retained. The main directory now also contains the guest-web,
admin-web, and backend responsibility refactors. Frontend state and handlers
live in `src/hooks/`, presentation is organized under pages and feature component
folders, definitions/helpers live in `constants/` and `utils/`, and each frontend
has `styles/tokens.css`. Backend services use feature-local policy, projection,
validation, refund-settlement, and reconciliation helpers while retaining their
authorization and transaction boundaries.

Use [AGENTS.md section K](AGENTS.md#k-responsibility-separation-checkpoint-2026-11-10)
and the [current directory updates](DIRECTORY_STRUCTURE.md#21-current-refactor-directory-updates-2026-11-10)
for these file locations and verification records. This addition records source
organization only; it does not establish new browser, backend runtime, or
provider acceptance, or change the historical instructions below.

## 1. Instructions for the receiving assistant

- Start with read-only inspection and compare this checkpoint with actual files.
- Follow [NEXORA Architecture v2.1](NEXORA_ARCHITECTURE_V2.1.md),
  [coding patterns](CODING_PATTERNS.md), [principles](CODING_PRINCIPLES.md),
  [development rules](DEVELOPMENT_RULES.md), [security](SECURITY.md) and
  [design guidelines](design_guidelines.md). The owner's revised booking policy
  below supersedes the earlier Pay at Property auto-confirmation policy.
- Earlier conversation reached owner-reported Step 10.5 acceptance and a request
  to continue Step 11.2 before cleanup/redesign. NFC was postponed. This is
  historical owner context, not a new audit or Phase 11 completion claim.
- Preserve existing work. Older phase tables in the guides are historical;
  do not restart completed steps or infer current completion from phase labels.
- Use Superpowers if available. Work one implementation step at a time.
- Explain the step, pair exact file paths with ready-to-copy code in chat, and
  give a grouped owner-run test checklist and next-step preview.
- The owner applies code and runs checks. Do not edit/create/move/delete code,
  run tests/builds/apps, seed/migrate databases or call providers yourself.
  Read-only inspection is allowed. Documentation changes were a specific
  exception for this handoff, not continuing permission to implement directly.
- Attribute pasted console/browser evidence to the owner. Never claim those
  checks were executed by you. Do not add dependencies, live payments, refunds,
  deployment, commits, pushes or NFC work.
- Keep secrets, raw recovery/session tokens, guest data and database contents out
  of chat, logs, documentation and upload packages.

## 2. Locations and installation boundary

Main project: `D:\Web-JSX\NEXORA`.

Isolated workspace:
`C:\Users\chrst\AppData\Local\Temp\nexora-guest-payment-2ec027c638874bea8376bd851d04ee17`.

Within isolation:

```text
backend/                         Backend implementation and tests
frontend/guest-web/               Separate guest frontend and installed tooling
browser-review-f00672afe6194faca2c924d1e9d61fec/
  phase7.step2.manual.test.db      Persistent synthetic browser fixture
guest-payment.test.db             Older setup target; do not substitute it
```

Read-only inspection confirmed that main is an incomplete copy of the redesign:

- Main and isolated schema/migration source match: 28 models, seven migration
  directories, including `20261103090000_guest_booking_flow`.
- Main has the early guest DTO/policy/spec and new schema/migration source.
- Main payment deadline service, checkout-expiration adapter and its spec were
  zero-byte files at inspection. Do not count them as installed functionality.
- Most new guest services/controller/middleware/worker and frontend helpers are
  isolated-only. Existing checkout, webhook, private-access, lifecycle,
  acquisition, adapter and guest page files differ across the copies.
- Backend and guest manifests/lockfiles match across copies. This redesign
  added no dependency. Prior installed-version evidence is dated 2026-11-01.

Do not copy everything into main. Compare individual files and preserve existing
main changes. Schema source does not prove database deployment or client alignment.

## 3. Approved booking rules

### Pay at Property

1. Initially PENDING; creation does not record payment.
2. Authorized Admin/Manager/Receptionist records phone or email contact.
3. First contact starts a 24-hour response window. Repeated contact cannot reset it.
4. Staff records explicit guest agreement before confirming.
5. Earlier deadline wins: response deadline or expected arrival plus 30 minutes.
6. Overdue pending requests become CANCELLED; assignments/inventory are released
   with audit history. Confirmed no-shows are outside this automatic rule.

### PayMongo

1. Initially PENDING with a 15-minute local inventory hold.
2. Backend prepares test Hosted Checkout without an email round trip.
3. A verified matching full PHP payment, active hold and safe inventory can
   confirm the booking. Match local attempt/reference, provider IDs and exact
   integer gross centavos. Record coordinated effects atomically.
4. Preserve early webhook receipt before checkout creation finishes. Retries and
   concurrent clients must not duplicate payment or confirmation effects.
5. Retain stale, late, mismatched and conflicting evidence for review. Never
   revive CANCELLED/EXPIRED bookings or automatically check guests in.
6. Local expiry does not itself close the provider page. Provider expiration
   uses read-before/read-after checks outside database transactions and retains
   uncertain results for retry/review.

Both methods require guest-selected arrival time in Asia/Manila. It does not
change nights or prices. Preserve backend snapshots and optional accounts.
References and email addresses are not private authorization. Existing bookings
must not receive invented arrival times or retrospective policy changes.

## 4. Implemented isolated source map

Paths are relative to the isolated workspace. Inspect them before editing.

| Area | Important files |
|---|---|
| Schema/contracts | `backend/prisma/schema.prisma`; `backend/prisma/migrations/20261103090000_guest_booking_flow/migration.sql`; guest DTOs under `backend/src/reservations/dto/` |
| Booking/recovery | `backend/src/reservations/guest-booking-policy.ts`, `guest-booking-security.ts`, `guest-booking.service.ts`, `reservation-acquisition.service.ts` |
| Staff foundation | `backend/src/reservations/guest-booking-staff.service.ts`; internal service, not proof of an installed staff API/admin interface |
| Guest transport | `backend/src/reservations/guest-bookings.controller.ts`, `guest-booking-privacy.middleware.ts`, `booking-access.service.ts`, `reservations.module.ts` |
| Inventory/deadlines | `backend/src/reservations/reservation-lifecycle.ts`, `inventory-write.ts`; `backend/src/payments/guest-booking-deadline.service.ts`, `guest-booking-deadline.worker.ts` |
| Online processing | `backend/src/payments/pending-online-booking.ts`, `checkout.service.ts`, `paymongo-webhook.service.ts`, `paymongo.adapter.ts`, `paymongo-checkout-expiration.adapter.ts`, `payments.module.ts` |
| Guest API/context | `frontend/guest-web/src/services/guestBookingApi.js`; `src/utils/bookingAttempt.js`, `bookingContext.js` |
| Guest state | `frontend/guest-web/src/hooks/useGuestCheckout.js`, `usePrivateBooking.js` |
| Guest views | `frontend/guest-web/src/pages/Checkout.jsx`, `MyBooking.jsx`, `PaymentReturn.jsx`; `src/components/GuestBookingReceipt.jsx`, `BookingPayment.jsx`; `src/styles/guest-checkout.css` |

Guest routes under `/api/reservations/access/guest-bookings`:

| Method/path suffix | Meaning |
|---|---|
| POST base path | Create/replay booking; returns a limited receipt and sets private cookie |
| POST `/recover` | Recover original request using requestId and recoveryToken |
| POST `/checkout/current` | Read the current attempt, requiring cookie and expectedReservationNumber |
| POST `/checkout` | Prepare/replay checkout, requiring cookie, expectedReservationNumber and requestId |

Use existing Origin allowlisting, throttling, DTO validation and no-store headers.
Raw session tokens go only into the HttpOnly, SameSite=Strict booking cookie,
Secure in production, path `/api/reservations/access`. Private reads expose
stored preference, arrival/contact/deadline timestamps and derived holdExpired.

Session storage retains original request IDs, recovery credential and stay
selection, not guest names/email/phone. Do not clear unknown outcomes to retry
with another booking. Checkout request IDs are retained across reloads.

My Booking shows verified summaries for closed bookings without offering new
payment. Pending online controls require an active hold; pending property
requests require staff confirmation. Private scope is pinned and data is hidden
after session expiry. Provider return URLs include a public booking-reference
scope hint; private access and matching backend records are still required.
Changing `outcome=paid` never establishes payment or confirmation.

## 5. Verification evidence

The owner ran these checks. They were not rerun during documentation editing:

| Checkpoint | Evidence |
|---|---|
| Earlier deadline/booking/checkout/webhook set | 129 tests across six files passed, mocked provider |
| Worker safeguards and lifecycle | Passed with fake timers and mocked processor |
| Latest private/return regression | 77 tests across four files passed: guest HTTP 28, checkout 23, webhook 25, return-URL test 1 |
| Warning correction | Targeted return-URL test passed; backend lint four older warnings, zero errors |
| Builds | Backend and isolated guest builds passed |
| Frontend | Lint zero warnings/errors; in-memory recovery storage checks passed |

The sets overlap; do not add them into a distinct test total or claim full-suite
coverage. The older backend warnings are missing sort comparators in
booking-access/lifecycle/cancellation specs and an unbound mocked email method in
booking-access.http.spec.ts. No redesign-created warning remains in the latest
supplied output.

Permanent new specs include guest-booking-policy.spec.ts,
guest-booking-expiration.spec.ts, guest-booking.spec.ts,
guest-booking.http.spec.ts, paymongo-checkout-expiration.spec.ts,
guest-booking-deadline.worker.spec.ts and paymongo-checkout-return.spec.ts.
Existing checkout/webhook suites were retained. Inspect dedicated fixture
requirements before running any other suite; missing fixtures are a stop
condition, never a reason to substitute dev.db.

## 6. Browser and runtime checkpoint

The guarded existing `backend/scripts/seed-checkout-demo.mjs` initialized the
fresh browser fixture with a synthetic property, Demo Deluxe type and one room.
It applies SQL to a fresh test file without Prisma deployment-history records.

The guest selected PAYMONGO while API/signing secrets were intentionally blank.
The booking saved; no payment link or provider checkout was created. Owner-run
read-only counts were one Guest, one Reservation, one GuestBookingAttempt and
zero Payment records. The hold was observed active before its deadline and then
owner-observed EXPIRED after enabling the worker. Preserve that history; never
extend or revive it for another test.

Owner subsequently confirmed browser checks for stored arrival/payment/deadline
details, no checkout action on the expired booking, safe payment-return hints,
no false paid result from outcome=paid and no private details after sign-out.
Separate Pay at Property browser acceptance remains incomplete/unconfirmed.

Previous settings:

- Backend: port 3000; frontend: `http://localhost:5175`.
- Frontend API: `http://localhost:3000/api`; allowed Origin: frontend origin.
- Application DB: explicit absolute NEXORA_RUNTIME_DATABASE_URL to the browser
  fixture. Prisma CLI uses DATABASE_URL separately.
- Worker: disabled by default; opt in with
  NEXORA_BOOKING_DEADLINE_WORKER_ENABLED=true. Its current guard requires an
  absolute .test.db path and rejects dev.db. It was enabled for expiry testing.
- PAYMONGO_TEST_SECRET_KEY and PAYMONGO_TEST_WEBHOOK_SECRET were deliberately
  blank during the browser pass. They are different backend-only credentials.

Recheck process environment, running servers, cookie/recovery expiry, tunnel and
webhook configuration after restart. Do not assume any survived overnight. Old
2026-11-01 provider smoke evidence does not verify the redesigned flow.

## 7. Remaining work in order

1. Re-establish the exact isolated runtime; inspect source/config requirements
   without printing secret values. Keep the expired booking as history.
2. Complete missing Pay at Property browser acceptance and assess whether the
   internal staff foundation still needs API/admin controls for the revised flow.
3. Configure test API credentials, return URL, tunnel/webhook endpoint and its
   separate signing secret privately. Have configuration ready before booking.
4. Create a fresh online booking, finish test checkout, verify signed delivery,
   matching payment/event/audit, confirmed reservation and matching guest views.
5. Verify actual duplicate delivery does not duplicate effects.
6. Use a separate unpaid online booking to verify local expiry and actual
   provider-session expiration; retain uncertain results for retry/review.
7. Review remaining recovery, cross-tab, scope, deadlines and operational gaps.
8. Prepare a concrete source-transfer and migration-history plan with backups.
   Retire the old auto-confirming Pay at Property endpoint during coordinated
   frontend/backend cutover; its continued availability is a release blocker.
9. After acceptance and reviewed transfer, synchronize the other affected guides.

No complete redesign acceptance, actual redesigned provider verification,
production deployment or main transfer is established by the current checkpoint.

## 8. Main database and transfer safety

- Never reset, seed, delete, replace or migrate any dev.db without separate,
  explicit reviewed authorization. This handoff grants none.
- Main dev.db was previously replaced during an explicitly authorized cleanup.
  Its Prisma deployment history may be absent. Inspect before designing the
  transfer; do not infer migration safety from matching schema files.
- Preserve existing main data and backups. A pre-transfer backup exists under
  `D:\Web-JSX\NEXORA\backups`; verify suitability before proposing restoration.
- Do not copy isolated databases, node_modules, .env files or build output into
  main. Do not overwrite partial main source artifacts without comparing them.
- The isolated workspace is in a temporary directory: keep it available. If
  another account/computer cannot access it, ask for the relevant source and
  guides; uploaded Markdown alone does not transfer implementation or tools.

## 9. Upload / resume instructions

Upload this file and AGENTS.md. Supply the architecture and relevant guides or
source files as needed, excluding databases, credentials, environment files,
cookies, recovery storage and private guest records.

Suggested opening prompt:

> Continue the existing NEXORA guest booking/payment-method redesign from
> AI_HANDOFF.md and AGENTS.md section J. Inspect current files read-only, preserve
> completed work, and summarize the first remaining verification step. Give code
> only in chat with exact paths and grouped owner-run checks. Do not implement,
> test, migrate, transfer or deploy anything yourself. Do not create a fresh
> online booking until isolated test-payment configuration is ready.
