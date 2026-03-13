import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { count, eq, inArray, lt, sql } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { AuditOpsPluginConfig } from "./config.js";
import {
  auditEventsTable,
  auditRulesSnapshotTable,
  pluginSettingsSnapshotTable,
  schemaMigrationsTable
} from "./schema.js";

export type AuditEventRow = {
  eventType: string;
  occurredAt: string;
  runId?: string;
  toolCallId?: string;
  sessionId?: string;
  sessionKey?: string;
  agentId?: string;
  toolName?: string;
  decision?: "allow" | "alert" | "block";
  severity?: string;
  outcome?: string;
  durationMs?: number;
  payload?: unknown;
  resultSummary?: string;
  errorSummary?: string;
  matchedRuleIds?: string[];
  evidencePaths?: string[];
};

function encodeJson(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  return JSON.stringify(value);
}

export class AuditSqliteStore {
  private sqlite: Database.Database | null = null;
  private db: BetterSQLite3Database | null = null;

  constructor(private readonly dbPath: string) {}

  async init(config: AuditOpsPluginConfig): Promise<void> {
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    this.sqlite = new Database(this.dbPath);
    this.sqlite.pragma("journal_mode = WAL");
    this.sqlite.pragma("synchronous = NORMAL");
    this.db = drizzle(this.sqlite);
    this.bootstrapSchema();

    const capturedAt = new Date().toISOString();
    this.db
      .insert(pluginSettingsSnapshotTable)
      .values({
        snapshotKey: "active",
        capturedAt,
        settingsJson: JSON.stringify(config)
      })
      .onConflictDoUpdate({
        target: pluginSettingsSnapshotTable.snapshotKey,
        set: {
          capturedAt,
          settingsJson: JSON.stringify(config)
        }
      })
      .run();
    this.db
      .insert(auditRulesSnapshotTable)
      .values({
        snapshotKey: "active",
        capturedAt,
        rulesJson: JSON.stringify(config.rules)
      })
      .onConflictDoUpdate({
        target: auditRulesSnapshotTable.snapshotKey,
        set: {
          capturedAt,
          rulesJson: JSON.stringify(config.rules)
        }
      })
      .run();
    this.prune(config);
  }

  private bootstrapSchema(): void {
    if (!this.sqlite) {
      throw new Error("Audit SQLite driver is not initialized");
    }
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        run_id TEXT,
        tool_call_id TEXT,
        session_id TEXT,
        session_key TEXT,
        agent_id TEXT,
        tool_name TEXT,
        decision TEXT,
        severity TEXT,
        outcome TEXT,
        duration_ms INTEGER,
        payload_json TEXT,
        result_summary TEXT,
        error_summary TEXT,
        matched_rule_ids_json TEXT,
        evidence_paths_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_events_occurred_at ON audit_events (occurred_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_events_session_key ON audit_events (session_key);
      CREATE INDEX IF NOT EXISTS idx_audit_events_run_id ON audit_events (run_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_tool_name ON audit_events (tool_name);
      CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events (event_type);

      CREATE TABLE IF NOT EXISTS audit_rules_snapshot (
        snapshot_key TEXT PRIMARY KEY,
        captured_at TEXT NOT NULL,
        rules_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS plugin_settings_snapshot (
        snapshot_key TEXT PRIMARY KEY,
        captured_at TEXT NOT NULL,
        settings_json TEXT NOT NULL
      );
    `);

    this.sqlite
      .prepare(
        "INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)"
      )
      .run(1, new Date().toISOString());
  }

  writeEvent(row: AuditEventRow): void {
    if (!this.db) {
      throw new Error("Audit SQLite store is not initialized");
    }
    this.db
      .insert(auditEventsTable)
      .values({
        eventType: row.eventType,
        occurredAt: row.occurredAt,
        runId: row.runId ?? null,
        toolCallId: row.toolCallId ?? null,
        sessionId: row.sessionId ?? null,
        sessionKey: row.sessionKey ?? null,
        agentId: row.agentId ?? null,
        toolName: row.toolName ?? null,
        decision: row.decision ?? null,
        severity: row.severity ?? null,
        outcome: row.outcome ?? null,
        durationMs: row.durationMs ?? null,
        payloadJson: encodeJson(row.payload),
        resultSummary: row.resultSummary ?? null,
        errorSummary: row.errorSummary ?? null,
        matchedRuleIdsJson: encodeJson(row.matchedRuleIds),
        evidencePathsJson: encodeJson(row.evidencePaths)
      })
      .run();
  }

  prune(config: AuditOpsPluginConfig): void {
    if (!this.db || !config.storage.enabled) {
      return;
    }
    const retentionCutoff = new Date(
      Date.now() - config.storage.retentionDays * 24 * 60 * 60 * 1000
    ).toISOString();

    this.db
      .delete(auditEventsTable)
      .where(lt(auditEventsTable.occurredAt, retentionCutoff))
      .run();

    const countRow = this.db.select({ value: count() }).from(auditEventsTable).get();
    const total = countRow?.value ?? 0;
    if (total > config.storage.maxRows) {
      const overflow = total - config.storage.maxRows;
      const oldestIds = this.db
        .select({ id: auditEventsTable.id })
        .from(auditEventsTable)
        .orderBy(sql`${auditEventsTable.occurredAt} asc`, sql`${auditEventsTable.id} asc`)
        .limit(overflow)
        .all()
        .map((row) => row.id)
        .filter((id): id is number => typeof id === "number");

      if (oldestIds.length > 0) {
        this.db.delete(auditEventsTable).where(inArray(auditEventsTable.id, oldestIds)).run();
      }
    }
  }

  close(): void {
    this.sqlite?.close();
    this.sqlite = null;
    this.db = null;
  }

  getMigrationVersion(): number | null {
    if (!this.db) {
      return null;
    }
    const row = this.db
      .select({ version: schemaMigrationsTable.version })
      .from(schemaMigrationsTable)
      .where(eq(schemaMigrationsTable.version, 1))
      .get();
    return row?.version ?? null;
  }
}
