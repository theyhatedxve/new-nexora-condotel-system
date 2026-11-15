# NEXORA
# TECHNICAL_PLAN.md

**Project:** NEXORA Condotel Management System  
**Document Version:** Proposed 3.0  
**Prepared:** November 15, 2026  
**Status:** Owner-Approved Technical Plan  
**Architecture Baseline:** NEXORA Architecture v2.1  
**Development Target:** Local Prototype  
**Implementation Authorization:** EggPie

---

# 1. Technical Planning Overview

## 1.1 Purpose

This document defines the proposed technical development plan for extending the existing NEXORA Condotel Management System.

It covers:

1. Technical architecture and directory structure.
2. Backend and frontend module responsibilities.
3. Software design patterns and development principles.
4. Existing database entities and proposed schema changes.
5. Application state management and API data flow.
6. Sequential implementation backlog.
7. Project assumptions, constraints, and exclusions.
8. Testing and verification.
9. Local deployment and packaging.

This plan must preserve completed functionality and historical records.

It does not authorize implementation, source modification, database migration, or deployment.

## 1.2 System Scope

NEXORA manages one condotel property through two React applications connected to a shared NestJS backend.

### Guest Website

The Guest Website supports:

- Guest registration.
- Email verification.
- Authentication.
- Room-category browsing.
- Rental-duration selection.
- Availability searching.
- Reservation creation.
- PayMongo Hosted Checkout.
- Pay at Property selection.
- Personal reservation management.
- Booking confirmation.
- Applicable cancellation requests.
- Guest notifications.

### Administration Dashboard

The Administration Dashboard supports:

- Operational dashboard.
- Reservation management.
- Room assignments.
- Guest management.
- Check-in and checkout.
- Payment recording.
- Payment reconciliation.
- Property charge recording.
- Security deposit accounting.
- Housekeeping.
- Room rates.
- Reporting.
- Staff account management.
- System settings.
- Audit history.

Access depends on the authenticated user's permissions.

## 1.3 Existing Development Baseline

The latest owner-confirmed `AGENTS.md` checkpoint records:

| Original Phase | Recorded Status |
|---|---|
| 1. Project Foundation | Completed |
| 2. Database Foundation | Completed |
| 3. Authentication and RBAC | Completed |
| 4. Room Management | Completed |
| 5. Guest Website | Completed |
| 6. Reservation System | Completed |
| 7. Payment System | Completed |
| 8. Admin Dashboard | Completed |
| 9. NFC | Postponed |
| 10. Reports and Settings | Completed |
| 11. Testing and Security | Paused, incomplete |
| 12. Production Deployment | Deferred |

The Admin Dashboard redesign is also owner-confirmed complete.

Some Guest Website screen acceptance and backend regression verification remain outstanding.

These milestones are owner-reported project checkpoints. They do not mean the newly approved requirements are implemented.

## 1.4 Planning Authority

The following documents govern implementation:

- `AGENTS.md` for the latest development checkpoint.
- `NEXORA_ARCHITECTURE_V2.1.md` for the existing approved architecture.
- `AI_HANDOFF.md` for continuation history.
- `DATABASE_SCHEMA.md` for the documented database.
- `API.md` for existing API contracts.
- `BUSINESS_FLOWS.md` for documented workflows.
- `SECURITY.md` for security requirements.
- `DIRECTORY_STRUCTURE.md` for source organization.
- `DEVELOPMENT_RULES.md`, `CODING_PRINCIPLES.md`, and `CODING_PATTERNS.md` for code standards.
- `IMPLEMENTATION_GUIDE.md` for owner execution and verification.
- `design_guidelines.md` for visual conventions.
- `CI_CD_ROADMAP.MD` for testing and future delivery.

The newly approved business-rule revisions in the owner's November 2026 planning discussion are proposed updates to Architecture v2.1.

They must be reconciled and formally adopted before implementation.

---

# 2. Technical Architecture

## 2.1 Architecture Pattern

NEXORA retains a modular-monolith architecture.

The system contains:

- Two independently built React frontend applications.
- One shared NestJS REST API.
- One Prisma database-access layer.
- One relational database.
- External payment integration.
- Existing email infrastructure.
- A postponed NFC hardware boundary.

No microservice architecture is proposed.

## 2.2 High-Level Architecture

```text
                      NEXORA SYSTEM
                            |
              +-------------+-------------+
              |                           |
       GUEST WEBSITE              ADMIN DASHBOARD
       React + JSX                React + JSX
       Vite                       Vite
       React Router               React Router
       Axios                      Axios
       Plain CSS                  Plain CSS
              |                           |
              +-------------+-------------+
                            |
                      REST API
                            |
                    NESTJS BACKEND
                            |
       +--------------------+-------------------+
       |                    |                   |
 Authentication      Business Modules     Security Guards
       |                    |                   |
       +--------------------+-------------------+
                            |
                       Prisma ORM
                            |
                          SQLite
                     Local Development
                            |
              +-------------+-------------+
              |                           |
       PayMongo Test API             Email Service
       Hosted Checkout               Verification
       Signed Webhooks               Notifications
```

All authoritative system operations must pass through the backend.

The frontend must never access the database directly.

## 2.3 Technology Stack

| Layer | Approved Technology |
|---|---|
| Frontend | React |
| Frontend language | JavaScript/JSX |
| Build tool | Vite |
| Client routing | React Router |
| HTTP communication | Axios |
| Styling | Plain CSS |
| Icons | Lucide React |
| Backend runtime | Node.js |
| Backend framework | NestJS with Express |
| Backend language | TypeScript |
| API architecture | REST |
| Database ORM | Prisma |
| Development database | SQLite |
| Future production database | PostgreSQL, subject to approval |
| Authentication | JWT and Passport |
| Password hashing | Argon2id |
| Selective field encryption | AES-256-GCM |
| Online payments | PayMongo Hosted Checkout |
| Offline payments | Pay at Property |
| Version control | Git |

Do not introduce unapproved frameworks, ORMs, state-management libraries, UI kits, or infrastructure dependencies.

## 2.4 Backend Architecture Rules

The backend controls:

- Authentication and authorization.
- Guest ownership verification.
- Input validation.
- Rental-duration validation.
- Occupancy validation.
- Price calculation.
- Room-category availability.
- Temporary inventory holds.
- Reservation status transitions.
- Payment verification.
- Payment reconciliation.
- Staff account permissions.
- Additional-charge approval.
- Financial accounting.
- Audit recording.
- Operational reporting.

Backend business rules must remain independent of React components.

## 2.5 Frontend Architecture Rules

Both frontends handle:

- User interaction.
- Navigation.
- Forms.
- Client-side validation feedback.
- Accessible UI states.
- API requests.
- Display formatting.
- Loading and error feedback.
- Local interface state.

The frontend must not independently authorize a staff operation, confirm a payment, or guarantee room inventory.

---

# 3. Directory Structure

## 3.1 Repository Organization

The current repository follows this structure:

```text
NEXORA/
|
+-- backend/
|   +-- prisma/
|   |   +-- schema.prisma
|   |   +-- migrations/
|   +-- src/
|   |   +-- auth/
|   |   +-- availability/
|   |   +-- amenities/
|   |   +-- common/
|   |   +-- payments/
|   |   +-- reservations/
|   |   +-- room-blocks/
|   |   +-- room-images/
|   |   +-- room-types/
|   |   +-- rooms/
|   |   +-- prisma/
|   |   +-- generated/
|   +-- package.json
|
+-- frontend/
|   +-- guest-web/
|   |   +-- src/
|   |   |   +-- assets/
|   |   |   +-- components/
|   |   |   +-- constants/
|   |   |   +-- hooks/
|   |   |   +-- layouts/
|   |   |   +-- pages/
|   |   |   +-- routes/
|   |   |   +-- services/
|   |   |   +-- styles/
|   |   |   +-- utils/
|   |   +-- package.json
|   |
|   +-- admin-web/
|       +-- src/
|       |   +-- assets/
|       |   +-- components/
|       |   +-- constants/
|       |   +-- hooks/
|       |   +-- layouts/
|       |   +-- pages/
|       |   +-- routes/
|       |   +-- services/
|       |   +-- styles/
|       |   +-- utils/
|       +-- package.json
|
+-- docs/
|   +-- AGENTS.md
|   +-- AI_HANDOFF.md
|   +-- API.md
|   +-- BUSINESS_FLOWS.md
|   +-- DATABASE_SCHEMA.md
|   +-- DIRECTORY_STRUCTURE.md
|   +-- SECURITY.md
|   +-- TECHNICAL_PLAN.md
|   +-- NEXORA_ARCHITECTURE_V2.1.md
|   +-- ...
|
+-- README.md
```

This is a summarized responsibility map, not a complete current file inventory.

Do not reorganize or move existing files without reviewing the actual repository and obtaining approval.

## 3.2 Backend Feature Structure

Retain the existing NestJS feature-module pattern.

Typical responsibilities:

```text
feature/
    feature.module.ts
    feature.controller.ts
    feature.service.ts
    dto/
    policies/
    helpers/
    *.spec.ts
```

These entries describe a possible feature structure. They are not instructions to create every directory.

### Responsibility Separation

| Component | Responsibility |
|---|---|
| Module | Dependency registration |
| Controller | HTTP requests and responses |
| DTO | Input validation |
| Service | Business rules and transaction orchestration |
| Policy helper | Focused authorization or eligibility rules |
| Prisma service | Database access |
| Guard | Authentication and authorization |
| Adapter | External provider communication |
| Test | Verification of expected behavior |

Business logic should not be embedded in controllers.

## 3.3 Frontend Responsibility Separation

| Directory | Responsibility |
|---|---|
| components | Reusable presentation |
| pages | Screen composition |
| layouts | Shared page structure |
| routes | Navigation and access routing |
| hooks | State and interaction coordination |
| services | Axios API communication |
| utils | Pure helper functions |
| constants | Shared definitions |
| styles | Design tokens and CSS |
| assets | Static visual resources |

Use existing feature-local structures where already established.

Do not recreate shared abstractions unnecessarily.

---

# 4. Module Scaffolding Breakdown

## 4.1 Authentication Module

Existing capabilities include JWT authentication, refresh-token rotation, email verification, and role-based access.

Proposed changes:

- Mandatory guest registration for new bookings.
- Mandatory email verification before booking.
- Five-role authorization.
- Progressive failed-login lockout.
- Admin-controlled staff password reset.
- Mandatory password change after reset.
- Super Admin account safeguards.

The authentication module must preserve historical accountless guest records without exposing them through email matching.

## 4.2 User and Guest Management

Responsibilities:

- User profiles.
- Guest profiles.
- Staff profiles.
- Account status.
- User-role assignment.
- Account deactivation.
- Password-reset initiation.
- Historical guest identity association.

Proposed roles:

1. Guest.
2. Receptionist.
3. Manager.
4. Admin.
5. Super Admin.

The complete permission matrix must be approved before role migration.

## 4.3 Room Type Module

Responsibilities:

- Room categories.
- Amenities.
- Images.
- Occupancy limits.
- Rental rates.
- Extra-person fees.
- Category activation.

Proposed rental durations:

- Hourly.
- Nightly.
- Weekly, seven complete days.
- Monthly, thirty complete days.

Existing nightly pricing snapshots must remain valid.

## 4.4 Physical Room Module

Responsibilities:

- Room number.
- Room category.
- Floor.
- Active status.
- Operational room readiness.
- Maintenance blocks.
- Room assignment history.

Room readiness is not equivalent to date-based reservation availability.

## 4.5 Availability Module

Responsibilities:

- Date/time validation.
- Occupancy checking.
- Rental eligibility.
- Pricing quotes.
- Inventory availability.
- Reservation conflict checking.

All availability decisions must use backend-controlled data.

The final inventory-allocation strategy must guarantee a feasible room assignment for the entire requested stay, not merely positive category-level capacity on each separate date.

## 4.6 Reservation Module

Responsibilities:

- Reservation creation.
- Reservation status.
- Inventory holds.
- Reservation expiration.
- Staff confirmation.
- Cancellation.
- Arrival reconfirmation.
- Room assignments.
- Check-in.
- Checkout.
- No-show handling.

### Online Reservation Rules

- Inventory hold: two hours.
- No visible application countdown required.
- Multiple eligible payment retries permitted.
- Retrying does not extend the original hold.
- Expired reservations remain expired or cancelled according to the approved lifecycle.
- New reservations require a fresh availability check.
- Payment uncertainty requires reconciliation.
- Verified successful payment confirms an eligible reservation.
- Paid reservations cannot be voluntarily cancelled.

### Pay at Property Rules

- Initial state: pending staff confirmation.
- Staff contacts the guest.
- First successful confirmation starts the five-hour cancellation period.
- Later arrival reconfirmations do not reset that period.
- Staff tracks expected arrival.
- Unpaid guests one hour late are subject to the approved no-show cancellation rule.
- Paid late arrivals retain their original departure commitment.

## 4.7 Payments Module

Existing integration:

- PayMongo Hosted Checkout.
- Verified webhook processing.
- Pay at Property.
- Payment records.
- Financial summaries.
- Provider-event deduplication.

Proposed revisions:

- Multiple payment attempts within active holds.
- Two-hour reservation hold integration.
- Late-payment reconciliation.
- Duplicate-payment review.
- Overpayment review.
- Super Admin-approved corrections.
- Strict separation of booking cancellation and financial correction.

Do not trust payment-result URL parameters.

## 4.8 Reception Operations

Responsibilities:

- Guest contact.
- Arrival scheduling.
- Room assignment.
- Check-in.
- Checkout.
- Property payment recording.
- No-show management.
- Housekeeping handoff.
- Damage recording.
- Late-checkout charges.
- Security deposits.

## 4.9 Charges and Deposit Modules

Proposed responsibilities:

- Additional-guest charges.
- Damage charges.
- Late-checkout charges.
- Charge approval.
- Deposit collection.
- Authorized deposit deductions.
- Deposit return.
- Financial reconciliation.

Receptionists record charges.

Managers, Admins, and Super Admins approve applicable damage and late-checkout charges.

## 4.10 Notification Module

Proposed responsibilities:

- Registration verification.
- Booking acknowledgment.
- Booking confirmation.
- Payment updates.
- Cancellation and expiration notices.
- Arrival reminders.
- Receptionist contact reminders.

Use the existing email infrastructure.

Do not add a queue service unless an approved requirement establishes its necessity.

## 4.11 Dashboard and Reporting

Operational dashboard data:

- Upcoming arrivals.
- Unpaid reservations.
- Checkout deadlines.
- Contact reminders.
- No-shows.
- Room availability.
- Occupancy.
- Payment summaries.
- Financial exceptions.

All displayed statistics must originate from backend-authorized records.

## 4.12 Audit Module

Record consequential activity:

- Actor.
- Action.
- Affected entity.
- Timestamp.
- Result.
- Sanitized contextual details.

The approved proposed policy restricts audit-log viewing to Super Admin.

## 4.13 NFC Module

NFC remains postponed.

The existing database foundation must be preserved.

The prototype must not implement credential issuance, door-unlocking commands, or fictional operational access logs.

Any displayed NFC area must clearly identify its unavailable or placeholder status.

---

# 5. Design Patterns and Principle Enforcement

## 5.1 SOLID

### Single Responsibility Principle

Keep authentication, inventory, pricing, payment processing, and UI presentation separate.

A payment service should not become responsible for calculating accommodation rates.

A frontend page should not manage database transactions.

### Open/Closed Principle

Extend existing rental-pricing and payment behavior through focused policies or provider boundaries.

Avoid modifying unrelated modules when adding a rental type.

### Liskov Substitution Principle

Any service implementation must preserve the guarantees of its interface.

A mock provider must not claim to perform real payment settlement.

### Interface Segregation Principle

Expose only required capabilities.

Guest booking operations should not receive staff administrative functions.

### Dependency Inversion Principle

Use NestJS dependency injection.

Keep core business services independent of external payment-provider implementation details where practical.

Do not introduce speculative abstraction layers.

## 5.2 DRY

Centralize:

- Pricing calculations.
- Rental-duration validation.
- Room availability.
- Reservation status transitions.
- Role permissions.
- Cancellation eligibility.
- Financial rounding.
- API error handling.

Never maintain competing authoritative booking rules in frontend and backend.

## 5.3 KISS

Prefer:

- Small services.
- Clear naming.
- Explicit business conditions.
- Simple state transitions.
- Existing dependencies.
- Readable code.

Avoid unnecessary design patterns.

## 5.4 YAGNI

Do not implement features without approved requirements.

Examples:

- Multiple properties.
- Loyalty programs.
- Dynamic pricing.
- Additional payment gateways.
- Advanced analytics.
- NFC hardware integrations.
- Microservices.

## 5.5 Composition Over Inheritance

Use focused React components, hooks, and service composition.

Avoid large class hierarchies and shared components containing unrelated feature-specific logic.

## 5.6 Database Transactions

Use ACID transactions for coordinated relational writes.

Examples:

- Reservation acquisition.
- Room assignment.
- Reservation expiration.
- Payment-event processing.
- Charge approval.
- Deposit accounting.
- Audit records coupled to financial changes.

Never perform external PayMongo calls inside database transactions.

## 5.7 Domain Invariants

The backend must enforce:

- No double bookings.
- No unauthorized status transitions.
- No negative financial amounts where prohibited.
- No duplicate verified payment effects.
- No unauthorized financial corrections.
- No invalid occupancy.
- No hourly rentals crossing the 11:00 PM boundary.
- No silent changes to existing reservation price snapshots.
- No deletion of protected historical records.

---

# 6. Database Architecture and Entities

## 6.1 Existing Database

NEXORA currently uses Prisma and SQLite.

`DATABASE_SCHEMA.md` documents 27 existing models.

The following is the documented scalar-field inventory.

Exact Prisma field types, defaults, indexes, relation declarations, and optionality must be verified against the current `backend/prisma/schema.prisma` before implementation.

## 6.2 Data Conventions

| Concern | Rule |
|---|---|
| Primary keys | Opaque string identifiers, existing CUID convention |
| Money | Integer PHP centavos |
| Event timestamps | UTC |
| Philippine stay dates | Asia/Manila calendar semantics |
| Date intervals | Arrival inclusive, departure exclusive |
| Database names | PascalCase models |
| Field names | camelCase |
| Relational links | Foreign keys |
| Deletion | Preserve historical and financial records |
| Changes | Versioned Prisma migrations |

For new hourly bookings, scheduled arrival and departure timestamps must be distinguished from legacy calendar-date markers.

## 6.3 Existing Identity Entities

### 1. Role

| Field | Specification |
|---|---|
| id | Primary key |
| name | Unique role name |
| description | Optional text |
| createdAt | Creation timestamp |
| updatedAt | Update timestamp |

### 2. User

| Field | Specification |
|---|---|
| id | Primary key |
| roleId | Role foreign key |
| name | User name |
| email | Unique email |
| passwordHash | Argon2id hash |
| status | UserStatus |
| createdAt | Creation timestamp |
| updatedAt | Update timestamp |

Existing UserStatus values:

- ACTIVE
- DISABLED
- PENDING

### 3. RefreshToken

| Field | Specification |
|---|---|
| id | Primary key |
| userId | User foreign key |
| familyId | Optional rotation-family identifier |
| tokenHash | Unique token hash |
| expiresAt | Expiration timestamp |
| revokedAt | Optional revocation timestamp |
| createdAt | Creation timestamp |

### 4. EmailVerificationToken

| Field | Specification |
|---|---|
| id | Primary key |
| userId | User foreign key |
| tokenHash | Unique hash |
| expiresAt | Expiration timestamp |
| usedAt | Optional consumption timestamp |
| createdAt | Creation timestamp |

### 5. Guest

| Field | Specification |
|---|---|
| id | Primary key |
| userId | Optional unique User foreign key |
| firstName | Given name |
| lastName | Family name |
| email | Optional email |
| phone | Optional phone |
| createdAt | Creation timestamp |
| updatedAt | Update timestamp |

Historical guests may exist without linked user accounts.

---

## 6.4 Existing Property and Room Entities

### 6. Property

Documented fields:

- id
- name
- address
- city
- province
- country
- contact fields

The exact names and types of the contact fields must be taken from the current Prisma schema.

### 7. RoomType

| Field | Specification |
|---|---|
| id | Primary key |
| propertyId | Property foreign key |
| name | Room-category name |
| capacity | Current capacity |
| baseRateCentavos | Current base nightly rate |
| isActive | Active flag |

The combination of propertyId and name is unique.

### 8. Room

| Field | Specification |
|---|---|
| id | Primary key |
| roomTypeId | RoomType foreign key |
| roomNumber | Unique room identifier |
| floor | Optional floor |
| status | RoomStatus |
| isActive | Active flag |

Existing RoomStatus values:

- READY
- OCCUPIED
- CLEANING
- MAINTENANCE
- OUT_OF_SERVICE

### 9. Amenity

- id: Primary key.
- name: Unique text.
- description: Optional text.

### 10. RoomTypeAmenity

- roomTypeId: RoomType foreign key.
- amenityId: Amenity foreign key.

Composite primary key: roomTypeId and amenityId.

### 11. RoomImage

- id: Primary key.
- roomTypeId: RoomType foreign key.
- filePath: Image storage reference.
- altText: Optional descriptive text.
- displayOrder: Integer order.
- isPrimary: Boolean.

---

## 6.5 Existing Reservation Entities

### 12. Reservation

| Field | Specification |
|---|---|
| id | Primary key |
| reservationNumber | Unique reference |
| guestId | Guest foreign key |
| roomTypeId | RoomType foreign key |
| checkInDate | Existing date marker |
| checkOutDate | Existing date marker |
| guestCount | Occupant count |
| nightlyRateCentavos | Historical rate snapshot |
| totalAmountCentavos | Historical total |
| status | ReservationStatus |
| holdExpiresAt | Optional expiration |
| createdAt | Creation timestamp |
| updatedAt | Update timestamp |

Existing statuses:

- PENDING
- CONFIRMED
- CHECKED_IN
- CHECKED_OUT
- CANCELLED
- EXPIRED

### 13. ReservationAccessToken

- id: Primary key.
- reservationId: Reservation foreign key.
- tokenHash: Unique hash.
- expiresAt: Expiration.
- usedAt: Optional consumption timestamp.
- createdAt: Creation timestamp.

### 14. ReservationAccessSession

- id: Primary key.
- reservationId: Reservation foreign key.
- tokenHash: Unique hash.
- expiresAt: Expiration.
- revokedAt: Optional revocation timestamp.
- createdAt: Creation timestamp.

### 15. ReservationGuest

- id: Primary key.
- reservationId: Reservation foreign key.
- firstName: Occupant given name.
- lastName: Occupant family name.
- createdAt: Creation timestamp.

### 16. RoomAssignment

- id: Primary key.
- reservationId: Reservation foreign key.
- roomId: Room foreign key.
- assignedAt: Assignment timestamp.
- releasedAt: Optional release timestamp.
- createdAt: Creation timestamp.

### 17. RoomBlock

- id: Primary key.
- roomId: Room foreign key.
- startDate: Start date.
- endDate: End date.
- reason: Block reason.
- canceledAt: Optional cancellation timestamp.
- createdAt: Creation timestamp.
- updatedAt: Update timestamp.

Active room blocks exclude rooms from eligible inventory.

---

## 6.6 Existing Payment Entities

### 18. Payment

Existing fields:

- id
- reservationId
- method
- status
- amountCentavos
- currency
- provider
- providerCheckoutId
- providerPaymentId
- referenceNumber
- paidAt
- createdAt
- updatedAt

The later Phase 7.2 documentation additionally records:

- checkoutRequestKeyHash
- checkoutRequestFingerprint
- checkoutState
- checkoutUrl

The Phase 7.2 additions require verification against the current Prisma schema because `DATABASE_SCHEMA.md` contains an earlier schema inventory alongside later payment implementation notes.

Existing PaymentMethod values:

- PAYMONGO
- PAY_AT_PROPERTY

Existing PaymentStatus values:

- UNPAID
- PENDING
- PARTIALLY_PAID
- PAID
- FAILED
- PARTIALLY_REFUNDED
- REFUNDED

### 19. PaymentEvent

- id: Primary key.
- paymentId: Optional Payment foreign key.
- providerEventId: Unique provider event identifier.
- eventType: Provider event type.
- providerCreatedAt: Optional event timestamp.
- status: PaymentEventStatus.
- signatureVerified: Boolean.
- payloadJson: Optional sanitized evidence.
- processedAt: Optional processing timestamp.
- errorMessage: Optional safe error information.
- createdAt: Creation timestamp.

Event statuses:

- RECEIVED
- PROCESSED
- IGNORED
- FAILED

### 20. Refund

- id: Primary key.
- paymentId: Payment foreign key.
- amountCentavos: Refund amount.
- reason: Explanation.
- status: RefundStatus.
- providerRefundId: Optional unique identifier.
- processedByUserId: Optional User foreign key.
- requestedAt: Request timestamp.
- completedAt: Optional completion timestamp.
- updatedAt: Update timestamp.

Existing statuses:

- PENDING
- COMPLETED
- FAILED
- CANCELLED

The Refund model remains available for approved financial corrections, not ordinary guest-initiated paid-booking cancellations.

---

## 6.7 Existing NFC Entities

These models already exist but operational NFC development remains postponed.

### 21. NfcCard

- id
- cardIdentifier
- status
- label
- registeredAt
- updatedAt

### 22. NfcCredential

- id
- cardId
- credentialReference
- status
- issuedAt
- revokedAt
- expiresAt
- createdAt

### 23. CardAssignment

- id
- credentialId
- reservationId
- roomId
- validFrom
- validUntil
- revokedAt
- createdAt

### 24. DoorDevice

- id
- roomId
- deviceIdentifier
- name
- status
- lastSeenAt
- createdAt
- updatedAt

### 25. AccessLog

- id
- credentialId
- doorDeviceId
- result
- occurredAt
- source
- reason
- createdAt

Existing constraints, status enumerations, and optional fields are defined in `DATABASE_SCHEMA.md`.

No NFC feature implementation is authorized by this technical plan.

---

## 6.8 Existing Administrative Entities

### 26. AuditLog

| Field | Specification |
|---|---|
| id | Primary key |
| actorUserId | Optional User foreign key |
| action | Action identifier |
| entityType | Target entity type |
| entityId | Optional target record identifier |
| detailsJson | Optional sanitized details |
| createdAt | Event timestamp |

### 27. SystemSetting

| Field | Specification |
|---|---|
| id | Primary key |
| key | Unique setting key |
| value | Setting value |
| description | Optional description |
| updatedByUserId | Optional User foreign key |
| createdAt | Creation timestamp |
| updatedAt | Update timestamp |

---

# 7. Proposed Database Extensions

All definitions in this section are design proposals.

They are not confirmed existing entities or approved Prisma migrations.

## 7.1 RentalRate

Purpose: Define duration-specific prices for room categories.

| Field | Proposed Type | Rule |
|---|---|---|
| id | String | Primary key |
| roomTypeId | String | RoomType foreign key |
| rentalType | Enum | HOURLY, NIGHTLY, WEEKLY, MONTHLY |
| rateCentavos | Int | Positive monetary amount |
| isActive | Boolean | Rate availability |
| createdAt | DateTime | Creation |
| updatedAt | DateTime | Update |

Recommended uniqueness: one active effective rate per room category and rental type, subject to the approved rate-history design.

Existing historical prices must not be recalculated.

## 7.2 Proposed RoomType Extensions

| Field | Type | Purpose |
|---|---|---|
| includedOccupancy | Int | Occupants included in base price |
| maxOccupancy | Int | Maximum permitted occupants |
| extraPersonFeeCentavos | Int | Additional-person charge |

Business invariant:

Maximum occupancy must be equal to or greater than included occupancy.

## 7.3 Proposed Reservation Extensions

| Field | Type | Purpose |
|---|---|---|
| rentalType | Enum | Rental duration category |
| scheduledArrivalAt | DateTime | Actual scheduled arrival instant |
| scheduledDepartureAt | DateTime | Actual scheduled departure instant |
| actualArrivalAt | DateTime? | Recorded arrival |
| actualDepartureAt | DateTime? | Recorded departure |
| firstConfirmedAt | DateTime? | Initial confirmation |
| cancellationDeadlineAt | DateTime? | Cancellation deadline |
| expectedArrivalAt | DateTime? | Reconfirmed arrival estimate |
| confirmedByUserId | String? | Staff confirmation actor |

Existing holdExpiresAt should be evaluated for reuse before introducing another hold-expiration field.

A proposed field must not duplicate an existing source of truth.

## 7.4 ReservationContact

Purpose: Record receptionist contact history.

| Field | Type |
|---|---|
| id | String |
| reservationId | String |
| staffUserId | String |
| contactType | Enum |
| contactResult | Enum |
| expectedArrivalAt | DateTime? |
| notes | String? |
| contactedAt | DateTime |

Possible contact types:

- Initial confirmation.
- One-week reminder.
- One-day reminder.
- Short-notice contact.
- Arrival follow-up.

Call records do not automatically change reservation confirmation timestamps.

## 7.5 ReservationCharge

Purpose: Record additional charges.

| Field | Type |
|---|---|
| id | String |
| reservationId | String |
| chargeType | Enum |
| description | String |
| amountCentavos | Int |
| status | Enum |
| recordedByUserId | String |
| approvedByUserId | String? |
| createdAt | DateTime |
| approvedAt | DateTime? |

Charge types:

- EXTRA_PERSON
- DAMAGE
- LATE_CHECKOUT

Avoid charging twice for fees already included in reservation totals.

## 7.6 SecurityDeposit

Purpose: Record optional deposits and settlement.

| Field | Type |
|---|---|
| id | String |
| reservationId | String |
| amountCentavos | Int |
| retainedCentavos | Int |
| returnedCentavos | Int |
| status | Enum |
| collectedByUserId | String |
| returnedByUserId | String? |
| collectedAt | DateTime |
| returnedAt | DateTime? |

The final design must support an auditable history of deposit movements rather than relying only on editable running totals.

## 7.7 Account Security Fields

Candidate User extensions or a dedicated account-security model:

- failedLoginCount
- lockoutLevel
- lockedUntil
- lastFailedLoginAt
- mustChangePassword

Do not store reset credentials in plaintext.

## 7.8 FinancialReview

Purpose: Track payment exceptions.

| Field | Type |
|---|---|
| id | String |
| reservationId | String? |
| paymentId | String? |
| reason | Enum |
| status | Enum |
| findings | String? |
| reviewedByUserId | String? |
| createdAt | DateTime |
| resolvedAt | DateTime? |

Review whether existing payment and audit records already provide sufficient structure before creating this entity.

## 7.9 NotificationDelivery

Purpose: Track message delivery when durable notifications are required.

| Field | Type |
|---|---|
| id | String |
| reservationId | String? |
| recipient | String |
| templateKey | String |
| status | Enum |
| scheduledAt | DateTime |
| sentAt | DateTime? |
| failureCode | String? |
| createdAt | DateTime |

Never store secrets or raw access tokens in notification history.

## 7.10 Schema Migration Constraints

Before implementation:

1. Inspect the current Prisma schema.
2. Confirm every proposed field.
3. Review existing relationships.
4. Design additive changes.
5. Preserve legacy data.
6. Review generated migration SQL.
7. Test against disposable databases.
8. Verify backup and restoration.
9. Obtain explicit migration authorization.

Database records must never be reset as a shortcut.

---

# 8. Core Business Logic Specifications

## 8.1 Rental Durations

### Hourly

- Minimum one hour.
- Permitted between 3:00 PM and 11:00 PM.
- No overnight hourly rental.
- Backend validates the exact arrival and departure interval.

### Nightly

- Arrival begins at 3:00 PM.
- Departure follows the property's approved standard checkout policy.
- Exact nightly checkout time remains unresolved.

### Weekly

- Seven complete days.
- The earlier owner example used 3:00 PM departure seven days after 3:00 PM arrival.
- Reconcile this with the standard checkout-time policy before implementation.

### Monthly

- Thirty complete days.
- Do not substitute variable-length calendar months.

## 8.2 Early Check-In

A receptionist may approve arrival up to 30 minutes before 3:00 PM.

Approval depends on room readiness and eligible occupancy.

Do not overwrite another guest's reservation.

## 8.3 Late Checkout

Approved grace period: 30 minutes.

After the grace period:

- Apply the room category's hourly rate where extension is permitted.
- Record the additional charge.
- Require the appropriate approval.
- Preserve other guests' confirmed inventory rights.

Partial-hour billing rounding remains to be finalized.

## 8.4 Inventory Hold

Approved duration: two hours.

Rules:

- Begin at the backend-authoritative hold timestamp.
- Preserve the same expiration across payment retries.
- Confirm only eligible reservations with verified payment.
- Do not automatically restore expired reservations.
- Require new availability checking for replacement bookings.
- Preserve uncertain payment evidence for reconciliation.

## 8.5 Pay at Property Confirmation

The initial staff confirmation starts the five-hour cancellation deadline.

Later arrival reminders do not reset this timestamp.

Staff confirmation and verified payment are separate events.

## 8.6 Cancellation

- Eligible unpaid reservations follow the five-hour cancellation window.
- Verified paid reservations prohibit voluntary cancellation.
- Cancelled reservations retain their records.
- Operational no-show actions follow separate authorized transitions.
- Financial corrections do not automatically cancel confirmed paid bookings.

## 8.7 Paid and Unpaid Late Arrivals

Unpaid guest:

- One hour late triggers the approved no-show cancellation policy.
- Released inventory becomes available after safe state transition.
- Later arrival requires a new availability check.

Paid guest:

- Actual arrival is recorded.
- Original departure time remains unchanged.
- No automatic cancellation based solely on one-hour lateness.

## 8.8 Guest Contact Schedule

Contact guests:

- Approximately one week before arrival when applicable.
- Shortly after short-notice booking when applicable.
- One day before arrival where possible.

Track contact outcomes and expected arrival time.

Same-day booking details require final approval.

---

# 9. Data Flow and State Management

## 9.1 Data Ownership

Use one authoritative backend source for business data.

### Backend-owned state

- Availability.
- Prices.
- Occupancy restrictions.
- Reservations.
- Payments.
- Financial calculations.
- Permissions.
- Audit records.

### Frontend-owned state

- Form input.
- Current route.
- Active dialog.
- UI filters.
- Sorting preferences.
- Temporary feedback.
- Loading/error indicators.

## 9.2 Request Lifecycle

```text
User Interaction
       |
React Component
       |
Feature Hook
       |
Axios API Service
       |
NestJS Controller
       |
Authentication Guard
       |
Authorization / Ownership
       |
DTO Validation
       |
Business Service
       |
Prisma Query or Transaction
       |
API Response
       |
React State Update
       |
Accessible Feedback
```

## 9.3 API Querying

Use the existing API service conventions.

Requirements:

- Reuse shared Axios configuration.
- Preserve authentication handling.
- Validate backend response contracts.
- Prevent duplicate submissions.
- Cancel obsolete requests where appropriate.
- Handle expired sessions.
- Use pagination for large datasets.
- Avoid repeated unnecessary requests.

Do not invent endpoints before reviewing `API.md`.

## 9.4 Caching

| Data | Recommended Approach |
|---|---|
| Room descriptions | Limited reuse |
| Amenities | Limited reuse |
| Room images | Browser asset caching |
| Room availability | Revalidate before booking |
| Rental pricing | Recalculate on backend |
| Reservation status | Refresh after mutations |
| Payment status | Backend verification and controlled refresh |
| Audit logs | Restricted, no unnecessary persistence |
| Auth permissions | Trusted server-derived state |

Do not introduce a new caching library by default.

## 9.5 Mutation Handling

For consequential actions:

1. Validate input.
2. Confirm authorization.
3. Request backend operation.
4. Enforce state transition.
5. Commit applicable transaction.
6. Record audit evidence.
7. Return authoritative result.
8. Refresh affected UI data.
9. Display accessible feedback.

Never optimistically mark a payment as successful.

---

# 10. Security and Permission Strategy

## 10.1 Five-Role Access Model

| Capability | Guest | Receptionist | Manager | Admin | Super Admin |
|---|---|---|---|---|---|
| Personal booking | Yes | Assisted | Yes | Yes | Yes |
| View bookings | Own | Authorized | Authorized | Authorized | Authorized |
| Check-in/out | No | Yes | Yes | Yes | Yes |
| Record property payment | No | Yes | Yes | Yes | Yes |
| Cancel eligible unpaid booking | Own | Yes | Yes | Yes | Yes |
| Change room rates | No | No | Yes | Yes | Yes |
| Approve additional charges | No | No | Yes | Yes | Yes |
| Manage regular staff | No | No | No | Limited | Yes |
| Manage Admin accounts | No | No | No | No | Yes |
| Change system name | No | No | No | No | Yes |
| View audit logs | No | No | No | No | Yes |
| System-wide settings | No | No | No | No | Yes |
| Financial exception approval | No | No | No | No | Yes |

This matrix is a proposed implementation specification derived from the owner's decisions. It must be formally reconciled with Architecture v2.1.

Discount permissions remain unresolved.

## 10.2 Login Lockout

| Condition | Action |
|---|---|
| First four failures | Permit retry |
| Fifth failure | Lock one minute |
| Next failure after unlock | Lock five minutes |
| Next failure after unlock | Lock fifteen minutes |
| Next failure after unlock | Lock thirty minutes |
| Successful login | Reset counter |
| One hour without failures | Reset counter |

Additional protections must account for concurrency and account-enumeration attacks.

## 10.3 Encryption and Secrets

Use:

- Argon2id for passwords.
- AES-256-GCM for approved sensitive fields.
- HTTPS/TLS for protected network traffic.
- Cryptographically random access tokens.
- Hashed stored session and recovery tokens.
- Secure backend configuration.
- Verified PayMongo webhooks.

Never expose backend secrets through Vite frontend variables.

## 10.4 Security Principles

Apply:

- Least privilege.
- Backend authorization.
- Ownership verification.
- Data minimization.
- Secure defaults.
- Input validation.
- Financial integrity.
- Safe error responses.
- Auditability.

---

# 11. UI/UX Technical Strategy

## 11.1 Visual Standards

Use the established NEXORA design direction:

- Navy.
- White.
- Subtle gold.
- Readable typography.
- Consistent components.
- Clear status indicators.
- Accessible layouts.

Preserve accepted screens unless approved changes require revisions.

## 11.2 Accessibility

Target WCAG 2.2 AA where practical.

Verify:

- Keyboard navigation.
- Focus visibility.
- Form labels.
- Error descriptions.
- Accessible dialogs.
- Contrast.
- Screen-reader status feedback.
- Responsive layouts.
- Reduced-motion behavior where relevant.

## 11.3 Responsive Design

Support:

- Small mobile screens.
- Larger mobile screens.
- Tablets.
- Desktop displays.

Tables, navigation, forms, dialogs, and primary actions must remain usable.

## 11.4 Required Interface States

Applicable interfaces must support:

- Loading.
- Empty.
- Success.
- Validation error.
- Network failure.
- Access denied.
- Session expired.
- Conflict.
- Payment review required.

## 11.5 Prototype Integrity

Clearly distinguish:

- Real backend-connected operations.
- Local test integrations.
- Synthetic demonstration records.
- Simulated UI behavior.
- Deferred NFC features.

Never display a fictional payment as verified operational revenue.

---

# 12. Sequenced Implementation Backlog

This is a proposed revision roadmap.

It does not replace the original completed NEXORA phase history.

## Phase 0: Existing System Audit

**Goal:** Establish a verified source-code baseline.

Tasks:

- Review current repository.
- Review `AGENTS.md`.
- Inspect current Prisma schema.
- Inspect API contracts.
- Review auth/RBAC.
- Review reservation workflows.
- Review PayMongo implementation.
- Review guest and admin screens.
- Identify incomplete verification.
- Establish a proposed change inventory.

Exit criteria:

- Current versus proposed features distinguished.
- Affected modules identified.
- Known risks documented.
- Owner accepts the change inventory.

## Phase 1: Architecture and Business-Rule Reconciliation

**Goal:** Formalize newly approved requirements.

Tasks:

- Validate five-role permissions.
- Define rental interval semantics.
- Finalize room pricing rules.
- Finalize reservation transitions.
- Confirm payment reconciliation.
- Resolve remaining business-rule gaps.
- Identify approved architecture amendments.

Exit criteria:

- Contradictions resolved or explicitly deferred.
- Architecture change specification approved.

## Phase 2: Database and API Design

**Goal:** Prepare additive changes.

Tasks:

- Validate all existing entities.
- Review proposed entity extensions.
- Preserve legacy data.
- Design migration dependencies.
- Define required API changes.
- Review audit and financial integrity.
- Verify migration test strategy.

Exit criteria:

- Owner-reviewed migration design.
- Approved API contract revisions.
- No unauthorized database changes.

## Phase 3: Authentication and Role Revision

**Goal:** Enforce the approved identity model.

Tasks:

- Add Super Admin role.
- Enforce verified accounts for new bookings.
- Add progressive account lockout.
- Implement authorized password resets.
- Enforce password change after reset.
- Restrict audit access.
- Protect the final Super Admin account.

Exit criteria:

- RBAC tests.
- Ownership tests.
- Authentication regression checks.
- Account lockout tests.

## Phase 4: Rental Pricing and Availability

**Goal:** Support approved rental types.

Tasks:

- Hourly rentals.
- Nightly compatibility.
- Seven-day rentals.
- Thirty-day rentals.
- Occupancy policies.
- Extra-person pricing.
- Time restrictions.
- Inventory concurrency.
- Existing reservation price preservation.

Exit criteria:

- Correct backend quotes.
- Safe inventory checks.
- No overlapping committed reservations.

## Phase 5: Reservation Lifecycle Revision

**Goal:** Support the approved booking policy.

Tasks:

- Two-hour holds.
- Eligible payment retries.
- Reservation expiration.
- Fresh booking after expiration.
- Pay at Property confirmation.
- Five-hour cancellation window.
- Arrival reconfirmation.
- Paid/unpaid no-show distinctions.

Exit criteria:

- Valid state transitions.
- Protected inventory.
- Historical records retained.

## Phase 6: Payments and Reconciliation

**Goal:** Extend verified payment processing.

Tasks:

- Preserve PayMongo Hosted Checkout.
- Align payment attempts with the hold policy.
- Handle delayed provider events.
- Prevent duplicate collection effects.
- Track financial exceptions.
- Require Super Admin review.
- Preserve audit evidence.

Exit criteria:

- Verified backend payment confirmation.
- Idempotent event processing.
- Correct financial review handling.

## Phase 7: Property Operations

**Goal:** Complete the revised front-desk workflow.

Tasks:

- Guest contact history.
- Arrival tracking.
- Check-in.
- Checkout.
- Room assignments.
- Late checkout.
- Damage recording.
- Charge approval.
- Deposit collection and return.
- Housekeeping.

Exit criteria:

- Authorized staff workflows operate correctly.
- Additional charges reconcile.
- Room inventory remains protected.

## Phase 8: Guest Website Integration

**Goal:** Integrate the approved guest experience.

Tasks:

- Review accepted guest screens.
- Update account requirements.
- Add rental selection.
- Display trusted pricing.
- Integrate reservation transitions.
- Integrate payment verification states.
- Improve accessibility.
- Verify responsive layouts.

Exit criteria:

- Complete guest booking journey.
- Correct error feedback.
- No unsupported functionality presented as operational.

## Phase 9: Administration Dashboard Integration

**Goal:** Integrate revised operational workflows.

Tasks:

- Preserve accepted dashboard design.
- Integrate new reservation states.
- Add contact reminders.
- Add financial review interfaces.
- Add charge approvals.
- Add deposit accounting.
- Update Super Admin navigation.
- Verify permission-sensitive UI.

Exit criteria:

- Role-specific navigation correct.
- Operational information backend-derived.
- Existing dashboard functionality preserved.

## Phase 10: Notifications and Reports

**Goal:** Support property communication and reporting.

Tasks:

- Reservation confirmation emails.
- Payment updates.
- Arrival reminders.
- Contact reminders.
- Cancellation notices.
- Occupancy reporting.
- Deposit reporting.
- Financial exception reporting.

Exit criteria:

- Delivery behavior verified.
- Sensitive data protected.
- Reports reconcile with stored records.

## Phase 11: Integrated Testing and Security

**Goal:** Verify the revised system.

Tasks:

- Unit testing.
- API integration testing.
- Database integrity testing.
- Guest E2E testing.
- Admin E2E testing.
- Payment test-mode verification.
- Accessibility review.
- Responsive review.
- Security regression testing.
- Backup and recovery verification.

Exit criteria:

- Critical scenarios pass.
- Known failures documented and resolved or explicitly accepted.
- Owner confirms acceptance.

The historically paused testing phase must not automatically resume without scoped approval.

## Phase 12: Local Prototype Packaging

**Goal:** Prepare a repeatable local demonstration.

Tasks:

- Verify dependency manifests.
- Verify environment configuration.
- Verify database target.
- Prepare synthetic demo data.
- Verify frontend builds.
- Verify backend startup.
- Verify PayMongo test configuration.
- Document startup and shutdown.
- Label NFC as postponed.
- Document known limitations.

Exit criteria:

- Guest and admin applications start locally.
- Backend communication works.
- Approved journeys operate against isolated prototype data.
- Owner accepts the demonstration package.

Production deployment remains deferred.

---

# 13. Testing Strategy

## 13.1 Unit Testing

Use existing project test tools.

Test:

- Pricing formulas.
- Rental duration calculations.
- Occupancy limits.
- Extra-person charges.
- Cancellation deadlines.
- Reservation status transitions.
- Login lockouts.
- Role permissions.
- Damage-charge approvals.
- Deposit calculations.
- Payment reconciliation rules.

## 13.2 Integration Testing

Test:

- Prisma relationships.
- Transaction rollback.
- Unique constraints.
- Inventory contention.
- Room assignment eligibility.
- Reservation expiration.
- Payment-event idempotency.
- Financial records.
- Audit consistency.
- Existing data compatibility.

Use isolated databases.

Do not execute destructive test fixtures against `backend/dev.db`.

## 13.3 API Testing

Verify:

- DTO validation.
- Authentication requirements.
- Authorization.
- Guest ownership.
- Role restrictions.
- Conflict responses.
- Expiration handling.
- Payment verification.
- Safe error messages.
- Super Admin financial-review access.

## 13.4 End-to-End Testing

### Guest Booking Journey

1. Register account.
2. Verify email.
3. Sign in.
4. Search rooms.
5. Select rental duration.
6. Review backend price.
7. Create reservation.
8. Complete PayMongo test checkout or choose Pay at Property.
9. View authoritative booking status.
10. Review reservation details.

### Reception Journey

1. Sign in.
2. Review arrivals.
3. Confirm applicable pending bookings.
4. Record contact history.
5. Assign eligible rooms.
6. Complete check-in.
7. Record property transactions.
8. Complete checkout.
9. Update room readiness.

### Exceptional Scenarios

- Two guests competing for the last room.
- Payment retry during an active hold.
- Expired reservation.
- Successful payment after expiration.
- Duplicate provider event.
- Overpayment.
- Pay at Property cancellation.
- Unpaid no-show.
- Paid late arrival.
- Late checkout.
- Damage-charge approval.
- Deposit deduction.
- Unauthorized staff action.
- Repeated failed login attempts.

## 13.5 Accessibility Testing

Verify:

- Keyboard-only operation.
- Focus order.
- Form labeling.
- Error announcements.
- Dialog accessibility.
- Contrast.
- Responsive behavior.
- Screen-reader compatibility.

## 13.6 Verification Responsibility

Follow `IMPLEMENTATION_GUIDE.md` and the latest `AGENTS.md` execution boundaries.

Owner-reported tests must be distinguished from independently observed tests.

Do not claim test success without evidence.

---

# 14. Deployment and Packaging

## 14.1 Deployment Target

Local prototype.

Components:

- Guest React frontend.
- Admin React frontend.
- NestJS API.
- SQLite.
- PayMongo test integration.
- Email test configuration.

## 14.2 Local Configuration

The latest documented startup baseline identifies:

| Component | Recorded Development Setting |
|---|---|
| Backend | Port 3000 |
| Guest web | Port 5175 |
| Admin web | Port 5176 |
| API base | `http://localhost:3000/api` |
| Database | `backend/dev.db` |

These are recorded configuration details, not proof of current running process values.

Verify actual environment settings before testing.

## 14.3 Environment Variables

Externalize:

- Database URL.
- Server port.
- Allowed frontend origins.
- JWT secrets.
- Email configuration.
- PayMongo test keys.
- Webhook signing secret.
- Approved encryption keys.

Do not commit secrets.

Do not expose backend-only configuration through frontend builds.

## 14.4 PayMongo Local Testing

A secure provider-accessible webhook test arrangement must be established before validating end-to-end payment delivery.

Verify:

- Original request-body signature validation.
- Correct event association.
- Test-mode identification.
- Duplicate-event handling.
- Delayed webhook processing.
- Payment reconciliation.

Do not infer success from the return URL.

## 14.5 Build Packaging

Preserve the existing independent application build process.

The local package should include:

- Approved source revision.
- Package manifests and lockfiles.
- Prisma migration source.
- Safe environment templates.
- Installation instructions.
- Local startup instructions.
- Test instructions.
- Synthetic demo-data procedure.
- Known limitations.

Exclude:

- Credentials.
- Private production data.
- Real guest records.
- Payment secrets.
- Local database contents unless explicitly approved.
- Generated sensitive logs.

## 14.6 Backup and Recovery

Before approved database changes:

1. Confirm the target database path.
2. Create a consistent backup.
3. Validate backup integrity.
4. Verify restore on a disposable database.
5. Review migration SQL.
6. Apply only the authorized migration.
7. Confirm data preservation.

Do not reset development databases.

## 14.7 Future Production Deployment

Out of current scope.

Future requirements include:

- PostgreSQL migration.
- HTTPS configuration.
- Durable image storage.
- Hosted webhook delivery.
- Secrets management.
- Operational monitoring.
- Backups and recovery.
- Security acceptance.
- Deployment rollback procedures.

No production hosting provider is selected by this plan.

---

# 15. Assumptions and Constraints

## 15.1 Confirmed Constraints

- One property.
- Existing React/Vite/NestJS stack.
- Modular monolith.
- SQLite development database.
- Shared REST API.
- PayMongo test mode.
- Five proposed roles.
- Required guest verification for new bookings.
- Four rental durations.
- Two-hour online holds.
- Multiple eligible payment attempts.
- First staff confirmation starts cancellation eligibility.
- No voluntary cancellation of verified paid reservations.
- Super Admin financial exception approvals.
- Thirty-minute late-checkout grace period.
- Optional deposits.
- NFC postponed.
- Local prototype only.

## 15.2 Remaining Decisions

The following remain unresolved or require precise implementation review:

1. Exact nightly checkout time.
2. Weekly/monthly departure-time consistency.
3. Partial-hour late-checkout rounding.
4. Actual property rental rates.
5. Same-day contact workflow.
6. Final lockout escalation behavior.
7. Discount authorization.
8. Payment reconciliation settlement procedures.
9. Sensitive fields requiring encryption.
10. Historical accountless booking compatibility.
11. Final API contract extensions.
12. Final database model changes.

Do not silently create defaults for these decisions.

## 15.3 Out of Scope

- Multi-property management.
- Real NFC hardware integration.
- NFC card issuance.
- Door unlocking.
- Native mobile applications.
- Loyalty programs.
- Dynamic pricing.
- Additional payment providers.
- AI-powered booking recommendations.
- Predictive analytics.
- Microservices.
- Kubernetes.
- Production deployment.

---

# 16. Acceptance and Development Governance

## 16.1 Before Implementation

For every task:

1. Review relevant Markdown documents.
2. Inspect existing source code.
3. Identify the affected files.
4. Explain the proposed modification.
5. Explain risks.
6. Obtain task-specific approval.
7. Require the exact authorization keyword `EggPie`.

## 16.2 During Implementation

- Preserve existing behavior.
- Follow approved architecture.
- Avoid unrelated edits.
- Do not introduce unapproved dependencies.
- Do not alter unrelated schema objects.
- Respect owner-run testing responsibilities.
- Record implementation status accurately.

## 16.3 After Implementation

Provide:

- Exact changed-file paths.
- Summary of behavior changes.
- Verification steps.
- Expected results.
- Independently verified results, if any.
- Known issues.
- Next recommended task.

Stop before advancing into the next unapproved task.

## 16.4 Documentation Control

This document is a proposed replacement for the existing technical plan.

Architecture v2.1 remains authoritative until an approved revision is adopted.

Do not modify `spec.md`.

Do not update project documentation automatically.

---

# 17. Final System Acceptance Criteria

NEXORA's revised local prototype is ready for final acceptance when:

- Approved reservation rules operate correctly.
- Hourly, nightly, weekly, and monthly rentals are supported.
- Room inventory is protected against double booking.
- Guest registration and email verification are enforced.
- The five-role authorization model is verified.
- PayMongo test payments use trusted backend confirmation.
- Duplicate and late payments follow financial review rules.
- Pay at Property workflows operate according to approved confirmation policies.
- Cancellation and no-show behavior is enforced.
- Staff can complete authorized reception workflows.
- Damage charges and deposits retain accurate financial history.
- The Guest Website and Admin Dashboard remain accessible and responsive.
- Critical unit, integration, and end-to-end checks pass.
- Existing data and completed functionality remain preserved.
- NFC remains explicitly postponed.
- Local prototype startup and operation are verified.
- The owner approves the completed system.

---

# 18. Document Status

**Status:** Owner-approved planning document. Architecture reconciliation remains required.

**Implementation:** Not authorized.

**Database migration:** Not authorized.

**Production deployment:** Deferred.

**Recommended next step:** Reconcile the proposed requirements with Architecture v2.1 and approve Phase 0 source review before any implementation changes.
