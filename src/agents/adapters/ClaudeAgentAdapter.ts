import { Agent } from "../../domain/agents/types";
import {
  PlatformAgentAdapter,
  PlatformExportResult,
  PlatformFieldSupport,
  PlatformKnownLimitation,
  PlatformInstallDestination,
  CompatibilitySupportLevel,
} from "./types";

export class ClaudeAgentAdapter implements PlatformAgentAdapter {
  readonly platformId = "claude" as const;
  readonly platformName = "Claude / Claude Code";
  readonly version = "1.0.0";
  readonly isExperimental = false;

  readonly supportedArtifactTypes = [
    "CLAUDE.md",
    "claude-subagent-xml",
    "claude-tools-spec",
  ];

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
    "toolDefinitions",
    "permissionPolicy",
    "inputSchema",
    "outputSchema",
    "version",
  ];

  readonly unsupportedFields = ["testScenarios"];

  readonly limitations: PlatformKnownLimitation[] = [
    {
      title: "Claude Web Project Knowledge Manual Step",
      description: "For Claude web projects (claude.ai), exported instructions must be manually added to Project Knowledge or Custom Instructions.",
      impact: "medium",
      mitigation: "Use the exported CLAUDE.md content directly in Claude Project Knowledge.",
    },
    {
      title: "Interactive Tool Confirmation Required",
      description: "Claude Code CLI prompts for human confirmation for terminal commands or file modifications unless explicitly authorized by flag.",
      impact: "low",
      mitigation: "AgentForge least-privilege policies align naturally with Claude Code human-in-the-loop safeguards.",
    },
    {
      title: "Context Window Token Budgets",
      description: "Extensive tool definitions and operating principles consume system prompt token quotas in Claude conversations.",
      impact: "low",
      mitigation: "Keep tool descriptions concise and prune unused tools.",
    },
  ];

  readonly destinationRules: PlatformInstallDestination[] = [
    {
      scope: "workspace",
      suggestedRelativePath: "CLAUDE.md",
      displayTarget: "CLAUDE.md",
      ruleDescription: "Root project instructions recognized automatically by Claude Code CLI and Claude Desktop.",
    },
    {
      scope: "workspace",
      suggestedRelativePath: ".claude/agents/{id}.md",
      displayTarget: ".claude/agents/{id}.md",
      ruleDescription: "Subagent prompt template for modular role invocation in Claude Code workspaces.",
    },
  ];

  validateCompatibility(agent: Partial<Agent>): {
    supportLevel: CompatibilitySupportLevel;
    fieldSupport: PlatformFieldSupport[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    const fieldSupport: PlatformFieldSupport[] = [];

    fieldSupport.push({
      field: "instructions",
      supportLevel: "native",
      notes: "Parsed as system directives or CLAUDE.md guide.",
    });

    fieldSupport.push({
      field: "toolDefinitions",
      supportLevel: "native",
      notes: "Directly maps to Claude tool use specifications (input_schema and description).",
    });

    fieldSupport.push({
      field: "permissionPolicy",
      supportLevel: "native",
      notes: "Guides Claude Code tool execution permissions and security constraints.",
    });

    if (agent.permissionPolicy?.shell && !agent.permissionPolicy?.humanApprovalRequired) {
      warnings.push(
        "Shell execution is declared without human approval. Claude Code CLI by default will still enforce interactive tool approval prompts."
      );
    }

    if (agent.toolDefinitions && agent.toolDefinitions.some((t) => !t.schema || typeof t.schema !== "object")) {
      warnings.push(
        "One or more tools lack a JSON parameter schema. Claude tool use requires an input_schema object."
      );
    }

    return {
      supportLevel: "native",
      fieldSupport,
      warnings,
    };
  }

  exportAgent(agent: Partial<Agent>): PlatformExportResult {
    const validation = this.validateCompatibility(agent);
    const safeId = (agent.id || "agent").toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    const claudeMdContent = this.generateClaudeMd(agent);
    const subagentXmlContent = this.generateSubagentXml(agent);
    const toolsJsonContent = this.generateToolsJson(agent);

    return {
      platformId: this.platformId,
      platformName: this.platformName,
      supportLevel: validation.supportLevel,
      exportFormat: "Claude Project & Subagent Bundle (CLAUDE.md + Tools Spec)",
      files: [
        {
          relativePath: "CLAUDE.md",
          fileName: "CLAUDE.md",
          mimeType: "text/markdown",
          content: claudeMdContent,
          purpose: "Workspace guidance document for Claude Code CLI and Claude Projects.",
        },
        {
          relativePath: `.claude/agents/${safeId}.md`,
          fileName: `${safeId}.md`,
          mimeType: "text/markdown",
          content: subagentXmlContent,
          purpose: "Structured XML subagent specification for Claude prompt caching.",
        },
        {
          relativePath: `.claude/tools/${safeId}-tools.json`,
          fileName: `${safeId}-tools.json`,
          mimeType: "application/json",
          content: toolsJsonContent,
          purpose: "Anthropic Claude API compatible tool use schemas array.",
        },
      ],
      destination: this.destinationRules[0],
      warnings: validation.warnings,
      limitations: this.limitations,
      supportedFields: this.supportedFields,
      unsupportedFields: this.unsupportedFields,
      isSimulatedOrExperimental: false,
      statusDisclaimer: "Exported artifacts configure Claude workspace knowledge and tool declarations. Does not execute LLM models from the editor.",
    };
  }

  private generateClaudeMd(agent: Partial<Agent>): string {
    const lines: string[] = [];
    lines.push(`# ${agent.name || "Agent"} Guide (v${agent.version || "1.0.0"})`);
    lines.push("");
    if (agent.role) lines.push(`**Role:** ${agent.role}\n`);
    if (agent.objective) lines.push(`## Core Objective\n${agent.objective}\n`);
    if (agent.instructions) lines.push(`## Instructions & Workflows\n${agent.instructions}\n`);
    if (agent.operatingPrinciples && agent.operatingPrinciples.length > 0) {
      lines.push("## Operating Principles");
      for (const p of agent.operatingPrinciples) lines.push(`- ${p}`);
      lines.push("");
    }
    if (agent.permissionPolicy) {
      lines.push("## Permission Boundaries");
      lines.push(`- Read-Only: ${agent.permissionPolicy.readOnly ?? true}`);
      lines.push(`- Workspace Confinement: ${agent.permissionPolicy.workspaceAccess ?? true}`);
      lines.push(`- Shell Allowed: ${agent.permissionPolicy.shell ? "Yes (Interactive approval required)" : "No"}`);
      if (agent.permissionPolicy.restrictedPaths && agent.permissionPolicy.restrictedPaths.length > 0) {
        lines.push(`- Restricted Paths: \`${agent.permissionPolicy.restrictedPaths.join(", ")}\``);
      }
      lines.push("");
    }
    return lines.join("\n");
  }

  private generateSubagentXml(agent: Partial<Agent>): string {
    const lines: string[] = [];
    lines.push(`<agent id="${agent.id || "agent"}" version="${agent.version || "1.0.0"}">`);
    lines.push(`  <name>${agent.name || "Agent"}</name>`);
    lines.push(`  <role>${agent.role || ""}</role>`);
    lines.push(`  <objective>${agent.objective || ""}</objective>`);
    lines.push("");
    lines.push("  <system_instructions>");
    lines.push(agent.instructions || "");
    lines.push("  </system_instructions>");
    lines.push("");
    if (agent.operatingPrinciples && agent.operatingPrinciples.length > 0) {
      lines.push("  <operating_principles>");
      for (const p of agent.operatingPrinciples) {
        lines.push(`    <principle>${p}</principle>`);
      }
      lines.push("  </operating_principles>");
      lines.push("");
    }
    if (agent.toolDefinitions && agent.toolDefinitions.length > 0) {
      lines.push("  <declared_tools>");
      for (const t of agent.toolDefinitions) {
        lines.push(`    <tool id="${t.id}" availability="${t.availability || "always"}">`);
        lines.push(`      <name>${t.name}</name>`);
        lines.push(`      <purpose>${t.purpose || t.description}</purpose>`);
        lines.push("    </tool>");
      }
      lines.push("  </declared_tools>");
      lines.push("");
    }
    lines.push("</agent>");
    return lines.join("\n");
  }

  private generateToolsJson(agent: Partial<Agent>): string {
    const tools = (agent.toolDefinitions || []).map((t) => ({
      name: t.id.replace(/-/g, "_"),
      description: `${t.name}: ${t.description}${t.purpose ? ` (Purpose: ${t.purpose})` : ""}`,
      input_schema: t.schema || { type: "object", properties: {} },
    }));
    return JSON.stringify(tools, null, 2);
  }
}
