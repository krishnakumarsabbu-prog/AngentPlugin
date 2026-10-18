export type SkillStatus = "Draft" | "Ready" | "Deprecated";
export type PlatformCompatibility = "copilot" | "claude" | "openai" | "neutral";
export type InstallationState = "not-installed" | "installed" | "outdated";
export type AgentStatus = "Draft" | "Ready" | "Experimental";
export type WorkflowStatus = "Draft" | "Ready" | "Active";
export type ExecutionStatus = "Running" | "Succeeded" | "Failed" | "Cancelled" | "Pending";
export type IntegrationState = "Not Connected" | "Mock" | "Connected";

export interface SkillResource {
  id: string;
  name: string;
  kind: "file" | "script" | "template" | "reference" | "example" | "test";
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  instructions: string;
  frontmatter: string;
  resources: SkillResource[];
  compatibility: PlatformCompatibility[];
  otherTargets: string[];
  requiredTools: string[];
  permissions: string[];
  changelog: string;
  requirements: string;
  status: SkillStatus;
  installationState: InstallationState;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  role: string;
  objective: string;
  instructions: string;
  assignedSkillIds: string[];
  version: string;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowVersion: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  finalSummary?: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  kind: "copilot" | "claude" | "openai";
  status: IntegrationState;
  description: string;
}

export interface ActivityEntry {
  id: string;
  kind: "skill" | "agent" | "workflow" | "execution" | "system";
  label: string;
  timestamp: string;
  status?: string;
}

export interface DashboardData {
  metrics: {
    totalSkills: number;
    totalAgents: number;
    totalPipelines: number;
    pipelineRuns: number;
    successfulRuns: number;
    failedRuns: number;
    installedPackages: number;
  };
  recentActivity: ActivityEntry[];
  recentSkills: Skill[];
  recentAgents: Agent[];
  recentExecutions: ExecutionRecord[];
  integrations: IntegrationStatus[];
}

export interface AppSettings {
  schemaVersion: number;
  theme: "light";
  defaultPlatform: "copilot" | "claude" | "openai" | "neutral";
  telemetry: boolean;
  autoSave: boolean;
  recentRoute: string;
}

export interface AppState {
  version: string;
  settings: AppSettings;
}

export type InstallScope = "user" | "workspace";

export interface InstallTarget {
  platform: PlatformCompatibility;
  scope: InstallScope;
  root: string;
  displayPath: string;
}

export interface InstalledArtifact {
  platform: PlatformCompatibility;
  scope: InstallScope;
  root: string;
  files: string[];
  installedAt: string;
  simulated: boolean;
}

export interface InstallPlanSummary {
  target: InstallTarget;
  existing: string[];
  supported: boolean;
  simulated: boolean;
  files: string[];
}

export interface UninstallSummary {
  recordRemoved: boolean;
  diskRemoved: boolean;
  simulated: boolean;
  message: string;
}

export interface PackageFile {
  path: string;
  content: string;
}

export interface PackageManifest {
  kind: "agentforge-skill";
  skillId: string;
  skillName: string;
  version: string;
  exportedAt: string;
  files: string[];
}

export interface ExportResult {
  format: "skill-md" | "package";
  skillId: string;
  skillName: string;
  version: string;
  fileName: string;
  primaryContent: string;
  files: PackageFile[];
  manifest?: PackageManifest;
  validation: { valid: boolean; errors: unknown[]; warnings: unknown[]; suggestions: unknown[] };
}

export type DuplicateKind = "none" | "same-version" | "older-existing" | "newer-existing";

export interface ImportPreview {
  valid: boolean;
  skill: Partial<Skill>;
  files: PackageFile[];
  duplicate: { kind: DuplicateKind; existingId?: string; existingVersion?: string };
  validation: { valid: boolean; errors: unknown[]; warnings: unknown[]; suggestions: unknown[] };
  warnings: string[];
  errors: string[];
}

export interface ImportSaveResult {
  skill: Skill;
  updated: boolean;
  files: PackageFile[];
}

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

export interface RequestMessage {
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
