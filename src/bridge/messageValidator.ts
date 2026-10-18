import { BaseMessage, isBaseMessage, MessageType, NavigatePayload, SettingsUpdatePayload } from "./messages";

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
