
# NEXORA Development Rules

Architecture: Final Architecture v2.1

## 1. Keep It Simple

Follow the KISS principle.

Use clear names, simple functions,
and easy-to-read code.

Do not add unnecessary packages.

## 2. Frontend Standards

Use React with JavaScript and JSX.

Use plain CSS for styling.

Use Axios for backend requests.

Use React Router for navigation.

Keep Guest and Admin applications separate.

## 3. Backend Standards

Use NestJS with TypeScript.

Use controllers to receive requests.

Use services for business logic.

Keep API routes under /api.

Use backend validation and permissions
when implementing protected features.

## 4. Folder Organization

frontend/guest-web
frontend/admin-web
backend
docs

Create additional folders only when needed.

## 5. Development Process

Work on one development step at a time.

Explain where each code file belongs.

Test every step before continuing.

Do not proceed without approval.

## 6. Security

Never commit passwords or API secrets.

Keep backend secrets outside source code.

Do not trust frontend payment amounts.

Do not expose guest records publicly.

Protect admin features with authentication
and authorization before production use.

## 7. Git

Use one repository for the NEXORA project.

Write meaningful commit messages.

Review changes before committing.

Never commit local environment files.

## 8. Documentation

Update the README as the project develops.

Document important implementation decisions.

Keep instructions understandable.
