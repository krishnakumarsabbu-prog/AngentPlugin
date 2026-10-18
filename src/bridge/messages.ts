export type MessageType =
  | "app.ready"
  | "app.getState"
  | "app.getDashboardData"
  | "skills.list"
  | "agents.list"
  | "workflows.list"
  | "executions.list"
  | "settings.get"
  | "settings.update"
  | "app.resetDemoData"
  | "app.navigate";

export interface BaseMessage {
  type: MessageType;
  id: string;
  payload?: unknown;
}

export interface ResponseMessage {
  type: string;
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface ReadyPayload {
  version: string;
}

export interface NavigatePayload {
  route: string;
}

export interface SettingsUpdatePayload {
  settings: Record<string, unknown>;
}

export const REQUEST_TYPES: ReadonlyArray<MessageType> = [
  "app.ready",
  "app.getState",
  "app.getDashboardData",
  "skills.list",
  "agents.list",
  "workflows.list",
  "executions.list",
  "settings.get",
  "settings.update",
  "app.resetDemoData",
  "app.navigate",
];

export function isMessageType(value: unknown): value is MessageType {
  return typeof value === "string" && (REQUEST_TYPES as readonly string[]).includes(value);
}

export function isBaseMessage(value: unknown): value is BaseMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.id === "string" &&
    isMessageType(candidate.type)
  );
}
