import type { DashboardData, Skill, Agent, Workflow, ExecutionRecord, IntegrationStatus, SkillResource, InstallationState } from "../types";

export const demoSkills: Skill[] = [
  {
    id: "skill-security-audit",
    name: "Security Audit Skill",
    description: "Reviews source for common vulnerability classes and reports findings with severity.",
    version: "1.2.0",
    category: "Security",
    tags: ["security", "audit", "owasp"],
    instructions: "",
    resources: [
      {
        "id": "res-audit-checklist",
        "name": "owasp-checklist.md",
        "kind": "reference",
        "description": "OWASP Top 10 review checklist."
      },
      {
        "id": "res-audit-severity",
        "name": "severity-matrix.md",
        "kind": "reference",
        "description": "Severity ranking matrix for findings."
      }
    ],
    compatibility: ["copilot", "claude", "openai"],
    installationState: "installed",
    status: "Ready",
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-10-12T14:22:00Z",
  },
  {
    id: "skill-code-review",
    name: "Code Review Skill",
    description: "Performs structural code review against team standards.",
    version: "0.9.4",
    category: "Review",
    tags: ["review", "quality"],
    instructions: "",
    resources: [
      {
        "id": "res-review-rubric",
        "name": "review-rubric.md",
        "kind": "reference",
        "description": "Scoring rubric for structural review."
      }
    ],
    compatibility: ["copilot", "claude"],
    installationState: "installed",
    status: "Ready",
    createdAt: "2026-09-04T09:30:00Z",
    updatedAt: "2026-10-11T08:10:00Z",
  },
  {
    id: "skill-token-efficiency",
    name: "Token Efficiency Skill",
    description: "Rewrites prompts and outputs to reduce token usage.",
    version: "0.4.1",
    category: "Optimization",
    tags: ["tokens", "cost"],
    instructions: "",
    resources: [
      {
        "id": "res-token-baseline",
        "name": "baseline-prompts.md",
        "kind": "template",
        "description": "Baseline prompts used for compression benchmarks."
      }
    ],
    compatibility: ["openai", "claude"],
    installationState: "not-installed",
    status: "Draft",
    createdAt: "2026-09-22T16:00:00Z",
    updatedAt: "2026-10-09T12:00:00Z",
  },
  {
    id: "skill-test-generation",
    name: "Test Generation Skill",
    description: "Generates unit tests from source signatures and examples.",
    version: "1.0.0",
    category: "Testing",
    tags: ["testing", "unit"],
    instructions: "",
    resources: [
      {
        "id": "res-test-conventions",
        "name": "test-conventions.md",
        "kind": "reference",
        "description": "Project test naming and layout conventions."
      },
      {
        "id": "res-test-scaffold",
        "name": "scaffold-test.ts",
        "kind": "template",
        "description": "Starter template for generated test files."
      }
    ],
    compatibility: ["copilot", "claude", "openai"],
    installationState: "installed",
    status: "Ready",
    createdAt: "2026-09-10T11:15:00Z",
    updatedAt: "2026-10-08T17:45:00Z",
  },
  {
    id: "skill-architecture-analysis",
    name: "Architecture Analysis Skill",
    description: "Maps modules and surfaces coupling and layering issues.",
    version: "0.6.2",
    category: "Architecture",
    tags: ["architecture", "coupling"],
    instructions: "",
    resources: [
      {
        "id": "res-arch-layer-map",
        "name": "layer-map.md",
        "kind": "reference",
        "description": "Expected layering rules between modules."
      },
      {
        "id": "res-arch-graph",
        "name": "build-graph.sh",
        "kind": "script",
        "description": "Script that emits a module dependency graph."
      }
    ],
    compatibility: ["claude", "openai"],
    installationState: "outdated",
    status: "Ready",
    createdAt: "2026-09-14T13:20:00Z",
    updatedAt: "2026-10-07T10:30:00Z",
  },
];

const agents: Agent[] = [
  {
    id: "agent-architecture",
    name: "Architecture Agent",
    description: "Owns module structure and cross-cutting design decisions.",
    role: "Architect",
    objective: "Maintain a coherent, extensible architecture across features.",
    instructions: "",
    assignedSkillIds: ["skill-architecture-analysis"],
    version: "1.1.0",
    status: "Ready",
    createdAt: "2026-09-02T09:00:00Z",
    updatedAt: "2026-10-13T09:12:00Z",
  },
  {
    id: "agent-planning",
    name: "Planning Agent",
    description: "Breaks down work into ordered, sized tasks.",
    role: "Planner",
    objective: "Produce executable plans with clear acceptance criteria.",
    instructions: "",
    assignedSkillIds: [],
    version: "1.0.0",
    status: "Ready",
    createdAt: "2026-09-05T09:30:00Z",
    updatedAt: "2026-10-12T16:40:00Z",
  },
  {
    id: "agent-implementation",
    name: "Implementation Agent",
    description: "Writes code changes for planned tasks.",
    role: "Implementer",
    objective: "Deliver working code matching the plan.",
    instructions: "",
    assignedSkillIds: [],
    version: "1.2.0",
    status: "Ready",
    createdAt: "2026-09-06T09:30:00Z",
    updatedAt: "2026-10-11T11:20:00Z",
  },
  {
    id: "agent-static-review",
    name: "Static Code Review Agent",
    description: "Runs review skills and aggregates findings.",
    role: "Reviewer",
    objective: "Surface quality and security issues before merge.",
    instructions: "",
    assignedSkillIds: [],
    version: "0.9.0",
    status: "Ready",
    createdAt: "2026-09-08T09:30:00Z",
    updatedAt: "2026-10-10T08:05:00Z",
  },
  {
    id: "agent-test-validation",
    name: "Test Validation Agent",
    description: "Generates and validates tests for changes.",
    role: "Tester",
    objective: "Ensure tests exist and pass for new code.",
    instructions: "",
    assignedSkillIds: [],
    version: "1.0.1",
    status: "Experimental",
    createdAt: "2026-09-12T09:30:00Z",
    updatedAt: "2026-10-09T14:15:00Z",
  },
  {
    id: "agent-documentation",
    name: "Documentation Agent",
    description: "Updates docs to reflect code changes.",
    role: "Tech Writer",
    objective: "Keep documentation accurate and discoverable.",
    instructions: "",
    assignedSkillIds: [],
    version: "0.8.0",
    status: "Draft",
    createdAt: "2026-09-20T09:30:00Z",
    updatedAt: "2026-10-06T09:30:00Z",
  },
];

const workflows: Workflow[] = [
  {
    id: "wf-feature-delivery",
    name: "Enterprise Feature Delivery",
    description: "Plan, implement, review, and deliver a feature end-to-end.",
    version: "1.0.0",
    status: "Active",
    createdAt: "2026-09-15T10:00:00Z",
    updatedAt: "2026-10-13T15:00:00Z",
  },
  {
    id: "wf-security-review",
    name: "Security Review Pipeline",
    description: "Static security review on every change.",
    version: "0.9.0",
    status: "Ready",
    createdAt: "2026-09-18T10:00:00Z",
    updatedAt: "2026-10-10T11:00:00Z",
  },
  {
    id: "wf-release-readiness",
    name: "Release Readiness Pipeline",
    description: "Validates tests and docs before release sign-off.",
    version: "0.5.0",
    status: "Draft",
    createdAt: "2026-09-25T10:00:00Z",
    updatedAt: "2026-10-05T10:00:00Z",
  },
];

const executions: ExecutionRecord[] = [
  {
    id: "exec-1001",
    workflowId: "wf-feature-delivery",
    workflowVersion: "1.0.0",
    status: "Succeeded",
    startedAt: "2026-10-13T15:00:00Z",
    completedAt: "2026-10-13T15:12:00Z",
    finalSummary: "Feature delivered and merged.",
  },
  {
    id: "exec-1002",
    workflowId: "wf-security-review",
    workflowVersion: "0.9.0",
    status: "Failed",
    startedAt: "2026-10-11T11:00:00Z",
    completedAt: "2026-10-11T11:04:00Z",
    finalSummary: "Security review blocked merge.",
  },
  {
    id: "exec-1003",
    workflowId: "wf-feature-delivery",
    workflowVersion: "1.0.0",
    status: "Running",
    startedAt: "2026-10-14T09:00:00Z",
  },
  {
    id: "exec-1004",
    workflowId: "wf-release-readiness",
    workflowVersion: "0.5.0",
    status: "Succeeded",
    startedAt: "2026-10-05T10:00:00Z",
    completedAt: "2026-10-05T10:18:00Z",
    finalSummary: "Release candidate validated.",
  },
  {
    id: "exec-1005",
    workflowId: "wf-security-review",
    workflowVersion: "0.9.0",
    status: "Cancelled",
    startedAt: "2026-10-02T08:00:00Z",
    completedAt: "2026-10-02T08:01:00Z",
  },
];

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
    status: "Mock",
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
        category: input.category ?? "General",
        tags: [...(input.tags ?? [])],
        instructions: input.instructions ?? "",
        resources: (input.resources ?? []).map((r) => ({ ...r })),
        compatibility: [...(input.compatibility ?? [])],
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
