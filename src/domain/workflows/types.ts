export type WorkflowNodeType =
  | "start"
  | "requirement_input"
  | "skill_invocation"
  | "agent_execution"
  | "planning"
  | "human_approval"
  | "condition_branch"
  | "context_handoff"
  | "parallel_execution"
  | "merge_results"
  | "validation"
  | "retry"
  | "artifact_output"
  | "end"
  | "agent"
  | "skill"
  | "input"
  | "output"
  | "approval"
  | "handoff"
  | "decision";

export interface NodeRetryPolicy {
  enabled: boolean;
  maxRetries: number;
  backoffSeconds: number;
  retryOnErrors?: string[];
}

export interface NodeApprovalPolicy {
  required: boolean;
  approverRole?: string;
  timeoutMinutes?: number;
  message?: string;
  whatIsBeingApproved?: string;
  onApprove?: "proceed" | "proceed_with_notes";
  onReject?: "halt" | "route_to_fallback" | "request_revision";
  fallbackNodeId?: string;
}

export interface NodeErrorHandling {
  action: "halt" | "continue_with_warning" | "route_to_fallback" | "retry";
  fallbackNodeId?: string;
  customErrorMessage?: string;
  logLevel?: "error" | "warn" | "info";
}

export interface NodeContractSchema {
  schema: Record<string, unknown>;
  requiredFields?: string[];
  description?: string;
  examplePayload?: string | Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  description?: string;
  configuration: Record<string, unknown>;
  inputContract?: NodeContractSchema;
  outputContract?: NodeContractSchema;
  timeoutSeconds?: number;
  retryPolicy?: NodeRetryPolicy;
  approvalPolicy?: NodeApprovalPolicy;
  errorHandling?: NodeErrorHandling;
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface ExecutionSettings {
  maxParallelNodes: number;
  retryPolicy: {
    maxRetries: number;
    backoffSeconds: number;
  };
  requireApprovalFor: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  executionSettings: ExecutionSettings;
  status: "Draft" | "Ready" | "Active";
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  status: Workflow["status"];
  version: string;
  nodeCount: number;
  updatedAt: string;
}

export interface WorkflowValidationFinding {
  severity: "error" | "warning" | "suggestion";
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface WorkflowValidationReport {
  valid: boolean;
  errors: WorkflowValidationFinding[];
  warnings: WorkflowValidationFinding[];
  suggestions: WorkflowValidationFinding[];
}
