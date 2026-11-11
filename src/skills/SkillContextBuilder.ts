import { Skill } from "../domain/skills/types";
import { Agent, SkillAssignment, SkillActivationMode } from "../domain/agents/types";

export interface ActivatedSkill {
  skillId: string;
  skillName: string;
  version: string;
  activationMode: SkillActivationMode;
  activationReason: string;
  loadedInstructions: string[];
}

export interface SkillContextResult {
  systemPrompt: string;
  activatedSkills: ActivatedSkill[];
  totalInstructionLength: number;
}

export interface SkillContextBuilderDeps {
  getSkill: (id: string) => Promise<Skill | undefined>;
}

const MAX_INSTRUCTION_LENGTH = 8000;

function shouldActivate(
  assignment: SkillAssignment,
  prompt: string,
): { activate: boolean; reason: string } {
  if (!assignment.enabled) {
    return { activate: false, reason: "Skill is disabled" };
  }

  switch (assignment.activationMode) {
    case "always-on":
      return { activate: true, reason: "Always-on activation" };

    case "manual":
      return { activate: false, reason: "Manual activation — not triggered automatically" };

    case "task-triggered": {
      const matched = matchesSkillPurpose(assignment.skillId, prompt);
      return matched
        ? { activate: true, reason: `Task-triggered: prompt matches skill purpose` }
        : { activate: false, reason: "Task-triggered: prompt does not match skill purpose" };
    }

    default:
      return { activate: false, reason: "Unknown activation mode" };
  }
}

function matchesSkillPurpose(skillId: string, prompt: string): boolean {
  const lower = prompt.toLowerCase();

  const purposeKeywords: Record<string, string[]> = {
    codesculpt: [
      "review", "audit", "debt", "gain", "code quality", "complexity",
      "abstraction", "duplication", "reuse", "minimal", "discipline",
      "engineering", "refactor", "technical debt", "decision ladder",
    ],
    graphify: [
      "architecture", "dependency", "impact", "call path", "data flow",
      "knowledge graph", "codebase", "repository", "module", "service",
      "trace", "relationship", "caller", "structure", "coupling",
      "circular", "node", "graph", "explain how",
    ],
    "security-architecture-review": [
      "security", "threat", "stride", "risk", "vulnerability", "attack",
      "compliance", "owasp", "remediation", "trust boundary", "data flow",
      "authorization", "authentication", "penetration", "audit security",
      "security review", "security architecture",
    ],
  };

  const keywords = purposeKeywords[skillId];
  if (!keywords) return false;
  return keywords.some((kw) => lower.includes(kw));
}

function truncateInstructions(instructions: string, maxLen: number): string {
  if (instructions.length <= maxLen) return instructions;
  return instructions.slice(0, maxLen) + "\n[...truncated for context budget]";
}

export class SkillContextBuilder {
  constructor(private deps: SkillContextBuilderDeps) {}

  async buildContext(
    agent: Agent,
    prompt: string,
  ): Promise<SkillContextResult> {
    const assignments = this.resolveAssignments(agent);
    const activated: ActivatedSkill[] = [];
    const instructionBlocks: string[] = [];
    let totalLength = 0;

    const sorted = [...assignments].sort((a, b) => a.priority - b.priority);

    for (const assignment of sorted) {
      const { activate, reason } = shouldActivate(assignment, prompt);
      if (!activate) continue;

      const skill = await this.deps.getSkill(assignment.skillId);
      if (!skill) continue;

      const skillInstructions = truncateInstructions(
        skill.instructions,
        MAX_INSTRUCTION_LENGTH,
      );

      const block = this.formatSkillBlock(skill, assignment.activationMode);
      instructionBlocks.push(block);
      totalLength += block.length;

      activated.push({
        skillId: skill.id,
        skillName: skill.name,
        version: skill.version,
        activationMode: assignment.activationMode,
        activationReason: reason,
        loadedInstructions: ["instructions"],
      });
    }

    const basePrompt = agent.instructions ||
      `You are an autonomous engineering agent named "${agent.name}". Execute your mission and utilize tools safely.`;

    const systemPrompt =
      instructionBlocks.length > 0
        ? `${basePrompt}\n\n${instructionBlocks.join("\n\n")}`
        : basePrompt;

    return {
      systemPrompt,
      activatedSkills: activated,
      totalInstructionLength: totalLength,
    };
  }

  private resolveAssignments(agent: Agent): SkillAssignment[] {
    if (agent.skillAssignments && agent.skillAssignments.length > 0) {
      return agent.skillAssignments;
    }

    return agent.assignedSkillIds.map((skillId, index) => ({
      skillId,
      activationMode: inferDefaultActivationMode(skillId),
      priority: index,
      enabled: true,
    }));
  }

  private formatSkillBlock(skill: Skill, mode: SkillActivationMode): string {
    const toolList = skill.requiredTools.length > 0
      ? `\nAvailable tools: ${skill.requiredTools.join(", ")}`
      : "";

    return `## Active Skill: ${skill.name} (v${skill.version}, activation: ${mode})

${truncateInstructions(skill.instructions, MAX_INSTRUCTION_LENGTH)}${toolList}`;
  }
}

export function inferDefaultActivationMode(skillId: string): SkillActivationMode {
  switch (skillId) {
    case "codesculpt":
      return "always-on";
    case "graphify":
      return "task-triggered";
    case "security-architecture-review":
      return "task-triggered";
    default:
      return "always-on";
  }
}
