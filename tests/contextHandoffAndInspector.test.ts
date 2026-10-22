import { describe, it, expect, beforeEach } from "vitest";
import { LocalSimulationEngine, ExecutionStorage, sanitizeSecrets } from "../src/executions/LocalSimulationEngine";
import { Workflow, WorkflowNode } from "../src/domain/workflows/types";
import { ExecutionRecord, ContextHandoffRecord } from "../src/domain/executions/types";
import { sampleWorkflows } from "../src/storage/sampleData";

describe("Prompt 16: Context Handoffs, Approval Gates, Retry, and Run Inspector", () => {
  let records: ExecutionRecord[];
  let storage: ExecutionStorage;
  let engine: LocalSimulationEngine;
  const enterpriseWf = sampleWorkflows.find((w) => w.id === "wf-feature-delivery")!;

  beforeEach(() => {
    records = [];
    storage = {
      saveExecution: async (rec) => {
        const idx = records.findIndex((r) => r.id === rec.id);
        if (idx >= 0) records[idx] = { ...rec };
        else records.push({ ...rec });
        return rec;
      },
      getExecution: async (id) => records.find((r) => r.id === id),
      listExecutions: async () => [...records],
    };
    engine = new LocalSimulationEngine({
      storage,
      timeProvider: () => "2026-10-19T12:00:00.000Z",
    });
  });

  describe("Context Handoff Construction & Context Selection", () => {
    it("constructs structured context handoffs between connected nodes with all required fields", async () => {
      const paused = await engine.startExecution(enterpriseWf);

      expect(paused.handoffs).toBeDefined();
      expect(paused.handoffs!.length).toBeGreaterThan(0);

      const firstHandoff = paused.handoffs![0];
      // 10 required items:
      expect(firstHandoff.runId).toBe(paused.id);
      expect(firstHandoff.sourceNodeId).toBeDefined();
      expect(firstHandoff.destinationNodeId).toBeDefined();
      expect(firstHandoff.sourceNodeName).toBeDefined();
      expect(firstHandoff.destinationNodeName).toBeDefined();
      expect(firstHandoff.taskSummary).toBeDefined();
      expect(firstHandoff.priorFindings).toBeDefined();
      expect(firstHandoff.selectedArtifacts).toBeDefined();
      expect(Array.isArray(firstHandoff.selectedArtifacts)).toBe(true);
      expect(firstHandoff.constraints).toBeDefined();
      expect(Array.isArray(firstHandoff.constraints)).toBe(true);
      expect(firstHandoff.expectedOutputSchema).toBeDefined();
      expect(firstHandoff.completionCriteria).toBeDefined();
      expect(Array.isArray(firstHandoff.completionCriteria)).toBe(true);
      expect(firstHandoff.failureDetails).toBeDefined();
      expect(firstHandoff.isSimulated).toBe(true);
    });

    it("filters context data to pass only necessary information downstream", async () => {
      const testWorkflow: Workflow = {
        id: "wf-context-selection-test",
        name: "Context Selection Workflow",
        version: "1.0.0",
        status: "Active",
        nodes: [
          {
            id: "node-1",
            type: "start",
            name: "Initial Data Source",
            configuration: {
              forwardFields: ["allowedField1", "allowedField2"], // Selective forwarding
            },
            position: { x: 0, y: 0 },
          },
          {
            id: "node-2",
            type: "validation",
            name: "Downstream Consumer",
            configuration: { assertion: "valid" },
            position: { x: 200, y: 0 },
          },
          {
            id: "node-3",
            type: "end",
            name: "Terminal",
            configuration: {},
            position: { x: 400, y: 0 },
          },
        ],
        edges: [
          { id: "e1", source: "node-1", target: "node-2" },
          { id: "e2", source: "node-2", target: "node-3" },
        ],
      };

      const record = await engine.startExecution(testWorkflow, {
        initialInputs: {
          allowedField1: "keep-me",
          allowedField2: "keep-me-too",
          superfluousField: "discard-me",
        },
      });

      expect(record.status).toBe("Succeeded");
      const handoff = record.handoffs?.find((h) => h.sourceNodeId === "node-1" && h.destinationNodeId === "node-2");
      expect(handoff).toBeDefined();

      const findings = handoff!.priorFindings as Record<string, unknown>;
      expect(findings.allowedField1).toBe("keep-me");
      expect(findings.allowedField2).toBe("keep-me-too");
      // superfluousField should not be passed forward because forwardFields restricted it
      expect(findings.superfluousField).toBeUndefined();
    });

    it("sanitizes secrets and credentials so they are never leaked into handoff records", async () => {
      const testWorkflow: Workflow = {
        id: "wf-secrets-sanitization",
        name: "Secrets Test Workflow",
        version: "1.0.0",
        status: "Active",
        nodes: [
          {
            id: "node-start",
            type: "start",
            name: "Source Node",
            configuration: {},
            position: { x: 0, y: 0 },
          },
          {
            id: "node-end",
            type: "end",
            name: "Target Node",
            configuration: {},
            position: { x: 200, y: 0 },
          },
        ],
        edges: [{ id: "e1", source: "node-start", target: "node-end" }],
      };

      const record = await engine.startExecution(testWorkflow, {
        initialInputs: {
          apiKey: "sk-live-secret-key-1234567890abcdef",
          api_key: "my_api_key_value",
          token: "ghp_12345678901234567890abcdef",
          password: "super_secret_password_123",
          client_secret: "secret-vault-token",
          normalField: "public-information",
        },
      });

      const handoff = record.handoffs?.find(
        (h) => h.sourceNodeId === "node-start" && h.destinationNodeId === "node-end"
      );
      expect(handoff).toBeDefined();

      const findings = handoff!.priorFindings as Record<string, unknown>;
      expect(findings.apiKey).toBe("[REDACTED_SECRET]");
      expect(findings.api_key).toBe("[REDACTED_SECRET]");
      expect(findings.token).toBe("[REDACTED_SECRET]");
      expect(findings.password).toBe("[REDACTED_SECRET]");
      expect(findings.client_secret).toBe("[REDACTED_SECRET]");
      expect(findings.normalField).toBe("public-information");
    });
  });

  describe("Human Approval Gate Pause, Decision, and Cancellation", () => {
    it("pauses at approval node and exposes what is awaiting approval and approval message", async () => {
      const record = await engine.startExecution(enterpriseWf);

      expect(record.status).toBe("Waiting for Approval");
      expect(record.currentWaitingNodeId).toBe("node-approval");

      const approvalExec = record.nodeExecutions.find((ne) => ne.nodeId === "node-approval");
      expect(approvalExec).toBeDefined();
      expect(approvalExec?.status).toBe("Waiting for Approval");
      expect(approvalExec?.approvalStatus).toBe("pending");
      expect(approvalExec?.approvalMessage).toBeDefined();
      expect(approvalExec?.whatIsBeingApproved).toBeDefined();
      expect(approvalExec?.handoffsIn).toBeDefined();
      expect(approvalExec?.handoffsIn!.length).toBeGreaterThan(0);
    });

    it("resumes only after explicit approval decision", async () => {
      const paused = await engine.startExecution(enterpriseWf);
      expect(paused.status).toBe("Waiting for Approval");

      const approved = await engine.resumeExecution(paused.id, {
        action: "approve",
        approver: "Staff Engineer",
        comment: "Reviewed architecture deliverables.",
      });

      expect(approved.status).toBe("Succeeded");
      const approvalNode = approved.nodeExecutions.find((ne) => ne.nodeId === "node-approval");
      expect(approvalNode?.approvalStatus).toBe("approved");
      expect(approvalNode?.approvalDecisionBy).toBe("Staff Engineer");
      expect(approvalNode?.validation?.passed).toBe(true);
    });

    it("halts pipeline and records rejection status on explicit reject", async () => {
      const paused = await engine.startExecution(enterpriseWf);

      const rejected = await engine.resumeExecution(paused.id, {
        action: "reject",
        approver: "Security Officer",
        comment: "Denied: lacks encryption envelope.",
      });

      expect(rejected.status).toBe("Failed");
      const approvalNode = rejected.nodeExecutions.find((ne) => ne.nodeId === "node-approval");
      expect(approvalNode?.status).toBe("Failed");
      expect(approvalNode?.approvalStatus).toBe("rejected");
      expect(approvalNode?.validation?.passed).toBe(false);
    });

    it("cancels execution and updates waiting nodes to Cancelled", async () => {
      const paused = await engine.startExecution(enterpriseWf);
      expect(paused.status).toBe("Waiting for Approval");

      const cancelled = await engine.cancelExecution(paused.id);
      expect(cancelled.status).toBe("Cancelled");
      expect(cancelled.currentWaitingNodeId).toBeUndefined();

      const approvalNode = cancelled.nodeExecutions.find((ne) => ne.nodeId === "node-approval");
      expect(approvalNode?.status).toBe("Cancelled");
    });
  });

  describe("Retry Policy and Attempts Tracking", () => {
    it("tracks retry attempts and errors when node fails up to retry limit", async () => {
      const retryWorkflow: Workflow = {
        id: "wf-retry-test",
        name: "Retry Failure Workflow",
        version: "1.0.0",
        status: "Active",
        nodes: [
          {
            id: "node-start",
            type: "start",
            name: "Start Node",
            configuration: {},
            position: { x: 0, y: 0 },
          },
          {
            id: "node-failing",
            type: "agent_execution",
            name: "Unstable Agent",
            retryPolicy: {
              enabled: true,
              maxRetries: 3,
              backoffSeconds: 1,
            },
            configuration: {
              agentId: "agent-arch",
              shouldFail: true,
              failureMessage: "Transient connection timeout",
            },
            position: { x: 200, y: 0 },
          },
          {
            id: "node-end",
            type: "end",
            name: "End Node",
            configuration: {},
            position: { x: 400, y: 0 },
          },
        ],
        edges: [
          { id: "e1", source: "node-start", target: "node-failing" },
          { id: "e2", source: "node-failing", target: "node-end" },
        ],
      };

      const record = await engine.startExecution(retryWorkflow);

      expect(record.status).toBe("Failed");
      const failingNode = record.nodeExecutions.find((ne) => ne.nodeId === "node-failing");
      expect(failingNode).toBeDefined();
      expect(failingNode?.status).toBe("Failed");
      expect(failingNode?.retryCount).toBe(3);
      expect(failingNode?.retries).toBeDefined();
      expect(failingNode?.retries!.length).toBe(3);

      // Verify attempts recorded with error and backoff
      for (let i = 0; i < 3; i++) {
        const attempt = failingNode!.retries![i];
        expect(attempt.attemptNumber).toBe(i + 1);
        expect(attempt.error).toContain("Transient connection timeout");
        expect(attempt.succeeded).toBe(false);
        expect(attempt.backoffSeconds).toBe(i + 1);
      }
    });

    it("recovers on retry when configured to succeed after transient attempts", async () => {
      const retryWorkflow: Workflow = {
        id: "wf-retry-recovery",
        name: "Retry Recovery Workflow",
        version: "1.0.0",
        status: "Active",
        nodes: [
          {
            id: "node-start",
            type: "start",
            name: "Start Node",
            configuration: {},
            position: { x: 0, y: 0 },
          },
          {
            id: "node-flaky",
            type: "agent_execution",
            name: "Recovering Agent",
            retryPolicy: {
              enabled: true,
              maxRetries: 2,
              backoffSeconds: 1,
            },
            configuration: {
              agentId: "agent-impl",
              shouldFail: true,
              retrySucceedsOnAttempt: 2, // succeeds on 2nd attempt
            },
            position: { x: 200, y: 0 },
          },
          {
            id: "node-end",
            type: "end",
            name: "End Node",
            configuration: {},
            position: { x: 400, y: 0 },
          },
        ],
        edges: [
          { id: "e1", source: "node-start", target: "node-flaky" },
          { id: "e2", source: "node-flaky", target: "node-end" },
        ],
      };

      const record = await engine.startExecution(retryWorkflow);

      expect(record.status).toBe("Succeeded");
      const flakyNode = record.nodeExecutions.find((ne) => ne.nodeId === "node-flaky");
      expect(flakyNode).toBeDefined();
      expect(flakyNode?.status).toBe("Succeeded");
      expect(flakyNode?.retryCount).toBe(2);
      expect(flakyNode?.retries?.length).toBe(2);

      expect(flakyNode!.retries![0].succeeded).toBe(false);
      expect(flakyNode!.retries![1].succeeded).toBe(true);
      expect(flakyNode?.validation?.passed).toBe(true);
    });
  });

  describe("Node Execution Inspector Details & Reload Persistence", () => {
    it("records input, output, handoff, validation, duration, and status for each executed node", async () => {
      const paused = await engine.startExecution(enterpriseWf);
      const resumed = await engine.resumeExecution(paused.id, {
        action: "approve",
        approver: "Architect",
      });

      for (const ne of resumed.nodeExecutions) {
        expect(ne.status).toBeDefined();
        expect(ne.startedAt).toBeDefined();
        expect(ne.isSimulated).toBe(true);

        if (ne.status === "Succeeded") {
          expect(ne.completedAt).toBeDefined();
          expect(ne.inputs).toBeDefined();
          expect(ne.outputs).toBeDefined();
          expect(ne.durationMs).toBeGreaterThan(0);
          expect(ne.validation).toBeDefined();
          expect(ne.validation?.passed).toBe(true);
        }
      }
    });

    it("preserves run details in persistent storage for retrieval across reloads", async () => {
      const run = await engine.startExecution(enterpriseWf);
      const retrieved = await engine.getExecution(run.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(run.id);
      expect(retrieved?.status).toBe("Waiting for Approval");
      expect(retrieved?.handoffs?.length).toBeGreaterThan(0);

      // Verify listExecutions by workflowId preserves data
      const list = await engine.listExecutions(enterpriseWf.id);
      expect(list.some((r) => r.id === run.id)).toBe(true);
    });
  });
});
