import path from "node:path";
import type { AuditCaptureEventType, AuditOpsPluginConfig } from "./config.js";
import { resolveAuditOpsPluginConfig } from "./config.js";
import { evaluateAuditPolicy } from "./policy.js";
import { redactAuditValue, summarizeAuditValue } from "./redact.js";
import { AuditSqliteStore, type AuditEventRow } from "./store.js";

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

type AgentHookContext = {
  agentId?: string;
  sessionKey?: string;
  sessionId?: string;
  runId?: string;
};

type MessageHookContext = {
  channelId?: string;
  accountId?: string;
  conversationId?: string;
};

type ToolHookContext = AgentHookContext & {
  toolName: string;
  toolCallId?: string;
};

type ToolPersistHookContext = AgentHookContext & {
  toolName?: string;
  toolCallId?: string;
};

type GatewayHookContext = {
  port?: number;
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

type PendingToolAudit = {
  decision: "allow" | "alert" | "block";
  severity?: string;
  matchedRuleIds: string[];
  evidencePaths?: string[];
  sanitizedParams: unknown;
};

type AuditOpsManagerParams = {
  config?: unknown;
  logger: PluginLogger;
  enqueueSystemEvent: (text: string, options: { sessionKey: string; contextKey?: string | null }) => boolean;
};

function buildSystemEventText(record: AuditEventRow): string {
  const matched = record.matchedRuleIds?.join(", ") ?? "none";
  if (record.decision === "block") {
    return `Audit blocked ${record.toolName ?? record.eventType} (${record.severity ?? "unknown"}; rules: ${matched}).`;
  }
  return `Audit alert for ${record.toolName ?? record.eventType} (${record.severity ?? "unknown"}; rules: ${matched}).`;
}

function buildBlockReason(record: AuditEventRow): string {
  return `Blocked sensitive tool operation: ${record.toolName} matched ${(record.matchedRuleIds ?? []).join(", ")}`;
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

function shouldCaptureEvent(config: AuditOpsPluginConfig, eventType: AuditCaptureEventType): boolean {
  return config.capture.enabledEventTypes.includes(eventType);
}

export function createAuditOpsManager(params: AuditOpsManagerParams) {
  const config = resolveAuditOpsPluginConfig(params.config);
  const pendingByCorrelationId = new Map<string, PendingToolAudit>();
  const MAX_PENDING_RECORDS = 1024;
  let store: AuditSqliteStore | null = null;
  let writeCount = 0;

  const writeEvent = (eventType: AuditCaptureEventType, row: Omit<AuditEventRow, "eventType" | "occurredAt">) => {
    if (!config.storage.enabled || !store || !shouldCaptureEvent(config, eventType)) {
      return;
    }
    store.writeEvent({
      eventType,
      occurredAt: new Date().toISOString(),
      ...row
    });
    writeCount += 1;
    if (writeCount % 100 === 0) {
      store.prune(config);
    }
  };

  const sanitizePayload = (payload: unknown) =>
    config.capture.includePayload ? redactAuditValue(payload, "", config.redaction) : undefined;

  const summarizeValue = (value: unknown) =>
    config.capture.includeResultSummary ? summarizeAuditValue(value, undefined, config.redaction) : undefined;

  const maybeEmitSystemEvent = (record: AuditEventRow) => {
    if (record.decision === "allow" || !config.notifiers.includes("system_event")) {
      return;
    }
    if (!record.sessionKey) {
      return;
    }
    params.enqueueSystemEvent(buildSystemEventText(record), {
      sessionKey: record.sessionKey,
      contextKey: record.toolCallId ?? record.toolName ?? record.eventType
    });
  };

  const maybeLogDecision = (record: AuditEventRow) => {
    if (!config.notifiers.includes("log") || record.decision === "allow") {
      return;
    }
    const message = `${record.eventType} ${record.toolName ?? ""} (${record.severity ?? "unknown"}: ${(record.matchedRuleIds ?? []).join(", ")})`.trim();
    if (record.decision === "block") {
      params.logger.warn(message);
      return;
    }
    params.logger.info(message);
  };

  const recordAgentEvent = (eventType: AuditCaptureEventType, event: unknown, ctx: AgentHookContext) => {
    writeEvent(eventType, {
      runId: ctx.runId,
      sessionId: ctx.sessionId,
      sessionKey: ctx.sessionKey,
      agentId: ctx.agentId,
      payload: sanitizePayload(event)
    });
  };

  const recordMessageEvent = (eventType: AuditCaptureEventType, event: unknown, ctx: MessageHookContext) => {
    writeEvent(eventType, {
      sessionKey: ctx.conversationId,
      payload: sanitizePayload({
        ...((typeof event === "object" && event != null) ? (event as Record<string, unknown>) : { value: event }),
        channelId: ctx.channelId,
        accountId: ctx.accountId,
        conversationId: ctx.conversationId
      })
    });
  };

  const recordGatewayEvent = (eventType: AuditCaptureEventType, event: unknown, ctx: GatewayHookContext) => {
    writeEvent(eventType, {
      payload: sanitizePayload({
        ...((typeof event === "object" && event != null) ? (event as Record<string, unknown>) : { value: event }),
        port: ctx.port
      })
    });
  };

  return {
    createService(): OpenClawPluginService {
      return {
        id: "audit-ops-service",
        async start(ctx) {
          if (config.storage.enabled) {
            store = new AuditSqliteStore(path.join(ctx.stateDir, "audit-ops.sqlite"));
            await store.init(config);
          }
          ctx.logger.info(`audit-ops ready (${config.mode} mode)`);
        },
        async stop() {
          store?.close();
          store = null;
          pendingByCorrelationId.clear();
        }
      };
    },

    handleBeforeModelResolve(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("before_model_resolve", event, ctx);
    },

    handleBeforePromptBuild(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("before_prompt_build", event, ctx);
    },

    handleBeforeAgentStart(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("before_agent_start", event, ctx);
    },

    handleLlmInput(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("llm_input", event, ctx);
    },

    handleLlmOutput(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("llm_output", event, ctx);
    },

    handleAgentEnd(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("agent_end", event, ctx);
    },

    handleBeforeCompaction(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("before_compaction", event, ctx);
    },

    handleAfterCompaction(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("after_compaction", event, ctx);
    },

    handleBeforeReset(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("before_reset", event, ctx);
    },

    handleMessageReceived(event: unknown, ctx: MessageHookContext): void {
      recordMessageEvent("message_received", event, ctx);
    },

    handleMessageSending(event: unknown, ctx: MessageHookContext): void {
      recordMessageEvent("message_sending", event, ctx);
    },

    handleMessageSent(event: unknown, ctx: MessageHookContext): void {
      recordMessageEvent("message_sent", event, ctx);
    },

    handleToolResultPersist(event: unknown, ctx: ToolPersistHookContext): void {
      writeEvent("tool_result_persist", {
        runId: ctx.runId,
        toolCallId: ctx.toolCallId,
        sessionId: ctx.sessionId,
        sessionKey: ctx.sessionKey,
        agentId: ctx.agentId,
        toolName: ctx.toolName,
        payload: sanitizePayload(event)
      });
    },

    handleBeforeMessageWrite(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("before_message_write", event, ctx);
    },

    handleSessionStart(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("session_start", event, ctx);
    },

    handleSessionEnd(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("session_end", event, ctx);
    },

    handleSubagentSpawning(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("subagent_spawning", event, ctx);
    },

    handleSubagentDeliveryTarget(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("subagent_delivery_target", event, ctx);
    },

    handleSubagentSpawned(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("subagent_spawned", event, ctx);
    },

    handleSubagentEnded(event: unknown, ctx: AgentHookContext): void {
      recordAgentEvent("subagent_ended", event, ctx);
    },

    handleGatewayStart(event: unknown, ctx: GatewayHookContext): void {
      recordGatewayEvent("gateway_start", event, ctx);
    },

    handleGatewayStop(event: unknown, ctx: GatewayHookContext): void {
      recordGatewayEvent("gateway_stop", event, ctx);
    },

    handleBeforeToolCall(
      event: PluginHookBeforeToolCallEvent,
      ctx: ToolHookContext
    ): PluginHookBeforeToolCallResult | void {
      const evaluated = evaluateAuditPolicy({
        config,
        toolName: event.toolName,
        rawParams: event.params
      });
      const correlationId = buildCorrelationId({
        runId: ctx.runId,
        toolCallId: ctx.toolCallId,
        toolName: event.toolName
      });
      const record: AuditEventRow = {
        eventType: "before_tool_call",
        occurredAt: new Date().toISOString(),
        runId: ctx.runId,
        toolCallId: ctx.toolCallId,
        sessionId: ctx.sessionId,
        sessionKey: ctx.sessionKey,
        agentId: ctx.agentId,
        toolName: event.toolName,
        decision: evaluated.decision,
        severity: evaluated.severity ?? undefined,
        outcome: evaluated.decision === "block" ? "blocked" : "pending",
        payload: evaluated.sanitizedParams,
        matchedRuleIds: evaluated.matchedRules.map((rule) => rule.ruleId),
        evidencePaths: [...new Set(evaluated.matchedRules.flatMap((rule) => rule.evidencePaths))]
      };
      writeEvent("before_tool_call", record);
      maybeEmitSystemEvent(record);
      maybeLogDecision(record);

      pendingByCorrelationId.set(correlationId, {
        decision: evaluated.decision,
        severity: evaluated.severity ?? undefined,
        matchedRuleIds: record.matchedRuleIds ?? [],
        evidencePaths: record.evidencePaths,
        sanitizedParams: evaluated.sanitizedParams
      });
      if (pendingByCorrelationId.size > MAX_PENDING_RECORDS) {
        const oldest = pendingByCorrelationId.keys().next().value;
        if (oldest) {
          pendingByCorrelationId.delete(oldest);
        }
      }

      if (evaluated.decision === "block") {
        return {
          block: true,
          blockReason: buildBlockReason(record)
        };
      }
    },

    handleAfterToolCall(event: PluginHookAfterToolCallEvent, ctx: ToolHookContext): void {
      const correlationId = buildCorrelationId({
        runId: ctx.runId,
        toolCallId: ctx.toolCallId,
        toolName: event.toolName
      });
      const pending = pendingByCorrelationId.get(correlationId);
      pendingByCorrelationId.delete(correlationId);
      const evaluated = evaluateAuditPolicy({
        config,
        toolName: event.toolName,
        rawParams: event.params
      });

      writeEvent("after_tool_call", {
        runId: ctx.runId,
        toolCallId: ctx.toolCallId,
        sessionId: ctx.sessionId,
        sessionKey: ctx.sessionKey,
        agentId: ctx.agentId,
        toolName: event.toolName,
        decision: pending?.decision ?? evaluated.decision,
        severity: pending?.severity ?? evaluated.severity ?? undefined,
        outcome: event.error ? "failed" : "executed",
        durationMs: event.durationMs,
        payload: pending?.sanitizedParams ?? evaluated.sanitizedParams,
        resultSummary: summarizeValue(event.result),
        errorSummary: event.error ? summarizeValue(event.error) : undefined,
        matchedRuleIds: pending?.matchedRuleIds ?? evaluated.matchedRules.map((rule) => rule.ruleId),
        evidencePaths:
          pending?.evidencePaths ?? [...new Set(evaluated.matchedRules.flatMap((rule) => rule.evidencePaths))]
      });
    }
  };
}
