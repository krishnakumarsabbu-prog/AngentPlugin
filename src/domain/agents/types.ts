import { PlatformCompatibility } from "../skills/types";

export type AgentStatus = "Draft" | "Ready" | "Experimental";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

export interface PermissionPolicy {
  network: boolean;
  fileSystem: "none" | "read" | "readwrite";
  shell: boolean;
  maxTokens: number;
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  role: string;
  objective: string;
  instructions: string;
  assignedSkillIds: string[];
  toolDefinitions: ToolDefinition[];
  permissionPolicy: PermissionPolicy;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  compatibility: PlatformCompatibility[];
  version: string;
  status: AgentStatus;
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
