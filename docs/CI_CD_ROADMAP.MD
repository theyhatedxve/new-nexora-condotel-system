# NEXORA — CI/CD Roadmap

> Architecture reference: NEXORA Master Architecture v2.1.
> Status: Proposed development and deployment roadmap.
> Implementation: Requires approval for each specific step.
> Hosting provider, production domains, and deployment commands: TBD.

## 1. Purpose

CI/CD helps NEXORA detect problems before releasing updates.

This roadmap covers:

- Automated code checks.
- Frontend and backend builds.
- Automated tests.
- Database validation.
- Pull request checks.
- Staging deployment.
- Manually approved production deployment.
- Recovery after failed releases.

Writing this document does not configure GitHub Actions or deploy the application.

## 2. Meaning of CI/CD

### 2.1 Continuous Integration — CI

Automatically check proposed code changes.

For NEXORA, CI should verify:

1. Dependencies install correctly.
2. Formatting and lint checks pass.
3. Relevant tests pass.
4. Both React applications build.
5. The NestJS application builds.
6. Prisma configuration and schema validate.

### 2.2 Continuous Delivery — CD

Prepare a tested release for deployment.

Production deployment requires an authorized person's approval.

NEXORA initially follows Continuous Delivery.

Automatic production deployment is not part of this proposed workflow.

## 3. Architecture Alignment

| Area | NEXORA requirement |
|---|---|
| Guest frontend | React + JavaScript/JSX + Vite |
| Admin frontend | React + JavaScript/JSX + Vite |
| Backend | NestJS + Express + TypeScript |
| Database access | Prisma |
| Development database | SQLite |
| Production database | PostgreSQL recommended |
| Online payments | PayMongo Hosted Checkout |
| Offline payments | Pay at Property |
| NFC | Simulation until compatible hardware is selected and tested |

CI/CD must preserve these architectural decisions.

Do not introduce frontend TypeScript or replace existing test tools
as part of pipeline setup.

## 4. Target Workflow

```text
Developer changes code
         ↓
Runs local checks
         ↓
Pushes feature branch
         ↓
Opens pull request
         ↓
GitHub Actions runs CI
         ↓
Checks pass and code is reviewed
         ↓
Merge into the protected main branch
         ↓
Prepare an identified release
         ↓
Deploy to staging
         ↓
Run staging verification
         ↓
Authorized production approval
         ↓
Deploy approved release
         ↓
Run production smoke checks
         ↓
Monitor and record outcome
```

A green CI result is necessary for release.
It does not prove every operational requirement has been satisfied.

## 5. Project Locations

```text
NEXORA/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── deploy-staging.yml
│       └── deploy-production.yml
├── frontend/
│   ├── guest-web/
│   └── admin-web/
├── backend/
│   ├── src/
│   └── prisma/
└── docs/
    └── CI_CD_ROADMAP.md
```

Workflow filenames are proposed.

Create each workflow only when its implementation step is approved.

## 6. Stage 1 — Review Existing Project Scripts

### Steps

1. Inspect each package.json.
2. Inspect committed lockfiles.
3. Check the installed Node.js requirements.
4. Identify existing lint, formatting, test, and build scripts.
5. Inspect Prisma configuration and its filename.
6. Run the existing checks locally.
7. Document missing scripts before adding them.

### Important Rules

- Use compatible, explicitly selected Node.js versions.
- Use the project's existing package manager.
- For npm projects, use npm ci with committed compatible lockfiles.
- Respect the actual lockfile layout.
- Do not assume every application has an independent lockfile.
- Do not use watch-mode tests in CI.

### Pass Condition

A clean checkout has a documented, repeatable installation and check process.

Reference:
[GitHub Node.js build and test guidance](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)

## 7. Stage 2 — Frontend CI

Run separate checks for:

- frontend/guest-web
- frontend/admin-web

### Proposed Check Sequence

1. Check out the code.
2. Configure the approved Node.js version.
3. Install locked dependencies.
4. Check formatting.
5. Run linting.
6. Run configured frontend tests in non-watch mode.
7. Build the application.

### Expected Results

- React JavaScript/JSX builds successfully.
- No unresolved imports.
- Required tests pass.
- Formatting and linting pass.
- Public API configuration is valid for the target build.

Do not silently skip required checks with optional-script flags.

If frontend tests have not been implemented, record that limitation.
A successful build must not be reported as successful test coverage.

## 8. Stage 3 — Backend CI

### Proposed Check Sequence

1. Check out the code.
2. Configure Node.js.
3. Install locked backend dependencies.
4. Configure disposable test settings.
5. Validate the Prisma schema.
6. Generate Prisma Client when required by the build.
7. Check formatting and linting.
8. Run configured unit tests.
9. Run applicable database/API integration tests.
10. Build NestJS.

Exact commands depend on the installed Prisma version and package scripts.

If Prisma uses a custom configuration filename, provide its explicit path.

### Expected Results

- Prisma validation succeeds.
- Generated imports resolve.
- NestJS TypeScript compiles.
- Required backend tests pass.
- Tests do not depend on a developer's local database.

Schema validation does not create tables or prove migration correctness.

## 9. Stage 4 — Database Integration Checks

### Development Checks

Use disposable SQLite databases where appropriate.

Verify:

- Relationships.
- Unique constraints.
- Monetary values in centavos.
- Philippine calendar-date handling.
- Reservation transitions.
- Transaction rollback.
- Hold expiration.
- Conflicting inventory requests.

### Production Compatibility Checks

Before production readiness, test against PostgreSQL if it is selected
for production.

Use the approved PostgreSQL schema and migration history.

Do not apply SQLite migration SQL directly to PostgreSQL.

Verify:

- Clean database migration.
- Upgrade from the previous supported schema.
- Existing-record compatibility.
- Inventory concurrency behavior.
- Backend integration tests.

Never use the production database for ordinary CI tests.

## 10. Stage 5 — Pull Request Protection

### Proposed Rules

1. Require successful CI before merging.
2. Require code review where the team structure permits it.
3. Resolve outstanding review discussions.
4. Restrict direct changes to the main branch.
5. Revalidate changes against the latest target branch.
6. Keep required check names stable.

Inspect GitHub plan and repository capabilities before configuring rules.

For a solo developer, document the release-review responsibility explicitly.

### Required Check Groups

| Group | Purpose |
|---|---|
| Guest frontend | Verify public application |
| Admin frontend | Verify staff application |
| Backend | Verify API application |
| Database integration | Verify data and inventory behavior |
| CI result | Report whether all required checks passed |

Initially, run all application checks for code changes.

Introduce path-based optimization only when it preserves reliable
required-check behavior.

## 11. Stage 6 — Workflow Security

- Give CI read-only repository permissions by default.
- Grant additional permissions only to jobs that need them.
- Pin reusable actions to reviewed full commit SHAs.
- Review dependency and action updates.
- Keep deployment credentials out of pull request jobs.
- Do not execute untrusted pull request code with privileged credentials.
- Avoid privileged trigger patterns for ordinary build/test workflows.
- Set job timeouts.
- Keep secrets and private records out of logs and artifacts.

Cancel superseded CI runs when appropriate.

Serialize production releases.
Do not automatically cancel an in-progress production migration.

Reference:
[GitHub Actions secure use guidance](https://docs.github.com/en/actions/reference/security/secure-use)

## 12. Stage 7 — Release Artifacts

A release artifact is the prepared application output for a specific release.

Record:

- Source commit SHA.
- Workflow run identity.
- Node.js and package versions.
- Guest frontend build.
- Admin frontend build.
- Backend build.
- Migration set.
- Build-time public configuration.
- Artifact checksums or equivalent identifiers.

Only trusted, successful builds may produce deployable releases.

Do not deploy artifacts supplied by an untrusted pull request.

### Frontend Configuration

Vite public environment values are included at build time.

If staging and production use different API URLs:

- Build each frontend for its target environment from the same approved commit.
- Record the configuration used.
- Verify the production-specific output before promotion.

Alternatively, approve a runtime public-configuration approach.

Never place backend secrets in a frontend build.

## 13. Stage 8 — Staging Environment

Staging is a separate environment for checking a release before production.

### Requirements

- Separate database.
- Separate credentials.
- PayMongo test-mode configuration.
- Test guest and staff accounts.
- Synthetic or safely anonymized data.
- Separate upload storage.
- Clearly identified NFC simulation.

Production payment credentials and real door access must not be used
for routine staging tests.

### Deployment Sequence

1. Select a release from a trusted commit.
2. Confirm CI passed.
3. Review migration requirements.
4. Apply approved staging migrations.
5. Deploy the compatible backend and frontends.
6. Run health and smoke checks.
7. Record the result.

The hosting-specific deployment commands remain TBD.

## 14. Stage 9 — Staging Acceptance Checks

Verify applicable implemented features:

| Area | Required check |
|---|---|
| Guest website | Loads and reaches the API |
| Admin dashboard | Loads and enforces sign-in |
| Authentication | Login, refresh, logout, disabled-account behavior |
| Authorization | Wrong roles and cross-guest access are rejected |
| Rooms | Public and staff data match their permissions |
| Reservations | Booking and assignment rules work |
| Inventory | Concurrent requests cannot oversell |
| Payments | Test-mode verification and duplicate handling work |
| Check-out | Cleaning and revocation follow-up are recorded |
| Uploads | Valid images work; invalid uploads fail |
| NFC | Simulation remains visibly identified |

Do not mark unimplemented features as tested.

Hardware integration needs a separate physical acceptance process.

## 15. Stage 10 — Production Approval

Production deployment requires a recorded approval for a specific release.

Before approval, present:

- Commit and artifact identities.
- Changes included.
- CI and staging results.
- Database changes.
- Backup status.
- Known limitations.
- Recovery procedure.

Use protected GitHub environments with required reviewers where supported.

Environment protection availability depends on repository visibility
and GitHub plan.

If that mechanism is unavailable, approve an equivalent controlled release
process before production deployment.

A manual workflow-start button alone is not an independent review gate.

Reference:
[GitHub deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)

## 16. Stage 11 — Production Deployment

### Steps

1. Verify approval matches the selected release.
2. Verify production configuration.
3. Confirm backup and restoration readiness.
4. Coordinate any required maintenance window.
5. Run approved database migrations.
6. Deploy the compatible backend.
7. Deploy the guest and admin applications.
8. Run non-destructive smoke checks.
9. Monitor application and integration health.
10. Record the release outcome.

Exact ordering depends on schema compatibility.

Prefer changes that allow old and new application versions to work during
deployment.

For incompatible changes, prepare a reviewed maintenance or staged migration
procedure.

## 17. Database Migration Rules

For the project's Prisma Migrate version, use reviewed migration files
and the appropriate production deployment command.

For the Prisma 7 workflow, migrate deploy applies pending migrations.

Before running it:

1. Verify the target database.
2. Review migration SQL.
3. Rehearse on staging.
4. Confirm backup readiness.
5. Check old/new application compatibility.
6. Run one controlled migration process.
7. Stop deployment if migration fails.

Do not use development reset or schema-push commands as the production
migration procedure.

Prisma Client generation is a separate build concern.

Reference:
[Prisma 7 migrate deploy](https://docs.prisma.io/docs/cli/v7/migrate/deploy)

## 18. Secrets and Environment Configuration

| Configuration | Location |
|---|---|
| Public frontend API URL | Target frontend build/runtime configuration |
| Database credentials | Protected backend/deployment secret storage |
| JWT signing material | Backend secret storage |
| PayMongo secret key | Backend secret storage |
| Webhook verification secret | Backend secret storage |
| NFC cryptographic material | Approved protected backend/device storage |
| Deployment credentials | Restricted deployment environment |

Separate staging and production secrets.

Prefer short-lived deployment credentials when supported by the selected host.

Never upload environment files or database backups as ordinary build artifacts.

## 19. Production Smoke Checks

Use non-destructive checks.

Verify:

- Guest website responds.
- Admin website responds.
- Backend health endpoint responds.
- Frontends reach the correct API.
- Authentication boundaries remain enforced.
- Public room queries work.
- Required storage is available.
- Background processing and reconciliation are healthy.

Do not make real charges or unlock guest rooms as automated smoke tests.

## 20. Failure and Recovery

### CI Failure

1. Block merging or release.
2. Read the failed check.
3. Correct the underlying problem.
4. Rerun relevant checks.

### Staging Failure

1. Stop production promotion.
2. Identify application, migration, or configuration failure.
3. Correct and retest.
4. Produce a new release when code changes.

### Production Failure

1. Stop further deployment.
2. Assess service and data impact.
3. Restore a compatible previous application release when safe.
4. Use the reviewed migration recovery procedure.
5. Recheck health and integrations.
6. Record the incident.

Application rollback does not automatically reverse database migrations.

Prefer a safe forward correction for database problems when appropriate.

Do not restore an old database backup blindly.
It may remove reservations or payments recorded after the backup.

Reconcile external payment and NFC effects after recovery.

## 21. Monitoring After Release

Monitor:

- API errors and response times.
- Login failures.
- Inventory conflicts.
- Failed or delayed payment events.
- Refund processing.
- Pending NFC commands.
- Database health.
- Storage failures.
- Backup outcomes.

Alert recipients, thresholds, and tools remain TBD.

A completed deployment job does not prove the application remains healthy.

## 22. Relationship to the 12 Development Phases

| Architecture phase | CI/CD contribution |
|---|---|
| 01 — Foundation | Repeatable installs, builds, basic CI |
| 02 — Database | Schema and migration checks |
| 03 — Authentication | Session and permission tests |
| 04 — Rooms | Inventory-management tests |
| 05 — Guest Website | Frontend and responsive checks |
| 06 — Reservations | Booking, hold, and concurrency tests |
| 07 — Payments | Verified event and refund tests |
| 08 — Admin Dashboard | Staff workflow checks |
| 09 — NFC | Simulation and later hardware acceptance |
| 10 — Reports & Settings | Report and policy tests |
| 11 — Testing & Security | Integrated release verification |
| 12 — Deployment | Approved staging/production delivery |

CI/CD supports the architecture.
It does not replace its phase approvals.

## 23. Implementation Checklist

### Initial CI

- [ ] Verify package scripts and lockfiles.
- [ ] Select compatible Node.js version.
- [ ] Add guest frontend checks.
- [ ] Add admin frontend checks.
- [ ] Add backend checks.
- [ ] Add disposable database tests.
- [ ] Confirm failing checks block release.
- [ ] Configure pull request protection.

### Staging

- [ ] Select hosting.
- [ ] Prepare separate configuration and storage.
- [ ] Prepare PostgreSQL checks if selected.
- [ ] Define release artifact identities.
- [ ] Add staging deployment.
- [ ] Add staging acceptance checks.

### Production

- [ ] Approve deployment protection.
- [ ] Configure restricted secrets.
- [ ] Rehearse migrations and recovery.
- [ ] Verify backups and restoration.
- [ ] Add controlled production deployment.
- [ ] Add non-destructive smoke checks.
- [ ] Configure monitoring.
- [ ] Record the first approved release.

## 24. Outstanding Decisions

- GitHub repository visibility and available protection features.
- Final Node.js version.
- Exact package scripts.
- Workflow action versions and pinned SHAs.
- Hosting provider.
- Production database choice.
- PostgreSQL migration strategy.
- Deployment domains.
- Artifact storage and retention.
- Release approver.
- Backup retention and recovery objectives.
- Monitoring tools and alert ownership.
- Physical NFC acceptance environment.

## 25. Completion Record

For every approved CI/CD implementation step, record:

```text
Stage:
Approved scope:
Files changed:
Workflow run:
Commit SHA:
Checks executed:
Actual results:
Deployment environment:
Migration outcome:
Known limitations:
Recovery readiness:
Next proposed step:
```