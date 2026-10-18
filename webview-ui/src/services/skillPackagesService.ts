import { sendRequest, hasVsCodeApi } from "./vscodeApi";
import { demoSkillsStore } from "../data/demoData";
import { buildSkillMarkdown } from "./skillMd";
import type {
  Skill,
  PlatformCompatibility,
  InstallScope,
  InstallTarget,
  InstalledArtifact,
  InstallPlanSummary,
  UninstallSummary,
  ExportResult,
  ImportPreview,
  ImportSaveResult,
  PackageFile,
  PackageManifest,
} from "../types";

export interface SkillPackagesStore {
  exportSkill(id: string, format: "skill-md" | "package"): Promise<ExportResult>;
  previewImport(content: string, files?: Record<string, string>, skillMd?: string): Promise<ImportPreview>;
  saveImport(preview: ImportPreview): Promise<ImportSaveResult>;
  installTargets(platform: PlatformCompatibility): Promise<{ scope: InstallScope; target: InstallTarget }[]>;
  installPlan(id: string, platform: PlatformCompatibility, scope: InstallScope): Promise<InstallPlanSummary>;
  install(id: string, platform: PlatformCompatibility, scope: InstallScope): Promise<InstalledArtifact>;
  installations(id: string): Promise<InstalledArtifact[]>;
  uninstall(id: string, platform: PlatformCompatibility, scope: InstallScope, removeFromDisk: boolean): Promise<UninstallSummary>;
}

const hostStore: SkillPackagesStore = {
  async exportSkill(id, format) {
    return sendRequest<ExportResult>("skills.export", { id, format });
  },
  async previewImport(content, files, skillMd) {
    return sendRequest<ImportPreview>("skills.importPreview", { content, files, skillMd });
  },
  async saveImport(preview) {
    return sendRequest<ImportSaveResult>("skills.importSave", { preview });
  },
  async installTargets(platform) {
    return sendRequest<{ scope: InstallScope; target: InstallTarget }[]>("skills.installTargets", { platform });
  },
  async installPlan(id, platform, scope) {
    return sendRequest<InstallPlanSummary>("skills.installPlan", { id, platform, scope });
  },
  async install(id, platform, scope) {
    return sendRequest<InstalledArtifact>("skills.install", { id, platform, scope });
  },
  async installations(id) {
    return sendRequest<InstalledArtifact[]>("skills.installations", { id });
  },
  async uninstall(id, platform, scope, removeFromDisk) {
    return sendRequest<UninstallSummary>("skills.uninstall", { id, platform, scope, removeFromDisk });
  },
};

// Browser fallback: in-memory, simulated installs. Mirrors host semantics so
// the dialog is fully exercisable in preview.
const browserArtifacts = new Map<string, InstalledArtifact[]>();

function browserExport(id: string, format: "skill-md" | "package"): ExportResult {
  const skill = demoSkillsStore.get(id);
  if (!skill) throw new Error(`Skill not found: ${id}`);
  const skillMd = buildSkillMarkdown(skill);
  if (format === "skill-md") {
    return {
      format,
      skillId: skill.id,
      skillName: skill.name,
      version: skill.version,
      fileName: `${skill.id}.md`,
      primaryContent: skillMd,
      files: [],
      validation: { valid: true, errors: [], warnings: [], suggestions: [] },
    };
  }
  const files: PackageFile[] = [];
  for (const r of skill.resources) {
    const ext = r.kind === "script" ? ".sh" : ".md";
    const base = r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || r.id;
    files.push({ path: `resources/${base}${ext}`, content: `# ${r.name}\n\n${r.description}\n` });
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
    format: "package",
    skillId: skill.id,
    skillName: skill.name,
    version: skill.version,
    fileName: `${skill.id}-package`,
    primaryContent: JSON.stringify(manifest, null, 2),
    files,
    manifest,
    validation: { valid: true, errors: [], warnings: [], suggestions: [] },
  };
}

function browserParseSkillMarkdown(md: string): Partial<Skill> {
  const fmMatch = /^---\n([\s\S]*?)\n---\n?/.exec(md);
  const skill: Partial<Skill> = {
    tags: [], resources: [], compatibility: [], otherTargets: [],
    requiredTools: [], permissions: [], frontmatter: "",
    status: "Draft", installationState: "not-installed",
    changelog: "", requirements: "", instructions: "",
  };
  if (fmMatch) {
    const yaml = fmMatch[1];
    for (const line of yaml.split(/\n/)) {
      const m = /^([\w.-]+)\s*:\s*(.*)$/.exec(line.trim());
      if (!m) continue;
      const [, key, value] = m;
      if (key === "name") skill.name = value;
      if (key === "id") skill.id = value;
      if (key === "description") skill.description = value;
      if (key === "version") skill.version = value;
      if (key === "author") skill.author = value;
      if (key === "category") skill.category = value;
    }
  }
  // crude body extraction
  const body = fmMatch ? md.slice(fmMatch[0].length) : md;
  const instrMatch = /## Instructions\n([\s\S]*?)(?:\n## |$)/.exec(body);
  if (instrMatch) skill.instructions = instrMatch[1].trim();
  return skill;
}

const browserStore: SkillPackagesStore = {
  async exportSkill(id, format) {
    return browserExport(id, format);
  },
  async previewImport(content, files, skillMd) {
    let skill: Partial<Skill>;
    let pkgFiles: PackageFile[] = [];
    try {
      const manifest = JSON.parse(content) as PackageManifest;
      if (manifest.kind !== "agentforge-skill") throw new Error("not a package");
      const md = skillMd ?? files?.["SKILL.md"] ?? "";
      if (!md) throw new Error("Package missing SKILL.md");
      skill = browserParseSkillMarkdown(md);
      skill.id = manifest.skillId;
      skill.version = manifest.version;
      for (const p of manifest.files ?? []) {
        if (p === "SKILL.md") continue;
        pkgFiles.push({ path: p, content: files?.[p] ?? "" });
      }
    } catch {
      skill = browserParseSkillMarkdown(content);
    }
    const existing = demoSkillsStore.list().find((s) => s.id === skill.id);
    const duplicate: ImportPreview["duplicate"] = existing
      ? { kind: existing.version === skill.version ? "same-version" : "newer-existing", existingId: existing.id, existingVersion: existing.version }
      : { kind: "none" };
    const valid = !!(skill.name && skill.id && skill.version && skill.instructions);
    return {
      valid,
      skill,
      files: pkgFiles,
      duplicate,
      validation: { valid, errors: [], warnings: [], suggestions: [] },
      warnings: duplicate.kind === "none" ? [] : [`A skill with id "${duplicate.existingId}" already exists (${duplicate.existingVersion}).`],
      errors: valid ? [] : ["Missing required fields (name, id, version, instructions)."],
    };
  },
  async saveImport(preview) {
    if (!preview.valid) throw new Error("Cannot save invalid import");
    const skill = preview.skill as Skill;
    const existing = demoSkillsStore.get(skill.id);
    if (existing) {
      const updated = demoSkillsStore.update(skill.id, skill);
      return { skill: updated, updated: true, files: preview.files };
    }
    const created = demoSkillsStore.create(skill);
    return { skill: created, updated: false, files: preview.files };
  },
  async installTargets(platform) {
    const out: { scope: InstallScope; target: InstallTarget }[] = [];
    if (platform !== "openai") {
      out.push({ scope: "user", target: { platform, scope: "user", root: `~/.${platform}/skills`, displayPath: `~/.${platform}/skills (simulated)` } });
    }
    out.push({ scope: "workspace", target: { platform, scope: "workspace", root: `<workspace>/.${platform}/skills`, displayPath: `<workspace>/.${platform}/skills (simulated)` } });
    return out;
  },
  async installPlan(id, platform, scope) {
    const skill = demoSkillsStore.get(id);
    if (!skill) throw new Error(`Skill not found: ${id}`);
    const target: InstallTarget = {
      platform,
      scope,
      root: scope === "user" ? `~/.${platform}/skills` : `<workspace>/.${platform}/skills`,
      displayPath: `${scope === "user" ? "~" : "<workspace>"}/.${platform}/skills (simulated)`,
    };
    return {
      target,
      existing: [],
      supported: false,
      simulated: true,
      files: ["SKILL.md", ...skill.resources.map((r) => `resources/${r.name}`)],
    };
  },
  async install(id, platform, scope) {
    const skill = demoSkillsStore.get(id);
    if (!skill) throw new Error(`Skill not found: ${id}`);
    const artifact: InstalledArtifact = {
      platform, scope,
      root: scope === "user" ? `~/.${platform}/skills` : `<workspace>/.${platform}/skills`,
      files: ["SKILL.md", ...skill.resources.map((r) => `resources/${r.name}`)],
      installedAt: new Date().toISOString(),
      simulated: true,
    };
    const arr = browserArtifacts.get(id) ?? [];
    const idx = arr.findIndex((a) => a.platform === platform && a.scope === scope);
    if (idx >= 0) arr[idx] = artifact; else arr.push(artifact);
    browserArtifacts.set(id, arr);
    return artifact;
  },
  async installations(id) {
    return [...(browserArtifacts.get(id) ?? [])];
  },
  async uninstall(id, platform, scope, removeFromDisk) {
    const arr = browserArtifacts.get(id) ?? [];
    const idx = arr.findIndex((a) => a.platform === platform && a.scope === scope);
    if (idx < 0) {
      return { recordRemoved: false, diskRemoved: false, simulated: true, message: "No installation record found." };
    }
    const [removed] = arr.splice(idx, 1);
    browserArtifacts.set(id, arr);
    return {
      recordRemoved: true,
      diskRemoved: false,
      simulated: removed.simulated,
      message: removeFromDisk
        ? "Removed AgentForge record. No files were written during the (simulated) install, so nothing was removed from disk."
        : "Removed only the AgentForge installation record. Installed files on disk were left untouched.",
    };
  },
};

export function getSkillPackagesStore(): SkillPackagesStore {
  return hasVsCodeApi() ? hostStore : browserStore;
}
