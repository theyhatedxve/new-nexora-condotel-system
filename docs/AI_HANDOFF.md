# NEXORA guest booking/payment redesign — AI continuation handoff

## Current finalization handoff — 2026-11-20

**Status:** Cleanup Batches 1–5 owner-confirmed complete.
Documentation closure and consolidated final verification remain pending.

This checkpoint supersedes older "next task" statements about repairing
the Hello World E2E fixture. Its replacement is now present in source.

### Latest changes

- Removed four unused Dashboard component/style files.
- Confirmed backend runtime and Prisma tooling target backend/dev.db.
- Replaced the starter E2E test with an isolated application smoke suite.
- Extracted charge/deposit validation into reservations/validation/.
- Extracted charge, deposit, and pricing form logic into three Admin hooks.
- Centralized common dialog structure in styles/admin-dialogs.css.
- Removed the unused Pencil import from RoomTypes.jsx.

Existing workflows, API contracts, permissions, recovery behavior,
transaction ownership, and saved application data remain the
behavior-preservation boundary.

### Verification boundary

Completion confirmations are owner-reported.
The assistant performed source inspection and comparisons only.
No consolidated final run output or exact successful totals have been
supplied for this checkpoint.

The owner runs tests, lint, builds, applications, and browser checks.
Do not run them without the applicable owner authorization.

### Owner-run final commands

Run from D:\Web-JSX\NEXORA:

```powershell
npm.cmd --prefix backend run lint
npm.cmd --prefix backend run build
npm.cmd --prefix backend run test
npm.cmd --prefix backend run test:e2e

npm.cmd --prefix frontend/admin-web run lint
npm.cmd --prefix frontend/admin-web run build

npm.cmd --prefix frontend/guest-web run lint
npm.cmd --prefix frontend/guest-web run build
```

Stop and resolve any failures before treating final verification as complete.
Record warnings separately from errors and successful builds.

### Browser acceptance

- Admin: Dashboard, notifications, Rooms, Room Types, and Reports.
- Reservation assignment, charges, deposits, and confirmation/retry flows.
- Dialog keyboard focus, Escape/Back, pending-save restrictions,
  internal scrolling, and narrow-screen layouts.
- Guest: login/logout, room search, booking, and My Bookings.
- Shared application data through the same backend API.
- Existing financial warnings and role restrictions.

### Retention boundary

Keep dev.db, nexora.demo.db, all 14 migrations, active tests,
uploaded images, encryption configuration, and existing recovery ZIPs.
Do not merge test fixtures into dev.db.

No reset, seed, migration consolidation, archive deletion,
dependency upgrade, commit, or deployment is part of this closure.

### Next action

After documentation is applied, collect the owner's final command and
browser results. Record actual results before marking consolidated
verification complete.

NFC remains postponed. Production deployment remains deferred.

## Cleanup handoff — 2026-11-19

**Status:** Cleanup and organization completed, owner-confirmed.

Reservation policies are in backend/src/reservations/policies/.
PayMongo integration files are in backend/src/payments/paymongo/.
Charge and deposit DTOs are in backend/src/reservations/dto/.

Five room-related test suites use the existing isolated-database helper.
Their 58 test bodies were preserved. Cleanup and nested test registration
were corrected.

The backend uses backend/dev.db.
backend/nexora.demo.db remains the optional synthetic demonstration database.
Both database settings must point to the intended target.

Old databases and expanded recovery folders were archived.
Recovery ZIPs remain under backups/ and backups/archive/.
All 14 migrations remain required and preserved.

### Verification record

The latest supplied full-suite output showed 954 passing tests and one
reservation-journey timeout. The owner later confirmed completion.
No successful rerun output or exact final totals were supplied.

Do not rerun tests, lint, builds, servers, seeds, or database operations
without the applicable owner execution authorization.

### Next scoped task

Review and repair backend/test/app.e2e-spec.ts before treating test:e2e
as finalized. It retains the Hello World! template assertion and uses
AppModule without an isolated Prisma override.

NFC remains postponed. Production deployment remains deferred.
Consult [the current checkpoint](MD_Files/AGENTS.md) before further changes.

Earlier handoff checkpoints below remain historical context.

## Admin UI handoff update — 2026-11-19

**Status:** Admin UI redesign closed, owner-confirmed.

The owner confirmed completion of all approved redesign batches
and the final visual consistency and accessibility review.

The latest batch covers Reports, Users & Roles, staff account forms,
Settings, and Audit Logs. These screens use the shared
frontend/admin-web/src/styles/admin-management.css stylesheet.

The approved redesign preserves existing API contracts,
role restrictions, financial warnings, filters, pagination,
and account/settings review workflows.

### Verification boundary

Final acceptance is owner-reported.
The assistant confirmed the latest stylesheet connections through
source inspection. No fresh runtime verification output accompanied
the owner's final acceptance.

### Next action

There is no remaining screen batch in this approved redesign.
The owner selects the next maintenance or enhancement task.

Consult [the current project checkpoint](MD_Files/AGENTS.md)
before starting further work.

NFC functionality remains postponed.
Production deployment remains deferred.

The November 18 checkpoint below remains historical context.

## Current handoff checkpoint — 2026-11-18

The owner confirmed completion of Phase 11 verification and acceptance of
the Phase 12 local prototype demonstration.

The accepted local prototype includes:

- Guest account registration, login, and authenticated booking access.
- My Bookings and reservation details.
- The completed admin UI redesign.
- Guest Accounts for Super Admin and Admin, including unbooked accounts.
- AES-256-GCM encryption of guest phone numbers.
- Owner-verified phone conversion and database restoration.
- Local configuration templates and startup instructions.
- A separate synthetic demo database.
- Synthetic staff and guest accounts, rooms, rental rates, and bookings.
- The admin navigation scrolling correction.

### Evidence and scope

These completion statements reflect owner-reported checks and acceptance.
The assistant inspected relevant source and documentation during the work.
Record exact test counts or independently observed runtime results only
when supporting output is available.

NFC functionality remains postponed.
Production deployment remains deferred.

### Running the accepted prototype

Follow [LOCAL_PROTOTYPE_SETUP.md](LOCAL_PROTOTYPE_SETUP.md).

| Component | Address |
|---|---|
| Backend API | http://localhost:3000/api |
| Guest website | http://localhost:5175 |
| Admin website | http://localhost:5176 |

Use backend/nexora.demo.db for the synthetic demonstration and
backend/dev.db for the existing development environment.

Both Prisma and the running application must target the intended database.
Preserve the encryption keys required by each database and its backups.

### Current continuation

The owner selects the next maintenance or enhancement task.

Consult [the current project checkpoint](MD_Files/AGENTS.md) before changes.
Follow the current authorization workflow and owner-run verification rules.

### Historical records

The dated records below preserve earlier implementation and verification
states. Their pending tasks are superseded by the current checkpoint.

## Historical continuation and database recovery — 2026-11-15

Continue with Guest Account Booking Step 5 verification. Steps 1-4, source
cleanup, seven authenticated/retirement test migrations, and eight regression
corrections are applied. The final role-test this: void annotation awaits lint.
The latest owner run reported 10 failed files, 38 passed files, 33 failed tests,
583 passed tests, and 53 skipped. Backend build passed. Frontend checks passed
in earlier owner output, with an admin bundle-size warning.
Four isolated auth/ownership/registration/security databases migrated. The run
stopped at phase4.step1.test.db with P3018 because RoomBlock.canceledAt already
exists. Recovery instructions verify that column and migration history before
reconciling its record and deploying the remaining migrations. Recovery output
is pending. The owner runs migrations, tests, lint, builds, and browser checks.
Next, recover the five Phase 4 test databases, rerun backend checks, and obtain
browser acceptance. Use [AGENTS.md](MD_Files/AGENTS.md) for exact names and status.

## Historical continuation checkpoint — 2026-11-14

Continue from the Guest Account Booking upgrade.

Steps 1-4 are present in source. Step 5 source cleanup and authenticated
test fixture migration are applied. Owner verification remains pending.

Legacy booking-access service, email service, security helper, configuration,
DTO, and session-based checkout methods are removed. Retirement controllers
return HTTP 410.

Property settings no longer expose bookingLinkMinutes.

Next, obtain owner-run backend tests, lint and build results, frontend lint
and build results, and complete guest booking browser acceptance.

Use the current checkpoint in AGENTS.md. Earlier transfer records and
accountless implementation descriptions below are historical.

Updated 2026-11-03. This is a continuation of implemented work, not a request to
restart the redesign. Read [AGENTS.md](MD_Files/AGENTS.md), especially section J, and the
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

Use [AGENTS.md section K](MD_Files/AGENTS.md)
and the [current directory updates](DIRECTORY_STRUCTURE.md#21-current-refactor-directory-updates-2026-11-10)
for these file locations and verification records. This addition records source
organization only; it does not establish new browser, backend runtime, or
provider acceptance, or change the historical instructions below.

## 1. Instructions for the receiving assistant

- Start with read-only inspection and compare this checkpoint with actual files.
- Follow [NEXORA Architecture v2.1](NEXORA_ARCHITECTURE_V2.1.md),
  [coding patterns](CODING_PATTERNS.md), [principles](CODING_PRINCIPLES.md),
  [development rules](DEVELOPMENT_RULES.md), [security](SECURITY.md) and
  [design guidelines](MD_Files/design_guidelines.md). The owner's revised booking policy
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
change nights or prices. Preserve backend snapshots and authenticated guest ownership.
References and email addresses are not private authorization. Existing bookings
must not receive invented arrival times or retrospective policy changes.

## 4. Implemented isolated source map

Paths below describe the current repository. Earlier isolated-transfer notes retain their dated scope. Inspect the current source before editing.

| Area | Important files |
|---|---|
| Schema/contracts | `backend/prisma/schema.prisma`; `backend/prisma/migrations/20261103090000_guest_booking_flow/migration.sql`; guest DTOs under `backend/src/reservations/dto/` |
| Booking/recovery | `backend/src/reservations/guest-booking-policy.ts`, `guest-booking-security.ts`, `guest-booking.service.ts`, `reservation-acquisition.service.ts` |
| Staff guest-booking operations | `backend/src/reservations/guest-booking-staff.service.ts` and `guest-booking-staff.controller.ts`; permitted contact, confirmation, and rejection actions |
| Guest transport | `backend/src/reservations/guest-bookings.controller.ts`, `guest-reservations.controller.ts`, `guest-reservations.service.ts`, `guest-booking-privacy.middleware.ts`, `reservations.module.ts` |
| Inventory/deadlines | `backend/src/reservations/reservation-lifecycle.ts`, `inventory-write.ts`; `backend/src/payments/guest-booking-deadline.service.ts`, `guest-booking-deadline.worker.ts` |
| Online processing | `backend/src/payments/pending-online-booking.ts`, `checkout.service.ts`, `paymongo-webhook.service.ts`, `paymongo.adapter.ts`, `paymongo-checkout-expiration.adapter.ts`, `payments.module.ts` |
| Guest API/context | `frontend/guest-web/src/services/guestBookingApi.js`; `src/utils/bookingAttempt.js`, `bookingContext.js` |
| Guest state | `frontend/guest-web/src/hooks/useGuestCheckout.js`, `usePrivateBooking.js` |
| Guest views | `frontend/guest-web/src/pages/Checkout.jsx`, `MyBooking.jsx`, `PaymentReturn.jsx`; `src/components/GuestBookingReceipt.jsx`, `BookingPayment.jsx`; `src/styles/guest-checkout.css` |

Current guest routes use `/api/guest/reservations` and require an active GUEST
identity. Private reads and payment operations enforce account ownership.

| Method/path suffix | Meaning |
|---|---|
| GET base path | Paginated owned reservation list |
| GET `/:id` | Owned reservation details |
| GET `/profile` | Authenticated profile used by the booking form |
| GET `/by-reference/:reference` | Owned booking-reference read |
| POST base path | Create/replay booking using the authenticated profile |
| POST `/recover` | Recover an account-bound request |
| POST `/checkout/current` | Read the account-owned payment attempt |
| POST `/checkout` | Prepare/replay account-owned checkout |
| POST `/payment-summary` | Read the account-owned financial summary |

Origin allowlisting, throttling, DTO validation, and no-store headers remain in
use. Old email-access routes return HTTP 410. Access JWTs stay in memory and the
existing auth refresh cookie restores sessions. Guest booking session cookies
are retired. Staff and provider routes use their own authorization boundaries.

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
