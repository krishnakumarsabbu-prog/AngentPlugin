import { describe, it, expect, beforeEach } from "vitest";
import { WorkflowRepository } from "../src/storage/WorkflowRepository";
import { sampleWorkflows } from "../src/storage/sampleData";
import { Workflow } from "../src/domain/workflows/types";

describe("WorkflowRepository", () => {
  let memoryWorkflows: Workflow[];
  let repo: WorkflowRepository;

  beforeEach(() => {
    memoryWorkflows = JSON.parse(JSON.stringify(sampleWorkflows));
    repo = new WorkflowRepository({
      loadWorkflows: () => memoryWorkflows,
      saveWorkflows: (next) => {
        memoryWorkflows = next;
      },
    });
  });

  it("lists all seeded workflows", async () => {
    const list = await repo.list();
    expect(list.length).toBe(3);
    expect(list.map((w) => w.id)).toContain("wf-feature-delivery");
    expect(list.map((w) => w.id)).toContain("wf-security-review");
    expect(list.map((w) => w.id)).toContain("wf-release-readiness");
  });

  it("seeds sample Enterprise Feature Delivery pipeline with required nodes", async () => {
    const wf = await repo.get("wf-feature-delivery");
    expect(wf).toBeDefined();
    expect(wf?.name).toBe("Enterprise Feature Delivery");
    expect(wf?.status).toBe("Active");

    const nodeNames = wf?.nodes.map((n) => n.name) || [];
    expect(nodeNames).toContain("Start");
    expect(nodeNames).toContain("Requirement Intake");
    expect(nodeNames).toContain("Architecture Agent");
    expect(nodeNames).toContain("Planning Agent");
    expect(nodeNames).toContain("Human Plan Approval");
    expect(nodeNames).toContain("Implementation Agent");
    expect(nodeNames).toContain("Code Review Agent");
    expect(nodeNames).toContain("Test Validation Agent");
    expect(nodeNames).toContain("Summary Agent");
    expect(nodeNames).toContain("Final Artifact Output");
    expect(nodeNames).toContain("End");

    const nodeTypes = wf?.nodes.map((n) => n.type) || [];
    expect(nodeTypes).toContain("start");
    expect(nodeTypes).toContain("requirement_input");
    expect(nodeTypes).toContain("agent_execution");
    expect(nodeTypes).toContain("planning");
    expect(nodeTypes).toContain("human_approval");
    expect(nodeTypes).toContain("validation");
    expect(nodeTypes).toContain("artifact_output");
    expect(nodeTypes).toContain("end");

    expect(wf?.edges.length).toBe(10);
  });

  it("summaries return concise workflow overview", async () => {
    const summaries = await repo.summaries();
    expect(summaries.length).toBe(3);
    const efSummary = summaries.find((s) => s.id === "wf-feature-delivery");
    expect(efSummary).toBeDefined();
    expect(efSummary?.name).toBe("Enterprise Feature Delivery");
    expect(efSummary?.nodeCount).toBe(11);
  });

  it("creates a new workflow with default nodes and unique ID", async () => {
    const created = await repo.create({
      name: "Autonomous Refactoring Loop",
      description: "Applies automated architectural migrations.",
    });

    expect(created.id).toMatch(/^wf-autonomous-refactoring-loop/);
    expect(created.name).toBe("Autonomous Refactoring Loop");
    expect(created.status).toBe("Draft");
    expect(created.nodes.length).toBe(2);
    expect(created.nodes[0].type).toBe("start");
    expect(created.nodes[1].type).toBe("end");
    expect(created.edges.length).toBe(1);

    const list = await repo.list();
    expect(list.length).toBe(4);
  });

  it("updates existing workflow nodes and settings", async () => {
    const updated = await repo.update("wf-feature-delivery", {
      status: "Ready",
      description: "Updated enterprise delivery process.",
    });

    expect(updated.status).toBe("Ready");
    expect(updated.description).toBe("Updated enterprise delivery process.");

    const fetched = await repo.get("wf-feature-delivery");
    expect(fetched?.status).toBe("Ready");
  });

  it("duplicates an existing workflow cleanly", async () => {
    const copy = await repo.duplicate("wf-feature-delivery");
    expect(copy.id).toMatch(/^wf-enterprise-feature-delivery-copy/);
    expect(copy.name).toBe("Enterprise Feature Delivery (Copy)");
    expect(copy.status).toBe("Draft");
    expect(copy.nodes.length).toBe(11);
    expect(copy.edges.length).toBe(10);

    const list = await repo.list();
    expect(list.length).toBe(4);
  });

  it("deletes a workflow by id", async () => {
    await repo.delete("wf-release-readiness");
    const list = await repo.list();
    expect(list.length).toBe(2);
    expect(list.some((w) => w.id === "wf-release-readiness")).toBe(false);
  });

  it("throws when deleting non-existent workflow", async () => {
    await expect(repo.delete("wf-non-existent")).rejects.toThrow("Workflow not found");
  });
});
