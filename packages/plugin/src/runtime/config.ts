export type AuditSeverity = "low" | "medium" | "high" | "critical";
export type AuditRuleAction = "allow" | "alert" | "block";
export type AuditNotifier = "log" | "system_event";
export type AuditMode = "observe" | "enforce";
export type AuditCaptureEventType =
  | "before_model_resolve"
  | "before_prompt_build"
  | "before_agent_start"
  | "llm_input"
  | "llm_output"
  | "agent_end"
  | "before_compaction"
  | "after_compaction"
  | "before_reset"
  | "message_received"
  | "message_sending"
  | "message_sent"
  | "before_tool_call"
  | "after_tool_call"
  | "tool_result_persist"
  | "before_message_write"
  | "session_start"
  | "session_end"
  | "subagent_spawning"
  | "subagent_delivery_target"
  | "subagent_spawned"
  | "subagent_ended"
  | "gateway_start"
  | "gateway_stop";
export type AuditRedactionLevel = "minimal" | "standard" | "strict";

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
  storage: {
    enabled: boolean;
    retentionDays: number;
    maxRows: number;
  };
  capture: {
    enabledEventTypes: AuditCaptureEventType[];
    includePayload: boolean;
    includeResultSummary: boolean;
  };
  redaction: {
    level: AuditRedactionLevel;
    extraSensitiveKeys: string[];
  };
  rules: AuditRule[];
};

export const ALL_AUDIT_CAPTURE_EVENT_TYPES: AuditCaptureEventType[] = [
  "before_model_resolve",
  "before_prompt_build",
  "before_agent_start",
  "llm_input",
  "llm_output",
  "agent_end",
  "before_compaction",
  "after_compaction",
  "before_reset",
  "message_received",
  "message_sending",
  "message_sent",
  "before_tool_call",
  "after_tool_call",
  "tool_result_persist",
  "before_message_write",
  "session_start",
  "session_end",
  "subagent_spawning",
  "subagent_delivery_target",
  "subagent_spawned",
  "subagent_ended",
  "gateway_start",
  "gateway_stop"
];

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
  storage: {
    enabled: true,
    retentionDays: 30,
    maxRows: 50000
  },
  capture: {
    enabledEventTypes: [...ALL_AUDIT_CAPTURE_EVENT_TYPES],
    includePayload: true,
    includeResultSummary: true
  },
  redaction: {
    level: "standard",
    extraSensitiveKeys: []
  },
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
    storage: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean", default: true },
        retentionDays: { type: "integer", minimum: 1, default: 30 },
        maxRows: { type: "integer", minimum: 100, default: 50000 }
      }
    },
    capture: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabledEventTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ALL_AUDIT_CAPTURE_EVENT_TYPES
          },
          default: ALL_AUDIT_CAPTURE_EVENT_TYPES
        },
        includePayload: { type: "boolean", default: true },
        includeResultSummary: { type: "boolean", default: true }
      }
    },
    redaction: {
      type: "object",
      additionalProperties: false,
      properties: {
        level: {
          type: "string",
          enum: ["minimal", "standard", "strict"],
          default: "standard"
        },
        extraSensitiveKeys: {
          type: "array",
          items: { type: "string" },
          default: []
        }
      }
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
    storage: {
      enabled: DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.storage.enabled,
      retentionDays: DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.storage.retentionDays,
      maxRows: DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.storage.maxRows
    },
    capture: {
      enabledEventTypes: [...DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.capture.enabledEventTypes],
      includePayload: DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.capture.includePayload,
      includeResultSummary: DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.capture.includeResultSummary
    },
    redaction: {
      level: DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.redaction.level,
      extraSensitiveKeys: [...DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.redaction.extraSensitiveKeys]
    },
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

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeInteger(value: unknown, fallback: number, minimum: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(minimum, Math.trunc(value));
}

function normalizeCaptureEventTypes(value: unknown): AuditCaptureEventType[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.capture.enabledEventTypes];
  }
  const normalized = value.filter((entry): entry is AuditCaptureEventType =>
    ALL_AUDIT_CAPTURE_EVENT_TYPES.includes(entry as AuditCaptureEventType)
  );
  return normalized.length > 0
    ? [...new Set(normalized)]
    : [...DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.capture.enabledEventTypes];
}

function normalizeRedactionLevel(value: unknown): AuditRedactionLevel {
  switch (value) {
    case "minimal":
    case "standard":
    case "strict":
      return value;
    default:
      return DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.redaction.level;
  }
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
  const storageRecord =
    record.storage && typeof record.storage === "object" && !Array.isArray(record.storage)
      ? (record.storage as Record<string, unknown>)
      : {};
  const captureRecord =
    record.capture && typeof record.capture === "object" && !Array.isArray(record.capture)
      ? (record.capture as Record<string, unknown>)
      : {};
  const redactionRecord =
    record.redaction && typeof record.redaction === "object" && !Array.isArray(record.redaction)
      ? (record.redaction as Record<string, unknown>)
      : {};
  const rules = Array.isArray(record.rules)
    ? record.rules.map(normalizeRule).filter((rule): rule is AuditRule => rule !== null)
    : undefined;

  return {
    mode: normalizeMode(record.mode),
    notifiers: normalizeNotifierList(record.notifiers),
    storage: {
      enabled: normalizeBoolean(storageRecord.enabled, DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.storage.enabled),
      retentionDays: normalizeInteger(
        storageRecord.retentionDays,
        DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.storage.retentionDays,
        1
      ),
      maxRows: normalizeInteger(storageRecord.maxRows, DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.storage.maxRows, 100)
    },
    capture: {
      enabledEventTypes: normalizeCaptureEventTypes(captureRecord.enabledEventTypes),
      includePayload: normalizeBoolean(
        captureRecord.includePayload,
        DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.capture.includePayload
      ),
      includeResultSummary: normalizeBoolean(
        captureRecord.includeResultSummary,
        DEFAULT_AUDIT_OPS_PLUGIN_CONFIG.capture.includeResultSummary
      )
    },
    redaction: {
      level: normalizeRedactionLevel(redactionRecord.level),
      extraSensitiveKeys: normalizeStringList(redactionRecord.extraSensitiveKeys) ?? []
    },
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
    storage: {
      label: "Storage",
      help: "Persist audit events to SQLite with retention and row limits."
    },
    capture: {
      label: "Capture policy",
      help: "Choose which lifecycle events are recorded and whether payloads are kept."
    },
    redaction: {
      label: "Redaction",
      help: "Control how aggressively prompts, messages, params, and results are sanitized."
    },
    rules: {
      label: "Audit rules",
      help: "Match sensitive tool operations by tool name, param path, or regex pattern."
    }
  }
};
