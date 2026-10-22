import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  ExecutionRecord,
  NodeExecution,
  WorkflowDiffResult,
  NodeDiff,
  EdgeDiff,
  ExecutionFilters,
  ExecutionSortField,
  NodeConfigurationChange,
  ContractFieldChange,
} from "../types";

export function compareWorkflows(workflowA: Workflow, workflowB: Workflow): WorkflowDiffResult {
  const nodesA = workflowA.nodes || [];
  const nodesB = workflowB.nodes || [];
  const edgesA = workflowA.edges || [];
  const edgesB = workflowB.edges || [];

  const mapA = new Map<string, WorkflowNode>(nodesA.map((n) => [n.id, n]));
  const mapB = new Map<string, WorkflowNode>(nodesB.map((n) => [n.id, n]));

  const allNodeIds = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));
  const nodeDiffs: NodeDiff[] = [];

  let addedNodesCount = 0;
  let removedNodesCount = 0;
  let modifiedNodesCount = 0;
  let unchangedNodesCount = 0;

  for (const id of allNodeIds) {
    const nodeA = mapA.get(id);
    const nodeB = mapB.get(id);

    if (!nodeA && nodeB) {
      addedNodesCount++;
      nodeDiffs.push({
        nodeId: id,
        nodeName: nodeB.name,
        nodeType: nodeB.type,
        status: "added",
        configChanges: Object.entries(nodeB.configuration || {}).map(([field, after]) => ({
          field,
          before: undefined,
          after,
        })),
        agentChange: nodeB.configuration?.agentId
          ? { before: undefined, after: String(nodeB.configuration.agentId) }
          : undefined,
        skillChange: nodeB.configuration?.skillId
          ? { before: undefined, after: String(nodeB.configuration.skillId) }
          : undefined,
        contractChanges: [],
      });
    } else if (nodeA && !nodeB) {
      removedNodesCount++;
      nodeDiffs.push({
        nodeId: id,
        nodeName: nodeA.name,
        nodeType: nodeA.type,
        status: "removed",
        configChanges: Object.entries(nodeA.configuration || {}).map(([field, before]) => ({
          field,
          before,
          after: undefined,
        })),
        agentChange: nodeA.configuration?.agentId
          ? { before: String(nodeA.configuration.agentId), after: undefined }
          : undefined,
        skillChange: nodeA.configuration?.skillId
          ? { before: String(nodeA.configuration.skillId), after: undefined }
          : undefined,
        contractChanges: [],
      });
    } else if (nodeA && nodeB) {
      const configChanges: NodeConfigurationChange[] = [];
      const contractChanges: ContractFieldChange[] = [];

      const cfgA = nodeA.configuration || {};
      const cfgB = nodeB.configuration || {};
      const allCfgKeys = Array.from(new Set([...Object.keys(cfgA), ...Object.keys(cfgB)]));

      for (const key of allCfgKeys) {
        const valA = cfgA[key];
        const valB = cfgB[key];
        if (JSON.stringify(valA) !== JSON.stringify(valB)) {
          configChanges.push({ field: key, before: valA, after: valB });
        }
      }

      let agentChange: { before?: string; after?: string } | undefined = undefined;
      const agentA = (cfgA.agentId as string) || undefined;
      const agentB = (cfgB.agentId as string) || undefined;
      if (agentA !== agentB) {
        agentChange = { before: agentA, after: agentB };
      }

      let skillChange: { before?: string; after?: string } | undefined = undefined;
      const skillA = (cfgA.skillId as string) || undefined;
      const skillB = (cfgB.skillId as string) || undefined;
      if (skillA !== skillB) {
        skillChange = { before: skillA, after: skillB };
      }

      // Contracts comparison
      const extractContractFields = (contract?: any, ioObj?: any): Record<string, unknown> => {
        const fields: Record<string, unknown> = {};
        if (contract?.schema?.properties) {
          Object.assign(fields, contract.schema.properties);
        } else if (contract?.fields) {
          Object.assign(fields, contract.fields);
        }
        if (ioObj?.properties) {
          Object.assign(fields, ioObj.properties);
        } else if (ioObj && typeof ioObj === "object") {
          Object.assign(fields, ioObj);
        }
        return fields;
      };

      const inFieldsA = extractContractFields(nodeA.inputContract, nodeA.inputs);
      const inFieldsB = extractContractFields(nodeB.inputContract, nodeB.inputs);
      const allInKeys = Array.from(new Set([...Object.keys(inFieldsA), ...Object.keys(inFieldsB)]));
      for (const k of allInKeys) {
        if (JSON.stringify(inFieldsA[k]) !== JSON.stringify(inFieldsB[k])) {
          contractChanges.push({
            contract: "input",
            field: k,
            before: inFieldsA[k],
            after: inFieldsB[k],
          });
        }
      }

      const outFieldsA = extractContractFields(nodeA.outputContract, nodeA.outputs);
      const outFieldsB = extractContractFields(nodeB.outputContract, nodeB.outputs);
      const allOutKeys = Array.from(new Set([...Object.keys(outFieldsA), ...Object.keys(outFieldsB)]));
      for (const k of allOutKeys) {
        if (JSON.stringify(outFieldsA[k]) !== JSON.stringify(outFieldsB[k])) {
          contractChanges.push({
            contract: "output",
            field: k,
            before: outFieldsA[k],
            after: outFieldsB[k],
          });
        }
      }

      const isModified =
        nodeA.name !== nodeB.name ||
        nodeA.type !== nodeB.type ||
        configChanges.length > 0 ||
        agentChange !== undefined ||
        skillChange !== undefined ||
        contractChanges.length > 0;

      if (isModified) {
        modifiedNodesCount++;
      } else {
        unchangedNodesCount++;
      }

      nodeDiffs.push({
        nodeId: id,
        nodeName: nodeB.name,
        nodeType: nodeB.type,
        status: isModified ? "modified" : "unchanged",
        configChanges,
        agentChange,
        skillChange,
        contractChanges,
      });
    }
  }

  const edgeDiffs: EdgeDiff[] = [];
  const edgeMapA = new Map<string, WorkflowEdge>(edgesA.map((e) => [e.id || `${e.source}->${e.target}`, e]));
  const edgeMapB = new Map<string, WorkflowEdge>(edgesB.map((e) => [e.id || `${e.source}->${e.target}`, e]));

  const allEdgeKeys = Array.from(new Set([...edgeMapA.keys(), ...edgeMapB.keys()]));
  let addedEdgesCount = 0;
  let removedEdgesCount = 0;
  let modifiedEdgesCount = 0;
  let unchangedEdgesCount = 0;

  for (const key of allEdgeKeys) {
    const eA = edgeMapA.get(key);
    const eB = edgeMapB.get(key);

    if (!eA && eB) {
      addedEdgesCount++;
      edgeDiffs.push({
        edgeId: eB.id,
        source: eB.source,
        target: eB.target,
        status: "added",
        labelChange: eB.label ? { before: undefined, after: eB.label } : undefined,
      });
    } else if (eA && !eB) {
      removedEdgesCount++;
      edgeDiffs.push({
        edgeId: eA.id,
        source: eA.source,
        target: eA.target,
        status: "removed",
        labelChange: eA.label ? { before: eA.label, after: undefined } : undefined,
      });
    } else if (eA && eB) {
      const labelDiff = eA.label !== eB.label;
      if (labelDiff) {
        modifiedEdgesCount++;
        edgeDiffs.push({
          edgeId: eB.id,
          source: eB.source,
          target: eB.target,
          status: "modified",
          labelChange: { before: eA.label, after: eB.label },
        });
      } else {
        unchangedEdgesCount++;
        edgeDiffs.push({
          edgeId: eB.id,
          source: eB.source,
          target: eB.target,
          status: "unchanged",
        });
      }
    }
  }

  return {
    sourceType: "workflow",
    targetA: {
      id: workflowA.id,
      name: workflowA.name,
      version: workflowA.version,
      status: workflowA.status,
    },
    targetB: {
      id: workflowB.id,
      name: workflowB.name,
      version: workflowB.version,
      status: workflowB.status,
    },
    nodeDiffs,
    edgeDiffs,
    summary: {
      addedNodesCount,
      removedNodesCount,
      modifiedNodesCount,
      unchangedNodesCount,
      addedEdgesCount,
      removedEdgesCount,
      modifiedEdgesCount,
      unchangedEdgesCount,
      failurePointsA: [],
      failurePointsB: [],
    },
  };
}

export function compareExecutions(
  execA: ExecutionRecord,
  execB: ExecutionRecord,
  workflowA?: Workflow,
  workflowB?: Workflow
): WorkflowDiffResult {
  const nodeExecsA = execA.nodeExecutions || [];
  const nodeExecsB = execB.nodeExecutions || [];

  const mapNeA = new Map<string, NodeExecution>(nodeExecsA.map((ne) => [ne.nodeId, ne]));
  const mapNeB = new Map<string, NodeExecution>(nodeExecsB.map((ne) => [ne.nodeId, ne]));

  const allNodeIds = Array.from(new Set([...mapNeA.keys(), ...mapNeB.keys()]));
  const nodeDiffs: NodeDiff[] = [];

  const failurePointsA: string[] = [];
  const failurePointsB: string[] = [];

  let addedNodesCount = 0;
  let removedNodesCount = 0;
  let modifiedNodesCount = 0;
  let unchangedNodesCount = 0;

  for (const id of allNodeIds) {
    const neA = mapNeA.get(id);
    const neB = mapNeB.get(id);

    const name = neB?.nodeName || neA?.nodeName || id;
    const type = neB?.nodeType || neA?.nodeType || "unknown";

    if (neA?.status === "Failed") failurePointsA.push(id);
    if (neB?.status === "Failed") failurePointsB.push(id);

    if (!neA && neB) {
      addedNodesCount++;
      nodeDiffs.push({
        nodeId: id,
        nodeName: name,
        nodeType: type,
        status: "added",
        configChanges: [],
        contractChanges: [],
        runDetailsB: {
          status: neB.status,
          durationMs: neB.durationMs,
          validationPassed: neB.validation?.passed,
          validationMessage: neB.validation?.message,
          error: neB.error,
          isFailurePoint: neB.status === "Failed",
          retryCount: neB.retryCount,
        },
      });
    } else if (neA && !neB) {
      removedNodesCount++;
      nodeDiffs.push({
        nodeId: id,
        nodeName: name,
        nodeType: type,
        status: "removed",
        configChanges: [],
        contractChanges: [],
        runDetailsA: {
          status: neA.status,
          durationMs: neA.durationMs,
          validationPassed: neA.validation?.passed,
          validationMessage: neA.validation?.message,
          error: neA.error,
          isFailurePoint: neA.status === "Failed",
          retryCount: neA.retryCount,
        },
      });
    } else if (neA && neB) {
      const statusChanged = neA.status !== neB.status;
      const durationDiff = Math.abs((neA.durationMs || 0) - (neB.durationMs || 0)) > 50;
      const validationDiff = neA.validation?.passed !== neB.validation?.passed;
      const isModified = statusChanged || durationDiff || validationDiff || neA.error !== neB.error;

      if (isModified) modifiedNodesCount++;
      else unchangedNodesCount++;

      nodeDiffs.push({
        nodeId: id,
        nodeName: name,
        nodeType: type,
        status: isModified ? "modified" : "unchanged",
        configChanges: [],
        contractChanges: [],
        runDetailsA: {
          status: neA.status,
          durationMs: neA.durationMs,
          validationPassed:
            neA.validation?.passed !== undefined
              ? neA.validation.passed
              : (neA as any).validationPassed,
          validationMessage: neA.validation?.message || (neA as any).validationMessage,
          error: neA.error,
          isFailurePoint: neA.status === "Failed",
          retryCount: neA.retryCount !== undefined ? neA.retryCount : (neA.retries?.length || 0),
        },
        runDetailsB: {
          status: neB.status,
          durationMs: neB.durationMs,
          validationPassed:
            neB.validation?.passed !== undefined
              ? neB.validation.passed
              : (neB as any).validationPassed,
          validationMessage: neB.validation?.message || (neB as any).validationMessage,
          error: neB.error,
          isFailurePoint: neB.status === "Failed",
          retryCount: neB.retryCount !== undefined ? neB.retryCount : (neB.retries?.length || 0),
        },
      });
    }
  }

  let edgeDiffs: EdgeDiff[] = [];
  if (workflowA && workflowB) {
    const wfDiff = compareWorkflows(workflowA, workflowB);
    edgeDiffs = wfDiff.edgeDiffs;
  }

  const durationA = execA.durationMs || 0;
  const durationB = execB.durationMs || 0;

  return {
    sourceType: "execution",
    targetA: {
      id: execA.id,
      name: execA.workflowName || execA.workflowId,
      version: execA.workflowVersion,
      status: execA.status,
      finalSummary: execA.finalSummary,
      durationMs: execA.durationMs,
      startedAt: execA.startedAt,
      completedAt: execA.completedAt,
      isSimulated: execA.isSimulated,
    },
    targetB: {
      id: execB.id,
      name: execB.workflowName || execB.workflowId,
      version: execB.workflowVersion,
      status: execB.status,
      finalSummary: execB.finalSummary,
      durationMs: execB.durationMs,
      startedAt: execB.startedAt,
      completedAt: execB.completedAt,
      isSimulated: execB.isSimulated,
    },
    nodeDiffs,
    edgeDiffs,
    summary: {
      addedNodesCount,
      removedNodesCount,
      modifiedNodesCount,
      unchangedNodesCount,
      addedEdgesCount: edgeDiffs.filter((e) => e.status === "added").length,
      removedEdgesCount: edgeDiffs.filter((e) => e.status === "removed").length,
      modifiedEdgesCount: edgeDiffs.filter((e) => e.status === "modified").length,
      unchangedEdgesCount: edgeDiffs.filter((e) => e.status === "unchanged").length,
      durationDeltaMs: durationB - durationA,
      statusChanged: execA.status !== execB.status,
      failurePointsA,
      failurePointsB,
    },
  };
}

export function filterExecutions(
  executions: ExecutionRecord[],
  filters: ExecutionFilters
): ExecutionRecord[] {
  return executions.filter((rec) => {
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      const matchId = rec.id.toLowerCase().includes(q);
      const matchName = (rec.workflowName || "").toLowerCase().includes(q);
      const matchWfId = (rec.workflowId || "").toLowerCase().includes(q);
      const matchVersion = (rec.workflowVersion || "").toLowerCase().includes(q);
      const matchSummary = (rec.finalSummary || "").toLowerCase().includes(q);
      const matchTrigger = (rec.triggerType || "").toLowerCase().includes(q);
      const matchStatus = rec.status.toLowerCase().includes(q);

      if (!matchId && !matchName && !matchWfId && !matchVersion && !matchSummary && !matchTrigger && !matchStatus) {
        return false;
      }
    }

    if (filters.status && filters.status !== "all") {
      if (rec.status.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }
    }

    if (filters.workflowId && filters.workflowId !== "all") {
      if (rec.workflowId !== filters.workflowId) {
        return false;
      }
    }

    if (filters.dateRange && filters.dateRange !== "all") {
      const started = new Date(rec.startedAt).getTime();
      const now = Date.now();

      if (filters.dateRange === "today") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        if (started < startOfToday.getTime()) return false;
      } else if (filters.dateRange === "7days") {
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        if (started < sevenDaysAgo) return false;
      } else if (filters.dateRange === "30days") {
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        if (started < thirtyDaysAgo) return false;
      }
    }

    if (filters.startDate) {
      const startBound = new Date(filters.startDate).getTime();
      if (new Date(rec.startedAt).getTime() < startBound) return false;
    }
    if (filters.endDate) {
      const endBound = new Date(filters.endDate).getTime();
      if (new Date(rec.startedAt).getTime() > endBound) return false;
    }

    return true;
  });
}

export function sortExecutions(
  executions: ExecutionRecord[],
  sortBy: ExecutionSortField = "startedAt",
  sortOrder: "asc" | "desc" = "desc"
): ExecutionRecord[] {
  const sorted = [...executions];
  const mult = sortOrder === "asc" ? 1 : -1;

  sorted.sort((a, b) => {
    switch (sortBy) {
      case "startedAt": {
        const timeA = new Date(a.startedAt).getTime();
        const timeB = new Date(b.startedAt).getTime();
        return (timeA - timeB) * mult;
      }
      case "durationMs": {
        const durA = a.durationMs || 0;
        const durB = b.durationMs || 0;
        return (durA - durB) * mult;
      }
      case "status": {
        return a.status.localeCompare(b.status) * mult;
      }
      case "workflowName": {
        const nameA = a.workflowName || a.workflowId;
        const nameB = b.workflowName || b.workflowId;
        return nameA.localeCompare(nameB) * mult;
      }
      case "totalSteps": {
        const stepsA = a.totalSteps ?? a.nodeExecutions?.length ?? 0;
        const stepsB = b.totalSteps ?? b.nodeExecutions?.length ?? 0;
        return (stepsA - stepsB) * mult;
      }
      default:
        return 0;
    }
  });

  return sorted;
}
