import { describe, it, expect } from "vitest";
import {
  buildSkillMarkdown,
  draftToSkill,
  skillToYamlFrontmatter,
  suggestIdentifier,
  validateDraft,
  type DraftSkill,
} from "../webview-ui/src/services/skillMd";

function baseDraft(): DraftSkill {
  return {
    name: "Security Audit",
    identifier: "security-audit",
    description: "Finds vulnerabilities.",
    version: "1.0.0",
    author: "team",
    category: "Security",
    tagsText: "security, audit",
    instructions: "# Step 1\n\nDo the thing.\n\n```bash\nrun-check.sh\n```",
    frontmatter: "",
    resources: [],
    compatibility: ["copilot", "claude"],
    otherTargetsText: "",
    requiredToolsText: "read_files",
    permissionsText: "filesystem:read",
    changelog: "1.0.0 — Initial version",
    requirements: "Node 20+",
  };
}

describe("suggestIdentifier", () => {
  it("slugs names to lowercase dash form", () => {
    expect(suggestIdentifier("Security Audit Skill")).toBe("security-audit-skill");
    expect(suggestIdentifier("  Hello, World!  ")).toBe("hello-world");
    expect(suggestIdentifier("   ")).toBe("untitled");
  });
});

describe("validateDraft", () => {
  it("accepts a complete draft", () => {
    const { errors } = validateDraft(baseDraft());
    expect(errors).toHaveLength(0);
  });

  it("flags each missing required field", () => {
    const { errors } = validateDraft({
      ...baseDraft(),
      name: "  ",
      identifier: "",
      description: "",
      version: "",
      instructions: " ",
    });
    const fields = errors.map((e) => e.field).sort();
    expect(fields).toEqual(["description", "identifier", "instructions", "name", "version"]);
  });

  it("rejects malformed identifier and version", () => {
    const { errors } = validateDraft({
      ...baseDraft(),
      identifier: "Bad_ID",
      version: "one",
    });
    expect(errors.map((e) => e.field)).toContain("identifier");
    expect(errors.map((e) => e.field)).toContain("version");
  });

  it("warns when OpenAI compatibility is selected", () => {
    const { warnings } = validateDraft({
      ...baseDraft(),
      compatibility: ["copilot", "openai"],
    });
    expect(warnings.some((w) => w.field === "compatibility")).toBe(true);
  });

  it("warns on lines without a YAML key or list marker", () => {
    const { warnings } = validateDraft({
      ...baseDraft(),
      frontmatter: "key: value\njust some prose without a colon",
    });
    expect(warnings.some((w) => w.field === "frontmatter")).toBe(true);
  });
});

describe("buildSkillMarkdown", () => {
  it("produces YAML frontmatter plus body sections", () => {
    const md = buildSkillMarkdown(draftToSkill(baseDraft()));
    expect(md.startsWith("---\nname: Security Audit\nid: security-audit\n")).toBe(true);
    expect(md).toContain("## Instructions");
    expect(md).toContain("Do the thing.");
    expect(md).toContain("```bash");
    expect(md).toContain("## Required Tools");
    expect(md).toContain("- read_files");
    expect(md).toContain("## Permissions");
    expect(md).toContain("## Changelog");
    expect(md).toContain("1.0.0 — Initial version");
  });

  it("preserves markdown in instructions verbatim", () => {
    const md = buildSkillMarkdown(draftToSkill(baseDraft()));
    expect(md).toContain("# Step 1\n\nDo the thing.\n\n```bash\nrun-check.sh\n```");
  });

  it("emits list-form frontmatter for tags and compatibility", () => {
    const fm = skillToYamlFrontmatter(draftToSkill(baseDraft()));
    expect(fm).toContain("tags:\n  - security\n  - audit");
    expect(fm).toContain("compatibility:\n  - copilot\n  - claude");
  });

  it("does not evaluate raw HTML in descriptions", () => {
    const md = buildSkillMarkdown(
      draftToSkill({ ...baseDraft(), description: "<img src=x onerror=alert(1)>" }),
    );
    expect(md).toContain('"<img src=x onerror=alert(1)>"');
  });
});
