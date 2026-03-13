import path from "node:path";

export const AUDIT_DB_FILENAME = "audit-ops.sqlite";

export function resolveAuditDatabasePath(stateDir: string): string {
  return path.join(stateDir, AUDIT_DB_FILENAME);
}
