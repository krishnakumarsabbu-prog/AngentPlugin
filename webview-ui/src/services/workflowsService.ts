import { sendRequest, hasVsCodeApi } from "./vscodeApi";
import type { Workflow, WorkflowValidationReport, WorkflowValidationFinding, WorkflowNode } from "../types";

export interface WorkflowsStore {
  list(): Promise<Workflow[]>;
  get(id: string): Promise<Workflow>;
  create(input: Partial<Workflow>): Promise<Workflow>;
  update(id: string, patch: Partial<Workflow>): Promise<Workflow>;
  duplicate(id: string): Promise<Workflow>;
  remove(id: string): Promise<void>;
  validate(workflow: Partial<Workflow>, id?: string): Promise<WorkflowValidationReport>;
}

export const sampleEnterpriseWorkflow: Workflow = {
  id: "wf-feature-delivery",
  name: "Enterprise Feature Delivery",
  description: "End-to-end multi-agent pipeline: intake, architecture, planning, human approval, implementation, code review, validation, summary, and artifact generation.",
  version: "1.0.0",
  status: "Active",
  executionSettings: {
    maxParallelNodes: 2,
    retryPolicy: { maxRetries: 2, backoffSeconds: 5 },
    requireApprovalFor: ["node-approval"],
  },
  nodes: [
    {
      id: "node-start",
      type: "start",
      name: "Start",
      description: "Pipeline trigger and initialization entry point.",
      configuration: { trigger: "manual" },
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object", properties: { triggeredAt: { type: "string" } } } },
      timeoutSeconds: 60,
      retryPolicy: { enabled: false, maxRetries: 0, backoffSeconds: 0 },
      approvalPolicy: { required: false },
      errorHandling: { action: "halt" },
      position: { x: 50, y: 160 },
    },
    {
      id: "node-req",
      type: "requirement_input",
      name: "Requirement Intake",
      description: "Accepts user stories, acceptance criteria, and technical constraints.",
      configuration: { intakeFormat: "markdown", source: "User Story" },
      inputContract: { schema: { type: "object", properties: { requirementText: { type: "string" } } }, requiredFields: ["requirementText"] },
      outputContract: { schema: { type: "object", properties: { requirements: { type: "object" } } } },
      timeoutSeconds: 120,
      retryPolicy: { enabled: true, maxRetries: 2, backoffSeconds: 3 },
      approvalPolicy: { required: false },
      errorHandling: { action: "halt" },
      position: { x: 280, y: 160 },
    },
    {
      id: "node-arch",
      type: "agent_execution",
      name: "Architecture Agent",
      description: "Designs technical components, data contracts, and architectural decisions.",
      configuration: { agentId: "agent-architecture", role: "Software Architect" },
      inputContract: { schema: { type: "object", properties: { requirements: { type: "object" } } }, requiredFields: ["requirements"] },
      outputContract: { schema: { type: "object", properties: { architectureDoc: { type: "string" }, components: { type: "array" } } } },
      timeoutSeconds: 300,
      retryPolicy: { enabled: true, maxRetries: 2, backoffSeconds: 5 },
      approvalPolicy: { required: false },
      errorHandling: { action: "halt" },
      position: { x: 520, y: 160 },
    },
    {
      id: "node-plan",
      type: "planning",
      name: "Planning Agent",
      description: "Deconstructs architecture into milestone execution steps with dependencies.",
      configuration: { agentId: "agent-planning", role: "Planning Specialist" },
      inputContract: { schema: { type: "object", properties: { architectureDoc: { type: "string" } } }, requiredFields: ["architectureDoc"] },
      outputContract: { schema: { type: "object", properties: { planMilestones: { type: "array" } } } },
      timeoutSeconds: 300,
      retryPolicy: { enabled: true, maxRetries: 2, backoffSeconds: 5 },
      approvalPolicy: { required: false },
      errorHandling: { action: "halt" },
      position: { x: 760, y: 160 },
    },
    {
      id: "node-approval",
      type: "human_approval",
      name: "Human Plan Approval",
      description: "Governance checkpoint requiring Tech Lead / Principal Engineer sign-off.",
      configuration: {
        approverRole: "Engineering Lead / Tech Lead",
        approvalMessage: "Inspect architecture blueprint, milestone scope, and risk mitigations.",
        whatIsBeingApproved: "Technical architecture blueprint and delivery milestones.",
        timeoutMinutes: 60,
        onApprove: "proceed",
        onReject: "halt",
      },
      inputContract: { schema: { type: "object", properties: { planMilestones: { type: "array" } } } },
      outputContract: { schema: { type: "object", properties: { approved: { type: "boolean" }, reviewNotes: { type: "string" } } } },
      timeoutSeconds: 3600,
      retryPolicy: { enabled: false, maxRetries: 0, backoffSeconds: 0 },
      approvalPolicy: {
        required: true,
        approverRole: "Engineering Lead / Tech Lead",
        timeoutMinutes: 60,
        message: "Inspect architecture blueprint, milestone scope, and risk mitigations.",
        whatIsBeingApproved: "Technical architecture blueprint and delivery milestones.",
        onApprove: "proceed",
        onReject: "halt",
      },
      errorHandling: { action: "halt" },
      position: { x: 1000, y: 160 },
    },
    {
      id: "node-impl",
      type: "agent_execution",
      name: "Implementation Agent",
      description: "Generates code changes, scaffolds files, and implements requested features.",
      configuration: { agentId: "agent-implementation", role: "Senior Full-Stack Engineer" },
      inputContract: { schema: { type: "object", properties: { planMilestones: { type: "array" } } } },
      outputContract: { schema: { type: "object", properties: { diff: { type: "string" }, modifiedFiles: { type: "array" } } } },
      timeoutSeconds: 600,
      retryPolicy: { enabled: true, maxRetries: 2, backoffSeconds: 10 },
      approvalPolicy: { required: false },
      errorHandling: { action: "halt" },
      position: { x: 1240, y: 160 },
    },
    {
      id: "node-review",
      type: "agent_execution",
      name: "Code Review Agent",
      description: "Audits AST, stylistic consistency, security guardrails, and maintainability.",
      configuration: { agentId: "agent-static-review", role: "Static Code Reviewer" },
      inputContract: { schema: { type: "object", properties: { diff: { type: "string" } } } },
      outputContract: { schema: { type: "object", properties: { reviewPassed: { type: "boolean" }, findings: { type: "array" } } } },
      timeoutSeconds: 300,
      retryPolicy: { enabled: true, maxRetries: 2, backoffSeconds: 5 },
      approvalPolicy: { required: false },
      errorHandling: { action: "halt" },
      position: { x: 1480, y: 160 },
    },
    {
      id: "node-test",
      type: "validation",
      name: "Test Validation Agent",
      description: "Runs unit, integration, and contract tests with coverage assertions.",
      configuration: { agentId: "agent-test-validation", assertion: "All unit, integration, and contract tests pass." },
      inputContract: { schema: { type: "object", properties: { modifiedFiles: { type: "array" } } } },
      outputContract: { schema: { type: "object", properties: { testResults: { type: "object" } } } },
      timeoutSeconds: 300,
      retryPolicy: { enabled: true, maxRetries: 2, backoffSeconds: 5 },
      approvalPolicy: { required: false },
      errorHandling: { action: "halt" },
      position: { x: 1720, y: 160 },
    },
    {
      id: "node-summary",
      type: "agent_execution",
      name: "Summary Agent",
      description: "Synthesizes change summaries, release notes, and documentation updates.",
      configuration: { agentId: "agent-documentation", role: "Documentation Specialist" },
      inputContract: { schema: { type: "object", properties: { diff: { type: "string" } } } },
      outputContract: { schema: { type: "object", properties: { releaseNotes: { type: "string" } } } },
      timeoutSeconds: 180,
      retryPolicy: { enabled: true, maxRetries: 1, backoffSeconds: 3 },
      approvalPolicy: { required: false },
      errorHandling: { action: "continue_with_warning" },
      position: { x: 1960, y: 160 },
    },
    {
      id: "node-artifact",
      type: "artifact_output",
      name: "Final Artifact Output",
      description: "Bundles approved deliverables and prepares export packages.",
      configuration: { artifactPath: "dist/enterprise-feature.json", publishTarget: "Repository" },
      inputContract: { schema: { type: "object", properties: { releaseNotes: { type: "string" } } } },
      outputContract: { schema: { type: "object", properties: { artifactUri: { type: "string" } } } },
      timeoutSeconds: 60,
      retryPolicy: { enabled: false, maxRetries: 0, backoffSeconds: 0 },
      approvalPolicy: { required: false },
      errorHandling: { action: "halt" },
      position: { x: 2200, y: 160 },
    },
    {
      id: "node-end",
      type: "end",
      name: "End",
      description: "Pipeline execution concluded successfully.",
      configuration: {},
      inputContract: { schema: { type: "object" } },
      outputContract: { schema: { type: "object" } },
      timeoutSeconds: 30,
      retryPolicy: { enabled: false, maxRetries: 0, backoffSeconds: 0 },
      approvalPolicy: { required: false },
      errorHandling: { action: "halt" },
      position: { x: 2440, y: 160 },
    },
  ],
  edges: [
    { id: "e-start-req", source: "node-start", target: "node-req" },
    { id: "e-req-arch", source: "node-req", target: "node-arch" },
    { id: "e-arch-plan", source: "node-arch", target: "node-plan" },
    { id: "e-plan-approval", source: "node-plan", target: "node-approval" },
    { id: "e-approval-impl", source: "node-approval", target: "node-impl" },
    { id: "e-impl-review", source: "node-impl", target: "node-review" },
    { id: "e-review-test", source: "node-review", target: "node-test" },
    { id: "e-test-summary", source: "node-test", target: "node-summary" },
    { id: "e-summary-artifact", source: "node-summary", target: "node-artifact" },
    { id: "e-artifact-end", source: "node-artifact", target: "node-end" },
  ],
  createdAt: "2026-09-15T10:00:00Z",
  updatedAt: "2026-10-13T15:00:00Z",
};

export const sampleSecurityWorkflow: Workflow = {
  id: "wf-security-review",
  name: "Security Review Pipeline",
  description: "Automated vulnerability scan and static security audit on diffs.",
  version: "0.9.0",
  status: "Ready",
  executionSettings: {
    maxParallelNodes: 1,
    retryPolicy: { maxRetries: 1, backoffSeconds: 3 },
    requireApprovalFor: [],
  },
  nodes: [
    { id: "s-start", type: "start", name: "Start", configuration: {}, position: { x: 50, y: 150 } },
    { id: "s-input", type: "requirement_input", name: "Diff Input", configuration: {}, position: { x: 250, y: 150 } },
    { id: "s-audit", type: "agent_execution", name: "Security Audit Agent", configuration: { agentId: "agent-static-review" }, position: { x: 480, y: 150 } },
    { id: "s-out", type: "artifact_output", name: "Security Audit Report", configuration: {}, position: { x: 720, y: 150 } },
    { id: "s-end", type: "end", name: "End", configuration: {}, position: { x: 940, y: 150 } },
  ],
  edges: [
    { id: "se-1", source: "s-start", target: "s-input" },
    { id: "se-2", source: "s-input", target: "s-audit" },
    { id: "se-3", source: "s-audit", target: "s-out" },
    { id: "se-4", source: "s-out", target: "s-end" },
  ],
  createdAt: "2026-09-18T10:00:00Z",
  updatedAt: "2026-10-10T11:00:00Z",
};

let inMemoryWorkflows: Workflow[] = [];

function cloneWorkflow(wf: Workflow): Workflow {
  return {
    ...wf,
    nodes: wf.nodes.map((n) => ({
      ...n,
      position: { ...n.position },
      configuration: { ...n.configuration },
      inputContract: n.inputContract ? { ...n.inputContract } : undefined,
      outputContract: n.outputContract ? { ...n.outputContract } : undefined,
      retryPolicy: n.retryPolicy ? { ...n.retryPolicy } : undefined,
      approvalPolicy: n.approvalPolicy ? { ...n.approvalPolicy } : undefined,
      errorHandling: n.errorHandling ? { ...n.errorHandling } : undefined,
    })),
    edges: wf.edges.map((e) => ({ ...e })),
    executionSettings: {
      ...wf.executionSettings,
      retryPolicy: { ...wf.executionSettings.retryPolicy },
      requireApprovalFor: [...wf.executionSettings.requireApprovalFor],
    },
  };
}

function requireWorkflow(wf: unknown, context: string): Workflow {
  if (!wf || typeof wf !== "object" || typeof (wf as Workflow).id !== "string") {
    throw new Error(`${context}: unexpected response shape`);
  }
  return wf as Workflow;
}

export function validateNodeLocally(
  node: WorkflowNode,
  allNodes: WorkflowNode[] = []
): { valid: boolean; errors: WorkflowValidationFinding[]; warnings: WorkflowValidationFinding[] } {
  const errors: WorkflowValidationFinding[] = [];
  const warnings: WorkflowValidationFinding[] = [];
  const nodeId = node.id || "unknown";

  if (!node.name || !node.name.trim()) {
    errors.push({ severity: "error", nodeId, message: `Node "${nodeId}" must have a display name.` });
  }

  if (node.timeoutSeconds !== undefined && node.timeoutSeconds !== null && (node.timeoutSeconds <= 0 || isNaN(node.timeoutSeconds))) {
    errors.push({ severity: "error", nodeId, message: "Timeout must be a positive number of seconds." });
  }

  if (node.retryPolicy?.enabled) {
    if (node.retryPolicy.maxRetries < 0 || isNaN(node.retryPolicy.maxRetries)) {
      errors.push({ severity: "error", nodeId, message: "Max retries cannot be negative." });
    }
  }

  if (node.approvalPolicy?.required) {
    if (!node.approvalPolicy.approverRole?.trim()) {
      errors.push({ severity: "error", nodeId, message: "Approval policy requires an approver role." });
    }
  }

  const cfg = node.configuration || {};
  if (node.type === "agent_execution" || node.type === "agent") {
    if (!cfg.agentId || !(cfg.agentId as string).trim()) {
      errors.push({ severity: "error", nodeId, message: "Agent Execution node requires a selected Agent." });
    }
  } else if (node.type === "skill_invocation" || node.type === "skill") {
    if (!cfg.skillId || !(cfg.skillId as string).trim()) {
      errors.push({ severity: "error", nodeId, message: "Skill Invocation node requires a selected Skill." });
    }
  } else if (node.type === "human_approval" || node.type === "approval") {
    const role = (cfg.approverRole as string) || node.approvalPolicy?.approverRole;
    const msg = (cfg.approvalMessage as string) || (cfg.message as string) || node.approvalPolicy?.message;
    const what = (cfg.whatIsBeingApproved as string) || node.approvalPolicy?.whatIsBeingApproved;
    if (!role?.trim()) errors.push({ severity: "error", nodeId, message: "Designated approver role is required." });
    if (!msg?.trim()) errors.push({ severity: "error", nodeId, message: "Approval message is required." });
    if (!what?.trim()) errors.push({ severity: "error", nodeId, message: "What is being approved must be defined." });
  } else if (node.type === "condition_branch" || node.type === "decision") {
    const expr = (cfg.conditionExpression as string) || (cfg.conditionValue as string) || "";
    if (!expr.trim()) errors.push({ severity: "error", nodeId, message: "Condition rule or expression is required." });
    const branches = Array.isArray(cfg.branches) ? cfg.branches : ["true", "false"];
    if (branches.length < 2) errors.push({ severity: "error", nodeId, message: "Must define at least 2 branch outputs." });
  } else if (node.type === "context_handoff" || node.type === "handoff") {
    const fields = Array.isArray(cfg.forwardFields) ? cfg.forwardFields : [];
    const artifacts = Array.isArray(cfg.forwardArtifacts) ? cfg.forwardArtifacts : [];
    if (fields.length === 0 && artifacts.length === 0 && cfg.includeMemory === false) {
      warnings.push({ severity: "warning", nodeId, message: "No fields, artifacts, or memory forwarded." });
    }
  }

  if (node.errorHandling?.action === "route_to_fallback") {
    if (!node.errorHandling.fallbackNodeId?.trim()) {
      errors.push({ severity: "error", nodeId, message: "Fallback node must be specified when routing on error." });
    } else if (allNodes.length > 0 && !allNodes.some((n) => n.id === node.errorHandling?.fallbackNodeId)) {
      errors.push({ severity: "error", nodeId, message: `Fallback node "${node.errorHandling.fallbackNodeId}" does not exist.` });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function detectGraphCyclesLocally(
  nodes: WorkflowNode[],
  edges: { source: string; target: string }[]
): { hasCycle: boolean; cyclePath?: string[] } {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    if (e.source && e.target && adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.push(e.target);
    }
  }

  const state = new Map<string, number>();
  let foundCycle: string[] | undefined;

  function dfs(curr: string, stack: string[]): boolean {
    state.set(curr, 1);
    stack.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      const s = state.get(next) ?? 0;
      if (s === 1) {
        const idx = stack.indexOf(next);
        foundCycle = stack.slice(idx).concat(next);
        return true;
      }
      if (s === 0 && dfs(next, stack)) return true;
    }

    state.set(curr, 2);
    stack.pop();
    return false;
  }

  for (const n of nodes) {
    if ((state.get(n.id) ?? 0) === 0) {
      if (dfs(n.id, [])) return { hasCycle: true, cyclePath: foundCycle };
    }
  }
  return { hasCycle: false };
}

export function validateWorkflowLocally(workflow: Partial<Workflow> & { schemaVersion?: string } | undefined): WorkflowValidationReport {
  const errors: WorkflowValidationFinding[] = [];
  const warnings: WorkflowValidationFinding[] = [];
  const suggestions: WorkflowValidationFinding[] = [];

  if (!workflow) {
    errors.push({ severity: "error", message: "Workflow definition is empty." });
    return { valid: false, errors, warnings, suggestions };
  }

  if (workflow.schemaVersion) {
    const major = parseInt(workflow.schemaVersion.split(".")[0], 10);
    if (isNaN(major) || major > 1) {
      errors.push({
        severity: "error",
        message: `Unsupported schema version "${workflow.schemaVersion}". Supported versions: 1.x.`,
      });
    }
  }

  const name = (workflow.name ?? "").trim();
  if (!name) {
    errors.push({ severity: "error", message: "Workflow name is required." });
  }

  const nodes = workflow.nodes ?? [];
  const edges = workflow.edges ?? [];

  if (nodes.length === 0) {
    errors.push({ severity: "error", message: "Canvas must contain at least one node." });
    return { valid: false, errors, warnings, suggestions };
  }

  const nodeIds = new Set<string>();
  const startNodeIds: string[] = [];
  const endNodeIds: string[] = [];

  for (const n of nodes) {
    if (!n.id) {
      errors.push({ severity: "error", message: "Found node with missing ID." });
      continue;
    }
    if (nodeIds.has(n.id)) {
      errors.push({ severity: "error", nodeId: n.id, message: `Duplicate node ID: "${n.id}".` });
    }
    nodeIds.add(n.id);

    if (n.type === "start" || n.type === "requirement_input" || n.type === "input") {
      startNodeIds.push(n.id);
    }
    if (n.type === "end" || n.type === "artifact_output" || n.type === "output") {
      endNodeIds.push(n.id);
    }

    const nodeRes = validateNodeLocally(n, nodes);
    errors.push(...nodeRes.errors);
    warnings.push(...nodeRes.warnings);
  }

  if (startNodeIds.length === 0) {
    errors.push({ severity: "error", message: "Workflow must have at least one 'Start' or 'Requirement Input' entry node." });
  }
  if (endNodeIds.length === 0) {
    errors.push({ severity: "error", message: "Workflow must have at least one 'End' or 'Artifact Output' terminal node." });
  }

  const forwardAdj = new Map<string, string[]>();
  const backwardAdj = new Map<string, string[]>();
  const outgoingCount = new Map<string, number>();

  for (const n of nodes) {
    forwardAdj.set(n.id, []);
    backwardAdj.set(n.id, []);
    outgoingCount.set(n.id, 0);
  }

  for (const e of edges) {
    if (!nodeIds.has(e.source)) {
      errors.push({ severity: "error", edgeId: e.id, message: `Edge references non-existent source node "${e.source}".` });
    }
    if (!nodeIds.has(e.target)) {
      errors.push({ severity: "error", edgeId: e.id, message: `Edge references non-existent target node "${e.target}".` });
    }
    if (e.source === e.target) {
      errors.push({ severity: "error", edgeId: e.id, nodeId: e.source, message: `Self-referencing loop detected on "${e.source}". Cycles are not supported.` });
    }

    if (nodeIds.has(e.source) && nodeIds.has(e.target)) {
      forwardAdj.get(e.source)?.push(e.target);
      backwardAdj.get(e.target)?.push(e.source);
      outgoingCount.set(e.source, (outgoingCount.get(e.source) || 0) + 1);
    }
  }

  // Cycle check
  const cycle = detectGraphCyclesLocally(nodes, edges);
  if (cycle.hasCycle && cycle.cyclePath) {
    errors.push({
      severity: "error",
      nodeId: cycle.cyclePath[0],
      message: `Graph cycle detected: ${cycle.cyclePath.join(" -> ")}. Harness pipelines must be Directed Acyclic Graphs (DAGs).`,
    });
  }

  // Condition node branch checks
  for (const n of nodes) {
    if (n.type === "condition_branch" || n.type === "decision") {
      const cfg = n.configuration || {};
      const branches = Array.isArray(cfg.branches) ? cfg.branches : ["true", "false"];
      const outs = outgoingCount.get(n.id) || 0;
      if (outs < branches.length) {
        errors.push({
          severity: "error",
          nodeId: n.id,
          message: `Condition node "${n.name || n.id}" defines ${branches.length} branches but only has ${outs} outgoing connection(s). Each branch must route to a target node.`,
        });
      }
    }
  }

  // Reachability analysis
  if (nodes.length > 1 && startNodeIds.length > 0 && endNodeIds.length > 0) {
    const reachable = new Set<string>();
    const queue = [...startNodeIds];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (!reachable.has(curr)) {
        reachable.add(curr);
        for (const next of forwardAdj.get(curr) || []) {
          if (!reachable.has(next)) queue.push(next);
        }
      }
    }

    for (const n of nodes) {
      const isStart = n.type === "start" || n.type === "requirement_input" || n.type === "input";
      if (!isStart && !reachable.has(n.id)) {
        errors.push({
          severity: "error",
          nodeId: n.id,
          message: `Node "${n.name || n.id}" is unreachable from any Start or Entry node.`,
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

const hostStore: WorkflowsStore = {
  async list() {
    const data = await sendRequest<unknown>("workflows.list");
    if (!Array.isArray(data)) throw new Error("workflows.list: unexpected response shape");
    return data.map((w) => requireWorkflow(w, "workflows.list"));
  },
  async get(id) {
    return requireWorkflow(await sendRequest<unknown>("workflows.get", { id }), "workflows.get");
  },
  async create(input) {
    return requireWorkflow(await sendRequest<unknown>("workflows.create", { workflow: input }), "workflows.create");
  },
  async update(id, patch) {
    return requireWorkflow(
      await sendRequest<unknown>("workflows.update", { workflow: { ...patch, id } }),
      "workflows.update"
    );
  },
  async duplicate(id) {
    return requireWorkflow(await sendRequest<unknown>("workflows.duplicate", { id }), "workflows.duplicate");
  },
  async remove(id) {
    await sendRequest("workflows.delete", { id });
  },
  async validate(workflow, id) {
    return sendRequest<WorkflowValidationReport>("workflows.validate", { workflow, id });
  },
};

const browserStore: WorkflowsStore = {
  async list() {
    return inMemoryWorkflows.map(cloneWorkflow);
  },
  async get(id) {
    const found = inMemoryWorkflows.find((w) => w.id === id);
    if (!found) throw new Error(`Workflow not found: ${id}`);
    return cloneWorkflow(found);
  },
  async create(input) {
    const name = (input.name ?? "Untitled Workflow").trim();
    const id = input.id || `wf-${Date.now()}`;
    const now = new Date().toISOString();
    const newWf: Workflow = {
      id,
      name,
      description: input.description ?? "",
      version: input.version ?? "1.0.0",
      status: input.status ?? "Draft",
      nodes: input.nodes ?? [
        { id: "start-1", type: "start", name: "Start", configuration: {}, position: { x: 100, y: 150 } },
        { id: "end-1", type: "end", name: "End", configuration: {}, position: { x: 500, y: 150 } },
      ],
      edges: input.edges ?? [{ id: "e-start-end", source: "start-1", target: "end-1" }],
      executionSettings: input.executionSettings ?? {
        maxParallelNodes: 2,
        retryPolicy: { maxRetries: 2, backoffSeconds: 5 },
        requireApprovalFor: [],
      },
      createdAt: now,
      updatedAt: now,
    };
    inMemoryWorkflows = [newWf, ...inMemoryWorkflows];
    return cloneWorkflow(newWf);
  },
  async update(id, patch) {
    const idx = inMemoryWorkflows.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error(`Workflow not found: ${id}`);
    const updated: Workflow = {
      ...inMemoryWorkflows[idx],
      ...patch,
      id,
      updatedAt: new Date().toISOString(),
    };
    inMemoryWorkflows[idx] = updated;
    return cloneWorkflow(updated);
  },
  async duplicate(id) {
    const original = inMemoryWorkflows.find((w) => w.id === id);
    if (!original) throw new Error(`Workflow not found: ${id}`);
    const copyId = `${original.id}-copy-${Date.now().toString(36).slice(2, 6)}`;
    const copy: Workflow = {
      ...cloneWorkflow(original),
      id: copyId,
      name: `${original.name} (Copy)`,
      status: "Draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryWorkflows = [copy, ...inMemoryWorkflows];
    return cloneWorkflow(copy);
  },
  async remove(id) {
    inMemoryWorkflows = inMemoryWorkflows.filter((w) => w.id !== id);
  },
  async validate(workflow) {
    return validateWorkflowLocally(workflow);
  },
};

export const workflowsService: WorkflowsStore = hasVsCodeApi() ? hostStore : browserStore;
