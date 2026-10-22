import { Workflow, WorkflowNode, WorkflowEdge } from "../domain/workflows/types";
import {
  ExecutionRecord,
  ExecutionStatus,
  NodeExecution,
  NodeExecutionStatus,
  ArtifactReference,
  WorkflowExecutionEngine,
  ContextHandoffRecord,
  RetryAttemptRecord,
  FailureDetails,
} from "../domain/executions/types";
import { validateWorkflow, WorkflowValidationOptions } from "../workflows/WorkflowValidator";

const SECRET_VALUE_PATTERN = /^(sk-[a-zA-Z0-9_-]{10,}|ghp_[a-zA-Z0-9]{15,}|Bearer\s+[a-zA-Z0-9_.-]{15,}|-----BEGIN [A-Z ]+ PRIVATE KEY-----)/i;
const SECRET_KEY_PATTERN =
  /(api_?key|secret|password|passwd|token|\bauth\b|auth_token|authToken|authorization|bearer|private_?key|credential|jwt|access_?token|refresh_?token|client_?secret)/i;

/**
 * Strips secrets, sensitive tokens, and credentials from objects and strings
 * so they are never leaked into execution or context handoff records.
 */
export function sanitizeSecrets<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data === "string") {
    if (SECRET_VALUE_PATTERN.test(data.trim())) {
      return "[REDACTED_SECRET]" as unknown as T;
    }
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeSecrets(item)) as unknown as T;
  }
  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        sanitized[key] = "[REDACTED_SECRET]";
      } else {
        sanitized[key] = sanitizeSecrets(val);
      }
    }
    return sanitized as unknown as T;
  }
  return data;
}

export interface ExecutionStorage {
  saveExecution(record: ExecutionRecord): Promise<ExecutionRecord>;
  getExecution(id: string): Promise<ExecutionRecord | undefined>;
  listExecutions(): Promise<ExecutionRecord[]>;
}

export interface SimulationEngineOptions {
  storage?: ExecutionStorage;
  workflowProvider?: (workflowId: string) => Promise<Workflow | undefined> | Workflow | undefined;
  validationOptions?: WorkflowValidationOptions;
  timeProvider?: () => string;
}

export class LocalSimulationEngine implements WorkflowExecutionEngine {
  private inMemoryRecords = new Map<string, ExecutionRecord>();
  private activeWorkflows = new Map<string, Workflow>();

  constructor(private options: SimulationEngineOptions = {}) {}

  private now(): string {
    return this.options.timeProvider ? this.options.timeProvider() : new Date().toISOString();
  }

  async listExecutions(workflowId?: string): Promise<ExecutionRecord[]> {
    if (this.options.storage) {
      const all = await this.options.storage.listExecutions();
      return workflowId ? all.filter((e) => e.workflowId === workflowId) : all;
    }
    const all = Array.from(this.inMemoryRecords.values());
    return workflowId ? all.filter((e) => e.workflowId === workflowId) : all;
  }

  async getExecution(executionId: string): Promise<ExecutionRecord | undefined> {
    if (this.options.storage) {
      const record = await this.options.storage.getExecution(executionId);
      if (record) return record;
    }
    return this.inMemoryRecords.get(executionId);
  }

  private async persist(record: ExecutionRecord): Promise<ExecutionRecord> {
    this.inMemoryRecords.set(record.id, { ...record });
    if (this.options.storage) {
      await this.options.storage.saveExecution(record);
    }
    return record;
  }

  /**
   * Starts a deterministic local workflow simulation run.
   */
  async startExecution(
    workflow: Workflow,
    runOptions: { initialInputs?: Record<string, unknown>; simulated?: boolean } = {}
  ): Promise<ExecutionRecord> {
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const startTime = this.now();

    // 1. Validating Phase
    const validationReport = validateWorkflow(workflow, this.options.validationOptions);
    if (!validationReport.valid) {
      const errorMsg = `Workflow validation failed: ${validationReport.errors.map((e) => e.message).join("; ")}`;
      const failedRecord: ExecutionRecord = {
        id: runId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowVersion: workflow.version,
        workflowSnapshot: workflow,
        status: "Failed",
        startedAt: startTime,
        completedAt: this.now(),
        durationMs: 0,
        nodeExecutions: [],
        artifacts: [],
        handoffs: [],
        contextData: sanitizeSecrets({ ...(runOptions.initialInputs || {}) }),
        finalSummary: "Execution halted: workflow contains blocking structural or configuration errors.",
        error: errorMsg,
        isSimulated: true,
      };
      return this.persist(failedRecord);
    }

    // Cache workflow definition for potential resumption at approval gates
    this.activeWorkflows.set(runId, workflow);

    // 2. Initialize Run Record in Running state
    const record: ExecutionRecord = {
      id: runId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowVersion: workflow.version,
      workflowSnapshot: workflow,
      status: "Running",
      startedAt: startTime,
      nodeExecutions: [],
      artifacts: [],
      handoffs: [],
      contextData: sanitizeSecrets({ ...(runOptions.initialInputs || {}) }),
      isSimulated: true,
    };

    // 3. Execute nodes in DAG dependency order
    return this.runWorkflowGraph(record, workflow);
  }

  /**
   * Recovers an active workflow definition from cache, record snapshot, or provider.
   */
  private async resolveWorkflow(executionId: string, record: ExecutionRecord): Promise<Workflow> {
    let workflow = this.activeWorkflows.get(executionId);
    if (!workflow && record.workflowSnapshot) {
      workflow = record.workflowSnapshot;
      this.activeWorkflows.set(executionId, workflow);
    }
    if (!workflow && this.options.workflowProvider) {
      const provided = await this.options.workflowProvider(record.workflowId);
      if (provided) {
        workflow = provided;
        this.activeWorkflows.set(executionId, workflow);
      }
    }
    if (!workflow) {
      throw new Error(`Cached workflow not found for execution: ${executionId}`);
    }
    return workflow;
  }

  /**
   * Resumes a paused execution from a human approval node.
   */
  async resumeExecution(
    executionId: string,
    decision: { action: "approve" | "reject"; comment?: string; approver?: string }
  ): Promise<ExecutionRecord> {
    const record = await this.getExecution(executionId);
    if (!record) {
      throw new Error(`Execution record not found: ${executionId}`);
    }

    if (record.status !== "Waiting for Approval") {
      throw new Error(`Execution is not waiting for approval (current status: ${record.status})`);
    }

    const waitingNodeId = record.currentWaitingNodeId;
    if (!waitingNodeId) {
      throw new Error("No waiting approval node recorded on execution");
    }

    const workflow = await this.resolveWorkflow(executionId, record);
    const waitingNode = workflow.nodes.find((n) => n.id === waitingNodeId);
    const nodeExecIndex = record.nodeExecutions.findIndex((ne) => ne.nodeId === waitingNodeId);
    const nodeExec = nodeExecIndex >= 0 ? record.nodeExecutions[nodeExecIndex] : null;

    if (decision.action === "approve") {
      // Approve: mark node Succeeded and resume DAG flow
      if (nodeExec) {
        nodeExec.status = "Succeeded";
        nodeExec.completedAt = this.now();
        nodeExec.durationMs = 150;
        nodeExec.approvalStatus = "approved";
        nodeExec.approvalDecisionBy = decision.approver || "Designated Approver";
        nodeExec.approvalComment = decision.comment || "Approved without conditions.";
        nodeExec.validation = {
          passed: true,
          message: "Simulated approval granted by designated reviewer.",
        };
        nodeExec.outputs = {
          approved: true,
          approver: nodeExec.approvalDecisionBy,
          comment: nodeExec.approvalComment,
          timestamp: nodeExec.completedAt,
          isSimulated: true,
        };
      }
      record.currentWaitingNodeId = undefined;
      record.status = "Running";
      return this.runWorkflowGraph(record, workflow);
    } else {
      // Reject: check fallback routing or fail
      const cfg = waitingNode?.configuration || {};
      const fallback = (cfg.fallbackNodeId as string) || waitingNode?.approvalPolicy?.fallbackNodeId;
      const onReject = (cfg.onReject as string) || waitingNode?.approvalPolicy?.onReject;

      if (onReject === "route_to_fallback" && fallback) {
        if (nodeExec) {
          nodeExec.status = "Succeeded";
          nodeExec.completedAt = this.now();
          nodeExec.approvalStatus = "rejected";
          nodeExec.approvalDecisionBy = decision.approver || "Designated Approver";
          nodeExec.approvalComment = decision.comment || "Rejected and rerouted to fallback.";
          nodeExec.validation = {
            passed: false,
            message: "Approval rejected by reviewer. Rerouted to fallback path.",
          };
          nodeExec.outputs = {
            approved: false,
            reroutedTo: fallback,
            comment: nodeExec.approvalComment,
            timestamp: nodeExec.completedAt,
            isSimulated: true,
          };
        }
        record.currentWaitingNodeId = undefined;
        record.status = "Running";
        return this.runWorkflowGraph(record, workflow, fallback);
      } else {
        // Halt on rejection
        if (nodeExec) {
          nodeExec.status = "Failed";
          nodeExec.completedAt = this.now();
          nodeExec.approvalStatus = "rejected";
          nodeExec.approvalDecisionBy = decision.approver || "Designated Approver";
          nodeExec.approvalComment = decision.comment || "Approval rejected by reviewer.";
          nodeExec.error = "Artifact rejected at human approval gate.";
          nodeExec.validation = {
            passed: false,
            message: "Human approval rejected by designated reviewer.",
          };
        }
        record.currentWaitingNodeId = undefined;
        record.status = "Failed";
        record.completedAt = this.now();
        record.finalSummary = `Execution stopped: Approval rejected on "${waitingNode?.name || waitingNodeId}".`;
        return this.persist(record);
      }
    }
  }

  /**
   * Cancels an active or waiting simulation run.
   */
  async cancelExecution(executionId: string): Promise<ExecutionRecord> {
    const record = await this.getExecution(executionId);
    if (!record) {
      throw new Error(`Execution record not found: ${executionId}`);
    }

    if (record.status === "Succeeded" || record.status === "Failed") {
      return record;
    }

    record.status = "Cancelled";
    record.currentWaitingNodeId = undefined;
    record.completedAt = this.now();
    record.finalSummary = "Simulation cancelled by user request.";

    for (const ne of record.nodeExecutions) {
      if (ne.status === "Running" || ne.status === "Waiting for Approval" || ne.status === "Pending") {
        ne.status = "Cancelled";
        ne.completedAt = this.now();
        ne.validation = {
          passed: false,
          message: "Simulation cancelled before completion.",
        };
      }
    }

    return this.persist(record);
  }

  /**
   * Recovers and resumes an interrupted simulation run (e.g. after restart, interruption, or crash).
   */
  async recoverInterruptedExecution(executionId: string): Promise<ExecutionRecord> {
    const record = await this.getExecution(executionId);
    if (!record) {
      throw new Error(`Execution record not found: ${executionId}`);
    }

    if (record.status === "Succeeded" || record.status === "Failed") {
      return record;
    }

    const workflow = await this.resolveWorkflow(executionId, record);

    if (record.status === "Waiting for Approval") {
      return record;
    }

    if (record.status === "Cancelled") {
      for (const ne of record.nodeExecutions) {
        if (ne.status === "Cancelled") {
          ne.status = "Pending";
          ne.completedAt = undefined;
          ne.error = undefined;
        }
      }
    }

    record.status = "Running";
    record.completedAt = undefined;
    return this.runWorkflowGraph(record, workflow);
  }

  /**
   * Core DAG execution loop.
   */
  private async runWorkflowGraph(
    record: ExecutionRecord,
    workflow: Workflow,
    forceNextNodeId?: string
  ): Promise<ExecutionRecord> {
    const nodes = workflow.nodes;
    const edges = workflow.edges;

    // Track state of each node
    const nodeStateMap = new Map<string, NodeExecution>();
    for (const ne of record.nodeExecutions) {
      nodeStateMap.set(ne.nodeId, ne);
    }

    // Build incoming dependencies map
    const incomingMap = new Map<string, string[]>();
    const outgoingMap = new Map<string, WorkflowEdge[]>();
    for (const n of nodes) {
      incomingMap.set(n.id, []);
      outgoingMap.set(n.id, []);
    }
    for (const e of edges) {
      if (e.source && e.target && incomingMap.has(e.target)) {
        incomingMap.get(e.target)!.push(e.source);
        outgoingMap.get(e.source)?.push(e);
      }
    }

    // Determine execution eligibility
    const executedNodeIds = new Set<string>();
    const skippedNodeIds = new Set<string>();

    for (const [nodeId, ne] of nodeStateMap.entries()) {
      if (ne.status === "Succeeded") executedNodeIds.add(nodeId);
      if (ne.status === "Skipped") skippedNodeIds.add(nodeId);
    }

    let progressMade = true;

    while (progressMade) {
      progressMade = false;

      // Find ready nodes
      const eligibleNodes: WorkflowNode[] = [];
      for (const node of nodes) {
        if (executedNodeIds.has(node.id) || skippedNodeIds.has(node.id)) {
          continue;
        }

        const currentNe = nodeStateMap.get(node.id);
        if (currentNe && (currentNe.status === "Running" || currentNe.status === "Waiting for Approval")) {
          continue;
        }

        // Check if forced next
        if (forceNextNodeId && node.id === forceNextNodeId) {
          eligibleNodes.push(node);
          continue;
        }

        const parents = incomingMap.get(node.id) || [];
        const isEntry = node.type === "start" || node.type === "requirement_input" || node.type === "input";

        if (isEntry && parents.length === 0) {
          eligibleNodes.push(node);
          continue;
        }

        // Check if all parents have completed or been skipped
        const allParentsFinished = parents.length > 0 && parents.every(
          (pId) => executedNodeIds.has(pId) || skippedNodeIds.has(pId)
        );

        if (allParentsFinished) {
          // If all parents were skipped, this node is skipped too
          const allParentsSkipped = parents.every((pId) => skippedNodeIds.has(pId));
          if (allParentsSkipped) {
            skippedNodeIds.add(node.id);
            const skippedExec: NodeExecution = {
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.type,
              status: "Skipped",
              startedAt: this.now(),
              completedAt: this.now(),
              summary: "Skipped: inactive conditional branch.",
              isSimulated: true,
            };
            nodeStateMap.set(node.id, skippedExec);
            progressMade = true;
          } else {
            eligibleNodes.push(node);
          }
        }
      }

      if (eligibleNodes.length === 0) {
        break;
      }

      // Execute each eligible node
      for (const node of eligibleNodes) {
        progressMade = true;

        const parents = incomingMap.get(node.id) || [];
        const incomingHandoffs: ContextHandoffRecord[] = [];
        let scopedInputs: Record<string, unknown> = {};

        if (parents.length > 0) {
          for (const pId of parents) {
            if (executedNodeIds.has(pId)) {
              const parentNode = nodes.find((n) => n.id === pId);
              const parentNe = nodeStateMap.get(pId);
              if (parentNode) {
                const handoff = this.constructHandoff(
                  record.id,
                  parentNode,
                  node,
                  parentNe?.outputs || {},
                  record.contextData || {},
                  record.artifacts || [],
                  parentNe
                );
                incomingHandoffs.push(handoff);
                record.handoffs = record.handoffs || [];
                record.handoffs.push(handoff);
                if (parentNe) {
                  parentNe.handoffsOut = parentNe.handoffsOut || [];
                  parentNe.handoffsOut.push(handoff);
                }
                if (handoff.priorFindings && typeof handoff.priorFindings === "object" && !Array.isArray(handoff.priorFindings)) {
                  scopedInputs = { ...scopedInputs, ...handoff.priorFindings };
                }
              }
            }
          }
        } else {
          // Entry node without parents receives initial context data
          scopedInputs = { ...(record.contextData || {}) };
        }

        scopedInputs = sanitizeSecrets(scopedInputs);

        // If human approval node: pause simulation
        if (node.type === "human_approval" || node.type === "approval") {
          const approverRole = (node.configuration?.approverRole as string) || node.approvalPolicy?.approverRole || "Reviewer";
          const approvalMsg = (node.configuration?.approvalMessage as string) || node.approvalPolicy?.message || "Approve plan before proceeding";
          const whatIsBeingApproved = (node.configuration?.whatIsBeingApproved as string) || node.approvalPolicy?.whatIsBeingApproved || "Simulated Execution Plan & Artifacts";

          const approvalExec: NodeExecution = {
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            status: "Waiting for Approval",
            startedAt: this.now(),
            approvalStatus: "pending",
            approvalMessage: approvalMsg,
            whatIsBeingApproved,
            summary: `Waiting for approval from ${approverRole}: "${approvalMsg}"`,
            inputs: {
              whatIsBeingApproved,
              contextSummary: scopedInputs,
            },
            handoffsIn: incomingHandoffs,
            handoffsOut: [],
            retries: [],
            isSimulated: true,
          };
          nodeStateMap.set(node.id, approvalExec);
          record.status = "Waiting for Approval";
          record.currentWaitingNodeId = node.id;
          record.nodeExecutions = Array.from(nodeStateMap.values());
          return this.persist(record);
        }

        // Execute node deterministically
        const nodeStartTime = this.now();
        const nodeExec: NodeExecution = {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          status: "Running",
          startedAt: nodeStartTime,
          handoffsIn: incomingHandoffs,
          handoffsOut: [],
          retries: [],
          isSimulated: true,
        };
        nodeStateMap.set(node.id, nodeExec);

        const execResult = this.executeDeterministicNode(node, scopedInputs);

        const maxRetries =
          node.retryPolicy?.enabled && typeof node.retryPolicy?.maxRetries === "number"
            ? node.retryPolicy.maxRetries
            : typeof node.configuration?.maxRetries === "number"
            ? Number(node.configuration.maxRetries)
            : 0;
        const backoffSeconds =
          node.retryPolicy?.backoffSeconds ??
          (node.configuration?.backoffSeconds ? Number(node.configuration.backoffSeconds) : 1);

        if (execResult.success) {
          nodeExec.status = "Succeeded";
          nodeExec.completedAt = this.now();
          nodeExec.durationMs = 120;
          nodeExec.inputs = sanitizeSecrets(execResult.inputs);
          nodeExec.outputs = sanitizeSecrets(execResult.outputs);
          nodeExec.summary = execResult.summary;
          nodeExec.selectedBranch = execResult.selectedBranch;
          nodeExec.validation = {
            passed: true,
            message: `Contract validation satisfied for node "${node.name}".`,
          };

          executedNodeIds.add(node.id);

          // Update context data
          record.contextData = {
            ...record.contextData,
            ...nodeExec.outputs,
          };

          // Record any produced artifacts
          if (execResult.artifacts && execResult.artifacts.length > 0) {
            record.artifacts = [...(record.artifacts || []), ...execResult.artifacts];
          }

          // Handle condition branch outputs
          if ((node.type === "condition_branch" || node.type === "decision") && execResult.selectedBranch) {
            const outEdges = outgoingMap.get(node.id) || [];
            const branchMatch = execResult.selectedBranch.toLowerCase();
            const branches = Array.isArray(node.configuration?.branches)
              ? (node.configuration.branches as string[])
              : ["true", "false"];

            for (let i = 0; i < outEdges.length; i++) {
              const edge = outEdges[i];
              const handleMatch = edge.sourceHandle && edge.sourceHandle.toLowerCase() === branchMatch;
              const labelMatch = edge.label && edge.label.toLowerCase() === branchMatch;
              const indexMatch = !edge.sourceHandle && !edge.label && branches[i]?.toLowerCase() === branchMatch;
              const isMatch = Boolean(handleMatch || labelMatch || indexMatch);

              if (!isMatch) {
                // Mark inactive branch target as skipped
                skippedNodeIds.add(edge.target);
                const skippedNode = nodes.find((n) => n.id === edge.target);
                nodeStateMap.set(edge.target, {
                  nodeId: edge.target,
                  nodeName: skippedNode?.name || edge.target,
                  nodeType: skippedNode?.type || "unknown",
                  status: "Skipped",
                  startedAt: this.now(),
                  completedAt: this.now(),
                  summary: `Skipped: branch "${edge.sourceHandle || edge.label || branches[i] || "alternate"}" was not selected.`,
                  isSimulated: true,
                });
              }
            }
          }
        } else {
          // Failure handling with Retry Policy
          const retryAttempts: RetryAttemptRecord[] = [];
          let retrySucceeded = false;

          if (maxRetries > 0) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              const attemptSuccess =
                node.configuration?.retrySucceedsOnAttempt === attempt ||
                (Boolean(node.configuration?.retrySucceeds) && attempt === maxRetries);

              if (attemptSuccess) {
                retryAttempts.push({
                  attemptNumber: attempt,
                  timestamp: this.now(),
                  error: attempt === 1 ? (execResult.error || "Simulated transient failure") : "Transient fault recovered",
                  backoffSeconds: backoffSeconds * attempt,
                  succeeded: true,
                });
                retrySucceeded = true;
                break;
              } else {
                retryAttempts.push({
                  attemptNumber: attempt,
                  timestamp: this.now(),
                  error: execResult.error || `Retry attempt ${attempt} failed (transient timeout).`,
                  backoffSeconds: backoffSeconds * attempt,
                  succeeded: false,
                });
              }
            }
          }

          nodeExec.retries = retryAttempts;
          nodeExec.retryCount = retryAttempts.length;

          if (retrySucceeded) {
            nodeExec.status = "Succeeded";
            nodeExec.completedAt = this.now();
            nodeExec.durationMs = 120 + retryAttempts.length * (backoffSeconds * 1000);
            nodeExec.inputs = sanitizeSecrets(execResult.inputs);
            nodeExec.outputs = sanitizeSecrets({
              ...(execResult.outputs || {}),
              recoveredViaRetry: true,
              totalRetryAttempts: retryAttempts.length,
              isSimulated: true,
            });
            nodeExec.summary = `Succeeded after ${retryAttempts.length} retry attempt(s).`;
            nodeExec.validation = {
              passed: true,
              message: `Recovered on retry attempt ${retryAttempts.length}.`,
            };
            executedNodeIds.add(node.id);
            record.contextData = {
              ...record.contextData,
              ...nodeExec.outputs,
            };
          } else {
            nodeExec.status = "Failed";
            nodeExec.completedAt = this.now();
            nodeExec.durationMs = 80;
            nodeExec.inputs = sanitizeSecrets(execResult.inputs);
            nodeExec.error = execResult.error || `Node "${node.name}" failed execution.`;
            nodeExec.summary =
              retryAttempts.length > 0
                ? `Failed after exhausting ${retryAttempts.length} retry attempt(s): ${nodeExec.error}`
                : `Failed: ${nodeExec.error}`;
            nodeExec.validation = {
              passed: false,
              message: nodeExec.error,
            };

            record.status = "Failed";
            record.completedAt = this.now();
            record.finalSummary = `Pipeline execution failed on node "${node.name}".`;
            record.error = nodeExec.error;
            record.nodeExecutions = Array.from(nodeStateMap.values());
            return this.persist(record);
          }
        }
      }
    }

    // 4. Conclude execution
    record.status = "Succeeded";
    record.completedAt = this.now();
    record.nodeExecutions = Array.from(nodeStateMap.values());
    const totalExecuted = executedNodeIds.size;
    const totalArtifacts = (record.artifacts || []).length;
    record.finalSummary = `Simulation succeeded. ${totalExecuted} node(s) executed in deterministic dependency sequence. Produced ${totalArtifacts} simulated artifact(s).`;

    return this.persist(record);
  }

  /**
   * Constructs a structured ContextHandoffRecord between sourceNode and destNode.
   * Performs configurable context selection and ensures secrets are never passed downstream.
   */
  private constructHandoff(
    runId: string,
    sourceNode: WorkflowNode,
    destNode: WorkflowNode,
    sourceOutput: Record<string, unknown>,
    accumulatedContext: Record<string, unknown>,
    artifacts: ArtifactReference[],
    sourceExec?: NodeExecution
  ): ContextHandoffRecord {
    const srcCfg = sourceNode.configuration || {};
    const destCfg = destNode.configuration || {};

    // 1. Configurable context selection: determine which fields pass forward
    let selectedFields: string[] = [];
    if (Array.isArray(srcCfg.forwardFields) && srcCfg.forwardFields.length > 0) {
      selectedFields = srcCfg.forwardFields;
    } else if (Array.isArray(destCfg.acceptedFields) && destCfg.acceptedFields.length > 0) {
      selectedFields = destCfg.acceptedFields as string[];
    } else if ((destNode.inputContract as any)?.parameters && (destNode.inputContract as any).parameters.length > 0) {
      selectedFields = ((destNode.inputContract as any).parameters as any[]).map((p: any) => p.name);
    } else if (destNode.inputContract?.schema?.properties) {
      selectedFields = Object.keys(destNode.inputContract.schema.properties);
    }

    // Filter prior findings
    const candidateSource = { ...accumulatedContext, ...sourceOutput };
    const priorFindings: Record<string, unknown> = {};
    if (selectedFields.length > 0) {
      for (const field of selectedFields) {
        if (candidateSource[field] !== undefined) {
          priorFindings[field] = candidateSource[field];
        }
      }
    } else {
      Object.assign(priorFindings, candidateSource);
    }

    // 2. Selected artifacts
    let selectedArtifacts = artifacts.filter(
      (a) => a.producedByNodeId === sourceNode.id || a.producedByNodeId === (srcCfg.agentId as string)
    );
    if (Array.isArray(srcCfg.selectedArtifactIds) && srcCfg.selectedArtifactIds.length > 0) {
      const artifactIds = srcCfg.selectedArtifactIds as string[];
      selectedArtifacts = artifacts.filter((a) => artifactIds.includes(a.id));
    }

    // 3. Constraints
    const constraints: string[] = [];
    if (Array.isArray(srcCfg.constraints)) {
      constraints.push(...srcCfg.constraints);
    }
    if (Array.isArray(destCfg.constraints)) {
      constraints.push(...destCfg.constraints);
    }
    if (constraints.length === 0) {
      constraints.push("Deterministic local sandbox execution", "Contract schema validation required");
    }

    // 4. Expected Output Schema
    const expectedOutputSchema =
      (destNode.outputContract?.schema as Record<string, unknown>) ||
      (destNode.inputContract?.schema as Record<string, unknown>) || {
        type: "object",
        description: `Contract schema for node "${destNode.name}"`,
      };

    // 5. Completion Criteria
    const completionCriteria: string[] = [];
    if (Array.isArray(destCfg.completionCriteria)) {
      completionCriteria.push(...destCfg.completionCriteria);
    }
    if (Array.isArray(srcCfg.completionCriteria)) {
      completionCriteria.push(...srcCfg.completionCriteria);
    }
    if (completionCriteria.length === 0) {
      completionCriteria.push("Outputs match expected contract schema", "Node execution exits with clean status");
    }

    // 6. Failure Details when applicable
    const failureDetails: FailureDetails = {
      hasFailed: sourceExec?.status === "Failed",
      reason: sourceExec?.error,
      error: sourceExec?.error,
      retryCount: sourceExec?.retryCount ?? 0,
      retriesExhausted: sourceExec?.status === "Failed",
    };

    // 7. Task Summary
    const taskSummary =
      (srcCfg.taskSummary as string) ||
      sourceNode.description ||
      destNode.description ||
      `Handoff from "${sourceNode.name}" to "${destNode.name}"`;

    const handoff: ContextHandoffRecord = {
      id: `handoff-${runId}-${sourceNode.id}-${destNode.id}-${Math.random().toString(36).slice(2, 6)}`,
      runId,
      sourceNodeId: sourceNode.id,
      sourceNodeName: sourceNode.name,
      destinationNodeId: destNode.id,
      destinationNodeName: destNode.name,
      taskSummary: sanitizeSecrets(taskSummary),
      priorFindings: sanitizeSecrets(priorFindings),
      selectedArtifacts: sanitizeSecrets(selectedArtifacts),
      constraints: sanitizeSecrets(constraints),
      expectedOutputSchema: sanitizeSecrets(expectedOutputSchema),
      completionCriteria: sanitizeSecrets(completionCriteria),
      failureDetails: sanitizeSecrets(failureDetails),
      timestamp: this.now(),
      isSimulated: true,
    };

    return handoff;
  }

  /**
   * Generates deterministic mock outputs for each supported node type.
   */
  private executeDeterministicNode(
    node: WorkflowNode,
    context: Record<string, unknown>
  ): {
    success: boolean;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    summary: string;
    error?: string;
    selectedBranch?: string;
    artifacts?: ArtifactReference[];
  } {
    const cfg = node.configuration || {};
    const now = this.now();

    // Check intentional mock failure flag
    if (cfg.shouldFail) {
      return {
        success: false,
        inputs: { ...context },
        outputs: {},
        summary: `Simulated error on "${node.name}"`,
        error: (cfg.failureMessage as string) || `Simulated failure on "${node.name}".`,
      };
    }

    switch (node.type) {
      case "start":
      case "input":
      case "requirement_input": {
        const intakeId = (cfg.requirementId as string) || "REQ-INTAKE-001";
        const title = (cfg.title as string) || "Enterprise Feature Intake";
        return {
          success: true,
          inputs: { trigger: cfg.trigger || "manual" },
          outputs: {
            requirementId: intakeId,
            requirementTitle: title,
            featureScope: "Multi-Agent Orchestration Workflow",
            priority: "High",
            disclaimer: "Deterministic local simulation output.",
            isSimulated: true,
          },
          summary: `Requirement intake initialized with ID ${intakeId}.`,
        };
      }

      case "agent_execution":
      case "agent": {
        const agentId = (cfg.agentId as string) || "agent-generic";
        return this.generateDeterministicAgentOutput(agentId, node.name, context);
      }

      case "skill_invocation":
      case "skill": {
        const skillId = (cfg.skillId as string) || "skill-generic";
        return {
          success: true,
          inputs: { skillId, contextSnapshot: { ...context } },
          outputs: {
            skillId,
            status: "completed",
            result: `Skill "${skillId}" executed deterministically with clean status.`,
            isSimulated: true,
          },
          summary: `Skill "${skillId}" executed successfully.`,
        };
      }

      case "planning": {
        const planArtifact: ArtifactReference = {
          id: `art-${node.id}-plan`,
          name: "Sequenced Execution Plan",
          type: "specification",
          summary: "Topological breakdown of feature deliverables and milestone gates.",
          producedByNodeId: node.id,
          createdAt: now,
          isSimulated: true,
        };
        return {
          success: true,
          inputs: { ...context },
          outputs: {
            planApproved: true,
            milestones: [
              { id: 1, title: "Intake & Specification", hours: 4 },
              { id: 2, title: "Architecture & Data Contracts", hours: 8 },
              { id: 3, title: "Implementation & Code Review", hours: 16 },
              { id: 4, title: "Automated Test Verification", hours: 6 },
            ],
            estimatedHours: 34,
            isSimulated: true,
          },
          summary: "Planning complete: 4 sequenced milestones defined.",
          artifacts: [planArtifact],
        };
      }

      case "condition_branch":
      case "decision": {
        const condType = (cfg.conditionType as string) || "expression";
        const expr = (cfg.conditionExpression as string) || (cfg.expression as string) || "true";
        const branches = Array.isArray(cfg.branches) ? cfg.branches : ["pass", "fail"];

        let selected = branches[0];
        // Deterministic condition evaluation
        if (condType === "expression") {
          if (expr.includes("fail") || expr.includes("false") || expr.includes("error")) {
            selected = branches[1] || branches[0];
          } else {
            selected = branches[0];
          }
        } else if (condType === "threshold") {
          const threshold = Number(cfg.threshold ?? 80);
          const val = Number(context.score ?? context.coverage ?? 90);
          selected = val >= threshold ? branches[0] : (branches[1] || branches[0]);
        }

        return {
          success: true,
          inputs: { conditionType: condType, expression: expr },
          outputs: {
            evaluatedCondition: expr,
            selectedBranch: selected,
            isSimulated: true,
          },
          selectedBranch: selected,
          summary: `Condition evaluated [${condType}]: routed to "${selected}".`,
        };
      }

      case "context_handoff":
      case "handoff": {
        const fields = Array.isArray(cfg.forwardFields) ? cfg.forwardFields : Object.keys(context);
        const filtered: Record<string, unknown> = {};
        for (const f of fields) {
          if (context[f] !== undefined) filtered[f] = context[f];
        }
        return {
          success: true,
          inputs: { forwardFields: fields },
          outputs: sanitizeSecrets({
            ...filtered,
            handoffAt: now,
            isSimulated: true,
          }),
          summary: `Context handoff: forwarded ${Object.keys(filtered).length} field(s).`,
        };
      }

      case "parallel_execution":
      case "parallel" as any: {
        return {
          success: true,
          inputs: { ...context },
          outputs: { parallelBranchesActivated: 2, isSimulated: true },
          summary: "Parallel fan-out stage initialized.",
        };
      }

      case "merge_results":
      case "merge" as any: {
        const strategy = (cfg.strategy as string) || "combine_all";
        const conflictPolicy = (cfg.conflictResolution as string) || "overwrite";

        let merged: Record<string, unknown> = { ...context };
        if (strategy === "concat_arrays") {
          const arrayMap: Record<string, unknown[]> = {};
          for (const [k, v] of Object.entries(context)) {
            if (Array.isArray(v)) {
              arrayMap[k] = [...(arrayMap[k] || []), ...v];
            } else {
              arrayMap[k] = [v];
            }
          }
          merged = { ...merged, ...arrayMap };
        }

        return {
          success: true,
          inputs: { ...context },
          outputs: {
            mergedResults: merged,
            mergeStrategy: strategy,
            conflictResolution: conflictPolicy,
            mergeStatus: "consolidated",
            isSimulated: true,
          },
          summary: `Parallel results merged using strategy "${strategy}".`,
        };
      }

      case "validation": {
        const assertion = (cfg.assertion as string) || "valid";
        const pass = assertion !== "fail" && !cfg.shouldFail;
        if (!pass) {
          return {
            success: false,
            inputs: { assertion },
            outputs: {},
            summary: `Validation assertion failed: "${assertion}".`,
            error: `Validation criteria "${assertion}" not satisfied.`,
          };
        }
        return {
          success: true,
          inputs: { assertion },
          outputs: { validationPassed: true, assertion, isSimulated: true },
          summary: `Validation passed: "${assertion}".`,
        };
      }

      case "artifact_output": {
        const artifactName = (cfg.artifactName as string) || "Delivery Manifest";
        const manifestArtifact: ArtifactReference = {
          id: `art-${node.id}-manifest`,
          name: artifactName,
          type: "summary",
          summary: "Final enterprise delivery artifacts and release verification manifest.",
          producedByNodeId: node.id,
          createdAt: now,
          isSimulated: true,
        };
        return {
          success: true,
          inputs: { ...context },
          outputs: {
            manifestGenerated: true,
            artifactName,
            isSimulated: true,
          },
          summary: `Generated final delivery artifact "${artifactName}".`,
          artifacts: [manifestArtifact],
        };
      }

      case "end":
      case "output": {
        return {
          success: true,
          inputs: { ...context },
          outputs: {
            pipelineCompleted: true,
            completedAt: now,
            isSimulated: true,
          },
          summary: "Pipeline terminal stage reached cleanly.",
        };
      }

      default: {
        return {
          success: true,
          inputs: { ...context },
          outputs: { nodeType: node.type, executed: true, isSimulated: true },
          summary: `Executed node "${node.name}" (${node.type}).`,
        };
      }
    }
  }

  /**
   * Deterministic agent simulation output generator.
   */
  private generateDeterministicAgentOutput(
    agentId: string,
    nodeName: string,
    context: Record<string, unknown>
  ): {
    success: boolean;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    summary: string;
    artifacts?: ArtifactReference[];
  } {
    const now = this.now();

    if (agentId.includes("arch")) {
      const blueprint: ArtifactReference = {
        id: `art-arch-blueprint`,
        name: "Architecture Blueprint",
        type: "blueprint",
        summary: "Target system architecture, data flow diagrams, and interface boundaries.",
        producedByNodeId: agentId,
        createdAt: now,
        isSimulated: true,
      };
      return {
        success: true,
        inputs: { ...context },
        outputs: {
          architecturePattern: "Modular Agentic Orchestration",
          interfacesDefined: 3,
          components: ["Orchestrator", "Harness Engine", "Artifact Repository"],
          dataContractVersion: "1.0.0",
          isSimulated: true,
        },
        summary: "Architecture Agent produced system specification and data contracts.",
        artifacts: [blueprint],
      };
    }

    if (agentId.includes("plan")) {
      return {
        success: true,
        inputs: { ...context },
        outputs: {
          milestones: 4,
          estimatedHours: 32,
          criticalPath: "Intake -> Architecture -> Plan -> Approval -> Impl -> Review -> Test",
          isSimulated: true,
        },
        summary: "Planning Agent sequenced deliverables and approval prerequisites.",
      };
    }

    if (agentId.includes("impl")) {
      const patch: ArtifactReference = {
        id: `art-impl-patch`,
        name: "Implementation Patch",
        type: "code_patch",
        summary: "Code implementation diff satisfying architectural contracts.",
        producedByNodeId: agentId,
        createdAt: now,
        isSimulated: true,
      };
      return {
        success: true,
        inputs: { ...context },
        outputs: {
          filesChanged: 3,
          linesAdded: 142,
          linesRemoved: 18,
          compilationStatus: "clean",
          isSimulated: true,
        },
        summary: "Implementation Agent generated code deliverables with clean compilation.",
        artifacts: [patch],
      };
    }

    if (agentId.includes("review")) {
      return {
        success: true,
        inputs: { ...context },
        outputs: {
          reviewScore: 96,
          approved: true,
          staticAnalysisIssues: 0,
          qualityGate: "PASSED",
          isSimulated: true,
        },
        summary: "Code Review Agent verified style, contracts, and security compliance (Score: 96/100).",
      };
    }

    if (agentId.includes("test")) {
      const testReport: ArtifactReference = {
        id: `art-test-report`,
        name: "Test Validation Report",
        type: "test_report",
        summary: "Automated test suite execution results, coverage metrics, and regression suite.",
        producedByNodeId: agentId,
        createdAt: now,
        isSimulated: true,
      };
      return {
        success: true,
        inputs: { ...context },
        outputs: {
          totalTests: 42,
          passed: 42,
          failed: 0,
          coveragePercent: 94.2,
          isSimulated: true,
        },
        summary: "Test Validation Agent ran 42 tests: 100% passed, 94.2% coverage.",
        artifacts: [testReport],
      };
    }

    // Default / Summary agent
    const summaryArtifact: ArtifactReference = {
      id: `art-release-summary`,
      name: "Release Summary",
      type: "summary",
      summary: "End-to-end verification checklist and delivery documentation.",
      producedByNodeId: agentId,
      createdAt: now,
      isSimulated: true,
    };
    return {
      success: true,
      inputs: { ...context },
      outputs: {
        agentId,
        status: "completed",
        deliveryReadiness: "Production Ready",
        isSimulated: true,
      },
      summary: `Agent "${nodeName}" completed simulated task duties.`,
      artifacts: [summaryArtifact],
    };
  }
}
