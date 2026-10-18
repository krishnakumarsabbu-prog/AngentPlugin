import { Skill, SkillResource, PlatformCompatibility, SkillStatus, InstallationState, SkillResourceKind } from "../domain/skills/types";
import { validateSkill, ValidationReport, defaultValidationContext } from "../skills/SkillValidator";
import { ISkillsStore } from "../services/interfaces";
import { buildSkillMarkdown } from "./install/skillMarkdown";
import {
  PackageFile,
  PackageManifest,
  SkillPackage,
  PACKAGE_MANIFEST_NAME,
} from "./install/types";

export type ExportFormat = "skill-md" | "package";

export interface ExportResult {
  format: ExportFormat;
  skillId: string;
  skillName: string;
  version: string;
  fileName: string;
  /** Single SKILL.md document (skill-md format) or the package manifest (package format). */
  primaryContent: string;
  /** Additional files when resources are present (package format only). */
  files: PackageFile[];
  manifest?: PackageManifest;
  validation: ValidationReport;
}

export interface DuplicateFinding {
  kind: "none" | "same-version" | "older-existing" | "newer-existing";
  existingId?: string;
  existingVersion?: string;
}

export interface ImportPreview {
  valid: boolean;
  skill: Partial<Skill>;
  /** Files that will be stored alongside the skill record (not written to disk). */
  files: PackageFile[];
  duplicate: DuplicateFinding;
  validation: ValidationReport;
  /** Human-readable warnings surfaced to the user before saving. */
  warnings: string[];
  /** Why the package was rejected, when invalid. */
  errors: string[];
}

export interface ImportSaveResult {
  skill: Skill;
  imported: boolean;
  updated: boolean;
  files: PackageFile[];
}

export class SkillPackageService {
  constructor(private store: ISkillsStore) {}

  // ── Export ────────────────────────────────────────────────────────────────

  async exportSkill(skillId: string, format: ExportFormat): Promise<ExportResult> {
    const skill = await this.store.getSkill(skillId);
    if (!skill) throw new Error(`Skill not found: ${skillId}`);

    const validation = this.validate(skill, undefined);
    if (!validation.valid) {
      throw new Error(`Cannot export: skill has validation errors: ${this.summarizeErrors(validation)}`);
    }

    const skillMd = buildSkillMarkdown(skill);
    const slug = slugify(skill.id || skill.name);
    const fileName = `${slug}.md`;

    if (format === "skill-md") {
      return {
        format,
        skillId: skill.id,
        skillName: skill.name,
        version: skill.version,
        fileName,
        primaryContent: skillMd,
        files: [],
        validation,
      };
    }

    const files: PackageFile[] = [];
    if (skill.resources.length > 0) {
      for (const r of skill.resources) {
        files.push({
          path: `resources/${resourceFileName(r)}`,
          content: resourceStub(r),
        });
      }
    }
    files.push({ path: "SKILL.md", content: skillMd });

    const manifest: PackageManifest = {
      kind: "agentforge-skill",
      skillId: skill.id,
      skillName: skill.name,
      version: skill.version,
      exportedAt: new Date().toISOString(),
      files: files.map((f) => f.path),
    };

    return {
      format,
      skillId: skill.id,
      skillName: skill.name,
      version: skill.version,
      fileName: `${slug}-package`,
      primaryContent: JSON.stringify(manifest, null, 2),
      files,
      manifest,
      validation,
    };
  }

  /**
   * Returns the package representation (used by the installation service to
   * decide which files to install).
   */
  async buildPackage(skillId: string): Promise<SkillPackage> {
    const skill = await this.store.getSkill(skillId);
    if (!skill) throw new Error(`Skill not found: ${skillId}`);
    const skillMd = buildSkillMarkdown(skill);
    const files: PackageFile[] = [];
    if (skill.resources.length > 0) {
      for (const r of skill.resources) {
        files.push({
          path: `resources/${resourceFileName(r)}`,
          content: resourceStub(r),
        });
      }
    }
    return {
      skillId: skill.id,
      skillName: skill.name,
      version: skill.version,
      skillMd,
      files,
      hasResources: files.length > 0,
    };
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  /**
   * Parse and validate a package without saving. Accepts either a SKILL.md
   * document (string) or a serialized package (manifest JSON + files map).
   */
  async previewImport(input: string | PackageImportInput): Promise<ImportPreview> {
    let skill: Partial<Skill>;
    let files: PackageFile[] = [];

    if (typeof input === "string") {
      skill = parseSkillMarkdown(input);
    } else {
      const parsed = parsePackageInput(input);
      skill = parsed.skill;
      files = parsed.files;
    }

    const all = await this.store.list();
    const existingIds = new Set(all.map((s) => s.id));
    const validation = validateSkill(skill, {
      ...defaultValidationContext(),
      existingIds: new Set(), // duplicate detection handled separately, below
    });

    const duplicate = detectDuplicate(skill, all);
    const errors: string[] = validation.errors.map((e) => `[${e.field}] ${e.message}`);
    const warnings: string[] = [
      ...validation.warnings.map((w) => `[${w.field}] ${w.message}`),
    ];
    if (duplicate.kind === "same-version") {
      warnings.push(`A skill with id "${duplicate.existingId}" and the same version ${duplicate.existingVersion} already exists.`);
    } else if (duplicate.kind === "newer-existing") {
      warnings.push(`A newer version (${duplicate.existingVersion}) of skill "${duplicate.existingId}" already exists.`);
    }

    return {
      valid: validation.valid && errors.length === 0,
      skill,
      files,
      duplicate,
      validation,
      warnings,
      errors,
    };
  }

  async saveImport(preview: ImportPreview): Promise<ImportSaveResult> {
    if (!preview.valid) {
      throw new Error(`Cannot save invalid package: ${preview.errors.join("; ")}`);
    }
    const skill = preview.skill as Skill;
    const existing = await this.store.getSkill(skill.id);
    if (existing) {
      const updated = await this.store.updateSkill(skill.id, skill);
      return { skill: updated, imported: true, updated: true, files: preview.files };
    }
    const created = await this.store.createSkill(skill);
    return { skill: created, imported: true, updated: false, files: preview.files };
  }

  private validate(skill: Partial<Skill>, selfId?: string): ValidationReport {
    return validateSkill(skill, {
      ...defaultValidationContext(),
      existingIds: new Set(),
      selfId,
    });
  }

  private summarizeErrors(report: ValidationReport): string {
    return report.errors.map((e) => `[${e.field}] ${e.message}`).join("; ");
  }
}

export interface PackageImportInput {
  /** Raw manifest JSON or the parsed manifest object. */
  manifest: string | PackageManifest;
  /** Map of path → content for files listed in the manifest. */
  files?: Record<string, string>;
  /** The SKILL.md content, when included as a file. */
  skillMd?: string;
}

// ── Parsing helpers ──────────────────────────────────────────────────────────

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const ALLOWED_PLATFORMS: readonly PlatformCompatibility[] = ["copilot", "claude", "openai", "neutral"];
const ALLOWED_RESOURCE_KINDS: readonly SkillResourceKind[] = ["file", "script", "template", "reference", "example", "test"];
const ALLOWED_STATUSES: readonly SkillStatus[] = ["Draft", "Ready", "Deprecated"];

function parsePackageInput(input: PackageImportInput): { skill: Partial<Skill>; files: PackageFile[] } {
  let manifest: PackageManifest;
  try {
    manifest = typeof input.manifest === "string" ? JSON.parse(input.manifest) : input.manifest;
  } catch {
    throw new Error("Package manifest is not valid JSON.");
  }
  if (!manifest || manifest.kind !== "agentforge-skill") {
    throw new Error("Manifest is not an AgentForge skill package.");
  }
  if (typeof manifest.skillId !== "string" || typeof manifest.version !== "string") {
    throw new Error("Manifest is missing required fields (skillId, version).");
  }
  const fileMap = input.files ?? {};
  const skillMd = input.skillMd ?? fileMap["SKILL.md"];
  if (!skillMd) {
    throw new Error("Package is missing SKILL.md.");
  }
  const skill = parseSkillMarkdown(skillMd);
  // Manifest values take precedence for id/version to catch mismatches.
  if (manifest.skillId && skill.id && manifest.skillId !== skill.id) {
    throw new Error(`Manifest skillId "${manifest.skillId}" does not match SKILL.md id "${skill.id}".`);
  }
  skill.id = manifest.skillId;
  skill.version = manifest.version;

  const files: PackageFile[] = [];
  for (const p of manifest.files ?? []) {
    if (p === "SKILL.md") continue;
    const content = fileMap[p];
    if (content === undefined) {
      // Files may be documented but not present; surface as a stub.
      files.push({ path: p, content: "" });
    } else {
      files.push({ path: p, content });
    }
  }
  return { skill, files };
}

export function parseSkillMarkdown(md: string): Partial<Skill> {
  const text = md.replace(/^\uFEFF/, "");
  const fm = extractFrontmatter(text);
  const body = fm ? text.slice(fm.raw.length) : text;

  const skill: Partial<Skill> = {
    tags: [],
    resources: [],
    compatibility: [],
    otherTargets: [],
    requiredTools: [],
    permissions: [],
    frontmatter: "",
    status: "Draft",
    installationState: "not-installed",
    changelog: "",
    requirements: "",
    instructions: "",
  };

  if (fm) {
    applyFrontmatter(skill, fm.yaml);
    skill.frontmatter = "";
  }

  applyBody(skill, body);
  return skill;
}

interface FrontmatterExtract {
  raw: string;
  yaml: string;
}

function extractFrontmatter(text: string): FrontmatterExtract | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return null;
  return { raw: match[0], yaml: match[1] };
}

function applyFrontmatter(skill: Partial<Skill>, yaml: string): void {
  const map = parseSimpleYaml(yaml);
  if (typeof map.name === "string") skill.name = map.name.trim();
  if (typeof map.id === "string") skill.id = map.id.trim();
  if (typeof map.description === "string") skill.description = map.description.trim();
  if (typeof map.version === "string") skill.version = map.version.trim();
  if (typeof map.author === "string") skill.author = map.author.trim();
  if (typeof map.category === "string") skill.category = map.category.trim();
  if (typeof map.requirements === "string") skill.requirements = map.requirements.trim();
  if (Array.isArray(map.tags)) skill.tags = map.tags.filter((t): t is string => typeof t === "string");
  if (Array.isArray(map.compatibility)) {
    skill.compatibility = map.compatibility.filter((p): p is PlatformCompatibility =>
      (ALLOWED_PLATFORMS as readonly string[]).includes(p as string),
    );
  }
  if (Array.isArray(map.otherTargets)) skill.otherTargets = map.otherTargets.filter((t): t is string => typeof t === "string");
  if (Array.isArray(map.requiredTools)) skill.requiredTools = map.requiredTools.filter((t): t is string => typeof t === "string");
  if (Array.isArray(map.permissions)) skill.permissions = map.permissions.filter((t): t is string => typeof t === "string");
  if (typeof map.status === "string" && (ALLOWED_STATUSES as readonly string[]).includes(map.status as SkillStatus)) {
    skill.status = map.status as SkillStatus;
  }
}

function applyBody(skill: Partial<Skill>, body: string): void {
  const sections = splitSections(body);
  // First H1 is the skill name if not already set.
  const h1 = sections.find((s) => s.heading.level === 1);
  if (h1 && !skill.name) {
    skill.name = h1.heading.text.trim();
  }
  // Text immediately under the H1 (before the next heading) is the description.
  if (h1) {
    const desc = h1.body.trim();
    if (desc && !skill.description) skill.description = desc;
  }

  const get = (title: string) =>
    sections.find((s) => s.heading.level === 2 && s.heading.text.trim().toLowerCase() === title.toLowerCase());

  const instructions = get("Instructions");
  if (instructions && instructions.body.trim()) skill.instructions = instructions.body.trim();

  const requirements = get("Requirements");
  if (requirements && requirements.body.trim()) skill.requirements = requirements.body.trim();

  const changelog = get("Changelog");
  if (changelog && changelog.body.trim()) skill.changelog = changelog.body.trim();

  const tools = get("Required Tools");
  if (tools) {
    skill.requiredTools = parseList(tools.body);
  }
  const perms = get("Permissions");
  if (perms) {
    skill.permissions = parseList(perms.body);
  }
  const resources = get("Resources");
  if (resources) {
    skill.resources = parseResourceList(resources.body);
  }
}

interface Section {
  heading: { level: number; text: string };
  body: string;
}

function splitSections(body: string): Section[] {
  const lines = body.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      if (current) sections.push(current);
      current = { heading: { level: m[1].length, text: m[2] }, body: "" };
    } else if (current) {
      current.body += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections;
}

function parseList(body: string): string[] {
  return body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- ") || l.startsWith("* "))
    .map((l) => l.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
}

function parseResourceList(body: string): SkillResource[] {
  const resources: SkillResource[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("-")) continue;
    const text = line.replace(/^[-*]\s+/, "").trim();
    // Expected: **name** (kind): description
    const m = /^\*\*([^*]+)\*\*\s*\(([^)]+)\)\s*:\s*(.*)$/.exec(text);
    if (m) {
      const [, name, kind, description] = m;
      if ((ALLOWED_RESOURCE_KINDS as readonly string[]).includes(kind.trim())) {
        resources.push({
          id: slugify(name.trim()),
          name: name.trim(),
          kind: kind.trim() as SkillResourceKind,
          description: description.trim(),
        });
      }
    }
  }
  return resources;
}

function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      i += 1;
      continue;
    }
    const m = /^([\w."'-]+)\s*:\s*(.*)$/.exec(trimmed);
    if (!m) {
      i += 1;
      continue;
    }
    const [, key, value] = m;
    if (value === "") {
      // Could be a block list following.
      const list: unknown[] = [];
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        const next = lines[j];
        const nextTrim = next.trim();
        if (nextTrim.startsWith("- ")) {
          list.push(parseScalar(nextTrim.replace(/^-\s+/, "").trim()));
        } else if (nextTrim === "" || nextTrim.startsWith("#")) {
          continue;
        } else {
          break;
        }
      }
      if (list.length > 0) {
        result[key] = list;
        i = j;
        continue;
      }
      result[key] = "";
      i += 1;
    } else {
      result[key] = parseScalar(value.trim());
      i += 1;
    }
  }
  return result;
}

function parseScalar(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  if (/^-?\d+$/.test(raw)) return Number(raw);
  return raw;
}

function detectDuplicate(skill: Partial<Skill>, existing: Skill[]): DuplicateFinding {
  if (!skill.id) return { kind: "none" };
  const found = existing.find((s) => s.id === skill.id);
  if (!found) return { kind: "none" };
  if (!skill.version || !SEMVER_PATTERN.test(skill.version)) {
    return { kind: "same-version", existingId: found.id, existingVersion: found.version };
  }
  const cmp = compareSemver(skill.version, found.version);
  if (cmp === 0) return { kind: "same-version", existingId: found.id, existingVersion: found.version };
  if (cmp < 0) return { kind: "newer-existing", existingId: found.id, existingVersion: found.version };
  return { kind: "older-existing", existingId: found.id, existingVersion: found.version };
}

function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((p) => parseInt(p, 10));
  const pb = b.split(".").map((p) => parseInt(p, 10));
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function resourceFileName(r: SkillResource): string {
  const ext = r.kind === "script" ? ".sh" : ".md";
  const base = slugify(r.name || r.id);
  return `${base}${ext}`;
}

function resourceStub(r: SkillResource): string {
  return `# ${r.name}\n\nKind: ${r.kind}\n\n${r.description}\n\nThis resource file is a placeholder generated by AgentForge. Replace its contents with the actual resource.\n`;
}

// Re-export for consumers.
export { PACKAGE_MANIFEST_NAME };
