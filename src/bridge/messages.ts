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
  | "skills.batchInstall"
  | "skills.installations"
  | "skills.uninstall"
  | "skills.getResourceContent"
  | "skills.saveResourceContent"
  | "agents.list"
  | "agents.get"
  | "agents.create"
  | "agents.update"
  | "agents.duplicate"
  | "agents.delete"
  | "agents.validate"
  | "agents.export"
  | "agents.compatibility"
  | "agents.exportPlatform"
  | "agents.installTargets"
  | "agents.installPlan"
  | "agents.install"
  | "agents.batchInstall"
  | "agents.installations"
  | "agents.uninstall"
  | "workflows.list"
  | "workflows.get"
  | "workflows.create"
  | "workflows.update"
  | "workflows.duplicate"
  | "workflows.delete"
  | "workflows.validate"
  | "workflows.exportPackage"
  | "workflows.importPackage"
  | "workflows.install"
  | "executions.list"
  | "executions.get"
  | "executions.start"
  | "executions.resume"
  | "executions.recover"
  | "executions.cancel"
  | "settings.get"
  | "settings.update"
  | "app.resetDemoData"
  | "app.navigate"
  | "app.clientError"
  | "audit.list"
  | "audit.record"
  | "audit.clear"
  | "packages.list"
  | "packages.validate"
  | "packages.install"
  | "packages.uninstall"
  | "packages.export"
  | "packages.backups"
  | "packages.restoreBackup"
  | "integrations.list"
  | "integrations.configure"
  | "integrations.validate"
  | "integrations.disconnect"
  | "settings.exportAll"
  | "settings.importAll"
  | "persona.list"
  | "persona.crawl"
  | "persona.cancelCrawl"
  | "persona.compile"
  | "persona.evaluate"
  | "persona.reCrawl"
  | "persona.save"
  | "persona.listWorkspaces"
  | "persona.listVersions"
  | "persona.rollbackVersion";


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

export interface AgentWritePayload {
  agent: Record<string, unknown>;
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

export interface SkillResourceContentPayload {
  skillId: string;
  resourceName: string;
}

export interface SkillSaveResourcePayload {
  skillId: string;
  resourceName: string;
  content: string;
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

export interface AgentValidatePayload {
  agent: Record<string, unknown>;
  id?: string;
}

export interface AgentExportPayload {
  id?: string;
  agent?: Record<string, unknown>;
  format: "agent-spec" | "copilot-instructions" | "claude-subagent" | "openai-assistant";
}

export interface AgentCompatibilityPayload {
  id?: string;
  agent?: Record<string, unknown>;
}

export interface AgentPlatformExportPayload {
  id?: string;
  agent?: Record<string, unknown>;
  platform: "copilot" | "claude" | "openai" | "neutral";
}

export interface AgentInstallTargetsPayload {
  platform: string;
}

export interface AgentInstallPlanPayload {
  id: string;
  platform: string;
  scope: "user" | "workspace";
}

export interface AgentInstallPayload {
  id: string;
  platform: string;
  scope: "user" | "workspace";
  installRelatedSkills?: boolean;
}

export interface SkillBatchInstallPayload {
  ids: string[];
  platform: string;
  scope?: "user" | "workspace";
}

export interface AgentBatchInstallPayload {
  ids: string[];
  platform: string;
  scope?: "user" | "workspace";
  installRelatedSkills?: boolean;
}

export interface AgentUninstallPayload {
  id: string;
  platform: string;
  scope: "user" | "workspace";
  removeFromDisk?: boolean;
}

export interface WorkflowWritePayload {
  workflow: Record<string, unknown>;
}

export interface WorkflowValidatePayload {
  workflow: Record<string, unknown>;
  id?: string;
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
  "skills.batchInstall",
  "skills.installations",
  "skills.uninstall",
  "skills.getResourceContent",
  "skills.saveResourceContent",
  "agents.list",
  "agents.get",
  "agents.create",
  "agents.update",
  "agents.duplicate",
  "agents.delete",
  "agents.validate",
  "agents.export",
  "agents.compatibility",
  "agents.exportPlatform",
  "agents.installTargets",
  "agents.installPlan",
  "agents.install",
  "agents.batchInstall",
  "agents.installations",
  "agents.uninstall",
  "workflows.list",
  "workflows.get",
  "workflows.create",
  "workflows.update",
  "workflows.duplicate",
  "workflows.delete",
  "workflows.validate",
  "workflows.exportPackage",
  "workflows.importPackage",
  "workflows.install",
  "executions.list",
  "executions.get",
  "executions.start",
  "executions.resume",
  "executions.recover",
  "executions.cancel",
  "settings.get",
  "settings.update",
  "app.resetDemoData",
  "app.navigate",
  "app.clientError",
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
