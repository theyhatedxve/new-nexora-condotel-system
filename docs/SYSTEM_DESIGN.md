# NEXORA — System Design

## 1. System Objective

Provide a secure, responsive system for room discovery, reservations,
payments, guest operations, and NFC access management.

The system serves one condotel property.

Guest registration is optional. A guest may book without creating an account.

### Implementation status

| Phase | Status |
|---|---|
| Phase 1 | COMPLETED |
| Phase 2 | COMPLETED |
| Phase 3 | COMPLETED — 8/8 steps |
| Phase 4 | COMPLETED — 7/7 steps |
| Phase 5 | IN PROGRESS — Steps 1–3 complete; Steps 4–5 backend complete, frontend in progress; Steps 6–7 pending |
| Phase 6 onward | NOT STARTED / AWAITING APPROVAL |

The owner reports successful Phase 3 acceptance (23/23 checks); this update
inspected source without rerunning application tests. The working modular
monolith includes authentication, registration/email verification, global
JWT/role/throttling guards, room-management modules, and shared ownership/inventory
services. It has 25 Prisma models after the Phase 3 EmailVerificationToken extension. Room-management
services, image uploads, operational states, blocks, and inventory eligibility
are implemented. Full booking/payment operations and frontend auth integration
remain future work; this is not a production-readiness declaration.

See [phase checklists](IMPLEMENTATION_GUIDE.md), [actual API contracts](API.md),
[database evolution](DATABASE_SCHEMA.md), and [security evidence](SECURITY.md).

## 2. System Architecture

```text
NEXORA Guest Website                 NEXORA Admin Dashboard
React + JavaScript + Vite             React + JavaScript + Vite
              \                         /
               \      HTTPS / REST     /
                +---------------------+
                           |
                  NestJS + Express API
                           |
        +------------------+------------------+
        |                  |                  |
     Prisma ORM      PayMongo API       NFC Adapter
        |             + Webhooks       Hardware TBD
        |
 SQLite: development
 PostgreSQL: production recommended
```

Use a modular monolith:

- One backend application.
- Modules grouped by business responsibility.
- One centralized database.
- Separate guest and admin frontend applications.

Do not introduce microservices without an approved architectural change.

## 3. Responsibility Boundaries

| Layer | Responsibility |
|---|---|
| React pages | Display data and coordinate user interaction |
| React components | Render reusable interface elements |
| Frontend services | Send API requests |
| NestJS guards | Authenticate and authorize requests |
| NestJS DTOs | Validate request structure |
| NestJS services | Apply business rules and coordinate transactions |
| Prisma | Read and write database records |
| PayMongo | Host online checkout and report payment events |
| NFC adapter | Translate authorized access operations into device-specific actions |

Frontend applications must never connect directly to the database.

## 4. Backend Modules

| Module | Responsibility |
|---|---|
| Auth | Login, refresh, logout, optional guest registration |
| Users | Staff accounts, roles, account status |
| Guests | Guest profiles and stay history |
| Rooms | Room types, physical rooms, rates, images, amenities |
| Reservations | Holds, bookings, assignments, check-in/out |
| Payments | Hosted checkout, verified payments, refunds |
| NFC | Cards, credentials, assignments, device integration |
| Dashboard | Operational summary data |
| Reports | Occupancy, reservation, revenue, access reports |
| Settings | Property details and operating policies |
| Audit | Administrative activity history |
| Uploads | Room image validation and storage |

This table describes the approved full-system scope. Implemented modules are
AuthModule, PrismaModule, RoomTypesModule, RoomsModule, AmenitiesModule,
RoomImagesModule, and RoomBlocksModule. OwnershipModule and InventorySafetyModule
export reusable checks for explicit use by feature services. The inventory
service exposes no public booking/availability API. AvailabilityModule separately
registers GET /api/availability for read-only date/capacity and price queries. Full guest/staff management,
reservations, payments, NFC, data-powered dashboards, reports, settings, and audit
business workflows remain future work. See [actual contracts](API.md).

## 5. Roles and Permissions

| Capability | Guest | Receptionist | Manager | Administrator |
|---|---|---|---|---|
| Browse public rooms | Yes | Yes | Yes | Yes |
| Make personal bookings | Yes | Yes | Yes | Yes |
| Manage reservations | Own verified bookings | Yes | Yes | Yes |
| Check-in/check-out | No | Yes | Yes | Yes |
| Manage guest details | Own verified details | Yes | Yes | Yes |
| Issue/revoke NFC access | No | Yes | Yes | Yes |
| Manage rooms and rates | No | View only | Yes | Yes |
| View payments | Own verified records | Yes | Yes | Yes |
| Process refunds | No | No | Yes | Yes |
| View reports | No | No | Yes | Yes |
| Manage staff accounts | No | No | No | Yes |
| Manage settings | No | No | No | Yes |

The table defines the full-system permission intent. Room/amenity/image writes
are implemented for ADMIN/MANAGER; physical room/block reads allow reception.
Reception status changes are restricted to READY/CLEANING. Other business
permissions remain requirements for future features. Global JWT and role
guards are implemented; @Roles() matches explicit role lists without an ADMIN
bypass. OwnershipService checks linked Guest.userId and reservation.guest.userId,
returns 404 for private/inaccessible records, and permits staff only through an
explicit caller allowlist. Future feature services must call these helpers; they
do not automatically protect APIs that have not been implemented.

Hiding a button does not enforce authorization.

## 6. Guest Website

Implemented guest browsing uses GuestLayout, Home, Rooms, RoomDetails, room cards,
metadata hooks/services, image URL resolution, and PHP nightly-rate formatting.
Backend availability search and stay-price calculation are complete per owner
confirmation. Frontend date/guest controls, availability requests/results, and
searched-stay quote display remain in progress. Steps 6–7 interface-state and
responsive/keyboard acceptance remain pending; no fresh browser testing ran here.

Approved target routes (not a current implementation inventory; the guest
application currently registers /, /rooms, and /rooms/:id):

| Route | Screen |
|---|---|
| / | Homepage |
| /rooms | Room search and listing |
| /rooms/:id | Room details |
| /booking | Booking details |
| /checkout/:reservationId | Payment selection |
| /booking/confirmation | Booking result |
| /find-booking | Secure booking lookup |
| /login | Guest login |
| /register | Optional registration |
| /my-bookings | Account-linked bookings |
| /about | Property information |
| /contact | Contact information |
| /policies | Booking and privacy policies |

A route parameter is an identifier, not proof of ownership.

## 7. Admin Dashboard

Planned business areas (existing admin navigation includes placeholder pages):

- Dashboard.
- Reservations.
- Rooms.
- Guests.
- NFC Management.
- Payments.
- Reports.
- User Management.
- Settings.
- Audit Logs.

Dashboard totals must use backend definitions shared with reports.

A revenue figure must explain whether it represents collected payments,
refund-adjusted collections, or another approved measure.

## 8. Core Business Rules

1. Separate RoomType from physical Room.
2. Separate Guest from User.
3. Separate reservation status from payment status.
4. Calculate prices in the backend.
5. Preserve the agreed reservation price.
6. Check availability for the requested dates.
7. Include active holds and room blocks in inventory checks.
8. Prevent conflicting bookings through database-safe operations.
9. Require a valid room assignment before check-in.
10. Start room cleaning and NFC revocation at checkout.
11. Preserve operational and financial history.

A room being Ready today does not prove future availability.

## 9. Integration Boundaries

### PayMongo

Use Hosted Checkout.

Only verified backend payment evidence may change online payment records
to a successful state.

A browser success redirect is not payment verification.

### NFC

NFC software management is in scope.

Before hardware selection, use clearly identified simulations.

Real door access, revocation timing, and access-log delivery require
compatible hardware and physical testing.

## 10. Release Scope

Initial release:

- Single property.
- Optional guest accounts.
- Guest checkout.
- Room inventory.
- Reservations and room assignments.
- PayMongo and Pay at Property.
- Reception operations.
- NFC management.
- Basic reports.
- Staff access control.
- Audit logs.

Future scope:

- Multiple properties.
- Loyalty programs.
- Dynamic pricing.
- Other payment gateways.
- Mobile digital keys.
- Predictive analytics.

## 11. Unresolved Decisions

Refer to the [security concerns](SECURITY.md#15-production-hardening-and-open-concerns) for the
decision register and [security concerns](SECURITY.md#15-production-hardening-and-open-concerns)
for remaining production work.

Do not silently turn TBD policies into application defaults.
