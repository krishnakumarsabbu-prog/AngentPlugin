import { Agent } from "../../domain/agents/types";
import {
  PlatformAgentAdapter,
  AgentPlatformId,
  CapabilityMatrixRow,
  PlatformExportResult,
} from "./types";
import { CopilotAgentAdapter } from "./CopilotAgentAdapter";
import { ClaudeAgentAdapter } from "./ClaudeAgentAdapter";
import { OpenAIAgentAdapter } from "./OpenAIAgentAdapter";
import { CAPABILITY_MATRIX } from "./CapabilityMatrix";

export * from "./types";
export * from "./CapabilityMatrix";
export * from "./CopilotAgentAdapter";
export * from "./ClaudeAgentAdapter";
export * from "./OpenAIAgentAdapter";

const copilotAdapter = new CopilotAgentAdapter();
const claudeAdapter = new ClaudeAgentAdapter();
const openaiAdapter = new OpenAIAgentAdapter();

const ADAPTER_MAP: Record<string, PlatformAgentAdapter> = {
  copilot: copilotAdapter,
  claude: claudeAdapter,
  openai: openaiAdapter,
};

export function getPlatformAdapter(platform: AgentPlatformId): PlatformAgentAdapter | undefined {
  return ADAPTER_MAP[platform];
}

export function getAllPlatformAdapters(): PlatformAgentAdapter[] {
  return [copilotAdapter, claudeAdapter, openaiAdapter];
}

export function getCapabilityMatrix(): CapabilityMatrixRow[] {
  return CAPABILITY_MATRIX;
}

export interface FullCompatibilityReport {
  matrix: CapabilityMatrixRow[];
  platformAnalysis: Record<
    AgentPlatformId,
    {
      platformName: string;
      supportLevel: import("./types").CompatibilitySupportLevel;
      isExperimental: boolean;
      warnings: string[];
      fieldSupport: import("./types").PlatformFieldSupport[];
      limitations: import("./types").PlatformKnownLimitation[];
      suggestedDestination: string;
    }
  >;
}

export function analyzeAgentCompatibility(agent: Partial<Agent>): FullCompatibilityReport {
  const adapters = getAllPlatformAdapters();
  const platformAnalysis: FullCompatibilityReport["platformAnalysis"] = {} as any;

  for (const adapter of adapters) {
    const val = adapter.validateCompatibility(agent);
    platformAnalysis[adapter.platformId] = {
      platformName: adapter.platformName,
      supportLevel: val.supportLevel,
      isExperimental: adapter.isExperimental,
      warnings: val.warnings,
      fieldSupport: val.fieldSupport,
      limitations: adapter.limitations,
      suggestedDestination: adapter.destinationRules[0]?.suggestedRelativePath || "",
    };
  }

  // Also include neutral/canonical platform
  platformAnalysis["neutral"] = {
    platformName: "AgentForge Canonical",
    supportLevel: "native",
    isExperimental: false,
    warnings: [],
    fieldSupport: [
      { field: "all", supportLevel: "native", notes: "100% native support for all canonical fields and policy definitions." },
    ],
    limitations: [],
    suggestedDestination: ".agentforge/agents/{id}.json",
  };

  return {
    matrix: CAPABILITY_MATRIX,
    platformAnalysis,
  };
}

export function exportAgentForPlatform(
  agent: Partial<Agent>,
  platformId: AgentPlatformId
): PlatformExportResult {
  const adapter = getPlatformAdapter(platformId);
  if (!adapter) {
    // Platform neutral fallback
    const safeId = (agent.id || "agent").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    return {
      platformId: "neutral",
      platformName: "Platform Neutral (Canonical)",
      supportLevel: "native",
      exportFormat: "AgentForge Canonical JSON (.agentforge/agents/{id}.json)",
      files: [
        {
          relativePath: `.agentforge/agents/${safeId}.json`,
          fileName: `${safeId}.json`,
          mimeType: "application/json",
          content: JSON.stringify(agent, null, 2),
          purpose: "Canonical AgentForge specification.",
        },
      ],
      destination: {
        scope: "workspace",
        suggestedRelativePath: `.agentforge/agents/${safeId}.json`,
        displayTarget: `.agentforge/agents/${safeId}.json`,
        ruleDescription: "Default canonical storage location in workspace.",
      },
      warnings: [],
      limitations: [],
      supportedFields: ["all"],
      unsupportedFields: [],
      isSimulatedOrExperimental: false,
      statusDisclaimer: "Canonical agent specification ready for cross-platform adaptation.",
    };
  }

  return adapter.exportAgent(agent);
}
