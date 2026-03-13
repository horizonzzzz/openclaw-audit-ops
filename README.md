# OpenClaw Audit Ops Workspace

`pnpm` monorepo for the `@horizonzzzz/audit-ops` OpenClaw plugin and the `@horizonzzzz/audit-ops-admin` companion admin UI.

This repository contains the runtime plugin that records and evaluates OpenClaw events, plus a local browser-based admin console for inspecting audit data and editing plugin config.

## Quick Start

Install the plugin in OpenClaw:

```bash
openclaw plugins install @horizonzzzz/openclaw-audit-ops
```

Launch the companion admin UI locally with `npx`:

```bash
npx @horizonzzzz/audit-ops-admin
```

## Workspace Layout

- `packages/plugin`: published OpenClaw plugin package for audit collection, alerting, and optional blocking.
- `apps/admin`: Next.js full-stack admin UI for browsing audit SQLite data and editing runtime plugin config.

## Package Guides

- Plugin package guide: [packages/plugin/README.md](packages/plugin/README.md)
- Admin app guide: [apps/admin/README.md](apps/admin/README.md)

## Workspace Commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## Development

Build and pack the plugin package:

```bash
pnpm --filter @horizonzzzz/audit-ops build
pnpm --filter @horizonzzzz/audit-ops pack
```

Run the admin app in development mode:

```bash
pnpm --filter @horizonzzzz/audit-ops-admin dev
```

Plugin metadata lives at `packages/plugin/openclaw.plugin.json`.

The admin app is a Next.js full-stack package. It stores its managed target settings in `apps/admin/data/target.json` and expects:

- `ADMIN_PASSWORD`: login password for the console
- `ADMIN_AUTH_SECRET`: HMAC secret for the session cookie

If these are unset, the current development defaults are used.

## Current Scope

- Runtime plugin config is read from and written to the OpenClaw host config file.
- Audit SQLite access is maintenance-oriented: browse, export, and delete events.
- Historical event rows are not edited in place.
