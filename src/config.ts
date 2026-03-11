export type AuditSeverity = "low" | "medium" | "high" | "critical";
export type AuditRuleAction = "allow" | "alert" | "block";
export type AuditNotifier = "log" | "system_event";
export type AuditMode = "observe" | "enforce";

export type AuditRuleMatch = {
  toolNames?: string[];
  paramPaths?: string[];
  paramPatterns?: string[];
};

export type AuditRule = {
  id: string;
  enabled: boolean;
  severity: AuditSeverity;
  action: AuditRuleAction;
  match: AuditRuleMatch;
};

export type AuditOpsPluginConfig = {
  mode: AuditMode;
  notifiers: AuditNotifier[];
  rules: AuditRule[];
};

export const DEFAULT_AUDIT_RULES: AuditRule[] = [
  {
    id: "exec-destructive-commands",
    enabled: true,
    severity: "critical",
    action: "block",
    match: {
      toolNames: ["exec", "process"],
      paramPaths: ["command", "cmd"],
      paramPatterns: [
        "(?:^|&&|\\|\\||;|\\n)\\s*(?:sudo\\s+)?rm\\s+-rf(?:\\s|$)",
        "(?:^|&&|\\|\\||;|\\n)\\s*(?:sudo\\s+)?mkfs(?:\\.[a-z0-9_-]+)?\\b",
        "(?:^|&&|\\|\\||;|\\n)\\s*dd\\s+if=",
        "(?:^|&&|\\|\\||;|\\n)\\s*chmod\\s+-R\\s+777\\b",
        "(?:^|&&|\\|\\||;|\\n)\\s*git\\s+push\\s+--force(?:-with-lease)?\\b",
        "(?:^|&&|\\|\\||;|\\n)\\s*npm\\s+publish\\b",
        "(?:^|&&|\\|\\||;|\\n)\\s*gh\\s+pr\\s+merge\\b"
      ]
    }
  },
  {
    id: "write-sensitive-files",
    enabled: true,
    severity: "high",
    action: "block",
    match: {
      toolNames: ["write", "edit"],
      paramPaths: ["path", "content"],
      paramPatterns: [
        "\\.env(?:\\.|$)",
        "\\bid_rsa\\b",
        "\\.pem\\b",
        "\\b(secret|password|token|credential|api[_-]?key)\\b"
      ]
    }
  },
  {
    id: "message-sensitive-payloads",
    enabled: true,
    severity: "high",
    action: "alert",
    match: {
      toolNames: ["message", "gateway"],
      paramPaths: ["message", "content", "body", "payload"],
      paramPatterns: ["\\b(secret|password|token|credential|api[_-]?key)\\b"]
    }
  }
];

export const DEFAULT_AUDIT_OPS_PLUGIN_CONFIG: AuditOpsPluginConfig = {
  mode: "observe",
  notifiers: ["log", "system_event"],
  rules: DEFAULT_AUDIT_RULES.map((rule) => ({
    ...rule,
    match: {
      toolNames: rule.match.toolNames ? [...rule.match.toolNames] : undefined,
      paramPaths: rule.match.paramPaths ? [...rule.match.paramPaths] : undefined,
      paramPatterns: rule.match.paramPatterns ? [...rule.match.paramPatterns] : undefined
    }
  }))
};

const AUDIT_OPS_PLUGIN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: {
      type: "string",
      enum: ["observe", "enforce"],
      default: DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.mode
    },
    notifiers: {
      type: "array",
      items: {
        type: "string",
        enum: ["log", "system_event"]
      },
      default: DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.notifiers
    },
    rules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          enabled: { type: "boolean", default: true },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"]
          },
          action: {
            type: "string",
            enum: ["allow", "alert", "block"]
          },
          match: {
            type: "object",
            additionalProperties: false,
            properties: {
              toolNames: { type: "array", items: { type: "string" } },
              paramPaths: { type: "array", items: { type: "string" } },
              paramPatterns: { type: "array", items: { type: "string" } }
            }
          }
        },
        required: ["id", "severity", "action", "match"]
      }
    }
  }
} as const;

function cloneDefaultConfig(): AuditOpsPluginConfig {
  return {
    mode: DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.mode,
    notifiers: [...DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.notifiers],
    rules: DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.rules.map((rule) => ({
      ...rule,
      match: {
        toolNames: rule.match.toolNames ? [...rule.match.toolNames] : undefined,
        paramPaths: rule.match.paramPaths ? [...rule.match.paramPaths] : undefined,
        paramPatterns: rule.match.paramPatterns ? [...rule.match.paramPatterns] : undefined
      }
    }))
  };
}

function normalizeStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeMode(value: unknown): AuditMode {
  return value === "enforce" ? "enforce" : "observe";
}

function normalizeNotifierList(value: unknown): AuditNotifier[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.notifiers];
  }
  const normalized = value.filter(
    (entry): entry is AuditNotifier => entry === "log" || entry === "system_event"
  );
  return normalized.length > 0 ? normalized : [...DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.notifiers];
}

function normalizeSeverity(value: unknown): AuditSeverity {
  switch (value) {
    case "low":
    case "medium":
    case "high":
    case "critical":
      return value;
    default:
      return "medium";
  }
}

function normalizeAction(value: unknown): AuditRuleAction {
  switch (value) {
    case "allow":
    case "alert":
    case "block":
      return value;
    default:
      return "alert";
  }
}

function normalizeRule(value: unknown): AuditRule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (!id) {
    return null;
  }

  const matchRaw = record.match;
  const matchRecord =
    matchRaw && typeof matchRaw === "object" && !Array.isArray(matchRaw)
      ? (matchRaw as Record<string, unknown>)
      : {};
  const match: AuditRuleMatch = {
    toolNames: normalizeStringList(matchRecord.toolNames),
    paramPaths: normalizeStringList(matchRecord.paramPaths),
    paramPatterns: normalizeStringList(matchRecord.paramPatterns)
  };
  if (!match.toolNames && !match.paramPaths && !match.paramPatterns) {
    return null;
  }

  return {
    id,
    enabled: record.enabled !== false,
    severity: normalizeSeverity(record.severity),
    action: normalizeAction(record.action),
    match
  };
}

export function resolveAuditOpsPluginConfig(rawConfig: unknown): AuditOpsPluginConfig {
  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    return cloneDefaultConfig();
  }

  const record = rawConfig as Record<string, unknown>;
  const rules = Array.isArray(record.rules)
    ? record.rules.map(normalizeRule).filter((rule): rule is AuditRule => rule !== null)
    : undefined;

  return {
    mode: normalizeMode(record.mode),
    notifiers: normalizeNotifierList(record.notifiers),
    rules: rules && rules.length > 0 ? rules : cloneDefaultConfig().rules
  };
}

export const auditOpsPluginConfigSchema = {
  safeParse(value: unknown) {
    try {
      return {
        success: true,
        data: resolveAuditOpsPluginConfig(value)
      };
    } catch (error) {
      return {
        success: false,
        error: {
          issues: [{ path: [], message: error instanceof Error ? error.message : String(error) }]
        }
      };
    }
  },
  jsonSchema: AUDIT_OPS_PLUGIN_JSON_SCHEMA,
  uiHints: {
    mode: {
      label: "Enforcement mode",
      help: "Observe records and alerts only. Enforce blocks matching high-risk rules."
    },
    notifiers: {
      label: "Alert sinks",
      help: "Use log for plugin logs and system_event for prompt-visible alerts."
    },
    rules: {
      label: "Audit rules",
      help: "Match sensitive tool operations by tool name, param path, or regex pattern."
    }
  }
};
