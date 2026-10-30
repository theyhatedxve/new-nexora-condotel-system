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
backend milestone; both frontend applications still contain starter screens.

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

## 9. Upload Security

For room images:

- Allowlist supported formats.
- Validate content as well as filename extension.
- Enforce size and resource limits.
- Generate safe storage names.
- Prevent path traversal.
- Keep uploaded content from executing as application code.
- Apply controlled public delivery for approved room images.
- Use durable production storage.

Sensitive documents, if later introduced, require separate access rules.

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

## 15. Production Hardening and Open Concerns

Phase 3 acceptance is not a production-readiness declaration. Phase 4 onward is
NOT STARTED / AWAITING APPROVAL.

- Verification currently consumes a credential on GET. Email clients and link
  scanners may prefetch it; review a confirmation interaction before launch.
  Keep query credentials out of proxy/access logs and analytics.
- Registration/resend catch SMTP failures without recording a monitoring event.
  Add approved safe delivery monitoring and recovery before deployment; never
  log credentials. Real SMTP/TLS delivery still needs environment acceptance.
- main.ts calls enableCors twice; inspect credentialed preflight behavior and
  deployment allowlists. The HTTP fixture does not cover this bootstrap path.
- bootstrap() still has no rejection handler. A prior inspection reported a
  no-floating-promises lint error; this task did not rerun lint.
- test/app.e2e-spec.ts still expects / to return Hello World! and imports the
  real AppModule without isolating Prisma. It is separate from npm run test and
  must be reviewed before treating npm run test:e2e as a valid release check.
- PrismaService uses a fixed runtime SQLite path while CLI reads DATABASE_URL;
  verify resolved targets before any authorized migration. PostgreSQL migrations,
  recovery, backups, deployment monitoring, and HTTPS remain deployment work.
- backend/src/auth/verify-email.dto.ts is an empty extra file; the controller
  uses backend/src/auth/dto/verify-email.dto.ts. No source cleanup was performed.
- Frontend auth integration, password recovery/account-security workflows, and
  full business APIs are not established by this backend milestone.
