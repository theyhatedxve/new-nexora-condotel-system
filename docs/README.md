# 1. NEXORA

## Current project checkpoint — 2026-11-18

The owner confirmed completion of Phase 11 verification and acceptance of
the Phase 12 local prototype demonstration.

The accepted prototype includes the guest account booking upgrade,
My Bookings, the admin UI redesign, Guest Accounts, guest-phone encryption,
database recovery verification, and synthetic demo data.

The admin navigation scrolling correction is also owner-accepted.

NFC functionality remains postponed.
Production deployment remains deferred.

Use these documents to run or continue the project:

- [Local prototype setup](LOCAL_PROTOTYPE_SETUP.md)
- [Current project checkpoint](MD_Files/AGENTS.md)
- [AI continuation handoff](AI_HANDOFF.md)
- [Implementation guide](IMPLEMENTATION_GUIDE.md)
- [Technical plan](MD_Files/TECHNICAL_PLAN.md)

Completion statements reflect owner-reported verification and acceptance.

NEXORA is an integrated, web-based Condotel Management System for one property.
It connects accommodation information, guest services, and staff operations
through a shared platform designed for secure and maintainable daily use.

## 2. System Overview

The system is designed to reduce fragmented room records and disconnected
workflows. A guest-facing website provides a public entry point, while an
administration dashboard gives staff a dedicated workspace. Both use one backend
API and a central database so access rules and business decisions stay consistent.

The backend supports accounts, authentication, authorization, room inventory,
reservations, guests, payment processing, reports, settings, audit, and staff
account management. The guest website connects public room discovery and stay
quotes to authenticated booking and My Bookings. The owner confirmed completing
the Admin UI redesign. Current regression and browser acceptance are pending.

## 3. System Users

| User | Responsibilities and typical interactions |
|---|---|
| Guest | Browse accommodation publicly, then register, verify email, and sign in to create and view owned bookings |
| Receptionist | Review physical rooms and blocks; perform permitted ready/cleaning transitions; intended reception workflows include guest assistance and arrivals/departures |
| Manager | Manage room types, physical rooms, amenities, images, rates, capacity, operational states, and dated blocks; intended oversight includes reservations and reports |
| Administrator | Manage permitted staff accounts, property settings, and operational records |

Permissions are enforced by the backend. An administrator role does not
automatically bypass an explicit role list or private-record ownership check.

## 4. Guest-Facing Website

The guest application includes a shared layout, responsive navigation, footer,
homepage, room listing, and room-detail pages. Room listings and details fetch
public room-type information, photos, and amenities and display the current
nightly rate. Hooks handle loading, errors, missing optional content, and stale
responses; complete interface-state and accessibility acceptance is still pending.

Date/guest-capacity availability and calculated nightly/stay totals are connected
to the guest interface. Registration, verification, sign-in/out, protected
checkout, payment return, and My Bookings list/detail pages are present.
The latest account upgrade still awaits owner browser acceptance.

## 5. Administration Dashboard

The administration application provides the redesigned shared layout, sidebar,
dashboard, reservation and guest details, rooms/types, payments, reports, users,
settings, and audit views. NFC remains a postponed placeholder. Staff access and
record permissions are enforced by the backend. The settings reference now
exposes reservationHoldMinutes after removal of the obsolete booking-link field.

## 6. Room Inventory and Availability

A **room type** describes an accommodation category, its capacity, and base rate.
A **physical room** is an individual room belonging to that type. Room images and
amenities describe the category; operational status describes a room's current
condition, such as Ready, Cleaning, Occupied, Maintenance, or Out of Service.

Dated blocks exclude a physical room for an interval. Canceling a block preserves
its history while removing it from active block checks. Room assignments link
reservations to physical rooms and retain release history.

A reusable backend eligibility service checks room activity, matching type,
capacity, operational status, active blocks, and conflicting assignments.
Immediate use requires a Ready room. Future eligibility uses the requested dates
and relevant conflicts. The eligibility helper reserves nothing. A separate public availability API
provides informational room-type results and backend-calculated stay prices.
The guest interface uses these results. Booking acquisition separately rechecks
inventory inside the existing transaction boundary.

## 7. Reservation and Guest Experience

Guests explore rooms, select dates, sign in, review a trusted price, and choose
Pay at Property or PayMongo test checkout. The backend uses the authenticated
profile and existing booking policy to create the reservation. My Bookings lists
only that account's reservations. Staff coordinate confirmation, room assignment,
arrival, departure, and room preparation through permitted operations.

Booking creation, recovery, private details, and guest payment actions require
authenticated account ownership. Retired accountless endpoints return HTTP 410.

## 8. Security and Data Protection

The backend uses password hashing, signed access tokens, rotating session
credentials, explicit role permissions, and reusable ownership checks.
Registration requires email verification before account activation. Guest data
is returned only through authorized access and appropriate response projections.

Uploaded room images are decoded and validated, then re-encoded for controlled
public delivery. Backend secrets and private records belong outside public
source and browser configuration. Production operation requires HTTPS, durable
storage, monitoring, tested recovery, and deployment-specific verification.

Online payment source uses PayMongo test checkout and verified signed provider
events. Payment summaries are read from the backend. A browser return alone
does not establish payment.

## 9. NFC Room Access

NFC card administration and compatible door-lock integration are planned.
The intended design associates approved credentials with authorized rooms and
stay periods, supports revocation, and records supported access events.

Actual unlocking, expiry, offline behavior, and revocation depend on selected
cards, readers, locks, and vendor integration methods. Physical door functionality
must not be inferred from database models or software simulations.

## 10. System Architecture

```text
Guest Website                       Administration Dashboard
      \                                      /
       +------------ Shared Backend API ----+
                              |
             +----------------+----------------+
             |                |                |
       Central SQL      PayMongo test     Planned NFC adapter
         Database       payment provider  and compatible doors
```

The two web applications use React with JavaScript/JSX and Vite. The backend
uses NestJS with TypeScript and Prisma database access. SQLite supports local
development; PostgreSQL is the recommended production target and requires
separate migration and deployment verification. Test payment integration is
installed. Hardware integration remains postponed.

Technical references: [API contracts](API.md), [system design](SYSTEM_DESIGN.md),
[database architecture](DATABASE_SCHEMA.md), and [security](SECURITY.md).

## 11. System Vision

NEXORA aims to provide a connected, secure, efficient, and maintainable condotel
management experience, with clear guest interactions and reliable tools for
the people operating the property.
