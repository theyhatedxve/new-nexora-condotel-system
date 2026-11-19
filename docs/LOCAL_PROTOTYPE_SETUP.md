# NEXORA Local Prototype Setup

## Current packaging checkpoint

Updated 2026-11-18.

Phase 11 verification and the Phase 12 local prototype demonstration are
complete based on owner confirmation.

The accepted package includes environment templates, startup instructions,
a separate synthetic demo database, demonstration accounts and reservations,
and owner-verified database recovery.

The owner also confirmed the admin navigation scrolling correction.

Follow the Synthetic demo database section when demonstrating the system
against backend/nexora.demo.db.

## Local addresses

| Component | Address |
|---|---|
| Backend API | http://localhost:3000/api |
| Guest website | http://localhost:5175 |
| Admin website | http://localhost:5176 |

The current backend listens on port 3000 in `backend/src/main.ts`.

Use the explicit frontend port arguments below. The current admin Vite
configuration has an older default port.

## Prerequisites

- Windows PowerShell.
- Node.js 22.12 or later within the Node.js 22 release line.
- npm supplied with Node.js.
- The project source and all three package-lock.json files.
- The configured development database and its existing encryption keys.

The inspected installed NestJS, Prisma, and Vite versions support this
Node.js version range.

## Install dependencies

Run installation once for a fresh checkout, or when restoring dependencies.

Stop if any command fails.

```powershell
Set-Location 'D:\Web-JSX\NEXORA\backend'
npm.cmd ci
```

```powershell
Set-Location 'D:\Web-JSX\NEXORA\frontend\guest-web'
npm.cmd ci
```

```powershell
Set-Location 'D:\Web-JSX\NEXORA\frontend\admin-web'
npm.cmd ci
```

Generate the Prisma client after backend dependency installation.

```powershell
Set-Location 'D:\Web-JSX\NEXORA\backend'
npx.cmd prisma generate --config .\prisma7.config.ts
```

For a new demonstration database, follow the approved synthetic demo
initialization procedure. For an existing initialized demo database,
use its startup target without rerunning initialization.

## Configure private environment files

Each application reads its own `.env`.

| Application | Private configuration |
|---|---|
| Backend | backend/.env |
| Guest website | frontend/guest-web/.env |
| Admin website | frontend/admin-web/.env |

For an application missing `.env`, copy its `.env.example` to `.env`.
Fill the private backend values before starting the application.

For existing installations, merge required settings into the working
configuration and preserve the existing credentials and encryption keys.

Set both database URLs to the same intended database.

```dotenv
DATABASE_URL=file:D:/Web-JSX/NEXORA/backend/dev.db
NEXORA_RUNTIME_DATABASE_URL=file:D:/Web-JSX/NEXORA/backend/dev.db
```

The backend requires:

- JWT_ACCESS_SECRET containing at least 32 bytes.
- AUTH_ALLOWED_ORIGINS containing both frontend origins.
- The saved guest-phone key ID and JSON key map.

The phone key map has this structure:

```json
{"phone-v1":"BASE64_ENCODED_32_BYTE_KEY"}
```

Replace the example value with the existing saved key. Retain older key
entries needed by encrypted records and backups.

Configure these features before demonstrating them:

| Feature | Required settings |
|---|---|
| Guest verification email | SMTP settings and AUTH_VERIFY_URL |
| Staff invitations | SMTP settings and STAFF_SETUP_URL |
| Booking email processing | SMTP settings, NEXORA_GUEST_WEB_URL, and email worker |
| Online checkout | PayMongo test secret and PAYMONGO_RETURN_URL |
| Payment webhook verification | PayMongo test webhook secret |

A provider-accessible webhook URL must forward to
`/api/webhooks/paymongo` for end-to-end PayMongo test delivery.

Both frontend `.env` files use:

```dotenv
VITE_API_URL=http://localhost:3000/api
```

Backend-only secrets belong in the private backend configuration.

## Start the three applications

Open three separate PowerShell terminals.

### Terminal 1 — Backend

```powershell
Set-Location 'D:\Web-JSX\NEXORA\backend'

$env:NODE_ENV = 'development'
$env:NEXORA_RUNTIME_DATABASE_URL = 'file:D:/Web-JSX/NEXORA/backend/dev.db'
$env:AUTH_ALLOWED_ORIGINS = 'http://localhost:5175,http://localhost:5176'
$env:NEXORA_BOOKING_DEADLINE_WORKER_ENABLED = 'false'
$env:NEXORA_BOOKING_EMAIL_WORKER_ENABLED = 'false'

if (-not (Test-Path -LiteralPath '.\dev.db' -PathType Leaf)) {
    throw 'The configured development database is missing.'
}

npm.cmd run start:dev
```

### Terminal 2 — Guest website

```powershell
Set-Location 'D:\Web-JSX\NEXORA\frontend\guest-web'

$env:VITE_API_URL = 'http://localhost:3000/api'

npm.cmd run dev -- --port 5175 --strictPort
```

### Terminal 3 — Admin website

```powershell
Set-Location 'D:\Web-JSX\NEXORA\frontend\admin-web'

$env:VITE_API_URL = 'http://localhost:3000/api'

npm.cmd run dev -- --port 5176 --strictPort
```

Environment variables already set in a terminal take precedence over
values loaded from `.env`. After configuration changes, update the
terminal variables or use a fresh terminal, then restart the application.

## Background workers

The startup baseline sets both workers to false.

- Booking deadlines require the deadline worker for automatic processing.
- Queued booking emails require the email worker for automatic delivery.

For an approved demonstration of automatic processing, stop the backend,
set the relevant worker variable to `true`, and start it again.

The email worker also requires working SMTP settings and the guest
website URL.

## Owner startup checks

1. Open the guest website on port 5175.
2. Open the admin website on port 5176.
3. Sign in using existing configured accounts.
4. Confirm rooms and reservations load.
5. Open Guest Accounts as Admin or Super Admin.
6. Open a known guest record and confirm its phone number displays.
7. Confirm staff invitation links use port 5176.
8. Verify the enabled email and payment demonstrations separately.

## Build checks

Run from the project root.

```powershell
Set-Location 'D:\Web-JSX\NEXORA'

npm.cmd --prefix backend run build
npm.cmd --prefix frontend/guest-web run build
npm.cmd --prefix frontend/admin-web run build
```

Stop and resolve any failed command before continuing.

## Shutdown

Press Ctrl+C in each application's terminal.

Stop the backend and close database tools before performing the
documented stopped-service backup procedure.

## Recovery materials

Preserve:

- A verified database backup.
- Every encryption key required by that backup.
- The compatible source revision and lockfiles.
- Private environment configuration in protected storage.
- Uploaded room-image files.

The completed database recovery check covered SQLite integrity,
foreign keys, preserved table counts, phone decryption, and owner
browser acceptance. Uploaded room images require separate recovery
coverage.

## Current limitations

- NFC functionality is postponed.
- Production deployment is deferred.
- The backend currently listens on port 3000.
- The explicit frontend startup commands select ports 5175 and 5176.
- Automatic deadlines and queued booking emails depend on their workers.
- Email demonstrations require working SMTP configuration and a controlled inbox.
- Online payment demonstrations require PayMongo test configuration
  and a working webhook delivery arrangement.
- Demo email addresses and phone values are synthetic.
- Existing databases and backups require their saved encryption keys.
- Uploaded room-image files require separate backup and recovery coverage.

## Owner acceptance — 2026-11-18

The owner confirmed completion of:

- Local configuration and startup checks.
- Synthetic demo database initialization.
- Staff and guest account access checks.
- Guest Accounts visibility, including accounts without reservations.
- Sample booking and pricing verification.
- Eligible staff reservation workflows.
- Database backup and restoration checks.
- Encrypted guest-phone recovery checks.
- Browser journey and accessibility checks.
- The admin navigation scrolling correction.

These results are owner-reported acceptance.
Exact automated test counts should be added only from retained test output.

## Continuation

The local prototype demonstration is owner-accepted.
The owner selects any subsequent maintenance or enhancement task.

Current project status is recorded in
[MD_Files/AGENTS.md](MD_Files/AGENTS.md).

## Synthetic demo database

The dedicated demo database is:

`D:\Web-JSX\NEXORA\backend\nexora.demo.db`

The initializer requires:

- Development mode.
- Both database URLs pointing to that exact file.
- NEXORA_ALLOW_DEMO_SEED=true.
- A migrated database without existing business data.
- Working guest-phone encryption configuration.

All seed data is inserted in one transaction. A failed seed transaction
rolls back its data changes. Prisma migration history remains available
for another seed attempt.

A successful seed creates:

- One synthetic property.
- Five roles.
- Eight accounts.
- Four guest profiles.
- Three room categories.
- Nine ready rooms.
- Twelve rental rates.
- Four pending Pay at Property reservations.

The active accounts are prepared for immediate demonstration login.
Pending and disabled guest accounts demonstrate account-status filters.

### Demo accounts

All accounts use the synthetic demonstration password:

`NexoraDemo!2026`

| Email | Role | Status |
|---|---|---|
| superadmin@nexora.example | Super Admin | Active |
| admin@nexora.example | Admin | Active |
| manager@nexora.example | Manager | Active |
| reception@nexora.example | Receptionist | Active |
| guest@nexora.example | Guest | Active |
| newguest@nexora.example | Guest | Active |
| pending@nexora.example | Guest | Pending |
| disabled@nexora.example | Guest | Disabled |

The pending and disabled accounts cannot sign in.

The guest@nexora.example account owns the four sample reservations.
The other three guest accounts have zero reservations.

The .example email addresses and 000-000-0001 phone value are synthetic.
Use a controlled development inbox when demonstrating email delivery.

### Demo rates

Amounts in this table are Philippine pesos per rental unit.

| Category | Hourly | Nightly | Weekly | Monthly |
|---|---:|---:|---:|---:|
| Deluxe Room | 500 | 4,500 | 28,000 | 90,000 |
| Executive Room | 650 | 5,800 | 35,000 | 115,000 |
| Suite | 850 | 7,500 | 45,000 | 150,000 |

Each category includes two occupants.

Maximum occupancy is three for Deluxe and Executive, and four for Suite.

Extra-person fees per additional occupant per rental unit are:

| Rental type | Fee in PHP |
|---|---:|
| Hourly | 100 |
| Nightly | 500 |
| Weekly | 2,500 |
| Monthly | 8,000 |

These values are synthetic demonstration rates.

### Sample reservations

All four reservations belong to guest@nexora.example and arrive at
3 PM Philippine time.

| Rental | Category | Units | Occupants | Arrival offset |
|---|---|---:|---:|---|
| Hourly | Deluxe Room | 3 | 2 | Seed date + 2 days |
| Nightly | Executive Room | 2 | 3 | Seed date + 3 days |
| Weekly | Suite | 1 | 4 | Seed date + 4 days |
| Monthly | Deluxe Room | 1 | 2 | Seed date + 5 days |

Expected accommodation totals, including configured extra-person fees:

- Hourly — PHP 1,500.
- Nightly — PHP 12,600.
- Weekly — PHP 50,000.
- Monthly — PHP 90,000.

Reservation references are generated during initialization.

The bookings follow normal time-based eligibility rules. Use a newly
created booking with suitable arrival timing when demonstrating check-in.

### Demo startup target

Use the regular frontend startup commands.

In the backend terminal, set:

```powershell
$env:DATABASE_URL = 'file:D:/Web-JSX/NEXORA/backend/nexora.demo.db'
$env:NEXORA_RUNTIME_DATABASE_URL = 'file:D:/Web-JSX/NEXORA/backend/nexora.demo.db'
$env:ROOM_IMAGE_STORAGE_DIR = 'D:/Web-JSX/NEXORA/storage/demo-room-images'
```

Keep the existing private encryption keys available while using this
database and its backups.

Room photographs can be added through the normal admin image workflow.
The initializer creates room categories and amenities without image records.
