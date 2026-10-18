import { describe, it, expect } from "vitest";
import { SkillService, SkillValidationError } from "../src/skills/SkillService";
import { createHistoryStore, appendChangelog } from "../src/skills/SkillHistory";
import type { Skill, SkillSummary } from "../src/domain/skills/types";
import type { ISkillsStore } from "../src/services/interfaces";

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: "skill-demo",
    name: "Demo Skill",
    description: "A demo skill.",
    version: "1.0.0",
    author: "team",
    category: "General",
    tags: [],
    instructions: "Do the demo thing with enough detail to be useful.",
    frontmatter: "",
    resources: [],
    compatibility: ["copilot"],
    otherTargets: [],
    requiredTools: ["read_files"],
    permissions: ["filesystem:read"],
    changelog: "1.0.0 — Initial version",
    requirements: "",
    status: "Draft",
    installationState: "not-installed",
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

function createStore(initial: Skill[] = []): ISkillsStore & { items: () => Skill[] } {
  let items = [...initial];
  const clone = (s: Skill): Skill => ({
    ...s,
    tags: [...s.tags],
    resources: s.resources.map((r) => ({ ...r })),
    compatibility: [...s.compatibility],
    otherTargets: [...s.otherTargets],
    requiredTools: [...s.requiredTools],
    permissions: [...s.permissions],
  });
  const uniqueId = (name: string) => {
    const base = `skill-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "untitled"}`;
    let candidate = base;
    let n = 2;
    while (items.some((s) => s.id === candidate)) {
      candidate = `${base}-${n}`;
      n += 1;
    }
    return candidate;
  };
  return {
    items: () => items.map(clone),
    async list() {
      return items.map(clone);
    },
    async getSkill(id) {
      const found = items.find((s) => s.id === id);
      return found ? clone(found) : undefined;
    },
    async get(id) {
      const found = items.find((s) => s.id === id);
      return found ? clone(found) : undefined;
    },
    async summaries(): Promise<SkillSummary[]> {
      return items.map((s) => ({ id: s.id, name: s.name, status: s.status, version: s.version, updatedAt: s.updatedAt }));
    },
    async createSkill(input) {
      const now = new Date().toISOString();
      const skill: Skill = {
        ...makeSkill(input),
        id: (input.id && input.id.trim()) || uniqueId(input.name ?? "skill"),
        installationState: "not-installed",
        createdAt: now,
        updatedAt: now,
      };
      items = [skill, ...items];
      return clone(skill);
    },
    async updateSkill(id, patch) {
      const idx = items.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error(`Skill not found: ${id}`);
      const updated: Skill = { ...items[idx], ...patch, id, updatedAt: new Date().toISOString() };
      items[idx] = updated;
      return clone(updated);
    },
    async duplicateSkill(id) {
      const found = items.find((s) => s.id === id);
      if (!found) throw new Error(`Skill not found: ${id}`);
      const now = new Date().toISOString();
      const copy: Skill = {
        ...clone(found),
        id: uniqueId(found.name),
        name: `${found.name} (Copy)`,
        status: "Draft",
        installationState: "not-installed",
        createdAt: now,
        updatedAt: now,
      };
      items = [copy, ...items];
      return clone(copy);
    },
    async deleteSkill(id) {
      const before = items.length;
      items = items.filter((s) => s.id !== id);
      if (items.length === before) throw new Error(`Skill not found: ${id}`);
    },
  };
}

function makeService(initial: Skill[] = []) {
  const store = createStore(initial);
  const history = createHistoryStore();
  const service = new SkillService({ store, history });
  return { service, store, history };
}

describe("SkillService.create", () => {
  it("creates a valid skill and records history", async () => {
    const { service, history } = makeService();
    const { skill, report } = await service.create(makeSkill({ id: "new-skill" }));
    expect(skill.id).toBe("new-skill");
    expect(report.valid).toBe(true);
    expect(history.get("new-skill")?.entries[0].version).toBe("1.0.0");
  });

  it("rejects a duplicate id with SkillValidationError", async () => {
    const { service } = makeService([makeSkill({ id: "dup" })]);
    await expect(service.create(makeSkill({ id: "dup" }))).rejects.toBeInstanceOf(SkillValidationError);
  });

  it("rejects missing metadata", async () => {
    const { service } = makeService();
    await expect(
      service.create(makeSkill({ name: "", id: "", description: "", version: "", instructions: "" })),
    ).rejects.toBeInstanceOf(SkillValidationError);
  });
});

describe("SkillService.update", () => {
  it("updates an existing skill and appends to history on version change", async () => {
    const { service, history } = makeService([makeSkill({ id: "upd", version: "1.0.0" })]);
    const { skill } = await service.update("upd", { version: "1.1.0", instructions: "Updated instructions with enough detail." });
    expect(skill.version).toBe("1.1.0");
    expect(skill.changelog).toContain("1.1.0");
    const entries = history.get("upd")?.entries ?? [];
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].version).toBe("1.1.0");
  });

  it("throws when the skill is not found", async () => {
    const { service } = makeService();
    await expect(service.update("missing", { name: "x" })).rejects.toThrow(/Skill not found/);
  });
});

describe("SkillService.duplicate and remove", () => {
  it("duplicates a skill with a fresh id and Draft status", async () => {
    const { service, store } = makeService([makeSkill({ id: "orig", name: "Original" })]);
    const copy = await service.duplicate("orig");
    expect(copy.id).not.toBe("orig");
    expect(copy.name).toBe("Original (Copy)");
    expect(copy.status).toBe("Draft");
    expect((await store.list()).length).toBe(2);
  });

  it("removes a skill", async () => {
    const { service, store } = makeService([makeSkill({ id: "gone" })]);
    await service.remove("gone");
    expect((await store.list()).length).toBe(0);
  });

  it("throws when removing a missing skill", async () => {
    const { service } = makeService();
    await expect(service.remove("missing")).rejects.toThrow(/Skill not found/);
  });
});

describe("SkillService.validate and unsaved changes", () => {
  it("validate returns a report without throwing", async () => {
    const { service } = makeService();
    const report = await service.validate(makeSkill({ id: "v" }));
    expect(report.valid).toBe(true);
  });

  it("hasUnsavedChanges is true for new skills", async () => {
    const { service } = makeService();
    expect(await service.hasUnsavedChanges("new", makeSkill())).toBe(true);
  });

  it("hasUnsavedChanges is false when draft equals stored", async () => {
    const skill = makeSkill({ id: "same" });
    const { service } = makeService([skill]);
    expect(await service.hasUnsavedChanges("same", skill)).toBe(false);
  });

  it("diff reports changed fields", async () => {
    const stored = makeSkill({ id: "d", name: "Old" });
    const { service } = makeService([stored]);
    const diff = await service.diff("d", { ...stored, name: "New" });
    expect(diff.changed).toBe(true);
    expect(diff.changes.map((c) => c.field)).toContain("name");
  });
});

describe("appendChangelog", () => {
  it("adds a new version header", () => {
    expect(appendChangelog("1.0.0 — Initial", "1.1.0", "Bug fix")).toBe("1.1.0 — Bug fix\n1.0.0 — Initial");
  });
  it("does not duplicate an existing version header", () => {
    const existing = "1.0.0 — Initial";
    expect(appendChangelog(existing, "1.0.0", "Re-save")).toBe(existing);
  });
});

describe("SkillHistory store", () => {
  it("caps entries at 20", () => {
    const history = createHistoryStore();
    const skill = makeSkill({ id: "cap", version: "1.0.0" });
    for (let i = 1; i <= 25; i++) {
      history.record({ ...skill, version: `1.0.${i}`, updatedAt: `2026-10-${i}T00:00:00Z` });
    }
    expect(history.get("cap")?.entries.length).toBe(20);
  });

  it("remove deletes history", () => {
    const history = createHistoryStore();
    history.record(makeSkill({ id: "rm" }));
    history.remove("rm");
    expect(history.get("rm")).toBeUndefined();
  });
});
