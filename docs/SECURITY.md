# NEXORA — Security Requirements

## 1. Security Approach

Apply security throughout development.

KISS means understandable security controls.
It does not mean removing required protection.

## 2. Authentication

Phase 3 is **COMPLETED — 8/8 steps**, accepted from project-owner reported
results. Source inspection confirms Passport JWT, Argon2id, login, refresh,
logout, registration, verification, guards, and ownership services. This task
ran no application tests. Endpoint DTOs and transport details are maintained in
[API.md](API.md#4-implemented-authentication-and-health-routes).

PasswordService uses Argon2id with memoryCost 65536 KiB, timeCost 3, and
parallelism 1. Tests cover correct/incorrect/empty-password verification,
algorithm/parameters, distinct salts, and malformed stored hashes.

Access tokens expire after 900 seconds. JWT validation checks signature,
expiration, HS256, issuer/audience, sub and jti fields, and the current database
user's ACTIVE status. PENDING and DISABLED accounts cannot authenticate.
Roles come from the current user record, not client role claims.

Refresh credentials are random 32-byte values encoded as hexadecimal; only
SHA-256 hashes are persisted. Each login creates a separate family. Refresh
transactionally consumes an unrevoked, unexpired record and inserts its
replacement with a seven-day lifetime. Replay and lost concurrent claims revoke
the family. Logout revokes that family, leaving other login families separate.
Already-issued access tokens are not separately revoked by logout and may
remain valid until expiry while the user remains ACTIVE.

Registration assigns GUEST, hashes the password, and transactionally creates
User (PENDING), linked Guest, and EmailVerificationToken. Normalized unique
emails and P2002 handling prevent duplicate accounts with a generic public
acknowledgment. No account is attached to old bookings merely by email matching.

Email verification uses a random credential, stores only its SHA-256 hash, and
expires after 30 minutes. A conditional single-use token claim and PENDING-to-
ACTIVE transition occur in one transaction; failure rolls back both. Other
unused links are invalidated. Resend invalidates earlier unused credentials and
issues a new one for eligible PENDING accounts with a generic public response.
SMTP delivery occurs after database commit; delivery failure does not activate
or remove the PENDING account. Never include actual credentials in documentation.

## 3. Authorization

Architecture v2.1 lists reception room/rate management as View, while current
room-status code permits READY/CLEANING writes. Whether this is an intended
housekeeping exception requires [owner review](TECHNICAL_PLAN.md#11-architecture-and-implementation-review-items).
This audit changes neither the baseline permission table nor application code.

Global guards are registered in order: ThrottlerGuard, JwtAuthGuard, RolesGuard.
@Public() bypasses JWT/role authentication, not throttling, validation, or the
Origin check applied to auth POST endpoints. Unmarked routes require JWT
identity. @Roles() permits only its explicit ADMIN, MANAGER, RECEPTIONIST, or
GUEST role list; an empty declaration is rejected. An unrestricted protected
route still requires authentication. ADMIN has no implicit role bypass.

- Missing/invalid identity: 401 Unauthorized.
- Authenticated identity outside an explicit role list: 403 Forbidden.
- Missing or denied auth POST Origin: 403 Forbidden.
- Missing/inaccessible private record: 404 Not Found to avoid disclosing existence.

OwnershipModule exports OwnershipService with
assertGuestAccess(user, guestId, allowedStaffRoles = []) and
assertReservationAccess(user, reservationId, allowedStaffRoles = []). Callers
must pass the trusted identity supplied by JwtStrategy. A GUEST owns a profile
through Guest.userId and a reservation through reservation.guest.userId.
Staff access requires an explicitly supplied allowedStaffRoles list; ADMIN has
no automatic ownership bypass. Missing identity returns 401; inaccessible and
nonexistent records return the same 404.

Future guest and reservation services must explicitly import OwnershipModule
and invoke these checks. These reusable checks do not create guest-management
or reservation-management endpoints. Architecture v2.1 business permission
matrices remain requirements for future modules, not proof they are implemented.

## 4. Accountless Guest Access

Booking references are not credentials.

The final mechanism must provide:

- Private ownership verification.
- Scoped access.
- Expiration.
- Rate limiting.
- Protection against enumeration.
- Safe recovery.

Do not expose booking details merely because someone supplies a reference
and publicly discoverable contact information.

The verification mechanism remains TBD.

## 5. Session Transport

The implemented browser contract returns access JWTs in login/refresh JSON and
uses an HttpOnly refresh cookie. See [API.md](API.md) for exact attributes,
Origin requirements, DTOs, response envelopes, and rate limits. Frontend token
storage, renewal interceptors, and sign-in screens are not established by the
backend milestone. The guest app now has connected public room screens; admin
operational pages remain placeholders. Browser sign-in/refresh integration is
not established by those public guest screens.

Auth POST requests require an explicit allowlisted Origin. Verification GET is
public without a controller Origin check to permit email navigation. HTTPS is
required for production verification URLs and Secure refresh cookies.
CORS is not authentication. The duplicate CORS registration in main.ts needs
review against the actual deployment origins before release.

## 6. Validation and Data Exposure

- Validate DTOs in NestJS.
- Reject or strip unexpected properties under the approved policy.
- Bound lengths, quantities, and pagination.
- Validate date labels and permitted transitions.
- Use parameterized database operations.
- Avoid unsafe dynamic SQL.
- Return explicit response DTOs.
- Avoid rendering untrusted HTML.
- Do not expose internal exception details.

## 7. Payment Security

**PLANNED — NOT IMPLEMENTED.** These are future security requirements, not
claims that checkout, collection, refunds, or webhook handlers already exist.

- Use PayMongo Hosted Checkout.
- Keep provider secrets in the backend.
- Verify webhook signatures against the expected payload.
- Validate the expected event, amount, currency, and reservation association.
- Deduplicate provider events.
- Preserve processing state for recovery.
- Never trust browser success redirects.
- Do not store raw card details.

Implement signature verification and event handling using the current
provider documentation.

References:

- [PayMongo webhook setup](https://docs.paymongo.com/docs/developer-tools-webhook-setup-management)
- [PayMongo integration best practices](https://docs.paymongo.com/docs/developer-tools-best-practices-1)

## 8. NFC Security

**PLANNED — NOT IMPLEMENTED.** Schema records alone do not implement device
authentication, credential issuance, simulations, or real door operations.

- Select a cryptographically authenticated card/lock system.
- Do not trust UID alone.
- Restrict credentials by authorized room and validity.
- Separate guest and staff access.
- Track issuance, revocation, and replacement.
- Authenticate devices using the selected protocol.
- Exclude credential secrets from API responses and logs.
- Test offline behavior and emergency access.

Hardware capability must be verified physically.

Software simulation does not prove door security.

## 9. Implemented Room Image Security

Room image writes require ADMIN/MANAGER; public reads only serve active types
within the configured property. No blanket static directory is exposed. Multer
uses memory storage, one file, at most two metadata fields, and a 5 MiB input
limit. Controller metadata is allowlisted; displayOrder is a bounded integer
and altText is length-limited. Global role guards run before upload processing.

Sharp inspects decoded content: JPEG, PNG, and WebP only, with a 20-million-pixel
input limit and strict decode errors. Content is auto-rotated and re-encoded to
WebP; source metadata is not copied. Generated UUID storage keys, path guards,
exclusive file creation and controlled public delivery prevent client-chosen
storage paths. Responses omit internal file paths; binary responses set image/webp,
nosniff, inline disposition, and short public caching.

Upload failure attempts cleanup. Deletion stages the file, deletes/updates image
records transactionally, restores on database failure, then finalizes removal.
Storage is not part of the SQL transaction: orphan/pending-delete monitoring,
durable production storage, quotas, and recovery require deployment work.
The default storage location is ../storage/room-images relative to backend/,
configurable with ROOM_IMAGE_STORAGE_DIR; values are not published here.

Image behavior and role metadata tests exist. They were inspected, not rerun.
A MIME string, filename extension, database record, or unit test alone does not
establish production upload safety.

## 10. Encryption and Secrets

Use AES-256-GCM when approved fields require encryption.

- Use a fresh nonce for each encryption under a key.
- Preserve authentication tags.
- Keep keys outside the database content they protect.
- Plan key rotation and recovery.
- Do not invent cryptographic algorithms.

Passwords and refresh tokens require hashing, not reversible encryption.

Never commit:

- Production environment files.
- API secrets.
- Signing keys.
- Database credentials.
- NFC keys.
- Private guest data.

## 11. Auditing

**PLANNED — NOT IMPLEMENTED as an audit service/API.** AuditLog is currently
a schema foundation; the following defines the required operational behavior.

Audit consequential actions:

- Staff-account changes.
- Permission changes.
- Reservation state changes.
- Room assignment changes.
- Payment collections and refunds.
- NFC issuance and revocation.
- Policy changes.

Capture actor, action, affected record, outcome, and timestamp.

Exclude passwords, tokens, raw payment details, and NFC secrets.

## 12. Backup and Recovery

- Restrict database privileges.
- Protect backups.
- Define retention.
- Test restoration.
- Monitor failed payment processing and device commands.
- Document incident response.
- Keep recoverable operational records.

A successful backup job does not prove restoration works.

## 13. Privacy

Collect only necessary guest information.

Document:

- Collection purpose.
- Access rules.
- Retention.
- Correction and deletion processes.
- Audit and financial-record exceptions.
- Incident handling.

Applicable Philippine privacy obligations require review before launch.
This document does not certify legal compliance.

## 14. Security Acceptance Checks

**Project-owner acceptance:** Phase 3 COMPLETED — 8/8 steps; final acceptance
reported **23 of 23 checks passed with no reported errors**, including the HTTP
security suite, full Vitest regression, NestJS build, Prisma validation, and
development database preservation. No fresh test run, build, migration, seed, or
SMTP delivery was executed during this documentation task.

Reported accepted checks cover public access; missing, malformed, expired and
tampered JWT rejection; registration/activation; PENDING and DISABLED
restrictions; role escalation and unauthorized Origin rejection; refresh
rotation, replay and concurrency; logout and independent device sessions;
invalid/reused verification credentials and concurrent verification; RBAC with
no ADMIN bypass; cross-guest denial; rate limiting; production cookie
attributes; and sensitive-response leakage.

### Repository evidence and coverage boundaries

| Source | Inspected coverage / isolation |
|---|---|
| src/auth/password.service.spec.ts | Password algorithm, parameters, salts, and verification |
| src/auth/auth.service.spec.ts and auth.logout.spec.ts | Real SQLite auth and logout checks using step3.auth.test.db |
| src/common/guards/*.spec.ts | JWT/public-route and role boundaries, including ADMIN no-bypass |
| src/common/ownership/ownership.service.spec.ts | Cross-guest and explicit-staff checks in step6.ownership.test.db |
| src/auth/registration.spec.ts | Pending registration, hashed credential storage, activation, expiry/reuse, duplicate prevention, resend, normalization in step7.registration.test.db |
| src/auth/security/security-http.spec.ts | Real NestJS HTTP routes using step8.security.test.db, a Prisma provider override, and fake email delivery |
| test/database/database.integrity.spec.ts | Phase 2 constraints and rollback using step10.test.db |

Paths are relative to backend/. Database suites check that their existing test
file differs from dev.db. They require migrated isolated databases and write
synthetic data to those databases. The HTTP suite overrides EmailService and
manually configures prefix, validation, and cookie parsing; it does not execute
main.ts or prove real SMTP delivery or browser CORS behavior.

The inspected HTTP suite has **17 named test cases**. The owner's **23/23** is
recorded as the supplied overall acceptance checklist, not as a claim that this
file contains 23 HTTP tests. Some reported checks (such as expired/tampered JWTs,
concurrent verification, rate limiting, and production Secure-cookie behavior)
are not explicit named cases in that HTTP file. Retain the owner's acceptance
record and obtain its detailed run/check mapping when preparing release evidence.

Payment verification, price tampering, upload abuse, NFC revocation, and complete
booking journeys remain future phase acceptance requirements. Phase 11's broader
security work is NOT STARTED / AWAITING APPROVAL.

### Room-management security evidence

Phase 4 is COMPLETED — 7/7 steps per owner instruction. Inspected tests cover
room/type permissions and protected history, amenity links, image decoding and
storage compensation, positive rate/capacity bounds, snapshot preservation,
operational transitions, block cancellation/overlap, and transaction-scoped
inventory checks. Dedicated phase4.step1.test.db through phase4.step7.test.db
targets appear in source. Authorization suites inspect role metadata; they do
not independently exercise every route over HTTP. No Phase 4 suite or regression
was executed in this documentation task, and no pass count is inferred.

The concurrent assignment fixture checks that at most one overlapping assignment
commits. It may allow both attempts to fail due to conflict/SQLite locking; it
is not proof that one request always succeeds or PostgreSQL behaves identically.

## 15. Production Hardening and Open Concerns

Phases 1–4 and Phase 5 Steps 1–3 are owner-confirmed complete. For Steps 4–5,
backend work is complete and frontend integration is in progress. This is not a
production-readiness declaration. Phase 5 Steps 6–7 remain pending; Phase 6 onward
is NOT STARTED / AWAITING APPROVAL.

- Verification currently consumes a credential on GET. Email clients and link
  scanners may prefetch it; review a confirmation interaction before launch.
  Keep query credentials out of proxy/access logs and analytics.
- Registration/resend catch SMTP failures without recording a monitoring event.
  Add approved safe delivery monitoring and recovery before deployment; never
  log credentials. Real SMTP/TLS delivery still needs environment acceptance.
- main.ts calls enableCors twice; inspect credentialed preflight behavior and
  deployment allowlists. The HTTP fixture does not cover this bootstrap path.
- Startup now uses void bootstrap().catch with console error reporting and a failing
  process exit code. It logs the caught error object; automatic redaction is
  not established by this handler. The earlier unhandled-startup finding is superseded. This
  documentation task did not rerun lint or force a startup failure.
- test/app.e2e-spec.ts still expects / to return Hello World! and imports the
  real AppModule without isolating Prisma. It is separate from npm run test and
  must be reviewed before treating npm run test:e2e as a valid release check.
- PrismaService uses a fixed runtime SQLite path while CLI reads DATABASE_URL;
  verify resolved targets before any authorized migration. PostgreSQL migrations,
  recovery, backups, deployment monitoring, and HTTPS remain deployment work.
- The unused backend/src/auth/verify-email.dto.ts was removed before this audit
  and is absent from the inspected repository. The controller still uses the real DTO at
  backend/src/auth/dto/verify-email.dto.ts. No source cleanup was performed by
  this documentation task.
- Frontend auth integration, password recovery/account-security workflows, and
  full business APIs are not established by this backend milestone.

## 16. Public Availability and Guest Website Boundaries

The availability route is public and throttled at 30 requests per 60 seconds.
DTO/date/capacity checks occur in the backend; the response contains room-type
availability and price fields, not guest identities or private reservations.
Read-only search creates no inventory hold. Any future booking writer must
revalidate availability/ownership/prices inside the acquisition transaction.

Guest pages format backend centavo amounts and resolve controlled image URLs.
Hooks suppress stale results but convert optional image/amenity errors into empty
content, which needs review under the pending UI-state step. Responsive and
keyboard acceptance remains pending. No dedicated availability test suite was
found and no fresh browser, lint, build, or application test run occurred here.

The owner reports seven quick availability-rule checks passed in another copy;
the temporary file was removed. This does not replace permanent regression
coverage or a successful local build/lint. See
[the backend verification report](IMPLEMENTATION_GUIDE.md#reported-backend-checks-for-steps-45)
for the reported Prisma-generation limitation and outstanding checks.
