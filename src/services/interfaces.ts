import { Skill, SkillSummary } from "../domain/skills/types";
export type { SkillSummary } from "../domain/skills/types";
import { Agent, AgentSummary } from "../domain/agents/types";
import { Workflow, WorkflowSummary } from "../domain/workflows/types";
import { ExecutionRecord } from "../domain/executions/types";

export interface AppSettings {
  schemaVersion: number;
  theme: "light";
  defaultPlatform: "copilot" | "claude" | "openai" | "neutral";
  telemetry: boolean;
  autoSave: boolean;
  recentRoute: string;
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

export interface ActivityEntry {
  id: string;
  kind: "skill" | "agent" | "workflow" | "execution" | "system";
  label: string;
  timestamp: string;
  status?: string;
}

export interface IntegrationStatus {
  id: string;
  name: string;
  kind: "copilot" | "claude" | "openai";
  status: "Not Connected" | "Mock" | "Connected";
  description: string;
}

export interface AppState {
  version: string;
  settings: AppSettings;
}

export interface IRepository<TSummary, TEntity> {
  list(): Promise<TEntity[]>;
  get(id: string): Promise<TEntity | undefined>;
  summaries(): Promise<TSummary[]>;
}

export interface ISkillsStore extends IRepository<SkillSummary, Skill> {
  createSkill(input: Partial<Skill>): Promise<Skill>;
  updateSkill(id: string, patch: Partial<Skill>): Promise<Skill>;
  duplicateSkill(id: string): Promise<Skill>;
  deleteSkill(id: string): Promise<void>;
  getSkill(id: string): Promise<Skill | undefined>;
}

export type SkillsRepository = ISkillsStore;
export type AgentsRepository = IRepository<AgentSummary, Agent>;
export type WorkflowsRepository = IRepository<WorkflowSummary, Workflow>;

export interface IExecutionsRepository {
  list(): Promise<ExecutionRecord[]>;
  listByWorkflow(workflowId: string): Promise<ExecutionRecord[]>;
}

export interface ISettingsStore {
  get(): Promise<AppSettings>;
  update(patch: Partial<AppSettings>): Promise<AppSettings>;
}

export interface IDashboardService {
  getDashboardData(): Promise<DashboardData>;
}

export interface IPackageService {
  installedCount(): Promise<number>;
}
