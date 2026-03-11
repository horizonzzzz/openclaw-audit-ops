# Audit Ops Plugin

External OpenClaw plugin for tool-call auditing, alerting, and optional blocking.

## Install

From npm:

```bash
openclaw plugins install @your-scope/openclaw-audit-ops
```

From a local checkout:

```bash
npm install
npm run build
openclaw plugins install .
```

## Config

```json
{
  "plugins": {
    "entries": {
      "audit-ops": {
        "enabled": true,
        "config": {
          "mode": "observe",
          "notifiers": ["log", "system_event"]
        }
      }
    }
  }
}
```

## Behavior

- `observe`: record matching tool calls and emit alerts.
- `enforce`: block matching `action=block` rules with severity `high` or `critical`.
- JSONL audit records are written under the plugin state dir as `tool-audit.jsonl`.

## Publish

```bash
npm pack
npm publish --access public
```
