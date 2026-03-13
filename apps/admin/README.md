# Audit Ops Admin

Local dashboard for the Audit Ops OpenClaw plugin.

## Start with npx

```bash
npx @horizonzzzz/audit-ops-admin
```

Optional flags:

```bash
npx @horizonzzzz/audit-ops-admin --open --port 3210 --host 127.0.0.1
```

Defaults:

- OpenClaw home: `~/.openclaw`
- Config file: `~/.openclaw/openclaw.json`
- SQLite file: `~/.openclaw/audit-ops.sqlite`
- Host: `127.0.0.1`
- Port: auto-selected starting from `3210`

If `ADMIN_PASSWORD` is not provided, the launcher prints a temporary password on startup.
