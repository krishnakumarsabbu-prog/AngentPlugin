import { describe, it, expect } from "vitest";
import { validateSkill, defaultValidationContext, compareDraftToStored } from "../src/skills/SkillValidator";
import type { Skill } from "../src/domain/skills/types";

function validSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: "security-audit",
    name: "Security Audit",
    description: "Reviews source for vulnerabilities.",
    version: "1.0.0",
    author: "platform-team",
    category: "Security",
    tags: ["security"],
    instructions: "Analyze source for injection and secret leakage. Produce a severity-ranked report.",
    frontmatter: "",
    resources: [],
    compatibility: ["copilot", "claude"],
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

describe("validateSkill — happy path", () => {
  it("accepts a complete skill", () => {
    const report = validateSkill(validSkill());
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });
});

describe("validateSkill — missing metadata", () => {
  it("flags missing name, id, description, version, instructions", () => {
    const report = validateSkill(
      validSkill({ name: "  ", id: "", description: "", version: "", instructions: "  " }),
    );
    const fields = report.errors.map((e) => e.field).sort();
    expect(fields).toEqual(["description", "id", "instructions", "name", "version"]);
    expect(report.valid).toBe(false);
  });
});

describe("validateSkill — invalid identifiers", () => {
  it("rejects uppercase and special characters", () => {
    const r1 = validateSkill(validSkill({ id: "Bad_ID" }));
    expect(r1.errors.some((e) => e.field === "id")).toBe(true);
  });
  it("rejects identifiers longer than 64 chars", () => {
    const r2 = validateSkill(validSkill({ id: "a".repeat(65) }));
    expect(r2.errors.some((e) => e.field === "id")).toBe(true);
  });
  it("flags duplicate id when not self", () => {
    const ctx = { ...defaultValidationContext(), existingIds: new Set(["security-audit"]) };
    const r = validateSkill(validSkill(), ctx);
    expect(r.errors.some((e) => e.field === "id" && /already exists/.test(e.message))).toBe(true);
  });
  it("does not flag duplicate id when it is the self id (update)", () => {
    const ctx = {
      ...defaultValidationContext(),
      existingIds: new Set(["security-audit"]),
      selfId: "security-audit",
    };
    const r = validateSkill(validSkill(), ctx);
    expect(r.errors.some((e) => e.field === "id")).toBe(false);
  });
});

describe("validateSkill — empty instructions", () => {
  it("errors on empty instructions", () => {
    const r = validateSkill(validSkill({ instructions: "" }));
    expect(r.errors.some((e) => e.field === "instructions")).toBe(true);
  });
  it("suggests more detail for short instructions", () => {
    const r = validateSkill(validSkill({ instructions: "Do thing." }));
    expect(r.suggestions.some((s) => s.field === "instructions")).toBe(true);
  });
});

describe("validateSkill — malformed frontmatter", () => {
  it("warns on non-YAML lines", () => {
    const r = validateSkill(validSkill({ frontmatter: "key: value\njust some prose" }));
    expect(r.warnings.some((w) => w.field === "frontmatter")).toBe(true);
  });
  it("does not warn on a fenced frontmatter block", () => {
    const r = validateSkill(validSkill({ frontmatter: "---\nkey: value\n---" }));
    expect(r.warnings.some((w) => w.field === "frontmatter")).toBe(false);
  });
});

describe("validateSkill — invalid references", () => {
  it("flags duplicate resource ids", () => {
    const r = validateSkill(
      validSkill({
        resources: [
          { id: "res-1", name: "a", kind: "reference", description: "d" },
          { id: "res-1", name: "b", kind: "reference", description: "d" },
        ],
      }),
    );
    expect(r.errors.some((e) => e.field === "resources[1].id")).toBe(true);
  });
  it("flags unsupported resource kind", () => {
    const r = validateSkill(
      validSkill({
        resources: [{ id: "res-1", name: "a", kind: "binary" as unknown as "reference", description: "d" }],
      }),
    );
    expect(r.errors.some((e) => e.field === "resources[0].kind")).toBe(true);
  });
  it("warns on empty resource description", () => {
    const r = validateSkill(
      validSkill({ resources: [{ id: "res-1", name: "a", kind: "reference", description: "" }] }),
    );
    expect(r.warnings.some((w) => w.field === "resources[0].description")).toBe(true);
  });
});

describe("validateSkill — unsupported declarations", () => {
  it("warns on executable runtime calls in instructions", () => {
    const r = validateSkill(validSkill({ instructions: "Run process.env injection then eval(x)." }));
    expect(r.warnings.some((w) => /unsupported declaration/i.test(w.message))).toBe(true);
  });
  it("does not flag declarations inside fenced code blocks", () => {
    const r = validateSkill({
      ...validSkill(),
      instructions: "Example:\n```bash\nprocess.env\n```\nThen proceed.",
    });
    expect(r.warnings.some((w) => /unsupported declaration/i.test(w.message))).toBe(false);
  });
});

describe("validateSkill — statuses and platforms", () => {
  it("rejects invalid status", () => {
    const r = validateSkill(validSkill({ status: "Live" as unknown as "Draft" }));
    expect(r.errors.some((e) => e.field === "status")).toBe(true);
  });
  it("rejects invalid installation state", () => {
    const r = validateSkill(validSkill({ installationState: "pending" as unknown as "not-installed" }));
    expect(r.errors.some((e) => e.field === "installationState")).toBe(true);
  });
  it("rejects unsupported platform", () => {
    const r = validateSkill(validSkill({ compatibility: ["gemini" as unknown as "copilot"] }));
    expect(r.errors.some((e) => e.field === "compatibility")).toBe(true);
  });
  it("warns on openai compatibility", () => {
    const r = validateSkill(validSkill({ compatibility: ["copilot", "openai"] }));
    expect(r.warnings.some((w) => w.field === "compatibility")).toBe(true);
  });
});

describe("compareDraftToStored", () => {
  it("reports no changes when draft matches stored", () => {
    const skill = validSkill();
    expect(compareDraftToStored(skill, skill).changed).toBe(false);
  });
  it("reports changed fields", () => {
    const stored = validSkill();
    const draft = { ...stored, name: "New Name", tags: ["security", "audit"] };
    const diff = compareDraftToStored(draft, stored);
    expect(diff.changed).toBe(true);
    expect(diff.changes.map((c) => c.field)).toContain("name");
    expect(diff.changes.map((c) => c.field)).toContain("tags");
  });
  it("reports changed when stored is undefined (new skill)", () => {
    expect(compareDraftToStored(validSkill(), undefined).changed).toBe(true);
  });
});
