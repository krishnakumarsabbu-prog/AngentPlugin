import { describe, it, expect } from "vitest";
import { sampleSkills, sampleAgents, sampleWorkflows, sampleExecutions } from "../src/storage/sampleData";

describe("domain sample data consistency", () => {
  it("skills have stable ids and ISO timestamps", () => {
    for (const s of sampleSkills) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(() => new Date(s.createdAt).toISOString()).not.toThrow();
      expect(() => new Date(s.updatedAt).toISOString()).not.toThrow();
    }
  });

  it("agents reference existing skill ids", () => {
    const skillIds = new Set(sampleSkills.map((s) => s.id));
    for (const a of sampleAgents) {
      for (const id of a.assignedSkillIds) {
        expect(skillIds.has(id)).toBe(true);
      }
    }
  });

  it("workflows have nodes and edges with matching references", () => {
    for (const w of sampleWorkflows) {
      const nodeIds = new Set(w.nodes.map((n) => n.id));
      for (const e of w.edges) {
        expect(nodeIds.has(e.source)).toBe(true);
        expect(nodeIds.has(e.target)).toBe(true);
      }
    }
  });

  it("executions reference existing workflows", () => {
    const wfIds = new Set(sampleWorkflows.map((w) => w.id));
    for (const e of sampleExecutions) {
      expect(wfIds.has(e.workflowId)).toBe(true);
    }
  });

  it("execution statuses are within the allowed set", () => {
    const allowed = new Set(["Running", "Succeeded", "Failed", "Cancelled", "Pending"]);
    for (const e of sampleExecutions) {
      expect(allowed.has(e.status)).toBe(true);
    }
  });
});
