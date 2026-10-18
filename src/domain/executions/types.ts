export type ExecutionStatus =
  | "Running"
  | "Succeeded"
  | "Failed"
  | "Cancelled"
  | "Pending";

export interface NodeExecution {
  nodeId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  summary?: string;
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowVersion: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  nodeExecutions: NodeExecution[];
  finalSummary?: string;
}
