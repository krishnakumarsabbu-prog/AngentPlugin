import { describe, it, expect } from "vitest";
import {
  validateAgent,
  AgentValidationContext,
  LEAST_PRIVILEGE_PERMISSIONS,
} from "../src/agents/AgentValidator";
import { Agent } from "../src/domain/agents/types";

describe("AgentValidator", () => {
  const validAgent: Partial<Agent> = {
    id: "test-reviewer-agent",
    name: "Test Reviewer Agent",
    role: "Code Reviewer",
    version: "1.0.0",
    status: "Draft",
    objective: "Inspect pull requests for security vulnerabilities and code quality.",
    instructions: "Systematically check for memory leaks, unhandled exceptions, and injection risks.",
    assignedSkillIds: ["skill-review"],
    toolDefinitions: [
      {
        id: "ast-grep",
        name: "AST Grep Search",
        description: "Searches syntax trees for code anti-patterns.",
        purpose: "Locate dangerous function patterns.",
        availability: "always",
        requiredPermissions: [],
        schema: {
          type: "object",
          properties: {
            pattern: { type: "string" },
          },
          required: ["pattern"],
        },
      },
    ],
    permissionPolicy: { ...LEAST_PRIVILEGE_PERMISSIONS },
    inputSchema: {
      type: "object",
      properties: {
        prNumber: { type: "number" },
      },
      required: ["prNumber"],
    },
    outputSchema: {
      type: "object",
      properties: {
        approved: { type: "boolean" },
      },
      required: ["approved"],
    },
    compatibility: ["copilot", "claude", "openai", "neutral"],
  };

  const defaultContext: AgentValidationContext = {
    existingIds: new Set(["existing-agent-1"]),
    knownSkills: new Map([
      ["skill-review", { id: "skill-review", name: "Code Review Skill", compatibility: ["neutral"] }],
      ["skill-claude-only", { id: "skill-claude-only", name: "Claude Special", compatibility: ["claude"] }],
    ]),
  };

  it("passes validation for a valid agent", () => {
    const report = validateAgent(validAgent, defaultContext);
    expect(report.valid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  describe("Identity validation", () => {
    it("flags missing name and id", () => {
      const report = validateAgent({ ...validAgent, name: "", id: "" }, defaultContext);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.field === "name")).toBe(true);
      expect(report.errors.some((e) => e.field === "id")).toBe(true);
    });

    it("flags invalid agent ID with uppercase or special characters", () => {
      const report = validateAgent({ ...validAgent, id: "Invalid_ID!" }, defaultContext);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.field === "id")).toBe(true);
    });

    it("detects duplicate agent ID", () => {
      const report = validateAgent({ ...validAgent, id: "existing-agent-1" }, defaultContext);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.field === "id" && e.message.includes("already exists"))).toBe(true);
    });

    it("allows duplicate ID if selfId matches (on update)", () => {
      const ctx: AgentValidationContext = {
        ...defaultContext,
        selfId: "existing-agent-1",
      };
      const report = validateAgent({ ...validAgent, id: "existing-agent-1" }, ctx);
      expect(report.errors.some((e) => e.field === "id")).toBe(false);
    });

    it("validates semantic versioning", () => {
      const report = validateAgent({ ...validAgent, version: "not-semver" }, defaultContext);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.field === "version")).toBe(true);
    });
  });

  describe("Mission validation", () => {
    it("flags missing objective and instructions", () => {
      const report = validateAgent({ ...validAgent, objective: "", instructions: "" }, defaultContext);
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.field === "objective")).toBe(true);
      expect(report.errors.some((e) => e.field === "instructions")).toBe(true);
    });

    it("warns if objective or instructions are very short", () => {
      const report = validateAgent({ ...validAgent, objective: "Too short", instructions: "Short instr." }, defaultContext);
      expect(report.warnings.some((w) => w.field === "objective")).toBe(true);
      expect(report.warnings.some((w) => w.field === "instructions")).toBe(true);
    });
  });

  describe("Skills reference & platform compatibility", () => {
    it("detects references to missing skills", () => {
      const report = validateAgent(
        { ...validAgent, assignedSkillIds: ["skill-review", "skill-nonexistent"] },
        defaultContext
      );
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.field === "assignedSkillIds" && e.message.includes("skill-nonexistent"))).toBe(true);
    });

    it("warns about incompatible skill and agent platform combinations", () => {
      const report = validateAgent(
        {
          ...validAgent,
          assignedSkillIds: ["skill-claude-only"],
          compatibility: ["copilot"], // copilot does not overlap with claude-only
        },
        defaultContext
      );
      expect(report.warnings.some((w) => w.field === "compatibility" && w.message.includes("does not overlap"))).toBe(true);
    });
  });

  describe("Tools validation", () => {
    it("validates tool id and name", () => {
      const report = validateAgent(
        {
          ...validAgent,
          toolDefinitions: [
            { id: "", name: "", description: "test" },
          ],
        },
        defaultContext
      );
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.field === "toolDefinitions[0].id")).toBe(true);
      expect(report.errors.some((e) => e.field === "toolDefinitions[0].name")).toBe(true);
    });

    it("warns when tool requires permissions that agent permissions disable", () => {
      const report = validateAgent(
        {
          ...validAgent,
          permissionPolicy: { ...LEAST_PRIVILEGE_PERMISSIONS, shell: false },
          toolDefinitions: [
            {
              id: "bash-runner",
              name: "Bash Runner",
              description: "Runs bash commands",
              requiredPermissions: ["shell"],
            },
          ],
        },
        defaultContext
      );
      expect(report.warnings.some((w) => w.field === "toolDefinitions[0].requiredPermissions")).toBe(true);
    });
  });

  describe("Permission policy validation", () => {
    it("flags contradiction between readOnly and writeOperations", () => {
      const report = validateAgent(
        {
          ...validAgent,
          permissionPolicy: {
            ...LEAST_PRIVILEGE_PERMISSIONS,
            readOnly: true,
            writeOperations: true,
          },
        },
        defaultContext
      );
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.field === "permissionPolicy.writeOperations")).toBe(true);
    });

    it("warns when shell is declared without human approval", () => {
      const report = validateAgent(
        {
          ...validAgent,
          permissionPolicy: {
            ...LEAST_PRIVILEGE_PERMISSIONS,
            shell: true,
            humanApprovalRequired: false,
          },
        },
        defaultContext
      );
      expect(report.warnings.some((w) => w.field === "permissionPolicy.humanApprovalRequired")).toBe(true);
    });
  });

  describe("JSON Schema validation for inputs and outputs", () => {
    it("flags malformed json schema properties or types", () => {
      const report = validateAgent(
        {
          ...validAgent,
          inputSchema: { type: "not_a_valid_json_type" as any },
        },
        defaultContext
      );
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.field === "inputSchema.type")).toBe(true);
    });

    it("flags non-array required field in schema", () => {
      const report = validateAgent(
        {
          ...validAgent,
          outputSchema: { type: "object", required: "not-an-array" as any },
        },
        defaultContext
      );
      expect(report.valid).toBe(false);
      expect(report.errors.some((e) => e.field === "outputSchema.required")).toBe(true);
    });
  });
});
