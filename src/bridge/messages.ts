export type MessageType =
  | "app.ready"
  | "app.getState"
  | "app.getDashboardData"
  | "skills.list"
  | "skills.get"
  | "skills.create"
  | "skills.update"
  | "skills.duplicate"
  | "skills.delete"
  | "skills.validate"
  | "skills.history"
  | "skills.diff"
  | "skills.export"
  | "skills.importPreview"
  | "skills.importSave"
  | "skills.installTargets"
  | "skills.installPlan"
  | "skills.install"
  | "skills.installations"
  | "skills.uninstall"
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

export interface IdPayload {
  id: string;
}

export interface SkillWritePayload {
  skill: Record<string, unknown>;
}

export interface SkillValidatePayload {
  skill: Record<string, unknown>;
  id?: string;
}

export interface SkillDiffPayload {
  id: string;
  skill: Record<string, unknown>;
}

export interface SkillExportPayload {
  id: string;
  format: "skill-md" | "package";
}

export interface SkillImportPreviewPayload {
  /** Raw SKILL.md text, or a package manifest JSON string. */
  content: string;
  /** Optional file map for package imports (path → content). */
  files?: Record<string, string>;
  /** Optional explicit SKILL.md content when importing a package. */
  skillMd?: string;
}

export interface SkillImportSavePayload {
  preview: unknown;
}

export interface SkillInstallTargetsPayload {
  platform: string;
}

export interface SkillInstallPlanPayload {
  id: string;
  platform: string;
  scope: "user" | "workspace";
}

export interface SkillInstallPayload {
  id: string;
  platform: string;
  scope: "user" | "workspace";
}

export interface SkillUninstallPayload {
  id: string;
  platform: string;
  scope: "user" | "workspace";
  /** When true, also uninstall artifacts on disk; when false, remove only the AgentForge record. */
  removeFromDisk?: boolean;
}

export const REQUEST_TYPES: ReadonlyArray<MessageType> = [
  "app.ready",
  "app.getState",
  "app.getDashboardData",
  "skills.list",
  "skills.get",
  "skills.create",
  "skills.update",
  "skills.duplicate",
  "skills.delete",
  "skills.validate",
  "skills.history",
  "skills.diff",
  "skills.export",
  "skills.importPreview",
  "skills.importSave",
  "skills.installTargets",
  "skills.installPlan",
  "skills.install",
  "skills.installations",
  "skills.uninstall",
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
