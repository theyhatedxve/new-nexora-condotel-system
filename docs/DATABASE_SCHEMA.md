# NEXORA — Database Schema Documentation

## 1. Status and Scope

This document describes the target data model.

Master Architecture v2.1 defines 23 core models.
RoomTypeAmenity is a supporting join model, bringing the documented model
set to 24.

Model existence does not mean its database table or business feature
has been implemented.

Exact fields must be reconciled with the current approved Prisma schema.

## 2. Data Conventions

| Concern | Convention |
|---|---|
| Primary keys | Opaque string identifiers; existing project convention uses CUID |
| Property scope | One condotel property |
| Money | Integer centavos |
| Stay dates | Philippine calendar-date semantics |
| Event timestamps | UTC instants |
| Naming | PascalCase models, camelCase fields |
| Relationships | Explicit foreign keys |
| History | Preserve reservation, payment, access, and audit history |
| Changes | Versioned migrations |

Example:

PHP 2,500.00 = 250000 centavos.

Stay dates are arrival-inclusive and departure-exclusive.

For SQLite, UTC-midnight markers may represent date labels.
They must not be converted as though they were actual arrival instants.

## 3. Relationship Overview

```text
Role ──< User ──< RefreshToken
          |
          └── optional Guest link

Property ──< RoomType ──< Room
                 |          |
                 |          ├──< RoomAssignment >── Reservation
                 |          └──< RoomBlock
                 |
                 ├──< RoomImage
                 └──< RoomTypeAmenity >── Amenity

Guest ──< Reservation
Guest ──< ReservationGuest >── Reservation

Reservation ──< Payment ──< Refund
PaymentEvent ── provider-event processing and payment association

NfcCard / NfcCredential
           |
           └──< CardAssignment >── Reservation / Room

Room ── DoorDevice ──< AccessLog

User ──< AuditLog
SystemSetting ── operating configuration
```

Exact NFC cardinalities await hardware and credential-design approval.

## 4. Identity and Guest Models

| Model | Important fields | Constraints / rules |
|---|---|---|
| Role | id, name, description | Unique role name |
| User | id, roleId, name, email, passwordHash, status | Unique normalized email; role relationship |
| RefreshToken | id, userId, tokenHash, expiresAt, revokedAt | Store hash; support rotation and revocation |
| Guest | id, userId?, firstName, lastName, email?, phone? | Optional unique account link |

A Guest may exist without a User.

Do not use email matching alone to attach historical bookings to an account.

## 5. Property and Room Models

| Model | Important fields | Constraints / rules |
|---|---|---|
| Property | id, name, address, city, province, country, contact fields | Single-property invariant |
| RoomType | id, propertyId, name, capacity, baseRateCentavos, isActive | Positive capacity; nonnegative rate |
| Room | id, roomTypeId, roomNumber, floor?, status, isActive | Unique room number |
| Amenity | id, name, description? | Unique amenity name |
| RoomTypeAmenity | roomTypeId, amenityId | Composite primary key |
| RoomImage | id, roomTypeId, filePath, altText?, displayOrder, isPrimary | Validate storage reference and ordering |

Existing room statuses:

- READY.
- OCCUPIED.
- CLEANING.
- MAINTENANCE.
- OUT_OF_SERVICE.

A Room status describes operations.
RoomBlock describes dated inventory exclusion.

## 6. Reservation Models

Approved concepts:

- One primary Guest.
- Reserved RoomType.
- Additional occupants separate from User accounts.
- Physical assignments separate from Reservation.
- Preserved assignment history.
- Temporary hold expiry.
- Rate and total snapshots in centavos.

Field names below follow the reviewed reservation design.
Verify them against the latest approved schema.

### 6.1 Reservation

| Field | Logical type | Purpose |
|---|---|---|
| id | String | Primary key |
| reservationNumber | String | Unique reference |
| primaryGuestId | String | Primary guest |
| roomTypeId | String | Reserved category |
| checkInDate | Date label | First occupied night |
| checkOutDate | Date label | Exclusive stay end |
| guestCount | Integer | Total occupants |
| nightlyRateCentavos | Integer | Agreed nightly rate |
| totalAmountCentavos | Integer | Agreed total |
| status | Enum | Reservation lifecycle |
| holdExpiresAt | Timestamp, optional | Pending hold deadline |
| checkedInAt | Timestamp, optional | Actual check-in |
| checkedOutAt | Timestamp, optional | Actual checkout |
| createdAt / updatedAt | Timestamp | Record history |

Reservation states:

PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT

Additional outcomes:

- CANCELLED.
- EXPIRED.

Allowed transitions require backend enforcement.

### 6.2 ReservationGuest

| Field | Logical type | Purpose |
|---|---|---|
| id | String | Primary key |
| reservationId | String | Reservation relationship |
| guestId | String | Additional occupant |
| createdAt | Timestamp | Creation time |

Constraints:

- Unique reservationId + guestId.
- Do not duplicate the primary guest.
- Occupant counts must fit the approved guest-count policy.

### 6.3 RoomAssignment

| Field | Logical type | Purpose |
|---|---|---|
| id | String | Primary key |
| reservationId | String | Associated stay |
| roomId | String | Physical room |
| startDate / endDate | Date labels | Assignment interval |
| releasedAt | Timestamp, optional | Release/replacement marker |
| createdAt / updatedAt | Timestamp | History |

Preserve old records when rooms change.

The exact treatment of in-stay room transfers requires an approved service
design. A release timestamp must not erase historically occupied dates.

### 6.4 RoomBlock

| Field | Logical type | Purpose |
|---|---|---|
| id | String | Primary key |
| roomId | String | Blocked room |
| type | Enum | Maintenance / out of service |
| startDate / endDate | Date labels | Blocked interval |
| reason | String | Operational explanation |
| cancelledAt | Timestamp, optional | Withdrawal marker |
| createdAt / updatedAt | Timestamp | History |

Do not subtract the same physical room twice when blocks overlap.

## 7. Payment Models

Detailed fields remain proposed until the payment phase is approved.

| Model | Proposed field groups | Essential rules |
|---|---|---|
| Payment | reservationId, amountCentavos, method, state, provider references, timestamps | Trusted amount; preserve payment attempts and collections |
| PaymentEvent | unique providerEventId, eventType, processingState, relevant references, timestamps | Duplicate-safe processing |
| Refund | paymentId, amountCentavos, reason, state, provider reference, timestamps | Refund cannot exceed the remaining refundable amount |

Payment state and reservation state are independent.

Architecture payment states:

- Unpaid.
- Pending.
- Partially Paid.
- Paid.
- Failed.
- Refunded.
- Partially Refunded.

The payment phase must distinguish individual attempt states from the
reservation's aggregate payment summary.

Do not store raw payment-card details.

## 8. NFC Models

Hardware-dependent details remain TBD.

| Model | Purpose |
|---|---|
| NfcCard | Registered card and lifecycle |
| NfcCredential | Secure credential reference and lifecycle |
| CardAssignment | Authorized credential, stay, room, and validity |
| DoorDevice | Selected lock/controller and room association |
| AccessLog | Device event, credential reference, time, and outcome |

Do not assume card UID is a secure credential.

Do not store secrets in AccessLog.

Guest and staff access need explicit authorization rules.

## 9. Administrative Models

| Model | Proposed field groups | Essential rules |
|---|---|---|
| AuditLog | actor, action, entityType, entityId, timestamp, safe metadata | Append-oriented history; exclude secrets |
| SystemSetting | key, validated value, updatedAt, updatedBy | Unique key; authorize and audit changes |

Audit retention and privacy rules remain TBD.

## 10. Constraints and Indexes

Use database constraints for:

- Unique emails and references.
- Foreign-key relationships.
- Unique room-type amenity pairs.
- Unique additional-occupant pairs.
- Unique provider event identities.
- Appropriate approved numeric and date checks.

Candidate indexes:

- Reservation primary guest.
- Reservation room type, status, and stay dates.
- Reservation status and hold deadline.
- Assignment room and date range.
- Assignment reservation and release marker.
- Block room and date range.
- Payment reservation.
- Access event device and timestamp.
- Audit actor/entity and timestamp.

Choose indexes from actual queries.

A unique booking reference does not prevent overlapping stays.

## 11. Inventory Integrity

Two intervals overlap when:

existingStart < requestedEnd
AND
existingEnd > requestedStart

Inventory decisions include:

- Confirmed reservations.
- Checked-in reservations.
- Unexpired pending holds.
- Relevant physical assignments.
- Active dated room blocks.

Do not count a reservation again merely because it has a room assignment.

Nightly capacity totals are necessary but may not prove a feasible
whole-stay room allocation when different rooms have different blocks.

The final allocation algorithm requires implementation review.

## 12. Transaction Boundaries

Operations requiring coordinated database writes include:

- Creating a reservation and inventory hold.
- Confirming inventory.
- Changing stay dates or room type.
- Assigning or reassigning a room.
- Adding inventory-reducing blocks.
- Processing a payment event.
- Recording a refund outcome.
- Checking out and recording follow-up work.

Inventory reads and writes must use a concurrency-safe strategy.

Prisma transactions support isolation configuration and conflict handling.
Select and test the strategy for each database.

Reference:
[Prisma transaction documentation](https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions)

External payment and door operations are not rolled back by a SQL transaction.
Persist their state and provide safe retry/reconciliation behavior.

## 13. Migration Rules

1. Review the existing schema.
2. Approve the specific change.
3. Validate the Prisma schema.
4. Review generated migration SQL.
5. Test against disposable data.
6. Check existing-record compatibility.
7. Back up production before deployment.
8. Apply the approved migration procedure.
9. Verify application behavior and recovery.

Changing the datasource provider alone is not a complete SQLite-to-PostgreSQL migration.
