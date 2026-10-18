export type SkillStatus = "Draft" | "Ready" | "Deprecated";

export type PlatformCompatibility = "copilot" | "claude" | "openai" | "neutral";

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  instructions: string;
  compatibility: PlatformCompatibility[];
  status: SkillStatus;
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
