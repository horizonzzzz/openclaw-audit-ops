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
  phase: "before_tool_call" | "after_tool_call";
  toolName: string;
  toolCallId?: string;
  runId?: string;
  sessionId?: string;
  sessionKey?: string;
  agentId?: string;
  decision: "allow" | "alert" | "block";
  severity?: string;
  matchedRuleIds: string[];
  sanitizedParams: unknown;
  resultSummary?: string;
  error?: string;
  durationMs?: number;
};

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

export function createAuditOpsManager(params: AuditOpsManagerParams) {
  const config = resolveAuditOpsPluginConfig(params.config);
  let logFilePath: string | null = null;

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

      const record: AuditEventRecord = {
        ts: new Date().toISOString(),
        phase: "before_tool_call",
        toolName: event.toolName,
        toolCallId: ctx.toolCallId,
        runId: ctx.runId,
        sessionId: ctx.sessionId,
        sessionKey: ctx.sessionKey,
        agentId: ctx.agentId,
        decision: evaluated.decision,
        severity: evaluated.severity ?? undefined,
        matchedRuleIds: evaluated.matchedRules.map((rule) => rule.ruleId),
        sanitizedParams: evaluated.sanitizedParams
      };

      await persistAuditRecord(record);
      maybeEmitSystemEvent(record);

      if (evaluated.decision === "block") {
        params.logger.warn(buildBlockReason(record));
        return {
          block: true,
          blockReason: buildBlockReason(record)
        };
      }

      params.logger.info(
        `audit-ops observed ${event.toolName} (${record.severity ?? "unknown"}: ${record.matchedRuleIds.join(", ")})`
      );
    },

    async handleAfterToolCall(event: PluginHookAfterToolCallEvent, ctx: PluginHookToolContext): Promise<void> {
      const evaluated = evaluateAuditPolicy({
        config,
        toolName: event.toolName,
        rawParams: event.params
      });
      if (evaluated.matchedRules.length === 0 && !event.error) {
        return;
      }

      const record: AuditEventRecord = {
        ts: new Date().toISOString(),
        phase: "after_tool_call",
        toolName: event.toolName,
        toolCallId: ctx.toolCallId,
        runId: ctx.runId,
        sessionId: ctx.sessionId,
        sessionKey: ctx.sessionKey,
        agentId: ctx.agentId,
        decision: evaluated.decision,
        severity: evaluated.severity ?? undefined,
        matchedRuleIds: evaluated.matchedRules.map((rule) => rule.ruleId),
        sanitizedParams: evaluated.sanitizedParams,
        resultSummary: summarizeAuditValue(event.result),
        error: event.error ? summarizeAuditValue(event.error) : undefined,
        durationMs: event.durationMs
      };

      await persistAuditRecord(record);
    }
  };
}
