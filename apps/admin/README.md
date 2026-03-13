# Audit Ops Admin

Local dashboard for the `@horizonzzzz/audit-ops` OpenClaw plugin.

Use it to browse recorded audit events, inspect the local SQLite database, and edit the plugin runtime config from a browser.

## Start with npx

```bash
npx @horizonzzzz/audit-ops-admin
```

Optional flags:

```bash
npx @horizonzzzz/audit-ops-admin --open --port 3210 --host 127.0.0.1
```

## Prerequisites

The admin UI is intended to connect to a local OpenClaw home directory where the Audit Ops plugin is already installed and writing state.

By default it looks for:

- OpenClaw home: `~/.openclaw`
- Config file: `~/.openclaw/openclaw.json`
- SQLite file: `~/.openclaw/audit-ops.sqlite`
- Host: `127.0.0.1`
- Port: auto-selected starting from `3210`

## Authentication

If `ADMIN_PASSWORD` is not provided, the launcher prints a temporary password on startup for the current local session.

## Develop in this repository

Start the Next.js app in development mode:

```bash
pnpm --filter @horizonzzzz/audit-ops-admin dev
```

Build the production app bundle:

```bash
pnpm --filter @horizonzzzz/audit-ops-admin build
```
