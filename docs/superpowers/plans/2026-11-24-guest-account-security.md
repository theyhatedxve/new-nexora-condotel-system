# Guest account security implementation plan

**Approval:** Owner approved the chat proposal with EggPie on 2026-11-24. Execute in the current checkout; no commits, deployment, or development-database changes.

**Goal:** Guests can change their password, verify a replacement sign-in email, and recover a forgotten password.

**Architecture:** Extend the existing NestJS auth module and React guest auth feature. Reuse PasswordService, EmailService, realm origin checks, JWT sessionVersion, refresh revocation, DTO validation, and existing guest UI styles. One additive GuestCredentialToken table stores only hashed, purpose-bound, expiring credentials tied to the current session version.

**Constraints:** Guest accounts only; active status required; password changes require reauthentication; email stays unchanged until confirmation; public recovery acknowledgments are generic. Never change Guest contact/history records when changing sign-in email. Tokens expire after 30 minutes, are claimed transactionally once, and are invalidated by credential changes. Link GETs render confirmation only. No new dependencies.

## Tasks

- [x] Add isolated service/HTTP regression coverage for password replacement, email confirmation, recovery, expiry/replay, purpose/role/status restrictions, stale credentials, concurrency, email conflicts, rate limiting, origin checks, DTO validation, and session revocation. Observed the missing service failure before implementation. The public recovery timing regression also failed before its correction.
- [x] Add the token schema/migration, DTOs, guest credential service/controller, auth registration, and email delivery using the existing verification URL's guest origin. Generate Prisma without applying a development migration.
- [x] Add Account security, Forgot password, Reset password, and Confirm email pages. Wire protected/public routes, account navigation, login recovery link, accessible pending/error/success states, explicit confirmation, and local session invalidation. Remove credentials from the address bar and apply no-referrer policy.
- [x] Run focused isolated security suites, backend type/build checks, guest lint/build, and inspect the diff. Document migration/application commands, acceptance evidence, and remaining real SMTP/browser checks.

## Review and verification record

- Independent review identified the inherited 5-second client timeout and SMTP-dependent public recovery response timing. Both were corrected; the follow-up review reported no further actionable findings.
- Credential requests now use the existing 30-second email-request convention. Recovery acknowledges before lookup/delivery and continues best-effort processing in the server handler; no durable email queue was added. This limitation is documented in GUEST_ACCOUNT_SECURITY.md.
- Backend isolated tests, guest client-service checks, focused backend lint, guest lint/build, and backend build passed. The in-memory migration test preserves an existing account across the addition.
- Browser access was blocked by automatic review before opening the existing Brave window. No browser or real mailbox acceptance is claimed. The temporary Vite verification server was stopped.

## Review focus

- Concurrent credential writes and simultaneous token claims must not produce two successful changes.
- Email collision at confirmation rolls back token consumption and account/session changes.
- Wrong-purpose, superseded, expired, or credential-version-stale tokens never change accounts.
- Pending, disabled, and staff accounts cannot use guest recovery to bypass account status.
- SMTP failure never confirms an email change; public recovery never reveals account existence.

**Deployment:** Back up the stopped database before applying migrations with the existing prisma7.config.ts. The additive migration preserves existing records. Before rollback, stop API traffic; invalidate outstanding links and retain the token table until code rollback is verified. No destructive down migration is supplied.
