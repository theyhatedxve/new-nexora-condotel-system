# NEXORA — System Design

## 1. System Objective

Provide a secure, responsive system for room discovery, reservations,
payments, guest operations, and NFC access management.

The system serves one condotel property.

Guest registration is optional. A guest may book without creating an account.

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

Create modules as their approved implementation steps require them.

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

Backend guards and service-level ownership checks enforce these permissions.

Hiding a button does not enforce authorization.

## 6. Guest Website

Approved routes:

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

Main areas:

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

Refer to README.md for the decision register.

Do not silently turn TBD policies into application defaults.
