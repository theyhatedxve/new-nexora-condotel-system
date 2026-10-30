# NEXORA — REST API Documentation

## 1. Contract Status

Phases 1 and 2 are COMPLETED. Phase 3 is **COMPLETED — 8/8 steps**, accepted
by the project owner based on reported checks. Phase 4 onward is
**NOT STARTED / AWAITING APPROVAL**. No application tests ran for this
Markdown-only synchronization.

Sections 4 and the health response below describe inspected, registered
controllers. Room, reservation, payment, user-management, and NFC routes in
sections 5–8 remain proposed under Architecture v2.1; their APIs are not built.
See [security acceptance and limits](SECURITY.md#14-security-acceptance-checks).

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

## 5. Rooms and Availability

| Method | Proposed route | Access |
|---|---|---|
| GET | /room-types | Public projection |
| GET | /room-types/:id | Public projection |
| POST | /room-types | Manager / Administrator |
| PATCH | /room-types/:id | Manager / Administrator |
| GET | /rooms | Receptionist / Manager / Administrator |
| POST | /rooms | Manager / Administrator |
| PATCH | /rooms/:id | Manager / Administrator |
| GET | /availability | Public; rate limited |

Proposed availability request:

```http
GET /api/availability?checkInDate=2026-11-10&checkOutDate=2026-11-12&guestCount=2
```

Proposed response:

```json
{
  "data": [
    {
      "roomTypeId": "room-type-example",
      "name": "Deluxe Suite",
      "available": true,
      "nightlyRateCentavos": 250000,
      "totalAmountCentavos": 500000,
      "currency": "PHP"
    }
  ]
}
```

Availability responses are informational.
Inventory must be checked again when creating or confirming a booking.

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
