import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { auditOpsPluginConfigSchema } from "./src/config.js";
import { createAuditOpsManager } from "./src/service.js";

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
    api.on("before_tool_call", (event, ctx) => manager.handleBeforeToolCall(event, ctx));
    api.on("after_tool_call", (event, ctx) => manager.handleAfterToolCall(event, ctx));
  },
};

export default plugin;
