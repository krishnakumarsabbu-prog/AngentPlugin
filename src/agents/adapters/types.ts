import { Agent, ToolDefinition, PermissionPolicy, JsonSchema } from "../../domain/agents/types";
import { PlatformCompatibility } from "../../domain/skills/types";

export type AgentPlatformId = "copilot" | "claude" | "openai" | "neutral";

export type CompatibilitySupportLevel = "native" | "partial" | "simulated" | "unsupported";

export interface PlatformFieldSupport {
  field: string;
  supportLevel: CompatibilitySupportLevel;
  notes: string;
}

export interface PlatformKnownLimitation {
  title: string;
  description: string;
  impact: "low" | "medium" | "high";
  mitigation?: string;
}

export interface PlatformInstallDestination {
  scope: "workspace" | "user" | "cloud-api";
  suggestedRelativePath: string;
  displayTarget: string;
  ruleDescription: string;
}

export interface ExportArtifactFile {
  relativePath: string;
  fileName: string;
  mimeType: string;
  content: string;
  purpose: string;
}

export interface PlatformExportResult {
  platformId: AgentPlatformId;
  platformName: string;
  supportLevel: CompatibilitySupportLevel;
  exportFormat: string;
  files: ExportArtifactFile[];
  destination: PlatformInstallDestination;
  warnings: string[];
  limitations: PlatformKnownLimitation[];
  supportedFields: string[];
  unsupportedFields: string[];
  isSimulatedOrExperimental: boolean;
  statusDisclaimer: string;
}

export interface PlatformAgentAdapter {
  readonly platformId: AgentPlatformId;
  readonly platformName: string;
  readonly version: string;
  readonly isExperimental: boolean;
  readonly supportedArtifactTypes: string[];
  readonly supportedFields: string[];
  readonly unsupportedFields: string[];
  readonly limitations: PlatformKnownLimitation[];
  readonly destinationRules: PlatformInstallDestination[];

  /** Validate agent compatibility against this platform's capabilities */
  validateCompatibility(agent: Partial<Agent>): {
    supportLevel: CompatibilitySupportLevel;
    fieldSupport: PlatformFieldSupport[];
    warnings: string[];
  };

  /** Export the agent into the platform-specific artifact bundle */
  exportAgent(agent: Partial<Agent>): PlatformExportResult;
}

export interface CapabilityMatrixRow {
  capabilityId: string;
  capabilityName: string;
  category: "Identity & Mission" | "Skills & Tools" | "Governance & Safety" | "Contracts & Runtime";
  description: string;
  platforms: Record<AgentPlatformId, {
    supportLevel: CompatibilitySupportLevel;
    notes: string;
  }>;
}
