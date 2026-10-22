import type {
  Agent,
  AgentStatus,
  PlatformCompatibility,
  PermissionPolicy,
  ToolDefinition,
  JsonSchema,
  TestScenario,
  AgentExportFormat,
} from "../../../types";

export interface AgentBuilderFormState {
  name: string;
  id: string;
  description: string;
  category: string;
  role: string;
  version: string;
  status: AgentStatus;
  objective: string;
  instructions: string;
  scope: string;
  outOfScope: string;
  operatingPrinciples: string[];
  assignedSkillIds: string[];
  toolDefinitions: ToolDefinition[];
  permissionPolicy: PermissionPolicy;
  inputSchemaText: string;
  outputSchemaText: string;
  exampleInputText: string;
  exampleOutputText: string;
  compatibility: PlatformCompatibility[];
  exportFormat: AgentExportFormat;
  testScenarios: TestScenario[];
  changelog: string;
}

export const LEAST_PRIVILEGE_POLICY: PermissionPolicy = {
  network: false,
  fileSystem: "read",
  shell: false,
  maxTokens: 8000,
  readOnly: true,
  workspaceAccess: true,
  writeOperations: false,
  restrictedPaths: [".git", ".env", "*.pem", "*.key"],
  humanApprovalRequired: true,
};

export const DEFAULT_BUILDER_STATE: AgentBuilderFormState = {
  name: "",
  id: "",
  description: "",
  category: "Custom",
  role: "General Worker",
  version: "1.0.0",
  status: "Draft",
  objective: "",
  instructions: "",
  scope: "",
  outOfScope: "",
  operatingPrinciples: [
    "Operate within assigned boundaries and never assume elevated privileges.",
    "Produce deterministic, structured outputs conforming to declared contracts.",
  ],
  assignedSkillIds: [],
  toolDefinitions: [],
  permissionPolicy: { ...LEAST_PRIVILEGE_POLICY },
  inputSchemaText: JSON.stringify(
    {
      type: "object",
      properties: {
        task: { type: "string", description: "Primary task directive" },
      },
      required: ["task"],
    },
    null,
    2
  ),
  outputSchemaText: JSON.stringify(
    {
      type: "object",
      properties: {
        summary: { type: "string", description: "Summary of outcome" },
        status: { type: "string", enum: ["success", "needs_clarification", "failed"] },
      },
      required: ["summary", "status"],
    },
    null,
    2
  ),
  exampleInputText: JSON.stringify(
    {
      task: "Analyze the workspace and prepare architectural recommendations",
    },
    null,
    2
  ),
  exampleOutputText: JSON.stringify(
    {
      summary: "Completed review of workspace structure.",
      status: "success",
    },
    null,
    2
  ),
  compatibility: ["copilot", "claude", "openai", "neutral"],
  exportFormat: "agent-spec",
  testScenarios: [
    {
      id: "scenario-1",
      name: "Basic Task Adherence",
      description: "Verify that agent processes a standard directive within contract boundaries.",
      inputPayload: JSON.stringify({ task: "Verify agent contract inputs" }, null, 2),
      expectedOutcome: "Conforming output with status=success",
    },
  ],
  changelog: "1.0.0 — Initial configuration",
};

export function agentToBuilderState(agent: Agent): AgentBuilderFormState {
  return {
    name: agent.name || "",
    id: agent.id || "",
    description: agent.description || "",
    category: agent.category || "Custom",
    role: agent.role || "General Worker",
    version: agent.version || "1.0.0",
    status: agent.status || "Draft",
    objective: agent.objective || "",
    instructions: agent.instructions || "",
    scope: agent.scope || "",
    outOfScope: agent.outOfScope || "",
    operatingPrinciples: agent.operatingPrinciples ? [...agent.operatingPrinciples] : [],
    assignedSkillIds: agent.assignedSkillIds ? [...agent.assignedSkillIds] : [],
    toolDefinitions: agent.toolDefinitions ? agent.toolDefinitions.map((t) => ({ ...t })) : [],
    permissionPolicy: agent.permissionPolicy
      ? {
          ...LEAST_PRIVILEGE_POLICY,
          ...agent.permissionPolicy,
          restrictedPaths: agent.permissionPolicy.restrictedPaths
            ? [...agent.permissionPolicy.restrictedPaths]
            : [...(LEAST_PRIVILEGE_POLICY.restrictedPaths || [])],
        }
      : { ...LEAST_PRIVILEGE_POLICY },
    inputSchemaText: agent.inputSchema
      ? JSON.stringify(agent.inputSchema, null, 2)
      : DEFAULT_BUILDER_STATE.inputSchemaText,
    outputSchemaText: agent.outputSchema
      ? JSON.stringify(agent.outputSchema, null, 2)
      : DEFAULT_BUILDER_STATE.outputSchemaText,
    exampleInputText:
      typeof agent.exampleInput === "object"
        ? JSON.stringify(agent.exampleInput, null, 2)
        : typeof agent.exampleInput === "string"
        ? agent.exampleInput
        : DEFAULT_BUILDER_STATE.exampleInputText,
    exampleOutputText:
      typeof agent.exampleOutput === "object"
        ? JSON.stringify(agent.exampleOutput, null, 2)
        : typeof agent.exampleOutput === "string"
        ? agent.exampleOutput
        : DEFAULT_BUILDER_STATE.exampleOutputText,
    compatibility: agent.compatibility && agent.compatibility.length > 0
      ? [...agent.compatibility]
      : ["copilot", "claude", "openai", "neutral"],
    exportFormat: agent.exportFormat || "agent-spec",
    testScenarios: agent.testScenarios ? agent.testScenarios.map((s) => ({ ...s })) : [],
    changelog: agent.changelog || "",
  };
}

export function builderStateToAgent(state: AgentBuilderFormState): Partial<Agent> {
  let inputSchema: JsonSchema = { type: "object" };
  try {
    inputSchema = JSON.parse(state.inputSchemaText);
  } catch {
    // fallback
  }

  let outputSchema: JsonSchema = { type: "object" };
  try {
    outputSchema = JSON.parse(state.outputSchemaText);
  } catch {
    // fallback
  }

  return {
    id: state.id.trim(),
    name: state.name.trim(),
    description: state.description.trim(),
    category: state.category.trim(),
    role: state.role.trim(),
    version: state.version.trim(),
    status: state.status,
    objective: state.objective.trim(),
    instructions: state.instructions,
    scope: state.scope.trim() || undefined,
    outOfScope: state.outOfScope.trim() || undefined,
    operatingPrinciples: state.operatingPrinciples.map((p) => p.trim()).filter(Boolean),
    assignedSkillIds: [...state.assignedSkillIds],
    toolDefinitions: state.toolDefinitions.map((t) => ({ ...t })),
    permissionPolicy: { ...state.permissionPolicy },
    inputSchema,
    outputSchema,
    exampleInput: state.exampleInputText,
    exampleOutput: state.exampleOutputText,
    compatibility: [...state.compatibility],
    exportFormat: state.exportFormat,
    testScenarios: state.testScenarios.map((s) => ({ ...s })),
    changelog: state.changelog,
  };
}

export function suggestAgentId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "new-agent";
}
