import * as vscode from "vscode";
import { Skill, SkillStatus, PlatformCompatibility } from "../domain/skills/types";
import { Agent } from "../domain/agents/types";
import { Workflow } from "../domain/workflows/types";
import { ExecutionRecord } from "../domain/executions/types";
import { AppSettings, DashboardData, ActivityEntry } from "../services/interfaces";
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

  async getSkill(id: string): Promise<Skill | undefined> {
    return this.state.skills.find((s) => s.id === id);
  }

  async createSkill(input: Partial<Skill>): Promise<Skill> {
    const now = new Date().toISOString();
    const skill: Skill = {
      id: this.uniqueSkillId(input.name ?? "skill"),
      name: input.name?.trim() || "Untitled Skill",
      description: input.description ?? "",
      version: input.version ?? "0.1.0",
      category: input.category ?? "General",
      tags: input.tags ?? [],
      instructions: input.instructions ?? "",
      resources: input.resources ?? [],
      compatibility: this.sanitizeCompatibility(input.compatibility),
      status: this.sanitizeStatus(input.status),
      installationState: "not-installed",
      createdAt: now,
      updatedAt: now,
    };
    this.state.skills = [skill, ...this.state.skills];
    this.persist();
    return skill;
  }

  async updateSkill(id: string, patch: Partial<Skill>): Promise<Skill> {
    const existing = await this.getSkill(id);
    if (!existing) {
      throw new Error(`Skill not found: ${id}`);
    }
    const updated: Skill = {
      ...existing,
      ...patch,
      id: existing.id,
      compatibility: this.sanitizeCompatibility(patch.compatibility ?? existing.compatibility),
      status: this.sanitizeStatus(patch.status ?? existing.status),
      installationState: existing.installationState,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.state.skills = this.state.skills.map((s) => (s.id === id ? updated : s));
    this.persist();
    return updated;
  }

  async duplicateSkill(id: string): Promise<Skill> {
    const existing = await this.getSkill(id);
    if (!existing) {
      throw new Error(`Skill not found: ${id}`);
    }
    const now = new Date().toISOString();
    const copy: Skill = {
      ...existing,
      id: this.uniqueSkillId(existing.name),
      name: `${existing.name} (Copy)`,
      status: "Draft",
      installationState: "not-installed",
      resources: existing.resources.map((r, i) => ({ ...r, id: `${r.id}-copy-${i + 1}` })),
      createdAt: now,
      updatedAt: now,
    };
    this.state.skills = [copy, ...this.state.skills];
    this.persist();
    return copy;
  }

  async deleteSkill(id: string): Promise<void> {
    const before = this.state.skills.length;
    this.state.skills = this.state.skills.filter((s) => s.id !== id);
    if (this.state.skills.length === before) {
      throw new Error(`Skill not found: ${id}`);
    }
    this.persist();
  }

  private sanitizeStatus(value: unknown): SkillStatus {
    return value === "Ready" || value === "Deprecated" ? value : "Draft";
  }

  private sanitizeCompatibility(value: unknown): PlatformCompatibility[] {
    if (!Array.isArray(value)) return [];
    const allowed: PlatformCompatibility[] = ["copilot", "claude", "openai", "neutral"];
    return value.filter((v): v is PlatformCompatibility =>
      typeof v === "string" && (allowed as string[]).includes(v),
    );
  }

  private uniqueSkillId(name: string): string {
    const base = `skill-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled"}`;
    let candidate = base;
    let n = 2;
    while (this.state.skills.some((s) => s.id === candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
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
