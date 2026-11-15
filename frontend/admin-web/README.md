# NEXORA Admin Web

## Current source checkpoint — 2026-11-15

The staff app includes the owner-completed admin redesign, Users & Roles,
staff setup, and settings with the retired booking-link field removed.
Earlier owner lint/build checks passed. Browser acceptance remains pending.
See [AGENTS.md](../../docs/AGENTS.md) for current verification and recovery.

## Local development

Run in its own PowerShell terminal from this application directory.

```powershell
$env:VITE_API_URL = 'http://localhost:3000/api'
npm.cmd run dev -- --port 5176 --strictPort
```

The owner runs the application checks.

```powershell
npm.cmd run lint
npm.cmd run build
```

## Framework template background

NEXORA uses this React JavaScript/JSX application with Vite, React Router,
Axios, plain CSS, and Lucide React. The [master architecture](../../docs/NEXORA_ARCHITECTURE_V2.1.md)
and [development reference](../../docs/AGENTS.md) govern the project. Remaining
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
