import { readFile, writeFile } from "node:fs/promises";
import type { AuditOpsPluginConfig } from "../runtime/config";
import { resolveAuditOpsPluginConfig } from "../runtime/config";

type RuntimeConfigRecord = Record<string, unknown>;

export type RuntimeAuditOpsConfigReadResult = {
  exists: boolean;
  config: AuditOpsPluginConfig;
  root: RuntimeConfigRecord;
};

function ensureObject(value: unknown): RuntimeConfigRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RuntimeConfigRecord)
    : {};
}

function getAuditOpsEntry(root: RuntimeConfigRecord): RuntimeConfigRecord | undefined {
  const plugins = ensureObject(root.plugins);
  const entries = ensureObject(plugins.entries);
  const entry = entries["audit-ops"];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return undefined;
  }
  return entry as RuntimeConfigRecord;
}

export async function readRuntimeAuditOpsConfig(configPath: string): Promise<RuntimeAuditOpsConfigReadResult> {
  const raw = JSON.parse(await readFile(configPath, "utf8")) as RuntimeConfigRecord;
  const entry = getAuditOpsEntry(raw);
  return {
    exists: entry !== undefined,
    config: resolveAuditOpsPluginConfig(entry?.config),
    root: raw
  };
}

export async function writeRuntimeAuditOpsConfig(
  configPath: string,
  nextConfig: AuditOpsPluginConfig
): Promise<AuditOpsPluginConfig> {
  const raw = JSON.parse(await readFile(configPath, "utf8")) as RuntimeConfigRecord;
  const normalized = resolveAuditOpsPluginConfig(nextConfig);
  const plugins = ensureObject(raw.plugins);
  const entries = ensureObject(plugins.entries);
  const currentEntry = getAuditOpsEntry(raw) ?? {};

  entries["audit-ops"] = {
    enabled: currentEntry.enabled === false ? false : true,
    ...currentEntry,
    config: normalized
  };
  plugins.entries = entries;
  raw.plugins = plugins;

  await writeFile(configPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  return normalized;
}
