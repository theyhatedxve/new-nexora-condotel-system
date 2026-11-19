# NEXORA Guest Web

## Current guest checkpoint — 2026-11-19

**Status:** Guest account booking and unused-file cleanup completed,
owner-confirmed.

The guest application retains account registration, verification, login,
protected checkout, payment return, My Bookings, and reservation details.

Unused template styles/assets, the unused availability-search component,
backend-status components, and the retired reservation-service stub were removed.

Vite defaults to port 5175 with strictPort enabled.
The backend API is http://localhost:3000/api.

Run npm.cmd run dev from this directory.
The owner runs npm.cmd run lint and npm.cmd run build.

See [the current checkpoint](../../docs/MD_Files/AGENTS.md).
Earlier checkpoint and framework-template material below is historical.

## Historical checkpoint — 2026-11-15

The guest app includes login, registration, verification, protected checkout,
payment return, My Bookings, owned reservation details, and the shared header.
Earlier owner lint/build checks passed. Browser acceptance remains pending.
See [AGENTS.md](../../docs/MD_Files/AGENTS.md) for current verification and recovery.

## Local development

Run in its own PowerShell terminal from this application directory.

```powershell
$env:VITE_API_URL = 'http://localhost:3000/api'
npm.cmd run dev -- --port 5175 --strictPort
```

The owner runs the application checks.

```powershell
npm.cmd run lint
npm.cmd run build
```

## Framework template background

NEXORA uses this React JavaScript/JSX application with Vite, React Router,
Axios, plain CSS, and Lucide React. The [master architecture](../../docs/NEXORA_ARCHITECTURE_V2.1.md)
and [development reference](../../docs/MD_Files/AGENTS.md) govern the project. Remaining
framework-template notes are background, not approval to change dependencies.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

NEXORA frontends remain JavaScript/JSX. Review existing Oxlint configuration
for approved lint work; do not migrate to TypeScript as a template recommendation.
