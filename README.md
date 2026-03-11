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

- `observe`: detect matching tool calls, emit alerts, and persist aggregated audit records after execution.
- `enforce`: block matching `action=block` rules with severity `high` or `critical`.
- `before_tool_call` is used for detection and optional blocking.
- `after_tool_call` completes the audit record with execution outcome, duration, and redacted result summary.
- JSONL audit records are written under the plugin state dir as `tool-audit.jsonl`.

## Default Rules

The built-in rules focus on three categories:

- `exec-destructive-commands`: high-risk shell commands on explicit command fields such as `command` or `cmd`.
- `write-sensitive-files`: writes or edits involving sensitive file names or secret-bearing content.
- `message-sensitive-payloads`: outbound messages containing likely secrets or credentials.

The default `exec` rule is intentionally narrower than simple keyword matching. It targets concrete destructive commands such as `rm -rf`, `mkfs`, `dd if=`, forced git pushes, and publish/merge operations, which reduces false positives from test strings like `echo "rm -rf"`.

## Redaction

Audit parameters and result summaries are sanitized before being written to JSONL.

- Secret-shaped keys such as `token`, `secret`, `password`, and `apiKey` are redacted.
- Structured string payloads in fields like `content`, `message`, `body`, and `payload` are parsed when possible.
- JSON text is recursively redacted by key.
- `.env`-style text is redacted line by line.
- Free-form sensitive payloads may be replaced with `[REDACTED]` plus length metadata instead of preserving the raw text.

## Audit Log Format

Each JSONL record now represents a meaningful audit outcome instead of mirroring hook phases directly.

Common fields:

- `eventType`: `blocked` or `completed`
- `correlationId`: joins detection and completion for the same tool call
- `detectedAt` / `completedAt`
- `toolName`, `toolCallId`, `runId`, `sessionId`, `sessionKey`, `agentId`
- `decision`, `severity`, `matchedRuleIds`, `evidencePaths`
- `sanitizedParams`
- `outcome`: `blocked`, `executed`, or `failed`
- `resultSummary`, `error`, `durationMs` when available

Example completed record:

```json
{
  "ts": "2026-03-11T10:00:00.000Z",
  "eventType": "completed",
  "correlationId": "run-1:call-7",
  "detectedAt": "2026-03-11T10:00:00.000Z",
  "completedAt": "2026-03-11T10:00:00.120Z",
  "toolName": "write",
  "toolCallId": "call-7",
  "runId": "run-1",
  "decision": "alert",
  "severity": "high",
  "matchedRuleIds": ["write-sensitive-files"],
  "evidencePaths": ["content"],
  "sanitizedParams": {
    "path": "/workspace/test-config.json",
    "content": "{\"apiKey\":\"[REDACTED]\",\"secret\":\"[REDACTED]\"}"
  },
  "outcome": "executed",
  "resultSummary": "{\"content\":[{\"type\":\"text\",\"text\":\"Successfully wrote file\"}]}",
  "durationMs": 12
}
```

## Notes

- Current logging is single-record aggregation in plugin memory keyed by `runId` and `toolCallId`.
- System-event notifications are emitted on detection, not after completion.
- Local validation still requires a working Node.js toolchain in the environment so `npm run build` can run successfully.

## Publish

```bash
npm pack
npm publish --access public
```
