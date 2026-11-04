# NEXORA — Conventional Commits

## 1. Purpose

Use consistent commit messages so changes are easy to review and find.

Follow the Conventional Commits format.

## 2. Format

```text
type(optional-scope): description

Optional body.

Optional footer.
```

Use a clear, concise description.

Example:

```text
feat(reservations): add inventory hold expiration
```

## 3. Project Commit Types

The specification defines feat and fix.
The remaining types below are NEXORA team conventions.

| Type | Purpose | Example |
|---|---|---|
| feat | Add behavior | feat(rooms): add amenity management |
| fix | Correct a bug | fix(reservations): exclude expired holds |
| docs | Change documentation | docs(api): document booking ownership |
| style | Formatting without behavior changes | style(backend): format reservation service |
| refactor | Restructure without changing behavior | refactor(payments): extract event validation |
| test | Add or update tests | test(reservations): cover competing bookings |
| perf | Improve performance | perf(reports): reduce repeated queries |
| build | Build or dependency changes | build(frontend): update compatible dependencies |
| ci | Automation configuration | ci: run backend checks |
| chore | Maintenance | chore: update ignored local files |
| revert | Reverse a previous change | revert: remove unapproved route |

A visible UI feature or bug fix usually uses feat or fix.
The style type refers to code formatting.

## 4. Suggested Scopes

- guest-web
- admin-web
- auth
- users
- guests
- rooms
- reservations
- payments
- nfc
- reports
- settings
- audit
- database
- api
- docs

Use scopes consistently.

## 5. Breaking Changes

Mark incompatible changes with ! or a BREAKING CHANGE footer.

```text
feat(api)!: rename booking date fields

BREAKING CHANGE: clients must send checkInDate and checkOutDate.
```

Explain the required migration or client update.

## 6. Useful Commit Body

Use a body when the reason is not obvious.

```text
fix(reservations): recheck inventory after transaction conflict

Retry using fresh inventory data so concurrent requests cannot rely
on an outdated availability result.
```

## 7. Commit Boundaries

Prefer one coherent change per commit.

Separate unrelated work.

Keep implementation, necessary tests, and directly related documentation
together when they form one reviewable change.

Do not split commits so that intermediate application states are unusable
without a clear reason.

## 8. Before Committing

1. Review the diff.
2. Check for unintended files.
3. Check for secrets and private data.
4. Run checks appropriate to the change.
5. Confirm the message describes the actual result.

Commit only work within the approved scope.

## 9. Reference

[Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
