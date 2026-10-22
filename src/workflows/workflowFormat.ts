import { Workflow } from "../domain/workflows/types";

export const CURRENT_WORKFLOW_SCHEMA_VERSION = "1.0.0";
export const CURRENT_WORKFLOW_SCHEMA_URI = "https://agentforge.dev/schemas/workflow-v1.json";
export const WORKFLOW_FORMAT_IDENTIFIER = "agentforge-pipeline" as const;

export interface DocumentedWorkflowPackage {
  $schema: string;
  format: "agentforge-pipeline";
  schemaVersion: string;
  exportedAt: string;
  workflow: Workflow;
}

/**
 * Serializes a workflow into the documented AgentForge workflow package format.
 */
export function exportWorkflowPackage(workflow: Workflow): DocumentedWorkflowPackage {
  return {
    $schema: CURRENT_WORKFLOW_SCHEMA_URI,
    format: WORKFLOW_FORMAT_IDENTIFIER,
    schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    workflow: {
      ...workflow,
      nodes: workflow.nodes.map((n) => ({
        ...n,
        position: { ...n.position },
        configuration: { ...n.configuration },
        inputContract: n.inputContract ? { ...n.inputContract } : undefined,
        outputContract: n.outputContract ? { ...n.outputContract } : undefined,
        retryPolicy: n.retryPolicy ? { ...n.retryPolicy } : undefined,
        approvalPolicy: n.approvalPolicy ? { ...n.approvalPolicy } : undefined,
        errorHandling: n.errorHandling ? { ...n.errorHandling } : undefined,
      })),
      edges: workflow.edges.map((e) => ({ ...e })),
      executionSettings: { ...workflow.executionSettings },
    },
  };
}

export interface ParseWorkflowResult {
  ok: boolean;
  workflow?: Workflow;
  error?: string;
  schemaVersion?: string;
  isDocumentedPackage?: boolean;
}

/**
 * Parses and verifies raw JSON or object into a Workflow, supporting both the
 * documented workflow package envelope and direct raw workflow definitions.
 */
export function parseWorkflowPackage(input: string | unknown): ParseWorkflowResult {
  let data: unknown;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      return { ok: false, error: "Invalid JSON format: failed to parse string." };
    }
  } else {
    data = input;
  }

  if (!data || typeof data !== "object") {
    return { ok: false, error: "Workflow definition must be a valid JSON object." };
  }

  const record = data as Record<string, unknown>;

  // Check if this is the documented workflow package format
  if (record.format === WORKFLOW_FORMAT_IDENTIFIER || record.$schema || record.workflow) {
    if (record.format && record.format !== WORKFLOW_FORMAT_IDENTIFIER) {
      return {
        ok: false,
        error: `Unsupported workflow format identifier: "${String(record.format)}". Expected "${WORKFLOW_FORMAT_IDENTIFIER}".`,
      };
    }

    const schemaVersion = typeof record.schemaVersion === "string" ? record.schemaVersion : "1.0.0";
    const major = parseInt(schemaVersion.split(".")[0], 10);
    if (isNaN(major) || major > 1) {
      return {
        ok: false,
        schemaVersion,
        error: `Unsupported schema version: "${schemaVersion}". This runtime only supports schema versions 1.x.`,
      };
    }

    const wf = record.workflow;
    if (!wf || typeof wf !== "object") {
      return {
        ok: false,
        schemaVersion,
        error: "Documented workflow package missing 'workflow' payload object.",
      };
    }

    const workflowObj = sanitizeWorkflow(wf as Partial<Workflow>);
    return {
      ok: true,
      workflow: workflowObj,
      schemaVersion,
      isDocumentedPackage: true,
    };
  }

  // Fallback to direct raw workflow object
  if (typeof record.name !== "string" && !Array.isArray(record.nodes)) {
    return {
      ok: false,
      error: "Supplied content does not match documented workflow package or valid workflow specification.",
    };
  }

  const rawSchemaVersion = typeof record.schemaVersion === "string" ? record.schemaVersion : "1.0.0";
  const major = parseInt(rawSchemaVersion.split(".")[0], 10);
  if (!isNaN(major) && major > 1) {
    return {
      ok: false,
      schemaVersion: rawSchemaVersion,
      error: `Unsupported schema version: "${rawSchemaVersion}". Supported versions: 1.x.`,
    };
  }

  return {
    ok: true,
    workflow: sanitizeWorkflow(record as Partial<Workflow>),
    schemaVersion: rawSchemaVersion,
    isDocumentedPackage: false,
  };
}

function sanitizeWorkflow(raw: Partial<Workflow>): Workflow {
  const now = new Date().toISOString();
  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : `wf-${Date.now().toString(36)}`,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Imported Workflow",
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    version: typeof raw.version === "string" ? raw.version.trim() : "1.0.0",
    status: raw.status || "Draft",
    nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
    edges: Array.isArray(raw.edges) ? raw.edges : [],
    executionSettings: raw.executionSettings || {
      maxParallelNodes: 2,
      retryPolicy: { maxRetries: 2, backoffSeconds: 5 },
      requireApprovalFor: [],
    },
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };
}
