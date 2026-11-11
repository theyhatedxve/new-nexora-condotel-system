# NEXORA — Coding Principles

## 1. Purpose and Scope

Write code that is easy to understand, review, test, secure, and maintain.
Apply engineering principles to actual problems, not as a reason to add unnecessary layers.

These principles cover four distinct development contexts: **Mobile Development**, **Website Development**, **Web-App Development**, and **App Development (Desktop and Native)**. The platform-specific sections are engineering guidance, not authorization to expand NEXORA's approved product scope.

**Project authority:** [NEXORA_ARCHITECTURE_V2.1.md](NEXORA_ARCHITECTURE_V2.1.md) governs architecture and approved technology. [AGENTS.md](AGENTS.md) governs current owner-confirmed progress. If a general principle suggests changing the approved architecture, propose the change for owner review instead of silently implementing it.

## 2. Core Code-Quality Principles

### 2.1 SOLID

**Single Responsibility (SRP).** A module, class, or function should have one clear responsibility.

- Controller: HTTP input and output.
- DTO: request validation.
- Reservation service: reservation rules.
- Payment adapter: provider communication.
- React component: one coherent interface responsibility.

Avoid a controller that validates inventory, calculates prices, calls PayMongo, and writes audit records directly.

**Open/Closed (OCP).** Extend behavior through a clear boundary once a real variation is established. A selected NFC hardware adapter should implement the approved device boundary. Do not invent a generic multi-provider framework in advance.

**Liskov Substitution (LSP).** Implementations of a shared contract must preserve its promises. A simulated NFC adapter must report simulation, never claim a physical door unlocked. A physical adapter must report failure when it cannot complete an operation.

**Interface Segregation (ISP).** Give consumers only the capabilities they need. Public room listings should not depend on staff-only guest or payment-management operations. Avoid oversized service contracts.

**Dependency Inversion (DIP).** Business rules should depend on stable boundaries where external details vary. Payment logic uses the PayMongo integration boundary, NFC authorization uses its approved hardware adapter, and NestJS dependency injection supplies implementations. Direct Prisma use in a focused service remains acceptable when a repository layer adds no practical benefit.

### 2.2 DRY: Don't Repeat Yourself

Keep authoritative business knowledge in one appropriate place.

- Backend pricing and reservation transition rules.
- Reusable Axios configuration and shared formatting utilities.
- Application-specific CSS design tokens.

Frontend usability validation and backend enforcement are both appropriate because they serve different trust boundaries. Do not merge unrelated features merely because their code looks similar.

### 2.3 KISS: Keep It Simple

Prefer clear names, focused functions, explicit conditions, small modules, direct control flow, and minimal dependencies.

Avoid deep inheritance, unnecessary factories, generic CRUD frameworks, premature microservices, and clever code that requires repeated explanation. Simplicity must preserve correctness and security.

### 2.4 YAGNI: You Aren't Gonna Need It

Implement approved current needs, not speculative features.

- One property, not an unapproved multi-tenant platform.
- Flat nightly rates, not an unapproved dynamic-pricing engine.
- PayMongo, not a payment-gateway marketplace.
- Explicit NFC simulation until approved devices are selected and tested.

Keep an integration boundary when a future integration is already required. Do not build the future feature early.

### 2.5 Composition Over Inheritance

Prefer small components, hooks, utilities, and focused services composed together over deep class hierarchies. Use inheritance only when it clearly expresses an existing contract and reduces complexity. In React, share behavior through component composition and focused hooks. Avoid speculative abstractions.

## 3. UI/UX, Mobile-First Design, and Accessibility

### 3.1 Mobile-First Responsiveness

- Start with narrow-screen layouts, then enhance for larger screens.
- Use flexible layouts and content-driven breakpoints rather than assuming fixed device dimensions.
- Keep primary tasks, navigation, and essential information accessible on small screens.
- Use touch-friendly controls with adequate spacing and avoid requiring hover interaction.
- Keep tables readable through controlled horizontal scrolling or an appropriate alternative layout.
- Check layout at narrow, intermediate, and wide widths without losing functionality.

Mobile-first design does not mean building a native mobile application.

### 3.2 Accessibility (a11y)

- Use semantic HTML, correctly ordered headings, visible labels, and meaningful alternative text.
- Ensure complete keyboard access, visible focus indicators, and logical focus order.
- Manage focus when dialogs open or close and when route changes require it.
- Associate validation errors and instructions with the relevant fields.
- Meet applicable WCAG 2.2 Level AA criteria as a target, including verified contrast, non-color status cues, and accessible control names.
- Respect reduced-motion preferences and support text resizing and reflow.
- Test important flows using keyboard and, where feasible, assistive technology.

### 3.3 Visual Hierarchy and Feedback

- Make page purpose, primary action, and important status clear.
- Use consistent spacing, typography, headings, and design tokens.
- Present money, dates, reservation status, and payment status with explicit labels.
- Handle loading, empty, success, validation failure, request failure, access-denied, and session-expired states where applicable.
- Preserve entered values after recoverable failures and prevent duplicate submissions.
- Confirm consequential actions such as cancellations and refunds.

Follow [design_guidelines.md](design_guidelines.md) and the app's existing `styles/tokens.css` rather than substituting a new palette without approval.

## 4. Data and State Management

### 4.1 Single Source of Truth

- Keep backend business rules authoritative for prices, inventory, roles, ownership, reservation transitions, payment verification, and NFC authorization.
- Let the frontend collect input and present server-confirmed outcomes, not independently decide protected business facts.
- Maintain one authoritative owner for each piece of client state. Derive values instead of maintaining multiple copies that drift apart.
- Use local component state for isolated interactions and shared state only for genuinely shared concerns.
- Handle asynchronous loading, stale responses, request cancellation, and retry behavior.
- Do not introduce a new global state library without an approved need.

### 4.2 ACID for Relational Data

ACID describes the guarantees expected from correctly designed database transactions.

| Property | Meaning | NEXORA example |
|---|---|---|
| Atomicity | Coordinated database changes succeed together or roll back together | Reservation and hold records |
| Consistency | Constraints and enforced invariants remain valid | Valid references and approved state changes |
| Isolation | Concurrent operations are controlled | Two requests for the last available room |
| Durability | Committed records survive according to database guarantees | Recorded reservation survives restart |

ACID does not automatically enforce business rules. An unsuitable isolation or concurrency strategy still allows races. Keep transactions short. Recheck inventory in the same transaction as protected writes, using the project's approved strategy. Do not perform external provider or device network calls inside inventory transactions.

A database rollback cannot undo a PayMongo payment, file operation, or physical door action. Record recoverable external outcomes and follow-up work. Backups and tested restoration remain necessary.

### 4.3 CRUD and Business Operations

CRUD means Create, Read, Update, Delete.

| Operation | Typical HTTP method | NEXORA example |
|---|---|---|
| Create | POST | Create room type |
| Read | GET | Read room details |
| Update | PATCH | Update room description |
| Delete | DELETE | Remove an eligible unused record |

CRUD does not require unrestricted endpoints on every model. Protected domain actions need explicit rules: confirm reservation, check in, check out, cancel reservation, record payment, issue refund, and revoke credential. Never implement cancellation by deleting the reservation or its history.

## 5. Security Principles

### 5.1 Principle of Least Privilege (PoLP)

- Grant users, services, database identities, and deployment jobs only the permissions needed for their tasks.
- Enforce authentication, role permissions, and record ownership in the backend.
- Treat hidden or disabled frontend controls as usability measures, not authorization.
- Deny access by default when identity, ownership, permission, or verification is absent.
- Restrict access to private guest, payment, audit, and device information.

### 5.2 Secure by Default

- Validate untrusted input at backend boundaries and return only approved response fields.
- Store secrets outside source code and public frontend environment variables.
- Use approved authentication, secure session handling, HTTPS in production, and appropriate rate limiting.
- Verify PayMongo evidence on the backend and deduplicate provider effects. Browser redirects never prove payment.
- Protect private booking access independently of public booking references.
- Keep NFC simulation explicitly labeled and never claim hardware actions without device confirmation.
- Use safe logging, error messages, and audit records without exposing credentials or private records.
- Retain financial and operational histories under approved rules.

See [SECURITY.md](SECURITY.md), [API.md](API.md), and [BUSINESS_FLOWS.md](BUSINESS_FLOWS.md) for concrete requirements.

## 6. Architecture and Twelve-Factor App Guidance

Keep NEXORA's approved **modular monolith**: separate guest and admin React applications, one shared NestJS REST API, and Prisma-managed relational storage. Twelve-Factor App principles guide deployment readiness; they do **not** mandate microservices, containers, a particular hosting vendor, or immediate infrastructure changes.

| Twelve-Factor principle | Practical guidance for NEXORA |
|---|---|
| I. Codebase | Maintain one tracked project codebase with clear application boundaries |
| II. Dependencies | Declare dependencies explicitly and use compatible locked versions |
| III. Config | Keep environment-specific settings and secrets outside source code |
| IV. Backing services | Treat databases, storage, email, and payment integrations as explicit configured resources |
| V. Build, release, run | Separate verified builds, release configuration, and runtime execution |
| VI. Processes | Avoid relying on a process's memory for durable booking or payment state |
| VII. Port binding | Expose the backend through its approved network service configuration |
| VIII. Concurrency | Preserve database-safe behavior across concurrent requests and application instances |
| IX. Disposability | Support safe startup, shutdown, retry, and recovery of interrupted work |
| X. Dev/prod parity | Verify migration, concurrency, and configuration differences between SQLite development and any approved production database |
| XI. Logs | Emit useful, sanitized operational records for approved collection and monitoring |
| XII. Admin processes | Run migrations and one-off administrative actions through explicit, authorized procedures |

These are design and operational targets, not statements that production deployment is already configured or verified. PostgreSQL is recommended in the architecture, but production adoption and migration validation remain separate decisions. Follow [CI_CD_ROADMAP.MD](CI_CD_ROADMAP.MD) and [TECHNICAL_PLAN.md](TECHNICAL_PLAN.md).

## 7. Mobile Development

This section applies to mobile-specific interfaces and any future approved native mobile work. NEXORA currently uses responsive web frontends; this section does not establish a native mobile deliverable.

- Prioritize narrow screens, touch ergonomics, readable text, and predictable navigation.
- Support orientation and screen-size changes without losing work.
- Minimize transferred data, unnecessary rendering, and battery-intensive activity.
- Handle slow or interrupted connectivity with clear recovery states.
- Request device permissions only when a feature needs them and only after explaining their purpose.
- Treat local storage as untrusted for privileged operations. Avoid storing secrets in insecure device locations.
- Verify accessibility with screen readers, touch input, and system text-size settings where applicable.
- Require a separate architecture and security review before adding native APIs or offline writes.

## 8. Website Development

For NEXORA, this primarily concerns the public guest-facing website.

- Use semantic pages, informative headings, readable content, and accessible navigation.
- Support responsive room images, descriptive alternative text, and efficient asset loading.
- Keep public content and metadata clear for search engines without exposing private booking data.
- Show room types, capacities, nightly prices, and availability context accurately.
- Keep calls to action and booking steps easy to find on phones and larger screens.
- Ensure public pages function with clear loading, empty, and failure feedback.
- Avoid introducing SEO, rendering, or analytics frameworks outside the approved stack without review.
- Preserve optional guest accounts and approved accountless booking behavior.

## 9. Web-App Development

For NEXORA, this covers the guest booking workflow and staff administration dashboard.

- Separate presentation in React pages/components from coordination in hooks and API requests in services.
- Keep React, JavaScript/JSX, Vite, React Router, Axios, and plain CSS as approved.
- Keep `guest-web` and `admin-web` separate while using the same approved backend API.
- Use role-aware navigation, but enforce permissions and ownership in NestJS.
- Make data-intensive tables, filters, forms, and detail views responsive and keyboard accessible.
- Handle authentication expiry, loading, empty states, errors, retries, and unknown transaction outcomes explicitly.
- Protect against stale requests and duplicate submits. Reconcile server results instead of assuming a write succeeded.
- Keep business data such as payment summaries, reservation statuses, and dates consistent with backend contracts.

## 10. App Development (Desktop and Native)

This section concerns installable desktop or native apps if separately approved. It does not add such an app to the current NEXORA roadmap.

- Follow platform-specific interface, navigation, keyboard, and accessibility conventions.
- Define application lifecycle behavior, updates, recovery, and supported operating systems before implementation.
- Request operating-system permissions only for required capabilities.
- Store credentials using approved platform security facilities, not plain-text configuration.
- Validate file imports, deep links, interprocess messages, and other external inputs.
- Design explicit offline and synchronization policies before allowing local writes to authoritative records.
- Separate platform-specific integrations from business logic through focused boundaries.
- Review packaging, signing, distribution, and update security as separate approved work.

## 11. Backend and API Principles

- Use NestJS controllers for transport, DTOs for input validation, and focused services for business rules.
- Keep API routes and response contracts aligned with [API.md](API.md).
- Use explicit permission and ownership checks with trusted identities.
- Return public, guest-owned, and staff-specific data projections as required.
- Use named business operations for protected state transitions rather than unrestricted status updates.
- Use focused integration adapters for actual external dependencies such as PayMongo and future approved NFC hardware.
- Preserve idempotency and safe recovery for retried requests and verified provider events.
- Avoid adding repository wrappers around Prisma calls when they provide no clear benefit.

## 12. Error Handling and Reliability

- Fail with a clear business reason and preserve useful diagnostic context.
- Avoid empty catch blocks and do not disguise failures as success-shaped responses.
- Distinguish validation errors, permission failures, conflicts, timeouts, and unknown external outcomes.
- Log only safe diagnostic information and exclude private details from user-visible errors.
- Make retries bounded and duplicate-safe where side effects are possible.
- Preserve recoverable booking, inventory, payment, assignment, refund, and audit state.
- Report provider or NFC actions as completed only after trustworthy confirmation.

## 13. Testing and Maintainability Review

Before completing an authorized change, verify as applicable:

1. Does every module have a clear responsibility and understandable names?
2. Are SOLID, DRY, KISS, YAGNI, and composition applied without unnecessary abstractions?
3. Are business rules enforced in the correct trusted layer?
4. Is state derived from a clear single source of truth?
5. Are money, stay dates, event timestamps, and status semantics explicit?
6. Are role permissions, ownership, input validation, and secret handling enforced?
7. Do transaction and concurrency controls protect inventory and payment integrity?
8. Are partial failures, external errors, and retry outcomes recoverable?
9. Are mobile layouts, keyboard workflows, focus, contrast, and required UI states checked?
10. Is important behavior verified using the approved isolated test procedure?
11. Have project scope, dependencies, and existing functionality been preserved?
12. Are test results accurately identified as expected, owner-reported, or independently verified?

Use isolated test databases. Never redirect tests to the development or production database. Follow [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) and [CI_CD_ROADMAP.MD](CI_CD_ROADMAP.MD). The project owner runs checks under the current owner-execution instructions.

## 14. NEXORA-Specific Constraints and Workflow

- **Architecture authority:** [NEXORA_ARCHITECTURE_V2.1.md](NEXORA_ARCHITECTURE_V2.1.md).
- **Current development status:** [AGENTS.md](AGENTS.md); use its latest owner-confirmed checkpoint rather than historical progress tables.
- **Current file organization:** [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md).
- **Coding patterns and development conventions:** [CODING_PATTERNS.md](CODING_PATTERNS.md) and [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md).
- **Operational and data rules:** [BUSINESS_FLOWS.md](BUSINESS_FLOWS.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), and [SECURITY.md](SECURITY.md).
- **Code delivery preference:** As clarified in [AI_MASTER_INSTRUCTIONS.md](AI_MASTER_INSTRUCTIONS.md), `EggPie` requests full ready-to-copy-paste implementation code, with overview, exact location, and explanation. It is not a general approval word. Scope approval for implementation remains a separate decision. Where other project instructions still require `EggPie` as an authorization trigger, reconcile those instructions with the owner before implementation rather than silently overriding them.
- Do not start postponed NFC work, paused testing phases, deferred deployment, migrations, or unrelated features without separate approval.
- No new dependency, architecture change, build, test run, migration, commit, push, or deployment is implied by this document.

## 15. Related Documentation

- [AGENTS.md](AGENTS.md)
- [AI_MASTER_INSTRUCTIONS.md](AI_MASTER_INSTRUCTIONS.md)
- [NEXORA_ARCHITECTURE_V2.1.md](NEXORA_ARCHITECTURE_V2.1.md)
- [DEVELOPMENT_RULES.md](DEVELOPMENT_RULES.md)
- [CODING_PATTERNS.md](CODING_PATTERNS.md)
- [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md)
- [design_guidelines.md](design_guidelines.md)
- [BUSINESS_FLOWS.md](BUSINESS_FLOWS.md)
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- [SECURITY.md](SECURITY.md)
- [API.md](API.md)
- [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
- [CI_CD_ROADMAP.MD](CI_CD_ROADMAP.MD)
- [TECHNICAL_PLAN.md](TECHNICAL_PLAN.md)
