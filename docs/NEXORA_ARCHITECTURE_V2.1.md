# NEXORA — Final Condotel Management System Architecture

> **Master architecture blueprint:** Version 2.1  
> **Status:** Approved architecture v2.1; historical baseline with current progress addendum below.
> **Intended readers:** Codex, other AI coding assistants, developers, reviewers.  
> **Authority:** This file supersedes NEXORA Architecture v2.0 for frontend technology and file conventions. All other approved v2.0 requirements remain intact.  
> **Instruction:** Do not generate application code or begin implementation until the user approves the relevant phase and explicitly authorizes code generation.

> **Implementation addendum (2026-10-31):** Phases 1–4 are COMPLETED; Phase 3 has 8/8 steps and Phase 4 has 7/7 steps. Phase 5 is IN PROGRESS: Steps 1–3 complete; Steps 4–5 backend complete with frontend in progress; Steps 6–7 pending. Phase 6 onward is NOT STARTED / AWAITING APPROVAL. Completion is owner-directed; this task inspected current sources and installed metadata without rerunning application tests. Earlier Phase 3 23/23 acceptance remains owner-reported. The original requirements and planned twelve-phase order below are a historical baseline, not authorization for new work.
>
> Phase 2 established 24 models (23 core plus RoomTypeAmenity); Phase 3 Step 7 adds EmailVerificationToken for 25 current Prisma models. This approved implementation extension does not replace or silently rewrite the original model list below. See [current schema](DATABASE_SCHEMA.md), [actual API](API.md), and [phase checklist](IMPLEMENTATION_GUIDE.md).

## Instructions for AI coding tools

1. Treat this document as the authoritative NEXORA architecture specification. Do not silently alter the approved stack, scope, business rules, or development order.
2. Follow **KISS — Keep It Simple, Stupid**: readable, straightforward, maintainable code; minimal dependencies; no unnecessary abstractions, microservices, or advanced patterns.
3. **Approval-first workflow:** Explain each phase's proposed work and ask for approval *before* generating code. An approved architecture is **not** permission to write code. Implement only the specific approved phase and step.
4. When authorized to code, provide ready-to-copy-paste examples with the **exact folder, filename, insertion/replacement location, commands, simple explanation, and expected test results**. Avoid downloadable-code-only deliverables.
5. Use **React + JavaScript (JSX) + Vite** in **both** frontends. Frontend source uses `.jsx`, `.js`, `.css` — **not TypeScript**. The **NestJS + Express backend remains TypeScript** (`.ts`).
6. The guest and admin applications use a shared **NestJS REST API**; never connect frontend code directly to the database.
7. Keep security and correctness requirements even when simplifying code, especially authorization, double-booking prevention, PayMongo verification, and NFC credential safety.
8. Preserve unanswered implementation choices as **TBD**, not invented facts. Confirm them in their respective phases, particularly NFC hardware, cancellation and no-show cutoffs, actual hosting provider, and deployment domains.
9. Source design images are **visual references only**. Use **NEXORA** as the sole branding; do **not** introduce Seabreeze as a system or property name.
10. Complete and test one approved phase before advancing to the next.

---

## 1. Final project requirements

**Project objective:** Build a secure, responsive, web-based condotel management platform in which guests book rooms and staff manage operations, payments, check-ins, check-outs and NFC room access.

| Category | Approved requirement |
|---|---|
| Official system name | NEXORA |
| Property scope | One condotel property |
| Public website | NEXORA Guest Website |
| Internal system | NEXORA Admin Dashboard |
| Guest accounts | Registration and login optional |
| Guest checkout | Booking without an account supported |
| Online payments | PayMongo Hosted Checkout |
| Offline payments | Pay at Property |
| NFC | Included; device hardware not yet selected |
| Development database | SQLite |
| Production database | PostgreSQL recommended |
| Design | Uploaded references, all NEXORA branded |
| Architecture | Modular monolith |
| Code style | Simple, readable, maintainable; JavaScript frontend and TypeScript backend |

## 2. Final technology stack

| Layer | Technology |
|---|---|
| Guest and admin frontend | React, **JavaScript (JSX)**, Vite |
| Navigation | React Router |
| API client | Axios |
| Styling | Plain CSS with responsive layouts |
| Icons | Lucide React |
| Backend runtime | Node.js |
| Backend framework | NestJS using Express |
| Backend language | TypeScript |
| API architecture | REST API over HTTPS |
| Database access | Prisma ORM |
| Development database | SQLite |
| Production database | PostgreSQL (recommended) |
| Authentication | JWT + Passport |
| Authorization | Role-based access control (RBAC) |
| Password hashing | Argon2id |
| Sensitive-data encryption | AES-256-GCM when field-level encryption is required |
| Payments | PayMongo hosted checkout and verified webhooks; Pay at Property |
| Room images | Local backend file uploads initially; durable storage required for production |
| Source control | Git |

Use supported compatible package versions. No TypeScript files or TypeScript-specific `types/` convention are required in the frontend; use `.jsx` for React components/pages, `.js` for services/utilities, and `.css` for styles.

## 3. Complete system architecture

```text
Guest Website (React + JavaScript + Vite)       Admin Dashboard (React + JavaScript + Vite)
                    \                              /
                     \   Axios / HTTPS / REST API  /
                      +----------------------------+
                                   |
                         NestJS / Express API
                     Auth | Users/Guests | Rooms
                 Reservations | Payments | NFC Access
                  Dashboard | Reports | Settings/Audit
                                   |
                  +----------------+-----------------+
                  |                |                 |
             Prisma ORM      PayMongo API      NFC adapter (TBD)
                  |            + webhooks      + compatible locks
          SQLite (development)
          PostgreSQL (production recommended)
```

- Both frontends communicate with **one** backend and central database.
- NestJS validates inputs and permissions, applies business logic, processes payments and uses Prisma for persistence.
- PayMongo handles hosted checkout and sends signed events to the backend.
- The NFC module handles credentials and access permissions through a hardware adapter to be implemented after device selection.
- Use a **modular monolith**, not independently deployed microservices.

## 4. System users and permissions

Four primary roles: **Guest**, **Receptionist**, **Manager**, **Administrator**.

| Feature | Guest | Receptionist | Manager | Administrator |
|---|---|---|---|---|
| View public rooms | Yes | Yes | Yes | Yes |
| Make personal booking | Yes | Yes | Yes | Yes |
| Manage reservations | Own verified booking only | Yes | Yes | Yes |
| Check-in / check-out | No | Yes | Yes | Yes |
| Manage guest records | Own verified details | Yes | Yes | Yes |
| Issue / revoke NFC cards | No | Yes | Yes | Yes |
| Manage rooms and rates | No | View | Yes | Yes |
| View payments | Own verified records | Yes | Yes | Yes |
| Process refunds | No | No | Yes | Yes |
| View reports | No | No | Yes | Yes |
| Manage staff users | No | No | No | Yes |
| System settings | No | No | No | Yes |

The backend must enforce permissions with authorization guards. Guest booking lookup without an account requires private ownership verification; knowing a predictable booking reference alone must not expose records.

## 5. Guest Website architecture

**Design:** Uploaded screenshots are references for a responsive, luxury hospitality interface: navy blue, white, subtle gold, NEXORA logo, generous room photography, clear prices, straightforward booking steps.

| Page | Route | Purpose |
|---|---|---|
| Homepage | `/` | Landing, room search, featured rooms |
| Rooms | `/rooms` | Search, filter, and check room availability |
| Room Details | `/rooms/:id` | Amenities, photos, rates, capacity |
| Booking | `/booking` | Stay dates and guest data |
| Checkout | `/checkout/:reservationId` | Payment method selection |
| Booking Confirmation | `/booking/confirmation` | Show verified booking result |
| Find Booking | `/find-booking` | Secure lookup for guests |
| Login | `/login` | Optional sign-in |
| Register | `/register` | Optional guest registration |
| My Bookings | `/my-bookings` | Registered guest reservations |
| About | `/about` | Property information |
| Contact | `/contact` | Contact and location |
| Policies | `/policies` | Terms, cancellation, privacy |

Guests may book with or without accounts; guest records and user accounts must be separable. Search uses check-in/out, number of guests, room category, and availability. Frontend renders state but backend decides inventory and pricing.

## 6. Admin Dashboard architecture

**Design:** NEXORA-inspired dark navy sidebar, light workspace, summary cards, filters, tables and readable status labels.

| Module | Features |
|---|---|
| Dashboard | Overview, occupancy, arrivals, departures, revenue |
| Reservations | Bookings, calendar, check-in/out, cancellation |
| Rooms | Types, physical rooms, rates, amenities, photos |
| Guests | Guest details and stay history |
| NFC Management | Cards, assignments, lost cards, access logs |
| Payments | PayMongo, Pay at Property, refunds |
| Reports | Occupancy, revenue, reservations, access events |
| User Management | Staff accounts and roles |
| Settings | Property information, booking policies, configuration |
| Audit Logs | Administrative activity history |

Dashboard figures must come from backend records and use consistent definitions, including total rooms, occupied rooms, current reservations, expected arrivals/departures, and verified revenue.

## 7. Room and inventory management

Separate **RoomType** (e.g., Deluxe Suite) from **Room** (e.g., Room 101). One room type can contain multiple physical rooms.

- Room types: name, description, capacity, amenities, photographs, base nightly rate.
- Physical rooms: unique room number, floor, room type, operational status, eventual door device.
- Operational statuses: **Ready, Occupied, Cleaning, Maintenance, Out of Service**.
- Availability is **date-based** and accounts for reservations, holds and inventory blocks; a room being Ready now does not mean it is available on requested future dates.
- Guests may reserve a room type and receive a physical room assignment later, before check-in.
- No overlapping active room assignments; maintenance periods block inventory.
- Use straightforward nightly rates in first release; seasonal/dynamic pricing is future scope.

## 8. Reservation architecture

Primary lifecycle: **Pending → Confirmed → Checked In → Checked Out**. Additional outcomes: **Cancelled**, **Expired**. Payment status is independent of reservation status. Temporary booking holds protect inventory while online payment is pending.

Business rules:

1. Every booking has a unique reservation number.
2. Check-in date must be earlier than check-out date.
3. Guest count must fit room capacity.
4. NestJS calculates and confirms booking prices.
5. No room inventory double-booking.
6. Online checkout creates a limited-time inventory hold.
7. Cancelled/expired holds release inventory.
8. Authorized staff may create walk-in bookings.
9. Check-in requires a valid reservation and an assigned physical room.
10. Check-out closes the stay, initiates NFC credential revocation and room cleaning.

Use safe database transactions and inventory checks at booking confirmation; preserve the agreed rate/total as a reservation snapshot.

## 9. Payment architecture

### A. PayMongo Hosted Checkout

1. Guest selects PayMongo.
2. NestJS creates hosted checkout session.
3. Guest completes payment with PayMongo.
4. PayMongo sends a signed webhook.
5. NestJS verifies signature, unique event, expected amount and reservation reference.
6. Backend updates payment and reservation records accordingly.

**Never mark an online payment as paid merely because the browser returned to a success page.** Do not store raw payment-card details.

### B. Pay at Property

1. Guest selects Pay at Property.
2. NEXORA reserves inventory according to property policy.
3. Guest receives booking instructions.
4. Guest arrives.
5. Staff collects payment and records it.
6. Payment record becomes paid when correctly recorded.

For initial release, eligible Pay at Property bookings are automatically confirmed if inventory exists, subject to configurable arrival cutoff/no-show policy. Actual cutoffs are **TBD before launch**.

### Payment states

- **Unpaid:** no verified payment.
- **Pending:** processing/verification in progress.
- **Partially Paid:** part of required amount received.
- **Paid:** required amount received and verified.
- **Failed:** payment attempt unsuccessful.
- **Refunded:** payment returned.
- **Partially Refunded:** partial amount returned.

Example: `Reservation = Confirmed` and `Payment = Unpaid` is valid for Pay at Property.

## 10. NFC Card and door access architecture

**Hardware pending:** actual card type, encoder/reader, lock, communication protocol and network mode are **not yet selected**.

```text
Receptionist in NEXORA Admin
            <-> NestJS NFC Module (assignment and permissions)
            <-> NFC Hardware Adapter (implementation TBD)
            <-> Secure NFC Card / Reader / Door Lock
```

Capabilities planned:

- Register supported NFC cards.
- Assign credentials to guests and assigned physical rooms.
- Activate credentials for approved time periods.
- Revoke credentials; handle lost cards and reissuance.
- Record hardware-supported access events and outcomes.
- Assign separately authorized staff access.
- Register/manage door devices.

Security rules:

- Issue guest credentials only for valid room assignments; separate rules for authorized staff.
- Limit access to approved rooms and dates.
- Revoke on checkout and when a card is lost (subject to device-supported synchronization).
- Do **not** trust card UID as sole proof of access; select cryptographically authenticated card/lock system.
- Offline hardware must support planned expiration and revocation behavior.
- Provide safe emergency access and power/network failure procedures.
- Do not imply that door unlocking, real-time revocation or access-log reporting works before physical hardware has been selected and tested.

Before hardware selection, implement and test **simulated NFC events/assignments only**.

## 11. Final database architecture

One centralized SQL database accessed via Prisma. SQLite in development; PostgreSQL recommended for production.

| Model | Purpose |
|---|---|
| `User` | Name, email, password hash, role, status |
| `Role` | Role/permission grouping |
| `RefreshToken` | Hashed session refresh tokens, expiry |
| `Guest` | Contact information, optional linked user |
| `Property` | The single condotel property's information |
| `RoomType` | Description, capacity, base rate |
| `Room` | Number, type, floor, operational state |
| `Amenity` | Amenities |
| `RoomImage` | File path, room type, display order |
| `Reservation` | Unique booking reference, guest, dates, total, state |
| `ReservationGuest` | Other occupants |
| `RoomAssignment` | Physical room associated with a stay |
| `RoomBlock` | Maintenance/date blocks |
| `Payment` | Reservation, amount, method, state, reference |
| `PaymentEvent` | PayMongo event identity and processing state |
| `Refund` | Amount, reason, state |
| `NfcCard` | Card identifier and lifecycle state |
| `NfcCredential` | Secure credential reference/state |
| `CardAssignment` | Credential, reservation, room, date validity |
| `DoorDevice` | Lock/controller assigned to a room |
| `AccessLog` | Credential, door, time, result |
| `AuditLog` | Actor, action, affected record, timestamp |
| `SystemSetting` | Configurable operating rules/policies |

Relationships: guest → multiple reservations; reservation → occupants, payment records and room assignment; room type → multiple physical rooms; physical room → non-overlapping active assignments; reservation/room → credential assignment; credential → access events. Supporting join tables (e.g., `RoomType`–`Amenity`) may be required. Use unique identifiers, timestamps, indexes/constraints and migrations.

## 12. REST API architecture

Example endpoints (not an exhaustive contract):

| Domain | Routes |
|---|---|
| Authentication | `/api/auth/login`, `/api/auth/refresh` |
| Users | `/api/users`, `/api/users/:id` |
| Guests | `/api/guests`, `/api/guests/:id` |
| Room Types | `/api/room-types` |
| Rooms | `/api/rooms`, `/api/rooms/:id` |
| Availability | `/api/availability` |
| Reservations | `/api/reservations`, `/api/reservations/:id` |
| Check-in | `/api/reservations/:id/check-in` |
| Check-out | `/api/reservations/:id/check-out` |
| Checkout | `/api/payments/checkout` |
| PayMongo Webhook | `/api/webhooks/paymongo` |
| NFC Cards | `/api/nfc/cards` |
| NFC Assignments | `/api/nfc/assignments` |
| Reports | `/api/reports` |
| Settings | `/api/settings` |

Suggested NestJS module structure: **Controller** receives requests; **Service** applies business rules; **DTO** validates input; **Prisma** accesses DB; **Guard** authorizes access. Ensure guest-specific endpoints/booking lookups apply ownership verification and employee endpoints enforce RBAC.

## 13. Security architecture

| Area | Requirement |
|---|---|
| Passwords | Argon2id password hashing |
| Authentication | Passport + JWT |
| Sessions | Short-lived access tokens, rotating refresh tokens |
| Access | Backend RBAC guards |
| Sensitive data | AES-256-GCM for data requiring field encryption |
| Transport | HTTPS |
| Input | Backend validation and sanitization |
| Brute force | Login rate limiting |
| Payments | Hosted checkout, signed webhook verification, idempotency |
| Guest bookings | Private verification before showing personal records |
| NFC | Cryptographically authenticated credentials |
| Admin changes | Audit logs |
| Database | Least-privilege access and backups |
| Uploads | Type/size validation and protected storage |
| Secrets | Environment/secret management, never hardcode |
| Privacy | Appropriate privacy notices and compliance with applicable Philippine privacy requirements |

**KISS is not an excuse to remove critical security checks.**

## 14. Final project folder architecture

This is an **intended layout**, not permission to create every folder immediately. Add folders only when their features require them.

```text
NEXORA/
├── guest-web/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── admin-web/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── guests/
│   │   ├── rooms/
│   │   ├── reservations/
│   │   ├── payments/
│   │   ├── nfc/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── uploads/
│   │   ├── settings/
│   │   ├── audit/
│   │   └── common/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
├── docs/
├── .gitignore
└── README.md
```

File conventions: frontend components/pages `.jsx`; frontend services/utilities `.js`; styles `.css`; NestJS `.ts`; Prisma `.prisma`. **Do not introduce frontend `.ts` or `.tsx` files.**

## 15. Deployment architecture

Conceptual entry points (illustrative only, **not registered**):

- `nexora.example`: public React guest site.
- `admin.nexora.example`: React staff dashboard.
- `api.nexora.example`: HTTPS NestJS API.
- Restricted PostgreSQL for persistent production data.

Guest/admin applications can be statically hosted; NestJS needs persistent Node.js hosting. Production requires durable image storage, secrets, backups, migrations, monitoring, recovery, public HTTPS webhook endpoint and later device-specific NFC networking. Hosting provider and real domains are **TBD**.

## 16. Final development roadmap (12 phases, in order)

| Phase | Name | Deliverable |
|---|---|---|
| 01 | Project Foundation | Development environment; React **JavaScript + Vite** guest and admin frontends; NestJS **TypeScript** backend; verify API connection |
| 02 | Database Foundation | Prisma models, migrations, relationships, seed data |
| 03 | Authentication & RBAC | Staff login, optional guest accounts, secure sessions/roles |
| 04 | Room Management | Types, rooms, rates, photos, amenities, room states |
| 05 | Guest Website | Homepage, listing, room details, availability search, responsive UI |
| 06 | Reservation System | Guest checkout, inventory holds, room assignments, booking statuses, cancellation, check-in/out |
| 07 | Payment System | PayMongo hosted checkout/webhooks and Pay at Property records |
| 08 | Admin Dashboard | Reservations, guests, rooms, operational statistics |
| 09 | NFC Management | Cards, assignments, simulated access and later real lock integration after selection |
| 10 | Reports & Settings | Occupancy/revenue/booking reports, logs, settings |
| 11 | Testing & Security | End-to-end journeys, booking conflicts, role isolation, payment and NFC failures |
| 12 | Production Deployment | Hosting, PostgreSQL, HTTPS, durable storage, backup and monitoring |

**Gate before each phase:** Present the phase plan → obtain user's approval → generate step-specific copy/paste code if explicitly authorized → explain and test → obtain approval before moving to the next phase.

## 17. Scope for first complete release

| Initial release | Possible future enhancement |
|---|---|
| Single-property management | Multi-property support |
| Guest booking without login | Loyalty program |
| Optional guest accounts | Social login |
| Room inventory and date availability | Dynamic pricing |
| PayMongo | Other payment gateways |
| Pay at Property | POS integrations |
| Reception check-in and check-out | Self-service kiosk |
| NFC management/integration (hardware-dependent) | Mobile digital keys |
| Staff accounts/permissions | Advanced employee scheduling |
| Basic financial and occupancy reports | Predictive analytics |
| Audit logs | Accounting software integration |

NFC management is in software v1.0, but **real lock integration cannot be completed or claimed working until compatible hardware is chosen and tested**.

## 18. End-to-end operational workflow

1. Guest searches rooms.
2. Backend checks actual available inventory and rates.
3. Guest enters booking information; account is optional.
4. Guest selects PayMongo or Pay at Property.
5. Reservation becomes confirmed under applicable verified payment/property policy.
6. Receptionist verifies guest and checks them in.
7. Physical room is assigned (or validated if assigned earlier).
8. Compatible NFC credential is issued and activated for permitted stay.
9. Guest uses card at authorized lock, subject to hardware validation.
10. Guest checks out.
11. NFC credential is revoked according to supported hardware process.
12. Room enters cleaning, then Ready state after housekeeping.

## 19. KISS development standards

- Build one feature at a time; finish and test before moving forward.
- Use explicit, understandable filenames and function names.
- Each function should have a clear responsibility.
- Put shared business rules in proper backend services; avoid duplicate checks.
- Avoid unnecessary frameworks and dependencies.
- Never trust client-supplied prices, roles, payment confirmations or NFC authorization.
- Make user/developer error messages clear.
- For every authorized coding step: exact file path, full copy/paste code, placement, commands, plain-English explanation and tests.
- Keep all React code in ordinary JavaScript/JSX/CSS. Backend remains TypeScript.

## 20. Architecture status and approval boundary

| Item | Status |
|---|---|
| Architecture | **Approved v2.1** |
| Guest frontend | React + JavaScript + Vite |
| Admin frontend | React + JavaScript + Vite |
| Backend | NestJS + TypeScript |
| Business rules/database/NFC design | Retained from v2.0 |
| Development phases | Twelve phases retained |
| Implementation | Phases 1–4 COMPLETED; Phase 5 Steps 1–3 complete, Steps 4–5 backend complete/frontend in progress, Steps 6–7 pending; Phase 6 onward NOT STARTED / AWAITING APPROVAL |
| Coding authorization | Documentation synchronization only; no new implementation authorized; Phase 6 onward awaiting approval |

### Explicitly unresolved decisions

These remain for the relevant planning stages, not for an AI tool to invent:

- NFC card, reader/encoder, smart-lock model, online/offline mode, and vendor protocol.
- Property cancellation rules, Pay at Property arrival cutoff, and no-show timing.
- Real production hostname(s), domain(s), hosting provider and persistent image storage.
- Final detailed Prisma attributes, request/response DTOs, error formats and endpoint implementation contracts.
- Production migration and operational processes to be tested before launch.

### Version history

- **v2.0:** Original approved blueprint with React TypeScript frontends.
- **v2.1:** Same system scope, business rules, database, backend architecture, NFC plan and 12 phases; **both React frontends changed to JavaScript + JSX + Vite**, with `.jsx`/`.js` file conventions.

**Next action:** Continue Phase 5 Steps 4–5 frontend integration under the approved workflow, then address pending Steps 6–7. Do not begin Phase 6 without explicit approval. The original architecture decisions and twelve-phase sequence remain the baseline.
