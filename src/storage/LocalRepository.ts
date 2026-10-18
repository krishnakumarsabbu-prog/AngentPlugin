import * as vscode from "vscode";
import { Skill, SkillStatus, PlatformCompatibility } from "../domain/skills/types";
import { Agent } from "../domain/agents/types";
import { Workflow } from "../domain/workflows/types";
import { ExecutionRecord } from "../domain/executions/types";
import { AppSettings, DashboardData, ActivityEntry, ISkillsStore, SkillSummary } from "../services/interfaces";
import { sampleSkills, sampleAgents, sampleWorkflows, sampleExecutions, sampleIntegrations } from "./sampleData";
import { DEFAULT_SETTINGS } from "./settingsDefaults";
import { migrateToCurrent, PersistedStateV2, CURRENT_SCHEMA_VERSION, freshState } from "./migrations";
import { safeStorage, serializeJson } from "./safeStorage";
import { HistoryStore, createHistoryStore, appendChangelog } from "../skills/SkillHistory";

export interface PersistedState {
  schemaVersion: number;
  settings: AppSettings;
  skills: Skill[];
  agents: Agent[];
  workflows: Workflow[];
  executions: ExecutionRecord[];
  history: PersistedStateV2["history"];
}

const STORAGE_KEY = "agentforge.state";

export class LocalRepository implements ISkillsStore {
  private state: PersistedState;
  private history: HistoryStore;

  constructor(private context: vscode.ExtensionContext) {
    this.state = this.load();
    this.history = createHistoryStore();
    for (const h of this.state.history) {
      for (const entry of h.entries) {
        this.history.record(entry.snapshot, entry.summary);
      }
    }
  }

  private load(): PersistedState {
    const raw = this.context.globalState.get<unknown>(STORAGE_KEY);
    const migrated = migrateToCurrent(raw);
    if (raw && (raw as { schemaVersion?: number }).schemaVersion === CURRENT_SCHEMA_VERSION) {
      return { ...migrated };
    }
    const seeded: PersistedState = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: { ...DEFAULT_SETTINGS },
      skills: [...sampleSkills],
      agents: [...sampleAgents],
      workflows: [...sampleWorkflows],
      executions: [...sampleExecutions],
      history: migrated.history,
    };
    this.context.globalState.update(STORAGE_KEY, seeded);
    return seeded;
  }

  private persist(): void {
    const snapshot: PersistedState = {
      ...this.state,
      history: this.history.list().map((h) => ({
        id: h.id,
        currentVersion: h.currentVersion,
        entries: h.entries.map((e) => ({ ...e, snapshot: e.snapshot })),
      })),
    };
    this.state = snapshot;
    this.context.globalState.update(STORAGE_KEY, snapshot);
  }

  async writeBackupFile(filePath: string): Promise<void> {
    const payload = serializeJson({
      schemaVersion: this.state.schemaVersion,
      exportedAt: new Date().toISOString(),
      skills: this.state.skills,
      history: this.history.list(),
    });
    await safeStorage.writeAtomic(filePath, payload);
  }

  async list(): Promise<Skill[]> {
    return [...this.state.skills];
  }

  async summaries(): Promise<SkillSummary[]> {
    return this.state.skills.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      version: s.version,
      updatedAt: s.updatedAt,
    }));
  }

  async listSkills(): Promise<Skill[]> {
    return this.list();
  }

  async get(id: string): Promise<Skill | undefined> {
    return this.getSkill(id);
  }

  async getSkill(id: string): Promise<Skill | undefined> {
    return this.state.skills.find((s) => s.id === id);
  }

  async createSkill(input: Partial<Skill>): Promise<Skill> {
    const now = new Date().toISOString();
    const requestedId = typeof input.id === "string" && input.id.trim() ? input.id.trim() : undefined;
    const id = requestedId ?? this.uniqueSkillId(input.name ?? "skill");
    if (this.state.skills.some((s) => s.id === id)) {
      throw new Error(`A skill with id "${id}" already exists.`);
    }
    const skill: Skill = {
      id,
      name: input.name?.trim() || "Untitled Skill",
      description: input.description ?? "",
      version: input.version ?? "0.1.0",
      author: input.author ?? "",
      category: input.category ?? "General",
      tags: input.tags ?? [],
      instructions: input.instructions ?? "",
      frontmatter: input.frontmatter ?? "",
      resources: input.resources ?? [],
      compatibility: this.sanitizeCompatibility(input.compatibility),
      otherTargets: input.otherTargets ?? [],
      requiredTools: input.requiredTools ?? [],
      permissions: input.permissions ?? [],
      changelog: input.changelog ?? appendChangelog("", input.version ?? "0.1.0", "Initial version"),
      requirements: input.requirements ?? "",
      status: this.sanitizeStatus(input.status),
      installationState: "not-installed",
      createdAt: now,
      updatedAt: now,
    };
    this.state.skills = [skill, ...this.state.skills];
    this.history.record(skill, `Created ${skill.version}`);
    this.persist();
    return skill;
  }

  async updateSkill(id: string, patch: Partial<Skill>): Promise<Skill> {
    const existing = await this.getSkill(id);
    if (!existing) {
      throw new Error(`Skill not found: ${id}`);
    }
    const newVersion = patch.version ?? existing.version;
    const versionChanged = newVersion !== existing.version;
    const updated: Skill = {
      ...existing,
      ...patch,
      id: existing.id,
      author: patch.author ?? existing.author,
      frontmatter: patch.frontmatter ?? existing.frontmatter,
      otherTargets: patch.otherTargets ?? existing.otherTargets,
      requiredTools: patch.requiredTools ?? existing.requiredTools,
      permissions: patch.permissions ?? existing.permissions,
      changelog: patch.changelog ?? existing.changelog,
      requirements: patch.requirements ?? existing.requirements,
      compatibility: this.sanitizeCompatibility(patch.compatibility ?? existing.compatibility),
      status: this.sanitizeStatus(patch.status ?? existing.status),
      installationState: existing.installationState,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    if (versionChanged) {
      updated.changelog = appendChangelog(updated.changelog, newVersion, `Updated ${new Date().toISOString().slice(0, 10)}`);
    }
    this.state.skills = this.state.skills.map((s) => (s.id === id ? updated : s));
    this.history.record(updated, versionChanged ? `Version ${newVersion}` : `Saved edit`);
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
      frontmatter: "",
      changelog: appendChangelog(existing.changelog, existing.version, "Duplicated from original skill"),
      createdAt: now,
      updatedAt: now,
    };
    this.state.skills = [copy, ...this.state.skills];
    this.history.record(copy, `Duplicated from ${existing.id}`);
    this.persist();
    return copy;
  }

  async deleteSkill(id: string): Promise<void> {
    const before = this.state.skills.length;
    this.state.skills = this.state.skills.filter((s) => s.id !== id);
    if (this.state.skills.length === before) {
      throw new Error(`Skill not found: ${id}`);
    }
    this.history.remove(id);
    this.persist();
  }

  getHistory(id: string) {
    return this.history.get(id);
  }

  listHistory() {
    return this.history.list();
  }

  getHistoryStore(): HistoryStore {
    return this.history;
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
    this.state.settings = { ...this.state.settings, ...patch, schemaVersion: CURRENT_SCHEMA_VERSION };
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
    const fresh = freshState();
    this.state = {
      ...fresh,
      settings: { ...DEFAULT_SETTINGS },
      skills: [...sampleSkills],
      agents: [...sampleAgents],
      workflows: [...sampleWorkflows],
      executions: [...sampleExecutions],
    };
    this.history = createHistoryStore();
    this.persist();
  }

  getSettingsSync(): AppSettings {
    return { ...this.state.settings };
  }
}
