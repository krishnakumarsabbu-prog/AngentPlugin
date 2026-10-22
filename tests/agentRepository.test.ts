import { describe, it, expect, beforeEach } from "vitest";
import { AgentRepository } from "../src/storage/AgentRepository";
import { sampleAgents } from "../src/storage/sampleData";
import { Agent } from "../src/domain/agents/types";

describe("AgentRepository", () => {
  let memoryAgents: Agent[];
  let repo: AgentRepository;

  beforeEach(() => {
    memoryAgents = JSON.parse(JSON.stringify(sampleAgents));
    repo = new AgentRepository({
      loadAgents: () => memoryAgents,
      saveAgents: (next) => {
        memoryAgents = next;
      },
    });
  });

  it("lists all seeded agents", async () => {
    const list = await repo.list();
    expect(list.length).toBe(6);
    expect(list.map((a) => a.id)).toContain("agent-architecture");
    expect(list.map((a) => a.id)).toContain("agent-planning");
    expect(list.map((a) => a.id)).toContain("agent-implementation");
    expect(list.map((a) => a.id)).toContain("agent-static-review");
    expect(list.map((a) => a.id)).toContain("agent-test-validation");
    expect(list.map((a) => a.id)).toContain("agent-documentation");
  });

  it("gets agent by id", async () => {
    const agent = await repo.get("agent-architecture");
    expect(agent).toBeDefined();
    expect(agent?.name).toBe("Architecture Agent");
    expect(agent?.role).toBe("Architect");
    expect(agent?.compatibility).toContain("claude");
  });

  it("returns undefined for non-existent agent", async () => {
    const agent = await repo.get("agent-unknown");
    expect(agent).toBeUndefined();
  });

  it("creates a new agent with valid inputs and default permissions", async () => {
    const created = await repo.create({
      name: "Performance Profiler Agent",
      role: "Optimizer",
      description: "Profiles bottleneck routines and recommends hotpath optimizations.",
      objective: "Minimize execution latency across pipeline nodes.",
      instructions: "Identify hot loops and excessive memory allocations.",
      assignedSkillIds: [],
    });

    expect(created.id).toMatch(/^agent-performance-profiler/);
    expect(created.name).toBe("Performance Profiler Agent");
    expect(created.role).toBe("Optimizer");
    expect(created.status).toBe("Draft");
    expect(created.permissionPolicy.maxTokens).toBe(8000);
    expect(created.permissionPolicy.network).toBe(false);
    expect(created.permissionPolicy.fileSystem).toBe("read");

    const all = await repo.list();
    expect(all.length).toBe(7);
  });

  it("throws when creating agent with empty name", async () => {
    await expect(
      repo.create({
        name: "   ",
        role: "Worker",
      }),
    ).rejects.toThrow("Agent name is required");
  });

  it("updates an existing agent", async () => {
    const updated = await repo.update("agent-planning", {
      name: "Strategic Planning Agent",
      role: "Lead Planner",
      objective: "Formulate long-range execution roadmaps.",
    });

    expect(updated.name).toBe("Strategic Planning Agent");
    expect(updated.role).toBe("Lead Planner");
    expect(updated.id).toBe("agent-planning"); // id immutable

    const fetched = await repo.get("agent-planning");
    expect(fetched?.name).toBe("Strategic Planning Agent");
  });

  it("duplicates an agent with Copy name, new unique ID and Draft status", async () => {
    const copy = await repo.duplicate("agent-architecture");
    expect(copy.name).toBe("Architecture Agent (Copy)");
    expect(copy.id).not.toBe("agent-architecture");
    expect(copy.id).toMatch(/^agent-architecture-agent-copy/);
    expect(copy.status).toBe("Draft");
    expect(copy.changelog).toContain("Duplicated from Architecture Agent");

    const all = await repo.list();
    expect(all.length).toBe(7);
  });

  it("deletes an agent", async () => {
    await repo.delete("agent-documentation");
    const all = await repo.list();
    expect(all.length).toBe(5);
    expect(await repo.get("agent-documentation")).toBeUndefined();
  });

  it("throws when deleting non-existent agent", async () => {
    await expect(repo.delete("agent-non-existent")).rejects.toThrow("Agent not found");
  });
});
