import { Skill } from "../../domain/skills/types";

function yamlEscape(value: string): string {
  if (/[:#[{}&*!|>'"%@`]/.test(value) || value !== value.trim()) {
    return JSON.stringify(value);
  }
  return value;
}

export function skillToYamlFrontmatter(skill: Skill): string {
  const lines: string[] = ["---"];
  lines.push(`name: ${yamlEscape(skill.name)}`);
  lines.push(`id: ${yamlEscape(skill.id)}`);
  lines.push(`description: ${yamlEscape(skill.description)}`);
  lines.push(`version: ${yamlEscape(skill.version)}`);
  if (skill.author) lines.push(`author: ${yamlEscape(skill.author)}`);
  lines.push(`category: ${yamlEscape(skill.category)}`);
  if (skill.tags.length > 0) {
    lines.push(`tags:`);
    for (const tag of skill.tags) lines.push(`  - ${yamlEscape(tag)}`);
  }
  if (skill.compatibility.length > 0) {
    lines.push(`compatibility:`);
    for (const platform of skill.compatibility) lines.push(`  - ${platform}`);
  }
  if (skill.otherTargets.length > 0) {
    lines.push(`otherTargets:`);
    for (const target of skill.otherTargets) lines.push(`  - ${yamlEscape(target)}`);
  }
  if (skill.requiredTools.length > 0) {
    lines.push(`requiredTools:`);
    for (const tool of skill.requiredTools) lines.push(`  - ${yamlEscape(tool)}`);
  }
  if (skill.permissions.length > 0) {
    lines.push(`permissions:`);
    for (const permission of skill.permissions) lines.push(`  - ${yamlEscape(permission)}`);
  }
  if (skill.requirements.trim()) {
    lines.push(`requirements: ${yamlEscape(skill.requirements.replace(/\s+/g, " ").trim())}`);
  }
  lines.push("---");
  return lines.join("\n");
}

export function buildSkillMarkdown(skill: Skill): string {
  const header = skill.frontmatter.trim()
    ? skillToYamlFrontmatter(skill) + "\n" + skill.frontmatter.trim() + "\n"
    : skillToYamlFrontmatter(skill);
  const sections: string[] = [header];

  sections.push(`# ${skill.name}\n`);
  sections.push(`${skill.description}\n`);

  if (skill.instructions.trim()) {
    sections.push("## Instructions\n");
    sections.push(skill.instructions.replace(/\s+$/, "") + "\n");
  }

  if (skill.requiredTools.length > 0) {
    sections.push("## Required Tools\n");
    for (const tool of skill.requiredTools) sections.push(`- ${tool}`);
    sections.push("");
  }

  if (skill.permissions.length > 0) {
    sections.push("## Permissions\n");
    for (const permission of skill.permissions) sections.push(`- ${permission}`);
    sections.push("");
  }

  if (skill.requirements.trim()) {
    sections.push("## Requirements\n");
    sections.push(skill.requirements.replace(/\s+$/, "") + "\n");
  }

  if (skill.resources.length > 0) {
    sections.push("## Resources\n");
    for (const resource of skill.resources) {
      sections.push(`- **${resource.name}** (${resource.kind}): ${resource.description}`);
    }
    sections.push("");
  }

  if (skill.changelog.trim()) {
    sections.push("## Changelog\n");
    sections.push(skill.changelog.replace(/\s+$/, "") + "\n");
  }

  return sections.join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\s+|\s+$/g, "") + "\n";
}
