import { describe, it, expect } from "vitest";
import { validateWorkflow, validateNodeConfiguration } from "../src/workflows/WorkflowValidator";
import { sampleWorkflows } from "../src/storage/sampleData";
import { Workflow, WorkflowNode } from "../src/domain/workflows/types";

describe("WorkflowValidator", () => {
  const enterpriseWorkflow = sampleWorkflows.find((w) => w.id === "wf-feature-delivery")!;

  it("validates enterprise feature delivery as sound and valid", () => {
    const report = validateWorkflow(enterpriseWorkflow);
    expect(report.valid).toBe(true);
    expect(report.errors.length).toBe(0);
  });

  it("flags empty or missing workflow definitions", () => {
    const report = validateWorkflow(undefined);
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.message.includes("missing"))).toBe(true);
  });

  it("requires a non-empty workflow name", () => {
    const report = validateWorkflow({
      ...enterpriseWorkflow,
      name: "   ",
    });
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.message.includes("name is required"))).toBe(true);
  });

  it("requires at least one node on canvas", () => {
    const report = validateWorkflow({
      ...enterpriseWorkflow,
      nodes: [],
      edges: [],
    });
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.message.includes("at least one node"))).toBe(true);
  });

  it("detects missing start entry node", () => {
    const report = validateWorkflow({
      ...enterpriseWorkflow,
      nodes: enterpriseWorkflow.nodes.filter((n) => n.type !== "start" && n.type !== "requirement_input"),
    });
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.message.includes("Start"))).toBe(true);
  });

  it("detects missing end terminal node", () => {
    const report = validateWorkflow({
      ...enterpriseWorkflow,
      nodes: enterpriseWorkflow.nodes.filter((n) => n.type !== "end" && n.type !== "artifact_output"),
    });
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.message.includes("End"))).toBe(true);
  });

  it("detects duplicate node IDs", () => {
    const dupNodes = [
      ...enterpriseWorkflow.nodes,
      {
        id: "node-arch",
        type: "agent_execution" as const,
        name: "Duplicate Arch",
        configuration: { agentId: "agent-architecture" },
        position: { x: 0, y: 0 },
      },
    ];
    const report = validateWorkflow({
      ...enterpriseWorkflow,
      nodes: dupNodes,
    });
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.message.includes("Duplicate node ID"))).toBe(true);
  });

  it("detects edges pointing to non-existent nodes", () => {
    const badEdges = [
      ...enterpriseWorkflow.edges,
      {
        id: "bad-edge",
        source: "node-start",
        target: "ghost-node-404",
      },
    ];
    const report = validateWorkflow({
      ...enterpriseWorkflow,
      edges: badEdges,
    });
    expect(report.valid).toBe(false);
    expect(report.errors.some((e) => e.message.includes("ghost-node-404"))).toBe(true);
  });

  it("warns about disconnected nodes in multi-node workflows", () => {
    const disconnectedNodes = [
      ...enterpriseWorkflow.nodes,
      {
        id: "floating-node",
        type: "agent_execution" as const,
        name: "Floating Agent",
        configuration: { agentId: "agent-architecture" },
        position: { x: 500, y: 500 },
      },
    ];
    const report = validateWorkflow({
      ...enterpriseWorkflow,
      nodes: disconnectedNodes,
    });
    expect(report.warnings.some((w) => w.nodeId === "floating-node")).toBe(true);
  });

  describe("validateNodeConfiguration", () => {
    it("validates Agent Execution node requires agentId", () => {
      const badNode: WorkflowNode = {
        id: "test-agent-node",
        type: "agent_execution",
        name: "Agent Node",
        configuration: { agentId: "" },
        position: { x: 0, y: 0 },
      };
      const result = validateNodeConfiguration(badNode);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("selected Agent ID"))).toBe(true);

      badNode.configuration.agentId = "agent-architecture";
      const validResult = validateNodeConfiguration(badNode);
      expect(validResult.valid).toBe(true);
    });

    it("validates Skill Invocation node requires skillId", () => {
      const badNode: WorkflowNode = {
        id: "test-skill-node",
        type: "skill_invocation",
        name: "Skill Node",
        configuration: { skillId: "" },
        position: { x: 0, y: 0 },
      };
      const result = validateNodeConfiguration(badNode);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("selected Skill ID"))).toBe(true);
    });

    it("validates Human Approval node requires approver role, message, and what is approved", () => {
      const badNode: WorkflowNode = {
        id: "test-approval-node",
        type: "human_approval",
        name: "Approval Node",
        configuration: {
          approverRole: "",
          approvalMessage: "",
          whatIsBeingApproved: "",
        },
        position: { x: 0, y: 0 },
      };
      const result = validateNodeConfiguration(badNode);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);

      badNode.configuration = {
        approverRole: "Tech Lead",
        approvalMessage: "Please verify design",
        whatIsBeingApproved: "Design Doc",
      };
      const validResult = validateNodeConfiguration(badNode);
      expect(validResult.valid).toBe(true);
    });

    it("validates Condition node requires valid condition type and at least 2 branches", () => {
      const badNode: WorkflowNode = {
        id: "test-cond-node",
        type: "condition_branch",
        name: "Condition Node",
        configuration: {
          conditionType: "unknown_type",
          conditionExpression: "",
          branches: ["single_branch"],
        },
        position: { x: 0, y: 0 },
      };
      const result = validateNodeConfiguration(badNode);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("unsupported condition type"))).toBe(true);
      expect(result.errors.some((e) => e.message.includes("requires a condition expression"))).toBe(true);
      expect(result.errors.some((e) => e.message.includes("at least two valid branch outputs"))).toBe(true);
    });

    it("validates Context Handoff warns when no fields/artifacts/memory are forwarded", () => {
      const emptyHandoff: WorkflowNode = {
        id: "test-handoff-node",
        type: "context_handoff",
        name: "Handoff Node",
        configuration: {
          includeMemory: false,
          forwardFields: [],
          forwardArtifacts: [],
        },
        position: { x: 0, y: 0 },
      };
      const result = validateNodeConfiguration(emptyHandoff);
      expect(result.warnings.some((w) => w.message.includes("does not forward any fields"))).toBe(true);
    });

    it("validates timeout and retry policies", () => {
      const badPolicyNode: WorkflowNode = {
        id: "test-policy-node",
        type: "start",
        name: "Start Node",
        configuration: {},
        timeoutSeconds: -5,
        retryPolicy: {
          enabled: true,
          maxRetries: -1,
          backoffSeconds: -2,
        },
        position: { x: 0, y: 0 },
      };
      const result = validateNodeConfiguration(badPolicyNode);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("timeout must be a positive number"))).toBe(true);
      expect(result.errors.some((e) => e.message.includes("max retries cannot be negative"))).toBe(true);
      expect(result.errors.some((e) => e.message.includes("retry backoff cannot be negative"))).toBe(true);
    });

    it("validates contracts schema and example payload JSON", () => {
      const badContractNode: WorkflowNode = {
        id: "test-contract-node",
        type: "agent_execution",
        name: "Contract Node",
        configuration: { agentId: "agent-architecture" },
        inputContract: {
          schema: "invalid_string_schema" as unknown as Record<string, unknown>,
          examplePayload: "{ invalid-json: ",
        },
        outputContract: {
          examplePayload: "{ broken-json }",
        },
        position: { x: 0, y: 0 },
      };
      const result = validateNodeConfiguration(badContractNode);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("schema must be a valid schema object"))).toBe(true);
      expect(result.errors.some((e) => e.message.includes("input contract example payload is not valid JSON"))).toBe(true);
      expect(result.errors.some((e) => e.message.includes("output contract example payload is not valid JSON"))).toBe(true);
    });

    it("detects unsupported node types", () => {
      const badTypeNode: WorkflowNode = {
        id: "test-unknown-type",
        type: "quantum_teleportation_node" as unknown as WorkflowNode["type"],
        name: "Teleport Node",
        configuration: {},
        position: { x: 0, y: 0 },
      };
      const result = validateNodeConfiguration(badTypeNode);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("Unsupported node type"))).toBe(true);
    });
  });

  describe("Graph Topology & Advanced Rules", () => {
    it("detects graph cycles where cycles are unsupported", () => {
      const cyclicNodes: WorkflowNode[] = [
        { id: "n-start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        { id: "n-a", type: "agent_execution", name: "Agent A", configuration: { agentId: "agent-arch" }, position: { x: 100, y: 0 } },
        { id: "n-b", type: "agent_execution", name: "Agent B", configuration: { agentId: "agent-plan" }, position: { x: 200, y: 0 } },
        { id: "n-end", type: "end", name: "End", configuration: {}, position: { x: 300, y: 0 } },
      ];
      const cyclicEdges = [
        { id: "e1", source: "n-start", target: "n-a" },
        { id: "e2", source: "n-a", target: "n-b" },
        { id: "e3", source: "n-b", target: "n-a" }, // Cycle: n-a -> n-b -> n-a
        { id: "e4", source: "n-b", target: "n-end" },
      ];

      const report = validateWorkflow({
        id: "wf-cyclic",
        name: "Cyclic Workflow",
        nodes: cyclicNodes,
        edges: cyclicEdges,
      });

      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.message.includes("Graph cycle detected"))).toBe(true);
    });

    it("detects unreachable nodes from start", () => {
      const disconnectedGraph: WorkflowNode[] = [
        { id: "n-start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        { id: "n-connected", type: "agent_execution", name: "Connected Agent", configuration: { agentId: "agent-arch" }, position: { x: 100, y: 0 } },
        { id: "n-island", type: "agent_execution", name: "Island Agent", configuration: { agentId: "agent-plan" }, position: { x: 100, y: 200 } },
        { id: "n-island-2", type: "validation", name: "Island Validation", configuration: { assertion: "check" }, position: { x: 200, y: 200 } },
        { id: "n-end", type: "end", name: "End", configuration: {}, position: { x: 300, y: 0 } },
      ];
      const edges = [
        { id: "e1", source: "n-start", target: "n-connected" },
        { id: "e2", source: "n-connected", target: "n-end" },
        { id: "e-island", source: "n-island", target: "n-island-2" }, // Isolated sub-graph
      ];

      const report = validateWorkflow({
        id: "wf-unreachable",
        name: "Unreachable Nodes Test",
        nodes: disconnectedGraph,
        edges,
      });

      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.message.includes("is unreachable from any Start"))).toBe(true);
    });

    it("detects missing agent or skill references when known registries are provided", () => {
      const nodes: WorkflowNode[] = [
        { id: "n-start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        { id: "n-agent", type: "agent_execution", name: "Ghost Agent", configuration: { agentId: "non-existent-agent-id" }, position: { x: 100, y: 0 } },
        { id: "n-skill", type: "skill_invocation", name: "Ghost Skill", configuration: { skillId: "non-existent-skill-id" }, position: { x: 200, y: 0 } },
        { id: "n-end", type: "end", name: "End", configuration: {}, position: { x: 300, y: 0 } },
      ];
      const edges = [
        { id: "e1", source: "n-start", target: "n-agent" },
        { id: "e2", source: "n-agent", target: "n-skill" },
        { id: "e3", source: "n-skill", target: "n-end" },
      ];

      const report = validateWorkflow(
        {
          id: "wf-missing-refs",
          name: "Missing References Test",
          nodes,
          edges,
        },
        {
          knownAgentIds: new Set(["agent-architecture", "agent-planning"]),
          knownSkillIds: new Set(["skill-code-review"]),
        }
      );

      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.message.includes("references missing or unregistered agent"))).toBe(true);
      expect(report.errors.some((e) => e.message.includes("references missing or unregistered skill"))).toBe(true);
    });

    it("detects condition nodes missing branch outgoing connections", () => {
      const nodes: WorkflowNode[] = [
        { id: "n-start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        {
          id: "n-cond",
          type: "condition_branch",
          name: "Decision Node",
          configuration: {
            conditionType: "expression",
            conditionExpression: "coverage > 80",
            branches: ["pass", "fail"],
          },
          position: { x: 100, y: 0 },
        },
        { id: "n-end", type: "end", name: "End", configuration: {}, position: { x: 200, y: 0 } },
      ];
      // Only 1 outgoing edge for 2 defined branches
      const edges = [
        { id: "e1", source: "n-start", target: "n-cond" },
        { id: "e2", source: "n-cond", target: "n-end" },
      ];

      const report = validateWorkflow({
        id: "wf-broken-branches",
        name: "Broken Branches Test",
        nodes,
        edges,
      });

      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.message.includes("defines 2 branches but only has 1 outgoing"))).toBe(true);
    });

    it("detects unsupported schema versions", () => {
      const report = validateWorkflow({
        ...enterpriseWorkflow,
        schemaVersion: "9.0.0",
      });

      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.message.includes("Unsupported schema version"))).toBe(true);
    });
  });
});
