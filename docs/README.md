# 1. NEXORA

NEXORA is an integrated, web-based Condotel Management System for one property.
It connects accommodation information, guest services, and staff operations
through a shared platform designed for secure and maintainable daily use.

## 2. System Overview

The system is designed to reduce fragmented room records and disconnected
workflows. A guest-facing website provides a public entry point, while an
administration dashboard gives staff a dedicated workspace. Both use one backend
API and a central database so access rules and business decisions stay consistent.

The backend currently supports accounts, authentication, authorization, room-type
and physical-room management, amenities, room images, operational room states,
and dated room blocks. The web applications provide starter screens and
navigation; complete guest and staff workflows are still intended capabilities.

## 3. System Users

| User | Responsibilities and typical interactions |
|---|---|
| Guest | Explore accommodation and, as guest workflows become available, arrange and manage a stay; account creation is optional |
| Receptionist | Review physical rooms and blocks; perform permitted ready/cleaning transitions; intended reception workflows include guest assistance and arrivals/departures |
| Manager | Manage room types, physical rooms, amenities, images, rates, capacity, operational states, and dated blocks; intended oversight includes reservations and reports |
| Administrator | Manage permitted room operations and system access; wider staff-account and settings interfaces remain intended capabilities |

Permissions are enforced by the backend. An administrator role does not
automatically bypass an explicit role list or private-record ownership check.

## 4. Guest-Facing Website

The guest application currently includes a homepage, rooms screen, navigation,
shared styling, and a backend-connection status component. Public backend APIs
provide active room-type details, amenities, and approved room images. Complete
integration of that data into the guest browsing experience remains to be built.

The intended experience includes property information, accommodation photos,
room-type details, date-based availability, reservations, optional accounts,
booking management, and payment selection. Account registration, email
verification, and sign-in are supported by backend services; complete browser
account screens and reservation/payment workflows are not yet available.

## 5. Administration Dashboard

The administration application provides a shared layout, sidebar, dashboard
starter, and placeholder operational pages. Room-management APIs support
room types, physical rooms, amenities, photos, rates, capacity, permitted
operational status changes, and maintenance/date blocks.

Connected management forms, reservation and guest-record workflows, staff-account
administration, payment/transaction screens, reports, and monitoring views remain
intended interface capabilities. Navigation labels do not establish a working
business workflow.

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
and relevant conflicts. This check does not reserve inventory or expose a public
availability or booking API; complete reservation allocation remains intended work.

## 7. Reservation and Guest Experience

The intended journey is to explore rooms, select stay dates, provide guest
details, review a trusted price, choose payment, and receive a confirmed booking.
Reception would then coordinate room assignment, arrival, departure, and follow-up
room preparation. These complete booking and reception workflows are not yet
operational.

Guests must be able to book without registering when booking becomes available.
Optional accounts are intended to provide convenient access to verified personal
records. Booking references alone must never expose private stay information.

## 8. Security and Data Protection

The backend uses password hashing, signed access tokens, rotating session
credentials, explicit role permissions, and reusable ownership checks. Optional
registration requires email verification before account activation. Guest data
is returned only through authorized access and appropriate response projections.

Uploaded room images are decoded and validated, then re-encoded for controlled
public delivery. Backend secrets and private records belong outside public
source and browser configuration. Production operation requires HTTPS, durable
storage, monitoring, tested recovery, and deployment-specific verification.

The intended online payment design uses hosted checkout and verified provider
events. Payment processing is not implemented; a browser return page must never
be treated as proof of payment.

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
                     Central SQL Database
                              |
            Planned external integration boundaries
                    /                         \
          Hosted payment provider       NFC adapter and
                                        compatible door devices
```

The two web applications use React with JavaScript/JSX and Vite. The backend
uses NestJS with TypeScript and Prisma database access. SQLite supports local
development; PostgreSQL is the recommended production target and requires
separate migration and deployment verification. Payment and hardware boundaries
in the diagram describe intended integrations.

Technical references: [API contracts](API.md), [system design](SYSTEM_DESIGN.md),
[database architecture](DATABASE_SCHEMA.md), and [security](SECURITY.md).

## 11. System Vision

NEXORA aims to provide a connected, secure, efficient, and maintainable condotel
management experience, with clear guest interactions and reliable tools for
the people operating the property.
