import { Agent, AgentStatus, AgentSummary, PermissionPolicy, ToolDefinition, JsonSchema } from "../domain/agents/types";
import { PlatformCompatibility } from "../domain/skills/types";

export interface AgentPersistence {
  loadAgents(): Agent[];
  saveAgents(agents: Agent[]): void;
}

export class AgentRepository {
  constructor(private persistence: AgentPersistence) {}

  async list(): Promise<Agent[]> {
    return [...this.persistence.loadAgents()];
  }

  async summaries(): Promise<AgentSummary[]> {
    const agents = await this.list();
    return agents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
      version: a.version,
      updatedAt: a.updatedAt,
    }));
  }

  async get(id: string): Promise<Agent | undefined> {
    const agents = await this.list();
    return agents.find((a) => a.id === id);
  }

  async create(input: Partial<Agent>): Promise<Agent> {
    const name = (input.name ?? "").trim();
    if (!name) {
      throw new Error("Agent name is required");
    }

    const agents = await this.list();
    const id = input.id && input.id.trim() ? input.id.trim() : this.uniqueId(name, agents);
    if (agents.some((a) => a.id === id)) {
      throw new Error(`Agent id already exists: ${id}`);
    }

    const now = new Date().toISOString();
    const defaultPermissions: PermissionPolicy = {
      network: false,
      fileSystem: "read",
      shell: false,
      maxTokens: 8000,
      readOnly: true,
      workspaceAccess: true,
      writeOperations: false,
      restrictedPaths: [".git", ".env", "*.pem", "*.key"],
      humanApprovalRequired: true,
    };

    const agent: Agent = {
      id,
      name,
      description: (input.description ?? "").trim(),
      category: input.category ? input.category.trim() : "Custom",
      role: (input.role ?? "General Worker").trim(),
      objective: (input.objective ?? "").trim(),
      instructions: input.instructions ?? "",
      scope: input.scope ? input.scope.trim() : undefined,
      outOfScope: input.outOfScope ? input.outOfScope.trim() : undefined,
      operatingPrinciples: Array.isArray(input.operatingPrinciples) ? [...input.operatingPrinciples] : [],
      assignedSkillIds: Array.isArray(input.assignedSkillIds) ? [...input.assignedSkillIds] : [],
      toolDefinitions: Array.isArray(input.toolDefinitions) ? [...input.toolDefinitions] : [],
      permissionPolicy: input.permissionPolicy ? { ...defaultPermissions, ...input.permissionPolicy } : defaultPermissions,
      inputSchema: input.inputSchema ?? { type: "object", properties: {}, required: [] },
      outputSchema: input.outputSchema ?? { type: "object", properties: {}, required: [] },
      exampleInput: input.exampleInput,
      exampleOutput: input.exampleOutput,
      compatibility: this.sanitizeCompatibility(input.compatibility),
      exportFormat: input.exportFormat ?? "agent-spec",
      testScenarios: Array.isArray(input.testScenarios) ? [...input.testScenarios] : [],
      version: (input.version ?? "1.0.0").trim(),
      status: this.sanitizeStatus(input.status),
      changelog: input.changelog ?? `1.0.0 — Initial configuration`,
      createdAt: now,
      updatedAt: now,
    };

    this.persistence.saveAgents([agent, ...agents]);
    return agent;
  }

  async update(id: string, patch: Partial<Agent>): Promise<Agent> {
    const agents = await this.list();
    const idx = agents.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error(`Agent not found: ${id}`);
    }

    const existing = agents[idx];
    const name = patch.name !== undefined ? patch.name.trim() : existing.name;
    if (!name) {
      throw new Error("Agent name cannot be empty");
    }

    const now = new Date().toISOString();
    const updated: Agent = {
      ...existing,
      ...patch,
      id, // keep immutable id
      name,
      description: patch.description !== undefined ? patch.description.trim() : existing.description,
      category: patch.category !== undefined ? patch.category.trim() : existing.category,
      role: patch.role !== undefined ? patch.role.trim() : existing.role,
      objective: patch.objective !== undefined ? patch.objective.trim() : existing.objective,
      instructions: patch.instructions !== undefined ? patch.instructions : existing.instructions,
      scope: patch.scope !== undefined ? patch.scope.trim() : existing.scope,
      outOfScope: patch.outOfScope !== undefined ? patch.outOfScope.trim() : existing.outOfScope,
      operatingPrinciples: patch.operatingPrinciples ? [...patch.operatingPrinciples] : existing.operatingPrinciples,
      assignedSkillIds: patch.assignedSkillIds ? [...patch.assignedSkillIds] : existing.assignedSkillIds,
      toolDefinitions: patch.toolDefinitions ? [...patch.toolDefinitions] : existing.toolDefinitions,
      permissionPolicy: patch.permissionPolicy ? { ...existing.permissionPolicy, ...patch.permissionPolicy } : existing.permissionPolicy,
      inputSchema: patch.inputSchema ?? existing.inputSchema,
      outputSchema: patch.outputSchema ?? existing.outputSchema,
      exampleInput: patch.exampleInput !== undefined ? patch.exampleInput : existing.exampleInput,
      exampleOutput: patch.exampleOutput !== undefined ? patch.exampleOutput : existing.exampleOutput,
      compatibility: patch.compatibility ? this.sanitizeCompatibility(patch.compatibility) : existing.compatibility,
      exportFormat: patch.exportFormat ?? existing.exportFormat,
      testScenarios: patch.testScenarios ? [...patch.testScenarios] : existing.testScenarios,
      version: patch.version !== undefined ? patch.version.trim() : existing.version,
      status: patch.status ? this.sanitizeStatus(patch.status) : existing.status,
      changelog: patch.changelog !== undefined ? patch.changelog : existing.changelog,
      updatedAt: now,
    };

    const next = [...agents];
    next[idx] = updated;
    this.persistence.saveAgents(next);
    return updated;
  }

  async duplicate(id: string): Promise<Agent> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Agent not found: ${id}`);
    }

    const agents = await this.list();
    const newName = `${existing.name} (Copy)`;
    const newId = this.uniqueId(newName, agents);
    const now = new Date().toISOString();

    const copy: Agent = {
      ...existing,
      id: newId,
      name: newName,
      status: "Draft",
      changelog: `${existing.version} — Duplicated from ${existing.name}\n${existing.changelog ?? ""}`.trim(),
      createdAt: now,
      updatedAt: now,
    };

    this.persistence.saveAgents([copy, ...agents]);
    return copy;
  }

  async delete(id: string): Promise<void> {
    const agents = await this.list();
    const filtered = agents.filter((a) => a.id !== id);
    if (filtered.length === agents.length) {
      throw new Error(`Agent not found: ${id}`);
    }
    this.persistence.saveAgents(filtered);
  }

  private sanitizeStatus(value: unknown): AgentStatus {
    return value === "Ready" || value === "Experimental" ? value : "Draft";
  }

  private sanitizeCompatibility(value: unknown): PlatformCompatibility[] {
    if (!Array.isArray(value)) return ["copilot", "claude", "openai", "neutral"];
    const allowed: PlatformCompatibility[] = ["copilot", "claude", "openai", "neutral"];
    const filtered = value.filter((v): v is PlatformCompatibility =>
      typeof v === "string" && (allowed as string[]).includes(v),
    );
    return filtered.length > 0 ? filtered : ["copilot", "claude", "openai", "neutral"];
  }

  private uniqueId(name: string, agents: Agent[]): string {
    const base = `agent-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "custom"}`;
    let candidate = base;
    let n = 2;
    while (agents.some((a) => a.id === candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
  }
}
