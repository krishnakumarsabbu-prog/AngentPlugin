import { BaseMessage, isBaseMessage, MessageType, NavigatePayload, SettingsUpdatePayload, IdPayload, SkillWritePayload, SkillValidatePayload, SkillDiffPayload } from "./messages";

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
    case "agents.list":
    case "workflows.list":
    case "executions.list":
    case "settings.get":
    case "app.resetDemoData":
      return null;
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
