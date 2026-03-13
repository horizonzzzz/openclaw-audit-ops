import os from "node:os";
import path from "node:path";
import { resolveAuditDatabasePath } from "@horizonzzzz/audit-ops/admin";

export type AdminTarget = {
  configPath: string;
  stateDir: string;
  dbPath: string;
};

export function resolveDefaultStateDir(homedir: () => string = os.homedir): string {
  return path.join(homedir(), ".openclaw");
}

export function resolveDefaultConfigPath(homedir: () => string = os.homedir): string {
  return path.join(resolveDefaultStateDir(homedir), "openclaw.json");
}

export async function readTarget(homedir: () => string = os.homedir): Promise<AdminTarget> {
  const stateDir = resolveDefaultStateDir(homedir);

  return {
    stateDir,
    configPath: resolveDefaultConfigPath(homedir),
    dbPath: resolveAuditDatabasePath(stateDir)
  };
}
