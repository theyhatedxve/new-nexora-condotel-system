# NEXORA — SCREEN_FLOWS.md

**Version:** Proposed 1.0  
**Date:** November 15, 2026  
**Status:** REVIEW DRAFT, not yet owner-approved  
**Baseline:** Architecture v2.1, current `AGENTS.md` checkpoint, approved `TECHNICAL_PLAN_APPROVED.md`  
**Scope:** One-property local prototype, Guest Website and Administration Dashboard

## 1. Purpose and evidence labels

This document defines screen hierarchy, route intent, component responsibilities, user actions, state feedback, and multi-step interaction flows. It does **not** authorize implementation, assert that proposed screens exist, or replace installed routes.

- **EXISTING:** Route or screen explicitly reported in uploaded documentation. Actual source/router should be rechecked before modification.
- **TARGET:** Owner-approved business functionality requiring screen or integration review.
- **PROPOSED:** Suggested screen or route organization, subject to source inspection and owner approval.
- **DEFERRED:** No operational implementation permitted.
- **OPEN:** Policy or exact route/API behavior requires confirmation.

The latest owner-confirmed `AGENTS.md` reports phases 1–8 and 10 completed, phase 9 NFC postponed, phase 11 testing/security paused and phase 12 deployment deferred. Guest screen acceptance is separate from module completion. The admin redesign is owner-confirmed complete. No new source, build, test, or browser verification was performed for this document.

## 2. Cross-application navigation model

```text
NEXORA
├─ Guest Website
│  ├─ Public marketing and search
│  │  ├─ Home
│  │  ├─ Room categories
│  │  ├─ Room category detail
│  │  ├─ About
│  │  ├─ Contact
│  │  └─ Policies (proposed)
│  ├─ Identity (proposed guest UI)
│  │  ├─ Registration
│  │  ├─ Email verification result
│  │  ├─ Login
│  │  └─ Account/password recovery
│  └─ Booking
│     ├─ Checkout
│     ├─ Payment provider return
│     ├─ Booking access (existing legacy)
│     ├─ My Booking (existing legacy)
│     └─ Authenticated My Reservations (proposed)
└─ Administration Dashboard
   ├─ Dashboard
   ├─ Reservations → Reservation Detail
   ├─ Rooms → Room Detail / Blocks
   ├─ Room Types → Category Detail / Editor
   ├─ Guests → Guest Detail
   ├─ Payments → Detail / Reconciliation
   ├─ Reports
   ├─ Users & Roles (new functionality review)
   ├─ Settings
   ├─ Audit Logs (Super Admin target)
   └─ NFC Placeholder (deferred)
```

All protected screens must re-check backend authorization; hidden navigation does not grant or deny backend permission. Existing route declarations in each frontend's `src/App.jsx` remain authoritative until inspected.

## 3. Guest route map and detailed screen specifications

### 3.1 Existing documented routes

The most recent `AGENTS.md` explicitly lists these guest paths:

| Route | Screen | Purpose | Principal components | Key actions | Status |
|---|---|---|---|---|---|
| `/` | Home | Property introduction and accommodation entry | Navbar, hero, availability entry, room links, footer | Search, browse rooms, navigate | EXISTING |
| `/rooms` | Rooms | Browse categories and suitable stays | AvailabilitySearch, RoomCard, filters, loading/empty/error states | Modify dates/occupancy, open category | EXISTING |
| `/rooms/:id` | Room Details | Show category description, amenities, images and booking entry | Image display, amenity list, occupancy/rate context, CTA | Review category, continue to checkout | EXISTING |
| `/checkout/:roomTypeId` | Checkout | Create reservation from chosen category and stay | Stay summary, backend quote, guest/occupant form, policy acknowledgment, booking/payment sections | Validate, submit, initiate eligible checkout | EXISTING, behavior to revise |
| `/booking-access` | Find Booking | Request and exchange existing scoped booking access | Email request, delivery feedback, one-time link flow | Request link, exchange link | EXISTING legacy flow |
| `/my-booking` | My Booking | Show scoped reservation and financial summary | Booking status, stay cards, payment summary, refresh and logout | Refresh, complete eligible payment, end access | EXISTING legacy flow |
| `/payment-return` | Payment Return | Reconcile the provider return with trusted backend state | Pending/verified/failed/unknown states, navigation | Refresh authoritative state, view booking | EXISTING |
| `/about` | About | Property introduction | Content cards, image, navigation | Browse rooms, find booking | EXISTING, owner-accepted |
| `/contact` | Contact | Property contact information | Contact cards, sample-data notice, safe CTAs | Navigate to booking/rooms | EXISTING, installed; acceptance pending in latest checkpoint |

**Existing limitations:** `/contact` presently shows fictional contact details with disabled contact actions, as documented in `AGENTS.md`. Guest login/register paths were **not** installed in the last documented route inspection. The approved new requirement to register and verify before booking supersedes the previous optional-account target, but migration/integration is not yet implemented. Existing accountless booking-access flows must remain safe for historical reservations.

### 3.2 Proposed guest routes, not installed route claims

| Candidate path | Screen | Purpose | Principal components | Actions and required feedback | Status |
|---|---|---|---|---|---|
| `/register` | Create Account | Register a guest | Name, email, password, policy acknowledgment, password guidance | Submit; show validation, generic duplicate-account treatment, confirmation notice | TARGET / PROPOSED path |
| `/verify-email` | Email Verification | Complete or report verification outcome | Status announcement, success/expired/invalid result, resend link | Resend through approved backend contract, go to sign-in | TARGET / PROPOSED path |
| `/login` | Guest Login | Authenticate registered guest | Email/password form, lockout/invalid feedback, recovery link | Sign in; handle pending verification, locked account, expired session | TARGET / PROPOSED path |
| `/forgot-password` | Account Recovery | Initiate approved recovery | Email form, generic confirmation | Request recovery without account enumeration | PROPOSED |
| `/reset-password` | Reset Password | Complete approved token-based recovery | Token validation, password/confirm input | Save, invalidate used token, sign in | PROPOSED |
| `/my-reservations` | My Reservations | List authenticated guest-owned bookings | Reservation cards/table, status filters, empty state | Open reservation, review eligibility | TARGET / PROPOSED path |
| `/my-reservations/:id` | Reservation Details | Show authenticated reservation, payments and policy state | Dates, occupants, status, receipt, payment section | Retry eligible checkout, cancel eligible unpaid booking, refresh | TARGET / PROPOSED path |
| `/policies` | Policies | Show approved booking/cancellation/payment terms | Policy sections, last-updated notice, context links | Read before checkout | PROPOSED, historically uninstalled |

**Avoid creating a second guest booking identity model:** Reconcile `/booking-access` and `/my-booking` with mandatory registration. Existing access tokens and reservations must not be orphaned. Do not link historical reservations by email alone.

### 3.3 Guest screen interaction requirements

- **Home / Rooms / Details:** Date and occupancy controls must announce validation problems. Pricing shown before commitment is indicative until the backend returns an authoritative quote. Category availability is not proof of an individual physical room assignment.
- **Checkout:** Display rental type, arrival/departure, included and extra guests, price breakdown, and clear payment-method choice. Never claim payment succeeded solely from a redirect. No visible checkout countdown is required, while the backend enforces the two-hour hold.
- **Payment Return:** Show *Verifying*, *Confirmed*, *Failed*, *Expired*, or *Review required* according to trustworthy backend state. Never use client query parameters as settlement proof.
- **Account screens:** Handle email-verification pending, password-reset required, progressive lockout, expired credentials, and a safe generic response for sensitive account lookups.
- **Reservation screens:** Show the first confirmed timestamp and eligibility when relevant. Paid bookings do not offer voluntary cancellation; financial corrections are handled by privileged staff.

## 4. Admin route hierarchy and screen specifications

`ADMIN_UI_UX_IMPLEMENTATION_PLAN.md` confirms the screen hierarchy and references `/rooms/types` and `/users`. Uploaded docs do **not** independently enumerate every actual admin React Router path. For other screens, paths below are **route candidates** to reconcile against `frontend/admin-web/src/App.jsx`, not installed-route assertions. The owner-confirmed completed dashboard redesign is preserved.

| Screen | Candidate route | Purpose | Key components | Primary actions / restrictions | Evidence |
|---|---|---|---|---|---|
| Staff Sign In | `/login` | Authenticate staff | Login form, lockout/recovery states | Sign in and enforce role/session | Proposed path, existing auth foundation |
| Dashboard | `/` or `/dashboard` | Operational overview | KPI cards, upcoming arrivals, recent reservations, role-aware quick links | Open supported operational records | Screen existing, exact path unverified |
| Reservations | `/reservations` | Search and triage bookings | Toolbar, filters, badges, paginated list | Open detail; staff-assisted booking only after API review | Screen existing, path unverified |
| Reservation Detail | `/reservations/:id` | Booking lifecycle | Guest/stay/payment/assignment cards, action area, history | Confirm, assign, cancel eligible, check in/out, record contact | Screen existing, path unverified |
| Rooms | `/rooms` | Physical inventory | Room table, readiness filters, status indicators | View, edit permitted room settings | Screen existing, path unverified |
| Room Detail | `/rooms/:id` | Room readiness and blocks | Room profile, blocks, assignment context | Manage status and blocks by permission | Existing feature, path unverified |
| Room Types | `/rooms/types` | Category catalog | Images, rate/capacity summary, amenities | Authorized category creation/edit | Path referenced in admin UI plan |
| Room Type Detail/Edit | `/rooms/types/:id` | Category settings and rates | Editor, occupancy controls, rental rate sections | Save with backend validation | Proposed nested path |
| Guests | `/guests` | Guest directory | Search, pagination, privacy-safe columns | View authorized guest record | Screen existing, path unverified |
| Guest Detail | `/guests/:id` | Authorized guest history | Contact, reservations, financial links | View/update supported fields | Proposed path, API review required |
| Payments | `/payments` | Financial activity | Payment list, statuses, summaries, filters | Open detail, record property payment if authorized | Screen existing, path unverified |
| Payment Detail | `/payments/:id` | Collection and provider evidence | Verified status, reference, related booking | Investigate recorded events | Proposed path |
| Payment Reconciliation | `/payments/reconciliation` | Uncertain/duplicate/excess collections | Exception queue, details, evidence, disposition | Super Admin approval for corrections | Target functionality, proposed path |
| Reports | `/reports` | Occupancy and finance | Date filters, report cards/tables | Export only where supported | Screen existing, path unverified |
| Users & Roles | `/users` | Staff management | Staff list, role/status, password-reset actions | Limited Admin / Super Admin controls | Path referenced; originally placeholder |
| User Detail/Edit | `/users/:id` | Controlled account mutation | Identity, role, status, audit reason | Manage allowed users, require password change after reset | Target, proposed path |
| Settings | `/settings` | Approved property settings | Property info, editable groups, save feedback | Restrict system-wide settings to Super Admin | Screen existing, path unverified |
| Audit Logs | `/audit-logs` | Consequential-action history | Search, filters, events and sanitized details | Super Admin read-only access | Existing screen, path unverified |
| NFC Placeholder | `/nfc` | Clearly deferred capability | Postponed notice only | No operational issuance, logs or unlock | DEFERRED, candidate path |

### 4.1 Dashboard requirements

- Preserve implemented cards and accepted design. Previously approved cards include Total Rooms, Occupied Rooms, Arrivals Today and Departures Today, plus Active Reservations and role-restricted financial summaries.
- Display backend-derived reservation counts and newest supported records. Do not invent historical occupancy or percentage-change metrics.
- Proposed additional views: unpaid reservations, checkout deadlines, contact reminders and no-shows, only after approved API/query contracts exist.
- Each independently fetched region needs loading, empty, error and retry feedback.

### 4.2 Reservation detail requirements

- Separate **booking status**, **payment state**, **room assignment**, **room readiness**, **contact history**, and **financial actions**.
- Allow only authorized transitions with backend checks. First Pay at Property staff confirmation starts the five-hour cancellation window. Reconfirmation never restarts it.
- Check-in requires identity verification, suitable assignment and payment-policy gates. Actual paid guest arrival must not change scheduled departure automatically.
- For cancellation/expiration, preserve record, reason, actor and audit history.

### 4.3 Rooms and room types requirements

- Room type defines category, pricing, amenities, included and maximum capacity.
- Physical Room defines actual room number and operational readiness.
- Editing physical readiness must not silently alter interval availability.
- Rate changes must not retroactively alter paid or committed reservation snapshots.

### 4.4 Payments, charges and deposits

- Distinguish individual collections, overall booking payment summary, provider unknown outcomes, and approved financial corrections.
- Staff records damage evidence; Manager, Admin or Super Admin approves extra charges.
- Deposit record must distinguish collection, authorized deduction and return. A deposit return is not a cancellation refund.
- Payment exception approval is restricted to Super Admin, with confirmed provider evidence and audit history.

### 4.5 Users, settings and audit

- Current implemented role architecture has four roles; the five-role target adds Super Admin, requiring schema/guards/API/UI reconciliation.
- Admin handles only authorized ordinary staff administration. Super Admin manages Admin accounts and system-wide settings. Protect the last active Super Admin.
- All staff use distinct accounts. Password reset requires a new password on next login.
- Audit screen access is Super Admin-only in the target rules. Sanitize event payloads.

## 5. Shared screen pattern and interaction contracts

Every route should provide: appropriate heading hierarchy, visible focus, keyboard traversal, labeled inputs, responsive layout, and readable status text. Apply NEXORA's existing navy/white/subtle-gold CSS tokens and React/JSX + React Router + Axios + plain CSS + Lucide React conventions.

| UI state | Expected behavior |
|---|---|
| Initial loading | Show clear progress without implying loaded records |
| Empty | Explain there are no matching records; offer applicable next action |
| Validation error | Associate actionable message with the input field |
| Authorization denied | Do not expose protected data; offer safe navigation |
| Session expired | Clear privileged UI state and require valid sign-in |
| Conflict | Explain stale booking, room unavailability or invalid transition |
| Provider unknown | Display payment review/pending state, not success |
| Success | Reflect only confirmed backend change and refresh dependent views |
| Network error | Preserve safe form contents; permit controlled retry |

Do not use optimistic success for payments, booking commitments, charges, account-role changes or deposit settlement.

## 6. Multi-step guest workflows

### Flow G1: New guest onboarding (TARGET)

1. Guest opens registration screen and enters identity, email and password.
2. Client shows basic field feedback, while backend validates and creates a pending account.
3. System sends an approved verification email through existing infrastructure.
4. Guest follows a one-time verification link; backend validates token/expiry.
5. Guest signs in and receives only the permitted account context.
6. Account is eligible to book after verification; errors include already used/expired token, locked account, and delivery failure.

**Mutation:** User and verification token state; record relevant security events. No automatic booking from registration alone.

### Flow G2: Category search and reservation creation (TARGET)

1. Guest searches category and chooses rental type, dates/times and occupant count.
2. Backend checks allowed interval (hourly 3:00–11:00 PM, minimum one hour; weekly seven days; monthly thirty days) and category capacity.
3. Guest reviews server-calculated price with extra-person charges when applicable.
4. Verified guest submits request. Backend performs transaction-safe inventory validation and creates an eligible category reservation.
5. Guest chooses PayMongo test mode or Pay at Property as allowed.
6. UI displays authoritative reservation state; a physical room is assigned later by staff.

**Edge cases:** Stale quote, last available category unit, overlapping stay, unsupported checkout time, overcapacity, unauthenticated/unverified user, double submit.

### Flow G3: PayMongo online checkout and retry (TARGET)

1. Backend creates a hold lasting two hours from its authoritative start; each retry uses the same deadline.
2. Guest initiates Hosted Checkout in PayMongo TEST mode.
3. Failed/abandoned attempts remain eligible for another attempt while hold valid; no one-retry cap and no mandatory visible countdown.
4. Guest returns to `/payment-return`; screen shows verifying until backend reconciliation provides trustworthy state.
5. Signed webhook/provider evidence is validated and recorded idempotently.
6. Eligible verified successful payment confirms reservation; expiry requires conservative financial reconciliation.
7. After expiration, old reservation is not automatically revived. New checkout follows a new availability check and new booking.

**Edge cases:** Lost webhook, redirect before webhook, duplicate provider events, paid-after-expiration, two guests competing for last unit, unknown provider outcome, page refresh and repeated clicks.

### Flow G4: Pay at Property booking and cancellation (TARGET)

1. Guest submits Pay at Property request; staff queue records pending staff confirmation.
2. Receptionist contacts the guest and records the first confirmed acceptance.
3. System fixes `firstConfirmedAt` and the five-hour cancellation deadline.
4. Subsequent one-week, one-day and short-notice contact calls log guest intent and expected arrival but do not reset cancellation eligibility.
5. Guest may cancel only when the reservation is eligible and unpaid.
6. Staff coordinates room assignment, arrival and property payment.

**Edge cases:** Booking made same day, unanswered call, contact failure, repeated staff confirmation, guest requests cancellation after deadline, staff operational cancellation and no-show.

### Flow G5: Existing historical booking access (EXISTING / transition design)

1. Existing guest uses `/booking-access` to request a private booking link.
2. Backend performs generic response, one-time link exchange and scoped session establishment.
3. Guest uses `/my-booking` to inspect permitted booking/payment summary and terminate access.
4. Future registered-account migration must preserve history and require secure binding, not email-only matching.

**Important:** Do not remove this legacy flow merely because new bookings require accounts.

## 7. Multi-step administration workflows

### Flow A1: Staff authentication, permission and password change (TARGET)

1. Staff enters credentials, backend applies account state and progressive lockout rules.
2. Correct login resets failed-attempt state; one hour without failures resets the failed counter.
3. A staff member with reset credentials must change password before normal operational access.
4. React navigation shows role-permitted screens; backend guards independently enforce every action.
5. Expired sessions require safe re-authentication.

**Edge cases:** Fifth failed attempt locks one minute, subsequent failure escalation five/fifteen/thirty minutes, invalid user, role change during session, disabled account, final Super Admin account protection.

### Flow A2: Staff-assisted booking (TARGET)

1. Authorized staff opens reservations and chooses approved staff-assisted creation action.
2. Staff enters guest identity and stay requirements through supported workflow.
3. Backend validates identity/ownership, price, occupancy and inventory; staff is not allowed to skip approved policy gates.
4. Created reservation shows payment and confirmation states separately.
5. Record actor and associated reservation.

**Dependency:** Staff-assisted booking route and API support must be confirmed before enabling this action.

### Flow A3: Arrival, room assignment, check-in (EXISTING backend + TARGET revisions)

1. Receptionist opens arrivals or reservation detail.
2. Checks booking state, guest identity, payment obligations and expected arrival.
3. Selects a physical room within the booked category and checks compatibility/readiness for full reserved interval.
4. Backend transactionally records assignment with history.
5. Check-in records actual arrival after required gates. For paid late arrival, original departure remains unchanged.

**Edge cases:** Room cleaning/maintenance, conflicting assignment, missing ID verification, insufficient payment, unpaid guest more than one hour late, delayed paid guest.

### Flow A4: Checkout, grace period, charges and housekeeping (TARGET)

1. Receptionist opens checked-in reservation and sees original scheduled departure.
2. System evaluates 30-minute late-checkout grace and next-booking overlap.
3. Eligible extensions beyond grace trigger category hourly fee, with partial-hour rounding still OPEN.
4. Staff records potential damage/late-checkout charge and supporting details.
5. Manager+ approves applicable charges; backend records financial state.
6. Staff completes authorized checkout; room advances to cleaning/readiness workflow.

**Edge cases:** Next confirmed arrival, unpaid charge, disputed damage, duplicate checkout, unavailable room extension.

### Flow A5: Deposit collection and return (TARGET)

1. Authorized staff records optional deposit collected against booking.
2. During checkout, staff records property condition and proposed deductions.
3. Authorized approver reviews supporting evidence and approves applicable charge.
4. System derives remaining refundable deposit amount from transaction history.
5. Authorized staff records actual return and method; maintain immutable audit/financial history.

**Edge cases:** Partial return, multiple deductions, excess deduction, failed return, duplicate transaction, no deposit collected.

### Flow A6: Payment exception review (TARGET)

1. Provider evidence or staff review flags duplicate, excess, late or unknown-outcome payment.
2. Reservation/payment detail marks review required; do not restore expired inventory automatically.
3. Super Admin reviews authenticated evidence and approved resolution options.
4. Backend records authorization and final provider-supported financial action, preserving booking and payment history.
5. Reports reflect completed financial results, not merely approved requests.

**Edge cases:** Provider success after hold, overpayment, duplicate webhook, correction fails, guest already booked another room, cancellation no-refund policy conflict.

### Flow A7: Staff management and audit (TARGET)

1. Admin or Super Admin opens staff management and sees only authorized accounts.
2. Actor creates/updates/deactivates permitted staff account or initiates reset.
3. Backend enforces role hierarchy, non-shared identity and last-Super-Admin safeguard.
4. Staff reset requires a password change before accessing normal screens.
5. Super Admin opens sanitized audit records and reviews action/outcome.

**Edge cases:** Admin attempting Admin-account removal, privilege escalation, duplicate email, disabled account, attempted removal of last Super Admin.

### Flow A8: Room category/rate and physical room mutation (EXISTING + TARGET extensions)

1. Authorized manager or above opens Room Types or Rooms.
2. Edits rate, capacity, amenity, or physical readiness through supported screen.
3. Backend validates allowed value, existing commitments, and permission.
4. Update preserves booked prices and historical records.
5. Refresh category/inventory views and record audit.

**Edge cases:** Lowered capacity below existing stay needs, last physical room of category, block overlapping committed stay, a currently occupied room marked out of service.

## 8. Route guards, mutation boundaries and navigation rules

| Interaction | Client behavior | Backend requirement |
|---|---|---|
| Guest booking | Require signed-in verified guest in target UI | Account verification and ownership, quote/inventory transaction |
| Payment retry | Show valid retry action only while eligible | Provider/payment status, hold validity, idempotency |
| Cancellation | Show policy and eligibility | First confirmation, payment state, time limit, transition audit |
| Staff assignment | Offer only allowed physical room choices | Role, readiness, full-interval availability, ACID |
| Extra charges | Separate record and approve steps | Manager+ decision, immutable financial evidence |
| Deposit return | Show computed available balance | Correct authorized amount and transaction recording |
| Financial exception | Route to privileged review | Super Admin approval, provider verification, audit |
| Staff account edits | Role-aware controls | Least privilege, no last-Super-Admin removal |
| Audit display | Show only to Super Admin | Backend Super Admin authorization and sanitized projection |

Use confirmation dialogs for consequential mutations where useful, never as a substitute for backend validation. Preserve related data on navigation without leaking private records into persistent browser caches. Preserve deep links and browser refresh behavior.

## 9. Screen and flow acceptance matrix

| Area | Minimum acceptance checks |
|---|---|
| Navigation | Direct URL, refresh, back/forward, active navigation, unknown route, safe redirect |
| Responsive | 320px, 375px, 768px and desktop; working tables, forms and menus |
| Accessibility | Keyboard-only navigation, visible focus, labels, errors, dialog focus, semantic status feedback |
| Identity | Registration/verification, lockout, password change, disabled roles, expired session |
| Booking | Four rental types, category inventory, price/occupancy, duplicate submission, expiry |
| Payments | PayMongo TEST label, verified state, unknown state, retry, duplicate/late evidence |
| Reception | Confirmation timestamp, contact reminders, arrival, no-show, assignment, check-in/out |
| Financial operations | Separate evidence/approval, deposit reconciliation, no-refund cancellation rule |
| Roles | Guest ownership, receptionist/manager/admin boundaries, Super Admin-only functions |
| Prototype integrity | Fictional data labeled, no fake payment success, NFC placeholder explicitly postponed |

Testing status is **NOT EXECUTED** for this document. Do not infer operational capability from screen appearance.

## 10. Dependencies and unresolved screen decisions

| Topic | Pending decision / verification | Effect on screen design |
|---|---|---|
| Admin route source | Inspect actual `frontend/admin-web/src/App.jsx` | Finalize exact URLs and guarded layouts |
| Guest account routes | Inspect implemented auth UI and APIs | Finalize registration, login, verification and recovery screens |
| Legacy booking access | Decide safe coexistence/migration | Keep `/booking-access` and `/my-booking` secure |
| Nightly checkout time | Owner decision | Departure selectors, warnings, rate/overlap logic |
| Weekly/monthly departure policy | Reconcile clock-time requirements | Date/time controls and summary wording |
| Late fee rounding | Owner decision | Charge preview and approval details |
| Same-day guest contact | Owner decision | Contact tasks and reminders |
| Discount authorization | Owner decision | Whether discount controls appear and for whom |
| Lockout after 30 minutes | Owner decision | Account recovery and lockout messaging |
| Payment reconciliation method | Approved backend contract/provider support | Final Super Admin review actions |
| Deposit settlement permissions | Detailed policy review | Separate return/approval actions |
| Notification delivery | Verify supported backend contract | Alerts, retry notices and delivery status |
| Sensitive field encryption | Confirm approved field list | Guest detail display, masking and access |
| Existing UI acceptance | Latest owner/source inspection | Avoid rebuilding completed Dashboard or accepted guest screens |

## 11. Implementation sequencing and governance

Screen work should align with owner-approved `TECHNICAL_PLAN_APPROVED.md`: baseline audit and architecture/API review first, followed by identity, rental/booking, payment, reception/finance, guest UI, admin UI, notification/reporting, integrated testing and local packaging. Do not use this document as a new authorization to resume paused Phase 11, resume NFC, or deploy to production.

Before implementing a screen: inspect the exact route and backing API; identify files, states and risks; request task-specific `EggPie`. Preserve accepted designs and related flows. Documentation replacement also requires owner approval; this is a separate draft and does not overwrite `SYSTEM_DESIGN.md` or any original project document.

## 12. Sources consulted

- `AGENTS.md`, latest owner-confirmed project checkpoint and guest route/acceptance inventory.
- `ADMIN_UI_UX_IMPLEMENTATION_PLAN.md`, admin screen hierarchy and existing redesign constraints.
- `DIRECTORY_STRUCTURE.md`, existing guest App.jsx and component structure.
- `API.md`, documented backend route and authorization boundaries.
- `BUSINESS_FLOWS.md`, historical operational flow and payment foundations.
- `SYSTEM_DESIGN.md` and `SYSTEM_DESIGN_PROPOSED.md`, existing versus proposed workflow framing.
- `TECHNICAL_PLAN_APPROVED.md`, owner-approved target policies and phased plan.
- `design_guidelines.md`, visual, accessibility and interaction guidance.
- Prior owner decisions in the current NEXORA planning conversation.

**Document status:** Proposed `SCREEN_FLOWS.md`, awaiting owner review. **No source implementation or existing Markdown files modified.**
