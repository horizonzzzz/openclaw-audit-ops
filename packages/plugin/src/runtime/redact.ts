import type { AuditRedactionLevel } from "./config.js";

const REDACTED = "[REDACTED]";
const BASE_SENSITIVE_KEY_PATTERN =
  /(?:token|secret|password|passwd|api[_-]?key|credential|cookie|authorization|session)/i;
const SENSITIVE_VALUE_PATTERN =
  /(?:bearer\s+[a-z0-9._-]+|sk-[a-z0-9_-]+|gh[pousr]_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;
const STRUCTURED_CONTENT_KEY_PATTERN = /(?:content|message|body|payload|text|prompt)$/i;
const MAX_TEXT_LENGTH = 240;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 40;

export type AuditRedactionOptions = {
  level?: AuditRedactionLevel;
  extraSensitiveKeys?: string[];
  maxTextLength?: number;
};

function resolveOptions(options?: AuditRedactionOptions): Required<AuditRedactionOptions> {
  return {
    level: options?.level ?? "standard",
    extraSensitiveKeys: options?.extraSensitiveKeys ?? [],
    maxTextLength: options?.maxTextLength ?? MAX_TEXT_LENGTH
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSensitiveKeyPattern(options: Required<AuditRedactionOptions>): RegExp {
  if (options.extraSensitiveKeys.length === 0) {
    return BASE_SENSITIVE_KEY_PATTERN;
  }
  const extra = options.extraSensitiveKeys.map((entry) => escapeRegExp(entry)).join("|");
  return new RegExp(`${BASE_SENSITIVE_KEY_PATTERN.source}|(?:${extra})`, "i");
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function redactString(value: string, options: Required<AuditRedactionOptions>): string {
  // minimal: no redaction, just truncate
  if (options.level === "minimal") {
    return truncateText(value, options.maxTextLength);
  }
  // standard: redact sensitive values, truncate long text
  if (SENSITIVE_VALUE_PATTERN.test(value)) {
    return REDACTED;
  }
  if (options.level === "strict" && value.length > 32) {
    return `${REDACTED} (len=${value.length})`;
  }
  return truncateText(value, options.maxTextLength);
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

function redactEnvLikeText(value: string, options: Required<AuditRedactionOptions>, sensitiveKeyPattern: RegExp): string | null {
  const lines = value.split(/\r?\n/);
  let sawAssignment = false;
  const redacted = lines.map((line) => {
    const match = line.match(/^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/);
    if (!match) {
      return line;
    }
    sawAssignment = true;
    const [, prefix, key, separator, rawValue] = match;
    const nextValue = sensitiveKeyPattern.test(key)
      ? REDACTED
      : truncateText(redactString(rawValue.trim(), options), options.maxTextLength);
    return `${prefix}${key}${separator}${nextValue}`;
  });
  return sawAssignment ? truncateText(redacted.join("\n"), options.maxTextLength) : null;
}

function redactStructuredString(
  value: string,
  options: Required<AuditRedactionOptions>,
  sensitiveKeyPattern: RegExp
): string | null {
  if (looksLikeJson(value)) {
    try {
      return truncateText(
        JSON.stringify(redactAuditValue(JSON.parse(value), "", options)),
        options.maxTextLength
      );
    } catch {
      return null;
    }
  }

  return redactEnvLikeText(value, options, sensitiveKeyPattern);
}

function redactContextualString(
  value: string,
  keyPath: string,
  options: Required<AuditRedactionOptions>,
  sensitiveKeyPattern: RegExp
): string {
  // minimal: no redaction, only truncate
  if (options.level === "minimal") {
    return truncateText(value, options.maxTextLength);
  }

  const structured = redactStructuredString(value, options, sensitiveKeyPattern);
  if (structured) {
    return structured;
  }

  // standard/strict: redact sensitive key paths
  if (sensitiveKeyPattern.test(keyPath)) {
    return REDACTED;
  }

  if (STRUCTURED_CONTENT_KEY_PATTERN.test(keyPath)) {
    // standard: redact if contains sensitive pattern, else truncate
    if (options.level === "standard") {
      if (BASE_SENSITIVE_KEY_PATTERN.test(value)) {
        return `${REDACTED} (len=${value.length})`;
      }
      return truncateText(value, options.maxTextLength);
    }
    // strict: redact with length indicator
    return `${REDACTED} (len=${value.length})`;
  }

  return redactString(value, options);
}

export function redactAuditValue(value: unknown, keyPath = "", rawOptions?: AuditRedactionOptions): unknown {
  const options = resolveOptions(rawOptions);
  const sensitiveKeyPattern = buildSensitiveKeyPattern(options);
  if (value == null) {
    return value;
  }
  if (typeof value === "string") {
    return sensitiveKeyPattern.test(keyPath)
      ? REDACTED
      : redactContextualString(value, keyPath, options, sensitiveKeyPattern);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    const maxItems = options.level === "strict" ? 10 : MAX_ARRAY_ITEMS;
    const items = value.slice(0, maxItems);
    return items.map((entry, index) =>
      redactAuditValue(entry, keyPath ? `${keyPath}[${index}]` : `[${index}]`, options)
    );
  }
  if (typeof value === "object") {
    const maxEntries = options.level === "strict" ? 20 : MAX_OBJECT_KEYS;
    const entries = Object.entries(value as Record<string, unknown>).slice(0, maxEntries);
    const redacted: Record<string, unknown> = {};
    for (const [key, entry] of entries) {
      const nextPath = keyPath ? `${keyPath}.${key}` : key;
      // minimal: keep original values (only redact explicit sensitive keys)
      // standard/strict: redact sensitive keys
      redacted[key] = sensitiveKeyPattern.test(key) ? REDACTED : redactAuditValue(entry, nextPath, options);
    }
    return redacted;
  }
  return String(value);
}

export function summarizeAuditValue(
  value: unknown,
  maxLength = MAX_TEXT_LENGTH,
  options?: AuditRedactionOptions
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const resolved = resolveOptions({ ...options, maxTextLength: maxLength });
  if (typeof value === "string") {
    return truncateText(redactString(value, resolved), maxLength);
  }
  try {
    const encoded = JSON.stringify(redactAuditValue(value, "", resolved));
    return typeof encoded === "string" ? truncateText(encoded, maxLength) : undefined;
  } catch {
    return truncateText(String(value), maxLength);
  }
}
