import fs from "node:fs/promises";
import path from "node:path";
import { resolveAuditOpsPluginConfig } from "./config.js";
import { evaluateAuditPolicy } from "./policy.js";
import { summarizeAuditValue } from "./redact.js";

type PluginLogger = {
  debug?: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

type OpenClawPluginServiceContext = {
  stateDir: string;
  logger: PluginLogger;
};

type OpenClawPluginService = {
  id: string;
  start: (ctx: OpenClawPluginServiceContext) => void | Promise<void>;
  stop?: (ctx: OpenClawPluginServiceContext) => void | Promise<void>;
};

type PluginHookToolContext = {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
  toolName: string;
  toolCallId?: string;
};

type PluginHookBeforeToolCallEvent = {
  toolName: string;
  params: Record<string, unknown>;
  runId?: string;
  toolCallId?: string;
};

type PluginHookBeforeToolCallResult = {
  params?: Record<string, unknown>;
  block?: boolean;
  blockReason?: string;
};

type PluginHookAfterToolCallEvent = {
  toolName: string;
  params: Record<string, unknown>;
  runId?: string;
  toolCallId?: string;
  result?: unknown;
  error?: string;
  durationMs?: number;
};

type AuditEventRecord = {
  ts: string;
  eventType: "blocked" | "completed";
  correlationId: string;
  detectedAt?: string;
  completedAt?: string;
  toolName: string;
  toolCallId?: string;
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
  agentId?: string;
  outcome: "blocked" | "executed" | "failed";
  decision: "allow" | "alert" | "block";
  severity?: string;
  matchedRuleIds: string[];
  evidencePaths?: string[];
  sanitizedParams: unknown;
  resultSummary?: string;
  error?: string;
  durationMs?: number;
};

type PendingAuditRecord = Omit<
  AuditEventRecord,
  "eventType" | "ts" | "completedAt" | "outcome" | "resultSummary" | "error" | "durationMs"
>;

type AuditOpsManagerParams = {
  config?: unknown;
  logger: PluginLogger;
  enqueueSystemEvent: (text: string, options: { sessionKey: string; contextKey?: string | null }) => boolean;
};

function buildSystemEventText(record: AuditEventRecord): string {
  const matched = record.matchedRuleIds.join(", ");
  if (record.decision === "block") {
    return `Audit blocked ${record.toolName} (${record.severity ?? "unknown"}; rules: ${matched}).`;
  }
  return `Audit alert for ${record.toolName} (${record.severity ?? "unknown"}; rules: ${matched}).`;
}

function buildBlockReason(record: AuditEventRecord): string {
  return `Blocked sensitive tool operation: ${record.toolName} matched ${record.matchedRuleIds.join(", ")}`;
}

function buildCorrelationId(params: {
  runId?: string;
  toolCallId?: string;
  toolName: string;
}): string {
  if (params.runId && params.toolCallId) {
    return `${params.runId}:${params.toolCallId}`;
  }
  if (params.toolCallId) {
    return params.toolCallId;
  }
  if (params.runId) {
    return `${params.runId}:${params.toolName}`;
  }
  return `${params.toolName}:${Date.now()}`;
}

export function createAuditOpsManager(params: AuditOpsManagerParams) {
  const config = resolveAuditOpsPluginConfig(params.config);
  let logFilePath: string | null = null;
  const pendingByCorrelationId = new Map<string, PendingAuditRecord>();
  const MAX_PENDING_RECORDS = 1024;

  const ensureLogPath = async (ctx?: OpenClawPluginServiceContext): Promise<string | null> => {
    if (ctx?.stateDir) {
      logFilePath = path.join(ctx.stateDir, "tool-audit.jsonl");
    }
    if (!logFilePath) {
      return null;
    }
    await fs.mkdir(path.dirname(logFilePath), { recursive: true });
    return logFilePath;
  };

  const persistAuditRecord = async (record: AuditEventRecord) => {
    if (!config.notifiers.includes("log")) {
      return;
    }
    const target = await ensureLogPath();
    if (!target) {
      return;
    }
    await fs.appendFile(target, `${JSON.stringify(record)}\n`, "utf8");
  };

  const maybeEmitSystemEvent = (record: AuditEventRecord) => {
    if (record.decision === "allow" || !config.notifiers.includes("system_event")) {
      return;
    }
    if (!record.sessionKey) {
      return;
    }
    params.enqueueSystemEvent(buildSystemEventText(record), {
      sessionKey: record.sessionKey,
      contextKey: record.toolCallId ?? record.toolName
    });
  };

  return {
    createService(): OpenClawPluginService {
      return {
        id: "audit-ops-service",
        async start(ctx) {
          await ensureLogPath(ctx);
          ctx.logger.info(`audit-ops ready (${config.mode} mode)`);
        },
        async stop() {
          logFilePath = null;
          pendingByCorrelationId.clear();
        }
      };
    },

    async handleBeforeToolCall(
      event: PluginHookBeforeToolCallEvent,
      ctx: PluginHookToolContext
    ): Promise<PluginHookBeforeToolCallResult | void> {
      const evaluated = evaluateAuditPolicy({
        config,
        toolName: event.toolName,
        rawParams: event.params
      });
      if (evaluated.matchedRules.length === 0) {
        return;
      }

      const correlationId = buildCorrelationId({
        runId: ctx.runId,
        toolCallId: ctx.toolCallId,
        toolName: event.toolName
      });

      const baseRecord: PendingAuditRecord = {
        correlationId,
        detectedAt: new Date().toISOString(),
        toolName: event.toolName,
        toolCallId: ctx.toolCallId,
        runId: ctx.runId,
        sessionId: ctx.sessionId,
        sessionKey: ctx.sessionKey,
        agentId: ctx.agentId,
        decision: evaluated.decision,
        severity: evaluated.severity ?? undefined,
        matchedRuleIds: evaluated.matchedRules.map((rule) => rule.ruleId),
        evidencePaths: [...new Set(evaluated.matchedRules.flatMap((rule) => rule.evidencePaths))],
        sanitizedParams: evaluated.sanitizedParams
      };
      maybeEmitSystemEvent({
        ...baseRecord,
        ts: baseRecord.detectedAt ?? new Date().toISOString(),
        eventType: evaluated.decision === "block" ? "blocked" : "completed",
        completedAt: evaluated.decision === "block" ? baseRecord.detectedAt : undefined,
        outcome: evaluated.decision === "block" ? "blocked" : "executed"
      });

      if (evaluated.decision === "block") {
        const record: AuditEventRecord = {
          ...baseRecord,
          ts: baseRecord.detectedAt ?? new Date().toISOString(),
          eventType: "blocked",
          completedAt: baseRecord.detectedAt,
          outcome: "blocked"
        };
        await persistAuditRecord(record);
        params.logger.warn(buildBlockReason(record));
        return {
          block: true,
          blockReason: buildBlockReason(record)
        };
      }

      pendingByCorrelationId.set(correlationId, baseRecord);
      if (pendingByCorrelationId.size > MAX_PENDING_RECORDS) {
        const oldest = pendingByCorrelationId.keys().next().value;
        if (oldest) {
          pendingByCorrelationId.delete(oldest);
        }
      }

      params.logger.info(
        `audit-ops observed ${event.toolName} (${baseRecord.severity ?? "unknown"}: ${baseRecord.matchedRuleIds.join(", ")})`
      );
    },

    async handleAfterToolCall(event: PluginHookAfterToolCallEvent, ctx: PluginHookToolContext): Promise<void> {
      const correlationId = buildCorrelationId({
        runId: ctx.runId,
        toolCallId: ctx.toolCallId,
        toolName: event.toolName
      });
      const pendingRecord = pendingByCorrelationId.get(correlationId);
      pendingByCorrelationId.delete(correlationId);

      const evaluated = evaluateAuditPolicy({
        config,
        toolName: event.toolName,
        rawParams: event.params
      });
      if (!pendingRecord && evaluated.matchedRules.length === 0) {
        return;
      }

      const record: AuditEventRecord = {
        ts: new Date().toISOString(),
        eventType: "completed",
        correlationId,
        detectedAt: pendingRecord?.detectedAt,
        completedAt: new Date().toISOString(),
        toolName: event.toolName,
        toolCallId: ctx.toolCallId,
        runId: ctx.runId,
        sessionId: ctx.sessionId,
        sessionKey: ctx.sessionKey,
        agentId: ctx.agentId,
        outcome: event.error ? "failed" : "executed",
        decision: pendingRecord?.decision ?? evaluated.decision,
        severity: pendingRecord?.severity ?? evaluated.severity ?? undefined,
        matchedRuleIds:
          pendingRecord?.matchedRuleIds ?? evaluated.matchedRules.map((rule) => rule.ruleId),
        evidencePaths:
          pendingRecord?.evidencePaths ??
          [...new Set(evaluated.matchedRules.flatMap((rule) => rule.evidencePaths))],
        sanitizedParams: pendingRecord?.sanitizedParams ?? evaluated.sanitizedParams,
        resultSummary: summarizeAuditValue(event.result),
        error: event.error ? summarizeAuditValue(event.error) : undefined,
        durationMs: event.durationMs
      };

      await persistAuditRecord(record);
    }
  };
}
