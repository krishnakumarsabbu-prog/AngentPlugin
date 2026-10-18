export type SkillStatus = "Draft" | "Ready" | "Deprecated";

export type PlatformCompatibility = "copilot" | "claude" | "openai" | "neutral";

export type InstallationState = "not-installed" | "installed" | "outdated";

export interface SkillResource {
  id: string;
  name: string;
  kind: "file" | "script" | "template" | "reference";
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  instructions: string;
  resources: SkillResource[];
  compatibility: PlatformCompatibility[];
  status: SkillStatus;
  installationState: InstallationState;
  createdAt: string;
  updatedAt: string;
}

export interface SkillSummary {
  id: string;
  name: string;
  status: SkillStatus;
  version: string;
  updatedAt: string;
}
