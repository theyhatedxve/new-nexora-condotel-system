# NEXORA | CI_CD_ROADMAP.md

**Version:** Proposed 2.0  
**Date:** November 15, 2026  
**Status:** DRAFT, pending owner approval  
**Authority:** `NEXORA_ARCHITECTURE_V2.1.md`, latest `AGENTS.md` checkpoint, and owner-approved `TECHNICAL_PLAN.md`  
**Execution boundary:** This document proposes architecture and release procedures. It does not authorize Docker files, GitHub Actions workflows, server changes, migrations, secrets creation, or deployment. Implement each approved task only after scoped `EggPie` authorization.

## 1. Scope, Baseline, and Decisions

### 1.1 Purpose

Define a future, secure and repeatable delivery pipeline for NEXORA's two React applications and shared NestJS API, covering local verification, continuous integration, containers, staging, manual production release, VPS operations, recovery, and release evidence.

### 1.2 Documented baseline versus proposed target

| Area | Documented baseline | Proposed target | Status |
|---|---|---|---|
| Guest web | React, JavaScript/JSX, Vite | Build immutable static assets | Design only |
| Admin web | React, JavaScript/JSX, Vite | Build immutable static assets | Design only |
| API | NestJS, TypeScript, Express | Long-running containerized API | Design only |
| Data | Prisma + SQLite development | Isolated PostgreSQL staging/production if separately approved | Migration not authorized |
| Payment | PayMongo Hosted Checkout, signed webhooks | Test credentials in staging, approved live configuration only in production | Live payments not authorized |
| Notifications | Existing email integration | Isolated test delivery in staging | Configuration TBD |
| NFC | Postponed | No physical NFC operations in staging or deployment | Out of scope |
| Automated workflows | No deployment workflow verified from uploaded files | GitHub Actions CI and controlled CD | Proposed only |
| Hosting | Provider, domains and VPS not selected | One or more VPS hosts with reverse proxy and persistent storage | Proposed only |

**Progress precedence:** The earlier `CI_CD_ROADMAP.MD` contains an outdated Phase 5 progress snapshot. The latest `AGENTS.md` records original Phases 1–8 and 10 as owner-confirmed complete; Phase 9 NFC postponed; Phase 11 testing/security paused and incomplete; Phase 12 production deployment deferred. Do not resume Phases 11 or 12 from this roadmap without explicit approval.

**Important distinction:** Approval of the broader technical plan does not select Docker, a VPS host, PostgreSQL, a production domain, or a live PayMongo account.

## 2. Target Delivery Architecture

```text
Developer workstation / feature branch
           |
       Pull request
           |
   GitHub Actions CI (no deploy secrets)
      /       |        \
 Guest build Admin build Backend + isolated DB tests
      \       |        /
        Required checks
           |
       Reviewed merge
           |
  Immutable release identity (commit SHA + artifact digest)
           |
    Staging approval/deployment
           |
 Staging migrations + health and business smoke checks
           |
     Explicit production approval
           |
  VPS pulls approved image digests over authenticated access
           |
 Back up -> compatible migration -> parallel deployment
           |
 Reverse-proxy traffic switch -> smoke checks -> monitor
```

Preserve the modular-monolith architecture. The backend remains one logical application. Deploy the guest and admin frontends as independently built static bundles. Containerization is an operational packaging decision, not a change to the application's approved framework or API architecture.

## 3. Twelve-Factor App Compliance Checklist

Record each item as **Verified**, **Gap**, **Not Applicable**, or **Pending Evidence** after inspecting the real repository and environments. All items below are proposed verification criteria, not completed checks.

| Factor | NEXORA compliance requirement | Verification evidence |
|---|---|---|
| I. Codebase | One tracked repository, identifiable commit for every release; environments run an approved revision | Commit SHA, release manifest |
| II. Dependencies | Explicit package dependencies and committed compatible lockfiles; deterministic installs; no unreviewed new packages | Lockfile audit, clean build |
| III. Config | Environment-specific API origins, database URLs, credentials and secrets outside code; no backend secrets in Vite variables | Sanitized config inventory, secret scan |
| IV. Backing services | Database, SMTP/email and PayMongo treated as separately configured services with explicit failures and timeouts | Connection tests, env map |
| V. Build/release/run | Build once per target public config; identify artifacts and migrations; promote immutable release identifiers | Artifact checksums/digests, deployment log |
| VI. Processes | API processes avoid in-memory authoritative booking/payment state; persistent state held in DB/services | Restart and concurrency tests |
| VII. Port binding | NestJS listens on configured interface/port; reverse proxy terminates public TLS; frontend static files served separately | Listener and proxy checks |
| VIII. Concurrency | Multiple API instances only after testing transaction-level inventory safety, session behavior and worker coordination | Concurrent reservation tests |
| IX. Disposability | Graceful SIGTERM handling; bounded shutdown; health checks; do not interrupt a migration mid-step | Controlled stop/start test |
| X. Dev/prod parity | Staging mirrors production database engine, Prisma version, Node runtime and external contracts as closely as practical | Environment parity report |
| XI. Logs | Structured, redacted stdout/stderr logs, centrally retained outside replaceable containers | Logging and secret-leak checks |
| XII. Admin processes | Seed/migration/reconciliation commands run as authorized, one-off, auditable jobs, never on every container start | Execution record and migration log |

Additional NEXORA-specific checks: transactional room inventory, webhook idempotency, retained financial/audit history, backups, guest/staff role segregation, and no real NFC demonstration claims.

## 4. Containerization Strategy (Proposed, Not Implemented)

### 4.1 Image and service boundaries

| Proposed image/service | Build inputs | Runtime responsibility | Persistence |
|---|---|---|---|
| `nexora-api` | `backend/`, locked dependencies, Prisma schema and generated client | NestJS API and provider webhooks | No local authoritative state |
| `nexora-guest-web` | `frontend/guest-web/` | Serve compiled guest static assets | Immutable assets |
| `nexora-admin-web` | `frontend/admin-web/` | Serve compiled admin static assets | Immutable assets |
| PostgreSQL service, if approved | Pinned database image or separately managed service | Durable relational data | Encrypted persistent volume/backups |
| Reverse proxy | Approved TLS/proxy configuration | HTTPS, domain routing, health-aware traffic switch | Certificates/config managed separately |

**Do not containerize SQLite as a shared production database.** SQLite remains the established development database. Use PostgreSQL in staging/production only after approved migration and cross-engine regression verification.

### 4.2 Backend multi-stage Dockerfile specification

The future backend Dockerfile should have these stages:

1. **Dependency stage:** Use a reviewed, pinned Node.js base image (prefer a digest); install locked dependencies with the existing package manager and repository lockfile layout. Reuse no host `node_modules`.
2. **Build stage:** Copy only required backend source, Prisma schema/config and approved assets. Generate Prisma Client using the actual Prisma 7 configuration, then compile NestJS TypeScript.
3. **Production-dependency stage:** Install or prune to runtime dependencies while preserving the Prisma engine/client needed by the selected platform.
4. **Runtime stage:** Use a minimal compatible image, non-root UID, read-only filesystem where viable, explicit work directory, configured port, graceful shutdown and health checks. Copy compiled output and required Prisma artifacts, not source secrets or local databases.

Requirements: multi-architecture support only if needed; deterministic builds; `.dockerignore` for `.env`, `dev.db`, local backups, reports, test fixtures and `node_modules`; no secrets in `ARG`, image layers, labels, build logs or bundled config.

**Prisma caution:** Validate runtime libc/OpenSSL compatibility and generated-client location for the actual Prisma version. Migration execution is a distinct controlled job, not a normal API entrypoint.

### 4.3 Frontend multi-stage Dockerfile specification

For each frontend independently:

1. **Dependencies stage:** Install locked packages for the correct app/workspace scope.
2. **Build stage:** Run the existing Vite production build with explicitly approved public environment values.
3. **Runtime stage:** Serve only the compiled static output through an approved static server or reverse proxy.

Use SPA fallback routing for React Router without swallowing genuine static asset errors. Apply appropriate cache policies: hashed assets may receive long immutable caching, while the HTML entrypoint must be revalidated. Do not embed private keys, user data or payment secrets in frontend assets.

Because Vite's public variables are normally compiled into the build, staging and production need separate verified builds from the same commit unless a separately approved runtime-public-config pattern is introduced.

### 4.4 Proposed Docker Compose topology

**Local integration profile:** three application services, disposable development/test database, optional test-only SMTP sink. No default access to production networks or real secrets.

**Staging profile:** guest, admin, API, reverse proxy, isolated PostgreSQL or equivalent approved backing database; PayMongo test credentials; sandbox email; synthetic identities; isolated image uploads.

**Production profile:** guest, admin, API, reverse proxy and a protected PostgreSQL database. Prefer externally managed database/storage when appropriate. Do not give web-facing services unrestricted DB network access. Use health checks, resource limits, log rotation and explicit named volumes where necessary.

Proposed Compose concerns: separate private app/database networks; environment-specific compose override or equivalent; secure secret injection; explicit image digests; no host-port exposure for the database; restart policy for app processes only; one-off migration service/job; service readiness checks rather than startup-order assumptions.

**No `Dockerfile`, Compose YAML, or infrastructure script is authorized or created by this document.** Their exact names and paths must be approved after actual repository inspection.

## 5. Environment Orchestration

### 5.1 Environment matrix

| Concern | Local development | Staging | Production (deferred) |
|---|---|---|---|
| Source | Developer worktree | Approved candidate commit | Approved release digest |
| Frontend | Vite local server | Optimized static build | Optimized static build |
| Backend | NestJS local process | Container/API service | Container/API service |
| Database | SQLite, preserved dev data | Isolated PostgreSQL if approved | Restricted PostgreSQL if approved |
| PayMongo | Test mode | Test mode | Live mode only with separate explicit approval |
| Email | Local test/provider config | Sandbox or controlled test | Approved delivery service |
| Guests/staff | Test records as needed | Synthetic/anonymized | Real records only after go-live approval |
| Webhooks | Secure test-accessible endpoint | Public HTTPS staging endpoint | Public HTTPS production endpoint |
| NFC | Postponed placeholder | Postponed placeholder | Deferred until hardware approval |
| Secrets | Local uncommitted configuration | Protected staging secrets | Separate protected production secrets |
| Data retention | Safe developer policy | Test data policy | Legally/operationally approved policy |

Do not copy production data or secrets into staging. If a future troubleshooting workflow needs real-like data, use approved irreversible anonymization and restricted access.

### 5.2 Configuration inventory

Confirm actual variable names against source before writing infrastructure. Categories include:

- Backend listen port and allowed origins.
- Frontend public API URL(s) and build identity.
- Database connection URL and pool/timeout settings.
- JWT signing material, refresh-token configuration, encryption keys.
- PayMongo environment, secret key, webhook verification secret and approved return URLs.
- SMTP/email service parameters.
- Log level, health/readiness options, trusted proxy and cookie/TLS settings.
- Reservation/payment reconciliation worker configuration, if the existing implementation supports it.

Track variable **names and purpose**, not secret values. Use per-environment access controls and rotation procedures.

### 5.3 Domains, DNS and TLS

Guest, admin and API hostnames are **TBD**. Conceptual `*.example` names in Architecture v2.1 are examples, not registered domains. Choose reverse-proxy provider, DNS owner, TLS certificate automation, proxy headers and CORS allowlist only at an approved infrastructure design stage. TLS 1.3 is preferred, securely configured TLS 1.2 compatibility may be considered. Keep guest and admin authentication boundaries separate.

## 6. GitHub Actions CI Requirements

### 6.1 Proposed workflow inventory

| Proposed workflow | Trigger | Responsibility | Required gate |
|---|---|---|---|
| `ci.yml` | Pull request and push to approved branches | Install, static checks, tests, builds, schema validation | Yes for merge |
| `release.yml` | Approved merge/tag/manual release request | Record SHA, build target-specific artifacts/images, produce manifest and digests | Yes for candidate |
| `deploy-staging.yml` | Trusted candidate with approval | Pull verified artifact, migrate staging, deploy and smoke-test | Yes before production |
| `deploy-production.yml` | Manual, release-specific approval only | Authorized VPS production deployment | Explicit human gate |
| `dependency-review.yml`, if warranted | Pull request | Identify license/security changes using existing permitted tools | According to approved policy |

Workflow names are proposals, not verified repository files.

### 6.2 CI job sequence

1. Checkout the exact SHA; configure a reviewed supported Node.js version and package manager.
2. Perform locked installs. Inspect the existing package scripts; do not fabricate script names.
3. Check lint/formatting where configured. Record missing checks instead of falsely passing them.
4. Build Guest Website and Admin Dashboard separately.
5. Validate Prisma using the actual `prisma7.config.ts` path when applicable; generate client and build NestJS.
6. Run existing Vitest unit suites and applicable HTTP-security tests.
7. Provision **disposable isolated** SQLite test files for existing suites. Never target `backend/dev.db` or an attached developer database.
8. After the production DB choice is approved, run PostgreSQL migration and integration jobs against disposable PostgreSQL instances.
9. Execute concurrency, inventory expiration and payment-event idempotency tests for the revised requirements when those tests exist.
10. Aggregate required checks, publish sanitized test results and block merge on failure.

Do not claim test coverage for a build-only check. The legacy `test:e2e` Hello World expectation documented in the original roadmap is a known issue, separate from the accepted HTTP-security suite.

### 6.3 Workflow security

- Read-only `GITHUB_TOKEN` permissions by default; elevate only for a specific trusted job.
- Pin external/reusable actions to reviewed full commit SHAs.
- Never expose deploy credentials to ordinary or fork pull request jobs.
- Avoid untrusted code in privileged event contexts.
- Prefer dedicated GitHub environments and least-privilege environment secrets.
- Limit workflow `timeout-minutes`, concurrency and artifact retention.
- Serialize production deployments; never automatically cancel an active migration.
- Protect main branch; require checks and review where available.
- Use image/release digests to prevent ambiguous mutable-tag deployment.
- Retain a release bill of materials or equivalent dependency evidence where supported without adding unapproved tooling.

### 6.4 Release manifest

Each candidate records: source SHA, workflow run, timestamp, Node/package versions, Prisma schema/migration revision, guest/admin public build configuration, backend image digest, frontend image/asset digests, checksums, test evidence, approver, and known limitations.

## 7. VPS Deployment Design: Pull over SSH

**Status:** Entire section is a proposed future design; VPS selection and production deployment remain deferred.

### 7.1 Host prerequisites

- Approved VPS vendor, region, sizing and OS baseline (TBD).
- Named owner for DNS, SSH access, secrets and backups.
- Unprivileged deployment identity with limited privilege elevation.
- SSH public-key authentication, hardened host access and restricted firewall.
- Supported Docker Engine/Compose plugin versions only after explicit authorization.
- Separate staging and production hosts preferred, or documented strong isolation if one host is approved.
- TLS reverse proxy and stable internal networks.
- Protected database connectivity, monitored persistent storage and tested backups.
- Accurate system time and UTC logging.
- Health/metrics collection and disk-capacity monitoring.

No SSH keys, firewall changes, host commands or server setup are to be executed from this plan.

### 7.2 Authenticated pull model

**Chosen proposed approach:** CI builds and signs/identifies trusted image artifacts; the VPS fetches the approved immutable image digests from a restricted registry. GitHub Actions does not transfer application source code and secrets to the server in a general-purpose build job.

Release trigger sequence:

1. Protected production approval identifies the exact release manifest and source SHA.
2. A narrowly scoped deployment job connects to the authorized host over SSH. Use host key pinning, least-privilege credentials and an approved secret store.
3. The host retrieves the approved release manifest and pulls exact image digests using restricted registry credentials.
4. The host verifies local artifacts and preflight checks.
5. Deployment operations run under an auditable release lock.
6. The host performs the approved migration, blue/green application swap and health checks, then records the result.

Alternative repository `git pull` on the server is **not** the default proposed model because it couples compilation, dependency installation and runtime deployment. If the owner selects repository-based pull instead, define a separately approved trusted-tag checkout and on-host build procedure.

### 7.3 Preflight gate

Before touching the active release:

- Confirm approver and target environment.
- Confirm exact image digests, target host and source SHA.
- Check free disk, memory, reverse proxy, backup storage and database connectivity.
- Confirm external integrations and required secrets are configured without printing them.
- Review pending migrations and schema compatibility.
- Prove a recent restorable backup, including expected recovery point.
- Confirm no conflicting deployment or reconciliation job is active.
- Inspect known issues and determine maintenance-window need.

Stop if a critical preflight fails.

## 8. Database Migration Choreography

### 8.1 SQLite to PostgreSQL transition

This is a separate approval-gated project, not an automatic effect of Docker adoption. It requires:

1. Final choice of production database and migration strategy.
2. A separately validated PostgreSQL Prisma schema/migration history, not a reuse of SQLite SQL.
3. Mapping and validation of data types, money as integer centavos, Philippine date semantics, unique constraints, foreign keys and indexes.
4. Historical identity, booking, payment, deposit, and audit reconciliation.
5. Production-like staging rehearsal and concurrency tests.
6. An approved cutover, fallback and data reconciliation procedure.

Never run development reset/schema-push commands on production.

### 8.2 Expand / migrate / contract for compatible changes

For near-zero-downtime releases, use the following pattern when feasible:

- **Expand:** Add backwards-compatible nullable columns/tables/indexes; preserve the old application's ability to read/write.
- **Deploy-compatible:** Release API code supporting both old and new representations and perform safe dual-read/write or compatibility translation only where explicitly designed.
- **Backfill:** Run bounded, restartable, audited background/one-off data migration with progress checks and reconciled totals.
- **Switch:** Enable the new behavior only after verification.
- **Contract later:** Remove obsolete schema and compatibility code in a separately approved later release.

Treat unique-index creation, NOT NULL changes and long migrations as lock-risk operations. Evaluate DB-specific online options rather than assuming they are nonblocking.

### 8.3 Migration job

Run exactly one approved migration job against the target DB. Review SQL and ensure backup readiness first. For the documented Prisma 7 workflow, the production migration application command is `prisma migrate deploy` with the approved configuration and target database. Do not run migrations automatically in every API container. Stop the release on migration failure.

**Critical:** Migration rollback is not equivalent to application rollback. Reversing data changes may lose newly created bookings or payment events. Prefer forward fixes or separately designed recovery with financial reconciliation.

## 9. Zero-Downtime Application Swap

### 9.1 Preconditions

"Zero downtime" is an operational objective, **not a guaranteed capability**. It requires all of the following:

- A reverse proxy capable of switching between healthy backend versions.
- Sufficient host capacity to run both versions concurrently.
- Compatible database schema and API/session behavior across versions.
- Idempotent webhooks and coordinated scheduled workers.
- Correct health/readiness checks and graceful shutdown.
- Static frontend asset/version compatibility.

If any condition is missing, use an approved short maintenance window and disclose expected availability impact.

### 9.2 Blue/green sequence

1. Keep **blue** serving traffic.
2. Pull and start **green** using the immutable approved digests and environment-specific configuration.
3. Run readiness checks against green without public traffic. Confirm database connectivity, API boot, auth guard behavior and webhook route readiness without creating real charges.
4. Ensure only the elected worker instance performs time-sensitive expiration/reconciliation tasks. Both versions must not independently process the same non-idempotent job.
5. Atomically route new traffic to green through the reverse proxy; preserve connection draining for blue.
6. Run non-destructive post-switch checks for guest, admin and API origins.
7. Monitor API errors, latency, authentication, inventory conflicts and payment/webhook processing.
8. Retain blue for a bounded rollback period, then stop it only after release acceptance.

**Frontend caveat:** Vite bundles contain baked public API configuration. Deploy matched guest/admin builds; serve historical hashed assets while old tabs remain open where practical. Keep API compatibility for active sessions and in-flight checkout returns.

### 9.3 Rollback decision

If green fails and schema remains backward-compatible, route traffic back to healthy blue and stop green. Do not reverse migrations automatically. If green wrote incompatible data or migration modified existing records destructively, stop and follow the separately rehearsed incident and recovery procedure. Preserve verified PayMongo events and reconcile bookings created during the failed release.

## 10. Staging Verification and Production Gates

### 10.1 Staging acceptance

Required applicable checks:

- Guest and admin entrypoints load and connect to the intended API.
- Authentication, refresh, logout, disabled user and ownership enforcement work.
- Five-role permissions are verified only once implemented and formally approved.
- Availability and inventory contention prevent overselling.
- Two-hour holds, expiration, retry and reconciliation obey the approved policy once implemented.
- PayMongo uses test mode; signed webhook, duplicate-event and late-payment handling are verified.
- Pay at Property confirmation, five-hour cancellation, no-show and late-checkout rules are verified once implemented.
- Deposit, charge approval and audit integrity are tested once implemented.
- Email uses controlled delivery; NFC remains a clearly labeled placeholder.
- Browser navigation, 404 fallback, accessibility and responsive layouts are checked.
- Backup/restore and migration rehearsals pass in an isolated environment.

No applicable item may be marked passed without observed evidence. Unimplemented work must be recorded as missing, not simulated success.

### 10.2 Production approval record

An authorized person reviews: release SHA/digests, migration SQL, staging evidence, security review, restore-tested backup, known defects, go/no-go recommendation, rollback boundaries and planned observation period. GitHub protected environments may provide approval gates where the repository plan permits; otherwise an equivalent documented, independent approval is required. A `workflow_dispatch` button alone is not adequate approval.

### 10.3 Post-release smoke checks

Use only non-destructive checks: guest/admin pages, trusted API readiness endpoint if implemented, CORS and origin settings, public room query, staff login boundary with approved test identity, provider webhook delivery health, and storage permissions. Do not perform real customer charges, destructive reservations, or physical NFC actions in smoke tests.

## 11. Reliability, Security, and Data Consistency

| Risk | Required mitigation and verification |
|---|---|
| Overlapping bookings during rollout | Atomic backend inventory operations; concurrency tests on the production DB engine |
| Duplicate webhooks | Provider event ID uniqueness, idempotent processing, verified signatures |
| Two-hour hold expiry with pending payment | Reconciliation before final inventory/payment decisions; preserve provider evidence |
| Mixed API versions | Compatible schema and contracts, graceful draining, staged cutover |
| Two workers running jobs | Single elected scheduler or DB-coordinated idempotent work; not assumed implemented |
| Staff privilege escalation | Backend RBAC/ownership checks, distinct environment secrets |
| Secret leakage | CI least privilege, redacted logs, no secrets in images/frontends/artifacts |
| Lost database data | Verified backups, restore rehearsal, no automatic rollback of data |
| Staging-to-production contamination | Separate accounts, DB, storage, SMTP, PayMongo keys |
| Guest privacy | Restricted access, synthetic staging data, encrypted backups |
| Migration lock or failure | Review SQL, stage rehearsal, bounded operations, stop-on-failure |
| Poor visibility | Health/readiness, structured logs, alert ownership and release record |

For NEXORA, security checks follow the existing `SECURITY.md` and the approved business requirements. Never weaken authentication or inventory protection to simplify deployment.

## 12. Backup, Observability, and Incident Response

### 12.1 Backup policy proposal

- Agree on recovery point objective (RPO) and recovery time objective (RTO) before production design.
- Back up databases and durable uploaded assets with tested consistency.
- Encrypt backups in transit/at rest, restrict restore access, and avoid copying real data into CI.
- Define retention and off-host copy policy after privacy/operational review.
- Rehearse restoration against a disposable environment.
- Record backup integrity and restore duration for release evidence.

### 12.2 Observability

Capture sanitized metrics/events for HTTP errors, API readiness, reservation conflicts, overdue holds, failed login rates, webhook delay/duplication, financial review backlog, notification failures, DB health, backups, disk utilization and release changes. Alert thresholds and monitoring products are **TBD**.

Do not include passwords, JWTs, raw tokens, encryption keys, private guest identity records or payment credentials in logs.

### 12.3 Incident choreography

1. Identify severity, affected release, active traffic and data-integrity risk.
2. Freeze new deployments and nonessential mutation jobs if justified.
3. Evaluate safe app traffic rollback separately from DB migration recovery.
4. Preserve transaction/webhook/audit evidence.
5. Apply approved rollback, forward fix or maintenance procedure.
6. Reconcile payments, reservations and deposits.
7. Verify health and notify authorized owner.
8. Record timeline, evidence and prevention actions.

## 13. Sequenced CI/CD Implementation Backlog

This backlog is distinct from the original NEXORA application phases and does not independently authorize deferred deployment work.

| Stage | Scope | Exit evidence | Gate |
|---|---|---|---|
| C0: Inventory | Inspect actual scripts, Node versions, lockfiles, Prisma config and workflow state | Verified baseline | Owner review |
| C1: Local checks | Make existing build/test commands reproducible without altering architecture | Clean isolated run | Scoped `EggPie` |
| C2: Pull request CI | Guest/admin/backend checks; disposable DB; required status reporting | Green/failing workflow demonstrations | Scoped `EggPie` |
| C3: Release security | Harden token permissions, action pins, artifacts, protected branch | Security review | Scoped `EggPie` |
| C4: Container design | Verify Docker feasibility, image stages, Compose topology and asset storage | Reviewed design | Separate approval |
| C5: Container implementation | Create approved Dockerfiles/Compose, local-only smoke test | Reproducible container build | Scoped `EggPie` |
| C6: Database parity | Approve PostgreSQL strategy; migration and concurrency rehearsal | Test records and restore proof | Separate DB approval |
| C7: Staging | Provision isolated services, secrets, test webhooks and email | Staging acceptance | Explicit approval |
| C8: Candidate releases | Immutable image digests and manifest, release verification | Signed/identified artifacts | Scoped `EggPie` |
| C9: VPS deployment design | Approve host, TLS, SSH, registry, migrations, reverse proxy and backup | Owner-approved runbook | Explicit infrastructure approval |
| C10: Production pipeline | Manual protected gate, pull-over-SSH, blue/green and health checks | Rehearsal only before go-live | Phase 12 must be resumed |
| C11: Production launch | Live configuration, reviewed cutover, post-release monitoring | Formal go-live acceptance | Separate production authorization |

The current authorized project target remains a **local prototype**. C7–C11 are future options, not scheduled implementation tasks.

## 14. Unresolved Decisions

| Decision | Why needed | Current status |
|---|---|---|
| VPS/hosting provider and region | Network, pricing, backups, support | TBD |
| Production/staging domain names | TLS, routing, PayMongo return/webhook URLs | TBD |
| Repository visibility and GitHub plan | Branch protection and environment reviewer capabilities | TBD |
| Node.js version and container image digests | Reproducibility and security updates | Inspect/approve |
| Package scripts and lockfile topology | Actual CI command sequence | Verify from source |
| Registry and artifact retention | Trusted pull deployment and auditability | TBD |
| Docker/Compose adoption | Additional operational stack approval | Not approved |
| PostgreSQL migration strategy | SQLite-to-production data portability | Not approved |
| Separate staging VPS versus shared isolated host | Security and operational cost | TBD |
| Reverse proxy/TLS solution | HTTPS and blue/green switching | TBD |
| VPS SSH deployment identity and host-key policy | Protected access | TBD |
| Public webhook ingress | Reliable PayMongo verification | TBD |
| Background worker ownership | Avoid duplicate expiry/reconciliation | Not established |
| Health/readiness endpoint contract | Traffic management | Verify source / design |
| RPO, RTO, backup retention | Recovery and operational commitments | TBD |
| Approver and maintenance windows | Release governance | TBD |
| Monitoring and alert ownership | Incident response | TBD |
| Live PayMongo authorization | Financial and legal readiness | Not authorized |
| Real NFC hardware integration | Explicitly postponed | Out of scope |

## 15. Maintenance Rules and Evidence Template

- Update the CI/CD document only after reviewing relevant sources and obtaining separate document-edit approval.
- Keep source-derived facts separate from proposals and simulation.
- Pin deployments to release identities rather than mutable source branches.
- Review action and base image security updates through normal CI and staging gates.
- Record migration ordering and tested restore procedure with every database-affecting release.
- Do not claim zero downtime unless the actual traffic switch and failure rehearsal demonstrate it.
- Do not replace historical checkpoints in `AGENTS.md`; append owner-approved evidence using project rules.
- Never modify `spec.md`.

Recommended release record:

| Field | Value to record |
|---|---|
| Release / source commit | TBD |
| Approved scope and approver | TBD |
| Artifact/image digests | TBD |
| CI run and exact checks | TBD |
| Staging test evidence | TBD |
| Target host/environment | TBD |
| Backup and restore evidence | TBD |
| Migration review/result | TBD |
| Blue/green readiness and cutover | TBD |
| Post-release smoke tests | TBD |
| Observed issues / rollback status | TBD |
| Next owner-approved action | TBD |

## 16. Sources and Conflict Handling

Reviewed project documents:

- `CI_CD_ROADMAP.MD` (original roadmap, including pipeline security, Prisma migration, release and recovery rules).
- `AGENTS.md` (latest owner-confirmed checkpoint, which supersedes the original roadmap's stale phase status).
- `NEXORA_ARCHITECTURE_V2.1.md` (approved modular-monolith stack, future PostgreSQL recommendation, conceptual domains and deferred hosting choices).
- `TECHNICAL_PLAN_APPROVED.md` (owner-approved proposed technical revision plan, local prototype priority and future business rules).
- `SECURITY.md` (authentication, authorization, payment and data protection requirements).
- `IMPLEMENTATION_GUIDE.md` (owner-execution boundaries and verification cautions).

Source files and the uploaded approved technical plan describe future production as **deferred**. This document expands the design for an eventual VPS release process without representing Docker, GitHub Actions, PostgreSQL deployment, live payments, DNS, zero-downtime swaps or production readiness as implemented or approved.

**Final status:** Proposed replacement content only. Existing `CI_CD_ROADMAP.MD` unchanged. No Docker, Compose, CI workflow, VPS, database or code changes performed.
