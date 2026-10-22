import { Agent } from "../../domain/agents/types";
import {
  PlatformAgentAdapter,
  PlatformExportResult,
  PlatformFieldSupport,
  PlatformKnownLimitation,
  PlatformInstallDestination,
  CompatibilitySupportLevel,
} from "./types";

export class OpenAIAgentAdapter implements PlatformAgentAdapter {
  readonly platformId = "openai" as const;
  readonly platformName = "OpenAI API / Assistants";
  readonly version = "1.0.0";
  readonly isExperimental = true; // Labeled experimental/simulated per prompt requirements

  readonly supportedArtifactTypes = [
    "openai-assistant-json",
    "openai-tools-spec",
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
    "toolDefinitions",
    "inputSchema",
    "outputSchema",
    "version",
  ];

  readonly unsupportedFields = [
    "permissionPolicy", // Not handled by OpenAI backend
    "testScenarios",
  ];

  readonly limitations: PlatformKnownLimitation[] = [
    {
      title: "Client-Side Tool Execution Loop",
      description: "OpenAI Assistant / Function calling returns tool call requests to the client. Real tool execution must be performed by the calling host application, not OpenAI's cloud API.",
      impact: "high",
      mitigation: "Implement a client-side execution runner loop that validates permissions before servicing function requests.",
    },
    {
      title: "No Server-Side File Sandbox",
      description: "OpenAI API does not enforce local file system read/write sandboxes. PermissionPolicy declarations are exported as metadata and advisory instructions.",
      impact: "high",
      mitigation: "The client-side harness must enforce restricted paths and read-only boundaries.",
    },
    {
      title: "API Credentials Required for Cloud Sync",
      description: "Live deployment to OpenAI requires an OPENAI_API_KEY. In this phase, AgentForge generates the complete schema payload without requiring credentials.",
      impact: "medium",
      mitigation: "Export is self-contained and ready for upload via curl, SDK, or OpenAI dashboard.",
    },
    {
      title: "Function Name Format Constraints",
      description: "OpenAI function names must only contain alphanumeric characters, underscores, and hyphens (max 64 chars).",
      impact: "low",
      mitigation: "AgentForge automatically sanitizes tool IDs (e.g. converting hyphens to underscores).",
    },
  ];

  readonly destinationRules: PlatformInstallDestination[] = [
    {
      scope: "cloud-api",
      suggestedRelativePath: ".agentforge/export/openai/{id}-assistant.json",
      displayTarget: ".agentforge/export/openai/{id}-assistant.json (OpenAI API Sync Payload)",
      ruleDescription: "Simulated local payload ready for API ingestion via OpenAI Assistants or Chat Completions SDK.",
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
      notes: "Consolidated into OpenAI instructions parameter.",
    });

    fieldSupport.push({
      field: "toolDefinitions",
      supportLevel: "native",
      notes: "Mapped to OpenAI tools array as type: 'function' with JSON Schema parameters.",
    });

    fieldSupport.push({
      field: "permissionPolicy",
      supportLevel: "simulated",
      notes: "OpenAI API has no server-side sandbox. Policy is exported as metadata for client enforcement.",
    });

    warnings.push(
      "OpenAI API adapter is simulated: exports schema payload without requiring API keys. Tool execution occurs in caller client."
    );

    if (agent.permissionPolicy?.readOnly) {
      warnings.push(
        "Read-only permission policy cannot be enforced by OpenAI cloud API directly. Client harness must enforce it."
      );
    }

    if (agent.toolDefinitions) {
      for (const tool of agent.toolDefinitions) {
        if (tool.id.length > 64) {
          warnings.push(`Tool ID "${tool.id}" exceeds OpenAI 64-character limit.`);
        }
      }
    }

    return {
      supportLevel: "simulated",
      fieldSupport,
      warnings,
    };
  }

  exportAgent(agent: Partial<Agent>): PlatformExportResult {
    const validation = this.validateCompatibility(agent);
    const safeId = (agent.id || "agent").toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    const assistantJson = this.generateAssistantJson(agent);
    const toolsOnlyJson = this.generateToolsOnlyJson(agent);

    return {
      platformId: this.platformId,
      platformName: this.platformName,
      supportLevel: validation.supportLevel,
      exportFormat: "OpenAI Assistant Specification (JSON)",
      files: [
        {
          relativePath: `.agentforge/export/openai/${safeId}-assistant.json`,
          fileName: `${safeId}-assistant.json`,
          mimeType: "application/json",
          content: assistantJson,
          purpose: "OpenAI Assistants API create/update payload.",
        },
        {
          relativePath: `.agentforge/export/openai/${safeId}-tools.json`,
          fileName: `${safeId}-tools.json`,
          mimeType: "application/json",
          content: toolsOnlyJson,
          purpose: "ChatCompletions compatible tools array.",
        },
      ],
      destination: this.destinationRules[0],
      warnings: validation.warnings,
      limitations: this.limitations,
      supportedFields: this.supportedFields,
      unsupportedFields: this.unsupportedFields,
      isSimulatedOrExperimental: true,
      statusDisclaimer: "Simulated export: Generates OpenAI API payload without executing external network calls or requiring API credentials.",
    };
  }

  private generateAssistantJson(agent: Partial<Agent>): string {
    const tools = (agent.toolDefinitions || []).map((t) => ({
      type: "function",
      function: {
        name: t.id.replace(/-/g, "_").slice(0, 64),
        description: `${t.name}: ${t.description}${t.purpose ? ` (Purpose: ${t.purpose})` : ""}`,
        parameters: t.schema || { type: "object", properties: {} },
      },
    }));

    const instructionsParts = [
      `ROLE: ${agent.role || "General Worker"}`,
      `OBJECTIVE: ${agent.objective || ""}`,
      agent.instructions ? `INSTRUCTIONS:\n${agent.instructions}` : "",
      agent.scope ? `SCOPE:\n${agent.scope}` : "",
      agent.outOfScope ? `OUT OF SCOPE:\n${agent.outOfScope}` : "",
      agent.operatingPrinciples && agent.operatingPrinciples.length > 0
        ? `OPERATING PRINCIPLES:\n${agent.operatingPrinciples.map((p) => `- ${p}`).join("\n")}`
        : "",
      agent.permissionPolicy?.readOnly
        ? "RESTRICTION: You are operating in READ-ONLY mode. Do not produce commands that overwrite files."
        : "",
    ].filter(Boolean);

    const payload = {
      name: (agent.name || "Custom Agent").slice(0, 256),
      description: (agent.description || "").slice(0, 512),
      model: "gpt-4o",
      instructions: instructionsParts.join("\n\n"),
      tools,
      metadata: {
        agentforge_id: agent.id || "",
        version: agent.version || "1.0.0",
        role: agent.role || "",
        category: agent.category || "Custom",
        least_privilege: String(agent.permissionPolicy?.readOnly ?? true),
        adapter_state: "simulated_export",
      },
    };

    return JSON.stringify(payload, null, 2);
  }

  private generateToolsOnlyJson(agent: Partial<Agent>): string {
    const tools = (agent.toolDefinitions || []).map((t) => ({
      type: "function",
      function: {
        name: t.id.replace(/-/g, "_").slice(0, 64),
        description: `${t.name}: ${t.description}`,
        parameters: t.schema || { type: "object", properties: {} },
      },
    }));
    return JSON.stringify(tools, null, 2);
  }
}
