import { sendRequest, hasVsCodeApi } from "./vscodeApi";
import type { Workflow } from "../types";
import type { ExecutionRecord } from "../types";

export interface ExecutionsStore {
  list(workflowId?: string): Promise<ExecutionRecord[]>;
  get(id: string): Promise<ExecutionRecord>;
  start(workflow: Workflow, options?: Record<string, unknown>): Promise<ExecutionRecord>;
  resume(id: string, decision: { action: "approve" | "reject"; comment?: string; approver?: string }): Promise<ExecutionRecord>;
  recover(id: string): Promise<ExecutionRecord>;
  cancel(id: string): Promise<ExecutionRecord>;
}

// In-memory browser fallback store for offline/demo operation
class BrowserExecutionsStore implements ExecutionsStore {
  private runs: ExecutionRecord[] = [];

  constructor() {
    try {
      const saved = localStorage.getItem("agentforge.simulation_runs");
      if (saved) {
        this.runs = JSON.parse(saved);
      }
    } catch {
      // Fallback silently if storage unavailable
    }
  }

  private persist() {
    try {
      localStorage.setItem("agentforge.simulation_runs", JSON.stringify(this.runs));
    } catch {
      // Fallback silently
    }
  }

  async list(workflowId?: string): Promise<ExecutionRecord[]> {
    return workflowId ? this.runs.filter((r) => r.workflowId === workflowId) : [...this.runs];
  }

  async get(id: string): Promise<ExecutionRecord> {
    const found = this.runs.find((r) => r.id === id);
    if (!found) throw new Error(`Execution record not found: ${id}`);
    return found;
  }

  async start(workflow: Workflow, _options?: Record<string, unknown>): Promise<ExecutionRecord> {
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    // Check if workflow has approval node
    const approvalNode = workflow.nodes.find((n) => n.type === "human_approval" || n.type === "approval");
    const willPause = !!approvalNode;

    const artifacts = [
      {
        id: `art-${runId}-spec`,
        name: "Architecture Specification",
        type: "specification",
        summary: "Simulated architectural contract document.",
        producedByNodeId: workflow.nodes[0]?.id || "node-start",
        createdAt: now,
        isSimulated: true,
      },
    ];

    const handoffs: import("../types").ContextHandoffRecord[] = [];

    const nodeExecutions = workflow.nodes.map((n, idx) => {
      const isApproval = n.id === approvalNode?.id;
      const approvalIndex = approvalNode ? workflow.nodes.indexOf(approvalNode) : -1;
      const isDownstreamFromApproval = willPause && approvalIndex >= 0 && idx > approvalIndex;

      // Build handoff from previous node if applicable
      const prevNode = idx > 0 ? workflow.nodes[idx - 1] : null;
      let handoffsIn: import("../types").ContextHandoffRecord[] = [];

      if (prevNode) {
        const handoffRecord: import("../types").ContextHandoffRecord = {
          id: `handoff-${runId}-${prevNode.id}-${n.id}`,
          runId,
          sourceNodeId: prevNode.id,
          sourceNodeName: prevNode.name,
          destinationNodeId: n.id,
          destinationNodeName: n.name,
          taskSummary: prevNode.description || `Simulated context handoff from ${prevNode.name} to ${n.name}`,
          priorFindings: {
            source: prevNode.name,
            status: "Succeeded",
            contractVersion: "1.0.0",
          },
          selectedArtifacts: artifacts,
          constraints: ["Deterministic local simulation", "Contract schema verified"],
          expectedOutputSchema: { type: "object", description: `Contract for ${n.name}` },
          completionCriteria: ["Valid exit status", "Schema compliance"],
          failureDetails: { hasFailed: false },
          timestamp: now,
          isSimulated: true,
        };
        handoffs.push(handoffRecord);
        handoffsIn = [handoffRecord];
      }

      return {
        nodeId: n.id,
        nodeName: n.name,
        nodeType: n.type,
        status: isApproval
          ? ("Waiting for Approval" as const)
          : isDownstreamFromApproval
          ? ("Pending" as const)
          : ("Succeeded" as const),
        startedAt: now,
        completedAt: isApproval || isDownstreamFromApproval ? undefined : now,
        durationMs: 120,
        summary: isApproval
          ? "Waiting for human architectural approval."
          : `Simulated task executed on ${n.name}.`,
        inputs: { node: n.name, simulated: true },
        outputs: { node: n.name, simulated: true, completedAt: now },
        validation: {
          passed: !isDownstreamFromApproval,
          message: isApproval ? "Pending human authorization" : "Output contract verified",
        },
        approvalMessage: isApproval
          ? (n.configuration?.approvalMessage as string) || "Approve technical plan and milestone breakdown"
          : undefined,
        whatIsBeingApproved: isApproval
          ? (n.configuration?.whatIsBeingApproved as string) || "Architecture Specification & Implementation Plan"
          : undefined,
        handoffsIn,
        handoffsOut: [],
        retries: [],
        isSimulated: true,
      };
    });

    const record: ExecutionRecord = {
      id: runId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowVersion: workflow.version,
      status: willPause ? "Waiting for Approval" : "Succeeded",
      startedAt: now,
      completedAt: willPause ? undefined : now,
      currentWaitingNodeId: approvalNode?.id,
      nodeExecutions,
      artifacts,
      handoffs,
      finalSummary: willPause
        ? "Simulation paused at Human Plan Approval gate."
        : `Simulation completed. Executed ${workflow.nodes.length} nodes cleanly.`,
      isSimulated: true,
    };

    this.runs = [record, ...this.runs];
    this.persist();
    return record;
  }

  async resume(
    id: string,
    decision: { action: "approve" | "reject"; comment?: string; approver?: string }
  ): Promise<ExecutionRecord> {
    const record = await this.get(id);
    const now = new Date().toISOString();

    if (decision.action === "approve") {
      record.status = "Succeeded";
      record.completedAt = now;
      record.currentWaitingNodeId = undefined;
      for (const ne of record.nodeExecutions) {
        if (ne.status === "Waiting for Approval") {
          ne.status = "Succeeded";
          ne.completedAt = now;
          ne.approvalStatus = "approved";
          ne.approvalDecisionBy = decision.approver || "Tech Lead";
          ne.approvalComment = decision.comment || "Approved.";
          ne.validation = { passed: true, message: "Human approval granted by reviewer." };
        } else if (ne.status === "Pending") {
          ne.status = "Succeeded";
          ne.completedAt = now;
          ne.validation = { passed: true, message: "Executed downstream stage." };
        }
      }
      record.finalSummary = "Approval granted. All downstream pipeline stages executed successfully.";
    } else {
      record.status = "Failed";
      record.completedAt = now;
      record.currentWaitingNodeId = undefined;
      for (const ne of record.nodeExecutions) {
        if (ne.status === "Waiting for Approval") {
          ne.status = "Failed";
          ne.completedAt = now;
          ne.approvalStatus = "rejected";
          ne.approvalDecisionBy = decision.approver || "Tech Lead";
          ne.approvalComment = decision.comment || "Rejected by approver.";
          ne.error = "Approval rejected.";
          ne.validation = { passed: false, message: "Human approval rejected." };
        }
      }
      record.finalSummary = "Pipeline terminated: Human approval rejected.";
    }

    this.persist();
    return record;
  }

  async cancel(id: string): Promise<ExecutionRecord> {
    const record = await this.get(id);
    record.status = "Cancelled";
    record.currentWaitingNodeId = undefined;
    record.completedAt = new Date().toISOString();
    record.finalSummary = "Simulation cancelled by user.";
    for (const ne of record.nodeExecutions) {
      if (ne.status === "Running" || ne.status === "Waiting for Approval" || ne.status === "Pending") {
        ne.status = "Cancelled";
        ne.completedAt = record.completedAt;
      }
    }
    this.persist();
    return record;
  }

  async recover(id: string): Promise<ExecutionRecord> {
    const record = await this.get(id);
    if (record.status === "Cancelled" || record.status === "Running") {
      record.status = "Succeeded";
      record.completedAt = new Date().toISOString();
      for (const ne of record.nodeExecutions) {
        if (ne.status === "Cancelled" || ne.status === "Pending") {
          ne.status = "Succeeded";
          ne.completedAt = record.completedAt;
          ne.validation = { passed: true, message: "Recovered and completed simulation step." };
        }
      }
      record.finalSummary = "Recovered and completed interrupted simulation.";
      this.persist();
    }
    return record;
  }
}

const hostStore: ExecutionsStore = {
  async list(workflowId) {
    const data = await sendRequest<ExecutionRecord[]>("executions.list");
    return workflowId ? data.filter((e) => e.workflowId === workflowId) : data;
  },
  async get(id) {
    return sendRequest<ExecutionRecord>("executions.get", { id });
  },
  async start(workflow, options) {
    return sendRequest<ExecutionRecord>("executions.start", { workflow, options });
  },
  async resume(id, decision) {
    return sendRequest<ExecutionRecord>("executions.resume", { id, decision });
  },
  async recover(id) {
    return sendRequest<ExecutionRecord>("executions.recover", { id });
  },
  async cancel(id) {
    return sendRequest<ExecutionRecord>("executions.cancel", { id });
  },
};

const browserStore = new BrowserExecutionsStore();

export function getExecutionsStore(): ExecutionsStore {
  return hasVsCodeApi() ? hostStore : browserStore;
}

export const executionsService = {
  list: (workflowId?: string) => getExecutionsStore().list(workflowId),
  get: (id: string) => getExecutionsStore().get(id),
  start: (workflow: Workflow, options?: Record<string, unknown>) =>
    getExecutionsStore().start(workflow, options),
  resume: (
    id: string,
    decision: { action: "approve" | "reject"; comment?: string; approver?: string }
  ) => getExecutionsStore().resume(id, decision),
  recover: (id: string) => getExecutionsStore().recover(id),
  cancel: (id: string) => getExecutionsStore().cancel(id),
};
