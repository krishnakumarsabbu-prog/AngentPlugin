import * as vscode from "vscode";
import { Skill } from "../domain/skills/types";
import { Agent } from "../domain/agents/types";
import { Workflow } from "../domain/workflows/types";
import { ExecutionRecord } from "../domain/executions/types";
import { AppSettings, DashboardData, ActivityEntry, IntegrationStatus } from "../services/interfaces";
import { sampleSkills, sampleAgents, sampleWorkflows, sampleExecutions, sampleIntegrations } from "./sampleData";

import { DEFAULT_SETTINGS, STORAGE_SCHEMA_VERSION } from "./settingsDefaults";

export interface PersistedState {
  schemaVersion: number;
  settings: AppSettings;
  skills: Skill[];
  agents: Agent[];
  workflows: Workflow[];
  executions: ExecutionRecord[];
}

export class LocalRepository {
  private state: PersistedState;

  constructor(private context: vscode.ExtensionContext) {
    this.state = this.load();
  }

  private load(): PersistedState {
    const raw = this.context.globalState.get<PersistedState>("agentforge.state");
    if (raw && raw.schemaVersion === STORAGE_SCHEMA_VERSION && raw.settings) {
      return raw;
    }
    const fresh: PersistedState = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      settings: { ...DEFAULT_SETTINGS },
      skills: [...sampleSkills],
      agents: [...sampleAgents],
      workflows: [...sampleWorkflows],
      executions: [...sampleExecutions],
    };
    this.context.globalState.update("agentforge.state", fresh);
    return fresh;
  }

  private persist(): void {
    this.context.globalState.update("agentforge.state", this.state);
  }

  async listSkills(): Promise<Skill[]> {
    return [...this.state.skills];
  }

  async listAgents(): Promise<Agent[]> {
    return [...this.state.agents];
  }

  async listWorkflows(): Promise<Workflow[]> {
    return [...this.state.workflows];
  }

  async listExecutions(): Promise<ExecutionRecord[]> {
    return [...this.state.executions];
  }

  async getSettings(): Promise<AppSettings> {
    return { ...this.state.settings };
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    this.state.settings = { ...this.state.settings, ...patch, schemaVersion: STORAGE_SCHEMA_VERSION };
    this.persist();
    return { ...this.state.settings };
  }

  async getDashboardData(): Promise<DashboardData> {
    const skills = this.state.skills;
    const agents = this.state.agents;
    const workflows = this.state.workflows;
    const executions = this.state.executions;
    const integrations = sampleIntegrations;

    const pipelineRuns = executions.length;
    const successfulRuns = executions.filter((e) => e.status === "Succeeded").length;
    const failedRuns = executions.filter((e) => e.status === "Failed").length;
    const installedPackages = this.countInstalledPackages();

    const recentActivity: ActivityEntry[] = [
      ...skills.map((s) => ({
        id: `skill-${s.id}`,
        kind: "skill" as const,
        label: `Skill "${s.name}" updated`,
        timestamp: s.updatedAt,
        status: s.status,
      })),
      ...agents.map((a) => ({
        id: `agent-${a.id}`,
        kind: "agent" as const,
        label: `Agent "${a.name}" updated`,
        timestamp: a.updatedAt,
        status: a.status,
      })),
      ...executions.map((e) => ({
        id: `exec-${e.id}`,
        kind: "execution" as const,
        label: `Pipeline run ${e.id}`,
        timestamp: e.startedAt,
        status: e.status,
      })),
    ]
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
      .slice(0, 8);

    const recentSkills = [...skills]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 5);
    const recentAgents = [...agents]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 5);
    const recentExecutions = [...executions]
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
      .slice(0, 6);

    return {
      metrics: {
        totalSkills: skills.length,
        totalAgents: agents.length,
        totalPipelines: workflows.length,
        pipelineRuns,
        successfulRuns,
        failedRuns,
        installedPackages,
      },
      recentActivity,
      recentSkills,
      recentAgents,
      recentExecutions,
      integrations,
    };
  }

  private countInstalledPackages(): number {
    return new Set(this.state.skills.map((s) => s.category)).size + this.state.workflows.length;
  }

  async resetDemoData(): Promise<void> {
    this.state = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      settings: { ...DEFAULT_SETTINGS },
      skills: [...sampleSkills],
      agents: [...sampleAgents],
      workflows: [...sampleWorkflows],
      executions: [...sampleExecutions],
    };
    this.persist();
  }

  getSettingsSync(): AppSettings {
    return { ...this.state.settings };
  }
}
