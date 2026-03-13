import { describe, expect, test } from "vitest";
import path from "node:path";
import { AUDIT_DB_FILENAME, resolveAuditDatabasePath } from "../src/admin/target-paths.js";

describe("audit target path resolution", () => {
  test("resolves the sqlite file path from a plugin state directory", () => {
    const stateDir = path.join("C:", "ops", "openclaw", "plugins", "audit-ops");

    expect(resolveAuditDatabasePath(stateDir)).toBe(path.join(stateDir, AUDIT_DB_FILENAME));
  });
});
