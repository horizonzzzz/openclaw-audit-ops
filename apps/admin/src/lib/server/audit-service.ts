import {
  deleteAuditEvents,
  exportAuditEvents,
  listAuditEvents,
  readAuditSnapshots,
  readRuntimeAuditOpsConfig,
  writeRuntimeAuditOpsConfig,
  type AuditEventListFilters,
  type AuditOpsPluginConfig
} from "@horizonzzzz/audit-ops/admin";
import { access } from "node:fs/promises";
import { readTarget } from "./target-store";

export async function getResolvedTarget() {
  return readTarget();
}

export async function getHealth() {
  const target = await readTarget();
  let configReadable = false;
  let databaseReadable = false;

  try {
    await access(target.configPath);
    configReadable = true;
  } catch {}

  try {
    await access(target.dbPath);
    databaseReadable = true;
  } catch {}

  return {
    configReadable,
    databaseReadable,
    configPath: target.configPath,
    dbPath: target.dbPath,
    stateDir: target.stateDir
  };
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
