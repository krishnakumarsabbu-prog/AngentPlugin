import { PlatformCompatibility } from "../skills/types";

export type EvaluationTargetType = "skill" | "agent" | "pipeline";

export type EvaluationCheckStatus = "passed" | "failed" | "warning" | "skipped";

export type EvaluationOverallStatus = "passed" | "failed" | "warning";

export interface EvaluationFinding {
  severity: "error" | "warning" | "suggestion";
  field: string;
  message: string;
  suggestedCorrection?: string;
}

export interface EvaluationCheck {
  id: string;
  name: string;
  category: string;
  status: EvaluationCheckStatus;
  message: string;
  errorDetails?: string;
  suggestedCorrection?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
}

export interface ConfigurableTestCase {
  id: string;
  name: string;
  description?: string;
  inputPayload: Record<string, unknown> | string;
  expectedOutputMatcher?: string | Record<string, unknown>;
  expectedStatus?: "Succeeded" | "Failed";
  timeoutSeconds?: number;
}

export interface EvaluationMetrics {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  durationMs: number;
}

export interface ResourceLink {
  targetType: EvaluationTargetType;
  targetId: string;
  targetName: string;
  version?: string;
  route: string;
}

export interface EvaluationReport {
  id: string;
  targetType: EvaluationTargetType;
  targetId: string;
  targetName: string;
  targetVersion: string;
  timestamp: string;
  overallStatus: EvaluationOverallStatus;
  metrics: EvaluationMetrics;
  checks: EvaluationCheck[];
  errors: string[];
  warnings: string[];
  suggestedCorrections: string[];
  resourceLink: ResourceLink;
  isSimulatedMock: true;
  disclaimer: string;
}

export interface EvaluationContext {
  knownSkillIds?: Set<string>;
  knownAgentIds?: Set<string>;
  knownWorkflowIds?: Set<string>;
  customTestCases?: ConfigurableTestCase[];
}
