import { describe, it, expect } from "vitest";
import {
  compareWorkflows,
  compareExecutions,
  filterExecutions,
  sortExecutions,
} from "../src/workflows/WorkflowComparison";
import { sampleWorkflows, sampleExecutionRecords } from "../src/storage/sampleData";
import { Workflow, WorkflowNode } from "../src/domain/workflows/types";
import { ExecutionRecord, NodeExecution } from "../src/domain/executions/types";

describe("Workflow Diff & Comparison Logic", () => {
  const baseWorkflow: Workflow = {
    id: "wf-test-1",
    name: "Base Test Workflow",
    description: "A test workflow for diffing",
    version: "1.0.0",
    status: "Active",
    createdAt: "2026-10-18T10:00:00.000Z",
    updatedAt: "2026-10-18T10:00:00.000Z",
    nodes: [
      {
        id: "start-1",
        name: "Start",
        type: "start",
        position: { x: 0, y: 0 },
        configuration: {},
      },
      {
        id: "step-1",
        name: "Architect Agent",
        type: "agent_execution",
        position: { x: 100, y: 0 },
        configuration: {
          agentId: "agent-architecture",
          timeoutSeconds: 300,
        },
        inputs: {
          properties: {
            specs: { type: "string" },
          },
        },
        outputs: {
          properties: {
            blueprint: { type: "object" },
          },
        },
      },
      {
        id: "end-1",
        name: "End",
        type: "end",
        position: { x: 200, y: 0 },
        configuration: {},
      },
    ],
    edges: [
      { id: "e1", source: "start-1", target: "step-1" },
      { id: "e2", source: "step-1", target: "end-1" },
    ],
  };

  it("detects node additions, removals, and unchanged nodes", () => {
    const modifiedWorkflow: Workflow = {
      ...baseWorkflow,
      version: "1.1.0",
      nodes: [
        // start-1 kept unchanged
        baseWorkflow.nodes[0],
        // step-1 removed
        // new step-2 added
        {
          id: "step-2",
          name: "Security Review Agent",
          type: "agent_execution",
          position: { x: 150, y: 0 },
          configuration: {
            agentId: "agent-security",
          },
        },
        // end-1 kept unchanged
        baseWorkflow.nodes[2],
      ],
      edges: [
        { id: "e1-new", source: "start-1", target: "step-2" },
        { id: "e2-new", source: "step-2", target: "end-1" },
      ],
    };

    const diff = compareWorkflows(baseWorkflow, modifiedWorkflow);
    expect(diff.sourceType).toBe("workflow");
    expect(diff.summary.addedNodesCount).toBe(1);
    expect(diff.summary.removedNodesCount).toBe(1);
    expect(diff.summary.unchangedNodesCount).toBe(2);

    const step1Diff = diff.nodeDiffs.find((n) => n.nodeId === "step-1");
    expect(step1Diff).toBeDefined();
    expect(step1Diff?.status).toBe("removed");

    const step2Diff = diff.nodeDiffs.find((n) => n.nodeId === "step-2");
    expect(step2Diff).toBeDefined();
    expect(step2Diff?.status).toBe("added");
  });

  it("detects edge additions, removals, and label modifications", () => {
    const modifiedWorkflow: Workflow = {
      ...baseWorkflow,
      edges: [
        // e1 modified with label
        { id: "e1", source: "start-1", target: "step-1", label: "Initial Handoff" },
        // e2 removed
        // e3 added
        { id: "e3", source: "step-1", target: "end-1" },
      ],
    };

    const diff = compareWorkflows(baseWorkflow, modifiedWorkflow);
    expect(diff.summary.addedEdgesCount).toBe(1);
    expect(diff.summary.removedEdgesCount).toBe(1);
    expect(diff.summary.modifiedEdgesCount).toBe(1);

    const e1Diff = diff.edgeDiffs.find((e) => e.edgeId === "e1");
    expect(e1Diff?.status).toBe("modified");
    expect(e1Diff?.labelChange?.after).toBe("Initial Handoff");
  });

  it("detects agent, skill, configuration, and contract field changes on existing nodes", () => {
    const modifiedWorkflow: Workflow = {
      ...baseWorkflow,
      nodes: [
        baseWorkflow.nodes[0],
        {
          ...baseWorkflow.nodes[1],
          configuration: {
            agentId: "agent-code-reviewer", // agent changed
            skillId: "skill-static-analysis", // skill assigned
            timeoutSeconds: 600, // config changed
            maxRetries: 3, // config added
          },
          inputs: {
            properties: {
              specs: { type: "string" },
              strictMode: { type: "boolean" }, // input added
            },
          },
          outputs: {
            properties: {
              // blueprint removed
              reviewScore: { type: "number" }, // output added
            },
          },
        },
        baseWorkflow.nodes[2],
      ],
    };

    const diff = compareWorkflows(baseWorkflow, modifiedWorkflow);
    const stepDiff = diff.nodeDiffs.find((n) => n.nodeId === "step-1");
    expect(stepDiff).toBeDefined();
    expect(stepDiff?.status).toBe("modified");

    // Agent assignment change
    expect(stepDiff?.agentChange).toEqual({
      before: "agent-architecture",
      after: "agent-code-reviewer",
    });

    // Skill assignment change
    expect(stepDiff?.skillChange).toEqual({
      before: undefined,
      after: "skill-static-analysis",
    });

    // Config changes
    const timeoutChange = stepDiff?.configChanges.find((c) => c.field === "timeoutSeconds");
    expect(timeoutChange).toBeDefined();
    expect(timeoutChange?.before).toBe(300);
    expect(timeoutChange?.after).toBe(600);

    const retriesChange = stepDiff?.configChanges.find((c) => c.field === "maxRetries");
    expect(retriesChange?.after).toBe(3);

    // Contract changes
    const inputAdded = stepDiff?.contractChanges.find(
      (c) => c.contract === "input" && c.field === "strictMode"
    );
    expect(inputAdded).toBeDefined();

    const outputRemoved = stepDiff?.contractChanges.find(
      (c) => c.contract === "output" && c.field === "blueprint"
    );
    expect(outputRemoved).toBeDefined();
  });
});

describe("Execution Comparison Logic", () => {
  const execA: ExecutionRecord = {
    id: "run-alpha",
    workflowId: "wf-1",
    workflowName: "Enterprise Delivery",
    workflowVersion: "1.0.0",
    status: "Succeeded",
    triggerType: "Manual",
    startedAt: "2026-10-18T10:00:00.000Z",
    completedAt: "2026-10-18T10:00:05.000Z",
    durationMs: 5000,
    totalSteps: 2,
    failedSteps: 0,
    finalSummary: "Pipeline executed successfully with 0 defects.",
    nodeExecutions: [
      {
        nodeId: "node-1",
        nodeName: "Intake",
        nodeType: "requirement_input",
        status: "Succeeded",
        startedAt: "2026-10-18T10:00:00.000Z",
        completedAt: "2026-10-18T10:00:02.000Z",
        durationMs: 2000,
        validationPassed: true,
      },
      {
        nodeId: "node-2",
        nodeName: "Code Review",
        nodeType: "agent_execution",
        status: "Succeeded",
        startedAt: "2026-10-18T10:00:02.000Z",
        completedAt: "2026-10-18T10:00:05.000Z",
        durationMs: 3000,
        validationPassed: true,
      },
    ],
  };

  const execB: ExecutionRecord = {
    id: "run-beta",
    workflowId: "wf-1",
    workflowName: "Enterprise Delivery",
    workflowVersion: "1.0.0",
    status: "Failed",
    triggerType: "Webhook",
    startedAt: "2026-10-18T11:00:00.000Z",
    completedAt: "2026-10-18T11:00:08.500Z",
    durationMs: 8500,
    totalSteps: 2,
    failedSteps: 1,
    finalSummary: "Pipeline failed at node-2: Lint violation threshold exceeded.",
    nodeExecutions: [
      {
        nodeId: "node-1",
        nodeName: "Intake",
        nodeType: "requirement_input",
        status: "Succeeded",
        startedAt: "2026-10-18T11:00:00.000Z",
        completedAt: "2026-10-18T11:00:02.500Z",
        durationMs: 2500,
        validationPassed: true,
      },
      {
        nodeId: "node-2",
        nodeName: "Code Review",
        nodeType: "agent_execution",
        status: "Failed",
        startedAt: "2026-10-18T11:00:02.500Z",
        completedAt: "2026-10-18T11:00:08.500Z",
        durationMs: 6000,
        validationPassed: false,
        validationMessage: "3 critical security violations detected",
        error: "Lint violation threshold exceeded",
        retries: [
          { attempt: 1, error: "Network timeout contacting linter", timestamp: "2026-10-18T11:00:04.000Z" },
        ],
      },
    ],
  };

  it("calculates execution duration delta, status changes, and failure points", () => {
    const diff = compareExecutions(execA, execB);
    expect(diff.sourceType).toBe("execution");
    expect(diff.summary.statusChanged).toBe(true);
    expect(diff.summary.durationDeltaMs).toBe(3500); // 8500 - 5000

    expect(diff.summary.failurePointsA).toEqual([]);
    expect(diff.summary.failurePointsB).toEqual(["node-2"]);

    expect(diff.targetA.finalSummary).toContain("0 defects");
    expect(diff.targetB.finalSummary).toContain("failed at node-2");

    const node2Diff = diff.nodeDiffs.find((n) => n.nodeId === "node-2");
    expect(node2Diff).toBeDefined();
    expect(node2Diff?.status).toBe("modified");
    expect(node2Diff?.runDetailsA?.status).toBe("Succeeded");
    expect(node2Diff?.runDetailsB?.status).toBe("Failed");
    expect(node2Diff?.runDetailsB?.isFailurePoint).toBe(true);
    expect(node2Diff?.runDetailsB?.validationPassed).toBe(false);
    expect(node2Diff?.runDetailsB?.retryCount).toBe(1);
    expect(node2Diff?.runDetailsB?.error).toBe("Lint violation threshold exceeded");
  });
});

describe("Execution Filtering Logic", () => {
  const records: ExecutionRecord[] = [
    {
      id: "exec-101",
      workflowId: "wf-delivery",
      workflowName: "Enterprise Feature Delivery",
      status: "Succeeded",
      startedAt: "2026-10-19T08:00:00.000Z",
      durationMs: 4000,
      totalSteps: 5,
      failedSteps: 0,
      finalSummary: "All checks passed.",
    },
    {
      id: "exec-102",
      workflowId: "wf-delivery",
      workflowName: "Enterprise Feature Delivery",
      status: "Failed",
      startedAt: "2026-10-19T09:00:00.000Z",
      durationMs: 7200,
      totalSteps: 5,
      failedSteps: 1,
      finalSummary: "Unit tests failed.",
    },
    {
      id: "exec-103",
      workflowId: "wf-security",
      workflowName: "Security Audit",
      status: "Waiting for Approval",
      startedAt: "2026-10-18T12:00:00.000Z",
      durationMs: 1500,
      totalSteps: 3,
      failedSteps: 0,
    },
    {
      id: "exec-104",
      workflowId: "wf-release",
      workflowName: "Release Verification",
      status: "Cancelled",
      startedAt: "2026-10-10T10:00:00.000Z",
      durationMs: 800,
      totalSteps: 4,
      failedSteps: 0,
    },
  ];

  it("filters executions by search text across runId, workflow name, and summary", () => {
    const byId = filterExecutions(records, { search: "102" });
    expect(byId.length).toBe(1);
    expect(byId[0].id).toBe("exec-102");

    const byName = filterExecutions(records, { search: "security" });
    expect(byName.length).toBe(1);
    expect(byName[0].id).toBe("exec-103");

    const bySummary = filterExecutions(records, { search: "checks passed" });
    expect(bySummary.length).toBe(1);
    expect(bySummary[0].id).toBe("exec-101");
  });

  it("filters executions by status", () => {
    const succeeded = filterExecutions(records, { status: "Succeeded" });
    expect(succeeded.length).toBe(1);
    expect(succeeded[0].id).toBe("exec-101");

    const failed = filterExecutions(records, { status: "Failed" });
    expect(failed.length).toBe(1);
    expect(failed[0].id).toBe("exec-102");

    const all = filterExecutions(records, { status: "all" });
    expect(all.length).toBe(4);
  });

  it("filters executions by workflow ID", () => {
    const delivery = filterExecutions(records, { workflowId: "wf-delivery" });
    expect(delivery.length).toBe(2);
    expect(delivery.map((r) => r.id)).toEqual(["exec-101", "exec-102"]);
  });

  it("filters executions by date ranges", () => {
    // Current test date in context: 2026-10-19
    const custom = filterExecutions(records, {
      startDate: "2026-10-19T00:00:00.000Z",
      endDate: "2026-10-19T23:59:59.000Z",
    });
    expect(custom.length).toBe(2);
    expect(custom.map((r) => r.id)).toEqual(["exec-101", "exec-102"]);
  });
});

describe("Execution Sorting Logic", () => {
  const records: ExecutionRecord[] = [
    {
      id: "exec-1",
      workflowId: "wf-a",
      workflowName: "Bravo",
      status: "Succeeded",
      startedAt: "2026-10-18T10:00:00.000Z",
      durationMs: 3000,
      totalSteps: 4,
      failedSteps: 0,
    },
    {
      id: "exec-2",
      workflowId: "wf-b",
      workflowName: "Alpha",
      status: "Failed",
      startedAt: "2026-10-19T10:00:00.000Z",
      durationMs: 12000,
      totalSteps: 8,
      failedSteps: 2,
    },
    {
      id: "exec-3",
      workflowId: "wf-c",
      workflowName: "Charlie",
      status: "Running",
      startedAt: "2026-10-17T10:00:00.000Z",
      durationMs: 1000,
      totalSteps: 2,
      failedSteps: 0,
    },
  ];

  it("sorts by startedAt ascending and descending", () => {
    const desc = sortExecutions(records, "startedAt", "desc");
    expect(desc.map((r) => r.id)).toEqual(["exec-2", "exec-1", "exec-3"]);

    const asc = sortExecutions(records, "startedAt", "asc");
    expect(asc.map((r) => r.id)).toEqual(["exec-3", "exec-1", "exec-2"]);
  });

  it("sorts by duration ascending and descending", () => {
    const desc = sortExecutions(records, "durationMs", "desc");
    expect(desc.map((r) => r.id)).toEqual(["exec-2", "exec-1", "exec-3"]);

    const asc = sortExecutions(records, "durationMs", "asc");
    expect(asc.map((r) => r.id)).toEqual(["exec-3", "exec-1", "exec-2"]);
  });

  it("sorts by workflowName ascending and descending", () => {
    const asc = sortExecutions(records, "workflowName", "asc");
    expect(asc.map((r) => r.workflowName)).toEqual(["Alpha", "Bravo", "Charlie"]);

    const desc = sortExecutions(records, "workflowName", "desc");
    expect(desc.map((r) => r.workflowName)).toEqual(["Charlie", "Bravo", "Alpha"]);
  });

  it("sorts by totalSteps", () => {
    const desc = sortExecutions(records, "totalSteps", "desc");
    expect(desc.map((r) => r.totalSteps)).toEqual([8, 4, 2]);
  });
});

describe("Persisted Sample Execution Run Retrieval", () => {
  it("provides comprehensive sample execution records meeting all field requirements", () => {
    expect(sampleExecutionRecords.length).toBeGreaterThanOrEqual(4);

    for (const run of sampleExecutionRecords) {
      // 10 required fields from prompt
      expect(run.id).toBeDefined();
      expect(run.workflowName).toBeDefined();
      expect(run.workflowVersion).toBeDefined();
      expect(run.startedAt).toBeDefined();
      expect(run.status).toBeDefined();
      expect(run.totalSteps).toBeGreaterThanOrEqual(1);
      expect(run.failedSteps).toBeGreaterThanOrEqual(0);
      expect(run.triggerType).toBeDefined();

      // Sample data verification
      expect(run.isSimulated).toBe(true);
      expect(run.nodeExecutions).toBeDefined();
      expect(run.nodeExecutions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("includes simulated failure points and validation records in sample runs", () => {
    const failedRun = sampleExecutionRecords.find((r) => r.status === "Failed");
    expect(failedRun).toBeDefined();
    expect(failedRun?.failedSteps).toBeGreaterThan(0);

    const failedNode = failedRun?.nodeExecutions.find((n) => n.status === "Failed");
    expect(failedNode).toBeDefined();
    expect(failedNode?.validation?.passed ?? (failedNode as any)?.validationPassed).toBe(false);
    expect(failedNode?.error).toBeDefined();
  });
});
