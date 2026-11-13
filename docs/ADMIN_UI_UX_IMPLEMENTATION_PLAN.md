# NEXORA Admin UI/UX Implementation Plan

**Recorded:** 2026-11-11  
**Purpose:** Preserve the admin redesign roadmap proposed in the owner-assistant discussion.  
**Plan status:** Historical proposal; individual implementation steps require scoped approval.  
**Project:** `D:\Web-JSX\NEXORA`

## 1. Current Status and How to Use This Plan

The current [AGENTS.md](AGENTS.md) records **Admin Dashboard redesign COMPLETED, owner-confirmed on 2026-11-11**. That completion record does not establish new test results or change other project work.

The roadmap below preserves the earlier screen-by-screen planning. It is not a current checklist of unfinished work, permission to restart completed work, or proof that every feature illustrated in the reference has been implemented. Before taking another step, reconcile its scope with current source and owner-confirmed acceptance.

The original plan's source observations are historical. Since that inspection, the responsibility refactor recorded in AGENTS.md section K has moved presentation, coordination, constants, helpers, and tokens into focused files. Consult [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) before choosing current edit locations.

This document was created without modifying application code or running tests, lint, builds, applications, or browser checks.

## 2. References and Approved Constraints

- [AGENTS.md](AGENTS.md): current roadmap, owner acceptance, and execution rules.
- [NEXORA_ARCHITECTURE_V2.1.md](NEXORA_ARCHITECTURE_V2.1.md): authoritative architecture and business requirements.
- [design_guidelines.md](design_guidelines.md): visual direction, accessibility, and interface states.
- [CODING_PRINCIPLES.md](CODING_PRINCIPLES.md) and [CODING_PATTERNS.md](CODING_PATTERNS.md): readable code and responsibility boundaries.
- [API.md](API.md) and current API services/controllers: contract references; reconcile older documentation with current source.
- Obsidian: `My-Personal-Garden/04-Projects/NEXORA/UI-Reference/UI-Design-References.md`, section 2, NEXORA Admin Web. This reference was read through MCP during the original planning.
- Owner-supplied image: `NEXORA Hotel Admin Dashboard Overview.png`.

Screenshots guide presentation. Their sample people, dates, totals, statuses, and action buttons do not establish real records, supported features, permissions, or approved business rules.

Retain React, JavaScript/JSX, plain CSS, React Router, Axios, and Lucide React in the admin application. Preserve the shared NestJS REST API and existing backend authorization. No new styling framework or chart dependency is required for the initial layout work.

## 3. Implementation Approach

### Recommended: Improve Existing Screens Incrementally

Redesign the existing admin app one screen at a time, starting with the shared layout. Preserve working booking, payment, session, and staff-access behavior. Preview and approve each screen before implementation.

The alternative considered was a separate visual prototype of all screens. It would allow reviewing every layout together, but would require additional integration work afterward. The original recommendation was to improve the existing screens directly.

At the original inspection, most reference screens already had routed pages and API connections. Users & Roles remained a placeholder, and NFC was postponed. Recheck those observations before acting on them.

These are redesign stages, not a restart of the project's completed development phases.

## 4. Shared Admin Layout

Complete the shared visual foundation before applying it across individual screens, unless the owner approves a narrower page-only step.

1. Define consistent navy, gold, background, border, typography, spacing, and status values.
2. Refine sidebar branding, icons, spacing, and active navigation.
3. Give Room Types its own navigation entry using the supported `/rooms/types` route, with the correct permissions and distinct active state.
4. Refine the top bar while preserving staff identity and sign-out behavior.
5. Standardize page headings, buttons, filter controls, tables, cards, and feedback.
6. Preserve mobile navigation, keyboard access, visible focus, and route-change focus.

Original integration points, relative to `frontend/admin-web/src/`:

- `layouts/AdminLayout.jsx`
- `components/Sidebar.jsx`
- `auth/staffNavigation.js`
- `styles/global.css`

The current refactor also separates coordination, presentation, constants, and `styles/tokens.css`. Inspect those current files before changing the layout.

**Acceptance:** Existing pages use a consistent layout; navigation remains role-aware; narrow layouts and keyboard interaction remain usable.

The screenshot's notification bell and global search need approved behavior and supported APIs before becoming functional controls. The Obsidian notification-system note was a proposal, not implementation approval.

## 5. Screen-by-Screen Roadmap

The order below follows the supported reference screens. Users & Roles needs a separate feature-scope review. NFC remains deferred unless explicitly resumed.

| Order | Reference screen | Planned work | Business or integration boundary |
|---|---|---|---|
| 1 | Screen 1: Dashboard | Restyle operational cards; organize financial summaries; add supported quick links and recent reservations | Preserve metric definitions and role restrictions. Historical occupancy and percentage comparisons need a supported data source. |
| 2 | Screen 2: Reservations | Improve heading, toolbar, filters, badges, table, pagination, and detail navigation | Search labels must match supported queries. Review API support before adding New Reservation or additional filters. |
| 3 | Screen 3: Reservation Details | Arrange guest, stay, payment, and assignment information into cards; group staff actions; present available history | Preserve confirmation, assignment, payment, cancellation, and check-in/out conditions. Do not invent timeline events. |
| 4 | Screen 4: Rooms | Improve inventory filters, table, room-detail presentation, status controls, and block-management presentation | Operational status does not prove availability for requested dates. Preserve inventory protection. |
| 5 | Screen 5: Room Types | Present images, names, rates, capacity, and supported amenities together; improve create/edit forms | Separate room types from physical rooms. Preserve rate validation and stored reservation prices. |
| 6 | Screen 6: Guests | Improve search, guest table, contact presentation, pagination, and detail links | Check contracts before adding Add Guest, guest-status filters, or stay statistics. |
| 7 | Screen 7: Payments | Restyle lists, filters, payment details, collection/refund forms, and reconciliation links | Keep verified collections, refunds, and net collections distinct. Preserve financial-review and unknown-outcome handling. |
| 8 | Screen 9: Reports | Improve date controls, cards, and supported collections reporting | Booking trends, historical occupancy, room performance, and average daily rate require approved definitions and data. |
| 9 | Screen 10: Users & Roles | Agree on staff-account management; establish supported APIs; then design the list and forms | At original inspection, `/users` was a placeholder. Account management includes new functionality, not only styling. |
| 10 | Screen 11: Settings | Improve property-information editing and review/save feedback | Booking Rules, Payment Settings, and Notifications require separate support checks; the reference does not authorize new settings. |
| 11 | Screen 12: Audit Logs | Improve filters, timestamps, action labels, table spacing, pagination, and supported detail views | Preserve sanitized records and current access restrictions. |
| Deferred | Screen 8: NFC Management | After explicit approval to resume NFC, agree on simulation scope and design cards, credentials, access logs, and devices | Label simulation clearly. Do not imply physical issuance, door access, revocation, or device communication works. |

Update related existing pages alongside their feature: Guest Details, Room Details, Payment Details, and Payment Reconciliation should follow the same visual language without losing existing behavior.

### Screen 1 Follow-up Scope Approved in This Chat

After the full roadmap, the owner approved a narrower Dashboard-only step:

- Modify `frontend/admin-web/src/pages/Dashboard.jsx`.
- Create `frontend/admin-web/src/styles/dashboard.css`.
- Show Total Rooms, Occupied Rooms, Arrivals Today, and Departures Today.
- Retain the Active Reservations count and Administrator/Manager-only financial summaries, including `REVIEW_REQUIRED` handling.
- Add role-aware links for Reservations, Rooms, Guests, Payments, and Reports.
- Show the five newest reservations with detail links and independent loading, empty, error, and retry feedback.
- Fetch the first supported 20-row reservation page and display five rows; the existing API did not accept a five-row page size.
- Keep Dashboard styles scoped to that screen. Shared sidebar/top-bar redesign was outside that two-file approval.
- Defer historical occupancy charts and percentage changes pending a supported data source.

Those two files were saved and source-reviewed in the chat. No tests, lint, builds, applications, or browser checks were run for that implementation. The later completion status is the owner-confirmed record in current AGENTS.md; it is not a new execution report from this documentation task.

## 6. Rules to Preserve Across All Screens

### Permissions and Sessions

- Preserve current frontend route restrictions and backend authorization.
- Display only actions permitted for the current staff member.
- Do not treat hidden buttons as backend authorization.
- Preserve session expiry, refresh, sign-out, and private-data handling.

### Money, Dates, and Statuses

- Display PHP amounts from trusted records; retain integer-centavo semantics.
- Do not rename net collections to profit or assume screenshot revenue totals use the same definition.
- Preserve Philippine calendar-date and arrival-time behavior.
- Keep reservation, payment, room-operation, and NFC states distinct.
- Preserve stored reservation prices, payment evidence, assignment history, and audit history.

### Feedback and Accessibility

- Include loading, empty, success, validation failure, request failure, access-denied, session-expired, and financial-review states where applicable.
- Preserve recoverable form input and duplicate-submit protection.
- Confirm consequential actions and preserve unknown-outcome recovery.
- Use semantic headings, labeled controls, readable tables, visible focus, and text alongside status colors.
- Keep tables usable through controlled scrolling and stack detail cards on narrow screens.
- Respect reduced-motion preferences.

### Scope and Data

- Record unsupported reference features as proposed additions.
- Do not use fabricated figures as live operational data. Clearly label fictional preview data.
- Preserve completed functionality and unrelated edits.
- No database changes, dependencies, commits, pushes, deployments, live payments, or NFC resumption are authorized by this document.

## 7. Workflow for Each Approved Step

1. **Inspect:** Read current instructions, relevant docs, source components, API services, and permissions.
2. **Propose:** Explain the overview, design, exact files, behavior, and missing capabilities.
3. **Approve:** Obtain scoped approval and the owner's `EggPie` trigger before generating or applying implementation code. Approval of a roadmap is not approval for every screen.
4. **Provide code:** Pair implementation code with its exact location and purpose, following the owner's communication instructions.
5. **Implement:** Save only approved files and report each completed change with a short explanation.
6. **Owner verification:** Explain what to check and provide commands. The owner runs tests, lint, builds, apps, and browser checks.
7. **Accept:** Record actual owner results, resolve approved issues, and obtain acceptance before advancing.
8. **Document:** When authorized, check for duplicate Obsidian notes, save a concise unpublished progress note, read it back, and report its path. Separate proposals, installed code, source review, owner reports, and executed results.
9. **Preview the next step:** Explain the next applicable screen without automatically implementing it.

The chat-only direct-edit workflow remains scoped to this chat until the owner says `Pandecoco`. Do not infer standing implementation or note-edit permission for other chats.

## 8. Owner-Run Verification

From the admin application directory, when the owner is ready:

```powershell
Set-Location 'D:\Web-JSX\NEXORA\frontend\admin-web'
npm.cmd run lint
npm.cmd run build
```

At the original inspection, the admin package had no `test` script. Lint and build are not automated test coverage. Recheck current scripts before prescribing additional commands.

Browser checks for each applicable screen:

1. Open its route directly and refresh it.
2. Check sidebar links and active navigation.
3. Check Administrator, Manager, and Receptionist access using authorized test accounts.
4. Check supported filters, pagination, detail links, and actions.
5. Check loading, empty, error, session-expired, and financial-review behavior.
6. Check keyboard access and visible focus.
7. Check layouts at 320px, 375px, 768px, and desktop widths.
8. Check displayed values and statuses against the applicable trusted records.

Operational mutation checks require an approved test setup with synthetic records. Never substitute development or production guest/payment records for a disposable test setup.

## 9. Continuation

The original sequence was shared layout, Dashboard, then Reservations. Dashboard-only approval later narrowed the initial implementation scope.

Use current AGENTS.md and the owner's latest direction to decide what actually remains. Its November 11 completion record must not be replaced by this historical plan's earlier pending steps. NFC remains postponed, Phase 11 remains paused/incomplete, and Phase 12 remains deferred unless explicitly changed by the owner.

Creating this document records the plan only. It does not authorize another implementation step or claim that any checks ran today.
