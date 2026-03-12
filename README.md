# Audit Ops Plugin

External OpenClaw plugin for audit collection, sensitive-operation alerting, and optional blocking.
Storage and schema management are built on `Drizzle ORM + better-sqlite3`.

## Install

From npm:

```bash
openclaw plugins install @horizonzzzz/openclaw-audit-ops
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
          "notifiers": ["log", "system_event"],
          "storage": {
            "enabled": true,
            "retentionDays": 30,
            "maxRows": 50000
          },
          "capture": {
            "enabledEventTypes": [
              "before_model_resolve",
              "before_prompt_build",
              "before_agent_start",
              "llm_input",
              "llm_output",
              "agent_end",
              "before_compaction",
              "after_compaction",
              "before_reset",
              "message_received",
              "message_sending",
              "message_sent",
              "before_tool_call",
              "after_tool_call",
              "tool_result_persist",
              "before_message_write",
              "session_start",
              "session_end",
              "subagent_spawning",
              "subagent_delivery_target",
              "subagent_spawned",
              "subagent_ended",
              "gateway_start",
              "gateway_stop"
            ],
            "includePayload": true,
            "includeResultSummary": true
          },
          "redaction": {
            "level": "standard",
            "extraSensitiveKeys": []
          }
        }
      }
    }
  }
}
```

## Behavior

- `observe`: record lifecycle events and emit alerts for matching rules.
- `enforce`: block matching `action=block` rules with severity `high` or `critical`.
- Full OpenClaw hook coverage is recorded to SQLite, including agent, message, tool, session, subagent, and gateway lifecycle events.
- Tool calls are still the only hook family with rule-based blocking.
- SQLite data is written under the plugin state dir as `audit-ops.sqlite`.
- The runtime store uses Drizzle schema definitions so future product queries and migrations can evolve without scattering raw SQL.
- Active config and rule snapshots are stored alongside events for forensic context.

## Default Rules

The built-in rules focus on three categories:

- `exec-destructive-commands`: high-risk shell commands on explicit command fields such as `command` or `cmd`.
- `write-sensitive-files`: writes or edits involving sensitive file names or secret-bearing content.
- `message-sensitive-payloads`: outbound messages containing likely secrets or credentials.

The default `exec` rule stays narrower than simple keyword matching. It targets concrete destructive commands such as `rm -rf`, `mkfs`, `dd if=`, forced git pushes, and publish/merge operations, which reduces false positives from test strings like `echo "rm -rf"`.

## Redaction

Audit payloads are sanitized before being written to SQLite.

- Secret-shaped keys such as `token`, `secret`, `password`, `apiKey`, `cookie`, and `authorization` are redacted.
- Structured string payloads in fields like `content`, `message`, `body`, `payload`, and `prompt` are parsed when possible.
- JSON text is recursively redacted by key.
- `.env`-style text is redacted line by line.
- `redaction.level` can relax or tighten payload preservation.
- `extraSensitiveKeys` lets operators add environment-specific keys to the redaction set.

## SQLite Event Shape

Each row in `audit_events` represents one recorded hook event.

Common columns:

- `event_type`, `occurred_at`
- `run_id`, `tool_call_id`, `session_id`, `session_key`, `agent_id`
- `tool_name`, `decision`, `severity`, `outcome`, `duration_ms`
- `payload_json`, `result_summary`, `error_summary`
- `matched_rule_ids_json`, `evidence_paths_json`

Tool events store rule evaluation metadata. Non-tool events primarily store sanitized payloads and runtime context.

## Schema Workflow

Generate migration files when the schema changes:

```bash
npm run db:generate
```

Push the schema directly to a local database during development:

```bash
npm run db:push
```

## Notes

- Runtime requires a Node.js version with built-in `node:sqlite` support, matching modern OpenClaw releases.
- Retention is enforced by both age (`retentionDays`) and table size (`maxRows`).
- System-event notifications are emitted only for `alert` and `block` decisions.

## Publish

```bash
npm pack
```

For local publishing:

```bash
npm publish --access public
```

For GitHub Actions publishing:

1. Add repository secret `NPM_TOKEN` in GitHub.
2. Bump the version in `package.json`.
3. Commit the version change.
4. Create a matching tag such as `v1.0.1`.
5. Push the commit and tag.

```bash
git tag v1.0.1
git push origin main --follow-tags
```

The workflow in `.github/workflows/release.yml` publishes with `--provenance`, so npm can associate the published package with this GitHub repository and workflow run.
