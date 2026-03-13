import Database from "better-sqlite3";
import { readFile } from "node:fs/promises";

export type AuditEventListFilters = {
  eventType?: string;
  toolName?: string;
  decision?: string;
  severity?: string;
  sessionKey?: string;
  limit?: number;
};

export type AuditEventListItem = {
  id: number;
  eventType: string;
  occurredAt: string;
  toolName: string | null;
  decision: string | null;
  severity: string | null;
  sessionKey: string | null;
  payloadJson: string | null;
  resultSummary: string | null;
  errorSummary: string | null;
};

type SnapshotRow = {
  snapshot_key: string;
  captured_at: string;
  payload: string;
};

function withDatabase<T>(dbPath: string, handler: (db: Database.Database) => T): T {
  const db = new Database(dbPath, { readonly: true });
  try {
    return handler(db);
  } finally {
    db.close();
  }
}

function buildWhere(filters: AuditEventListFilters): { whereSql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.eventType) {
    clauses.push("event_type = ?");
    params.push(filters.eventType);
  }
  if (filters.toolName) {
    clauses.push("tool_name = ?");
    params.push(filters.toolName);
  }
  if (filters.decision) {
    clauses.push("decision = ?");
    params.push(filters.decision);
  }
  if (filters.severity) {
    clauses.push("severity = ?");
    params.push(filters.severity);
  }
  if (filters.sessionKey) {
    clauses.push("session_key = ?");
    params.push(filters.sessionKey);
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    params
  };
}

export function listAuditEvents(dbPath: string, filters: AuditEventListFilters = {}): AuditEventListItem[] {
  return withDatabase(dbPath, (db) => {
    const { whereSql, params } = buildWhere(filters);
    const limit = Math.max(1, Math.min(filters.limit ?? 100, 500));

    return db
      .prepare(
        `SELECT id, event_type AS eventType, occurred_at AS occurredAt, tool_name AS toolName,
                decision, severity, session_key AS sessionKey, payload_json AS payloadJson,
                result_summary AS resultSummary, error_summary AS errorSummary
         FROM audit_events
         ${whereSql}
         ORDER BY occurred_at DESC, id DESC
         LIMIT ?`
      )
      .all(...params, limit) as AuditEventListItem[];
  });
}

export function deleteAuditEvents(dbPath: string, ids: number[]): number {
  if (ids.length === 0) {
    return 0;
  }

  const placeholders = ids.map(() => "?").join(", ");
  const db = new Database(dbPath);
  try {
    const result = db.prepare(`DELETE FROM audit_events WHERE id IN (${placeholders})`).run(...ids);
    return result.changes;
  } finally {
    db.close();
  }
}

export function exportAuditEvents(dbPath: string): string {
  return withDatabase(dbPath, (db) => JSON.stringify(db.prepare("SELECT * FROM audit_events ORDER BY occurred_at DESC, id DESC").all(), null, 2));
}

export function readAuditSnapshots(dbPath: string): {
  settings: SnapshotRow | undefined;
  rules: SnapshotRow | undefined;
} {
  return withDatabase(dbPath, (db) => ({
    settings: db
      .prepare(
        `SELECT snapshot_key, captured_at, settings_json AS payload
         FROM plugin_settings_snapshot
         WHERE snapshot_key = 'active'
         LIMIT 1`
      )
      .get() as SnapshotRow | undefined,
    rules: db
      .prepare(
        `SELECT snapshot_key, captured_at, rules_json AS payload
         FROM audit_rules_snapshot
         WHERE snapshot_key = 'active'
         LIMIT 1`
      )
      .get() as SnapshotRow | undefined
  }));
}

export async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"));
}
