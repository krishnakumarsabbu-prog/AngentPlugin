import { Agent, PermissionPolicy, ToolDefinition, JsonSchema } from "../domain/agents/types";
import { PlatformCompatibility } from "../domain/skills/types";

export type ValidationSeverity = "error" | "warning" | "suggestion";

export interface ValidationFinding {
  severity: ValidationSeverity;
  field: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationFinding[];
  warnings: ValidationFinding[];
  suggestions: ValidationFinding[];
}

export interface SkillSummaryForValidation {
  id: string;
  name: string;
  compatibility?: PlatformCompatibility[];
}

export interface AgentValidationContext {
  /** Existing agent ids in the repository, so duplicates can be detected. */
  existingIds: ReadonlySet<string>;
  /** Id being replaced on update, so it is not flagged as a duplicate. */
  selfId?: string;
  /** Known skills currently registered in AgentForge, used to detect missing skill references. */
  knownSkills: ReadonlyMap<string, SkillSummaryForValidation>;
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const ALLOWED_PLATFORMS: ReadonlyArray<PlatformCompatibility> = ["copilot", "claude", "openai", "neutral"];
const ALLOWED_STATUSES = ["Draft", "Ready", "Experimental"];
const ALLOWED_AVAILABILITY = ["always", "on-demand", "conditional"];

export const LEAST_PRIVILEGE_PERMISSIONS: PermissionPolicy = {
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

export function defaultAgentValidationContext(): AgentValidationContext {
  return {
    existingIds: new Set(),
    knownSkills: new Map(),
  };
}

export function validateAgent(
  agent: Partial<Agent>,
  ctx: AgentValidationContext = defaultAgentValidationContext()
): ValidationReport {
  const errors: ValidationFinding[] = [];
  const warnings: ValidationFinding[] = [];
  const suggestions: ValidationFinding[] = [];

  // ==========================================
  // 1. Identity Validation
  // ==========================================
  const name = typeof agent.name === "string" ? agent.name.trim() : "";
  if (!name) {
    errors.push({ severity: "error", field: "name", message: "Agent name is required." });
  } else if (name.length > 96) {
    errors.push({ severity: "error", field: "name", message: "Agent name must be 96 characters or fewer." });
  }

  const id = typeof agent.id === "string" ? agent.id.trim() : "";
  if (!id) {
    errors.push({ severity: "error", field: "id", message: "Agent ID is required." });
  } else {
    if (!ID_PATTERN.test(id)) {
      errors.push({
        severity: "error",
        field: "id",
        message: "Agent ID must contain only lowercase letters, digits, and hyphens (cannot start with a hyphen).",
      });
    }
    if (id.length > 64) {
      errors.push({ severity: "error", field: "id", message: "Agent ID must be 64 characters or fewer." });
    }
    if (ctx.existingIds.has(id) && id !== ctx.selfId) {
      errors.push({
        severity: "error",
        field: "id",
        message: `An agent with id "${id}" already exists.`,
      });
    }
  }

  const role = typeof agent.role === "string" ? agent.role.trim() : "";
  if (!role) {
    errors.push({ severity: "error", field: "role", message: "Agent role is required." });
  } else if (role.length > 120) {
    errors.push({ severity: "error", field: "role", message: "Agent role must be 120 characters or fewer." });
  }

  const version = typeof agent.version === "string" ? agent.version.trim() : "";
  if (!version) {
    errors.push({ severity: "error", field: "version", message: "Version is required." });
  } else if (!SEMVER_PATTERN.test(version)) {
    errors.push({
      severity: "error",
      field: "version",
      message: "Version must follow Semantic Versioning (e.g., 1.0.0 or 0.1.0-alpha).",
    });
  }

  if (agent.status && !ALLOWED_STATUSES.includes(agent.status)) {
    errors.push({
      severity: "error",
      field: "status",
      message: `Invalid status "${agent.status}". Allowed values: ${ALLOWED_STATUSES.join(", ")}.`,
    });
  }

  const description = typeof agent.description === "string" ? agent.description.trim() : "";
  if (!description) {
    warnings.push({ severity: "warning", field: "description", message: "A description is strongly recommended." });
  }

  // ==========================================
  // 2. Mission Validation
  // ==========================================
  const objective = typeof agent.objective === "string" ? agent.objective.trim() : "";
  if (!objective) {
    errors.push({ severity: "error", field: "objective", message: "Agent objective is required." });
  } else if (objective.length < 10) {
    warnings.push({
      severity: "warning",
      field: "objective",
      message: "Objective is very brief. Provide clear intent for optimal agent execution.",
    });
  }

  const instructions = typeof agent.instructions === "string" ? agent.instructions.trim() : "";
  if (!instructions) {
    errors.push({ severity: "error", field: "instructions", message: "System instructions are required." });
  } else if (instructions.length < 20) {
    warnings.push({
      severity: "warning",
      field: "instructions",
      message: "System instructions are unusually short. Detailed instructions produce more predictable behaviors.",
    });
  }

  if (agent.operatingPrinciples && Array.isArray(agent.operatingPrinciples)) {
    agent.operatingPrinciples.forEach((principle, idx) => {
      if (typeof principle !== "string" || !principle.trim()) {
        warnings.push({
          severity: "warning",
          field: `operatingPrinciples[${idx}]`,
          message: "Empty operating principle should be filled or removed.",
        });
      }
    });
  }

  // ==========================================
  // 3. Skills Validation (Missing skills & compatibility)
  // ==========================================
  const assignedSkillIds = Array.isArray(agent.assignedSkillIds) ? agent.assignedSkillIds : [];
  const agentPlatforms: PlatformCompatibility[] = Array.isArray(agent.compatibility) && agent.compatibility.length > 0
    ? agent.compatibility
    : ["neutral"];

  const seenSkillIds = new Set<string>();
  for (const skillId of assignedSkillIds) {
    if (typeof skillId !== "string" || !skillId.trim()) {
      errors.push({ severity: "error", field: "assignedSkillIds", message: "Empty skill ID in assigned skills list." });
      continue;
    }

    if (seenSkillIds.has(skillId)) {
      warnings.push({
        severity: "warning",
        field: "assignedSkillIds",
        message: `Duplicate skill assignment: "${skillId}".`,
      });
    }
    seenSkillIds.add(skillId);

    // Detect references to missing skills
    if (ctx.knownSkills.size > 0 && !ctx.knownSkills.has(skillId)) {
      errors.push({
        severity: "error",
        field: "assignedSkillIds",
        message: `Referenced skill "${skillId}" does not exist in the skill repository.`,
      });
      continue;
    }

    // Check skill compatibility with agent's target platforms
    const skillSummary = ctx.knownSkills.get(skillId);
    if (skillSummary && skillSummary.compatibility && skillSummary.compatibility.length > 0) {
      const skillCompat = skillSummary.compatibility;
      const isNeutral = skillCompat.includes("neutral") || agentPlatforms.includes("neutral");
      if (!isNeutral) {
        const overlap = agentPlatforms.filter((p) => skillCompat.includes(p));
        if (overlap.length === 0) {
          warnings.push({
            severity: "warning",
            field: "compatibility",
            message: `Skill "${skillSummary.name || skillId}" supports [${skillCompat.join(", ")}], which does not overlap with agent target platforms [${agentPlatforms.join(", ")}].`,
          });
        }
      }
    }
  }

  // ==========================================
  // 4. Tools Validation
  // ==========================================
  const tools = Array.isArray(agent.toolDefinitions) ? agent.toolDefinitions : [];
  const seenToolIds = new Set<string>();
  const permissionPolicy = agent.permissionPolicy || LEAST_PRIVILEGE_PERMISSIONS;

  tools.forEach((tool: ToolDefinition, idx: number) => {
    const tId = typeof tool.id === "string" ? tool.id.trim() : "";
    if (!tId) {
      errors.push({ severity: "error", field: `toolDefinitions[${idx}].id`, message: "Tool ID is required." });
    } else {
      if (!ID_PATTERN.test(tId)) {
        errors.push({
          severity: "error",
          field: `toolDefinitions[${idx}].id`,
          message: `Tool ID "${tId}" must contain only lowercase letters, digits, and hyphens.`,
        });
      }
      if (seenToolIds.has(tId)) {
        errors.push({
          severity: "error",
          field: `toolDefinitions[${idx}].id`,
          message: `Duplicate tool ID "${tId}".`,
        });
      }
      seenToolIds.add(tId);
    }

    const tName = typeof tool.name === "string" ? tool.name.trim() : "";
    if (!tName) {
      errors.push({ severity: "error", field: `toolDefinitions[${idx}].name`, message: "Tool name is required." });
    }

    if (tool.availability && !ALLOWED_AVAILABILITY.includes(tool.availability)) {
      errors.push({
        severity: "error",
        field: `toolDefinitions[${idx}].availability`,
        message: `Invalid tool availability "${tool.availability}". Allowed: ${ALLOWED_AVAILABILITY.join(", ")}.`,
      });
    }

    if (tool.schema) {
      validateJsonSchema(`toolDefinitions[${idx}].schema`, tool.schema, errors, warnings);
    }

    // Check required permissions against policy
    if (Array.isArray(tool.requiredPermissions)) {
      for (const reqPerm of tool.requiredPermissions) {
        if (reqPerm === "shell" && !permissionPolicy.shell) {
          warnings.push({
            severity: "warning",
            field: `toolDefinitions[${idx}].requiredPermissions`,
            message: `Tool "${tool.name || tId}" requires shell execution, but Agent permissions disable shell commands.`,
          });
        }
        if (reqPerm === "network" && !permissionPolicy.network) {
          warnings.push({
            severity: "warning",
            field: `toolDefinitions[${idx}].requiredPermissions`,
            message: `Tool "${tool.name || tId}" requires network access, but Agent permissions disable network.`,
          });
        }
        if (reqPerm === "write" && (permissionPolicy.readOnly || permissionPolicy.fileSystem === "read" || permissionPolicy.fileSystem === "none")) {
          warnings.push({
            severity: "warning",
            field: `toolDefinitions[${idx}].requiredPermissions`,
            message: `Tool "${tool.name || tId}" requires write operations, but Agent permissions are restricted to read-only.`,
          });
        }
      }
    }
  });

  // ==========================================
  // 5. Permissions Validation (Least-privilege)
  // ==========================================
  if (permissionPolicy.readOnly && permissionPolicy.writeOperations) {
    errors.push({
      severity: "error",
      field: "permissionPolicy.writeOperations",
      message: "Contradiction: Permission policy specifies both read-only and write operations.",
    });
  }

  if (permissionPolicy.readOnly && permissionPolicy.fileSystem === "readwrite") {
    warnings.push({
      severity: "warning",
      field: "permissionPolicy.fileSystem",
      message: "readOnly is true but fileSystem is 'readwrite'. Recommend setting fileSystem to 'read'.",
    });
  }

  if (permissionPolicy.shell && !permissionPolicy.humanApprovalRequired) {
    warnings.push({
      severity: "warning",
      field: "permissionPolicy.humanApprovalRequired",
      message: "Command execution (shell) is declared without human approval requirement. This violates least-privilege guidelines.",
    });
  }

  if (permissionPolicy.network && !permissionPolicy.humanApprovalRequired) {
    suggestions.push({
      severity: "suggestion",
      field: "permissionPolicy.humanApprovalRequired",
      message: "Consider enabling human approval when network declaration is granted.",
    });
  }

  if (typeof permissionPolicy.maxTokens === "number") {
    if (permissionPolicy.maxTokens <= 0) {
      errors.push({
        severity: "error",
        field: "permissionPolicy.maxTokens",
        message: "maxTokens must be greater than 0.",
      });
    } else if (permissionPolicy.maxTokens > 128000) {
      warnings.push({
        severity: "warning",
        field: "permissionPolicy.maxTokens",
        message: "maxTokens exceeds 128,000. Verify the target platform supports this context limit.",
      });
    }
  }

  // ==========================================
  // 6 & 7. Inputs and Outputs JSON Schema Validation
  // ==========================================
  if (agent.inputSchema) {
    validateJsonSchema("inputSchema", agent.inputSchema, errors, warnings);
  }
  if (agent.outputSchema) {
    validateJsonSchema("outputSchema", agent.outputSchema, errors, warnings);
  }

  // Check exampleInput / exampleOutput syntax if string
  if (agent.exampleInput && typeof agent.exampleInput === "string") {
    try {
      JSON.parse(agent.exampleInput);
    } catch {
      warnings.push({
        severity: "warning",
        field: "exampleInput",
        message: "Example input is not valid JSON string.",
      });
    }
  }

  if (agent.exampleOutput && typeof agent.exampleOutput === "string") {
    try {
      JSON.parse(agent.exampleOutput);
    } catch {
      warnings.push({
        severity: "warning",
        field: "exampleOutput",
        message: "Example output is not valid JSON string.",
      });
    }
  }

  // ==========================================
  // 8. Compatibility Validation
  // ==========================================
  if (agent.compatibility) {
    if (!Array.isArray(agent.compatibility) || agent.compatibility.length === 0) {
      suggestions.push({
        severity: "suggestion",
        field: "compatibility",
        message: "No target platforms specified. Defaulting to neutral (cross-platform).",
      });
    } else {
      for (const p of agent.compatibility) {
        if (!ALLOWED_PLATFORMS.includes(p)) {
          errors.push({
            severity: "error",
            field: "compatibility",
            message: `Unsupported target platform "${p}". Allowed: ${ALLOWED_PLATFORMS.join(", ")}.`,
          });
        }
      }
    }
  }

  // Target platform specific warnings
  if (agentPlatforms.includes("copilot") && tools.length > 0) {
    warnings.push({
      severity: "warning",
      field: "compatibility",
      message: "GitHub Copilot instructions (.github/copilot-instructions.md) do not natively bind declarative function tools.",
    });
  }

  // ==========================================
  // 9. Testing Scenarios Validation
  // ==========================================
  if (agent.testScenarios && Array.isArray(agent.testScenarios)) {
    agent.testScenarios.forEach((sc, idx) => {
      if (!sc.name || !sc.name.trim()) {
        warnings.push({
          severity: "warning",
          field: `testScenarios[${idx}].name`,
          message: "Test scenario name is missing.",
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

function validateJsonSchema(
  fieldPath: string,
  schema: unknown,
  errors: ValidationFinding[],
  warnings: ValidationFinding[]
): void {
  if (typeof schema !== "object" || schema === null) {
    errors.push({
      severity: "error",
      field: fieldPath,
      message: `${fieldPath} must be a valid JSON Schema object.`,
    });
    return;
  }

  const s = schema as Record<string, unknown>;
  if (s.type !== undefined) {
    const validTypes = ["object", "array", "string", "number", "integer", "boolean", "null"];
    if (typeof s.type !== "string" || !validTypes.includes(s.type)) {
      errors.push({
        severity: "error",
        field: `${fieldPath}.type`,
        message: `Invalid schema type "${String(s.type)}". Expected one of: ${validTypes.join(", ")}.`,
      });
    }
  }

  if (s.properties !== undefined) {
    if (typeof s.properties !== "object" || s.properties === null || Array.isArray(s.properties)) {
      errors.push({
        severity: "error",
        field: `${fieldPath}.properties`,
        message: `${fieldPath}.properties must be a key-value object map.`,
      });
    }
  }

  if (s.required !== undefined) {
    if (!Array.isArray(s.required) || !s.required.every((item) => typeof item === "string")) {
      errors.push({
        severity: "error",
        field: `${fieldPath}.required`,
        message: `${fieldPath}.required must be an array of property name strings.`,
      });
    }
  }
}
