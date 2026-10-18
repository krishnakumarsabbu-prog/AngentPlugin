import { describe, it, expect } from "vitest";
import { SkillPackageService, parseSkillMarkdown } from "../src/skills/SkillPackageService";
import { InstallationService, createInstallRegistry, InMemoryArtifactsStore } from "../src/skills/install/installationService";
import { CopilotInstallAdapter, ClaudeInstallAdapter, OpenAiInstallAdapter } from "../src/skills/install/platforms";
import { FileInstallAdapter } from "../src/skills/install/adapters";
import { buildSkillMarkdown } from "../src/skills/install/skillMarkdown";
import type { Skill } from "../src/domain/skills/types";
import type { ISkillsStore } from "../src/services/interfaces";
import * as path from "path";
import * as os from "os";

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: "skill-demo",
    name: "Demo Skill",
    description: "A demo skill.",
    version: "1.0.0",
    author: "team",
    category: "General",
    tags: ["review"],
    instructions: "Do the demo thing with enough detail to be useful.",
    frontmatter: "",
    resources: [
      { id: "res-checklist", name: "checklist.md", kind: "reference", description: "Review checklist." },
    ],
    compatibility: ["copilot", "claude"],
    otherTargets: [],
    requiredTools: ["read_files"],
    permissions: ["filesystem:read"],
    changelog: "1.0.0 — Initial",
    requirements: "Node 20+",
    status: "Ready",
    installationState: "not-installed",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function clone(s: Skill): Skill {
  return { ...s, tags: [...s.tags], resources: s.resources.map((r) => ({ ...r })), compatibility: [...s.compatibility], otherTargets: [...s.otherTargets], requiredTools: [...s.requiredTools], permissions: [...s.permissions] };
}

function createStore(initial: Skill[] = []): ISkillsStore & { items: () => Skill[] } {
  let items = [...initial];
  return {
    items: () => items.map(clone),
    async list() { return items.map(clone); },
    async getSkill(id) { const f = items.find((s) => s.id === id); return f ? clone(f) : undefined; },
    async get(id) { const f = items.find((s) => s.id === id); return f ? clone(f) : undefined; },
    async summaries() { return items.map((s) => ({ id: s.id, name: s.name, status: s.status, version: s.version, updatedAt: s.updatedAt })); },
    async createSkill(input) { const now = new Date().toISOString(); const s: Skill = { ...makeSkill(input), id: input.id || "new", createdAt: now, updatedAt: now }; items = [s, ...items]; return clone(s); },
    async updateSkill(id, patch) { const idx = items.findIndex((s) => s.id === id); if (idx === -1) throw new Error("not found"); items[idx] = { ...items[idx], ...patch, id, updatedAt: new Date().toISOString() }; return clone(items[idx]); },
    async duplicateSkill(id) { const f = items.find((s) => s.id === id); if (!f) throw new Error("not found"); const c = { ...clone(f), id: `${id}-copy`, name: `${f.name} (Copy)`, status: "Draft" as const, installationState: "not-installed" as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; items = [c, ...items]; return clone(c); },
    async deleteSkill(id) { items = items.filter((s) => s.id !== id); },
  };
}

const SKILL_MD_1 = `---
name: Demo Skill
id: skill-demo
description: A demo skill.
version: 1.0.0
author: team
category: General
tags:
  - review
compatibility:
  - copilot
  - claude
requiredTools:
  - read_files
permissions:
  - filesystem:read
requirements: Node 20+
---
# Demo Skill

A demo skill.

## Instructions

Do the demo thing with enough detail to be useful.

## Resources

- **checklist.md** (reference): Review checklist.
`;

describe("SkillPackageService.export", () => {
  it("exports SKILL.md with frontmatter and sections", async () => {
    const store = createStore([makeSkill()]);
    const svc = new SkillPackageService(store);
    const res = await svc.exportSkill("skill-demo", "skill-md");
    expect(res.format).toBe("skill-md");
    expect(res.primaryContent).toContain("---");
    expect(res.primaryContent).toContain("name: Demo Skill");
    expect(res.primaryContent).toContain("# Demo Skill");
    expect(res.primaryContent).toContain("## Instructions");
    expect(res.primaryContent).toContain("## Resources");
    expect(res.files).toEqual([]);
  });

  it("exports a package with manifest and resource files when resources are present", async () => {
    const store = createStore([makeSkill()]);
    const svc = new SkillPackageService(store);
    const res = await svc.exportSkill("skill-demo", "package");
    expect(res.format).toBe("package");
    expect(res.manifest?.kind).toBe("agentforge-skill");
    expect(res.files.some((f) => f.path === "SKILL.md")).toBe(true);
    expect(res.files.some((f) => f.path.startsWith("resources/"))).toBe(true);
    expect(res.manifest?.files).toContain("SKILL.md");
  });

  it("rejects export of a missing skill", async () => {
    const svc = new SkillPackageService(createStore());
    await expect(svc.exportSkill("missing", "skill-md")).rejects.toThrow(/Skill not found/);
  });

  it("rejects export of an invalid skill", async () => {
    const store = createStore([makeSkill({ name: "" })]);
    const svc = new SkillPackageService(store);
    await expect(svc.exportSkill("skill-demo", "skill-md")).rejects.toThrow(/validation errors/);
  });
});

describe("SkillPackageService.import", () => {
  it("round-trips an exported SKILL.md back into a valid preview", async () => {
    const store = createStore([makeSkill()]);
    const svc = new SkillPackageService(store);
    const exported = await svc.exportSkill("skill-demo", "skill-md");
    const svc2 = new SkillPackageService(createStore());
    const preview = await svc2.previewImport(exported.primaryContent);
    expect(preview.valid).toBe(true);
    expect(preview.skill.id).toBe("skill-demo");
    expect(preview.skill.name).toBe("Demo Skill");
    expect(preview.skill.instructions).toContain("Do the demo thing");
    expect(preview.duplicate.kind).toBe("none");
  });

  it("detects a same-version duplicate", async () => {
    const skill = makeSkill();
    const store = createStore([skill]);
    const svc = new SkillPackageService(store);
    const preview = await svc.previewImport(SKILL_MD_1);
    expect(preview.duplicate.kind).toBe("same-version");
    expect(preview.warnings.some((w) => w.includes("already exists"))).toBe(true);
  });

  it("detects a newer existing version", async () => {
    const store = createStore([makeSkill({ version: "2.0.0" })]);
    const svc = new SkillPackageService(store);
    const preview = await svc.previewImport(SKILL_MD_1);
    expect(preview.duplicate.kind).toBe("newer-existing");
  });

  it("detects an older existing version", async () => {
    const store = createStore([makeSkill({ version: "0.9.0" })]);
    const svc = new SkillPackageService(store);
    const preview = await svc.previewImport(SKILL_MD_1);
    expect(preview.duplicate.kind).toBe("older-existing");
  });

  it("saves a new skill from a valid preview", async () => {
    const svc = new SkillPackageService(createStore());
    const preview = await svc.previewImport(SKILL_MD_1);
    const result = await svc.saveImport(preview);
    expect(result.updated).toBe(false);
    expect(result.skill.id).toBe("skill-demo");
  });

  it("updates an existing skill on import", async () => {
    const store = createStore([makeSkill({ version: "0.9.0" })]);
    const svc = new SkillPackageService(store);
    const preview = await svc.previewImport(SKILL_MD_1);
    expect(preview.duplicate.kind).toBe("older-existing");
    const result = await svc.saveImport(preview);
    expect(result.updated).toBe(true);
    expect(result.skill.version).toBe("1.0.0");
  });

  it("rejects a malformed package safely", async () => {
    const svc = new SkillPackageService(createStore());
    const preview = await svc.previewImport("not a skill document at all");
    expect(preview.valid).toBe(false);
  });

  it("parses resources from a SKILL.md body", () => {
    const skill = parseSkillMarkdown(SKILL_MD_1);
    expect(skill.name).toBe("Demo Skill");
    expect(skill.id).toBe("skill-demo");
    expect(skill.resources?.length).toBe(1);
    expect(skill.resources?.[0].kind).toBe("reference");
    expect(skill.instructions).toContain("Do the demo thing");
  });
});

describe("buildSkillMarkdown", () => {
  it("emits YAML frontmatter and body sections", () => {
    const md = buildSkillMarkdown(makeSkill());
    expect(md).toContain("---");
    expect(md).toContain("name: Demo Skill");
    expect(md).toContain("# Demo Skill");
    expect(md).toContain("## Required Tools");
    expect(md).toContain("## Permissions");
  });
});

describe("Installation adapters", () => {
  it("simulated adapters report supported=false and do not write", async () => {
    const copilot = new CopilotInstallAdapter();
    const claude = new ClaudeInstallAdapter();
    const openai = new OpenAiInstallAdapter();
    for (const a of [copilot, claude, openai]) {
      expect(a.supported).toBe(false);
      const target = a.resolveTarget("workspace");
      expect(target).toBeDefined();
      const artifact = await a.install([{ relativePath: "SKILL.md", content: "x" }], target!);
      expect(artifact.simulated).toBe(true);
      expect(artifact.files).toContain("SKILL.md");
      expect(await a.uninstall(artifact)).toBe(false);
    }
  });

  it("openai has no user-scope target", () => {
    expect(new OpenAiInstallAdapter().resolveTarget("user")).toBeUndefined();
  });

  it("FileInstallAdapter rejects paths that escape the root", async () => {
    class TestAdapter extends FileInstallAdapter {
      readonly platform = "neutral" as const;
      readonly displayName = "test";
      resolveTarget() { return { platform: "neutral" as const, scope: "workspace" as const, root: "/tmp/root", displayPath: "/tmp/root" }; }
      protected exists() { return false; }
      protected async writeFile() {}
      protected async removeFile() {}
    }
    const a = new TestAdapter();
    const target = a.resolveTarget("workspace")!;
    await expect(a.install([{ relativePath: "../escape.md", content: "x" }], target)).rejects.toThrow(/outside install root/);
    await expect(a.install([{ relativePath: "/abs/path.md", content: "x" }], target)).rejects.toThrow(/outside install root/);
  });
});

describe("InstallationService", () => {
  it("plans and records a simulated install, then uninstalls the record", async () => {
    const root = path.join(os.tmpdir(), `af-install-${Date.now()}`);
    const registry = createInstallRegistry(root);
    const artifacts = new InMemoryArtifactsStore();
    const svc = new InstallationService(registry, artifacts);
    const targets = svc.targetsFor("copilot");
    expect(targets.length).toBeGreaterThan(0);
    const plan = await svc.plan("skill-demo", "copilot", "workspace", [{ relativePath: "SKILL.md", content: "x" }]);
    expect(plan.simulated).toBe(true);
    expect(plan.supported).toBe(false);
    const artifact = await svc.install("skill-demo", plan);
    expect(artifact.simulated).toBe(true);
    expect(svc.artifactsFor("skill-demo").length).toBe(1);
    const result = await svc.uninstall("skill-demo", "copilot", "workspace");
    expect(result.recordRemoved).toBe(true);
    expect(svc.artifactsFor("skill-demo").length).toBe(0);
  });

  it("neutral adapter performs a real write within the approved root", async () => {
    const root = path.join(os.tmpdir(), `af-neutral-${Date.now()}`);
    const registry = createInstallRegistry(root);
    const artifacts = new InMemoryArtifactsStore();
    const svc = new InstallationService(registry, artifacts);
    const plan = await svc.plan("skill-demo", "neutral", "workspace", [{ relativePath: "SKILL.md", content: "hello" }]);
    expect(plan.simulated).toBe(false);
    expect(plan.supported).toBe(true);
    const artifact = await svc.install("skill-demo", plan);
    expect(artifact.simulated).toBe(false);
    const result = await svc.uninstall("skill-demo", "neutral", "workspace");
    expect(result.recordRemoved).toBe(true);
    expect(result.diskRemoved).toBe(true);
  });

  it("rejects unsupported scopes", async () => {
    const svc = new InstallationService(createInstallRegistry(null), new InMemoryArtifactsStore());
    await expect(svc.plan("x", "openai", "user", [])).rejects.toThrow(/does not support scope/);
  });
});
