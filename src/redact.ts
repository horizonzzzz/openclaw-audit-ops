const REDACTED = "[REDACTED]";
const SENSITIVE_KEY_PATTERN =
  /(?:token|secret|password|passwd|api[_-]?key|credential|cookie|authorization|session)/i;
const SENSITIVE_VALUE_PATTERN =
  /(?:bearer\s+[a-z0-9._-]+|sk-[a-z0-9_-]+|gh[pousr]_[a-z0-9_]+|xox[baprs]-[a-z0-9-]+)/i;
const STRUCTURED_CONTENT_KEY_PATTERN = /(?:content|message|body|payload|text)$/i;
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

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

function redactEnvLikeText(value: string): string | null {
  const lines = value.split(/\r?\n/);
  let sawAssignment = false;
  const redacted = lines.map((line) => {
    const match = line.match(/^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/);
    if (!match) {
      return line;
    }
    sawAssignment = true;
    const [, prefix, key, separator, rawValue] = match;
    const nextValue = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED
      : truncateText(redactString(rawValue.trim()));
    return `${prefix}${key}${separator}${nextValue}`;
  });
  return sawAssignment ? truncateText(redacted.join("\n")) : null;
}

function redactStructuredString(value: string): string | null {
  if (looksLikeJson(value)) {
    try {
      return truncateText(JSON.stringify(redactAuditValue(JSON.parse(value))));
    } catch {
      return null;
    }
  }

  return redactEnvLikeText(value);
}

function redactContextualString(value: string, keyPath: string): string {
  const structured = redactStructuredString(value);
  if (structured) {
    return structured;
  }

  if (STRUCTURED_CONTENT_KEY_PATTERN.test(keyPath) && SENSITIVE_KEY_PATTERN.test(value)) {
    return `${REDACTED} (len=${value.length})`;
  }

  return redactString(value);
}

export function redactAuditValue(value: unknown, keyPath = ""): unknown {
  if (value == null) {
    return value;
  }
  if (typeof value === "string") {
    return SENSITIVE_KEY_PATTERN.test(keyPath) ? REDACTED : redactContextualString(value, keyPath);
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
