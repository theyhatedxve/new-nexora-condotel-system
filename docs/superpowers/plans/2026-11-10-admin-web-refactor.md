# Admin-web responsibility separation

**Goal:** Apply the approved guest-web refactor approach to admin-web while preserving its current behavior and UI/UX.

**Architecture:** Keep React/JSX, plain CSS, the existing API clients, auth boundaries, and action hooks. Extract remaining state/effects/handlers into focused hooks, move large screen sections into feature component folders, and centralize existing visual values in styles/tokens.css.

**Authorization:** The owner requested the same refactor for Admin-Web. Use local docs only, without Obsidian. Work in the current checkout. Preserve the existing guest-web work. No new dependencies, backend changes, commits, or deployment.

## Tasks

- [x] Capture source and lint/build baselines.
- [x] Extract page filters, pagination, detail coordination, dashboard, report, settings, login, and layout logic into hooks.
- [x] Extract stateful management/action component logic, preserving existing financial/session/version guards and existing action services/hooks.
- [x] Organize substantial page subcomponents by feature; separate fixed display metadata and pure helpers.
- [x] Add shared CSS tokens for the existing admin values without changing selectors, responsive rules, or stylesheet order.
- [x] Verify markup, expanded CSS, effect callbacks/dependencies, hook guard behavior, lint/build, and independent source review.

## Review focus

- Preserve hook order, effect cleanup, component identity, remount keys, and focus behavior.
- Preserve staff role checks, actor identity checks, session refresh, and password clearing.
- Preserve action confirmations, version checks, pending guards, idempotency, financial uncertainty states, and retry acknowledgments.
- Preserve query normalization, pagination, safe return URLs, date/centavo semantics, and visible messages.
- Keep all CSS values and rule/media-query order equivalent; preserve intended differences between screens.

## Verification record

- Baseline admin lint passed. Production build passed with an existing chunk-size warning above 500 kB.
- Final standard lint and production build passed. The existing bundle-size warning remains; no code-splitting behavior was introduced during this refactor.
- Fifteen maintained native Node tests passed in src/utils/adminHelpers.test.js. Coverage includes staff failure messages, settings absent values, independent room-type drafts, Philippine calendar dates, and reconciliation pagination/delegation.
- Temporary baseline harness: 202 original/refactored server-rendered scenarios produced identical markup, including staff roles, data states, auth states, filters, settings, room changes, reservation actions, and payment forms.
- Real React state-handler checks passed for settings field binding, guest filter edits, menu Escape/focus, and login password clearing. Authentication was stubbed; no sign-in request was sent.
- All five existing admin stylesheets matched after expanding constants, with equivalent declarations, selectors, media queries, and order. Every original effect callback/dependency array matched structurally.
- An independent read-only reviewer found no concrete regressions: original non-render logic retained, 128 inline handler occurrences preserved, 61 JSX return trees equivalent, and existing services/hooks byte-identical.
- A strict temporary lint configuration with browser/Node globals found no undefined references. Standard lint also passed without new warnings.
- SHA-256 comparison confirmed that the prior guest-web source was unchanged.
- Full browser acceptance, live login/session renewal, API writes, staff operations, bookings, collections, refunds, and reconciliation submissions were not exercised. Source/SSR checks do not establish end-to-end runtime acceptance.

Run maintained checks from frontend/admin-web:

```powershell
npm.cmd run lint
npm.cmd run build
node --test src/utils/adminHelpers.test.js
```

## Resulting organization

Paths below are relative to frontend/admin-web/src/.

| Location | Responsibility |
|---|---|
| pages/ | Route screens and their rendered states |
| components/audit/, guests/, payments/, reports/, reservations/, rooms/, settings/ | Screen-specific presentation sections |
| components/ | Shared presentation and management/action forms |
| hooks/use*Page.js | Query parsing, pagination, screen data coordination, and page handlers |
| hooks/use*Filters.js, use*Results.js, use*Directory.js | Filter state, results, refresh, and focus coordination |
| hooks/useSettingsEditor.js | Settings draft/review/save/reload and actor/version guards |
| hooks/useReservationActions.js, useGuestBookingStaffPanel.js | Existing reservation workflow coordination and confirmation handlers |
| hooks/usePaymentRefundForm.js, usePropertyCollectionForm.js, useReconciliationActions.js | Form state and handlers, delegating to the existing action hooks/services |
| hooks/useRoomManagement.js, useRoomTypeManagement.js, useRoomBlockManagement.js, useCreateRoomForm.js | Room/type/block form coordination and validation |
| hooks/useStaffLogin.js, useStaffSession.js, useAdminLayout.js | Login form, session lifecycle, navigation, and focus |
| auth/ | Existing context and route authorization boundary |
| services/ | Existing API/session/action modules, unchanged |
| constants/ | Existing display cards, labels, status options, and formatters |
| utils/ | Pure display helpers, dates, draft initialization, and queue range/delegation |
| styles/tokens.css | Existing admin colors, typography, spacing, radii, and shadow values |
| styles/ | Existing global/screen rules using those values |

## Decisions

- Reuse existing hooks/services; avoid wrappers that merely call an existing hook.
- Keep route guards in auth/, where the existing authorization boundary already lives.
- Keep layout/media-query expressions in CSS; ordinary media queries cannot consume custom properties as breakpoint values.
- Full live staff actions and payment/refund operations will not be triggered during verification.
