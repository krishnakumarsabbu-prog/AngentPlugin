import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Skill, SkillStatus, PlatformCompatibility } from "../domain/skills/types";
import { Agent } from "../domain/agents/types";
import { Workflow } from "../domain/workflows/types";
import { ExecutionRecord } from "../domain/executions/types";
import { AppSettings, DashboardData, ActivityEntry, ISkillsStore, SkillSummary, IntegrationStatus } from "../services/interfaces";
import {
  sampleSkills,
  sampleAgents,
  sampleWorkflows,
  sampleExecutions,
  sampleIntegrations,
  enterpriseSecurityAuditSkill,
  enterpriseSecurityAuditorAgent,
  anvilSkill,
  anvilAgent,
  talonSkill,
  talonAgent,
  sentryCodeReviewSkill,
  sentryCodeReviewAgent,
  agenticSecurityScannerSkill,
  agenticSecurityScannerAgent,
  sentinelSkill,
  sentinelAgent,
  bastionSkill,
  bastionAgent,
} from "./sampleData";
import { DEFAULT_SETTINGS } from "./settingsDefaults";
import { migrateToCurrent, PersistedStateV2, CURRENT_SCHEMA_VERSION, freshState } from "./migrations";
import { safeStorage, serializeJson } from "./safeStorage";
import { HistoryStore, createHistoryStore, appendChangelog } from "../skills/SkillHistory";
import { AgentRepository } from "./AgentRepository";
import { WorkflowRepository } from "./WorkflowRepository";

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
  private agentRepo: AgentRepository;
  private workflowRepo: WorkflowRepository;
  private workspaceRoot?: string;

  constructor(private context: vscode.ExtensionContext, workspaceRoot?: string) {
    if (workspaceRoot) {
      this.workspaceRoot = workspaceRoot;
    } else {
      const folders = vscode.workspace?.workspaceFolders;
      if (folders && folders.length > 0) {
        this.workspaceRoot = folders[0].uri.fsPath;
      }
    }
    this.state = this.load();
    this.history = createHistoryStore();
    for (const h of this.state.history) {
      for (const entry of h.entries) {
        this.history.record(entry.snapshot, entry.summary);
      }
    }
    this.agentRepo = new AgentRepository({
      loadAgents: () => this.state.agents,
      saveAgents: (agents) => {
        this.state.agents = agents;
        this.persist();
      },
    });
    this.workflowRepo = new WorkflowRepository(
      {
        loadWorkflows: () => this.state.workflows,
        saveWorkflows: (workflows) => {
          this.state.workflows = workflows;
          this.persist();
        },
      },
      () => ({
        knownAgentIds: new Set(this.state.agents.map((a) => a.id)),
        knownSkillIds: new Set(this.state.skills.map((s) => s.id)),
      })
    );
  }

  public getWorkspaceRoot(): string | undefined {
    return this.workspaceRoot;
  }

  private load(): PersistedState {
    let raw = this.context.globalState.get<unknown>(STORAGE_KEY);
    if (this.workspaceRoot) {
      const workspaceFile = path.join(this.workspaceRoot, ".agentforge", "state.json");
      if (fs.existsSync(workspaceFile)) {
        try {
          const content = fs.readFileSync(workspaceFile, "utf8");
          raw = JSON.parse(content);
        } catch {
          // ignore error
        }
      }
      const workflowsDir = path.join(this.workspaceRoot, ".agentforge", "workflows");
      if (fs.existsSync(workflowsDir)) {
        try {
          const files = fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".json"));
          const diskWfs: Workflow[] = [];
          for (const f of files) {
            try {
              const wfJson = JSON.parse(fs.readFileSync(path.join(workflowsDir, f), "utf8"));
              if (wfJson && typeof wfJson.id === "string") {
                diskWfs.push(wfJson);
              }
            } catch {
              // ignore invalid file
            }
          }
          if (diskWfs.length > 0 && raw && typeof raw === "object") {
            (raw as { workflows?: Workflow[] }).workflows = diskWfs;
          }
        } catch {
          // ignore
        }
      }
      const executionsDir = path.join(this.workspaceRoot, ".agentforge", "executions");
      if (fs.existsSync(executionsDir)) {
        try {
          const files = fs.readdirSync(executionsDir).filter((f) => f.endsWith(".json"));
          const diskExecs: ExecutionRecord[] = [];
          for (const f of files) {
            try {
              const execJson = JSON.parse(fs.readFileSync(path.join(executionsDir, f), "utf8"));
              if (execJson && typeof execJson.id === "string") {
                diskExecs.push(execJson);
              }
            } catch {
              // ignore invalid file
            }
          }
          if (diskExecs.length > 0 && raw && typeof raw === "object") {
            (raw as { executions?: ExecutionRecord[] }).executions = diskExecs;
          }
        } catch {
          // ignore
        }
      }
    }
    const migrated = migrateToCurrent(raw);
    const sampleSkillIds = new Set([
      "skill-security-audit",
      "skill-code-review",
      "skill-token-efficiency",
      "skill-test-generation",
      "skill-architecture-analysis",
    ]);
    const sampleAgentIds = new Set([
      "agent-architecture",
      "agent-planning",
      "agent-implementation",
      "agent-static-review",
      "agent-test-validation",
      "agent-documentation",
    ]);
    const sampleWorkflowIds = new Set([
      "wf-feature-delivery",
      "wf-security-review",
      "wf-release-readiness",
    ]);
    const sampleExecutionIds = new Set([
      "exec-1001",
      "exec-1002",
      "exec-1003",
      "exec-1004",
      "exec-1005",
    ]);

    migrated.skills = (migrated.skills || []).filter((s) => !sampleSkillIds.has(s.id));
    migrated.agents = (migrated.agents || []).filter((a) => !sampleAgentIds.has(a.id));
    migrated.workflows = (migrated.workflows || []).filter((w) => !sampleWorkflowIds.has(w.id));
    migrated.executions = (migrated.executions || []).filter((e) => !sampleExecutionIds.has(e.id));

    // Always refresh enterprise-security-audit, anvil, and talon skill and agent in plugin memory with the latest definition
    const existingSkillIdx = (migrated.skills || []).findIndex((s) => s.id === enterpriseSecurityAuditSkill.id);
    if (existingSkillIdx >= 0) {
      migrated.skills[existingSkillIdx] = { ...enterpriseSecurityAuditSkill };
    } else {
      migrated.skills.push({ ...enterpriseSecurityAuditSkill });
    }
    const existingAgentIdx = (migrated.agents || []).findIndex((a) => a.id === enterpriseSecurityAuditorAgent.id);
    if (existingAgentIdx >= 0) {
      migrated.agents[existingAgentIdx] = { ...enterpriseSecurityAuditorAgent };
    } else {
      migrated.agents.push({ ...enterpriseSecurityAuditorAgent });
    }

    const existingAnvilSkillIdx = (migrated.skills || []).findIndex((s) => s.id === anvilSkill.id);
    if (existingAnvilSkillIdx >= 0) {
      migrated.skills[existingAnvilSkillIdx] = { ...anvilSkill };
    } else {
      migrated.skills.push({ ...anvilSkill });
    }
    const existingAnvilAgentIdx = (migrated.agents || []).findIndex((a) => a.id === anvilAgent.id);
    if (existingAnvilAgentIdx >= 0) {
      migrated.agents[existingAnvilAgentIdx] = { ...anvilAgent };
    } else {
      migrated.agents.push({ ...anvilAgent });
    }

    const existingTalonSkillIdx = (migrated.skills || []).findIndex((s) => s.id === talonSkill.id);
    if (existingTalonSkillIdx >= 0) {
      migrated.skills[existingTalonSkillIdx] = { ...talonSkill };
    } else {
      migrated.skills.push({ ...talonSkill });
    }
    const existingTalonAgentIdx = (migrated.agents || []).findIndex((a) => a.id === talonAgent.id);
    if (existingTalonAgentIdx >= 0) {
      migrated.agents[existingTalonAgentIdx] = { ...talonAgent };
    } else {
      migrated.agents.push({ ...talonAgent });
    }

    const existingSentrySkillIdx = (migrated.skills || []).findIndex((s) => s.id === sentryCodeReviewSkill.id);
    if (existingSentrySkillIdx >= 0) {
      migrated.skills[existingSentrySkillIdx] = { ...sentryCodeReviewSkill };
    } else {
      migrated.skills.push({ ...sentryCodeReviewSkill });
    }
    const existingSentryAgentIdx = (migrated.agents || []).findIndex((a) => a.id === sentryCodeReviewAgent.id);
    if (existingSentryAgentIdx >= 0) {
      migrated.agents[existingSentryAgentIdx] = { ...sentryCodeReviewAgent };
    } else {
      migrated.agents.push({ ...sentryCodeReviewAgent });
    }

    const existingScannerSkillIdx = (migrated.skills || []).findIndex((s) => s.id === agenticSecurityScannerSkill.id);
    if (existingScannerSkillIdx >= 0) {
      migrated.skills[existingScannerSkillIdx] = { ...agenticSecurityScannerSkill };
    } else {
      migrated.skills.push({ ...agenticSecurityScannerSkill });
    }
    const existingScannerAgentIdx = (migrated.agents || []).findIndex((a) => a.id === agenticSecurityScannerAgent.id);
    if (existingScannerAgentIdx >= 0) {
      migrated.agents[existingScannerAgentIdx] = { ...agenticSecurityScannerAgent };
    } else {
      migrated.agents.push({ ...agenticSecurityScannerAgent });
    }

    const existingSentinelSkillIdx = (migrated.skills || []).findIndex((s) => s.id === sentinelSkill.id);
    if (existingSentinelSkillIdx >= 0) {
      migrated.skills[existingSentinelSkillIdx] = { ...sentinelSkill };
    } else {
      migrated.skills.push({ ...sentinelSkill });
    }
    const existingSentinelAgentIdx = (migrated.agents || []).findIndex((a) => a.id === sentinelAgent.id);
    if (existingSentinelAgentIdx >= 0) {
      migrated.agents[existingSentinelAgentIdx] = { ...sentinelAgent };
    } else {
      migrated.agents.push({ ...sentinelAgent });
    }

    const existingBastionSkillIdx = (migrated.skills || []).findIndex((s) => s.id === bastionSkill.id);
    if (existingBastionSkillIdx >= 0) {
      migrated.skills[existingBastionSkillIdx] = { ...bastionSkill };
    } else {
      migrated.skills.push({ ...bastionSkill });
    }
    const existingBastionAgentIdx = (migrated.agents || []).findIndex((a) => a.id === bastionAgent.id);
    if (existingBastionAgentIdx >= 0) {
      migrated.agents[existingBastionAgentIdx] = { ...bastionAgent };
    } else {
      migrated.agents.push({ ...bastionAgent });
    }

    if (raw && (raw as { schemaVersion?: number }).schemaVersion === CURRENT_SCHEMA_VERSION) {
      this.context.globalState.update(STORAGE_KEY, migrated);
      return { ...migrated };
    }
    const seeded: PersistedState = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: { ...DEFAULT_SETTINGS },
      skills: [{ ...enterpriseSecurityAuditSkill }, { ...anvilSkill }, { ...talonSkill }, { ...sentryCodeReviewSkill }, { ...agenticSecurityScannerSkill }, { ...sentinelSkill }, { ...bastionSkill }],
      agents: [{ ...enterpriseSecurityAuditorAgent }, { ...anvilAgent }, { ...talonAgent }, { ...sentryCodeReviewAgent }, { ...agenticSecurityScannerAgent }, { ...sentinelAgent }, { ...bastionAgent }],
      workflows: [],
      executions: [],
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

    if (this.workspaceRoot) {
      try {
        const workspaceDir = path.join(this.workspaceRoot, ".agentforge");
        const skillsDir = path.join(workspaceDir, "skills");
        const agentsDir = path.join(workspaceDir, "agents");
        const workflowsDir = path.join(workspaceDir, "workflows");
        const executionsDir = path.join(workspaceDir, "executions");
        fs.mkdirSync(skillsDir, { recursive: true });
        fs.mkdirSync(agentsDir, { recursive: true });
        fs.mkdirSync(workflowsDir, { recursive: true });
        fs.mkdirSync(executionsDir, { recursive: true });

        // Keep this skill in the plugin memory only (do not write to .agentforge disk)
        const diskSnapshot = {
          ...snapshot,
          skills: snapshot.skills.filter(
            (s) =>
              s.id !== enterpriseSecurityAuditSkill.id &&
              s.id !== anvilSkill.id &&
              s.id !== talonSkill.id &&
              s.id !== sentryCodeReviewSkill.id &&
              s.id !== agenticSecurityScannerSkill.id &&
              s.id !== sentinelSkill.id &&
              s.id !== bastionSkill.id,
          ),
          agents: snapshot.agents.filter(
            (a) =>
              a.id !== enterpriseSecurityAuditorAgent.id &&
              a.id !== anvilAgent.id &&
              a.id !== talonAgent.id &&
              a.id !== sentryCodeReviewAgent.id &&
              a.id !== agenticSecurityScannerAgent.id &&
              a.id !== sentinelAgent.id &&
              a.id !== bastionAgent.id,
          ),
        };
        const workspaceFile = path.join(workspaceDir, "state.json");
        fs.writeFileSync(workspaceFile, serializeJson(diskSnapshot), "utf8");

        for (const s of snapshot.skills) {
          if (
            s.id === enterpriseSecurityAuditSkill.id ||
            s.id === anvilSkill.id ||
            s.id === talonSkill.id ||
            s.id === sentryCodeReviewSkill.id ||
            s.id === agenticSecurityScannerSkill.id ||
            s.id === sentinelSkill.id ||
            s.id === bastionSkill.id
          )
            continue;
          fs.writeFileSync(path.join(skillsDir, `${s.id}.json`), serializeJson(s), "utf8");
        }
        for (const a of snapshot.agents) {
          if (
            a.id === enterpriseSecurityAuditorAgent.id ||
            a.id === anvilAgent.id ||
            a.id === talonAgent.id ||
            a.id === sentryCodeReviewAgent.id ||
            a.id === agenticSecurityScannerAgent.id ||
            a.id === sentinelAgent.id ||
            a.id === bastionAgent.id
          )
            continue;
          fs.writeFileSync(path.join(agentsDir, `${a.id}.json`), serializeJson(a), "utf8");
        }
        for (const w of snapshot.workflows) {
          fs.writeFileSync(path.join(workflowsDir, `${w.id}.json`), serializeJson(w), "utf8");
        }
        for (const e of snapshot.executions) {
          fs.writeFileSync(path.join(executionsDir, `${e.id}.json`), serializeJson(e), "utf8");
        }
      } catch {
        // ignore workspace write errors
      }
    }
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
    return this.state.skills.map((s) =>
      s.id === enterpriseSecurityAuditSkill.id
        ? { ...enterpriseSecurityAuditSkill }
        : s.id === anvilSkill.id
        ? { ...anvilSkill }
        : s.id === talonSkill.id
        ? { ...talonSkill }
        : s.id === sentryCodeReviewSkill.id
        ? { ...sentryCodeReviewSkill }
        : s.id === agenticSecurityScannerSkill.id
        ? { ...agenticSecurityScannerSkill }
        : s.id === sentinelSkill.id
        ? { ...sentinelSkill }
        : s.id === bastionSkill.id
        ? { ...bastionSkill }
        : s,
    );
  }

  async summaries(): Promise<SkillSummary[]> {
    return (await this.list()).map((s) => ({
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
    if (id === enterpriseSecurityAuditSkill.id) {
      return { ...enterpriseSecurityAuditSkill };
    }
    if (id === anvilSkill.id) {
      return { ...anvilSkill };
    }
    if (id === talonSkill.id) {
      return { ...talonSkill };
    }
    if (id === sentryCodeReviewSkill.id) {
      return { ...sentryCodeReviewSkill };
    }
    if (id === agenticSecurityScannerSkill.id) {
      return { ...agenticSecurityScannerSkill };
    }
    if (id === sentinelSkill.id) {
      return { ...sentinelSkill };
    }
    if (id === bastionSkill.id) {
      return { ...bastionSkill };
    }
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
    if (this.workspaceRoot) {
      const file = path.join(this.workspaceRoot, ".agentforge", "skills", `${id}.json`);
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch {
        // ignore
      }
    }
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

  getAgentRepository(): AgentRepository {
    return this.agentRepo;
  }

  async listAgents(): Promise<Agent[]> {
    const list = await this.agentRepo.list();
    return list.map((a) =>
      a.id === enterpriseSecurityAuditorAgent.id
        ? { ...enterpriseSecurityAuditorAgent }
        : a.id === anvilAgent.id
        ? { ...anvilAgent }
        : a.id === talonAgent.id
        ? { ...talonAgent }
        : a.id === sentryCodeReviewAgent.id
        ? { ...sentryCodeReviewAgent }
        : a.id === agenticSecurityScannerAgent.id
        ? { ...agenticSecurityScannerAgent }
        : a.id === sentinelAgent.id
        ? { ...sentinelAgent }
        : a.id === bastionAgent.id
        ? { ...bastionAgent }
        : a,
    );
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    if (id === enterpriseSecurityAuditorAgent.id) {
      return { ...enterpriseSecurityAuditorAgent };
    }
    if (id === anvilAgent.id) {
      return { ...anvilAgent };
    }
    if (id === talonAgent.id) {
      return { ...talonAgent };
    }
    if (id === sentryCodeReviewAgent.id) {
      return { ...sentryCodeReviewAgent };
    }
    if (id === agenticSecurityScannerAgent.id) {
      return { ...agenticSecurityScannerAgent };
    }
    if (id === sentinelAgent.id) {
      return { ...sentinelAgent };
    }
    if (id === bastionAgent.id) {
      return { ...bastionAgent };
    }
    return this.agentRepo.get(id);
  }

  async createAgent(input: Partial<Agent>): Promise<Agent> {
    return this.agentRepo.create(input);
  }

  async updateAgent(id: string, patch: Partial<Agent>): Promise<Agent> {
    return this.agentRepo.update(id, patch);
  }

  async duplicateAgent(id: string): Promise<Agent> {
    return this.agentRepo.duplicate(id);
  }

  async deleteAgent(id: string): Promise<void> {
    if (this.workspaceRoot) {
      const file = path.join(this.workspaceRoot, ".agentforge", "agents", `${id}.json`);
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch {
        // ignore
      }
    }
    return this.agentRepo.delete(id);
  }

  getWorkflowRepository(): WorkflowRepository {
    return this.workflowRepo;
  }

  async listWorkflows(): Promise<Workflow[]> {
    return this.workflowRepo.list();
  }

  async getWorkflow(id: string): Promise<Workflow | undefined> {
    return this.workflowRepo.get(id);
  }

  async createWorkflow(input: Partial<Workflow>): Promise<Workflow> {
    return this.workflowRepo.create(input);
  }

  async updateWorkflow(id: string, patch: Partial<Workflow>): Promise<Workflow> {
    return this.workflowRepo.update(id, patch);
  }

  async duplicateWorkflow(id: string): Promise<Workflow> {
    return this.workflowRepo.duplicate(id);
  }

  async deleteWorkflow(id: string): Promise<void> {
    if (this.workspaceRoot) {
      const file = path.join(this.workspaceRoot, ".agentforge", "workflows", `${id}.json`);
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch {
        // ignore
      }
    }
    return this.workflowRepo.delete(id);
  }

  async listExecutions(): Promise<ExecutionRecord[]> {
    return [...this.state.executions];
  }

  async getExecution(id: string): Promise<ExecutionRecord | undefined> {
    return this.state.executions.find((e) => e.id === id);
  }

  async saveExecution(execution: ExecutionRecord): Promise<ExecutionRecord> {
    const idx = this.state.executions.findIndex((e) => e.id === execution.id);
    if (idx >= 0) {
      this.state.executions[idx] = { ...execution };
    } else {
      this.state.executions = [execution, ...this.state.executions];
    }
    this.persist();
    return execution;
  }

  async updateExecution(id: string, patch: Partial<ExecutionRecord>): Promise<ExecutionRecord> {
    const idx = this.state.executions.findIndex((e) => e.id === id);
    if (idx === -1) {
      throw new Error(`Execution record not found: ${id}`);
    }
    const updated: ExecutionRecord = {
      ...this.state.executions[idx],
      ...patch,
      id,
    };
    this.state.executions[idx] = updated;
    this.persist();
    return updated;
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
    const skills = await this.list();
    const agents = await this.listAgents();
    const workflows = this.state.workflows;
    const executions = this.state.executions;
    const integrations: IntegrationStatus[] = [
      { id: "int-copilot", name: "GitHub Copilot", kind: "copilot", status: "Not Connected", description: "Export skills and prompts as Copilot instructions." },
      { id: "int-claude", name: "Claude Code", kind: "claude", status: "Not Connected", description: "Export agents as Claude Code subagents and skill manifests." },
      { id: "int-openai", name: "OpenAI API", kind: "openai", status: "Not Connected", description: "Adapter scaffold for OpenAI-compatible APIs. No live calls are made." },
    ];

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
    return this.state.skills.length > 0
      ? new Set(this.state.skills.map((s) => s.category)).size + this.state.workflows.length
      : 0;
  }

  async resetDemoData(): Promise<void> {
    const fresh = freshState();
    this.state = {
      ...fresh,
      settings: { ...DEFAULT_SETTINGS },
      skills: [],
      agents: [],
      workflows: [],
      executions: [],
    };
    this.history = createHistoryStore();
    this.persist();
  }

  getSettingsSync(): AppSettings {
    return { ...this.state.settings };
  }
}
