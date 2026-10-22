import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowValidationReport,
  WorkflowValidationFinding,
} from "../domain/workflows/types";

export interface WorkflowValidationOptions {
  existingIds?: Set<string>;
  selfId?: string;
  knownAgentIds?: Set<string> | string[];
  knownSkillIds?: Set<string> | string[];
  schemaVersion?: string;
}

export const VALID_CONDITION_TYPES = [
  "expression",
  "field_match",
  "status_check",
  "threshold",
] as const;

export type ValidConditionType = (typeof VALID_CONDITION_TYPES)[number];

export const SUPPORTED_NODE_TYPES = [
  "start",
  "requirement_input",
  "agent_execution",
  "agent",
  "skill_invocation",
  "skill",
  "planning",
  "human_approval",
  "approval",
  "condition_branch",
  "decision",
  "context_handoff",
  "handoff",
  "parallel_execution",
  "parallel",
  "merge_results",
  "merge",
  "validation",
  "retry",
  "artifact_output",
  "end",
  "input",
  "output",
] as const;

export type SupportedNodeType = (typeof SUPPORTED_NODE_TYPES)[number];

export const ENTRY_NODE_TYPES = ["start", "requirement_input", "input"] as const;
export const TERMINAL_NODE_TYPES = ["end", "artifact_output", "output"] as const;

export const WorkflowValidator = {
  validateWorkflow,
  validateNodeConfiguration,
};

/**
 * Validates a single node's configuration, contracts, policies, and references.
 */
export function validateNodeConfiguration(
  node: WorkflowNode,
  allNodes: WorkflowNode[] = [],
  options: WorkflowValidationOptions = {}
): {
  valid: boolean;
  errors: WorkflowValidationFinding[];
  warnings: WorkflowValidationFinding[];
  suggestions: WorkflowValidationFinding[];
} {
  const errors: WorkflowValidationFinding[] = [];
  const warnings: WorkflowValidationFinding[] = [];
  const suggestions: WorkflowValidationFinding[] = [];

  const nodeId = node.id || "unknown";

  // 1. Basic node identity
  if (!node.name || !node.name.trim()) {
    errors.push({
      severity: "error",
      nodeId,
      message: `Node "${nodeId}" must have a non-empty display name.`,
    });
  }

  // 2. Unsupported node type check
  if (!SUPPORTED_NODE_TYPES.includes(node.type as SupportedNodeType)) {
    errors.push({
      severity: "error",
      nodeId,
      message: `Unsupported node type "${node.type}" on node "${node.name || nodeId}". Supported types include: ${SUPPORTED_NODE_TYPES.slice(0, 8).join(", ")}, etc.`,
    });
  }

  // 3. Contracts validation (JSON schema & example payloads)
  if (node.inputContract) {
    const { schema, examplePayload } = node.inputContract;
    if (schema !== undefined && schema !== null) {
      if (typeof schema !== "object" || Array.isArray(schema)) {
        errors.push({
          severity: "error",
          nodeId,
          message: `Node "${node.name || nodeId}" input contract schema must be a valid schema object.`,
        });
      }
    }
    if (typeof examplePayload === "string" && examplePayload.trim()) {
      try {
        JSON.parse(examplePayload);
      } catch {
        errors.push({
          severity: "error",
          nodeId,
          message: `Node "${node.name || nodeId}" input contract example payload is not valid JSON.`,
        });
      }
    }
  }

  if (node.outputContract) {
    const { schema, examplePayload } = node.outputContract;
    if (schema !== undefined && schema !== null) {
      if (typeof schema !== "object" || Array.isArray(schema)) {
        errors.push({
          severity: "error",
          nodeId,
          message: `Node "${node.name || nodeId}" output contract schema must be a valid schema object.`,
        });
      }
    }
    if (typeof examplePayload === "string" && examplePayload.trim()) {
      try {
        JSON.parse(examplePayload);
      } catch {
        errors.push({
          severity: "error",
          nodeId,
          message: `Node "${node.name || nodeId}" output contract example payload is not valid JSON.`,
        });
      }
    }
  }

  // 4. Timeout validation
  if (node.timeoutSeconds !== undefined && node.timeoutSeconds !== null) {
    if (typeof node.timeoutSeconds !== "number" || isNaN(node.timeoutSeconds) || node.timeoutSeconds <= 0) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Node "${node.name || nodeId}" timeout must be a positive number of seconds.`,
      });
    } else if (node.timeoutSeconds > 86400) {
      warnings.push({
        severity: "warning",
        nodeId,
        message: `Node "${node.name || nodeId}" timeout exceeds 24 hours (86400s).`,
      });
    }
  }

  // 5. Retry policy validation
  if (node.retryPolicy?.enabled) {
    if (node.retryPolicy.maxRetries < 0 || isNaN(node.retryPolicy.maxRetries)) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Node "${node.name || nodeId}" max retries cannot be negative.`,
      });
    }
    if (node.retryPolicy.backoffSeconds < 0 || isNaN(node.retryPolicy.backoffSeconds)) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Node "${node.name || nodeId}" retry backoff cannot be negative.`,
      });
    }
  }

  // 6. Approval policy validation
  if (node.approvalPolicy?.required) {
    if (!node.approvalPolicy.approverRole || !node.approvalPolicy.approverRole.trim()) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Node "${node.name || nodeId}" approval policy requires a designated approver role.`,
      });
    }
    if (node.approvalPolicy.timeoutMinutes !== undefined && node.approvalPolicy.timeoutMinutes <= 0) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Node "${node.name || nodeId}" approval timeout must be greater than 0 minutes.`,
      });
    }
  }

  // 7. Error handling fallback routing validation
  if (node.errorHandling?.action === "route_to_fallback") {
    if (!node.errorHandling.fallbackNodeId || !node.errorHandling.fallbackNodeId.trim()) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Node "${node.name || nodeId}" error-handling fallback node is not configured.`,
      });
    } else if (
      allNodes.length > 0 &&
      !allNodes.some((n) => n.id === node.errorHandling?.fallbackNodeId)
    ) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Node "${node.name || nodeId}" fallback node "${node.errorHandling.fallbackNodeId}" does not exist in workflow.`,
      });
    }
  }

  const cfg = node.configuration || {};
  const type = node.type;

  // 8. Type-specific validations
  if (type === "agent_execution" || type === "agent") {
    const agentId = (cfg.agentId as string) || "";
    if (!agentId.trim()) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Agent execution node "${node.name || nodeId}" requires a selected Agent ID.`,
      });
    } else if (options.knownAgentIds) {
      const known = options.knownAgentIds instanceof Set ? options.knownAgentIds : new Set(options.knownAgentIds);
      if (!known.has(agentId)) {
        errors.push({
          severity: "error",
          nodeId,
          message: `Agent execution node "${node.name || nodeId}" references missing or unregistered agent "${agentId}".`,
        });
      }
    }
  } else if (type === "skill_invocation" || type === "skill") {
    const skillId = (cfg.skillId as string) || "";
    if (!skillId.trim()) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Skill invocation node "${node.name || nodeId}" requires a selected Skill ID.`,
      });
    } else if (options.knownSkillIds) {
      const known = options.knownSkillIds instanceof Set ? options.knownSkillIds : new Set(options.knownSkillIds);
      if (!known.has(skillId)) {
        errors.push({
          severity: "error",
          nodeId,
          message: `Skill invocation node "${node.name || nodeId}" references missing or unregistered skill "${skillId}".`,
        });
      }
    }
  } else if (type === "human_approval" || type === "approval") {
    const approverRole =
      (cfg.approverRole as string) || node.approvalPolicy?.approverRole || "";
    const approvalMessage =
      (cfg.approvalMessage as string) || (cfg.message as string) || node.approvalPolicy?.message || "";
    const whatIsBeingApproved =
      (cfg.whatIsBeingApproved as string) || node.approvalPolicy?.whatIsBeingApproved || "";

    if (!approverRole.trim()) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Human approval node "${node.name || nodeId}" requires a designated approver role.`,
      });
    }
    if (!approvalMessage.trim()) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Human approval node "${node.name || nodeId}" must define an approval message.`,
      });
    }
    if (!whatIsBeingApproved.trim()) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Human approval node "${node.name || nodeId}" must define what artifact or plan is being approved.`,
      });
    }

    const onReject = (cfg.onReject as string) || node.approvalPolicy?.onReject;
    const fallback = (cfg.fallbackNodeId as string) || node.approvalPolicy?.fallbackNodeId;
    if (onReject === "route_to_fallback") {
      if (!fallback || !fallback.trim()) {
        errors.push({
          severity: "error",
          nodeId,
          message: `Human approval node "${node.name || nodeId}" rejects to fallback, but fallback node is missing.`,
        });
      } else if (allNodes.length > 0 && !allNodes.some((n) => n.id === fallback)) {
        errors.push({
          severity: "error",
          nodeId,
          message: `Human approval node "${node.name || nodeId}" fallback node "${fallback}" does not exist in workflow.`,
        });
      }
    }
  } else if (type === "condition_branch" || type === "decision") {
    const conditionType = (cfg.conditionType as string) || "expression";
    if (!VALID_CONDITION_TYPES.includes(conditionType as ValidConditionType)) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Condition node "${node.name || nodeId}" has unsupported condition type "${conditionType}".`,
      });
    }

    const expr =
      (cfg.conditionExpression as string) ||
      (cfg.conditionValue as string) ||
      (cfg.expression as string) ||
      "";
    if (!expr.trim()) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Condition node "${node.name || nodeId}" requires a condition expression or rule.`,
      });
    }

    const branches = Array.isArray(cfg.branches) ? cfg.branches : ["true", "false"];
    if (branches.length < 2) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Condition node "${node.name || nodeId}" must define at least two valid branch outputs.`,
      });
    }
  } else if (type === "context_handoff" || type === "handoff") {
    const fields = Array.isArray(cfg.forwardFields) ? cfg.forwardFields : [];
    const artifacts = Array.isArray(cfg.forwardArtifacts) ? cfg.forwardArtifacts : [];
    const includeMemory = cfg.includeMemory !== false;

    if (fields.length === 0 && artifacts.length === 0 && !includeMemory) {
      warnings.push({
        severity: "warning",
        nodeId,
        message: `Context handoff node "${node.name || nodeId}" does not forward any fields, artifacts, or memory.`,
      });
    }
  } else if (type === "validation") {
    const assertion = (cfg.assertion as string) || "";
    if (!assertion.trim()) {
      errors.push({
        severity: "error",
        nodeId,
        message: `Validation node "${node.name || nodeId}" requires assertion criteria.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Detects graph cycles in the workflow using Depth-First Search cycle detection.
 * Harness pipelines must be Directed Acyclic Graphs (DAGs).
 */
export function detectGraphCycles(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { hasCycle: boolean; cyclePath?: string[] } {
  const nodeMap = new Map<string, WorkflowNode>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    nodeMap.set(n.id, n);
    adj.set(n.id, []);
  }

  for (const e of edges) {
    if (e.source && e.target && adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.push(e.target);
    }
  }

  // 0 = unvisited, 1 = visiting (in recursion stack), 2 = visited
  const state = new Map<string, number>();
  let foundCycle: string[] | undefined;

  function dfs(currentId: string, currentStack: string[]): boolean {
    state.set(currentId, 1);
    currentStack.push(currentId);

    const neighbors = adj.get(currentId) || [];
    for (const nextId of neighbors) {
      const s = state.get(nextId) ?? 0;
      if (s === 1) {
        // Cycle detected
        const cycleStartIndex = currentStack.indexOf(nextId);
        foundCycle = currentStack.slice(cycleStartIndex).concat(nextId);
        return true;
      }
      if (s === 0) {
        if (dfs(nextId, currentStack)) return true;
      }
    }

    state.set(currentId, 2);
    currentStack.pop();
    return false;
  }

  for (const n of nodes) {
    if ((state.get(n.id) ?? 0) === 0) {
      if (dfs(n.id, [])) {
        return { hasCycle: true, cyclePath: foundCycle };
      }
    }
  }

  return { hasCycle: false };
}

/**
 * Complete workflow validation engine: DAG validation, contracts, reachability,
 * cycles, broken edges, branch connections, approval policies, and schema versioning.
 */
export function validateWorkflow(
  workflow: Partial<Workflow> & { schemaVersion?: string } | undefined,
  options: WorkflowValidationOptions = {}
): WorkflowValidationReport {
  const errors: WorkflowValidationFinding[] = [];
  const warnings: WorkflowValidationFinding[] = [];
  const suggestions: WorkflowValidationFinding[] = [];

  if (!workflow) {
    errors.push({ severity: "error", message: "Workflow definition is missing or empty." });
    return { valid: false, errors, warnings, suggestions };
  }

  // 1. Schema version validation
  const schemaVer = workflow.schemaVersion || options.schemaVersion;
  if (schemaVer) {
    const major = parseInt(schemaVer.split(".")[0], 10);
    if (isNaN(major) || major > 1) {
      errors.push({
        severity: "error",
        message: `Unsupported schema version "${schemaVer}". This runtime only supports version 1.x.`,
      });
    }
  }

  // 2. Name validation
  const name = (workflow.name ?? "").trim();
  if (!name) {
    errors.push({ severity: "error", message: "Workflow name is required." });
  } else if (name.length < 3) {
    warnings.push({ severity: "warning", message: "Workflow name should be at least 3 characters." });
  }

  // 3. Nodes validation
  const nodes: WorkflowNode[] = Array.isArray(workflow.nodes) ? workflow.nodes : [];
  const edges: WorkflowEdge[] = Array.isArray(workflow.edges) ? workflow.edges : [];

  if (nodes.length === 0) {
    errors.push({ severity: "error", message: "Workflow canvas must contain at least one node." });
    return { valid: false, errors, warnings, suggestions };
  }

  const nodeIds = new Set<string>();
  let hasStart = false;
  let hasEnd = false;
  const startNodeIds: string[] = [];
  const endNodeIds: string[] = [];

  for (const node of nodes) {
    if (!node.id || !node.id.trim()) {
      errors.push({ severity: "error", message: "Node found with missing ID." });
      continue;
    }

    if (nodeIds.has(node.id)) {
      errors.push({
        severity: "error",
        nodeId: node.id,
        message: `Duplicate node ID detected: "${node.id}".`,
      });
    }
    nodeIds.add(node.id);

    const type = node.type;
    if (ENTRY_NODE_TYPES.includes(type as any)) {
      hasStart = true;
      startNodeIds.push(node.id);
    }
    if (TERMINAL_NODE_TYPES.includes(type as any)) {
      hasEnd = true;
      endNodeIds.push(node.id);
    }

    // Run deep node configuration & contract validation
    const nodeRes = validateNodeConfiguration(node, nodes, options);
    errors.push(...nodeRes.errors);
    warnings.push(...nodeRes.warnings);
    suggestions.push(...nodeRes.suggestions);
  }

  if (!hasStart) {
    errors.push({
      severity: "error",
      message: "Workflow must have at least one 'Start' or 'Requirement Input' entry node.",
    });
  }

  if (!hasEnd) {
    errors.push({
      severity: "error",
      message: "Workflow must have at least one 'End' or 'Artifact Output' terminal node.",
    });
  }

  // 4. Edges validation
  const edgeSet = new Set<string>();
  const forwardAdj = new Map<string, string[]>();
  const backwardAdj = new Map<string, string[]>();
  const outgoingEdgesByNode = new Map<string, WorkflowEdge[]>();

  for (const node of nodes) {
    forwardAdj.set(node.id, []);
    backwardAdj.set(node.id, []);
    outgoingEdgesByNode.set(node.id, []);
  }

  for (const edge of edges) {
    if (!edge.source || !edge.target) {
      errors.push({
        severity: "error",
        edgeId: edge.id,
        message: `Edge "${edge.id || "unnamed"}" has incomplete source or target endpoint.`,
      });
      continue;
    }

    const hasSource = nodeIds.has(edge.source);
    const hasTarget = nodeIds.has(edge.target);

    if (!hasSource) {
      errors.push({
        severity: "error",
        edgeId: edge.id,
        message: `Edge references non-existent source node "${edge.source}".`,
      });
    }
    if (!hasTarget) {
      errors.push({
        severity: "error",
        edgeId: edge.id,
        message: `Edge references non-existent target node "${edge.target}".`,
      });
    }

    if (edge.source === edge.target) {
      errors.push({
        severity: "error",
        edgeId: edge.id,
        nodeId: edge.source,
        message: `Self-referencing loop detected on node "${edge.source}". Cycles are not supported.`,
      });
    }

    const key = `${edge.source}->${edge.target}`;
    if (edgeSet.has(key)) {
      warnings.push({
        severity: "warning",
        edgeId: edge.id,
        message: `Duplicate connection from "${edge.source}" to "${edge.target}".`,
      });
    }
    edgeSet.add(key);

    if (hasSource && hasTarget) {
      forwardAdj.get(edge.source)?.push(edge.target);
      backwardAdj.get(edge.target)?.push(edge.source);
      outgoingEdgesByNode.get(edge.source)?.push(edge);
    }
  }

  // 5. Cycle Detection
  const cycleCheck = detectGraphCycles(nodes, edges);
  if (cycleCheck.hasCycle && cycleCheck.cyclePath && cycleCheck.cyclePath.length > 0) {
    const cycleStr = cycleCheck.cyclePath.join(" -> ");
    errors.push({
      severity: "error",
      nodeId: cycleCheck.cyclePath[0],
      message: `Graph cycle detected: ${cycleStr}. Harness pipelines must be Directed Acyclic Graphs (DAGs).`,
    });
  }

  // 6. Branch Connection Validation for Condition Nodes
  for (const node of nodes) {
    if (node.type === "condition_branch" || node.type === "decision") {
      const cfg = node.configuration || {};
      const branches = Array.isArray(cfg.branches) ? cfg.branches : ["true", "false"];
      const outEdges = outgoingEdgesByNode.get(node.id) || [];

      if (outEdges.length < branches.length) {
        errors.push({
          severity: "error",
          nodeId: node.id,
          message: `Condition node "${node.name || node.id}" defines ${branches.length} branches but only has ${outEdges.length} outgoing connection(s). Each branch must connect to a target node.`,
        });
      }
    }
  }

  // 7. Reachability & Disconnected Node Analysis
  if (nodes.length > 1) {
    for (const node of nodes) {
      const isStart = ENTRY_NODE_TYPES.includes(node.type as any);
      const isEnd = TERMINAL_NODE_TYPES.includes(node.type as any);
      const inCount = backwardAdj.get(node.id)?.length || 0;
      const outCount = forwardAdj.get(node.id)?.length || 0;

      if (inCount === 0 && outCount === 0) {
        warnings.push({
          severity: "warning",
          nodeId: node.id,
          message: `Node "${node.name || node.id}" is disconnected from the workflow graph.`,
        });
      } else if (!isStart && inCount === 0) {
        warnings.push({
          severity: "warning",
          nodeId: node.id,
          message: `Node "${node.name || node.id}" has no incoming connections and is not a Start node.`,
        });
      } else if (!isEnd && outCount === 0) {
        warnings.push({
          severity: "warning",
          nodeId: node.id,
          message: `Node "${node.name || node.id}" has no outgoing connections and is not an End node.`,
        });
      }
    }
  }

  if (nodes.length > 1 && hasStart && hasEnd) {
    // Forward traversal from all start nodes
    const reachableFromStart = new Set<string>();
    const queue = [...startNodeIds];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!reachableFromStart.has(current)) {
        reachableFromStart.add(current);
        const nexts = forwardAdj.get(current) || [];
        for (const next of nexts) {
          if (!reachableFromStart.has(next)) {
            queue.push(next);
          }
        }
      }
    }

    // Flag unreachable nodes as errors
    for (const node of nodes) {
      if (!ENTRY_NODE_TYPES.includes(node.type as any) && !reachableFromStart.has(node.id)) {
        errors.push({
          severity: "error",
          nodeId: node.id,
          message: `Node "${node.name || node.id}" is unreachable from any Start or Entry node.`,
        });
      }
    }

    // Backward traversal from all end nodes along reversed edges
    const canReachEnd = new Set<string>();
    const backQueue = [...endNodeIds];
    while (backQueue.length > 0) {
      const current = backQueue.shift()!;
      if (!canReachEnd.has(current)) {
        canReachEnd.add(current);
        const prevs = backwardAdj.get(current) || [];
        for (const prev of prevs) {
          if (!canReachEnd.has(prev)) {
            backQueue.push(prev);
          }
        }
      }
    }

    // Flag dead ends (cannot reach terminal node) as warnings
    for (const node of nodes) {
      if (!TERMINAL_NODE_TYPES.includes(node.type as any) && reachableFromStart.has(node.id) && !canReachEnd.has(node.id)) {
        warnings.push({
          severity: "warning",
          nodeId: node.id,
          message: `Node "${node.name || node.id}" cannot reach any End or Terminal node (dead end).`,
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
