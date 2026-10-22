import { describe, it, expect, beforeEach } from "vitest";
import { LocalSimulationEngine, ExecutionStorage } from "../src/executions/LocalSimulationEngine";
import { sampleWorkflows } from "../src/storage/sampleData";
import { Workflow, WorkflowNode } from "../src/domain/workflows/types";
import { ExecutionRecord } from "../src/domain/executions/types";

describe("LocalSimulationEngine", () => {
  let memoryRecords: ExecutionRecord[];
  let storage: ExecutionStorage;
  let engine: LocalSimulationEngine;
  const enterpriseWf = sampleWorkflows.find((w) => w.id === "wf-feature-delivery")!;

  beforeEach(() => {
    memoryRecords = [];
    storage = {
      saveExecution: async (rec) => {
        const idx = memoryRecords.findIndex((r) => r.id === rec.id);
        if (idx >= 0) memoryRecords[idx] = { ...rec };
        else memoryRecords.push({ ...rec });
        return rec;
      },
      getExecution: async (id) => memoryRecords.find((r) => r.id === id),
      listExecutions: async () => [...memoryRecords],
    };
    engine = new LocalSimulationEngine({
      storage,
      timeProvider: () => "2026-10-19T12:00:00.000Z",
    });
  });

  it("blocks and fails execution when workflow fails validation", async () => {
    const invalidWf: Workflow = {
      ...enterpriseWf,
      id: "wf-invalid",
      nodes: [
        { id: "node-1", type: "agent_execution", name: "Solo Agent", configuration: {}, position: { x: 0, y: 0 } },
      ], // Missing start and end nodes
      edges: [],
    };

    const record = await engine.startExecution(invalidWf);
    expect(record.status).toBe("Failed");
    expect(record.error).toContain("Workflow validation failed");
    expect(record.nodeExecutions.length).toBe(0);

    // Persisted
    const stored = await storage.getExecution(record.id);
    expect(stored?.status).toBe("Failed");
  });

  it("pauses simulation at Human Plan Approval gate with Waiting for Approval status", async () => {
    const record = await engine.startExecution(enterpriseWf);

    expect(record.status).toBe("Waiting for Approval");
    expect(record.currentWaitingNodeId).toBe("node-approval");
    expect(record.isSimulated).toBe(true);

    // Nodes before approval should have executed in topological dependency order
    const nodeIds = record.nodeExecutions.map((ne) => ne.nodeId);
    expect(nodeIds).toContain("node-start");
    expect(nodeIds).toContain("node-req");
    expect(nodeIds).toContain("node-arch");
    expect(nodeIds).toContain("node-plan");
    expect(nodeIds).toContain("node-approval");

    // Start -> Req -> Arch -> Plan order
    const startIdx = nodeIds.indexOf("node-start");
    const reqIdx = nodeIds.indexOf("node-req");
    const archIdx = nodeIds.indexOf("node-arch");
    const planIdx = nodeIds.indexOf("node-plan");
    const appIdx = nodeIds.indexOf("node-approval");

    expect(startIdx).toBeLessThan(reqIdx);
    expect(reqIdx).toBeLessThan(archIdx);
    expect(archIdx).toBeLessThan(planIdx);
    expect(planIdx).toBeLessThan(appIdx);

    const approvalNode = record.nodeExecutions.find((ne) => ne.nodeId === "node-approval");
    expect(approvalNode?.status).toBe("Waiting for Approval");
    expect(approvalNode?.approvalStatus).toBe("pending");

    // Subsequent nodes should not have run yet
    expect(nodeIds).not.toContain("node-impl");
    expect(nodeIds).not.toContain("node-end");
  });

  it("resumes execution when human approval is granted and executes downstream nodes to Succeeded", async () => {
    // 1. Start execution to reach approval gate
    const paused = await engine.startExecution(enterpriseWf);
    expect(paused.status).toBe("Waiting for Approval");

    // 2. Grant approval
    const resumed = await engine.resumeExecution(paused.id, {
      action: "approve",
      approver: "Principal Architect",
      comment: "Architecture specification and delivery plan approved.",
    });

    expect(resumed.status).toBe("Succeeded");
    expect(resumed.currentWaitingNodeId).toBeUndefined();

    const nodeIds = resumed.nodeExecutions.map((ne) => ne.nodeId);
    expect(nodeIds).toContain("node-impl");
    expect(nodeIds).toContain("node-review");
    expect(nodeIds).toContain("node-test");
    expect(nodeIds).toContain("node-summary");
    expect(nodeIds).toContain("node-artifact");
    expect(nodeIds).toContain("node-end");

    // Verify approval node updated
    const appNode = resumed.nodeExecutions.find((ne) => ne.nodeId === "node-approval");
    expect(appNode?.status).toBe("Succeeded");
    expect(appNode?.approvalStatus).toBe("approved");
    expect(appNode?.approvalDecisionBy).toBe("Principal Architect");

    // Verify simulated artifacts produced
    expect(resumed.artifacts).toBeDefined();
    expect(resumed.artifacts!.length).toBeGreaterThanOrEqual(3);
    for (const art of resumed.artifacts!) {
      expect(art.isSimulated).toBe(true);
    }
  });

  it("halts execution when human approval is rejected", async () => {
    const paused = await engine.startExecution(enterpriseWf);

    const rejected = await engine.resumeExecution(paused.id, {
      action: "reject",
      approver: "Security Lead",
      comment: "Insufficient security isolation boundaries.",
    });

    expect(rejected.status).toBe("Failed");
    const appNode = rejected.nodeExecutions.find((ne) => ne.nodeId === "node-approval");
    expect(appNode?.status).toBe("Failed");
    expect(appNode?.approvalStatus).toBe("rejected");
    expect(appNode?.approvalComment).toBe("Insufficient security isolation boundaries.");

    // Downstream nodes did not run
    const nodeIds = rejected.nodeExecutions.map((ne) => ne.nodeId);
    expect(nodeIds).not.toContain("node-impl");
    expect(nodeIds).not.toContain("node-end");
  });

  it("evaluates condition branches deterministically and skips unselected branches", async () => {
    const branchWorkflow: Workflow = {
      id: "wf-branch-test",
      name: "Branching Pipeline",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        {
          id: "decision",
          type: "condition_branch",
          name: "Quality Gate",
          configuration: {
            conditionType: "expression",
            conditionExpression: "coverage >= 80",
            branches: ["pass", "fail"],
          },
          position: { x: 100, y: 0 },
        },
        { id: "node-pass", type: "agent_execution", name: "Deploy Agent", configuration: { agentId: "agent-summary" }, position: { x: 200, y: -50 } },
        { id: "node-fail", type: "agent_execution", name: "Notify Error Agent", configuration: { agentId: "agent-summary" }, position: { x: 200, y: 50 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 300, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "decision" },
        { id: "e2", source: "decision", target: "node-pass", label: "pass" },
        { id: "e3", source: "decision", target: "node-fail", label: "fail" },
        { id: "e4", source: "node-pass", target: "end" },
        { id: "e5", source: "node-fail", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 2, retryPolicy: { maxRetries: 0, backoffSeconds: 0 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const record = await engine.startExecution(branchWorkflow);
    expect(record.status).toBe("Succeeded");

    const passNode = record.nodeExecutions.find((ne) => ne.nodeId === "node-pass");
    const failNode = record.nodeExecutions.find((ne) => ne.nodeId === "node-fail");

    expect(passNode?.status).toBe("Succeeded");
    expect(failNode?.status).toBe("Skipped");
  });

  it("handles node failure and records error details", async () => {
    const failureWorkflow: Workflow = {
      id: "wf-fail-test",
      name: "Failing Pipeline",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        {
          id: "flaky-agent",
          type: "agent_execution",
          name: "Faulty Agent",
          configuration: {
            agentId: "agent-arch",
            shouldFail: true,
            failureMessage: "Simulated out of memory exception.",
          },
          position: { x: 100, y: 0 },
        },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "flaky-agent" },
        { id: "e2", source: "flaky-agent", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 2, retryPolicy: { maxRetries: 0, backoffSeconds: 0 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const record = await engine.startExecution(failureWorkflow);
    expect(record.status).toBe("Failed");
    expect(record.error).toContain("Simulated out of memory exception.");

    const faultyNode = record.nodeExecutions.find((ne) => ne.nodeId === "flaky-agent");
    expect(faultyNode?.status).toBe("Failed");
    expect(faultyNode?.error).toBe("Simulated out of memory exception.");
  });

  it("supports retries on configured retry policy", async () => {
    const retryWorkflow: Workflow = {
      id: "wf-retry-test",
      name: "Retry Pipeline",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        {
          id: "retry-node",
          type: "agent_execution",
          name: "Recovering Agent",
          configuration: {
            agentId: "agent-arch",
            shouldFail: true,
            retrySucceeds: true, // Configured to recover on retry
          },
          retryPolicy: {
            enabled: true,
            maxRetries: 2,
            backoffSeconds: 3,
          },
          position: { x: 100, y: 0 },
        },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "retry-node" },
        { id: "e2", source: "retry-node", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 2, retryPolicy: { maxRetries: 2, backoffSeconds: 3 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const record = await engine.startExecution(retryWorkflow);
    expect(record.status).toBe("Succeeded");

    const recovered = record.nodeExecutions.find((ne) => ne.nodeId === "retry-node");
    expect(recovered?.status).toBe("Succeeded");
    expect(recovered?.retryCount).toBe(2);
    expect(recovered?.summary).toContain("retry attempt(s)");
  });

  it("cancels an active simulation upon request", async () => {
    const paused = await engine.startExecution(enterpriseWf);
    expect(paused.status).toBe("Waiting for Approval");

    const cancelled = await engine.cancelExecution(paused.id);
    expect(cancelled.status).toBe("Cancelled");
    expect(cancelled.finalSummary).toContain("cancelled by user request");

    const approvalNode = cancelled.nodeExecutions.find((ne) => ne.nodeId === "node-approval");
    expect(approvalNode?.status).toBe("Cancelled");
  });
});
