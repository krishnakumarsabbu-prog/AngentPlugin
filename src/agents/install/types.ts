import { AgentPlatformId } from "../adapters/types";
export type { AgentPlatformId };

export type AgentInstallScope = "user" | "workspace";

export interface AgentInstallTarget {
  platform: AgentPlatformId;
  scope: AgentInstallScope;
  /** Absolute directory root the adapter writes within. */
  root: string;
  /** Human-readable display path shown in the UI. */
  displayPath: string;
}

export interface AgentInstallFile {
  /** Path relative to the install root. Must not escape the root. */
  relativePath: string;
  content: string;
  overwriteSafe?: boolean;
}

export interface AgentInstalledArtifact {
  agentId: string;
  platform: AgentPlatformId;
  scope: AgentInstallScope;
  root: string;
  files: string[];
  installedAt: string;
  simulated: boolean;
}

export interface AgentInstallPlan {
  target: AgentInstallTarget;
  files: AgentInstallFile[];
  existing: string[];
  supported: boolean;
  simulated: boolean;
}

export interface AgentUninstallResult {
  artifact: AgentInstalledArtifact;
  diskRemoved: boolean;
  recordRemoved: boolean;
  message: string;
}
