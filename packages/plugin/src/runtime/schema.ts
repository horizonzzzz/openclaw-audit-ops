import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const auditEventsTable = sqliteTable(
  "audit_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventType: text("event_type").notNull(),
    occurredAt: text("occurred_at").notNull(),
    runId: text("run_id"),
    toolCallId: text("tool_call_id"),
    sessionId: text("session_id"),
    sessionKey: text("session_key"),
    agentId: text("agent_id"),
    toolName: text("tool_name"),
    decision: text("decision"),
    severity: text("severity"),
    outcome: text("outcome"),
    durationMs: integer("duration_ms"),
    payloadJson: text("payload_json"),
    resultSummary: text("result_summary"),
    errorSummary: text("error_summary"),
    matchedRuleIdsJson: text("matched_rule_ids_json"),
    evidencePathsJson: text("evidence_paths_json")
  },
  (table) => [
    index("idx_audit_events_occurred_at").on(table.occurredAt),
    index("idx_audit_events_session_key").on(table.sessionKey),
    index("idx_audit_events_run_id").on(table.runId),
    index("idx_audit_events_tool_name").on(table.toolName),
    index("idx_audit_events_event_type").on(table.eventType)
  ]
);

export const auditRulesSnapshotTable = sqliteTable("audit_rules_snapshot", {
  snapshotKey: text("snapshot_key").primaryKey(),
  capturedAt: text("captured_at").notNull(),
  rulesJson: text("rules_json").notNull()
});

export const pluginSettingsSnapshotTable = sqliteTable("plugin_settings_snapshot", {
  snapshotKey: text("snapshot_key").primaryKey(),
  capturedAt: text("captured_at").notNull(),
  settingsJson: text("settings_json").notNull()
});

export const schemaMigrationsTable = sqliteTable("schema_migrations", {
  version: integer("version").primaryKey(),
  appliedAt: text("applied_at").notNull()
});
