import { describe, expect, test } from "vitest";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  readRuntimeAuditOpsConfig,
  writeRuntimeAuditOpsConfig
} from "../src/admin/runtime-config-file.js";

describe("runtime audit-ops config file access", () => {
  test("reads existing audit-ops config from an OpenClaw runtime config file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "audit-ops-config-"));
    const configPath = path.join(tempDir, "openclaw.config.json");

    await writeFile(
      configPath,
      JSON.stringify({
        plugins: {
          entries: {
            "audit-ops": {
              enabled: true,
              config: {
                mode: "enforce",
                storage: {
                  enabled: true,
                  retentionDays: 10,
                  maxRows: 1000
                }
              }
            }
          }
        }
      })
    );

    const result = await readRuntimeAuditOpsConfig(configPath);

    expect(result.exists).toBe(true);
    expect(result.config.mode).toBe("enforce");
    expect(result.config.storage.retentionDays).toBe(10);
  });

  test("creates the audit-ops entry when writing into a runtime config file that does not have it", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "audit-ops-config-"));
    const configPath = path.join(tempDir, "openclaw.config.json");

    await writeFile(configPath, JSON.stringify({ plugins: { entries: {} } }));

    await writeRuntimeAuditOpsConfig(configPath, {
      mode: "observe",
      notifiers: ["log"],
      storage: {
        enabled: true,
        retentionDays: 30,
        maxRows: 50000
      },
      capture: {
        enabledEventTypes: ["before_tool_call"],
        includePayload: true,
        includeResultSummary: true
      },
      redaction: {
        level: "standard",
        extraSensitiveKeys: []
      },
      rules: []
    });

    const raw = JSON.parse(await readFile(configPath, "utf8"));
    expect(raw.plugins.entries["audit-ops"].enabled).toBe(true);
    expect(raw.plugins.entries["audit-ops"].config.mode).toBe("observe");
  });
});
