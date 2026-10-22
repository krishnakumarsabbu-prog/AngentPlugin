import type { DashboardData, Skill, Agent, Workflow, ExecutionRecord, IntegrationStatus, AuditEvent } from "../types";

export const demoSkills: Skill[] = [];

export const demoAgents: Agent[] = [];
const agents = demoAgents;

const workflows: Workflow[] = [];

const executions: ExecutionRecord[] = [];

const integrations: IntegrationStatus[] = [
  {
    id: "int-copilot",
    name: "GitHub Copilot",
    kind: "copilot",
    status: "Not Connected",
    description: "Export skills and agents as Copilot instructions and chat participants.",
  },
  {
    id: "int-claude",
    name: "Claude / Claude Code",
    kind: "claude",
    status: "Not Connected",
    description: "Export agents as Claude Code subagents and skill manifests.",
  },
  {
    id: "int-openai",
    name: "OpenAI API",
    kind: "openai",
    status: "Not Connected",
    description: "Adapter scaffold for OpenAI-compatible APIs. No live calls are made.",
  },
];

export function buildDemoDashboard(): DashboardData {
  const sortedSkills = [...demoSkills].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const sortedAgents = [...agents].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const sortedExec = [...executions].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  const recentActivity = [
    ...demoSkills.map((s) => ({ id: `skill-${s.id}`, kind: "skill" as const, label: `Skill "${s.name}" updated`, timestamp: s.updatedAt, status: s.status })),
    ...agents.map((a) => ({ id: `agent-${a.id}`, kind: "agent" as const, label: `Agent "${a.name}" updated`, timestamp: a.updatedAt, status: a.status })),
    ...executions.map((e) => ({ id: `exec-${e.id}`, kind: "execution" as const, label: `Pipeline run ${e.id}`, timestamp: e.startedAt, status: e.status })),
  ]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, 8);

  return {
    metrics: {
      totalSkills: demoSkills.length,
      totalAgents: agents.length,
      totalPipelines: workflows.length,
      pipelineRuns: executions.length,
      successfulRuns: executions.filter((e) => e.status === "Succeeded").length,
      failedRuns: executions.filter((e) => e.status === "Failed").length,
      installedPackages: new Set(demoSkills.map((s) => s.category)).size + workflows.length,
    },
    recentActivity,
    recentSkills: sortedSkills.slice(0, 5),
    recentAgents: sortedAgents.slice(0, 5),
    recentExecutions: sortedExec.slice(0, 6),
    integrations,
  };
}

interface DemoSkillsStore {
  list(): Skill[];
  get(id: string): Skill | undefined;
  create(input: Partial<Skill>): Skill;
  update(id: string, patch: Partial<Skill>): Skill;
  duplicate(id: string): Skill;
  remove(id: string): void;
}

const clone = (skill: Skill): Skill => ({
  ...skill,
  tags: [...skill.tags],
  resources: skill.resources.map((r) => ({ ...r })),
  compatibility: [...skill.compatibility],
  otherTargets: [...skill.otherTargets],
  requiredTools: [...skill.requiredTools],
  permissions: [...skill.permissions],
});

function createDemoSkillsStore(initial: Skill[]): DemoSkillsStore {
  let items = initial.map(clone);
  const now = () => new Date().toISOString();
  const uniqueId = (name: string): string => {
    const base = `skill-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled"}`;
    let candidate = base;
    let n = 2;
    while (items.some((s) => s.id === candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
  };
  return {
    list: () => items.map(clone),
    get: (id) => {
      const found = items.find((s) => s.id === id);
      return found ? clone(found) : undefined;
    },
    create: (input) => {
      const ts = now();
      const skill: Skill = {
        id: uniqueId(input.name ?? "skill"),
        name: input.name?.trim() || "Untitled Skill",
        description: input.description ?? "",
        version: input.version ?? "0.1.0",
        author: input.author ?? "",
        category: input.category ?? "General",
        tags: [...(input.tags ?? [])],
        instructions: input.instructions ?? "",
        frontmatter: input.frontmatter ?? "",
        resources: (input.resources ?? []).map((r) => ({ ...r })),
        compatibility: [...(input.compatibility ?? [])],
        otherTargets: [...(input.otherTargets ?? [])],
        requiredTools: [...(input.requiredTools ?? [])],
        permissions: [...(input.permissions ?? [])],
        changelog: input.changelog ?? "",
        requirements: input.requirements ?? "",
        status: input.status ?? "Draft",
        installationState: "not-installed",
        createdAt: ts,
        updatedAt: ts,
      };
      items = [skill, ...items];
      return clone(skill);
    },
    update: (id, patch) => {
      const idx = items.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error(`Skill not found: ${id}`);
      const updated: Skill = {
        ...items[idx],
        ...patch,
        id: items[idx].id,
        author: patch.author ?? items[idx].author,
        frontmatter: patch.frontmatter ?? items[idx].frontmatter,
        otherTargets: patch.otherTargets ?? items[idx].otherTargets,
        requiredTools: patch.requiredTools ?? items[idx].requiredTools,
        permissions: patch.permissions ?? items[idx].permissions,
        changelog: patch.changelog ?? items[idx].changelog,
        requirements: patch.requirements ?? items[idx].requirements,
        installationState: items[idx].installationState,
        createdAt: items[idx].createdAt,
        updatedAt: now(),
      };
      items[idx] = updated;
      return clone(updated);
    },
    duplicate: (id) => {
      const idx = items.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error(`Skill not found: ${id}`);
      const ts = now();
      const copy: Skill = {
        ...clone(items[idx]),
        id: uniqueId(items[idx].name),
        name: `${items[idx].name} (Copy)`,
        status: "Draft",
        installationState: "not-installed",
        frontmatter: "",
        changelog: items[idx].changelog
          ? items[idx].changelog + "\n- Duplicated from original skill"
          : "",
        createdAt: ts,
        updatedAt: ts,
      };
      items = [copy, ...items];
      return clone(copy);
    },
    remove: (id) => {
      const before = items.length;
      items = items.filter((s) => s.id !== id);
      if (items.length === before) throw new Error(`Skill not found: ${id}`);
    },
  };
}

export const demoSkillsStore = createDemoSkillsStore(demoSkills);

const cloneAgent = (agent: Agent): Agent => ({
  ...agent,
  operatingPrinciples: agent.operatingPrinciples ? [...agent.operatingPrinciples] : [],
  assignedSkillIds: [...agent.assignedSkillIds],
  toolDefinitions: agent.toolDefinitions ? agent.toolDefinitions.map((t) => ({ ...t })) : [],
  permissionPolicy: agent.permissionPolicy
    ? {
        ...agent.permissionPolicy,
        restrictedPaths: agent.permissionPolicy.restrictedPaths ? [...agent.permissionPolicy.restrictedPaths] : [],
      }
    : undefined,
  inputSchema: agent.inputSchema ? { ...agent.inputSchema } : undefined,
  outputSchema: agent.outputSchema ? { ...agent.outputSchema } : undefined,
  compatibility: agent.compatibility ? [...agent.compatibility] : undefined,
  testScenarios: agent.testScenarios ? agent.testScenarios.map((s) => ({ ...s })) : [],
});

export function createDemoAgentsStore(initial: Agent[]) {
  let items: Agent[] = initial.map(cloneAgent);

  function uniqueAgentId(name: string): string {
    const base = `agent-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "custom"}`;
    let candidate = base;
    let n = 2;
    while (items.some((a) => a.id === candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
  }

  return {
    list: (): Agent[] => items.map(cloneAgent),
    get: (id: string): Agent | undefined => {
      const found = items.find((a) => a.id === id);
      return found ? cloneAgent(found) : undefined;
    },
    create: (input: Partial<Agent>): Agent => {
      const ts = new Date().toISOString();
      const name = (input.name ?? "").trim();
      const agent: Agent = {
        id: uniqueAgentId(name),
        name,
        description: input.description ?? "",
        category: input.category ?? "Custom",
        role: input.role ?? "General Worker",
        objective: input.objective ?? "",
        instructions: input.instructions ?? "",
        scope: input.scope,
        outOfScope: input.outOfScope,
        operatingPrinciples: input.operatingPrinciples ? [...input.operatingPrinciples] : [],
        assignedSkillIds: input.assignedSkillIds ? [...input.assignedSkillIds] : [],
        toolDefinitions: input.toolDefinitions ? input.toolDefinitions.map((t) => ({ ...t })) : [],
        permissionPolicy: input.permissionPolicy
          ? { ...input.permissionPolicy }
          : {
              network: false,
              fileSystem: "read",
              shell: false,
              maxTokens: 8000,
              readOnly: true,
              workspaceAccess: true,
              writeOperations: false,
              restrictedPaths: [".git", ".env", "*.pem", "*.key"],
              humanApprovalRequired: true,
            },
        inputSchema: input.inputSchema ? { ...input.inputSchema } : { type: "object", properties: {}, required: [] },
        outputSchema: input.outputSchema ? { ...input.outputSchema } : { type: "object", properties: {}, required: [] },
        exampleInput: input.exampleInput,
        exampleOutput: input.exampleOutput,
        compatibility: input.compatibility ? [...input.compatibility] : ["copilot", "claude", "openai", "neutral"],
        exportFormat: input.exportFormat ?? "agent-spec",
        testScenarios: input.testScenarios ? input.testScenarios.map((s) => ({ ...s })) : [],
        version: input.version ?? "1.0.0",
        status: input.status ?? "Draft",
        changelog: input.changelog ?? "1.0.0 — Initial configuration",
        createdAt: ts,
        updatedAt: ts,
      };
      items = [agent, ...items];
      return cloneAgent(agent);
    },
    update: (id: string, patch: Partial<Agent>): Agent => {
      const idx = items.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error(`Agent not found: ${id}`);
      const updated: Agent = {
        ...items[idx],
        ...patch,
        id: items[idx].id,
        createdAt: items[idx].createdAt,
        updatedAt: new Date().toISOString(),
      };
      items[idx] = updated;
      return cloneAgent(updated);
    },
    duplicate: (id: string): Agent => {
      const idx = items.findIndex((a) => a.id === id);
      if (idx === -1) throw new Error(`Agent not found: ${id}`);
      const ts = new Date().toISOString();
      const existing = items[idx];
      const copy: Agent = {
        ...cloneAgent(existing),
        id: uniqueAgentId(`${existing.name}-copy`),
        name: `${existing.name} (Copy)`,
        status: "Draft",
        changelog: `${existing.version} — Duplicated from original\n${existing.changelog ?? ""}`.trim(),
        createdAt: ts,
        updatedAt: ts,
      };
      items = [copy, ...items];
      return cloneAgent(copy);
    },
    remove: (id: string): void => {
      const before = items.length;
      items = items.filter((a) => a.id !== id);
      if (items.length === before) throw new Error(`Agent not found: ${id}`);
    },
  };
}

export const demoAgentsStore = createDemoAgentsStore(demoAgents);

export const demoAuditEvents: AuditEvent[] = [];
