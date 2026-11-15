# NEXORA — SYSTEM_DESIGN.md

**Version:** Proposed 3.0  
**Date:** 2026-11-15  
**Status:** REVIEW DRAFT. Owner approval required before replacing the existing `SYSTEM_DESIGN.md`.  
**Architecture authority:** `NEXORA_ARCHITECTURE_V2.1.md` until an approved revision is adopted.  
**Planning reference:** Owner-approved `TECHNICAL_PLAN_APPROVED.md`.  
**Scope:** One-property local prototype, existing modular monolith.

## 1. Purpose and evidence boundary

This document specifies the proposed target domain system while preserving the existing NEXORA source of truth. According to the latest owner-confirmed `AGENTS.md`, original phases 1–8 and 10 are completed, NFC phase 9 is postponed, testing/security phase 11 is paused/incomplete, and production deployment phase 12 is deferred. These are owner-confirmed checkpoints, not new verification results. The original `SYSTEM_DESIGN.md`, `BUSINESS_FLOWS.md` and sections of `DATABASE_SCHEMA.md` contain earlier checkpoints, including optional-account requirements that conflict with newer owner-approved target rules.

**Classification:** `[EXISTING]` is documented as present, `[TARGET]` is owner-approved for the revised prototype but not asserted implemented, `[PROPOSED]` is a design choice pending schema/contract review, `[OPEN]` needs owner decision. The live `backend/prisma/schema.prisma` was not included among uploaded files, so this is a *documentation-derived logical schema*, not a source-verified SQL DDL export. Column nullability and types below are based on `DATABASE_SCHEMA.md` and typed interpretations. Values marked `UNVERIFIED` must not be treated as exact Prisma declarations. Index labels reproduce documented guarantees, not independently inspected migration SQL.

## 2. Real-world business workflow versus target digitized flow

| Operating activity | Real-world/manual practice being digitized (domain model, not verified observation) | NEXORA target workflow | Key control |
|---|---|---|---|
| Guest inquiry | Guest calls or visits to ask about categories, price and open dates | Guest searches category, period, occupants and availability | Backend quote and inventory validation |
| Guest identity | Staff records contact details and verifies identity at arrival | Guest registers, verifies email before new booking; staff verifies at check-in | Identity and ownership checks |
| Booking | Staff notes desired accommodation and dates | Backend creates category reservation and holds inventory | Serialized, transaction-safe acquisition |
| Online collection | Guest makes payment and requests confirmation | PayMongo TEST Hosted Checkout, signed provider evidence, backend confirmation | Redirect alone proves nothing |
| Pay at Property | Staff contacts guest and confirms intent | Pending request, first staff confirmation, fixed five-hour cancellation window | Immutable first-confirmed time |
| Pre-arrival follow-up | Reception calls guest before stay | Staff contact tasks one week prior, one day prior, or shortly after short-notice booking | Contact history, no resetting cancellation |
| Arrival | Reception identifies guest and finds available physical room | Staff assigns eligible Room, records actual arrival and checks in | Assignment/readiness/financial gates |
| Stay services | Staff handles extra people, damages and extension requests | Backend charges, staff evidence, Manager+ approval | No unilateral receptionist charge approval |
| Departure | Staff checks room and returns deposits | Check-out, 30-minute grace, eligible hourly fee, settlement and housekeeping | No conflict with next confirmed reservation |
| No-show | Staff checks whether guest arrived | Unpaid one-hour-late cancellation; paid guest keeps departure commitment | Separate paid/unpaid policies |
| Financial dispute | Staff reconciles duplicate or late payments | Super Admin-reviewed financial correction with audit trail | No voluntary paid cancellation refund |
| Operations/reporting | Staff tracks arrivals, rooms, unpaid bills and calls | Role-aware dashboard and backend-derived reporting | Shared definitions, audit evidence |
| Door access | Staff issues physical credentials if hardware exists | NFC marked postponed placeholder, no issuance/unlock | No fabricated device operation |

### 2.1 Target guest lifecycle

1. Guest registers and verifies email before initiating a new booking. Existing accountless historical records remain intact and require secure access continuity.
2. Guest selects `RoomType`, not a physical room, plus rental duration, intervals, and occupant count.
3. Backend validates the complete interval, rate and capacity, then atomically acquires suitable category inventory.
4. For online payment, an inventory hold lasts **two hours** from backend-created hold start. Retry attempts do not extend the hold. There is no required visible application countdown and no one-retry cap.
5. Only verified PayMongo provider evidence confirms an eligible paid booking. Pending/late/unknown payment results remain accurately recorded for reconciliation.
6. After expiration, an old reservation cannot be revived automatically. A new reservation requires a fresh availability check.
7. For Pay at Property, authorized staff first confirms the request. **Only this first confirmation** starts the five-hour eligible cancellation period; future calls do not reset it.
8. Staff manages arrival, room assignment, payment obligations, checkout, charges, cleaning and optional deposits.

### 2.2 Real-world timing policy

| Rule | Target behavior | Open detail |
|---|---|---|
| Hourly | At least one hour; permitted occupancy interval 3:00 PM–11:00 PM; no overnight hourly rental | Rate amounts |
| Nightly | Check-in from 3:00 PM; departure on scheduled date | Exact checkout time |
| Weekly | Seven complete days, owner example 3:00 PM to 3:00 PM seven days later | Reconcile any standard overnight checkout conflict |
| Monthly | Thirty complete days | Exact checkout clock time |
| Early arrival | Receptionist approval for up to 30 minutes before 3:00 PM, subject to readiness | None of this grants overlapping occupancy |
| Late checkout | Fixed 30-minute grace, then category hourly charge if extension is permissible | Billing partial hours |
| Unpaid late arrival | Cancel at one hour late under no-show policy | Precise trigger for uncertain payment/confirmation states |
| Paid late arrival | Record actual arrival but preserve scheduled departure | Identity and staff-arrival steps |

## 3. Technology and domain boundaries

| Layer | Existing technology / target role |
|---|---|
| Guest Web | React JavaScript/JSX, Vite, React Router, Axios, plain CSS, Lucide React |
| Admin Web | Same frontend stack, separate role-aware app |
| API | NestJS with Express, TypeScript, shared REST API |
| Auth | Passport/JWT, Argon2id password hashes, rotating refresh tokens |
| Business | Feature-oriented NestJS modules, dependency injection, explicit policies |
| Database | Prisma, SQLite for development; PostgreSQL later only by approval |
| PayMongo | Hosted Checkout, signed test webhooks, durable deduplication/reconciliation |
| Email | Existing backend email/SMTP integration; messages after commit |
| NFC | Existing schema boundary, feature postponed |

Frontend handles forms, navigation, accessible feedback and API-derived presentation. Backend exclusively decides prices, availability, authorization, payments and state transitions. No new state library, microservice, payment provider or framework is approved.

## 4. Complete documented baseline schema

### 4.1 Legend and scope

- `String`, `Int`, `Boolean`, `DateTime` and named enums are **logical Prisma-style types** inferred from the published schema descriptions, except fields explicitly documented with types. `!` means documented required or expected non-null. `?` means documented nullable. Verify all final exact modifiers and defaults in the current Prisma source.
- `PK` denotes primary key; `U(...)` documented unique; `I(...)` documented ordinary index. Additional implicit SQLite indexes, FK implementation details, column widths and generated defaults are **not verified here**.
- FK target arrows identify documented relationships, generally restrictive deletes as described in `DATABASE_SCHEMA.md`. The exact nullable-FK referential action must be rechecked before migrations.
- The source reports **27 models** and six migration sources after Phase 7.2. Phase 7.3 uses existing PaymentEvent columns.

### 4.2 Identity entities

#### Role

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `name` | `String!` |  |
| `description` | `String?` |  |
| `createdAt` | `DateTime!` |  |
| `updatedAt` | `DateTime!` |  |

**Foreign keys:** none.  
**Documented keys/indexes:** `U(name); PK(id)`.

#### User

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `roleId` | `String!` | Foreign key |
| `name` | `String!` |  |
| `email` | `String!` |  |
| `passwordHash` | `String!` |  |
| `status` | `UserStatus!` |  |
| `createdAt` | `DateTime!` |  |
| `updatedAt` | `DateTime!` |  |

**Foreign keys:** roleId→Role.id.  
**Documented keys/indexes:** `U(email); PK(id); FK role index to verify`.

#### RefreshToken

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `userId` | `String!` | Foreign key |
| `familyId` | `String?` |  |
| `tokenHash` | `String!` |  |
| `expiresAt` | `DateTime!` |  |
| `revokedAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** userId→User.id.  
**Documented keys/indexes:** `U(tokenHash); I(familyId); PK(id); FK lookup to verify`.

#### EmailVerificationToken

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `userId` | `String!` | Foreign key |
| `tokenHash` | `String!` |  |
| `expiresAt` | `DateTime!` |  |
| `usedAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** userId→User.id.  
**Documented keys/indexes:** `U(tokenHash); I(userId); I(expiresAt); PK(id)`.

#### Guest

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `userId` | `String?` | Foreign key |
| `firstName` | `String!` |  |
| `lastName` | `String!` |  |
| `email` | `String?` |  |
| `phone` | `String?` |  |
| `createdAt` | `DateTime!` |  |
| `updatedAt` | `DateTime!` |  |

**Foreign keys:** userId→User.id.  
**Documented keys/indexes:** `U(userId nullable); PK(id)`.

### 4.3 Property entities

#### Property

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `name` | `String!` |  |
| `address` | `String!` |  |
| `city` | `String!` |  |
| `province` | `String!` |  |
| `country` | `String!` |  |
| `contact fields` | `UNVERIFIED` |  |

**Foreign keys:** none.  
**Documented keys/indexes:** `PK(id); single-property enforced by service, not guaranteed by PK`.

#### RoomType

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `propertyId` | `String!` | Foreign key |
| `name` | `String!` |  |
| `capacity` | `Int!` |  |
| `baseRateCentavos` | `Int!` |  |
| `isActive` | `Boolean!` |  |

**Foreign keys:** propertyId→Property.id.  
**Documented keys/indexes:** `U(propertyId,name); PK(id)`.

#### Room

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `roomTypeId` | `String!` | Foreign key |
| `roomNumber` | `String!` |  |
| `floor` | `UNVERIFIED?` |  |
| `status` | `RoomStatus!` |  |
| `isActive` | `Boolean!` |  |

**Foreign keys:** roomTypeId→RoomType.id.  
**Documented keys/indexes:** `U(roomNumber); PK(id)`.

#### Amenity

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `name` | `String!` |  |
| `description` | `String?` |  |

**Foreign keys:** none.  
**Documented keys/indexes:** `U(name); PK(id)`.

#### RoomTypeAmenity

| Column | Logical type | Key / description |
|---|---|---|
| `roomTypeId` | `String!` | Foreign key |
| `amenityId` | `String!` | Foreign key |

**Foreign keys:** roomTypeId→RoomType.id; amenityId→Amenity.id.  
**Documented keys/indexes:** `PK(roomTypeId,amenityId)`.

#### RoomImage

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `roomTypeId` | `String!` | Foreign key |
| `filePath` | `String!` |  |
| `altText` | `String?` |  |
| `displayOrder` | `Int!` |  |
| `isPrimary` | `Boolean!` |  |

**Foreign keys:** roomTypeId→RoomType.id.  
**Documented keys/indexes:** `PK(id); display ordering service-enforced; other indexes verify`.

### 4.4 Reservations entities

#### Reservation

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `reservationNumber` | `String!` |  |
| `guestId` | `String!` | Foreign key |
| `roomTypeId` | `String!` | Foreign key |
| `checkInDate` | `DateTime!` |  |
| `checkOutDate` | `DateTime!` |  |
| `guestCount` | `Int!` |  |
| `nightlyRateCentavos` | `Int!` |  |
| `totalAmountCentavos` | `Int!` |  |
| `status` | `ReservationStatus!` |  |
| `holdExpiresAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |
| `updatedAt` | `DateTime!` |  |

**Foreign keys:** guestId→Guest.id; roomTypeId→RoomType.id.  
**Documented keys/indexes:** `U(reservationNumber); I(guestId); I(roomTypeId,checkInDate,checkOutDate); I(status,holdExpiresAt)`.

#### ReservationAccessToken

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `reservationId` | `String!` | Foreign key |
| `tokenHash` | `String!` |  |
| `expiresAt` | `DateTime!` |  |
| `usedAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** reservationId→Reservation.id.  
**Documented keys/indexes:** `U(tokenHash); I(reservationId,createdAt); I(expiresAt)`.

#### ReservationAccessSession

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `reservationId` | `String!` | Foreign key |
| `tokenHash` | `String!` |  |
| `expiresAt` | `DateTime!` |  |
| `revokedAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** reservationId→Reservation.id.  
**Documented keys/indexes:** `U(tokenHash); I(reservationId); I(expiresAt)`.

#### ReservationGuest

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `reservationId` | `String!` | Foreign key |
| `firstName` | `String!` |  |
| `lastName` | `String!` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** reservationId→Reservation.id.  
**Documented keys/indexes:** `I(reservationId); PK(id); no reservationId/guestId unique pair`.

#### RoomAssignment

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `reservationId` | `String!` | Foreign key |
| `roomId` | `String!` | Foreign key |
| `assignedAt` | `DateTime!` |  |
| `releasedAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** reservationId→Reservation.id; roomId→Room.id.  
**Documented keys/indexes:** `I(reservationId); I(roomId); PK(id); interval overlap service-enforced`.

#### RoomBlock

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `roomId` | `String!` | Foreign key |
| `startDate` | `DateTime!` |  |
| `endDate` | `DateTime!` |  |
| `reason` | `String!` |  |
| `canceledAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |
| `updatedAt` | `DateTime!` |  |

**Foreign keys:** roomId→Room.id.  
**Documented keys/indexes:** `I(roomId,startDate,endDate); PK(id); no database exclusion constraint`.

### 4.5 Payments entities

#### Payment

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `reservationId` | `String!` | Foreign key |
| `method` | `PaymentMethod!` |  |
| `status` | `PaymentStatus!` |  |
| `amountCentavos` | `Int!` |  |
| `currency` | `String!` |  |
| `provider` | `String?` |  |
| `providerCheckoutId` | `String?` |  |
| `providerPaymentId` | `String?` |  |
| `referenceNumber` | `String?` |  |
| `paidAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |
| `updatedAt` | `DateTime!` |  |
| `checkoutRequestKeyHash` | `String?` |  |
| `checkoutRequestFingerprint` | `String?` |  |
| `checkoutState` | `PaymentCheckoutState?` |  |
| `checkoutUrl` | `String?` |  |

**Foreign keys:** reservationId→Reservation.id.  
**Documented keys/indexes:** `U(providerCheckoutId nullable); U(providerPaymentId nullable); U(checkoutRequestKeyHash nullable); I(reservationId); I(status); I(method,createdAt)`.

#### PaymentEvent

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `paymentId` | `String?` | Foreign key |
| `providerEventId` | `String!` |  |
| `eventType` | `String!` |  |
| `providerCreatedAt` | `DateTime?` |  |
| `status` | `PaymentEventStatus!` |  |
| `signatureVerified` | `Boolean!` |  |
| `payloadJson` | `String?` |  |
| `processedAt` | `DateTime?` |  |
| `errorMessage` | `String?` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** paymentId→Payment.id.  
**Documented keys/indexes:** `U(providerEventId); I(paymentId); I(status,createdAt); I(eventType)`.

#### Refund

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `paymentId` | `String!` | Foreign key |
| `amountCentavos` | `Int!` |  |
| `reason` | `String!` |  |
| `status` | `RefundStatus!` |  |
| `providerRefundId` | `String?` |  |
| `processedByUserId` | `String?` | Foreign key |
| `requestedAt` | `DateTime!` |  |
| `completedAt` | `DateTime?` |  |
| `updatedAt` | `DateTime!` |  |

**Foreign keys:** paymentId→Payment.id; processedByUserId→User.id.  
**Documented keys/indexes:** `U(providerRefundId nullable); I(paymentId); I(status); I(processedByUserId)`.

### 4.6 Deferred NFC entities

#### NfcCard

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `cardIdentifier` | `String!` |  |
| `status` | `NfcCardStatus!` |  |
| `label` | `String?` |  |
| `registeredAt` | `DateTime!` |  |
| `updatedAt` | `DateTime!` |  |

**Foreign keys:** none.  
**Documented keys/indexes:** `U(cardIdentifier); I(status)`.

#### NfcCredential

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `cardId` | `String!` | Foreign key |
| `credentialReference` | `String!` |  |
| `status` | `NfcCredentialStatus!` |  |
| `issuedAt` | `DateTime!` |  |
| `revokedAt` | `DateTime?` |  |
| `expiresAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** cardId→NfcCard.id.  
**Documented keys/indexes:** `U(credentialReference); I(cardId); I(status); I(expiresAt)`.

#### CardAssignment

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `credentialId` | `String!` | Foreign key |
| `reservationId` | `String?` | Foreign key |
| `roomId` | `String!` | Foreign key |
| `validFrom` | `DateTime!` |  |
| `validUntil` | `DateTime!` |  |
| `revokedAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** credentialId→NfcCredential.id; reservationId→Reservation.id; roomId→Room.id.  
**Documented keys/indexes:** `I(credentialId); I(reservationId); I(roomId); I(validFrom,validUntil) (exact index composition to verify)`.

#### DoorDevice

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `roomId` | `String!` | Foreign key |
| `deviceIdentifier` | `String!` |  |
| `name` | `String?` |  |
| `status` | `DoorDeviceStatus!` |  |
| `lastSeenAt` | `DateTime?` |  |
| `createdAt` | `DateTime!` |  |
| `updatedAt` | `DateTime!` |  |

**Foreign keys:** roomId→Room.id.  
**Documented keys/indexes:** `U(roomId); U(deviceIdentifier); I(status)`.

#### AccessLog

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `credentialId` | `String?` | Foreign key |
| `doorDeviceId` | `String!` | Foreign key |
| `result` | `AccessResult!` |  |
| `occurredAt` | `DateTime!` |  |
| `source` | `String!` |  |
| `reason` | `String?` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** credentialId→NfcCredential.id; doorDeviceId→DoorDevice.id.  
**Documented keys/indexes:** `I(credentialId); I(doorDeviceId,occurredAt); I(result,occurredAt)`.

### 4.7 Administration entities

#### AuditLog

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `actorUserId` | `String?` | Foreign key |
| `action` | `String!` |  |
| `entityType` | `String!` |  |
| `entityId` | `String?` |  |
| `detailsJson` | `String?` |  |
| `createdAt` | `DateTime!` |  |

**Foreign keys:** actorUserId→User.id.  
**Documented keys/indexes:** `I(actorUserId); I(entityType,entityId); I(createdAt)`.

#### SystemSetting

| Column | Logical type | Key / description |
|---|---|---|
| `id` | `String!` | Primary key |
| `key` | `String!` |  |
| `value` | `String!` |  |
| `description` | `String?` |  |
| `updatedByUserId` | `String?` | Foreign key |
| `createdAt` | `DateTime!` |  |
| `updatedAt` | `DateTime!` |  |

**Foreign keys:** updatedByUserId→User.id.  
**Documented keys/indexes:** `U(key); I(updatedByUserId)`.

### 4.8 Documented enumerations

| Enum | Documented values |
|---|---|
| UserStatus | `PENDING`, `ACTIVE`, `DISABLED` |
| RoomStatus | `READY`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`, `OUT_OF_SERVICE` |
| ReservationStatus | `PENDING`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`, `EXPIRED` |
| PaymentMethod | `PAYMONGO`, `PAY_AT_PROPERTY` |
| PaymentStatus | `UNPAID`, `PENDING`, `PARTIALLY_PAID`, `PAID`, `FAILED`, `PARTIALLY_REFUNDED`, `REFUNDED` |
| PaymentCheckoutState | `CREATING`, `READY`, `UNKNOWN` |
| PaymentEventStatus | `RECEIVED`, `PROCESSED`, `IGNORED`, `FAILED` |
| RefundStatus | `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED` |
| NfcCardStatus | `AVAILABLE`, `ASSIGNED`, `LOST`, `DISABLED` |
| NfcCredentialStatus | `INACTIVE`, `ACTIVE`, `REVOKED`, `EXPIRED` |
| DoorDeviceStatus | `REGISTERED`, `ACTIVE`, `OFFLINE`, `DISABLED` |
| AccessResult | `GRANTED`, `DENIED`, `ERROR` |

### 4.9 Baseline source limitations

1. `Property` contact field names and exact types are not listed in the accessible summary; do not invent them.
2. `Room.floor` is documented as optional but the exact database type is not explicit in the retrieved source; verify.
3. Some individual `RoomType` / `RoomImage` fields mentioned in older plans are descriptive, not independently established as columns.
4. `schema.prisma` and actual migration SQL were not uploaded. **A production-ready exact DDL or every physical index cannot be certified from the available files.** Phase 0 must produce a source-derived schema inventory before any migration.
5. Prior `SYSTEM_DESIGN.md` and `BUSINESS_FLOWS.md` contain stale status and policy text. Use current `AGENTS.md` for checkpoint and owner-approved technical plan for target policy, while requiring formal architecture adoption.

## 5. Target schema extension proposals (NOT EXISTING)

These are candidate logical definitions from `TECHNICAL_PLAN_APPROVED.md`. Do not treat them as registered Prisma models, routes or performed migrations.

| Model or extension | Proposed columns and logical types | Proposed FK / indexing consideration |
|---|---|---|
| `RentalRate` [new] | `id String PK`, `roomTypeId String`, `rentalType Enum`, `rateCentavos Int`, `isActive Boolean`, `createdAt DateTime`, `updatedAt DateTime` | FK RoomType; define uniqueness/effective rate history before writing |
| `RoomType` [extend] | `includedOccupancy Int`, `maxOccupancy Int`, `extraPersonFeeCentavos Int` | Validate 1 ≤ included ≤ max; service and migration compatibility |
| `Reservation` [extend] | `rentalType Enum`, `scheduledArrivalAt DateTime`, `scheduledDepartureAt DateTime`, `actualArrivalAt DateTime?`, `actualDepartureAt DateTime?`, `firstConfirmedAt DateTime?`, `cancellationDeadlineAt DateTime?`, `expectedArrivalAt DateTime?`, `confirmedByUserId String?` | Preserve existing date-label columns and `holdExpiresAt`; optional User FK requires design review; indexes on stay range/status after query analysis |
| `ReservationContact` [new] | `id String PK`, `reservationId String`, `staffUserId String`, `contactType Enum`, `contactResult Enum`, `expectedArrivalAt DateTime?`, `notes String?`, `contactedAt DateTime` | FKs Reservation/User; index reservation/time, staff/time |
| `ReservationCharge` [new] | `id String PK`, `reservationId String`, `chargeType Enum`, `description String`, `amountCentavos Int`, `status Enum`, `recordedByUserId String`, `approvedByUserId String?`, `createdAt DateTime`, `approvedAt DateTime?` | FKs Reservation/User; index reservation/status; prevent duplicate charge attempts |
| `SecurityDeposit` [new] | `id String PK`, `reservationId String`, `amountCentavos Int`, `retainedCentavos Int`, `returnedCentavos Int`, `status Enum`, `collectedByUserId String`, `returnedByUserId String?`, `collectedAt DateTime`, `returnedAt DateTime?` | FKs Reservation/User; require append-only movements or equivalent reconciliable history before approval |
| `User` security [extend or new model] | `failedLoginCount Int`, `lockoutLevel Int`, `lockedUntil DateTime?`, `lastFailedLoginAt DateTime?`, `mustChangePassword Boolean` | Index eligibility and atomic update design; never log secrets |
| `FinancialReview` [new] | `id String PK`, `reservationId String?`, `paymentId String?`, `reason Enum`, `status Enum`, `findings String?`, `reviewedByUserId String?`, `createdAt DateTime`, `resolvedAt DateTime?` | FKs Reservation/Payment/User; verify whether existing Payment/Refund/AuditLog suffice |
| `NotificationDelivery` [new] | `id String PK`, `reservationId String?`, `recipient String`, `templateKey String`, `status Enum`, `scheduledAt DateTime`, `sentAt DateTime?`, `failureCode String?`, `createdAt DateTime` | FK Reservation; index due/status; no raw secrets |

**Status note:** Five-role access (including Super Admin), guest verification required for *new* bookings, and hourly/weekly/monthly pricing all require explicit source and migration review. Preserve historical accountless bookings and old nightly price snapshots. Do not add tables simply because they are named above.

## 6. Business rules, invariants and edge cases

| Domain | Invariant / policy | Conflict and edge-case response |
|---|---|---|
| Single property | A room category belongs to the one configured property | Reject cross-property data, never generalize to multitenancy |
| Guest identity | New booking requires registered, verified identity [TARGET] | Retain historical Guest rows lacking User; never attach by matching email alone |
| Room category vs Room | Guest books RoomType; staff assigns Room | Keep operational status separate from date/time availability |
| Whole-stay inventory | One feasible physical room must cover the requested interval | Per-night positive counts alone are insufficient; block, assignment and existing stay conflicts checked transactionally |
| Interval overlap | Two intervals overlap iff A.start < B.end AND A.end > B.start | Arrival-inclusive/departure-exclusive; protect adjacent stays and room-turnover rules |
| Price | Backend controls rate, occupancy surcharge and immutable accepted total | Existing snapshots survive rate changes; all money integer PHP centavos |
| Hourly | Minimum 1h, within 15:00–23:00, no overnight | Reject dates spanning midnight or end after 23:00 |
| Weekly/monthly | 7 / 30 complete days | Don't confuse a 30-day rental with calendar month |
| Capacity | Minimum 1, category included and maximum counts | Reject over maximum; charge additional occupants only beyond included threshold |
| Hold | Two-hour backend inventory hold | Retry cannot reset hold; allow repeated eligible retries, no visible countdown required |
| Hold expiration | Expired booking not automatically restored | Verify/reconcile provider state, release inventory when safe, create fresh reservation if available |
| Payment verification | Signed provider evidence must match payment/booking/amount/currency/test mode | Ignore redirect-only success; deduplicate webhook by provider event and payment identifiers |
| Uncertain provider state | Not equal to verified failure | Preserve UNKNOWN and reconciliation flag, prevent unsupported double collection |
| Duplicate/late capture | Super Admin reviews financial exception | Refund/correction separate from voluntary booking cancellation, audit result |
| Pay at Property | Staff initial confirmation starts five-hour cancellation window | Reconfirmation calls never reset initial timestamp |
| Cancellation | Eligible unpaid cancellation only; paid voluntary cancellation disabled | Retain historical status and payment records |
| Contact | Around 7 days and 1 day before arrival; short-notice contact soon after booking | Failed/unanswered calls recorded; don't silently confirm guest |
| Unpaid no-show | One hour late under approved policy | Reconcile payment uncertainty before cancellation and release |
| Paid late arrival | Do not auto-extend original booked departure | Record real arrival, maintain availability for next booking |
| Early check-in | Receptionist can approve 30 minutes early | Require room READY and no overlap |
| Late check-out | 30-minute grace; hourly charge if extension permitted | Reject extension conflicting with incoming booking; partial-hour rule still OPEN |
| Damage | Staff records, Manager/Admin/Super Admin approves | Separate maker/checker, preserve evidence and approval history |
| Security deposit | Optional collection, deductions, return tracked | Deposit return distinct from cancellation refund; no double settlement |
| Auth lockout | Fifth failure 1 min; next 5 min; next 15 min; next 30 min | Reset on success or after one hour without failures; concurrency safe; later escalation OPEN |
| RBAC | Five target roles; backend least privilege; Super Admin audit/financial approvals | UI hiding is not authorization; guest ownership always checked |
| Housekeeping | Checkout changes operational readiness to CLEANING | No NFC issuance; existing NFC entity storage left intact |

### 6.1 Explicit reservation/payment state separation

Reservation status is independent of individual Payment status and derived booking-level paid/balance state. A successful PayMongo payment recorded after a booking expires must never silently set the reservation to CONFIRMED. Pending provider sessions, completed receipts, failed attempts, pending refunds, and accepted corrections require distinct representations. Audit state transitions atomically with their local writes.

### 6.2 Reservation and payment collision sequence

1. Create a pending reservation and inventory hold in one bounded database transaction.
2. Record payment intent and request key. Provider session creation is external and **outside** the SQL transaction.
3. Confirm only after verified evidence and eligibility check, using idempotent payment-event handling.
4. At two hours, distinguish proved unpaid/failed from provider UNKNOWN/late-capture. The hold does not become permanent merely because a provider event is delayed. Use a designated reconciliation state or review queue without claiming inventory unavailable forever.
5. For an expired booking, release/expire inventory under an approved atomic policy. If a late payment arrives, record verified receipt, keep reservation expired, flag review, and prevent double bookings.
6. Rebooking after expiry creates a new reservation under current availability. Never reactivate by simply changing EXPIRED to CONFIRMED.

**Open design tradeoff:** The exact provider UNKNOWN timeout and financial remedy is not yet specified. Do not assume a completed PayMongo refund operation simply because a local refund row is created.

## 7. Security, ACID and least-privilege mapping

### 7.1 Transaction consistency mapping

| Operation | Atomic local changes | Concurrent/race risk | External effect and recovery |
|---|---|---|---|
| Registration | User, Guest, verification hash | Duplicate email and competing registrations | SMTP after commit; resend on failure |
| Login/refresh | Consume/rotate token family, update account lock | Concurrent refresh or brute force | No external irreversible effect |
| Reservation hold | Eligibility read, hold/write, price snapshot, audit | Two buyers last room, overlapping date blocks | Retry transient DB conflict safely |
| Assignment | Validate Room/blocks/booking, assignment history, audit | Double assignment or status race | Preserve previous assignment |
| Expiration/cancel | Change status, remove hold effect, release applicable assignment, audit | Provider payment completes simultaneously | Payment reconciliation outside SQL transaction |
| Payment webhook | Event-ID claim, verified receipt state, review flag, audit | Duplicate/reordered provider webhooks | Provider response idempotent; do not create second receipt |
| Additional charge | Record, approve, update settlement and audit | Double charge or same-actor bypass | Authorized correction retains records |
| Deposit return | Deduction/return transaction history, aggregate reconciliation | Concurrent return and adjustment | External payout after commit and reconciliation |
| Checkout | Validate payment/assignment, record checkout, release room, mark CLEANING, audit | Concurrent extension/next arrival | NFC postponed |

SQLite uses transactional locking appropriate to its local workload; do not assume Postgres-specific isolation or partial indexes are portable. Application-level inventory algorithm and migration semantics must be tested using real Prisma transactions against an isolated test DB. No HTTP call to PayMongo or SMTP belongs inside a database transaction.

### 7.2 Principle of Least Privilege mapping

| Actor | Permitted scope [TARGET] | Prohibited or gated action |
|---|---|---|
| Guest | Own profile/reservations; eligible new booking; allowed unpaid cancellation | Other guest data, staff payment controls, paid voluntary cancellation |
| Receptionist | Authorized reservations, contact, assignment, check-in/out, property payment recording, damage evidence | Rate changes, self-approving damage charges, audit-log viewing |
| Manager | Reception operations plus rates and additional-charge approval | Audit-log viewing, system-wide settings |
| Admin | Staff management within policy, operational and approved rate actions | Super Admin/account removal, audit logs, financial exception final approval |
| Super Admin | System settings, Admin management, financial exceptions, audit-log access | Must still satisfy auditability, business invariants and last-active-Super-Admin protection |
| Payment webhook | Signed, constrained update of related payment/event records only | User-role privileges, arbitrary reservation updates |
| Background expiry task | Expire only eligible reservations, log outcomes | Arbitrarily reverse verified payments or delete history |

The role matrix is a target revision. Current guards explicitly enumerate four existing roles. Discount permissions remain OPEN.

### 7.3 Sensitive data and cryptography

- Retain Argon2id with documented 64 MiB, time cost 3, parallelism 1 for password hashing.
- Preserve trusted JWT audience/issuer/signature and current ACTIVE-user checks. Access tokens: 15 minutes; refresh: 7 days, according to `SECURITY.md`.
- Store only SHA-256 hashed random verification/refresh credentials. Email verification links expire in 30 minutes and are single-use, based on existing security documentation.
- Use AES-256-GCM selectively for specifically approved sensitive fields only; exact fields and key rotation procedure OPEN.
- Keep payment card credentials with PayMongo Hosted Checkout; do not persist card data. Protect hosted checkout URLs, provider secrets, raw request signatures and guest identities.
- Restrict and sanitize audit logs. Super Admin views audit records, but cannot remove or silently rewrite protected financial history.
- Enforce rate limiting, server-side permission checks, DTO validation, ownership rules and secure configuration.

## 8. Unresolved domain questions and decisions table

| ID | Open question | Why it matters | Proposed owner decision point | Blocking area |
|---|---|---|---|---|
| D-01 | What is the exact standard checkout clock time for nightly rentals? | Schedule math, housekeeping, inventory | Set clock time and late-threshold reference | Hourly/overnight scheduling |
| D-02 | Must weekly/monthly departure use matching 3 PM, or standard nightly checkout? | Conflicting interpretations | Specify per rental type | Reservation time modeling |
| D-03 | Is a chargeable 31-minute overstay billed as 1 full hour? What about 61 min? | Rounding and accurate price | Approve rounding schedule | Late checkout charges |
| D-04 | What are actual rates for each category/duration and extra-person fee? | Backend quote correctness | Provide approved rate matrix | Pricing seed and UI |
| D-05 | Same-day Pay at Property guest has no earlier contact window; when must staff confirm? | Inventory and cancellation timing | Define short-notice response deadline | Contact workflow |
| D-06 | What happens after continued failures beyond the 30-minute lock stage? | Auth and denial-of-service tradeoff | Escalation cap or reset policy | Authentication |
| D-07 | Are discounts supported, and who approves them? | RBAC and pricing integrity | Defer or define permission matrix | Rate/charge controls |
| D-08 | How long does unresolved/UNKNOWN PayMongo state remain in review? | Hold expiration vs captured funds | Confirm reconciliation and provider timeout policy | Payments/inventory |
| D-09 | Who performs actual external refund/correction and how is success confirmed? | Ledger truth | Define provider procedure and approval steps | Financial exceptions |
| D-10 | Which guest/staff fields need AES-256-GCM and key rotation? | Query/search and privacy | Approve per-field classification | Security/schema |
| D-11 | What is the migration/access policy for historical accountless guests? | Old bookings and account security | Define verified ownership continuity | Identity/reservation |
| D-12 | What is the exact existing Prisma column type/default/index list? | Accurate migration plan | Source review of `schema.prisma` and migrations | Phase 0 schema verification |
| D-13 | How are split deposits, deductions, partial returns, and failed payouts recorded? | Financial audit/reconciliation | Approve immutable movement model | Deposit implementation |
| D-14 | Are arrival contact reminders emailed, shown on dashboard, or both? | Notification behavior | Define delivery channels and retry policy | Notifications |
| D-15 | Does reception's current READY/CLEANING permission remain approved under five-role RBAC? | Older architecture conflict | Confirm housekeeping exception | Authorization |
| D-16 | What should happen when a late-checkout extension cannot be granted due to a new guest? | Operational fairness | Staff escalation and fee policy | Checkout |
| D-17 | Is any extra-person fee per person per night/hour or per full booking? | Pricing determinism | Define charging basis by rental type | Pricing |

## 9. Scope constraints and operational honesty

- **Existing:** Current source is described by the latest `AGENTS.md` checkpoint; old docs may be stale. No fresh repository tests, database introspection or runtime verification occurred in preparation of this draft.
- **Target:** Single-property, React/Vite guest/admin sites, NestJS REST API, Prisma/SQLite development, PayMongo test mode, five roles, registered verified new guests, four rental durations, two-hour holds and specified cancellation/no-show policies.
- **Deferred:** Production rollout, PostgreSQL migration, extra properties, dynamic pricing, extra gateways, native mobile apps, loyalty, NFC issuance/door control and microservices.
- **Approval boundary:** Proposed new models, fields, indexes, migrations and API contracts require separate review. No code, dependency, migration, or existing Markdown replacement is authorized by this design draft. Implementation remains subject to `EggPie`.

## 10. Source references and revision controls

Source files inspected for this draft: `SYSTEM_DESIGN.md`, `DATABASE_SCHEMA.md`, `BUSINESS_FLOWS.md`, `NEXORA_ARCHITECTURE_V2.1.md`, `SECURITY.md`, `AGENTS.md`, and `TECHNICAL_PLAN_APPROVED.md`. Related authority: `API.md`, `AI_HANDOFF.md`, `DIRECTORY_STRUCTURE.md`, `DEVELOPMENT_RULES.md`, `IMPLEMENTATION_GUIDE.md`.

When revisions are authorized, compare this draft with current `schema.prisma`, existing migration SQL, source routes, and verified tests. Correct any logical type/index discrepancies before adoption. Preserve the old `SYSTEM_DESIGN.md` until the owner approves the precise replacement.
