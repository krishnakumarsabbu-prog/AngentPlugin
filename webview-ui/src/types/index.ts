export type SkillStatus = "Draft" | "Ready" | "Deprecated";
export type AgentStatus = "Draft" | "Ready" | "Experimental";
export type WorkflowStatus = "Draft" | "Ready" | "Active";
export type ExecutionStatus = "Running" | "Succeeded" | "Failed" | "Cancelled" | "Pending";
export type IntegrationState = "Not Connected" | "Mock" | "Connected";

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  instructions: string;
  compatibility: string[];
  status: SkillStatus;
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
