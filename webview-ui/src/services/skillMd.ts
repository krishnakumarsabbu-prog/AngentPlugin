import type { PlatformCompatibility, Skill, SkillResource } from "../types";

export interface DraftSkill {
  name: string;
  identifier: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tagsText: string;
  instructions: string;
  frontmatter: string;
  resources: SkillResource[];
  compatibility: PlatformCompatibility[];
  otherTargetsText: string;
  requiredToolsText: string;
  permissionsText: string;
  changelog: string;
  requirements: string;
}

export type DraftSeverity = "error" | "warning";

export interface DraftIssue {
  field: keyof DraftSkill | "otherTargetsText";
  severity: DraftSeverity;
  message: string;
}

export interface DraftValidation {
  errors: DraftIssue[];
  warnings: DraftIssue[];
}

const FIELD_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

export const OPENAI_WARNING =
  "OpenAI API targets are honored only where the consuming application supports a compatible skill mechanism.";

function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

export function suggestIdentifier(name: string): string {
  return slugifyName(name.trim());
}

function sanitizeYamlLine(line: string): string | null {
  const stripped = line.replace(/[\r\n\u0085\u2028\u2029]/g, "");
  const trimmed = stripped.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const isKeyValue = /^[\w."'-]+\s*:/.test(trimmed);
  const isListItem = /^-\s+/.test(trimmed);
  const isBlockScalar = trimmed.endsWith(": |") || trimmed.endsWith(": >");
  return isKeyValue || isListItem || isBlockScalar ? stripped : null;
}

export function validateDraft(draft: DraftSkill): DraftValidation {
  const errors: DraftIssue[] = [];
  const warnings: DraftIssue[] = [];

  const name = draft.name.trim();
  if (!name) {
    errors.push({ field: "name", severity: "error", message: "Name is required." });
  }

  const identifier = draft.identifier.trim();
  if (!identifier) {
    errors.push({ field: "identifier", severity: "error", message: "Unique identifier is required." });
  } else if (!FIELD_PATTERN.test(identifier)) {
    errors.push({
      field: "identifier",
      severity: "error",
      message: "Use lowercase letters, numbers, and dashes only.",
    });
  } else if (identifier.length > 64) {
    errors.push({
      field: "identifier",
      severity: "error",
      message: "Identifier must be 64 characters or fewer.",
    });
  }

  if (!draft.description.trim()) {
    errors.push({ field: "description", severity: "error", message: "Description is required." });
  }

  const version = draft.version.trim();
  if (!version) {
    errors.push({ field: "version", severity: "error", message: "Version is required." });
  } else if (!SEMVER_PATTERN.test(version)) {
    errors.push({
      field: "version",
      severity: "error",
      message: "Use semantic version format, e.g. 1.0.0.",
    });
  }

  if (!draft.instructions.trim()) {
    errors.push({
      field: "instructions",
      severity: "error",
      message: "Instructions are required.",
    });
  }

  if (draft.frontmatter.trim()) {
    for (const line of draft.frontmatter.split(/\n/)) {
      if (line.trim() === "" || !sanitizeYamlLine(line)) {
        warnings.push({
          field: "frontmatter",
          severity: "warning",
          message: "One or more lines may not be valid YAML and will be preserved verbatim.",
        });
        break;
      }
    }
  }

  if (draft.compatibility.includes("openai")) {
    warnings.push({
      field: "compatibility",
      severity: "warning",
      message: OPENAI_WARNING,
    });
  }

  return { errors, warnings };
}

export function draftToSkill(draft: DraftSkill): Skill {
  return {
    id: draft.identifier.trim(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    version: draft.version.trim() || "0.1.0",
    author: draft.author.trim(),
    category: draft.category.trim() || "General",
    tags: draft.tagsText
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
    instructions: draft.instructions,
    frontmatter: draft.frontmatter,
    resources: draft.resources.map((r) => ({ ...r })),
    compatibility: [...draft.compatibility],
    otherTargets: draft.otherTargetsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    requiredTools: draft.requiredToolsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    permissions: draft.permissionsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    changelog: draft.changelog,
    requirements: draft.requirements,
    status: "Draft",
    installationState: "not-installed",
    createdAt: "",
    updatedAt: "",
  };
}

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
