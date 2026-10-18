export type WorkflowNodeType =
  | "agent"
  | "skill"
  | "input"
  | "output"
  | "approval"
  | "handoff"
  | "decision";

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  name: string;
  configuration: Record<string, unknown>;
  inputContract: { schema: Record<string, unknown> };
  outputContract: { schema: Record<string, unknown> };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
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
  status: Workflow["status"];
  version: string;
  updatedAt: string;
}
