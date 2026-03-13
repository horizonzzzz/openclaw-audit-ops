import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { auditOpsPluginConfigSchema } from "./src/runtime/config.js";
import { createAuditOpsManager } from "./src/runtime/service.js";

const plugin = {
  id: "audit-ops",
  name: "Audit Ops",
  description: "Observe or block sensitive tool operations and emit audit events.",
  configSchema: auditOpsPluginConfigSchema,
  register(api: OpenClawPluginApi) {
    const manager = createAuditOpsManager({
      config: api.pluginConfig,
      logger: api.logger,
      enqueueSystemEvent: api.runtime.system.enqueueSystemEvent,
    });

    api.registerService(manager.createService());
    api.on("before_model_resolve", (event, ctx) => manager.handleBeforeModelResolve(event, ctx));
    api.on("before_prompt_build", (event, ctx) => manager.handleBeforePromptBuild(event, ctx));
    api.on("before_agent_start", (event, ctx) => manager.handleBeforeAgentStart(event, ctx));
    api.on("llm_input", (event, ctx) => manager.handleLlmInput(event, ctx));
    api.on("llm_output", (event, ctx) => manager.handleLlmOutput(event, ctx));
    api.on("agent_end", (event, ctx) => manager.handleAgentEnd(event, ctx));
    api.on("before_compaction", (event, ctx) => manager.handleBeforeCompaction(event, ctx));
    api.on("after_compaction", (event, ctx) => manager.handleAfterCompaction(event, ctx));
    api.on("before_reset", (event, ctx) => manager.handleBeforeReset(event, ctx));
    api.on("message_received", (event, ctx) => manager.handleMessageReceived(event, ctx));
    api.on("message_sending", (event, ctx) => manager.handleMessageSending(event, ctx));
    api.on("message_sent", (event, ctx) => manager.handleMessageSent(event, ctx));
    api.on("before_tool_call", (event, ctx) => manager.handleBeforeToolCall(event, ctx));
    api.on("after_tool_call", (event, ctx) => manager.handleAfterToolCall(event, ctx));
    api.on("tool_result_persist", (event, ctx) => manager.handleToolResultPersist(event, ctx));
    api.on("before_message_write", (event, ctx) => manager.handleBeforeMessageWrite(event, ctx));
    api.on("session_start", (event, ctx) => manager.handleSessionStart(event, ctx));
    api.on("session_end", (event, ctx) => manager.handleSessionEnd(event, ctx));
    api.on("subagent_spawning", (event, ctx) => manager.handleSubagentSpawning(event, ctx));
    api.on("subagent_delivery_target", (event, ctx) => manager.handleSubagentDeliveryTarget(event, ctx));
    api.on("subagent_spawned", (event, ctx) => manager.handleSubagentSpawned(event, ctx));
    api.on("subagent_ended", (event, ctx) => manager.handleSubagentEnded(event, ctx));
    api.on("gateway_start", (event, ctx) => manager.handleGatewayStart(event, ctx));
    api.on("gateway_stop", (event, ctx) => manager.handleGatewayStop(event, ctx));
  },
};

export default plugin;
