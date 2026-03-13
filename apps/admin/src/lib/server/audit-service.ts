import {
  deleteAuditEvents,
  exportAuditEvents,
  listAuditEvents,
  readAuditSnapshots,
  readRuntimeAuditOpsConfig,
  resolveAuditDatabasePath,
  writeRuntimeAuditOpsConfig,
  type AuditEventListFilters,
  type AuditOpsPluginConfig
} from "@horizonzzzz/audit-ops/admin";
import { access } from "node:fs/promises";
import { readTarget } from "./target-store";

export async function getResolvedTarget() {
  const target = await readTarget();
  if (!target) {
    throw new Error("TARGET_NOT_CONFIGURED");
  }
  return {
    ...target,
    dbPath: resolveAuditDatabasePath(target.stateDir)
  };
}

export async function getHealth() {
  const target = await readTarget();
  if (!target) {
    return { configured: false, configReadable: false, databaseReadable: false };
  }

  const dbPath = resolveAuditDatabasePath(target.stateDir);
  let configReadable = false;
  let databaseReadable = false;

  try {
    await access(target.configPath);
    configReadable = true;
  } catch {}

  try {
    await access(dbPath);
    databaseReadable = true;
  } catch {}

  return { configured: true, configReadable, databaseReadable, configPath: target.configPath, dbPath };
}

export async function getRuntimeConfig() {
  const target = await getResolvedTarget();
  return readRuntimeAuditOpsConfig(target.configPath);
}

export async function saveRuntimeConfig(config: AuditOpsPluginConfig) {
  const target = await getResolvedTarget();
  return writeRuntimeAuditOpsConfig(target.configPath, config);
}

export async function getEvents(filters: AuditEventListFilters) {
  const target = await getResolvedTarget();
  return listAuditEvents(target.dbPath, filters);
}

export async function removeEvents(ids: number[]) {
  const target = await getResolvedTarget();
  return deleteAuditEvents(target.dbPath, ids);
}

export async function downloadEvents() {
  const target = await getResolvedTarget();
  return exportAuditEvents(target.dbPath);
}

export async function getSnapshots() {
  const target = await getResolvedTarget();
  return readAuditSnapshots(target.dbPath);
}
