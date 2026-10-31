# NEXORA — REST API Documentation

## 1. Contract Status

Phases 1–4 are completed per project-owner instruction; Phase 4 has seven steps.
Phase 5 is IN PROGRESS: Steps 1–3 are complete; Steps 4–5 have completed
backend work and frontend integration in progress. Steps 6–7 remain pending. Phase 6 onward is NOT STARTED / AWAITING APPROVAL. This task inspected sources,
installed dependencies, and documentation; it ran no application tests.

Section 4 describes implemented auth/health controllers. Section 5 describes
registered room, amenity, image, status, block, and availability controllers.
Booking, payments, guest/staff management, NFC, reports, and settings APIs remain
planned. See [acceptance boundaries](SECURITY.md#14-security-acceptance-checks).

## 2. General Conventions

Proposed conventions:

- Base path: /api
- JSON request and response bodies, except approved upload endpoints.
- Opaque string identifiers.
- camelCase JSON properties.
- Integer centavos for monetary amounts.
- YYYY-MM-DD for stay dates.
- ISO 8601 UTC timestamps for events.
- Server-calculated prices.
- Explicit response DTOs.

Never return password hashes, refresh-token hashes, provider secrets,
or NFC cryptographic material.

## 3. Access Categories

| Category | Requirement |
|---|---|
| Public | No account required; limited public information |
| Guest-owned | Authenticated ownership or approved private booking verification |
| Staff | Valid staff authentication and appropriate role |
| Provider | Verified PayMongo webhook |
| Device | Approved device authentication; protocol TBD |

Guest booking verification must provide scoped access.
A reservation reference alone must not grant access.

The exact accountless verification mechanism remains TBD.

## 4. Implemented Authentication and Health Routes

All paths below include the global /api prefix. All auth methods are @Public():
no access JWT is required, but DTO validation, throttling, Origin checks where
specified, and refresh-session verification still apply. Limits below are the
registered per-route default-throttler limits per 60,000 ms; the application
otherwise configures 60 requests per 60,000 ms. @Public() does not bypass throttling.

| Method and path | Success response | Input | Limit / minute | Origin requirement |
|---|---|---|---|---|
| POST /api/auth/register | 201; message: Registration received.; accountStatus: PENDING | RegisterDto body | 3 | Required and allowlisted |
| GET /api/auth/verify-email | 200; message: Email verified successfully. You can now log in. | VerifyEmailDto query | 10 | No controller Origin check |
| POST /api/auth/resend-verification | 200; message: If the account is eligible, a verification email will be sent. | ResendVerificationDto body | 3 | Required and allowlisted |
| POST /api/auth/login | 200; data contains accessToken, tokenType: Bearer, expiresIn: 900, user: {id, name, email, role} | LoginDto body | 5 | Required and allowlisted |
| POST /api/auth/refresh | 200; data contains accessToken, tokenType: Bearer, expiresIn: 900 | Refresh cookie; no body DTO | 20 | Required and allowlisted |
| POST /api/auth/logout | 204; no response body | Refresh cookie; no body DTO | 20 | Required and allowlisted |
| GET /api/health | 200; {status: ok, application: NEXORA Backend, message: The backend is running successfully.} | None | Global default | No controller Origin check |

These field descriptions show response shapes, not literal JSON examples or
live credentials. Success responses are not uniformly wrapped: only login and
refresh use the data envelope. No access token is issued by registration or
verification. Registering an existing email returns the same acknowledgment;
it does not assert that an existing account is PENDING or change its status.
Resend deliberately returns the same message for unknown or ineligible accounts.

### Request DTOs

| DTO | Fields and validation |
|---|---|
| RegisterDto | firstName and lastName: strings, 1–100 characters each, trimmed and rejected if whitespace-only; email: valid email, maximum 254 characters; password: string, 12–128 characters |
| LoginDto | email: valid email, maximum 254 characters; password: string, 1–1024 characters |
| ResendVerificationDto | email: valid email, maximum 254 characters |
| VerifyEmailDto | token query parameter: string of exactly 64 lowercase hexadecimal characters |

The controller imports DTOs from backend/src/auth/dto/. Global ValidationPipe
uses whitelist, forbidNonWhitelisted, and transform. Client-supplied role,
status, and other undeclared fields are rejected with 400. Emails are trimmed
and lowercased by services; guest registration assigns GUEST on the server.
Malformed verification queries fail validation with 400; well-formed but
unknown, expired, or used verification credentials fail with 401.

### Authentication and session behavior

- UserStatus is PENDING, ACTIVE, or DISABLED. Only ACTIVE users may log in,
  refresh sessions, or pass the JWT strategy. Login credential/status failures
  return the same 401 message.
- Access JWTs last 900 seconds (15 minutes). Protected requests supply a Bearer
  access token in the Authorization header. Refresh credentials last seven days;
  each successful rotation issues a new credential and expiry.
- Login and refresh set the nexora_refresh cookie: HttpOnly, SameSite=Strict,
  Path=/api/auth, seven-day maxAge, and Secure when NODE_ENV is production.
  The refresh credential is not returned in the JSON body.
- Refresh consumes the old database record transactionally and creates its
  replacement within the same family. Replay, expiry, inactive accounts, or a
  lost concurrent-rotation race revoke that family. Invalid sessions return 401.
- Logout revokes the identified refresh-token family and clears the cookie with
  matching options. Missing, malformed string, unknown, and already-revoked
  credentials are handled without session disclosure; a non-string cookie is
  rejected with 400. Each login creates an independent family for device sessions.
- Logout does not separately revoke previously issued access JWTs. They may
  remain usable until expiry while the user remains ACTIVE.
- All auth POST methods require an Origin header in the configured allowlist;
  absent or rejected origins return 403. Verification GET intentionally supports
  an emailed link without that Origin check and sends Cache-Control: no-store
  and Referrer-Policy: no-referrer.

### Diagnostics and test-only routes

GET /api/auth-check is a registered, protected diagnostic endpoint returning
{message: Authentication successful.}. It is not a guest or staff business API.
/api/security-test/* controllers are declared only inside the HTTP test suite;
they are not registered production API features.

### Private records and errors

401 indicates failed/missing authentication; 403 indicates a denied role or
Origin; ownership checks return 404 for inaccessible or missing private records.
429 indicates throttling. Current auth errors use NestJS exception responses,
not the proposed custom error envelope in section 10. See
[ownership enforcement](SECURITY.md#3-authorization) and
[registration delivery limits](SECURITY.md#15-production-hardening-and-open-concerns).
Guest accounts remain optional; complete accountless booking is future scope.

## 5. Implemented Room Management and Availability

All paths below include /api. A/M means ADMIN or MANAGER; Staff means ADMIN,
MANAGER, or RECEPTIONIST. Public routes bypass JWT/role guards; all routes remain
subject to global throttling (60 per 60,000 ms). These controllers add no explicit
Origin check beyond bootstrap CORS; the auth POST Origin rules are separate.
JSON responses use {data: ...}, except 204 deletes and the image binary response.
POST defaults to 201 unless explicitly changed; GET/PATCH return 200.

| Method and path | Permission | Request / response |
|---|---|---|
| GET /api/room-types | Public | Active types only; public field projection |
| GET /api/room-types/:id | Public | Active type or 404 |
| POST /api/room-types | A/M | CreateRoomTypeDto; 201 staff projection |
| PATCH /api/room-types/:id | A/M | UpdateRoomTypeDto; staff projection |
| GET /api/rooms | Staff | Physical-room records with nested room-type summary |
| GET /api/rooms/:id | Staff | Physical-room detail or 404 |
| POST /api/rooms | A/M | CreateRoomDto; 201, defaults READY/active |
| PATCH /api/rooms/:id | A/M | UpdateRoomDto; status is not accepted here |
| PATCH /api/rooms/:id/status | Staff, with service restrictions | UpdateRoomStatusDto |
| GET /api/amenities | Public | id, name, description |
| POST /api/amenities | A/M | CreateAmenityDto; 201 |
| PATCH /api/amenities/:id | A/M | UpdateAmenityDto |
| GET /api/room-types/:id/amenities | Public | Active type's linked amenities |
| POST /api/room-types/:id/amenities | A/M | AttachAmenityDto; 201 linked amenity |
| DELETE /api/room-types/:id/amenities/:amenityId | A/M | 204, no body |
| GET /api/room-types/:id/images | Public | Active type's image projections |
| POST /api/room-types/:id/images | A/M | One multipart file plus optional altText/displayOrder; 201 image projection |
| PATCH /api/room-types/:id/images/:imageId | A/M | UpdateRoomImageDto |
| DELETE /api/room-types/:id/images/:imageId | A/M | 204, staged file/record deletion |
| GET /api/room-images/:imageId/file | Public | Active type only; WebP binary, nosniff, inline, public max-age=300 |
| GET /api/rooms/:id/blocks | Staff | Includes canceled history; sorted by startDate/id |
| POST /api/rooms/:id/blocks | A/M | CreateRoomBlockDto; 201 |
| PATCH /api/rooms/:id/blocks/:blockId | A/M | UpdateRoomBlockDto; canceled rows cannot be edited |
| POST /api/rooms/:id/blocks/:blockId/cancel | A/M | 201 (Nest POST default), preserves row and sets canceledAt; repeats return 409 |

Room-type public fields: id, name, description, capacity, baseRateCentavos.
Write responses additionally include propertyId/isActive. There is no separate
staff endpoint listing inactive room types. Physical rooms return id,
roomNumber, floor, status, isActive, roomTypeId, and a nested type projection.
Images return id, roomTypeId, altText, displayOrder, isPrimary, and url; never
internal filePath. Block fields include id, roomId, dates, reason, canceledAt,
createdAt, updatedAt. Image metadata is fetched separately from room-type data.

### Room DTOs and rules

| DTO | Accepted fields |
|---|---|
| CreateRoomTypeDto | name string 1–100; optional nullable description up to 2000; integer capacity and baseRateCentavos each 1–2147483647 |
| UpdateRoomTypeDto | Optional create fields plus Boolean isActive |
| CreateRoomDto | roomNumber string 1–30; nonempty roomTypeId; optional nullable floor up to 30 |
| UpdateRoomDto | Optional create fields plus Boolean isActive |
| UpdateRoomStatusDto | status: READY, CLEANING, MAINTENANCE, or OUT_OF_SERVICE |
| CreateAmenityDto | name 1–100; optional nullable description up to 1000 |
| UpdateAmenityDto | Optional create fields |
| AttachAmenityDto | Nonempty amenityId string |
| UpdateRoomImageDto | Optional nullable altText up to 300, integer displayOrder 0–2147483647, Boolean isPrimary; false is rejected by service |
| CreateRoomBlockDto | startDate/endDate as YYYY-MM-DD strings; reason 3–500 characters |
| UpdateRoomBlockDto | Optional block fields; at least one supplied |

Global validation rejects undeclared DTO fields. Services reject empty updates,
blank normalized names, invalid dates, duplicates, and disallowed changes. Optional
fields use class-validator IsOptional; null is skipped by that decorator, so do
not infer strict null rejection from the table. Future callers must follow the
service contract; optional-null edge handling has not been independently tested here.

Capacity/rate values are integer bounds, not a realistic property-specific room
capacity policy. Rates are centavos; changing the current base rate preserves
saved reservation price snapshots. Type capacity reductions/deactivation check
protected upcoming PENDING/CONFIRMED/CHECKED_IN reservations. Reclassifying or
deactivating a physical room checks protected unreleased assignments.

Receptionists may only transition READY to CLEANING or CLEANING to READY.
ADMIN/MANAGER may use the service's permitted transitions between READY,
CLEANING, MAINTENANCE, and OUT_OF_SERVICE. Manual OCCUPIED changes and transitions
out of OCCUPIED are not allowed; same-state requests conflict. A checked-in
unreleased assignment with checkout after today prevents administrative changes.
Inactive rooms cannot transition to READY/CLEANING.

Blocks use real Philippine calendar dates represented by UTC-midnight markers,
start-inclusive/end-exclusive. Create rejects inactive rooms. Create/update
reject overlapping active blocks and protected unreleased assignment intervals;
cancel uses canceledAt (one l), never deletion. Missing records return 404,
conflicts 409, invalid input 400, missing JWT 401, wrong role 403. Property-scoped
services require exactly one configured Property or return 500.

### Image upload contract

Multipart field file is required: at most one file, 5 MiB maximum, two text
fields. Only altText (up to 300) and displayOrder (canonical nonnegative integer
string up to 2147483647) are accepted. Uploaded bytes must decode as JPEG, PNG,
or WebP within a 20,000,000-pixel input limit. They are rotated/re-encoded to WebP
without copying metadata, stored under generated keys, and served through the
controlled file controller. The first image becomes primary; later changes can
select a new primary, and deleting the primary chooses a remaining image.
The input-byte limit does not establish a total disk-storage quota.

### Inventory service boundary

InventorySafetyService exports assertEligible and assertEligibleInTx. It checks
activity, category/capacity, immediate/future status, dated blocks, and assignment
overlap; it exposes no controller. The check reserves nothing. Future writers
must check and write in one transaction. Current protection conservatively
includes PENDING assignments without checking hold expiry; aggregate unassigned
inventory and the complete reservation acquisition workflow remain future work.

### Public date/capacity availability and pricing

Backend portions of Phase 5 Steps 4–5 are owner-confirmed complete. The guest
frontend does not yet request this endpoint or display a searched-stay total;
those frontend portions remain in progress. Source inspection is not a fresh
runtime test result.

Backend implementation for Steps 4–5 is owner-confirmed complete. Seven quick
rule checks were reported from another repository copy; a permanent availability
suite and successful local build/lint are not yet verified. See
[reported verification](IMPLEMENTATION_GUIDE.md#reported-backend-checks-for-steps-45).
Frontend search and searched-stay quote integration remain in progress.

GET /api/availability is registered through AvailabilityModule and marked
@Public(). Throttle: 30 requests per 60,000 ms; no controller-level Origin
check beyond bootstrap CORS. Successful response: 200 with {data: [...]}.
SearchAvailabilityDto accepts checkIn and checkOut as YYYY-MM-DD strings and
guests converted to an integer from 1 to 2147483647. These names differ from
earlier illustrative checkInDate/checkOutDate/guestCount query examples.

The service validates real Philippine calendar dates, checkout after check-in,
check-in not before today in Asia/Manila, and a maximum 30-night stay. The
30-night bound is the current code constant; it does not establish a separately
verified property policy. Invalid query/date input returns 400; exactly one
Property is required or the service returns 500.

Response rows contain id, name, capacity, available, nights,
nightlyRateCentavos, and totalAmountCentavos. Only active room types with
sufficient capacity are returned, sorted by base rate/name; unavailable matching
types remain in the response with available: false. There is no currency,
roomTypeId, image, or amenity field in this response. Values are PHP centavos;
the server computes totalAmountCentavos = baseRateCentavos × nights.

Eligible physical-room counts exclude inactive rooms and MAINTENANCE/
OUT_OF_SERVICE. Active dated blocks reduce capacity per night; canceled blocks
are ignored. CONFIRMED and CHECKED_IN reservations hold inventory; PENDING
reservations hold inventory when holdExpiresAt is null or still in the future.
Expired pending holds, CANCELLED, EXPIRED, and CHECKED_OUT reservations do not
reduce these counts. Assignments are not counted again as separate reservations.

The pure hasRoomEveryNight calculator requires positive remaining room count
on every stay night. This does not prove the same physical room is available
for the entire stay; the search does not account for a feasible assignment
across changing blocks. It reserves nothing and does not guarantee a future
booking succeeds. Booking creation and safe acquisition remain unimplemented.

Guest room listing/details currently call metadata/image/amenity endpoints only,
and format backend nightly rates. A search form, availability request, and
searched-stay total display were not found in the inspected guest pages.
Steps 4–5 are owner-confirmed complete; this integration boundary is retained
without claiming an independently verified end-to-end search flow.

## 6. Reservations

| Method | Proposed route | Access |
|---|---|---|
| POST | /reservations | Public guest checkout or authorized staff |
| GET | /reservations | Staff; guest listings must be ownership scoped |
| GET | /reservations/:id | Verified owner or authorized staff |
| POST | /reservations/:id/cancel | Verified owner under policy or authorized staff |
| POST | /reservations/:id/assign-room | Receptionist / Manager / Administrator |
| POST | /reservations/:id/check-in | Receptionist / Manager / Administrator |
| POST | /reservations/:id/check-out | Receptionist / Manager / Administrator |

Proposed creation request:

```json
{
  "roomTypeId": "room-type-example",
  "checkInDate": "2026-11-10",
  "checkOutDate": "2026-11-12",
  "guestCount": 2,
  "guest": {
    "firstName": "Sample",
    "lastName": "Guest",
    "email": "guest@example.com",
    "phone": "+639000000000"
  },
  "paymentMethod": "PAY_AT_PROPERTY"
}
```

The backend derives:

- Trusted account association.
- Initial reservation state.
- Applicable rate.
- Total amount.
- Reservation number.
- Hold deadline when required.

Do not accept client-supplied prices or privileged statuses.

## 7. Payments

| Method | Proposed route | Access |
|---|---|---|
| POST | /payments/checkout | Verified reservation owner or authorized staff |
| GET | /reservations/:id/payments | Verified owner or authorized staff |
| POST | /reservations/:id/payments | Receptionist / Manager / Administrator; property collections |
| POST | /payments/:id/refunds | Manager / Administrator |
| POST | /webhooks/paymongo | Verified provider request |

The checkout request identifies the reservation.
NestJS determines the expected payable amount.

The webhook handler must authenticate the event, validate its association,
and apply duplicate-safe processing.

## 8. Users, Guests, NFC, and Operations

| Method | Proposed route | Access |
|---|---|---|
| GET / POST / PATCH | /users and /users/:id | Administrator |
| GET / PATCH | /guests and /guests/:id | Authorized staff; separate ownership rules for guests |
| GET / POST | /nfc/cards | Receptionist / Manager / Administrator |
| POST | /nfc/assignments | Receptionist / Manager / Administrator |
| POST | /nfc/assignments/:id/revoke | Receptionist / Manager / Administrator |
| GET | /dashboard | Authorized staff; role-filtered data |
| GET | /reports | Manager / Administrator |
| GET / PATCH | /settings | Administrator |
| GET | /audit-logs | Proposed: Manager / Administrator; final policy TBD |

Each method must have its own authorization rule.

Do not assume all actions in a route group share identical permissions.

## 9. Pagination

Proposed list parameters:

- page: positive integer.
- pageSize: bounded positive integer.
- search: optional.
- sortBy: allowlisted field.
- sortOrder: asc or desc.

Proposed response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

Apply ownership and role filters before counting records.

## 10. Error Contract

Proposed future error envelope (not installed for current auth controllers):

```json
{
  "error": {
    "code": "INVENTORY_UNAVAILABLE",
    "message": "The selected room type is unavailable for these dates.",
    "requestId": "request-example"
  }
}
```

| HTTP status | Use |
|---|---|
| 400 | Invalid request |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but not permitted |
| 404 | Record unavailable; may also protect private-record existence |
| 409 | Inventory conflict, invalid transition, or idempotency conflict |
| 429 | Rate limit reached |
| 500 | Unexpected server error |

Never expose stack traces, SQL errors, or secrets.

## 11. Idempotency

Proposed use: an Idempotency-Key header for retry-sensitive operations.

The backend should associate the key with:

- Verified actor or secure guest checkout context.
- Operation.
- Request fingerprint.
- Processing state.
- Stored result.

Reusing a key with a different payload must fail.

Provider-event deduplication uses the provider event identity.
It is separate from client-request idempotency.

Retention and retry behavior remain TBD.

## 12. Contract Verification

Test:

1. Valid requests.
2. Invalid dates and capacity.
3. Missing authentication.
4. Wrong role.
5. Access to another guest's reservation.
6. Duplicate requests.
7. Conflicting inventory requests.
8. Unexpected provider events.
9. Response fields that must remain private.
