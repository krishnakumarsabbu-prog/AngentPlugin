import { describe, it, expect, beforeEach } from "vitest";
import { LocalSimulationEngine, ExecutionStorage } from "../src/executions/LocalSimulationEngine";
import { Workflow, WorkflowNode, WorkflowEdge } from "../src/domain/workflows/types";
import { ExecutionRecord } from "../src/domain/executions/types";

describe("Deterministic Execution Engine - Dependency Order, Branching, Parallel, Recovery", () => {
  let memoryRecords: ExecutionRecord[];
  let storage: ExecutionStorage;
  let engine: LocalSimulationEngine;

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
      timeProvider: () => "2026-10-19T14:00:00.000Z",
    });
  });

  it("produces repeatable and deterministic test runs given identical inputs", async () => {
    const pipeline: Workflow = {
      id: "wf-deterministic-repeatable",
      name: "Repeatable Test Pipeline",
      description: "Demonstrates deterministic reproduction of outputs",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: { trigger: "manual" }, position: { x: 0, y: 0 } },
        { id: "intake", type: "requirement_input", name: "Intake", configuration: { source: "User Story" }, position: { x: 100, y: 0 } },
        { id: "arch", type: "agent_execution", name: "Architecture", configuration: { agentId: "agent-architecture" }, position: { x: 200, y: 0 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 300, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "intake" },
        { id: "e2", source: "intake", target: "arch" },
        { id: "e3", source: "arch", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 2, retryPolicy: { maxRetries: 1, backoffSeconds: 2 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const run1 = await engine.startExecution(pipeline, { initialInputs: { reqId: "R-100" } });
    const run2 = await engine.startExecution(pipeline, { initialInputs: { reqId: "R-100" } });

    expect(run1.status).toBe("Succeeded");
    expect(run2.status).toBe("Succeeded");
    expect(run1.nodeExecutions).toHaveLength(4);
    expect(run2.nodeExecutions).toHaveLength(4);

    for (let i = 0; i < run1.nodeExecutions.length; i++) {
      const n1 = run1.nodeExecutions[i];
      const n2 = run2.nodeExecutions[i];
      expect(n1.nodeId).toBe(n2.nodeId);
      expect(n1.status).toBe(n2.status);
      expect(n1.outputs).toEqual(n2.outputs);
      expect(n1.summary).toBe(n2.summary);
      expect(n1.durationMs).toBe(n2.durationMs);
    }
  });

  it("handles condition branching with typed handles and skips unselected branches cleanly", async () => {
    const branchWf: Workflow = {
      id: "wf-typed-branch",
      name: "Typed Handle Branching",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        {
          id: "decision",
          type: "condition_branch",
          name: "Vulnerability Gate",
          configuration: {
            conditionType: "expression",
            conditionExpression: "vulnerabilities == 0",
            branches: ["true", "false"],
          },
          position: { x: 100, y: 0 },
        },
        { id: "true-worker", type: "agent_execution", name: "Deploy Worker", configuration: { agentId: "agent-summary" }, position: { x: 200, y: -50 } },
        { id: "false-worker", type: "agent_execution", name: "Alert Worker", configuration: { agentId: "agent-summary" }, position: { x: 200, y: 50 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 300, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "decision" },
        { id: "e-true", source: "decision", target: "true-worker", sourceHandle: "true", label: "True" },
        { id: "e-false", source: "decision", target: "false-worker", sourceHandle: "false", label: "False" },
        { id: "e3", source: "true-worker", target: "end" },
        { id: "e4", source: "false-worker", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 2, retryPolicy: { maxRetries: 0, backoffSeconds: 0 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const run = await engine.startExecution(branchWf);
    expect(run.status).toBe("Succeeded");

    const decisionNode = run.nodeExecutions.find((ne) => ne.nodeId === "decision");
    const trueNode = run.nodeExecutions.find((ne) => ne.nodeId === "true-worker");
    const falseNode = run.nodeExecutions.find((ne) => ne.nodeId === "false-worker");
    const endNode = run.nodeExecutions.find((ne) => ne.nodeId === "end");

    expect(decisionNode?.status).toBe("Succeeded");
    expect(decisionNode?.selectedBranch).toBe("true");
    expect(trueNode?.status).toBe("Succeeded");
    expect(falseNode?.status).toBe("Skipped");
    expect(endNode?.status).toBe("Succeeded");
  });

  it("supports parallel execution and merges concurrent branch outputs", async () => {
    const parallelWf: Workflow = {
      id: "wf-parallel-merge",
      name: "Parallel Fork & Merge Pipeline",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        { id: "parallel-fork", type: "parallel_execution", name: "Parallel Fork", configuration: { maxConcurrency: 2 }, position: { x: 100, y: 0 } },
        { id: "branch-a", type: "agent_execution", name: "Worker A", configuration: { agentId: "agent-architecture" }, position: { x: 200, y: -50 } },
        { id: "branch-b", type: "agent_execution", name: "Worker B", configuration: { agentId: "agent-planning" }, position: { x: 200, y: 50 } },
        { id: "merge", type: "merge_results", name: "Merge Node", configuration: { strategy: "combine_all" }, position: { x: 300, y: 0 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 400, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "parallel-fork" },
        { id: "e2", source: "parallel-fork", target: "branch-a" },
        { id: "e3", source: "parallel-fork", target: "branch-b" },
        { id: "e4", source: "branch-a", target: "merge" },
        { id: "e5", source: "branch-b", target: "merge" },
        { id: "e6", source: "merge", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 2, retryPolicy: { maxRetries: 0, backoffSeconds: 0 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const run = await engine.startExecution(parallelWf);
    expect(run.status).toBe("Succeeded");

    const execA = run.nodeExecutions.find((ne) => ne.nodeId === "branch-a");
    const execB = run.nodeExecutions.find((ne) => ne.nodeId === "branch-b");
    const mergeExec = run.nodeExecutions.find((ne) => ne.nodeId === "merge");

    expect(execA?.status).toBe("Succeeded");
    expect(execB?.status).toBe("Succeeded");
    expect(mergeExec?.status).toBe("Succeeded");
    expect(mergeExec?.outputs?.mergeStatus).toBe("consolidated");
    expect(mergeExec?.outputs?.mergedResults).toBeDefined();
  });

  it("records retry attempt history and recovers on transient error", async () => {
    const retryWf: Workflow = {
      id: "wf-retry-recovery",
      name: "Retry Recovery Pipeline",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        {
          id: "flaky-service",
          type: "agent_execution",
          name: "Flaky Service",
          configuration: {
            agentId: "agent-architecture",
            shouldFail: true,
            retrySucceedsOnAttempt: 2,
          },
          retryPolicy: {
            enabled: true,
            maxRetries: 3,
            backoffSeconds: 2,
          },
          position: { x: 100, y: 0 },
        },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "flaky-service" },
        { id: "e2", source: "flaky-service", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 1, retryPolicy: { maxRetries: 3, backoffSeconds: 2 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const run = await engine.startExecution(retryWf);
    expect(run.status).toBe("Succeeded");

    const flakyExec = run.nodeExecutions.find((ne) => ne.nodeId === "flaky-service");
    expect(flakyExec?.status).toBe("Succeeded");
    expect(flakyExec?.retryCount).toBe(2);
    expect(flakyExec?.retries).toHaveLength(2);
    expect(flakyExec?.retries![0].succeeded).toBe(false);
    expect(flakyExec?.retries![1].succeeded).toBe(true);
  });

  it("handles human approval rejection with fallback routing", async () => {
    const fallbackApprovalWf: Workflow = {
      id: "wf-approval-fallback",
      name: "Approval Fallback Pipeline",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        {
          id: "gate",
          type: "human_approval",
          name: "Plan Sign-off",
          configuration: {
            approverRole: "Security Director",
            whatIsBeingApproved: "Threat model and mitigation plan",
            approvalMessage: "Review threat model",
            onReject: "route_to_fallback",
            fallbackNodeId: "remediation",
          },
          position: { x: 100, y: 0 },
        },
        { id: "deploy", type: "agent_execution", name: "Deploy", configuration: { agentId: "agent-architecture" }, position: { x: 200, y: -50 } },
        { id: "remediation", type: "agent_execution", name: "Security Remediation", configuration: { agentId: "agent-planning" }, position: { x: 200, y: 50 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 300, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "gate" },
        { id: "e2", source: "gate", target: "deploy" },
        { id: "e3", source: "gate", target: "remediation" },
        { id: "e4", source: "deploy", target: "end" },
        { id: "e5", source: "remediation", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 2, retryPolicy: { maxRetries: 0, backoffSeconds: 0 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const paused = await engine.startExecution(fallbackApprovalWf);
    expect(paused.status).toBe("Waiting for Approval");

    // Reject with routing to remediation fallback
    const resumed = await engine.resumeExecution(paused.id, {
      action: "reject",
      approver: "Security Director",
      comment: "Missing OAuth scope restriction. Rerouted to remediation.",
    });

    expect(resumed.status).toBe("Succeeded");
    const gateExec = resumed.nodeExecutions.find((ne) => ne.nodeId === "gate");
    const remExec = resumed.nodeExecutions.find((ne) => ne.nodeId === "remediation");

    expect(gateExec?.approvalStatus).toBe("rejected");
    expect(remExec?.status).toBe("Succeeded");
  });

  it("recovers an interrupted simulation after restart via recoverInterruptedExecution", async () => {
    const multiStageWf: Workflow = {
      id: "wf-multi-stage",
      name: "Multi-Stage Resumable Pipeline",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        { id: "stage-1", type: "agent_execution", name: "Stage 1", configuration: { agentId: "agent-architecture" }, position: { x: 100, y: 0 } },
        {
          id: "approval-gate",
          type: "human_approval",
          name: "Interruption Gate",
          configuration: {
            approverRole: "VP Engineering",
            whatIsBeingApproved: "Architecture release",
            approvalMessage: "Verify before finalization",
          },
          position: { x: 200, y: 0 },
        },
        { id: "stage-2", type: "agent_execution", name: "Stage 2", configuration: { agentId: "agent-planning" }, position: { x: 300, y: 0 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 400, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "stage-1" },
        { id: "e2", source: "stage-1", target: "approval-gate" },
        { id: "e3", source: "approval-gate", target: "stage-2" },
        { id: "e4", source: "stage-2", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 2, retryPolicy: { maxRetries: 0, backoffSeconds: 0 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const paused = await engine.startExecution(multiStageWf);
    expect(paused.status).toBe("Waiting for Approval");

    // Simulate process termination and engine re-instantiation with empty in-memory cache
    const freshEngine = new LocalSimulationEngine({
      storage,
      timeProvider: () => "2026-10-19T14:30:00.000Z",
    });

    // Verify recovery of interrupted execution
    const recovered = await freshEngine.recoverInterruptedExecution(paused.id);
    expect(recovered.status).toBe("Waiting for Approval");
    expect(recovered.currentWaitingNodeId).toBe("approval-gate");

    // Resume execution from recovered state
    const completed = await freshEngine.resumeExecution(paused.id, {
      action: "approve",
      approver: "VP Engineering",
      comment: "Approved after system recovery.",
    });

    expect(completed.status).toBe("Succeeded");
    const stage2 = completed.nodeExecutions.find((ne) => ne.nodeId === "stage-2");
    const end = completed.nodeExecutions.find((ne) => ne.nodeId === "end");
    expect(stage2?.status).toBe("Succeeded");
    expect(end?.status).toBe("Succeeded");
  });

  it("sanitizes secrets from step inputs, outputs, and context handoffs", async () => {
    const sensitiveWf: Workflow = {
      id: "wf-secret-sanitization",
      name: "Secret Sanitization Pipeline",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        {
          id: "worker",
          type: "context_handoff",
          name: "Handoff Worker",
          configuration: { forwardFields: ["token", "apiKey", "publicField"] },
          position: { x: 100, y: 0 },
        },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "worker" },
        { id: "e2", source: "worker", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 1, retryPolicy: { maxRetries: 0, backoffSeconds: 0 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const run = await engine.startExecution(sensitiveWf, {
      initialInputs: {
        apiKey: "sk-1234567890abcdef1234567890",
        authToken: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        publicField: "Hello AgentForge",
      },
    });

    expect(run.status).toBe("Succeeded");
    expect(run.contextData?.apiKey).toBe("[REDACTED_SECRET]");
    expect(run.contextData?.authToken).toBe("[REDACTED_SECRET]");
    expect(run.contextData?.publicField).toBe("Hello AgentForge");

    // Verify handoffs are also scrubbed
    for (const h of run.handoffs || []) {
      const findings = h.priorFindings as Record<string, unknown>;
      if (findings?.apiKey) expect(findings.apiKey).toBe("[REDACTED_SECRET]");
    }
  });

  it("supports cancellation and updates all in-flight nodes to Cancelled", async () => {
    const enterpriseWf: Workflow = {
      id: "wf-to-cancel",
      name: "Cancellable Pipeline",
      version: "1.0.0",
      status: "Active",
      nodes: [
        { id: "start", type: "start", name: "Start", configuration: {}, position: { x: 0, y: 0 } },
        { id: "gate", type: "human_approval", name: "Approval Gate", configuration: { approverRole: "Architect", approvalMessage: "Review", whatIsBeingApproved: "Release Plan" }, position: { x: 100, y: 0 } },
        { id: "end", type: "end", name: "End", configuration: {}, position: { x: 200, y: 0 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "gate" },
        { id: "e2", source: "gate", target: "end" },
      ],
      executionSettings: { maxParallelNodes: 1, retryPolicy: { maxRetries: 0, backoffSeconds: 0 }, requireApprovalFor: [] },
      createdAt: "2026-10-19T10:00:00Z",
      updatedAt: "2026-10-19T10:00:00Z",
    };

    const paused = await engine.startExecution(enterpriseWf);
    expect(paused.status).toBe("Waiting for Approval");

    const cancelled = await engine.cancelExecution(paused.id);
    expect(cancelled.status).toBe("Cancelled");
    expect(cancelled.finalSummary).toContain("cancelled by user");

    const gate = cancelled.nodeExecutions.find((ne) => ne.nodeId === "gate");
    expect(gate?.status).toBe("Cancelled");

    // Test recovering from cancelled state
    const recovered = await engine.recoverInterruptedExecution(cancelled.id);
    expect(recovered.status).toBe("Waiting for Approval");
    const recoveredGate = recovered.nodeExecutions.find((ne) => ne.nodeId === "gate");
    expect(recoveredGate?.status).toBe("Waiting for Approval");

    // Complete the run
    const finished = await engine.resumeExecution(recovered.id, {
      action: "approve",
      approver: "Architect",
      comment: "Approved after un-cancelling.",
    });
    expect(finished.status).toBe("Succeeded");
  });
});
