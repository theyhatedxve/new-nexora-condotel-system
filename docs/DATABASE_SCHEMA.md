# NEXORA — Database Schema Documentation

## 1. Status and Scope

Phase 2 — Database Foundation is COMPLETED and accepted: initial schema,
relationships, migrations, Prisma Client/NestJS integration, development seed,
and isolated integrity tests. Architecture v2.1 listed 23 core models plus the
supporting RoomTypeAmenity join model (24 in Phase 2). Phase 3 Step 7 added
EmailVerificationToken: the inspected current schema has **25 models**.

Phase 3 is COMPLETED — 8/8 steps based on owner-reported acceptance. Current
fields below follow backend/prisma/schema.prisma; this documents the approved
extension without replacing the historical architecture. Phase 4 room-type, room,
amenity, image, status, and dated-block services are implemented. Reservation,
payment, NFC, reports, and settings business APIs remain future work.
This documentation task did not query databases or apply migrations.

### Migration source history

| Directory under backend/prisma/migrations/ | Schema change |
|---|---|
| 20261027150551_init | Initial 24-model foundation |
| 20261029133315_add_refresh_token_family | Nullable RefreshToken.familyId and index |
| 20261030134255_add_email_verification_tokens | EmailVerificationToken table, unique hash, user/expiry indexes, restrictive User foreign key |
| 20261031_phase4_step6_room_block_cancellation | Add nullable RoomBlock.canceledAt; existing rows stay active, canceled history is preserved |

Migration files were inspected. Successful validation and preservation of the
development database are reported acceptance results, not fresh checks here.

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
          ├──< EmailVerificationToken
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
Reservation ──< ReservationGuest (additional occupant names)

Reservation ──< Payment ──< Refund
PaymentEvent ── provider-event processing and payment association

NfcCard / NfcCredential
           |
           └──< CardAssignment >── Reservation / Room

Room ── DoorDevice ──< AccessLog

User ──< AuditLog
SystemSetting ── operating configuration
```

Current NFC foreign-key cardinalities follow section 8; physical hardware
capability and protocol remain subject to selection and testing.

## 4. Identity and Guest Models

| Model | Current fields | Constraints / rules |
|---|---|---|
| Role | id, name, description?, createdAt, updatedAt | Unique name |
| User | id, roleId, name, email, passwordHash, status, createdAt, updatedAt | Unique email; Role FK; UserStatus defaults PENDING |
| RefreshToken | id, userId, familyId?, tokenHash, expiresAt, revokedAt?, createdAt | Unique hash; familyId index; User FK with Restrict |
| EmailVerificationToken | id, userId, tokenHash, expiresAt, usedAt?, createdAt | Unique hash; userId and expiresAt indexes; User FK with Restrict |
| Guest | id, userId?, firstName, lastName, email?, phone?, createdAt, updatedAt | Optional unique User link with Restrict |

UserStatus values: ACTIVE, DISABLED, PENDING. User has many refresh tokens and
email-verification tokens, an optional Guest, and audit/refund/settings links.
Registration normalizes email, assigns GUEST, and atomically creates the PENDING
User, Guest, and verification hash. Verification atomically claims an unexpired,
unused credential and changes PENDING to ACTIVE. See [security](SECURITY.md).

familyId remains nullable for existing-record compatibility; current login sets
it, and refresh rejects records without it. Only credential hashes are stored.
EmailVerificationToken has a 30-minute service-enforced lifetime and single-use
usedAt marker. Expiry is not a database cleanup scheduler.

A Guest may exist without a User. Booking without registration remains required;
no accountless booking API has been built. Do not attach historical bookings by
email matching alone.

## 5. Property and Room Models

| Model | Important fields | Constraints / rules |
|---|---|---|
| Property | id, name, address, city, province, country, contact fields | Single-property invariant |
| RoomType | id, propertyId, name, capacity, baseRateCentavos, isActive | Service-enforced integer capacity/rate in 1–2147483647; positive centavos |
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

These model definitions exist. Full reservation operations and aggregate
inventory acquisition remain NOT STARTED / AWAITING APPROVAL. Physical-room
eligibility and administrative block/assignment protections are implemented
as described in section 11.

| Model | Current fields | Constraints / relations |
|---|---|---|
| Reservation | id, reservationNumber, guestId, roomTypeId, checkInDate, checkOutDate, guestCount, nightlyRateCentavos, totalAmountCentavos, status, holdExpiresAt?, createdAt, updatedAt | Unique reference; restrictive Guest and RoomType FKs; indexes on guestId, roomTypeId/checkInDate/checkOutDate, status/holdExpiresAt |
| ReservationGuest | id, reservationId, firstName, lastName, createdAt | Restrictive Reservation FK; reservationId index |
| RoomAssignment | id, reservationId, roomId, assignedAt, releasedAt?, createdAt | Restrictive Reservation/Room FKs; reservationId and roomId indexes |
| RoomBlock | id, roomId, startDate, endDate, reason, canceledAt?, createdAt, updatedAt | Restrictive Room FK; roomId/startDate/endDate index |

ReservationStatus is PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED,
or EXPIRED. Allowed transitions still require business-service enforcement.

The former planning table used primaryGuestId; the actual field is guestId and
the relation is guest. Reservation has no checkedInAt/checkedOutAt fields.
ReservationGuest stores occupant names, not a guestId link or unique
reservationId/guestId pair. RoomAssignment uses assignedAt/releasedAt and has no
startDate/endDate/updatedAt. RoomBlock has no type; Phase 4 added canceledAt (one l), not cancelledAt. These are
explicit differences from earlier detailed planning examples; future services
must work from the current schema and obtain approval for any needed changes.

Preserve assignment history and use the shared transactional eligibility
checks when implementing future assignment writers. Current indexes do not enforce non-overlapping stays,
single-property cardinality or the full booking rules. Room services enforce
one configured property and shared positive rate/capacity bounds at runtime.

## 7. Payment Models

Schema foundation is present; payment processing is NOT STARTED / AWAITING
APPROVAL (Phase 7). Current scalar field groups:

| Model | Current fields | Constraints / relations |
|---|---|---|
| Payment | id, reservationId, method, status, amountCentavos, currency, provider?, providerCheckoutId?, providerPaymentId?, referenceNumber?, paidAt?, createdAt, updatedAt | Unique checkout/payment provider IDs; Reservation FK; indexes on reservationId, status, method/createdAt |
| PaymentEvent | id, paymentId?, providerEventId, eventType, providerCreatedAt?, status, signatureVerified, payloadJson?, processedAt?, errorMessage?, createdAt | Unique providerEventId; optional Payment FK; indexes on paymentId, status/createdAt, eventType |
| Refund | id, paymentId, amountCentavos, reason, status, providerRefundId?, processedByUserId?, requestedAt, completedAt?, updatedAt | Unique providerRefundId; Payment and optional User FKs; indexes on paymentId, status, processedByUserId |

PaymentMethod: PAYMONGO, PAY_AT_PROPERTY. PaymentStatus: UNPAID, PENDING,
PARTIALLY_PAID, PAID, FAILED, PARTIALLY_REFUNDED, REFUNDED. PaymentEventStatus:
RECEIVED, PROCESSED, IGNORED, FAILED. RefundStatus: PENDING, COMPLETED, FAILED,
CANCELLED. Currency defaults PHP; amounts are integer centavos.

Reservation and payment statuses are independent. Future services must verify
provider evidence, prevent duplicate effects, distinguish individual payment
records from aggregate summaries, and limit refunds. Never store card details.

## 8. NFC Models

Schema foundation exists; software operations and hardware integration remain
NOT STARTED / AWAITING APPROVAL. All listed FKs use Restrict on delete.

| Model | Current scalar fields | Constraints / relations |
|---|---|---|
| NfcCard | id, cardIdentifier, status, label?, registeredAt, updatedAt | Unique identifier; status index; many credentials |
| NfcCredential | id, cardId, credentialReference, status, issuedAt, revokedAt?, expiresAt?, createdAt | Unique opaque reference; Card FK; indexes on cardId, status, expiresAt |
| CardAssignment | id, credentialId, reservationId?, roomId, validFrom, validUntil, revokedAt?, createdAt | Credential, optional Reservation, and Room FKs; indexes on each FK and validity interval |
| DoorDevice | id, roomId, deviceIdentifier, name?, status, lastSeenAt?, createdAt, updatedAt | Unique roomId and deviceIdentifier; Room FK; status index |
| AccessLog | id, credentialId?, doorDeviceId, result, occurredAt, source, reason?, createdAt | Optional Credential and required DoorDevice FKs; indexes on credentialId, doorDeviceId/occurredAt, result/occurredAt |

NfcCardStatus: AVAILABLE, ASSIGNED, LOST, DISABLED. NfcCredentialStatus:
INACTIVE, ACTIVE, REVOKED, EXPIRED. DoorDeviceStatus: REGISTERED, ACTIVE,
OFFLINE, DISABLED. AccessResult: GRANTED, DENIED, ERROR.

The current schema gives each Room at most one DoorDevice. Real credential
capability, offline behavior, and protocol remain hardware-dependent. Do not
trust card UID alone or put secret keys into credentialReference or AccessLog.

## 9. Administrative Models

| Model | Current scalar fields | Constraints / relations |
|---|---|---|
| AuditLog | id, actorUserId?, action, entityType, entityId?, detailsJson?, createdAt | Optional User actor FK with Restrict; indexes on actorUserId, entityType/entityId, createdAt |
| SystemSetting | id, key, value, description?, updatedByUserId?, createdAt, updatedAt | Unique key; optional User updater FK with Restrict; updatedByUserId index |

Administrative services, audit-event capture, settings validation, and retention
policy are future work. Store sanitized details only; schema presence does not
prove append-only auditing or security enforcement.

## 10. Constraints and Indexes

The current schema includes unique account emails, role and amenity names,
room numbers, booking references, provider identifiers, credential identifiers,
and token hashes. RoomType has a propertyId/name composite unique constraint;
RoomTypeAmenity uses a composite roomTypeId/amenityId primary key. Foreign-key
deletions are restrictive. Full field/index details are in the tables above
and the current schema.

Rate/capacity and block-date checks are implemented in services. Complete
booking allocation, aggregate inventory, and reservation lifecycle rules still
need their future service implementation. No guestId-based
unique pair exists on ReservationGuest. Candidate query-specific inventory
indexes may be reviewed in future phases; do not confuse them with implemented
constraints. A unique booking reference does not prevent overlapping stays.

## 11. Inventory Integrity

Phase 4 InventorySafetyService checks a physical room's property, active room/type,
matching type, capacity, permitted operational status, active blocks, and overlapping
unreleased PENDING/CONFIRMED/CHECKED_IN assignments. It excludes canceled blocks
(canceledAt not null). IMMEDIATE requires READY and dates covering today in
Asia/Manila. FUTURE can permit CLEANING/OCCUPIED when no dated conflict exists.
MAINTENANCE/OUT_OF_SERVICE are ineligible. The service reserves nothing; future
writers must call assertEligibleInTx within the assignment transaction. The
current checks protect PENDING assignments conservatively without hold-expiry
filtering and do not implement aggregate unassigned room-type inventory.

Room block create/update checks overlapping active blocks and protected
assignments in the same transaction as the write. Cancellation preserves the
record; canceled blocks cannot be edited or canceled twice. Room status changes
protect checked-in assignments, and reclassification/deactivation protects
upcoming unreleased assignments. These controls do not expose a booking API.

Current base-rate updates leave Reservation.nightlyRateCentavos and
Reservation.totalAmountCentavos untouched; snapshot/inventory tests verify that
intent in source. No fresh database/test run was performed here.

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

Implemented auth transactions coordinate registration, refresh rotation,
verification token claims/account activation, and verification resend. SMTP is
after commit and is not rolled back with database writes.

Phase 4 also uses transactions for protected room/type updates, block conflicts,
image primary selection and record deletion. File operations use compensation,
not SQL rollback. Future booking/payment operations include:

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

## 14. SQLite Safety and Backup Policy

The runtime adapter is PrismaBetterSqlite3 with file:./dev.db; launching from
backend/ targets D:\Web-JSX\NEXORA\backend\dev.db. A source comment mentioning
prisma/dev.db is stale. CLI configuration uses DATABASE_URL in prisma7.config.ts;
verify the CLI target independently before authorizing any migration.

Use additive, reviewed migrations; never reset/replace development data as a
test setup shortcut. Use a consistent SQLite backup API or an approved offline
backup accounting for journals/WAL. Check PRAGMA integrity_check on a read-only
backup connection and rehearse restoration on a disposable file before trusting
recovery. No backup, query, integrity check, or migration was executed here.
Local backups/ and storage/ directories are not versioned business APIs.

Dedicated test targets and command effects are maintained in
[AGENTS.md](AGENTS.md#e-database-architecture-and-safety). Do not substitute dev.db.
PostgreSQL deployment remains separate future compatibility work.
