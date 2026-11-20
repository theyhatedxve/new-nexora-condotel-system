# NEXORA | AGENTS.md

**Document version:** Proposed 2.0  
**Prepared:** 2026-11-15  
**Status:** REVIEW DRAFT, not yet adopted  
**Project:** NEXORA Condotel Management System  
**Purpose:** Operational development instructions, authority hierarchy, current checkpoint, change controls, and the next safe development step.

> This proposed file is a condensed replacement guide. The existing 2026-11-11 `AGENTS.md` contains detailed historical implementation records, dependency inventories, test evidence, and screen-level checkpoints. Preserve or archive those records before adopting a replacement. This draft does not verify live repository or database state.

## Feature organization closure — 2026-11-20

**Status:** Admin frontend, Guest frontend, and backend organization
completed, owner-confirmed. Current paths were source-inspected.

This checkpoint supersedes earlier folder maps and pending organization
tasks below. Preserve earlier checkpoints as historical records.
The document-level draft designation remains unchanged.

### Frontend organization

Both applications use:

- src/main.jsx: unchanged entry-point location.
- src/app/: routing, layout, and application-shell files.
- src/features/: related pages, components, hooks, services, styles,
  constants, utilities, and tests.
- src/shared/: genuinely reusable components, services, styles,
  utilities, hooks, and tests where applicable.

Guest images and branding remain under frontend/guest-web/src/assets/.

Admin features:
auth, dashboard, reservations, rooms, guests, payments, reports,
users, settings, and audit.

Guest features:
auth, home, rooms, booking, checkout, payments, and information.

### Backend organization

Reservations groups:
guest-booking, staff, assignments, lifecycle, stay, charges, deposits,
contacts, inventory, compatibility, and tests.

Payments groups:
checkout, collections, refunds, reconciliation, summary, and deadlines.

Existing dto/, policies/, validation/, and paymongo/ folders remain.
reservations.module.ts and payments.module.ts remain at their module roots.

### Preservation evidence

- Admin: 202 relocated files; main.jsx updated.
- Guest: 124 relocated files; all 34 asset files retained unchanged.
- Backend: 85 relocated files and 23 additional files with import updates.
- Source comparisons found no changes outside relative import paths.
- Relative-reference inspection resolved 475 Admin references,
  225 Guest references, and 724 references in affected backend files.

These are static observations, not runtime verification.

The owner confirmed completion after each application.
Exact final command output and test totals were not supplied with those
confirmations. The assistant did not run tests, lint, builds, servers,
or browser checks.

### Boundaries and continuation

Database locations, migrations, generated Prisma code, routes,
business logic, and environment settings were not changed by these moves.

Keep recovery copies and relocation manifests under backups/.
Do not rerun the one-time relocation scripts on the organized source.

The approved source-organization work is closed.
Apply the corresponding documentation updates, then let the owner select
the next task. Do not repeat verification or start further restructuring
without a new need or owner request.

NFC remains postponed. Production deployment remains deferred.

## Finalization checkpoint — 2026-11-20

**Status:** Cleanup Batches 1–5 completed, owner-confirmed.
Documentation closure and consolidated final verification remain pending.

This checkpoint supersedes older statements describing the starter E2E
test as unfinished. Preserve earlier checkpoints as historical records.
The document-level draft designation remains unchanged.

### Completed cleanup

1. Removed four unused Admin Web files:
   - src/components/DashboardAttention.jsx
   - src/components/DashboardContacts.jsx
   - src/components/DashboardWorklist.jsx
   - src/styles/dashboard-calm.css

2. Confirmed development database configuration:
   - Backend runtime and Prisma tooling target backend/dev.db.
   - Admin and Guest use http://localhost:3000/api.
   - Automated tests retain isolated databases.
   - No test or demonstration data was merged into dev.db.

3. Replaced backend/test/app.e2e-spec.ts:
   - Reuses test/helpers/isolated-database.ts.
   - Overrides Prisma before application initialization.
   - Checks database isolation, /api/health, and unauthenticated access.
   - Disables booking-deadline and booking-email workers for the suite.
   - Disposes of the temporary database after application shutdown.

4. Extracted charge and deposit command validation:
   - backend/src/reservations/validation/reservation-charge-command.ts
   - backend/src/reservations/validation/reservation-deposit-command.ts

   Services retain authorization, transactions, and database writes.

5. Extracted Admin Web form logic:
   - frontend/admin-web/src/hooks/useReservationChargeForm.js
   - frontend/admin-web/src/hooks/useReservationDepositForm.js
   - frontend/admin-web/src/hooks/useRentalPricingForm.js

   Components retain their existing UI and use existing API/recovery flows.

6. Consolidated shared dialog structure:
   - frontend/admin-web/src/styles/admin-dialogs.css
   - Imported by reservation-focus.css, room-workspace.css,
     and reports-compact.css.
   - Feature-specific widths, focus styles, and responsive rules remain.

### Evidence and limits

The owner confirmed completion after each batch.
Source comparison confirmed unchanged extracted backend validator bodies
and service classes, unchanged charge/deposit JSX, and the two approved
pricing JSX handler substitutions.

These comparisons are not runtime verification.
The assistant did not run tests, lint, builds, servers, or browser checks.
Do not invent successful command output or final test totals.

### Retained files and data

Keep backend/dev.db, backend/nexora.demo.db, all 14 Prisma migrations,
active tests, generated Prisma code, uploaded images, encryption
configuration, and the three recovery ZIPs under backups/.

The retired booking controllers remain intentional 410 Gone responses.
They are not unused files.

### Continuation

Complete the four-file documentation update and owner-run final checks.
Do not reopen accepted UI batches or perform further deletion without
an identified need and appropriate authorization.

NFC remains postponed. Production deployment remains deferred.

## Cleanup and organization checkpoint — 2026-11-19

**Status:** Completed, owner-confirmed.

This checkpoint supersedes older cleanup and database-recovery tasks.

### Completed scope

- Removed 22 unused frontend files and two empty database files.
- Standardized development database settings on backend/dev.db.
- Set Guest Vite to port 5175 and Admin Vite to port 5176, using strictPort.
- Consolidated allowed frontend origins.
- Validated development seed targets before Prisma connection creation.
- Cleaned backend startup/module/controller formatting.
- Moved charge and deposit DTOs into reservations/dto/.
- Grouped 10 reservation policies and six matching tests in policies/.
- Grouped 12 PayMongo integration/test files in payments/paymongo/.
- Updated affected imports while preserving business-rule implementations.
- Converted five room-related suites to fresh isolated databases.
- Corrected rental-rate cleanup and image-environment restoration.
- Moved two room-block tests out of beforeAll without changing assertions.
- Archived old databases, schema snapshots, and expanded recovery copies.
- Preserved the active database, demo database, uploaded images, and migrations.

The bottom profile menu opens Sign out above the profile.
The notification bell opens authorized operational queues without page scrolling.

### Evidence

Source inspection confirmed the new folder locations and retained databases.
Static comparison confirmed preservation of the 58 existing test bodies
in the five corrected suites.

The last supplied full-suite output reported 954 passing tests and one
reservation-journey timeout. The owner subsequently confirmed completion.
Exact successful rerun totals and the command used were not supplied.

Do not describe owner confirmation as independently executed verification.

### Database and recovery boundaries

- Development database: backend/dev.db.
- Demonstration database: backend/nexora.demo.db.
- Local cleanup archives: backups/archive/.
- Policy and PayMongo recovery ZIPs remain under backups/.
- All 14 Prisma migrations remain preserved and required.
- Tests must use isolated databases.
- Database reset, seed, migration consolidation, and archive restoration
  require their own explicit scope.

### Remaining item and continuation

The separate legacy backend/test/app.e2e-spec.ts still expects Hello World!
and does not override the real Prisma provider with an isolated database.
Repair and verify it before presenting test:e2e as a supported acceptance check.

NFC functionality remains postponed.
Production deployment remains deferred.

The owner selects the next approved task.

## Admin UI redesign closure — 2026-11-19

**Status:** Completed and accepted, owner-confirmed.

The owner confirmed completion of the Admin UI redesign and the final
visual consistency and accessibility review.

### Accepted screen groups

- Shared navigation, page header, and Dashboard.
- Reservations and reservation details.
- Rooms, room details, and room types.
- Guests, guest details, and Guest Accounts.
- Payments, payment details, and reconciliation.
- Reports.
- Users & Roles and staff account forms.
- Settings.
- Audit Logs.

The redesign follows the owner's Daily Operations Dashboard reference:
navy navigation, gold accents, rounded cards, consistent controls,
responsive tables, and visible keyboard focus.

### Evidence

Completion and final acceptance are owner-reported.
The assistant confirmed the latest management stylesheet is connected
to Reports, Users, Staff User Editor, Settings, and Audit Logs.

No fresh test, lint, build, or browser output was supplied with the
final acceptance message. Do not invent execution results or test counts.

### Continuation

The Admin UI redesign is closed. Do not restart accepted screen batches.
The owner selects the next maintenance or enhancement task.

NFC functionality remains postponed.
Production deployment remains deferred.

## Previous owner-confirmed checkpoint — 2026-11-18

This checkpoint records the owner's completion confirmations in the current
development conversation.

| Milestone | Current status |
|---|---|
| Admin UI redesign | Completed, owner-confirmed |
| Guest account booking upgrade | Completed, owner-confirmed |
| Phase 10 — Reports and Settings | Completed, owner-confirmed |
| Phase 11 — Integrated Testing and Security | Completed, owner-confirmed |
| Phase 12 — Local Prototype Packaging | Accepted, owner-confirmed |
| NFC functionality | Postponed |
| Production deployment | Deferred |

### Accepted additions and corrections

- Guest account registration, login, and authenticated My Bookings.
- Guest-phone encryption using AES-256-GCM.
- Conversion of existing guest phone values and owner verification.
- Guest Accounts for Super Admin and Admin, including accounts without bookings.
- Database backup, restoration, integrity, and phone-decryption checks.
- Local environment templates and startup instructions.
- A separate synthetic demo database with accounts, rooms, rental rates,
  and sample reservations.
- Owner acceptance of the local demonstration.
- Admin navigation scrolling correction with keyboard-focus preservation.

### Verification evidence

Completion is based on owner-reported execution and acceptance.
Exact test totals and additional runtime observations must be recorded only
when their output is available.

### Current environment

| Component | Local setting |
|---|---|
| Backend API | http://localhost:3000/api |
| Guest website | http://localhost:5175 |
| Admin website | http://localhost:5176 |
| Development database | backend/dev.db |
| Synthetic demo database | backend/nexora.demo.db |

Use the same intended database for DATABASE_URL and
NEXORA_RUNTIME_DATABASE_URL when running Prisma commands and the application.

### Continuation

The accepted local prototype is ready for demonstration.

The owner selects any subsequent maintenance or enhancement task.
Apply the current step-specific authorization workflow to future work.

Use this dated checkpoint for project progress. Earlier pending statuses,
continuation tasks, and phase gates describe their historical checkpoints.
The original instruction-draft metadata remains retained below.

See [local setup](../LOCAL_PROTOTYPE_SETUP.md) and
[handoff instructions](../AI_HANDOFF.md).

## 1. Role and responsibilities

Act as a precise development assistant for the existing NEXORA system. Help with architecture, backend, frontend, APIs, data modeling, security, UI/UX, documentation, testing plans, and controlled debugging. Preserve approved design, existing workflows, and historical records.

For each request:

1. Identify and read only relevant project Markdown documents.
2. Check this file's latest owner-confirmed checkpoint.
3. Inspect actual source files when access is available.
4. Separate **EXISTING**, **OWNER-APPROVED TARGET**, **PROPOSED**, **OPEN**, and **DEFERRED** facts.
5. State the relevant issue, affected modules/files if verified, solution, risks, and required verification.
6. Do not invent implemented features, endpoint paths, entity fields, migrations, source files, tests, or progress.
7. Complete one approved step at a time.

## 2. Documentation authority and status

| Reference | Authority / use | Current approval note |
|---|---|---|
| `AGENTS.md` | Most recent owner-confirmed project checkpoint and continuation instructions | Original last synchronized 2026-11-11; this file is a proposed replacement |
| `NEXORA_ARCHITECTURE_V2.1.md` | Current approved architecture | Remains authoritative until an explicit architecture revision is adopted |
| `AI_HANDOFF.md` | Historical source and transfer context, owner-execution boundaries | Historical, older statuses must not supersede latest AGENTS checkpoint |
| `TECHNICAL_PLAN_APPROVED.md` | Owner-approved proposed revision plan (v3.0) | Approved in chat; approval is not evidence of implementation |
| `SYSTEM_DESIGN_PROPOSED.md` | Target business processes and data consistency design | Review draft, not adopted |
| `SCREEN_FLOWS_PROPOSED.md` | Guest/admin screen and interaction design | Review draft, not adopted |
| `design_guidelines_PROPOSED.md` | Proposed expanded design system | Review draft, not adopted |
| `API_PROPOSED.md` | Proposed API reference and maintenance plan | Review draft, not adopted |
| `CI_CD_ROADMAP_PROPOSED.md` | Future delivery and infrastructure strategy | Review draft, production deferred |
| `DATABASE_SCHEMA.md`, `API.md`, `BUSINESS_FLOWS.md`, `SECURITY.md` | Existing documented contracts and constraints | Verify live schema/controllers before modifications |
| `DEVELOPMENT_RULES.md`, `CODING_PRINCIPLES.md`, `CODING_PATTERNS.md`, `DIRECTORY_STRUCTURE.md` | Coding and directory conventions | Preserve established structure |
| `IMPLEMENTATION_GUIDE.md`, `CI_CD_ROADMAP.MD`, `CONVENTIONAL_COMMITS.md` | Owner-run verification, delivery and Git conventions | Follow applicable instructions |
| `design_guidelines.md`, `ADMIN_UI_UX_IMPLEMENTATION_PLAN.md` | Existing visual direction and admin-design background | Do not reopen owner-accepted redesign without scope approval |

Documents may disagree because some capture older phases or policies. Report conflicts. Do not silently treat a proposal as an adopted architecture, or an approved requirement as implemented functionality.

**Source-verification caveat:** The uploaded documents are not the live repository. `AI_HANDOFF.md` records a 28-model migration snapshot while `DATABASE_SCHEMA.md` and portions of `AGENTS.md` describe 27-model inventory at earlier checkpoints. Confirm the actual `backend/prisma/schema.prisma` before stating the exact present model count, field definitions, or indexes.

## 3. Historical development checkpoints

**Historical owner-confirmed project status (November 11, 2026):**

| Original phase | Status |
|---|---|
| 1. Project Foundation | COMPLETED, owner-confirmed |
| 2. Database Foundation | COMPLETED, owner-confirmed |
| 3. Authentication and RBAC | COMPLETED, owner-confirmed |
| 4. Room Management | COMPLETED, owner-confirmed |
| 5. Guest Website | COMPLETED, owner-confirmed phase milestone |
| 6. Reservations | COMPLETED, owner-confirmed |
| 7. Payments | COMPLETED, owner-confirmed |
| 8. Admin Dashboard | COMPLETED, owner-confirmed |
| 9. NFC Management | POSTPONED |
| 10. Reports and Settings | COMPLETED, owner-confirmed |
| 11. Testing and Security | PAUSED / INCOMPLETE |
| 12. Production Deployment | DEFERRED |

**UI-specific checkpoint:** Admin Dashboard redesign completed per owner on November 11. Guest UI screens 4–6, 7 (Find Booking), 10 (My Booking), and 11 (About) were owner-accepted. Contact `/contact` was installed with fictional details but pending owner acceptance in the latest recorded guest-specific checkpoint. Policies route was proposed, not confirmed installed. Login/Register screens required separate review. Do not infer they exist merely from existing backend auth.

**Source-organization checkpoint:** November 10 responsibility refactors were recorded in the main project for guest-web, admin-web and backend. Frontend hooks, components, constants, utils and `styles/tokens.css` were reorganized; backend feature-local helpers were extracted. This does not certify runtime acceptance. Refer to original `AGENTS.md` section K and `DIRECTORY_STRUCTURE.md` before changes.

**Current planning checkpoint:** On November 15, the owner approved the proposed Technical Plan v3.0. The owner also approved substantive revised business rules. The separate proposed `SYSTEM_DESIGN`, `SCREEN_FLOWS`, design guidelines, API reference, and CI/CD roadmap have been drafted but not explicitly approved in the conversation. These documents and any file-based replacements remain subject to individual approval.

**Do not restart original completed phases. Do not resume postponed NFC, paused Phase 11, or deferred Phase 12 without explicit approval.**

## 4. Architecture and stack to preserve

- One-property modular monolith, not multi-property tenancy or microservices.
- Separate `frontend/guest-web` and `frontend/admin-web` applications.
- React, JavaScript/JSX, Vite, React Router, Axios, plain CSS, Lucide React.
- Shared `backend` NestJS/Express REST API in TypeScript, under the existing `/api` prefix.
- Prisma and SQLite for development; PostgreSQL is a future production recommendation, not an approved migration.
- JWT/Passport authentication, Argon2id hashes, existing refresh-session and ownership protection.
- PayMongo Hosted Checkout in **test mode**, signed webhooks and Pay at Property.
- SMTP email features per existing implementation and approved future revisions.
- NFC remains a nonoperational placeholder; retain existing NFC schema safely.
- Local prototype first; Docker, GitHub Actions, staging, VPS and production release are future design only.

Use existing project directory layout and API contracts. Read `DIRECTORY_STRUCTURE.md` and current source before proposing concrete new paths. Do not introduce dependencies, frontend TypeScript, UI frameworks, alternate ORMs, global state libraries, or major architectural changes without approval.

## 5. Owner-approved target business rules, not yet verified implemented

### 5.1 Guest and staff identity

- New guests must register and verify email before booking. Preserve secure historical accountless-booking access until an approved migration strategy exists.
- Target roles: Guest, Receptionist, Manager, Admin, Super Admin.
- Individual staff accounts, least-privilege backend permissions and complete audit attribution.
- Admin or Super Admin may reset eligible staff passwords; require password change at next login.
- Fifth failed login triggers one-minute lock; subsequent failed attempts after lock trigger five-, fifteen-, then thirty-minute locks. Reset counter after successful login or one hour without failures. Further escalation remains open.
- Super Admin alone views administrative audit logs, changes system-wide settings and system name, manages Admin accounts, and approves payment corrections. Protect the last active Super Admin.
- Managers and above approve eligible damage/late-checkout charges. Discount permission details remain open.

### 5.2 Rental periods and inventory

- Rental periods: hourly, nightly, weekly (7 complete days), monthly (30 complete days).
- Standard arrival starts at 3:00 PM. Hourly rentals operate only from 3:00 PM to 11:00 PM, minimum one hour, with no overnight hourly stays.
- Receptionist may approve arrival up to 30 minutes early subject to readiness and inventory protection.
- Weekly and monthly interval rules must be reconciled with the final standard overnight departure clock time, which remains open.
- Guests reserve room **categories**, not specific room numbers. Staff assign physical rooms separately.
- Category-specific included occupancy, maximum occupancy and extra-person fees; minimum one guest. Backend computes all rates.
- Distinguish room readiness from time-based inventory availability. Never commit overlapping room rights or rely on frontend availability alone.

### 5.3 Online payment and holds

- Backend inventory hold lasts two hours. There is no required frontend countdown.
- Multiple PayMongo payment retries while the reservation is eligible. Retries do not extend the original deadline.
- Verify amounts, currency, local attempt/provider identifiers, authentic webhook evidence and reservation eligibility before confirmation.
- At expiry distinguish genuinely unpaid from unresolved provider states. Preserve and reconcile uncertain successful payments before unsafe inventory release.
- Once expired, the original reservation must not be revived automatically. A replacement requires a new reservation and fresh availability check.
- Verify duplicate payment events idempotently. Never treat browser redirects as payment confirmation.

### 5.4 Pay at Property and cancellation

- Pay at Property requires explicit first staff acceptance; that first successful confirmation starts the five-hour guest cancellation window.
- Subsequent guest-contact and arrival-reconfirmation calls never restart the deadline.
- Contact guest approximately one week before arrival and one day before when applicable. For shorter-notice bookings, contact shortly after booking and the preceding day when practical. Same-day specifics remain open.
- Voluntary guest cancellation of verified paid reservations is prohibited. Eligible unpaid reservations may cancel in the authorized window. Preserve status/history instead of deleting records.
- Unpaid guest at least one hour late is subject to approved automatic no-show cancellation; staff may rebook as a walk-in only after new availability checking.
- Paid guest late arrival does not change the original departure time or cancel the paid commitment automatically.

### 5.5 Checkout, charges, deposits and exceptions

- A fixed 30-minute late-checkout grace period applies.
- Beyond the grace period, apply the category hourly rate for an eligible approved extension without overriding a confirmed next booking. Partial-hour rounding remains open.
- Reception staff record damage evidence; Manager/Admin/Super Admin authorize applicable charges.
- Optional security deposits require collection, deductions, return, approval and auditable movement records. Deposit returns are not ordinary booking cancellation refunds.
- No voluntary paid-booking cancellation refund. Verified duplicate, excess, late or unfulfillable payment situations may require Super Admin-approved financial correction with preserved audit trail and actual provider outcome verification.

## 6. Frontend and UX standards

- Preserve NEXORA navy/white/subtle-gold branding and accepted guest/admin pages.
- Use existing CSS variables and `styles/tokens.css`. Proposed design tokens are not automatically installed.
- Target WCAG 2.2 AA where applicable: semantics, keyboard navigation, visible focus, readable type, labels, contrast, error messages and responsive tables/dialogs.
- Provide meaningful form validation and loading, empty, success, conflict, access-denied, network-error and session-expired states.
- State clearly when mock data, synthetic transactions or NFC placeholders are presented. Never depict fictional interactions as operational backend features.
- Keep UI state local or in existing focused hooks; treat API data as authoritative. No frontend-only authorization or inventory/payment commitments.

## 7. Code quality and data protection

- Apply SOLID, DRY, KISS, YAGNI, composition over inheritance and separation of concerns.
- Controllers handle HTTP; DTOs validate; guards enforce identity/permissions; services coordinate rules and transactions; Prisma manages persistence; external provider operations live in the established integration layer.
- Use ACID transactions for coordinated reservation, assignment, payment, financial and audit changes. Do not perform provider network calls inside database transactions.
- Use immutable React updates, bounded requests, predictable transitions, safe retries and explicit failures.
- Preserve integer PHP centavos, Philippine stay-date semantics and UTC event timestamps.
- Keep historical rate snapshots, cancellations, financial events, room blocks, and audits.
- Apply Argon2id for passwords, hashed storage of tokens, TLS for protected transport, selective AES-256-GCM only for individually approved sensitive fields, secret management and safe logs.
- Never expose secrets, private records, raw provider payloads containing sensitive data, or NFC cryptographic material.

## 8. Implementation and documentation authorization

**Implementation requires the exact keyword `EggPie` for the specific task.** Approval of business rules, a planning document, or a roadmap is **not** authorization to implement all phases.

Before implementation:

1. Read relevant files and inspect affected code.
2. State confirmed behavior versus proposal and unresolved conflicts.
3. Identify exact affected files where verified.
4. Describe expected behavior, risks, preservation rules and acceptance tests.
5. Request task-specific `EggPie` approval.

After approval:

1. Work only on authorized scope.
2. Follow the owner-execution boundaries in `AI_HANDOFF.md` and `IMPLEMENTATION_GUIDE.md`.
3. Do not independently install dependencies, migrate/seed/reset data, run destructive commands, commit, push, deploy or enable live payments without explicit separate authorization.
4. Provide exact paths and owner-run instructions where needed.
5. Distinguish expected, owner-reported and independently verified results.
6. Stop at the end of the approved task.

**Documentation editing:** Before changing a project Markdown file, read it, propose exact additions/replacements and receive explicit file-specific approval. Preserve unrelated historical content. Never modify `spec.md`.

## 9. Revised implementation roadmap (proposed, separate from original phases)

| Revision stage | Scope | Current status |
|---|---|---|
| Phase 0 | Source audit and requirements/implementation gap analysis | PROPOSED, not executed |
| Phase 1 | Owner-approved architecture and business-contract reconciliation | PROPOSED |
| Phase 2 | Reviewed additive schema and API changes | PROPOSED |
| Phase 3 | Five-role RBAC and authentication revisions | PROPOSED |
| Phase 4 | Rental pricing, occupancy and inventory | PROPOSED |
| Phase 5 | Reservation lifecycle, holds, confirmation and cancellation | PROPOSED |
| Phase 6 | PayMongo retries and financial reconciliation | PROPOSED |
| Phase 7 | Reception operations, damage, charges and deposits | PROPOSED |
| Phase 8 | Guest website integration and accessibility | PROPOSED |
| Phase 9 | Admin dashboard workflow integration | PROPOSED; unrelated to original postponed NFC Phase 9 |
| Phase 10 | Notifications and operational reporting | PROPOSED |
| Phase 11 | Integrated unit, API, database, E2E and security verification | PROPOSED; original Phase 11 still paused |
| Phase 12 | Local prototype packaging and owner acceptance | PROPOSED; original production Phase 12 still deferred |

Do not infer completion of any revision stage from completion of an original phase with the same number.

## 10. Testing, database and operational safety

- Use existing Vitest, Supertest, lint/build commands and any configured project tools only after the applicable owner execution approval.
- Verify pricing, rental boundaries, RBAC, ownership, failed-login lockout, two-hour expiration, concurrent last-room booking, delayed/duplicate PayMongo events, cancelled/paid booking transitions, no-show handling, late checkout, charge approvals and deposit settlement.
- Perform schema and transaction tests with disposable SQLite files. Never run test fixtures, destructive commands or unreviewed migrations against `backend/dev.db`.
- Review consistent backups, migration SQL, restoration and historical-data preservation before any authorized schema change.
- Production-like assumptions require separate PostgreSQL migration verification; SQLite results are not proof of production database behavior.
- Use synthetic guest data and PayMongo test mode. Real payments and production deployment are not approved.
- Do not claim tests passed unless execution evidence is available and correctly attributed.

## 11. Open decisions requiring confirmation before the relevant implementation

1. Standard overnight checkout clock time and implications for weekly/monthly periods.
2. Exact partial-hour rounding after the 30-minute checkout grace period.
3. Actual category-specific rental rates and occupant fees.
4. Same-day and very-short-notice guest contact policy.
5. Further escalation after repeated 30-minute failed-login locks.
6. Whether discounts are in scope and who approves them.
7. Precise provider reconciliation/financial correction handling and settlement responsibility.
8. Notification timing, delivery configuration and failure recovery.
9. Approved fields for selective AES-256-GCM encryption.
10. Migration strategy for historical accountless bookings.
11. Exact current Prisma models/indexes, controller routes and source mappings.
12. Which proposed screen/API/CI documents receive formal adoption and when.

Resolve each item before changing the affected feature, rather than silently selecting a default.

## 12. Next action and required handoff record

**Recommended next action:** Read-only Phase 0 source audit, scoped to the owner's next request, after approval. Begin by comparing the current main repository to the owner-confirmed November 11 checkpoint and the approved target Technical Plan. Do not modify source or data during an audit.

For every completed approved task, report:

- Task and scope authorization.
- Exact inspected and modified paths.
- Existing behavior and change summary.
- Owner-reported and independently verified tests, separately.
- Database and security impact.
- Outstanding issues and remaining decisions.
- Proposed next task, without automatically starting it.

**Current document status:** This is a proposed replacement for the development instructions, not evidence that the existing `AGENTS.md` was edited or that new development occurred.
