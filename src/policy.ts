import type {
  AuditMode,
  AuditOpsPluginConfig,
  AuditRule,
  AuditRuleAction,
  AuditSeverity
} from "./config.js";
import { redactAuditValue } from "./redact.js";

export type FlattenedParamEntry = {
  path: string;
  text: string;
};

export type AuditPolicyMatch = {
  ruleId: string;
  severity: AuditSeverity;
  action: AuditRuleAction;
};

export type AuditPolicyDecision = {
  decision: "allow" | "alert" | "block";
  severity: AuditSeverity | null;
  matchedRules: AuditPolicyMatch[];
  sanitizedParams: unknown;
};

const SEVERITY_ORDER: Record<AuditSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function flattenValue(value: unknown, basePath = "", entries: FlattenedParamEntry[] = []): FlattenedParamEntry[] {
  if (value == null || typeof value === "boolean" || typeof value === "number") {
    entries.push({
      path: basePath || "$",
      text: String(value)
    });
    return entries;
  }

  if (typeof value === "string") {
    entries.push({
      path: basePath || "$",
      text: value
    });
    return entries;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      flattenValue(entry, `${basePath}[${index}]`, entries);
    });
    return entries;
  }

  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = basePath ? `${basePath}.${key}` : key;
      flattenValue(entry, nextPath, entries);
    }
    return entries;
  }

  entries.push({
    path: basePath || "$",
    text: String(value)
  });
  return entries;
}

function matchPattern(pattern: string, haystack: string): boolean {
  try {
    return new RegExp(pattern, "i").test(haystack);
  } catch {
    return haystack.toLowerCase().includes(pattern.trim().toLowerCase());
  }
}

function matchesRule(rule: AuditRule, toolName: string, flattened: FlattenedParamEntry[]): boolean {
  const normalizedToolName = normalizeName(toolName);
  const toolNames = rule.match.toolNames?.map(normalizeName);
  if (toolNames && toolNames.length > 0 && !toolNames.includes(normalizedToolName)) {
    return false;
  }

  const pathTargets = rule.match.paramPaths?.map((entry) => entry.trim().toLowerCase());
  if (pathTargets && pathTargets.length > 0) {
    const hasPathMatch = flattened.some((entry) => pathTargets.includes(entry.path.toLowerCase()));
    if (!hasPathMatch) {
      return false;
    }
  }

  const patterns = rule.match.paramPatterns;
  if (patterns && patterns.length > 0) {
    const haystacks = flattened.flatMap((entry) => [entry.text, `${entry.path}=${entry.text}`]);
    const matchedPattern = patterns.some((pattern) =>
      haystacks.some((haystack) => matchPattern(pattern, haystack))
    );
    if (!matchedPattern) {
      return false;
    }
  }

  return Boolean(toolNames?.length || pathTargets?.length || patterns?.length);
}

function resolveDecision(mode: AuditMode, matchedRules: AuditPolicyMatch[]): AuditPolicyDecision["decision"] {
  if (matchedRules.length === 0) {
    return "allow";
  }

  if (
    mode === "enforce" &&
    matchedRules.some(
      (rule) => rule.action === "block" && SEVERITY_ORDER[rule.severity] >= SEVERITY_ORDER.high
    )
  ) {
    return "block";
  }

  if (matchedRules.some((rule) => rule.action === "alert" || rule.action === "block")) {
    return "alert";
  }

  return "allow";
}

function resolveHighestSeverity(matchedRules: AuditPolicyMatch[]): AuditSeverity | null {
  if (matchedRules.length === 0) {
    return null;
  }

  return matchedRules.reduce(
    (highest, current) =>
      highest == null || SEVERITY_ORDER[current.severity] > SEVERITY_ORDER[highest]
        ? current.severity
        : highest,
    null as AuditSeverity | null
  );
}

export function evaluateAuditPolicy(params: {
  config: AuditOpsPluginConfig;
  toolName: string;
  rawParams: unknown;
}): AuditPolicyDecision {
  const flattened = flattenValue(params.rawParams);
  const matchedRules = params.config.rules
    .filter((rule) => rule.enabled)
    .filter((rule) => matchesRule(rule, params.toolName, flattened))
    .map((rule) => ({
      ruleId: rule.id,
      severity: rule.severity,
      action: rule.action
    }));

  return {
    decision: resolveDecision(params.config.mode, matchedRules),
    severity: resolveHighestSeverity(matchedRules),
    matchedRules,
    sanitizedParams: redactAuditValue(params.rawParams)
  };
}
