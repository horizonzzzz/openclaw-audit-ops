import { describe, expect, test } from "vitest";
import {
  formatDecisionLabel,
  formatModeLabel,
  formatSeverityLabel,
  formatStorageHealth
} from "../src/lib/ui/labels";

describe("admin chinese labels", () => {
  test("maps plugin mode values to chinese labels", () => {
    expect(formatModeLabel("observe")).toBe("观察模式");
    expect(formatModeLabel("enforce")).toBe("拦截模式");
  });

  test("maps risk decisions and severity to chinese labels", () => {
    expect(formatDecisionLabel("allow")).toBe("放行");
    expect(formatDecisionLabel("alert")).toBe("告警");
    expect(formatDecisionLabel("block")).toBe("阻断");
    expect(formatSeverityLabel("critical")).toBe("严重");
  });

  test("formats target health summary in chinese", () => {
    expect(
      formatStorageHealth({
        configured: true,
        configReadable: true,
        databaseReadable: false
      })
    ).toBe("配置文件可读，SQLite 不可读");
  });
});
