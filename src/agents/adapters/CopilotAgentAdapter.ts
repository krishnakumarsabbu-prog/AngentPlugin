import { Agent } from "../../domain/agents/types";
import {
  PlatformAgentAdapter,
  PlatformExportResult,
  PlatformFieldSupport,
  PlatformKnownLimitation,
  PlatformInstallDestination,
  CompatibilitySupportLevel,
} from "./types";

export class CopilotAgentAdapter implements PlatformAgentAdapter {
  readonly platformId = "copilot" as const;
  readonly platformName = "GitHub Copilot";
  readonly version = "1.0.0";
  readonly isExperimental = false;

  readonly supportedArtifactTypes = ["copilot-instructions", "workspace-markdown"];

  readonly supportedFields = [
    "name",
    "role",
    "description",
    "objective",
    "instructions",
    "scope",
    "outOfScope",
    "operatingPrinciples",
    "assignedSkillIds",
    "permissionPolicy",
    "version",
  ];

  readonly unsupportedFields = [
    "toolDefinitions",
    "inputSchema",
    "outputSchema",
    "testScenarios",
  ];

  readonly limitations: PlatformKnownLimitation[] = [
    {
      title: "No Runtime Tool Execution",
      description: "GitHub Copilot instructions (.github/copilot-instructions.md) do not natively bind or execute runtime function tools. Declared tools are included purely as descriptive guidance.",
      impact: "high",
      mitigation: "Include tool invocation examples textually in the instructions section.",
    },
    {
      title: "No Runtime Schema Gating",
      description: "Copilot does not enforce input/output JSON Schemas at runtime. Schemas are rendered as documentation references for prompt adherence.",
      impact: "medium",
      mitigation: "Specify expected output formats and JSON examples in the instructions body.",
    },
    {
      title: "Advisory Permission Enforcement",
      description: "Copilot operates under the user's host VS Code environment permissions without a sandboxed permission enforcement layer.",
      impact: "high",
      mitigation: "Restricted paths and permissions are rendered as strong negative constraints in the prompt.",
    },
  ];

  readonly destinationRules: PlatformInstallDestination[] = [
    {
      scope: "workspace",
      suggestedRelativePath: ".github/copilot-instructions.md",
      displayTarget: ".github/copilot-instructions.md",
      ruleDescription: "Default workspace location automatically recognized by GitHub Copilot Chat in VS Code and GitHub.com.",
    },
  ];

  validateCompatibility(agent: Partial<Agent>): {
    supportLevel: CompatibilitySupportLevel;
    fieldSupport: PlatformFieldSupport[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    const fieldSupport: PlatformFieldSupport[] = [];

    // Check basic fields
    fieldSupport.push({
      field: "instructions",
      supportLevel: "native",
      notes: "Rendered directly as primary system instruction body.",
    });

    fieldSupport.push({
      field: "role",
      supportLevel: "native",
      notes: "Rendered prominently as persona directive.",
    });

    fieldSupport.push({
      field: "operatingPrinciples",
      supportLevel: "native",
      notes: "Formatted as priority markdown checklist.",
    });

    // Check tools
    if (agent.toolDefinitions && agent.toolDefinitions.length > 0) {
      warnings.push(
        `Agent defines ${agent.toolDefinitions.length} declarative tool(s), but GitHub Copilot does not support runtime tool execution. Tools will be documented textually as reference capabilities.`
      );
      fieldSupport.push({
        field: "toolDefinitions",
        supportLevel: "unsupported",
        notes: "Documented textually in markdown; cannot be invoked as real runtime tools.",
      });
    }

    // Check schemas
    if (agent.inputSchema || agent.outputSchema) {
      warnings.push(
        "Input/Output JSON Schemas cannot be strictly enforced at runtime by GitHub Copilot. They will be formatted as reference specifications."
      );
      fieldSupport.push({
        field: "inputSchema / outputSchema",
        supportLevel: "partial",
        notes: "Included as markdown reference schemas; runtime enforcement requires an external wrapper.",
      });
    }

    // Check permissions
    if (agent.permissionPolicy?.shell) {
      warnings.push(
        "Shell execution declaration is advisory in Copilot instructions. User confirmation in terminal remains manual."
      );
    }

    const supportLevel: CompatibilitySupportLevel =
      agent.toolDefinitions && agent.toolDefinitions.length > 0 ? "partial" : "native";

    return {
      supportLevel,
      fieldSupport,
      warnings,
    };
  }

  exportAgent(agent: Partial<Agent>): PlatformExportResult {
    const validation = this.validateCompatibility(agent);
    const fileName = "copilot-instructions.md";
    const relativePath = ".github/copilot-instructions.md";

    const content = this.generateMarkdown(agent);

    return {
      platformId: this.platformId,
      platformName: this.platformName,
      supportLevel: validation.supportLevel,
      exportFormat: "Markdown (.github/copilot-instructions.md)",
      files: [
        {
          relativePath,
          fileName,
          mimeType: "text/markdown",
          content,
          purpose: "GitHub Copilot repository-wide instruction directives.",
        },
      ],
      destination: this.destinationRules[0],
      warnings: validation.warnings,
      limitations: this.limitations,
      supportedFields: this.supportedFields,
      unsupportedFields: this.unsupportedFields,
      isSimulatedOrExperimental: false,
      statusDisclaimer: "Exported artifact configures GitHub Copilot workspace directives. Does not run an isolated agent runtime.",
    };
  }

  private generateMarkdown(agent: Partial<Agent>): string {
    const lines: string[] = [];
    lines.push(`<!-- Generated by AgentForge: ${agent.name || "Custom Agent"} v${agent.version || "1.0.0"} -->`);
    lines.push(`# ${agent.name || "Agent"}`);
    lines.push("");
    if (agent.role) {
      lines.push(`**Role:** ${agent.role}`);
      lines.push("");
    }
    if (agent.description) {
      lines.push(`> ${agent.description}`);
      lines.push("");
    }
    if (agent.objective) {
      lines.push("## Objective");
      lines.push(agent.objective);
      lines.push("");
    }
    if (agent.instructions) {
      lines.push("## Instructions");
      lines.push(agent.instructions);
      lines.push("");
    }
    if (agent.scope || agent.outOfScope) {
      lines.push("## Scope & Boundaries");
      if (agent.scope) lines.push(`**In-Scope:** ${agent.scope}`);
      if (agent.outOfScope) lines.push(`**Out-of-Scope:** ${agent.outOfScope}`);
      lines.push("");
    }
    if (agent.operatingPrinciples && agent.operatingPrinciples.length > 0) {
      lines.push("## Operating Principles");
      for (const p of agent.operatingPrinciples) {
        lines.push(`- ${p}`);
      }
      lines.push("");
    }
    if (agent.assignedSkillIds && agent.assignedSkillIds.length > 0) {
      lines.push("## Assigned Skills (Reference Knowledge)");
      for (const s of agent.assignedSkillIds) {
        lines.push(`- \`${s}\``);
      }
      lines.push("");
    }
    if (agent.toolDefinitions && agent.toolDefinitions.length > 0) {
      lines.push("## Declared Tool Capabilities (Informational)");
      lines.push("> *Note: GitHub Copilot does not execute these tools as runtime functions. They are documented here to guide expected behaviors.*");
      lines.push("");
      for (const t of agent.toolDefinitions) {
        lines.push(`### \`${t.id}\`: ${t.name}`);
        lines.push(`- **Purpose:** ${t.purpose || t.description}`);
        if (t.requiredPermissions && t.requiredPermissions.length > 0) {
          lines.push(`- **Declared Permissions:** ${t.requiredPermissions.join(", ")}`);
        }
        lines.push("");
      }
    }
    if (agent.permissionPolicy) {
      lines.push("## Security & Permission Guardrails");
      lines.push(`- **Read-Only Mode:** ${agent.permissionPolicy.readOnly ?? true}`);
      lines.push(`- **Workspace Confinement:** ${agent.permissionPolicy.workspaceAccess ?? true}`);
      lines.push(`- **Write Operations:** ${agent.permissionPolicy.writeOperations ?? false}`);
      lines.push(`- **Shell Command Requests:** ${agent.permissionPolicy.shell ? "Allowed (requires human approval)" : "Strictly Forbidden"}`);
      lines.push(`- **Network Access:** ${agent.permissionPolicy.network ? "Allowed" : "Forbidden"}`);
      if (agent.permissionPolicy.restrictedPaths && agent.permissionPolicy.restrictedPaths.length > 0) {
        lines.push(`- **Restricted Security Paths:** \`${agent.permissionPolicy.restrictedPaths.join(", ")}\``);
      }
      lines.push("");
    }
    return lines.join("\n");
  }
}
