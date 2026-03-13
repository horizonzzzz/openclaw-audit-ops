import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { readTarget } from "../src/lib/server/target-store";

describe("default target resolution", () => {
  test("resolves config and sqlite paths from ~/.openclaw", async () => {
    const home = path.join("C:", "Users", "alice");
    const target = await readTarget(() => home);

    expect(target.stateDir).toBe(path.join(home, ".openclaw"));
    expect(target.configPath).toBe(path.join(home, ".openclaw", "openclaw.json"));
    expect(target.dbPath).toBe(path.join(home, ".openclaw", "audit-ops.sqlite"));
  });

  test("uses the current user home by default", async () => {
    const target = await readTarget();
    const stateDir = path.join(os.homedir(), ".openclaw");

    expect(target.stateDir).toBe(stateDir);
    expect(target.configPath).toBe(path.join(stateDir, "openclaw.json"));
    expect(target.dbPath).toBe(path.join(stateDir, "audit-ops.sqlite"));
  });
});
