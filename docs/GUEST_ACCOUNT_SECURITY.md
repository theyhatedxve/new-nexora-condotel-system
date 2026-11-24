# Guest account security

Implemented source: 2026-11-24. The development database was not migrated or changed for this implementation.

## Guest journeys

- Signed-in guests choose **My Account** (`/account/security`) to change their password or request a sign-in email change. Both require the current password.
- A new email address becomes the sign-in address only after the guest explicitly confirms the emailed link at `/confirm-email`. The current email stays active until then. Guest/booking contact records are not rewritten.
- **Forgot password?** on the login page opens `/forgot-password`. Eligible active guest accounts receive a link to `/reset-password`. Pending, disabled, and staff accounts cannot use this recovery path.
- Passwords must be different from the current password, match their confirmation, and contain 12–128 characters.
- Completing any credential change increments sessionVersion, revokes refresh sessions and other unused credential links, and clears the current guest cookie. Existing access tokens fail validation immediately. Guests must sign in again.

## Setup

1. Stop the backend and back up the existing database using your established backup procedure. Keep the backup outside version control.
2. From `NEXORA/backend`, apply the additive migration and regenerate the client:

   ```powershell
   npx.cmd prisma migrate deploy --config prisma7.config.ts
   npx.cmd prisma generate --config prisma7.config.ts
   ```

3. Confirm existing backend email configuration: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. Do not put real credentials in documentation or source control.
4. `AUTH_VERIFY_URL` must point to the Guest Website's existing `/verify-email` route. Its origin is reused to construct `/reset-password` and `/confirm-email` links. It must match `AUTH_GUEST_ALLOWED_ORIGINS` and `AUTH_ALLOWED_ORIGINS`; guest/staff origins must differ. Production links require HTTPS. No new environment variable is required.
5. Restart the backend and Guest Website. Rebuild the backend first when using its production start command.

## Security and delivery behavior

- Tokens contain 32 random bytes. Only SHA-256 hashes are stored in the new GuestCredentialToken table, bound to purpose, user, and sessionVersion, with a 30-minute expiry. Tokens are claimed and credentials updated in one transaction. A conflict rolls back both.
- Each purpose allows one issuance per account per minute. Issuing a newer link invalidates older links of that purpose. HTTP throttles also limit requests. Credential changes invalidate outstanding recovery and email-change links.
- New emails put the token in a URL fragment, which is not sent to the web server. The page removes it from the address bar and requires explicit POST confirmation. Opening a link does not change an account. The website applies `no-referrer`.
- Recovery sends a generic HTTP 202 acknowledgment before account lookup or email delivery, so the response does not wait on account-specific SMTP work. Processing continues in the same server handler. This is best-effort delivery, not a durable queue; process shutdown or SMTP failure can lose a delivery. Guests can request another link after one minute.
- Email-change delivery errors leave the old sign-in email unchanged. Failed deliveries retire their links. An accepted SMTP message is not proof that a mailbox received it.
- Audit records store action/field names and session-revocation status, never passwords, raw tokens, or replacement email values.

## Verification

Backend, from `NEXORA/backend`:

```powershell
npm.cmd test -- src/auth/guest-credentials.spec.ts src/auth/guest-credentials.http.spec.ts src/auth/guest-credential-email.spec.ts src/auth/guest-credentials-migration.spec.ts src/auth/auth-realm.http.spec.ts src/users/staff-profile.spec.ts
npm.cmd run build
```

Guest Website, from `NEXORA/frontend/guest-web`:

```powershell
node scripts/test-guest-credentials.mjs
npm.cmd run lint
npm.cmd run build
```

The backend tests use temporary databases with synthetic data. Client checks use the real services with an Axios test adapter and make no network requests. Email tests mock SMTP. An in-memory migration check applies the new migration after inserting an existing account and confirms it is unchanged.

Remaining owner acceptance: apply the migration after backup, confirm delivery to a test mailbox, exercise all three browser journeys, and verify desktop/mobile layout and keyboard access. The automated browser attempt was blocked before accessing the existing browser window. No real password, email, or production account was changed.

## Rollback

Stop API traffic before rolling back the code. Keep the additive token table and migration history; the previous application does not read them. Do not reset the database or remove migration history. Outstanding guest credential links must remain unavailable after rollback; do not restore an old sessionVersion to make old credentials valid. If restoring a full database backup is necessary, follow the separate approved recovery procedure and account for all writes since that backup. No destructive down migration is included.
