export type SkillStatus = "Draft" | "Ready" | "Deprecated";

export type PlatformCompatibility = "copilot" | "claude" | "openai" | "neutral";

export type InstallationState = "not-installed" | "installed" | "outdated";

export type SkillResourceKind =
  | "file"
  | "script"
  | "template"
  | "reference"
  | "example"
  | "test";

export interface SkillResource {
  id: string;
  name: string;
  kind: SkillResourceKind;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  instructions: string;
  /** Optional raw YAML frontmatter merged into the SKILL.md header, verbatim. */
  frontmatter: string;
  resources: SkillResource[];
  compatibility: PlatformCompatibility[];
  /** Free-form additional consuming targets beyond the built-in platforms. */
  otherTargets: string[];
  requiredTools: string[];
  permissions: string[];
  changelog: string;
  requirements: string;
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
