const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /(?:token|secret|password|passwd|api[_-]?key|credential|cookie|authorization|session)/i;
const SENSITIVE_VALUE_PATTERN =
  /(?:bearer\s+[a-z0-9._-]+|sk-[a-z0-9_-]+|gh[pousr]_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;
const MAX_TEXT_LENGTH = 240;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 40;

function truncateText(value: string, maxLength = MAX_TEXT_LENGTH): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function redactString(value: string): string {
  if (SENSITIVE_VALUE_PATTERN.test(value)) {
    return REDACTED;
  }
  return truncateText(value);
}

export function redactAuditValue(value: unknown, keyPath = ""): unknown {
  if (value == null) {
    return value;
  }
  if (typeof value === "string") {
    return SENSITIVE_KEY_PATTERN.test(keyPath) ? REDACTED : redactString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((entry, index) =>
      redactAuditValue(entry, keyPath ? `${keyPath}[${index}]` : `[${index}]`)
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_OBJECT_KEYS);
    const redacted: Record<string, unknown> = {};
    for (const [key, entry] of entries) {
      const nextPath = keyPath ? `${keyPath}.${key}` : key;
      redacted[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactAuditValue(entry, nextPath);
    }
    return redacted;
  }
  return String(value);
}

export function summarizeAuditValue(value: unknown, maxLength = MAX_TEXT_LENGTH): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    return truncateText(redactString(value), maxLength);
  }
  try {
    const encoded = JSON.stringify(redactAuditValue(value));
    return typeof encoded === "string" ? truncateText(encoded, maxLength) : undefined;
  } catch {
    return truncateText(String(value), maxLength);
  }
}
