type HealthState = {
  configured: boolean;
  configReadable: boolean;
  databaseReadable: boolean;
};

export function formatModeLabel(mode: string): string {
  return mode === "enforce" ? "拦截模式" : "观察模式";
}

export function formatDecisionLabel(decision: string | null | undefined): string {
  switch (decision) {
    case "allow":
      return "放行";
    case "alert":
      return "告警";
    case "block":
      return "阻断";
    default:
      return "未知";
  }
}

export function formatSeverityLabel(severity: string | null | undefined): string {
  switch (severity) {
    case "low":
      return "低";
    case "medium":
      return "中";
    case "high":
      return "高";
    case "critical":
      return "严重";
    default:
      return "未标记";
  }
}

export function formatStorageHealth(health: HealthState): string {
  if (!health.configured) {
    return "尚未配置目标环境";
  }

  const configText = health.configReadable ? "配置文件可读" : "配置文件不可读";
  const dbText = health.databaseReadable ? "SQLite 可读" : "SQLite 不可读";
  return `${configText}，${dbText}`;
}

export function formatBooleanLabel(value: boolean): string {
  return value ? "已启用" : "已关闭";
}
