import { Skill, SkillResource, PlatformCompatibility, SkillStatus } from "../domain/skills/types";

export type ValidationSeverity = "error" | "warning" | "suggestion";

export interface ValidationFinding {
  severity: ValidationSeverity;
  field: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  errors: ValidationFinding[];
  warnings: ValidationFinding[];
  suggestions: ValidationFinding[];
}

export interface SkillValidationContext {
  /** Existing ids in the repository, so duplicates can be detected. */
  existingIds: ReadonlySet<string>;
  /** Id being replaced on update, so it is not flagged as a duplicate. */
  selfId?: string;
  /** Known resource kinds; used to flag unsupported declarations. */
  knownResourceKinds: ReadonlySet<string>;
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const ALLOWED_PLATFORMS: ReadonlyArray<PlatformCompatibility> = ["copilot", "claude", "openai", "neutral"];
const ALLOWED_STATUSES: ReadonlyArray<SkillStatus> = ["Draft", "Ready", "Deprecated"];
const ALLOWED_RESOURCE_KINDS: ReadonlyArray<string> = ["file", "script", "template", "reference", "example", "test"];
const ALLOWED_INSTALLATION_STATES: ReadonlyArray<string> = ["not-installed", "installed", "outdated"];

const YAML_KEY_PATTERN = /^[\w."'-]+\s*:/;
const YAML_LIST_PATTERN = /^-\s+/;
const YAML_BLOCK_SCALAR_PATTERN = /:\s*(\||>)\s*$/;

const FORBIDDEN_DECLARATIONS = [
  "import ",
  "require(",
  "eval(",
  "function ",
  "process.env",
  "child_process",
  "fs.readFileSync",
  "fetch(",
  "curl ",
  "wget ",
  "shell_exec",
  "exec(",
];

export function defaultValidationContext(): SkillValidationContext {
  return {
    existingIds: new Set(),
    knownResourceKinds: new Set(ALLOWED_RESOURCE_KINDS),
  };
}

export function validateSkill(skill: Partial<Skill>, ctx: SkillValidationContext = defaultValidationContext()): ValidationReport {
  const errors: ValidationFinding[] = [];
  const warnings: ValidationFinding[] = [];
  const suggestions: ValidationFinding[] = [];

  const name = typeof skill.name === "string" ? skill.name.trim() : "";
  if (!name) {
    errors.push({ severity: "error", field: "name", message: "Name is required." });
  } else if (name.length > 96) {
    errors.push({ severity: "error", field: "name", message: "Name must be 96 characters or fewer." });
  }

  const id = typeof skill.id === "string" ? skill.id.trim() : "";
  if (!id) {
    errors.push({ severity: "error", field: "id", message: "Identifier is required." });
  } else if (!ID_PATTERN.test(id)) {
    errors.push({
      severity: "error",
      field: "id",
      message: "Identifier must be lowercase letters, digits, and dashes only, and start with a letter or digit.",
    });
  } else if (id.length > 64) {
    errors.push({ severity: "error", field: "id", message: "Identifier must be 64 characters or fewer." });
  } else if (ctx.existingIds.has(id) && ctx.selfId !== id) {
    errors.push({ severity: "error", field: "id", message: `A skill with identifier "${id}" already exists.` });
  }

  const description = typeof skill.description === "string" ? skill.description.trim() : "";
  if (!description) {
    errors.push({ severity: "error", field: "description", message: "Description is required." });
  } else if (description.length > 512) {
    warnings.push({ severity: "warning", field: "description", message: "Description is long; consider trimming for dashboards." });
  }

  const version = typeof skill.version === "string" ? skill.version.trim() : "";
  if (!version) {
    errors.push({ severity: "error", field: "version", message: "Version is required." });
  } else if (!SEMVER_PATTERN.test(version)) {
    errors.push({ severity: "error", field: "version", message: "Version must follow semantic versioning, e.g. 1.0.0." });
  }

  const instructions = typeof skill.instructions === "string" ? skill.instructions : "";
  if (!instructions.trim()) {
    errors.push({ severity: "error", field: "instructions", message: "Instructions are required." });
  } else if (instructions.trim().length < 20) {
    suggestions.push({ severity: "suggestion", field: "instructions", message: "Instructions are short; describe steps, inputs, and expected outputs for reliable execution." });
  }

  if (skill.frontmatter && skill.frontmatter.trim()) {
    const fmErrors = validateFrontmatter(skill.frontmatter);
    warnings.push(...fmErrors);
  }

  if (Array.isArray(skill.resources)) {
    const seenResourceIds = new Set<string>();
    for (const [i, r] of skill.resources.entries()) {
      const findings = validateResource(r, i, seenResourceIds, ctx);
      errors.push(...findings.filter((f) => f.severity === "error"));
      warnings.push(...findings.filter((f) => f.severity === "warning"));
      suggestions.push(...findings.filter((f) => f.severity === "suggestion"));
    }
  }

  if (Array.isArray(skill.compatibility)) {
    for (const p of skill.compatibility) {
      if (!(ALLOWED_PLATFORMS as readonly string[]).includes(p)) {
        errors.push({ severity: "error", field: "compatibility", message: `Unsupported platform: "${p}".` });
      }
    }
    if (skill.compatibility.includes("openai")) {
      warnings.push({ severity: "warning", field: "compatibility", message: "OpenAI targets are honored only where the consuming application supports a compatible skill mechanism." });
    }
  }

  if (skill.status && !(ALLOWED_STATUSES as readonly string[]).includes(skill.status)) {
    errors.push({ severity: "error", field: "status", message: `Invalid status: "${skill.status}".` });
  }

  if (skill.installationState && !(ALLOWED_INSTALLATION_STATES as readonly string[]).includes(skill.installationState)) {
    errors.push({ severity: "error", field: "installationState", message: `Invalid installation state: "${skill.installationState}".` });
  }

  if (Array.isArray(skill.tags)) {
    for (const tag of skill.tags) {
      if (typeof tag !== "string" || !tag.trim()) {
        warnings.push({ severity: "warning", field: "tags", message: "Empty tags are ignored." });
      }
    }
  }

  const requiredTools = Array.isArray(skill.requiredTools) ? skill.requiredTools : [];
  const permissions = Array.isArray(skill.permissions) ? skill.permissions : [];
  if (requiredTools.length === 0 && instructions.trim()) {
    suggestions.push({ severity: "suggestion", field: "requiredTools", message: "No required tools declared. Add at least one so consumers know what capabilities the skill expects." });
  }
  if (permissions.length === 0 && instructions.trim()) {
    suggestions.push({ severity: "suggestion", field: "permissions", message: "No permissions declared. Explicit permissions make review and governance easier." });
  }

  const declarationFindings = scanUnsupportedDeclarations(instructions);
  errors.push(...declarationFindings.filter((f) => f.severity === "error"));
  warnings.push(...declarationFindings.filter((f) => f.severity === "warning"));

  if (!skill.author || !skill.author.trim()) {
    suggestions.push({ severity: "suggestion", field: "author", message: "Author is empty; adding an author aids governance and change attribution." });
  }
  if (!skill.changelog || !skill.changelog.trim()) {
    suggestions.push({ severity: "suggestion", field: "changelog", message: "Changelog is empty; record version changes for traceability." });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  };
}

function validateResource(
  resource: SkillResource,
  index: number,
  seen: Set<string>,
  ctx: SkillValidationContext,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const path = `resources[${index}]`;
  if (!resource || typeof resource !== "object") {
    findings.push({ severity: "error", field: path, message: "Resource is malformed." });
    return findings;
  }
  if (!resource.id || !resource.id.trim()) {
    findings.push({ severity: "error", field: `${path}.id`, message: "Resource id is required." });
  } else if (seen.has(resource.id)) {
    findings.push({ severity: "error", field: `${path}.id`, message: `Duplicate resource id: "${resource.id}".` });
  } else {
    seen.add(resource.id);
  }
  if (!resource.name || !resource.name.trim()) {
    findings.push({ severity: "error", field: `${path}.name`, message: "Resource name is required." });
  }
  if (!resource.kind || !ctx.knownResourceKinds.has(resource.kind)) {
    findings.push({ severity: "error", field: `${path}.kind`, message: `Unsupported resource kind: "${resource.kind}".` });
  }
  if (!resource.description || !resource.description.trim()) {
    findings.push({ severity: "warning", field: `${path}.description`, message: "Resource description is empty." });
  }
  return findings;
}

function validateFrontmatter(raw: string): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const text = raw.trim();
  if (text.startsWith("---") && text.endsWith("---")) {
    return findings;
  }
  const lines = text.split(/\r?\n/);
  let bad = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const ok = YAML_KEY_PATTERN.test(trimmed) || YAML_LIST_PATTERN.test(trimmed) || YAML_BLOCK_SCALAR_PATTERN.test(trimmed);
    if (!ok) bad += 1;
  }
  if (bad > 0) {
    findings.push({
      severity: "warning",
      field: "frontmatter",
      message: `${bad} line(s) do not look like YAML key:value or list entries; they will be preserved verbatim.`,
    });
  }
  return findings;
}

function scanUnsupportedDeclarations(instructions: string): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  if (!instructions) return findings;
  const lines = instructions.split(/\r?\n/);
  let inFence = false;
  for (const [i, line] of lines.entries()) {
    const stripped = line.trim();
    if (stripped.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    for (const decl of FORBIDDEN_DECLARATIONS) {
      if (stripped.toLowerCase().includes(decl)) {
        findings.push({
          severity: "warning",
          field: `instructions:${i + 1}`,
          message: `Possible unsupported declaration "${decl.trim()}" in instructions. Use fenced code blocks for examples and avoid executable runtime calls.`,
        });
        break;
      }
    }
  }
  return findings;
}

export interface DraftComparison {
  changed: boolean;
  changes: Array<{ field: string; from: unknown; to: unknown }>;
}

export function compareDraftToStored(draft: Partial<Skill>, stored: Skill | undefined): DraftComparison {
  if (!stored) {
    return { changed: true, changes: [] };
  }
  const fields: Array<keyof Skill> = [
    "name",
    "description",
    "version",
    "author",
    "category",
    "instructions",
    "frontmatter",
    "changelog",
    "requirements",
    "status",
  ];
  const changes: Array<{ field: string; from: unknown; to: unknown }> = [];
  for (const field of fields) {
    const from = stored[field] as unknown;
    const to = draft[field] as unknown;
    if ((from ?? "") !== (to ?? "")) {
      changes.push({ field, from, to });
    }
  }
  for (const field of ["tags", "compatibility", "otherTargets", "requiredTools", "permissions"] as const) {
    const fromArr = Array.isArray(stored[field]) ? stored[field] as unknown[] : [];
    const toArr = Array.isArray(draft[field]) ? draft[field] as unknown[] : [];
    if (fromArr.length !== toArr.length || fromArr.some((v, i) => v !== toArr[i])) {
      changes.push({ field, from: fromArr, to: toArr });
    }
  }
  const fromRes = stored.resources.map((r) => `${r.id}:${r.name}:${r.kind}`).join("|");
  const toRes = Array.isArray(draft.resources) ? draft.resources.map((r) => `${r.id}:${r.name}:${r.kind}`).join("|") : "";
  if (fromRes !== toRes) {
    changes.push({ field: "resources", from: fromRes, to: toRes });
  }
  return { changed: changes.length > 0, changes };
}
