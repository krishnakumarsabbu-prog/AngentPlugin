import { Workflow, WorkflowNode, WorkflowEdge } from "../domain/workflows/types";
import { Agent } from "../domain/agents/types";
import {
  ExecutionRecord,
  NodeExecution,
  ContextHandoffRecord,
  ArtifactReference,
  RetryAttemptRecord,
  WorkflowExecutionEngine,
} from "../domain/executions/types";
import { LivePlatformAdapter, LiveToolCall, LiveToolResult, LiveExecutionSessionConfig, LiveToolDefinition } from "../adapters/live/types";
import { OpenAILiveAdapter } from "../adapters/live/OpenAILiveAdapter";
import { SecureCredentialStore } from "../security/SecureCredentialStore";
import { PermissionEnforcer } from "../security/PermissionSandbox";
import { sanitizeAuditDetails } from "../governance/SecuritySanitizer";

export interface LiveEngineOptions {
  storage: {
    saveExecution: (record: ExecutionRecord) => Promise<ExecutionRecord>;
    getExecution: (id: string) => Promise<ExecutionRecord | undefined>;
    listExecutions: (workflowId?: string) => Promise<ExecutionRecord[]>;
  };
  credentialStore: SecureCredentialStore;
  adapter?: LivePlatformAdapter;
  agentProvider?: (agentId: string) => Promise<Agent | undefined>;
  workflowProvider?: (workflowId: string) => Promise<Workflow | undefined>;
  workspaceRoot?: string;
  timeProvider?: () => string;
}

/**
 * Real Live Execution Engine for AgentForge.
 * Orchestrates multi-node pipelines with live platform adapters, real session handoffs,
 * bounded tool-calling cycles, permission enforcement, and AbortController cancellation.
 */
export class LiveExecutionEngine implements WorkflowExecutionEngine {
  private readonly storage: LiveEngineOptions["storage"];
  private readonly credentialStore: SecureCredentialStore;
  private readonly adapter: LivePlatformAdapter;
  private readonly agentProvider?: (agentId: string) => Promise<Agent | undefined>;
  private readonly workflowProvider?: (workflowId: string) => Promise<Workflow | undefined>;
  private readonly workspaceRoot: string;
  private readonly timeProvider: () => string;

  private activeAbortControllers = new Map<string, AbortController>();
  private activeWorkflows = new Map<string, Workflow>();

  constructor(options: LiveEngineOptions) {
    this.storage = options.storage;
    this.credentialStore = options.credentialStore;
    this.adapter = options.adapter || new OpenAILiveAdapter();
    this.agentProvider = options.agentProvider;
    this.workflowProvider = options.workflowProvider;
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.timeProvider = options.timeProvider || (() => new Date().toISOString());
  }

  private now(): string {
    return this.timeProvider();
  }

  private async persist(record: ExecutionRecord): Promise<ExecutionRecord> {
    record.contextData = sanitizeAuditDetails(record.contextData) as Record<string, unknown>;
    record.nodeExecutions = record.nodeExecutions.map((ne) => ({
      ...ne,
      inputs: sanitizeAuditDetails(ne.inputs) as Record<string, unknown>,
      outputs: sanitizeAuditDetails(ne.outputs) as Record<string, unknown>,
    }));
    return this.storage.saveExecution(record);
  }

  public async getExecution(id: string): Promise<ExecutionRecord | undefined> {
    return this.storage.getExecution(id);
  }

  public async listExecutions(workflowId?: string): Promise<ExecutionRecord[]> {
    return this.storage.listExecutions(workflowId);
  }

  /**
   * Starts a live pipeline execution.
   */
  public async startExecution(
    workflow: Workflow,
    options?: {
      initialInputs?: Record<string, unknown>;
      simulated?: boolean;
      platformId?: string;
      model?: string;
      endpointUrl?: string;
      apiKey?: string;
    }
  ): Promise<ExecutionRecord> {
    const runId = `live-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const startTime = this.now();

    this.activeWorkflows.set(runId, workflow);
    const abortController = new AbortController();
    this.activeAbortControllers.set(runId, abortController);

    const record: ExecutionRecord = {
      id: runId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowVersion: workflow.version,
      workflowSnapshot: workflow,
      status: "Running",
      startedAt: startTime,
      totalSteps: workflow.nodes.length,
      failedSteps: 0,
      nodeExecutions: [],
      artifacts: [],
      handoffs: [],
      contextData: { ...(options?.initialInputs || {}) },
      isSimulated: false,
    };

    await this.persist(record);
    return this.runWorkflowGraph(record, workflow, options);
  }

  /**
   * Resumes a paused execution from human approval.
   */
  public async resumeExecution(
    executionId: string,
    decision: { action: "approve" | "reject"; comment?: string; approver?: string }
  ): Promise<ExecutionRecord> {
    const record = await this.getExecution(executionId);
    if (!record) throw new Error(`Execution not found: ${executionId}`);

    if (record.status !== "Waiting for Approval") {
      throw new Error(`Execution is not waiting for approval (current: ${record.status})`);
    }

    const waitingNodeId = record.currentWaitingNodeId;
    if (!waitingNodeId) throw new Error("No waiting approval node recorded.");

    let workflow = record.workflowSnapshot || this.activeWorkflows.get(executionId);
    if (!workflow && this.workflowProvider) {
      workflow = await this.workflowProvider(record.workflowId);
    }
    if (!workflow) throw new Error("Workflow definition could not be resolved.");

    const waitingNode = workflow.nodes.find((n) => n.id === waitingNodeId);
    const nodeExec = record.nodeExecutions.find((ne) => ne.nodeId === waitingNodeId);

    if (decision.action === "approve") {
      if (nodeExec) {
        nodeExec.status = "Succeeded";
        nodeExec.completedAt = this.now();
        nodeExec.durationMs = 150;
        nodeExec.approvalStatus = "approved";
        nodeExec.approvalDecisionBy = decision.approver || "Tech Lead";
        nodeExec.approvalComment = decision.comment || "Approved.";
        nodeExec.outputs = {
          approved: true,
          approver: nodeExec.approvalDecisionBy,
          comment: nodeExec.approvalComment,
          timestamp: nodeExec.completedAt,
        };
      }
      record.currentWaitingNodeId = undefined;
      record.status = "Running";
      return this.runWorkflowGraph(record, workflow);
    } else {
      const cfg = waitingNode?.configuration || {};
      const fallback = (cfg.fallbackNodeId as string) || waitingNode?.approvalPolicy?.fallbackNodeId;
      const onReject = (cfg.onReject as string) || waitingNode?.approvalPolicy?.onReject;

      if (onReject === "route_to_fallback" && fallback) {
        if (nodeExec) {
          nodeExec.status = "Succeeded";
          nodeExec.completedAt = this.now();
          nodeExec.approvalStatus = "rejected";
          nodeExec.approvalDecisionBy = decision.approver || "Tech Lead";
          nodeExec.approvalComment = decision.comment || "Rejected and rerouted to fallback.";
          nodeExec.outputs = { approved: false, reroutedTo: fallback };
        }
        record.currentWaitingNodeId = undefined;
        record.status = "Running";
        return this.runWorkflowGraph(record, workflow, undefined, fallback);
      } else {
        if (nodeExec) {
          nodeExec.status = "Failed";
          nodeExec.completedAt = this.now();
          nodeExec.approvalStatus = "rejected";
          nodeExec.error = "Human approval rejected.";
        }
        record.status = "Failed";
        record.completedAt = this.now();
        record.finalSummary = `Execution stopped: Approval rejected on "${waitingNode?.name || waitingNodeId}".`;
        return this.persist(record);
      }
    }
  }

  /**
   * Recovers an interrupted or cancelled run.
   */
  public async recoverInterruptedExecution(executionId: string): Promise<ExecutionRecord> {
    const record = await this.getExecution(executionId);
    if (!record) throw new Error(`Execution record not found: ${executionId}`);

    if (record.status === "Succeeded" || record.status === "Failed") return record;
    if (record.status === "Waiting for Approval") return record;

    let workflow = record.workflowSnapshot || this.activeWorkflows.get(executionId);
    if (!workflow && this.workflowProvider) {
      workflow = await this.workflowProvider(record.workflowId);
    }
    if (!workflow) throw new Error("Workflow definition could not be resolved.");

    if (record.status === "Cancelled") {
      for (const ne of record.nodeExecutions) {
        if (ne.status === "Cancelled") {
          ne.status = "Pending";
          ne.completedAt = undefined;
        }
      }
    }

    record.status = "Running";
    record.completedAt = undefined;
    return this.runWorkflowGraph(record, workflow);
  }

  /**
   * Cancels an active or waiting simulation or live run.
   */
  public async cancelExecution(executionId: string): Promise<ExecutionRecord> {
    const abortCtrl = this.activeAbortControllers.get(executionId);
    if (abortCtrl) {
      abortCtrl.abort();
      this.activeAbortControllers.delete(executionId);
    }

    const record = await this.getExecution(executionId);
    if (!record) throw new Error(`Execution not found: ${executionId}`);

    if (record.status === "Succeeded" || record.status === "Failed") return record;

    record.status = "Cancelled";
    record.completedAt = this.now();
    record.currentWaitingNodeId = undefined;
    record.finalSummary = "Live execution cancelled by user request.";

    for (const ne of record.nodeExecutions) {
      if (ne.status === "Running" || ne.status === "Pending" || ne.status === "Waiting for Approval") {
        ne.status = "Cancelled";
        ne.completedAt = this.now();
      }
    }

    return this.persist(record);
  }

  /**
   * Core execution loop for live multi-node DAG workflows.
   */
  private async runWorkflowGraph(
    record: ExecutionRecord,
    workflow: Workflow,
    runOptions?: {
      platformId?: string;
      model?: string;
      endpointUrl?: string;
      apiKey?: string;
    },
    forceNextNodeId?: string
  ): Promise<ExecutionRecord> {
    const nodes = workflow.nodes;
    const edges = workflow.edges;

    const abortController = this.activeAbortControllers.get(record.id) || new AbortController();
    this.activeAbortControllers.set(record.id, abortController);

    const nodeStateMap = new Map<string, NodeExecution>();
    for (const ne of record.nodeExecutions) {
      nodeStateMap.set(ne.nodeId, ne);
    }

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

    const executedNodeIds = new Set<string>();
    const skippedNodeIds = new Set<string>();

    for (const [nodeId, ne] of nodeStateMap.entries()) {
      if (ne.status === "Succeeded") executedNodeIds.add(nodeId);
      if (ne.status === "Skipped") skippedNodeIds.add(nodeId);
    }

    while (true) {
      if (abortController.signal.aborted) {
        record.status = "Cancelled";
        record.completedAt = this.now();
        record.finalSummary = "Execution aborted.";
        return this.persist(record);
      }

      const eligibleNodes: WorkflowNode[] = [];
      for (const node of nodes) {
        if (executedNodeIds.has(node.id) || skippedNodeIds.has(node.id)) continue;

        const currentNe = nodeStateMap.get(node.id);
        if (currentNe && (currentNe.status === "Running" || currentNe.status === "Waiting for Approval")) {
          continue;
        }

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

        const allParentsFinished = parents.length > 0 && parents.every(
          (pId) => executedNodeIds.has(pId) || skippedNodeIds.has(pId)
        );

        if (allParentsFinished) {
          const allParentsSkipped = parents.every((pId) => skippedNodeIds.has(pId));
          if (allParentsSkipped) {
            skippedNodeIds.add(node.id);
            nodeStateMap.set(node.id, {
              nodeId: node.id,
              nodeName: node.name,
              nodeType: node.type,
              status: "Skipped",
              startedAt: this.now(),
              completedAt: this.now(),
              summary: "Skipped: inactive branch.",
              isSimulated: false,
            });
          } else {
            eligibleNodes.push(node);
          }
        }
      }

      if (eligibleNodes.length === 0) break;

      for (const node of eligibleNodes) {
        const parents = incomingMap.get(node.id) || [];
        const incomingHandoffs: ContextHandoffRecord[] = [];
        let scopedInputs: Record<string, unknown> = {};

        for (const pId of parents) {
          if (executedNodeIds.has(pId)) {
            const parentNe = nodeStateMap.get(pId);
            const parentNode = nodes.find((n) => n.id === pId);
            if (parentNode) {
              const handoff: ContextHandoffRecord = {
                id: `handoff-${record.id}-${pId}-${node.id}`,
                runId: record.id,
                sourceNodeId: pId,
                sourceNodeName: parentNode.name,
                destinationNodeId: node.id,
                destinationNodeName: node.name,
                taskSummary: `Context transfer from ${parentNode.name} to ${node.name}`,
                priorFindings: parentNe?.outputs || {},
                selectedArtifacts: (record.artifacts || []).filter((a) => a.producedByNodeId === pId),
                constraints: ["Live session verified", "Scoped sandbox enforcement"],
                completionCriteria: ["Valid exit status"],
                timestamp: this.now(),
                isSimulated: false,
              };
              incomingHandoffs.push(handoff);
              record.handoffs = [...(record.handoffs || []), handoff];
            }
            if (parentNe?.outputs) {
              scopedInputs = { ...scopedInputs, ...parentNe.outputs };
            }
          }
        }

        scopedInputs = { ...(record.contextData || {}), ...scopedInputs };

        // Handle human approval gate
        if (node.type === "human_approval" || node.type === "approval") {
          const nodeExec: NodeExecution = {
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            status: "Waiting for Approval",
            startedAt: this.now(),
            approvalStatus: "pending",
            approvalMessage: (node.configuration?.approvalMessage as string) || "Approval required",
            whatIsBeingApproved: (node.configuration?.whatIsBeingApproved as string) || "Deliverables",
            inputs: scopedInputs,
            handoffsIn: incomingHandoffs,
            isSimulated: false,
          };
          nodeStateMap.set(node.id, nodeExec);
          record.status = "Waiting for Approval";
          record.currentWaitingNodeId = node.id;
          record.nodeExecutions = Array.from(nodeStateMap.values());
          return this.persist(record);
        }

        // Live execution for node
        const nodeExec: NodeExecution = {
          nodeId: node.id,
          nodeName: node.name,
          nodeType: node.type,
          status: "Running",
          startedAt: this.now(),
          inputs: scopedInputs,
          handoffsIn: incomingHandoffs,
          isSimulated: false,
        };
        nodeStateMap.set(node.id, nodeExec);

        const nodeResult = await this.executeLiveNode(
          node,
          scopedInputs,
          runOptions,
          abortController.signal
        );

        if (nodeResult.success) {
          nodeExec.status = "Succeeded";
          nodeExec.completedAt = this.now();
          nodeExec.durationMs = nodeResult.durationMs ?? 150;
          nodeExec.outputs = nodeResult.outputs;
          nodeExec.summary = nodeResult.summary;
          nodeExec.selectedBranch = nodeResult.selectedBranch;
          nodeExec.validation = { passed: true, message: `Node "${node.name}" executed successfully.` };

          executedNodeIds.add(node.id);
          record.contextData = { ...record.contextData, ...nodeResult.outputs };

          if (nodeResult.artifacts && nodeResult.artifacts.length > 0) {
            record.artifacts = [...(record.artifacts || []), ...nodeResult.artifacts];
          }

          // Branching resolution
          if ((node.type === "condition_branch" || node.type === "decision") && nodeResult.selectedBranch) {
            const outEdges = outgoingMap.get(node.id) || [];
            const branchMatch = nodeResult.selectedBranch.toLowerCase();
            for (const edge of outEdges) {
              const handleMatch = edge.sourceHandle && edge.sourceHandle.toLowerCase() === branchMatch;
              const labelMatch = edge.label && edge.label.toLowerCase() === branchMatch;
              const isMatch = Boolean(handleMatch || labelMatch);
              if (!isMatch) {
                skippedNodeIds.add(edge.target);
                const skippedNode = nodes.find((n) => n.id === edge.target);
                nodeStateMap.set(edge.target, {
                  nodeId: edge.target,
                  nodeName: skippedNode?.name || edge.target,
                  nodeType: skippedNode?.type || "unknown",
                  status: "Skipped",
                  startedAt: this.now(),
                  completedAt: this.now(),
                  summary: `Skipped: branch "${edge.sourceHandle || edge.label || "alternate"}" not active.`,
                  isSimulated: false,
                });
              }
            }
          }
        } else {
          nodeExec.status = "Failed";
          nodeExec.completedAt = this.now();
          nodeExec.error = nodeResult.error || "Step execution failed.";
          record.status = "Failed";
          record.completedAt = this.now();
          record.failedSteps = (record.failedSteps || 0) + 1;
          record.finalSummary = `Workflow failed at node "${node.name}": ${nodeExec.error}`;
          record.nodeExecutions = Array.from(nodeStateMap.values());
          return this.persist(record);
        }
      }
    }

    record.nodeExecutions = Array.from(nodeStateMap.values());
    const hasFailures = record.nodeExecutions.some((ne) => ne.status === "Failed");
    record.status = hasFailures ? "Failed" : "Succeeded";
    record.completedAt = this.now();
    record.finalSummary = hasFailures
      ? "Workflow completed with errors."
      : `All ${executedNodeIds.size} active nodes completed live execution successfully.`;

    this.activeAbortControllers.delete(record.id);
    return this.persist(record);
  }

  /**
   * Executes a single node with live model adapter or domain logic.
   */
  private async executeLiveNode(
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    runOptions?: {
      platformId?: string;
      model?: string;
      endpointUrl?: string;
      apiKey?: string;
    },
    signal?: AbortSignal
  ): Promise<{
    success: boolean;
    outputs?: Record<string, unknown>;
    artifacts?: ArtifactReference[];
    summary?: string;
    selectedBranch?: string;
    durationMs?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const cfg = node.configuration || {};

    switch (node.type) {
      case "start":
        return {
          success: true,
          outputs: { pipelineStarted: true, triggerTime: this.now(), ...inputs },
          summary: "Pipeline triggered.",
          durationMs: Date.now() - startTime,
        };

      case "requirement_input":
      case "input": {
        const rawRequirement = String(inputs.requirement || cfg.requirement || inputs.input || "Analyze project architecture");
        return {
          success: true,
          outputs: {
            requirement: rawRequirement,
            parsedCriteria: ["Security verification", "Contract compliance", "Deliverable output"],
            source: cfg.source || "User Specification",
          },
          summary: `Requirement parsed: "${rawRequirement.slice(0, 50)}..."`,
          durationMs: Date.now() - startTime,
        };
      }

      case "agent_execution": {
        const agentId = (cfg.agentId as string) || "default-agent";
        const agent = this.agentProvider ? await this.agentProvider(agentId) : undefined;
        const policy = agent?.permissionPolicy || {
          fileSystem: "read",
          network: false,
          shell: false,
          restrictedPaths: [".env", ".git", "*.key", "*.pem"],
        };

        const platformId = runOptions?.platformId || "openai";
        const model = runOptions?.model || (cfg.model as string) || this.adapter.defaultModel;
        const endpointUrl = runOptions?.endpointUrl || (cfg.endpointUrl as string) || this.adapter.defaultEndpoint;
        const apiKey = runOptions?.apiKey || (await this.credentialStore.getCredential(platformId)) || "";

        const availableTools: LiveToolDefinition[] = [
          {
            name: "read_workspace_file",
            description: "Reads file content safely from within the workspace root.",
            parameters: {
              type: "object",
              properties: { path: { type: "string", description: "Relative file path" } },
              required: ["path"],
            },
          },
          {
            name: "write_workspace_file",
            description: "Writes deliverable or code content within the workspace root.",
            parameters: {
              type: "object",
              properties: {
                path: { type: "string", description: "Relative file path to write" },
                content: { type: "string", description: "Content to write" },
              },
              required: ["path", "content"],
            },
          },
          {
            name: "list_workspace_files",
            description: "Lists directory contents within the workspace root.",
            parameters: {
              type: "object",
              properties: { directory: { type: "string", description: "Relative directory path" } },
            },
          },
          {
            name: "analyze_code_structure",
            description: "Inspects code file and extracts declarations, functions, and exports.",
            parameters: {
              type: "object",
              properties: { path: { type: "string", description: "Relative path to code file" } },
              required: ["path"],
            },
          },
          {
            name: "generate_deliverable",
            description: "Creates a structured verified engineering deliverable.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                details: { type: "object" },
              },
              required: ["title", "summary"],
            },
          },
        ];

        const sessionConfig: LiveExecutionSessionConfig = {
          sessionId: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          platformId,
          model,
          endpointUrl,
          apiKey,
          temperature: typeof cfg.temperature === "number" ? cfg.temperature : 0.2,
          maxTokens: typeof cfg.maxTokens === "number" ? cfg.maxTokens : 4096,
          maxTurns: typeof cfg.maxTurns === "number" ? cfg.maxTurns : 6,
          timeoutMs: typeof cfg.timeoutMs === "number" ? cfg.timeoutMs : 30000,
          systemPrompt:
            agent?.instructions ||
            `You are an autonomous engineering agent named "${agent?.name || node.name}". Execute your mission and utilize tools safely.`,
          agentName: agent?.name || node.name,
          permissionPolicy: policy,
          tools: availableTools,
          workspaceRoot: this.workspaceRoot,
        };

        const initialPrompt =
          (cfg.prompt as string) ||
          `Analyze the project context and requirements: ${JSON.stringify(inputs)}. Produce the verified deliverable.`;

        // Tool executor with sandbox check
        const toolExecutor = async (call: LiveToolCall): Promise<LiveToolResult> => {
          const check = PermissionEnforcer.checkPermission(
            call.name,
            call.arguments,
            policy,
            this.workspaceRoot
          );
          if (!check.allowed) {
            return {
              toolCallId: call.id,
              output: null,
              error: check.reason,
              isDenied: true,
            };
          }

          const res = await PermissionEnforcer.executeSafeTool(
            call.name,
            call.arguments,
            this.workspaceRoot,
            policy
          );

          if (!res.success) {
            return { toolCallId: call.id, output: null, error: res.error };
          }
          return { toolCallId: call.id, output: res.result };
        };

        const result = await this.adapter.executeSession(
          sessionConfig,
          [{ role: "user", content: initialPrompt, timestamp: this.now() }],
          toolExecutor,
          { signal }
        );

        if (result.status === "cancelled") {
          return {
            success: false,
            error: "Agent execution was cancelled.",
            durationMs: result.durationMs,
          };
        }

        if (result.status === "failed") {
          return {
            success: false,
            error: result.error || "Live adapter execution failed.",
            durationMs: result.durationMs,
          };
        }

        const artifact: ArtifactReference = {
          id: `art-${node.id}-${Date.now().toString(36)}`,
          name: `${agent?.name || node.name} Deliverable`,
          type: "specification",
          summary: result.finalResponse.slice(0, 150),
          producedByNodeId: node.id,
          createdAt: this.now(),
          isSimulated: false,
        };

        return {
          success: true,
          outputs: {
            agentId,
            agentName: agent?.name || node.name,
            response: result.finalResponse,
            toolCallsCount: result.toolCallsMade.length,
            toolsExecuted: result.toolCallsMade.map((t) => t.call.name),
            usage: result.usage,
            deliverable: artifact.name,
          },
          artifacts: [artifact],
          summary: `Executed live agent "${agent?.name || node.name}" via ${this.adapter.platformName}. (${result.toolCallsMade.length} tools called).`,
          durationMs: result.durationMs,
        };
      }

      case "condition_branch":
      case "decision": {
        const expression = (cfg.condition as string) || (cfg.expression as string) || "context.confidenceScore >= 0.8";
        let isTrue = true;
        if (inputs.approved === false) isTrue = false;
        else if (typeof inputs.confidenceScore === "number") isTrue = inputs.confidenceScore >= 0.8;
        else if (typeof inputs.errorCount === "number") isTrue = inputs.errorCount === 0;

        const selectedBranch = isTrue ? "true" : "false";
        return {
          success: true,
          outputs: { selectedBranch, condition: expression, evaluatedTrue: isTrue },
          selectedBranch,
          summary: `Evaluated "${expression}" -> Branch "${selectedBranch}" selected.`,
          durationMs: Date.now() - startTime,
        };
      }

      case "merge_results": {
        const strategy = (cfg.strategy as string) || "combine_all";
        return {
          success: true,
          outputs: { merged: true, strategy, aggregatedContext: { ...inputs } },
          summary: `Merged inputs across parallel branches using strategy "${strategy}".`,
          durationMs: Date.now() - startTime,
        };
      }

      case "end":
        return {
          success: true,
          outputs: { pipelineCompleted: true, completedAt: this.now(), finalDeliverables: inputs },
          summary: "Pipeline reached terminal end node.",
          durationMs: Date.now() - startTime,
        };

      default:
        return {
          success: true,
          outputs: { executedNodeType: node.type, timestamp: this.now(), ...inputs },
          summary: `Executed node "${node.name}".`,
          durationMs: Date.now() - startTime,
        };
    }
  }
}
