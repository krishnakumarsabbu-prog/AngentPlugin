import { PlatformCompatibility } from "../skills/types";

export type AgentStatus = "Draft" | "Ready" | "Experimental";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  schema?: Record<string, unknown>;
  purpose?: string;
  availability?: "always" | "on-demand" | "conditional";
  requiredPermissions?: string[];
}

export interface PermissionPolicy {
  network: boolean;
  fileSystem: "none" | "read" | "readwrite";
  shell: boolean;
  maxTokens: number;
  readOnly?: boolean;
  workspaceAccess?: boolean;
  writeOperations?: boolean;
  restrictedPaths?: string[];
  humanApprovalRequired?: boolean;
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

export interface TestScenario {
  id: string;
  name: string;
  description?: string;
  inputPayload?: string | Record<string, unknown>;
  expectedOutcome?: string;
  lastEvaluationResult?: {
    passed: boolean;
    score: number;
    notes: string;
    evaluatedAt: string;
  };
}

export type AgentExportFormat =
  | "agent-spec"
  | "copilot-instructions"
  | "claude-subagent"
  | "openai-assistant";

export interface Agent {
  id: string;
  name: string;
  description: string;
  category?: string;
  role: string;
  objective: string;
  instructions: string;
  scope?: string;
  outOfScope?: string;
  operatingPrinciples?: string[];
  assignedSkillIds: string[];
  toolDefinitions: ToolDefinition[];
  permissionPolicy: PermissionPolicy;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  exampleInput?: string | Record<string, unknown>;
  exampleOutput?: string | Record<string, unknown>;
  compatibility: PlatformCompatibility[];
  exportFormat?: AgentExportFormat;
  testScenarios?: TestScenario[];
  version: string;
  status: AgentStatus;
  changelog?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  version: string;
  updatedAt: string;
}
