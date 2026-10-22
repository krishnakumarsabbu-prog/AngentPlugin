import { BaseMessage, isBaseMessage, MessageType, NavigatePayload, SettingsUpdatePayload, IdPayload, SkillWritePayload, SkillValidatePayload, SkillDiffPayload, SkillExportPayload, SkillImportPreviewPayload, SkillImportSavePayload, SkillInstallTargetsPayload, SkillInstallPlanPayload, SkillUninstallPayload } from "./messages";

export type ValidationResult =
  | { ok: true; message: BaseMessage }
  | { ok: false; error: string };

const ROUTE_PATTERN = /^[a-zA-Z0-9_.-]+$/;

export function validateIncomingMessage(raw: unknown): ValidationResult {
  if (!isBaseMessage(raw)) {
    return { ok: false, error: "Invalid message envelope" };
  }
  const msg = raw as BaseMessage;
  if (!msg.id || msg.id.length > 128) {
    return { ok: false, error: "Invalid request id" };
  }
  const payloadError = validatePayload(msg.type, msg.payload);
  if (payloadError) {
    return { ok: false, error: payloadError };
  }
  return { ok: true, message: msg };
}

export function validatePayload(type: MessageType, payload: unknown): string | null {
  switch (type) {
    case "app.ready":
    case "app.getState":
    case "app.getDashboardData":
    case "skills.list":
      return null;
    case "skills.get":
    case "skills.duplicate":
    case "skills.delete":
    case "skills.history": {
      const p = payload as IdPayload | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid skill id";
      }
      return null;
    }
    case "skills.create":
    case "skills.update": {
      const p = payload as SkillWritePayload | undefined;
      if (!p || typeof p.skill !== "object" || p.skill === null) {
        return "Invalid skill payload";
      }
      if (type === "skills.update") {
        const rec = p.skill as Record<string, unknown>;
        if (typeof rec.id !== "string" || rec.id.length === 0 || rec.id.length > 128) {
          return "Invalid skill id";
        }
      }
      return null;
    }
    case "skills.validate": {
      const p = payload as SkillValidatePayload | undefined;
      if (!p || typeof p.skill !== "object" || p.skill === null) {
        return "Invalid skill payload";
      }
      if (p.id !== undefined && (typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128)) {
        return "Invalid skill id";
      }
      return null;
    }
    case "skills.diff": {
      const p = payload as SkillDiffPayload | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid skill id";
      }
      if (!p || typeof p.skill !== "object" || p.skill === null) {
        return "Invalid skill payload";
      }
      return null;
    }
    case "skills.export": {
      const p = payload as SkillExportPayload | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid skill id";
      }
      if (p.format !== "skill-md" && p.format !== "package") {
        return "Invalid export format";
      }
      return null;
    }
    case "skills.importPreview": {
      const p = payload as SkillImportPreviewPayload | undefined;
      if (!p || typeof p.content !== "string" || p.content.length === 0) {
        return "Invalid import content";
      }
      if (p.content.length > 1024 * 1024) {
        return "Import content is too large (max 1 MB)";
      }
      return null;
    }
    case "skills.importSave": {
      const p = payload as SkillImportSavePayload | undefined;
      if (!p || typeof p.preview !== "object" || p.preview === null) {
        return "Invalid import preview";
      }
      return null;
    }
    case "skills.installTargets": {
      const p = payload as SkillInstallTargetsPayload | undefined;
      if (!p || typeof p.platform !== "string" || p.platform.length === 0) {
        return "Invalid platform";
      }
      return null;
    }
    case "skills.installPlan":
    case "skills.install": {
      const p = payload as SkillInstallPlanPayload | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid skill id";
      }
      if (!p || typeof p.platform !== "string" || p.platform.length === 0) {
        return "Invalid platform";
      }
      if (!p || (p.scope !== "user" && p.scope !== "workspace")) {
        return "Invalid install scope";
      }
      return null;
    }
    case "skills.batchInstall": {
      const p = payload as { ids?: unknown; platform?: unknown } | undefined;
      if (!p || !Array.isArray(p.ids) || p.ids.length === 0) {
        return "Must provide at least one skill id to install";
      }
      if (typeof p.platform !== "string" || !p.platform.trim()) {
        return "Invalid platform";
      }
      return null;
    }
    case "skills.installations": {
      const p = payload as IdPayload | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid skill id";
      }
      return null;
    }
    case "skills.uninstall": {
      const p = payload as SkillUninstallPayload | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid skill id";
      }
      if (!p || typeof p.platform !== "string" || p.platform.length === 0) {
        return "Invalid platform";
      }
      if (!p || (p.scope !== "user" && p.scope !== "workspace")) {
        return "Invalid install scope";
      }
      return null;
    }
    case "skills.getResourceContent": {
      const p = payload as { skillId?: unknown; resourceName?: unknown } | undefined;
      if (!p || typeof p.skillId !== "string" || !p.skillId.trim()) {
        return "Invalid skill id";
      }
      if (!p || typeof p.resourceName !== "string" || !p.resourceName.trim()) {
        return "Invalid resource name";
      }
      return null;
    }
    case "skills.saveResourceContent": {
      const p = payload as { skillId?: unknown; resourceName?: unknown; content?: unknown } | undefined;
      if (!p || typeof p.skillId !== "string" || !p.skillId.trim()) {
        return "Invalid skill id";
      }
      if (!p || typeof p.resourceName !== "string" || !p.resourceName.trim()) {
        return "Invalid resource name";
      }
      if (!p || typeof p.content !== "string") {
        return "Invalid resource content";
      }
      return null;
    }
    case "agents.list":
    case "workflows.list":
    case "executions.list":
    case "settings.get":
    case "app.resetDemoData":
    case "app.clientError":
      return null;
    case "agents.get":
    case "agents.duplicate":
    case "agents.delete": {
      const p = payload as IdPayload | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid agent id";
      }
      return null;
    }
    case "workflows.get":
    case "workflows.duplicate":
    case "workflows.delete": {
      const p = payload as IdPayload | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid workflow id";
      }
      return null;
    }
    case "executions.get":
    case "executions.recover":
    case "executions.cancel": {
      const p = payload as IdPayload | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid execution id";
      }
      return null;
    }
    case "executions.start": {
      const p = payload as { workflow?: Record<string, unknown>; id?: string } | undefined;
      if (!p || (!p.id && (!p.workflow || typeof p.workflow !== "object"))) {
        return "Execution requires either a workflow id or a workflow configuration";
      }
      return null;
    }
    case "executions.resume": {
      const p = payload as { id?: string; decision?: { action?: string } } | undefined;
      if (!p || typeof p.id !== "string" || !p.decision || typeof p.decision.action !== "string") {
        return "Invalid resume execution payload";
      }
      return null;
    }
    case "workflows.exportPackage": {
      const p = payload as { id?: string; workflow?: Record<string, unknown> } | undefined;
      if (!p || (!p.id && (!p.workflow || typeof p.workflow !== "object"))) {
        return "Workflow export requires either a workflow id or workflow configuration";
      }
      return null;
    }
    case "workflows.importPackage": {
      const p = payload as { content?: unknown } | undefined;
      if (!p || !p.content) {
        return "Invalid import package payload";
      }
      return null;
    }
    case "workflows.install": {
      const p = payload as { id?: string; workflow?: Record<string, unknown> } | undefined;
      if (!p || (!p.id && (!p.workflow || typeof p.workflow !== "object"))) {
        return "Workflow installation requires either a workflow id or workflow configuration";
      }
      return null;
    }
    case "agents.create":
    case "agents.update": {
      const p = payload as { agent?: Record<string, unknown> } | undefined;
      if (!p || typeof p.agent !== "object" || p.agent === null) {
        return "Invalid agent payload";
      }
      if (type === "agents.update") {
        const rec = p.agent as Record<string, unknown>;
        if (typeof rec.id !== "string" || rec.id.length === 0 || rec.id.length > 128) {
          return "Invalid agent id";
        }
      }
      return null;
    }
    case "workflows.create":
    case "workflows.update": {
      const p = payload as { workflow?: Record<string, unknown> } | undefined;
      if (!p || typeof p.workflow !== "object" || p.workflow === null) {
        return "Invalid workflow payload";
      }
      if (type === "workflows.update") {
        const rec = p.workflow as Record<string, unknown>;
        if (typeof rec.id !== "string" || rec.id.length === 0 || rec.id.length > 128) {
          return "Invalid workflow id";
        }
      }
      return null;
    }
    case "workflows.validate": {
      const p = payload as { workflow?: Record<string, unknown>; id?: string } | undefined;
      if (!p || typeof p.workflow !== "object" || p.workflow === null) {
        return "Invalid workflow payload";
      }
      if (p.id !== undefined && (typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128)) {
        return "Invalid workflow id";
      }
      return null;
    }
    case "agents.validate": {
      const p = payload as { agent?: Record<string, unknown>; id?: string } | undefined;
      if (!p || typeof p.agent !== "object" || p.agent === null) {
        return "Invalid agent payload";
      }
      if (p.id !== undefined && (typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128)) {
        return "Invalid agent id";
      }
      return null;
    }
    case "agents.export": {
      const p = payload as { format?: string; id?: string; agent?: Record<string, unknown> } | undefined;
      if (!p) return "Invalid export payload";
      const allowed = ["agent-spec", "copilot-instructions", "claude-subagent", "openai-assistant"];
      if (!p.format || !allowed.includes(p.format)) {
        return "Invalid export format";
      }
      if (!p.id && (!p.agent || typeof p.agent !== "object")) {
        return "Export requires either an agent id or an agent configuration";
      }
      return null;
    }
    case "agents.compatibility": {
      const p = payload as { id?: string; agent?: Record<string, unknown> } | undefined;
      if (!p || (!p.id && (!p.agent || typeof p.agent !== "object"))) {
        return "Compatibility check requires either an agent id or an agent configuration";
      }
      return null;
    }
    case "agents.exportPlatform": {
      const p = payload as { platform?: string; id?: string; agent?: Record<string, unknown> } | undefined;
      if (!p) return "Invalid platform export payload";
      const allowed = ["copilot", "claude", "openai", "neutral"];
      if (!p.platform || !allowed.includes(p.platform)) {
        return "Invalid platform id";
      }
      if (!p.id && (!p.agent || typeof p.agent !== "object")) {
        return "Platform export requires either an agent id or an agent configuration";
      }
      return null;
    }
    case "agents.installTargets": {
      const p = payload as { platform?: string } | undefined;
      if (!p || typeof p.platform !== "string" || p.platform.length === 0) {
        return "Invalid platform";
      }
      return null;
    }
    case "agents.installPlan":
    case "agents.install": {
      const p = payload as { id?: string; platform?: string; scope?: string } | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid agent id";
      }
      if (!p || typeof p.platform !== "string" || p.platform.length === 0) {
        return "Invalid platform";
      }
      if (!p || (p.scope !== "user" && p.scope !== "workspace")) {
        return "Invalid install scope";
      }
      return null;
    }
    case "agents.batchInstall": {
      const p = payload as { ids?: unknown; platform?: unknown } | undefined;
      if (!p || !Array.isArray(p.ids) || p.ids.length === 0) {
        return "Must provide at least one agent id to install";
      }
      if (typeof p.platform !== "string" || !p.platform.trim()) {
        return "Invalid platform";
      }
      return null;
    }
    case "agents.installations": {
      const p = payload as IdPayload | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid agent id";
      }
      return null;
    }
    case "agents.uninstall": {
      const p = payload as { id?: string; platform?: string; scope?: string } | undefined;
      if (!p || typeof p.id !== "string" || p.id.length === 0 || p.id.length > 128) {
        return "Invalid agent id";
      }
      if (!p || typeof p.platform !== "string" || p.platform.length === 0) {
        return "Invalid platform";
      }
      if (!p || (p.scope !== "user" && p.scope !== "workspace")) {
        return "Invalid install scope";
      }
      return null;
    }
    case "app.navigate": {
      const p = payload as NavigatePayload | undefined;
      if (!p || typeof p.route !== "string" || !ROUTE_PATTERN.test(p.route)) {
        return "Invalid route";
      }
      return null;
    }
    case "settings.update": {
      const p = payload as SettingsUpdatePayload | undefined;
      if (!p || typeof p.settings !== "object" || p.settings === null) {
        return "Invalid settings payload";
      }
      return null;
    }
    case "persona.list":
    case "persona.cancelCrawl":
    case "persona.listWorkspaces":
    case "persona.listVersions":
      return null;
    case "persona.crawl":
    case "persona.reCrawl":
    case "persona.compile":
    case "persona.evaluate":
    case "persona.save":
    case "persona.rollbackVersion": {
      if (payload !== undefined && (typeof payload !== "object" || payload === null)) {
        return "Invalid payload object for persona operation";
      }
      return null;
    }
    default:
      return `Unsupported message type: ${type}`;
  }
}

export function makeResponse(requestId: string, ok: boolean, data?: unknown, error?: string) {
  return {
    type: "response",
    requestId,
    ok,
    data,
    error,
  };
}

export function unsupportedResponse(requestId: string, feature: string) {
  return makeResponse(requestId, false, undefined, `${feature} is not yet implemented`);
}
