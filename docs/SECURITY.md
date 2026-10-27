# NEXORA — Security Requirements

## 1. Security Approach

Apply security throughout development.

KISS means understandable security controls.
It does not mean removing required protection.

## 2. Authentication

Approved foundations:

- Passport and JWT.
- Argon2id password hashing.
- Short-lived access tokens.
- Rotating refresh tokens.
- Stored refresh-token hashes.

Implementation requirements:

- Validate token signature, expiry, and intended context.
- Reject disabled users.
- Revoke appropriate sessions after account-security changes.
- Rate-limit login and recovery operations.
- Avoid account-enumeration messages.
- Never log passwords or tokens.

Exact token transport, expiry values, and recovery flows remain TBD.

## 3. Authorization

Enforce both:

1. Role permission.
2. Access to the specific record.

Examples:

- A Guest may access only verified personal records.
- A Receptionist cannot grant Administrator access.
- Only Manager or Administrator may process refunds.
- Only Administrator manages staff accounts and settings.

Never trust client-supplied user IDs, roles, or ownership claims.

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

Choose and document one approved browser-session design.

If cookies carry credentials:

- Use appropriate Secure, HttpOnly, and SameSite settings.
- Protect state-changing requests against CSRF.
- Configure credentialed CORS for explicit origins.

If bearer tokens are used:

- Define secure storage and renewal behavior.
- Limit exposure to browser scripting and logs.

HTTPS is required in production.

CORS is not authentication.

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

- Missing/expired tokens are rejected.
- Disabled staff cannot continue privileged operations.
- Cross-guest record access fails.
- Public registration cannot create staff roles.
- Invalid webhook signatures fail.
- Duplicate events have one business effect.
- Client price tampering fails.
- Upload abuse is rejected.
- Secrets remain absent from responses and logs.
- Pending NFC revocations remain operationally visible.
