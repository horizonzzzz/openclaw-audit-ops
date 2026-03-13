# OpenClaw Audit Ops Workspace

`pnpm` monorepo for the OpenClaw audit plugin and its standalone admin console.

## Packages

- `packages/plugin`: OpenClaw plugin package published to npm and installed by OpenClaw.
- `apps/admin`: Next.js full-stack admin console for browsing audit SQLite data and editing runtime plugin config.

## Workspace Commands

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## Plugin Package

Build and pack the OpenClaw plugin:

```bash
pnpm --filter @horizonzzzz/audit-ops build
pnpm --filter @horizonzzzz/audit-ops pack
```

Plugin metadata lives at `packages/plugin/openclaw.plugin.json`.

## Admin App

Run the admin console locally:

```bash
pnpm --filter @horizonzzzz/audit-ops-admin dev
```

The admin app is a Next.js full-stack package. It stores its managed target settings in `apps/admin/data/target.json` and expects:

- `ADMIN_PASSWORD`: login password for the console
- `ADMIN_AUTH_SECRET`: HMAC secret for the session cookie

If these are unset, the current development defaults are used.

## Current Scope

- Runtime plugin config is read from and written to the OpenClaw host config file.
- Audit SQLite access is maintenance-oriented: browse, export, and delete events.
- Historical event rows are not edited in place.
