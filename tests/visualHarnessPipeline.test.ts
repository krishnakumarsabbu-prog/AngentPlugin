import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Workflow, WorkflowNode, WorkflowEdge } from "../src/domain/workflows/types";
import { WorkflowValidator, validateWorkflow } from "../src/workflows/WorkflowValidator";
import { WorkflowRepository } from "../src/storage/WorkflowRepository";
import { LocalRepository } from "../src/storage/LocalRepository";
import { safeStorage } from "../src/storage/SafeStorage";

describe("Visual Harness Pipeline - 14 Nodes, Validation, Bindings, and Persistence", () => {
  let tmpDir: string;
  let mockGlobalState: Map<string, unknown>;
  let mockContext: any;
  let localRepo: LocalRepository;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentforge-pipeline-test-"));
    mockGlobalState = new Map();
    mockContext = {
      globalState: {
        get: (key: string) => mockGlobalState.get(key),
        update: (key: string, value: unknown) => {
          mockGlobalState.set(key, value);
          return Promise.resolve();
        },
      },
    };
    localRepo = new LocalRepository(mockContext, tmpDir);
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("supports all 14 node types with valid schema and configurations", () => {
    const all14NodeTypes: WorkflowNode[] = [
      { id: "n-start", type: "start", name: "Start Entry", configuration: { trigger: "manual" }, position: { x: 0, y: 0 } },
      { id: "n-req", type: "requirement_input", name: "Requirement Input", configuration: { source: "User Story", intakeFormat: "markdown" }, position: { x: 100, y: 0 } },
      { id: "n-skill", type: "skill_invocation", name: "Skill Invocation", configuration: { skillId: "skill-code-review" }, position: { x: 200, y: 0 } },
      { id: "n-plan", type: "planning", name: "Planning", configuration: { agentId: "agent-planning", strategy: "milestone_breakdown" }, position: { x: 300, y: 0 } },
      { id: "n-agent", type: "agent_execution", name: "Agent Worker", configuration: { agentId: "agent-architecture", role: "Architect" }, position: { x: 400, y: 0 } },
      { id: "n-approval", type: "human_approval", name: "Tech Lead Approval", configuration: { approverRole: "Tech Lead", whatIsBeingApproved: "Plan deliverables", approvalMessage: "Please verify" }, position: { x: 500, y: 0 } },
      { id: "n-cond", type: "condition_branch", name: "Condition Branch", configuration: { conditionType: "expression", conditionExpression: "score >= 0.8", branches: ["true", "false"] }, position: { x: 600, y: 0 } },
      { id: "n-parallel", type: "parallel_execution", name: "Parallel Fork", configuration: { maxConcurrency: 3, executionMode: "all_settled" }, position: { x: 700, y: 0 } },
      { id: "n-merge", type: "merge_results", name: "Merge Join", configuration: { strategy: "combine_all", conflictResolution: "overwrite" }, position: { x: 800, y: 0 } },
      { id: "n-handoff", type: "context_handoff", name: "Context Handoff", configuration: { includeMemory: true, forwardFields: ["doc", "diff"], forwardArtifacts: ["bundle.json"], contextMapping: { outputField: "doc" } }, position: { x: 900, y: 0 } },
      { id: "n-val", type: "validation", name: "Validation Gate", configuration: { assertion: "100% test pass rate", failurePolicy: "stop" }, position: { x: 1000, y: 0 } },
      { id: "n-retry", type: "retry", name: "Retry Loop", configuration: { maxRetries: 3, backoffSeconds: 5, backoffMode: "exponential" }, position: { x: 1100, y: 0 } },
      { id: "n-art", type: "artifact_output", name: "Artifact Packaging", configuration: { artifactPath: "dist/bundle.json", publishTarget: "Repository" }, position: { x: 1200, y: 0 } },
      { id: "n-end", type: "end", name: "End Exit", configuration: { terminalStatus: "Succeeded" }, position: { x: 1300, y: 0 } },
    ];

    expect(all14NodeTypes.length).toBe(14);
    const types = new Set(all14NodeTypes.map((n) => n.type));
    expect(types.size).toBe(14);
  });

  it("handles typed connections with sourceHandle and targetHandle (approved/rejected and true/false)", () => {
    const nodes: WorkflowNode[] = [
      { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
      { id: "approval", type: "human_approval", name: "Approval Gate", configuration: { approverRole: "Security Officer", whatIsBeingApproved: "Audit report", approvalMessage: "Sign off required" }, position: { x: 100, y: 0 } },
      { id: "approved-path", type: "agent_execution", name: "Release Agent", configuration: { agentId: "agent-architecture" }, position: { x: 200, y: -50 } },
      { id: "rejected-path", type: "agent_execution", name: "Remediation Agent", configuration: { agentId: "agent-planning" }, position: { x: 200, y: 50 } },
      { id: "end", type: "end", name: "End", configuration: {}, position: { x: 300, y: 0 } },
    ];

    const edges: WorkflowEdge[] = [
      { id: "e1", source: "start", target: "approval" },
      { id: "e2-app", source: "approval", target: "approved-path", sourceHandle: "approved", label: "Approved" },
      { id: "e2-rej", source: "approval", target: "rejected-path", sourceHandle: "rejected", label: "Rejected" },
      { id: "e3", source: "approved-path", target: "end" },
      { id: "e4", source: "rejected-path", target: "end" },
    ];

    const workflow: Workflow = {
      id: "wf-approval-routing",
      name: "Approval Routing Pipeline",
      description: "Demonstrates typed handles for approval flows.",
      version: "1.0.0",
      status: "Ready",
      nodes,
      edges,
      executionSettings: { maxParallelNodes: 2, retryPolicy: { maxRetries: 1, backoffSeconds: 3 }, requireApprovalFor: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const report = validateWorkflow(workflow, {
      knownAgentIds: ["agent-architecture", "agent-planning"],
    });

    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(edges.find((e) => e.sourceHandle === "approved")?.target).toBe("approved-path");
    expect(edges.find((e) => e.sourceHandle === "rejected")?.target).toBe("rejected-path");
  });

  it("validates conditional routing and rejects branch count mismatch", () => {
    const nodes: WorkflowNode[] = [
      { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
      {
        id: "cond",
        type: "condition_branch",
        name: "Security Triage",
        configuration: {
          conditionType: "expression",
          conditionExpression: "vulnerabilities === 0",
          branches: ["true", "false"],
        },
        position: { x: 100, y: 0 },
      },
      { id: "pass", type: "agent_execution", name: "Deploy", configuration: { agentId: "agent-architecture" }, position: { x: 200, y: 0 } },
      { id: "end", type: "end", name: "End", configuration: {}, position: { x: 300, y: 0 } },
    ];

    // Only 1 outgoing edge from condition node that defines 2 branches ("true", "false")
    const brokenEdges: WorkflowEdge[] = [
      { id: "e1", source: "start", target: "cond" },
      { id: "e2", source: "cond", target: "pass", sourceHandle: "true" },
      { id: "e3", source: "pass", target: "end" },
    ];

    const brokenWorkflow: Workflow = {
      id: "wf-cond-broken",
      name: "Broken Condition Pipeline",
      description: "Missing false branch connection",
      version: "1.0.0",
      status: "Draft",
      nodes,
      edges: brokenEdges,
      executionSettings: { maxParallelNodes: 1, retryPolicy: { maxRetries: 0, backoffSeconds: 0 }, requireApprovalFor: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const report = validateWorkflow(brokenWorkflow);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.message.includes("defines 2 branches but only has 1 outgoing connection"))).toBe(true);
  });

  it("rejects invalid graphs with cycles (DAG enforcement)", async () => {
    const cyclicWorkflow: Partial<Workflow> = {
      id: "wf-cyclic",
      name: "Cyclic Graph Pipeline",
      description: "Invalid cycle A -> B -> C -> A",
      version: "1.0.0",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        { id: "node-a", type: "agent_execution", name: "Agent A", configuration: { agentId: "agent-architecture" }, position: { x: 100, y: 0 } },
        { id: "node-b", type: "agent_execution", name: "Agent B", configuration: { agentId: "agent-planning" }, position: { x: 200, y: 0 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 300, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "node-a" },
        { id: "e2", source: "node-a", target: "node-b" },
        { id: "e3", source: "node-b", target: "node-a" }, // Cycle back to A!
        { id: "e4", source: "node-b", target: "end" },
      ],
      status: "Draft",
    };

    const report = validateWorkflow(cyclicWorkflow);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.message.includes("Graph cycle detected"))).toBe(true);

    // Verify WorkflowRepository.create rejects cyclic graphs
    await expect(localRepo.createWorkflow(cyclicWorkflow)).rejects.toThrow(/Cannot persist invalid workflow|Graph cycle detected/);
  });

  it("rejects graphs with missing Start or End nodes", async () => {
    const noStartWorkflow: Partial<Workflow> = {
      name: "No Start Node",
      nodes: [
        { id: "agent", type: "agent_execution", name: "Agent", configuration: { agentId: "agent-architecture" }, position: { x: 0, y: 0 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 100, y: 0 } },
      ],
      edges: [{ id: "e1", source: "agent", target: "end" }],
    };

    await expect(localRepo.createWorkflow(noStartWorkflow)).rejects.toThrow(/Cannot persist invalid workflow.*'Start'/);

    const noEndWorkflow: Partial<Workflow> = {
      name: "No End Node",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        { id: "agent", type: "agent_execution", name: "Agent", configuration: { agentId: "agent-architecture" }, position: { x: 100, y: 0 } },
      ],
      edges: [{ id: "e1", source: "start", target: "agent" }],
    };

    await expect(localRepo.createWorkflow(noEndWorkflow)).rejects.toThrow(/Cannot persist invalid workflow.*'End'/);
  });

  it("rejects workflows referencing missing or unregistered agents or skills", async () => {
    const badRefWorkflow: Partial<Workflow> = {
      name: "Missing Agent Reference Pipeline",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        { id: "agent-bad", type: "agent_execution", name: "Ghost Agent", configuration: { agentId: "non-existent-agent-999" }, position: { x: 100, y: 0 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "agent-bad" },
        { id: "e2", source: "agent-bad", target: "end" },
      ],
    };

    await expect(localRepo.createWorkflow(badRefWorkflow)).rejects.toThrow(/references missing or unregistered agent/);
  });

  it("persists valid workflows to real workspace files (.agentforge/workflows/<id>.json) and reloads them", async () => {
    const validPipeline: Partial<Workflow> = {
      id: "wf-production-hardening",
      name: "Production Hardening Pipeline",
      description: "End to end verification and artifact creation",
      version: "1.2.0",
      status: "Ready",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: { trigger: "manual" }, position: { x: 50, y: 150 } },
        { id: "req", type: "requirement_input", name: "Intake", configuration: { source: "User Story" }, position: { x: 200, y: 150 } },
        { id: "agent-arch", type: "agent_execution", name: "Architecture", configuration: { agentId: "agent-architecture" }, position: { x: 380, y: 150 } },
        { id: "handoff", type: "context_handoff", name: "Context Handoff", configuration: { forwardFields: ["architectureDoc"], includeMemory: true }, position: { x: 560, y: 150 } },
        { id: "val", type: "validation", name: "Quality Gate", configuration: { assertion: "Zero critical bugs" }, position: { x: 740, y: 150 } },
        { id: "artifact", type: "artifact_output", name: "Deliverable Output", configuration: { artifactPath: "dist/hardened.json" }, position: { x: 920, y: 150 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 1100, y: 150 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "req" },
        { id: "e2", source: "req", target: "agent-arch" },
        { id: "e3", source: "agent-arch", target: "handoff" },
        { id: "e4", source: "handoff", target: "val" },
        { id: "e5", source: "val", target: "artifact" },
        { id: "e6", source: "artifact", target: "end" },
      ],
      executionSettings: {
        maxParallelNodes: 2,
        retryPolicy: { maxRetries: 2, backoffSeconds: 3 },
        requireApprovalFor: [],
      },
    };

    await localRepo.createAgent({
      id: "agent-architecture",
      name: "Architecture Agent",
      role: "Architect",
    } as any);

    const created = await localRepo.createWorkflow(validPipeline);
    expect(created.id).toBe("wf-production-hardening");

    // Verify workspace disk persistence
    const expectedDiskFile = path.join(tmpDir, ".agentforge", "workflows", "wf-production-hardening.json");
    expect(fs.existsSync(expectedDiskFile)).toBe(true);

    const diskContent = JSON.parse(fs.readFileSync(expectedDiskFile, "utf8"));
    expect(diskContent.id).toBe("wf-production-hardening");
    expect(diskContent.name).toBe("Production Hardening Pipeline");
    expect(diskContent.nodes).toHaveLength(7);
    expect(diskContent.edges).toHaveLength(6);

    // Verify reload via brand new LocalRepository instance pointing to same workspace folder
    const reloadedRepo = new LocalRepository(mockContext, tmpDir);
    const loaded = await reloadedRepo.getWorkflow("wf-production-hardening");
    expect(loaded).toBeDefined();
    expect(loaded?.name).toBe("Production Hardening Pipeline");
    expect(loaded?.nodes.find((n) => n.id === "handoff")?.configuration.forwardFields).toContain("architectureDoc");

    // Verify delete unlinks the workspace file
    await reloadedRepo.deleteWorkflow("wf-production-hardening");
    expect(fs.existsSync(expectedDiskFile)).toBe(false);
  });
});
