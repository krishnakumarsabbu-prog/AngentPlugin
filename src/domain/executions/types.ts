import { Workflow } from "../workflows/types";

export type ExecutionStatus =
  | "Validating"
  | "Ready"
  | "Running"
  | "Waiting for Approval"
  | "Succeeded"
  | "Failed"
  | "Cancelled"
  | "Pending";

export type NodeExecutionStatus =
  | "Pending"
  | "Running"
  | "Waiting for Approval"
  | "Succeeded"
  | "Failed"
  | "Skipped"
  | "Cancelled";

export interface ArtifactReference {
  id: string;
  name: string;
  type: string; // e.g. "blueprint", "test_report", "code_patch", "summary"
  uri?: string;
  summary: string;
  producedByNodeId: string;
  createdAt: string;
  isSimulated: boolean;
}

export interface RetryAttemptRecord {
  attemptNumber: number;
  timestamp: string;
  error: string;
  backoffSeconds: number;
  succeeded: boolean;
}

export interface FailureDetails {
  hasFailed: boolean;
  reason?: string;
  error?: string;
  retryCount?: number;
  retriesExhausted?: boolean;
}

export interface ContextHandoffRecord {
  id: string;
  runId: string;
  sourceNodeId: string;
  sourceNodeName: string;
  destinationNodeId: string;
  destinationNodeName: string;
  taskSummary: string;
  priorFindings: Record<string, unknown> | string[];
  selectedArtifacts: ArtifactReference[];
  constraints: string[];
  expectedOutputSchema?: Record<string, unknown>;
  completionCriteria: string[];
  failureDetails?: FailureDetails;
  timestamp: string;
  isSimulated: boolean;
}

export interface NodeExecution {
  nodeId: string;
  nodeName?: string;
  nodeType?: string;
  status: NodeExecutionStatus | ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  summary?: string;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  retryCount?: number;
  retries?: RetryAttemptRecord[];
  isSimulated?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvalDecisionBy?: string;
  approvalComment?: string;
  approvalMessage?: string;
  whatIsBeingApproved?: string;
  selectedBranch?: string;
  handoffsIn?: ContextHandoffRecord[];
  handoffsOut?: ContextHandoffRecord[];
  validation?: { passed: boolean; message?: string; details?: unknown };
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  workflowName?: string;
  workflowVersion: string;
  workflowSnapshot?: Workflow;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  triggerType?: string;
  totalSteps?: number;
  failedSteps?: number;
  nodeExecutions: NodeExecution[];
  artifacts?: ArtifactReference[];
  contextData?: Record<string, unknown>;
  handoffs?: ContextHandoffRecord[];
  finalSummary?: string;
  error?: string;
  isSimulated: boolean;
  currentWaitingNodeId?: string;
}

export interface WorkflowExecutionEngine {
  startExecution(
    workflow: Workflow,
    options?: { initialInputs?: Record<string, unknown>; simulated?: boolean }
  ): Promise<ExecutionRecord>;

  resumeExecution(
    executionId: string,
    decision: { action: "approve" | "reject"; comment?: string; approver?: string }
  ): Promise<ExecutionRecord>;

  recoverInterruptedExecution?(executionId: string): Promise<ExecutionRecord>;

  cancelExecution(executionId: string): Promise<ExecutionRecord>;

  getExecution(executionId: string): Promise<ExecutionRecord | undefined>;

  listExecutions(workflowId?: string): Promise<ExecutionRecord[]>;
}
