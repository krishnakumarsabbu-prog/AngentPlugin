import { describe, it, expect } from "vitest";
import { exportAgentConfig } from "../src/agents/AgentExporter";
import { Agent } from "../src/domain/agents/types";

describe("AgentExporter", () => {
  const sampleAgent: Partial<Agent> = {
    id: "agent-architecture",
    name: "Architecture Agent",
    role: "System Architect",
    version: "1.2.0",
    status: "Ready",
    objective: "Design scalable components and maintain clean boundary interfaces.",
    instructions: "Always favor modularity and adhere strictly to defined domain protocols.",
    scope: "Architecture blueprints, domain boundaries, data schema definitions.",
    outOfScope: "Writing business logic, deploying containers directly.",
    operatingPrinciples: [
      "Favor composition over deep inheritance hierarchies.",
      "Isolate external IO behind explicit ports and adapters.",
    ],
    assignedSkillIds: ["skill-review", "skill-planning"],
    toolDefinitions: [
      {
        id: "inspect-dep-graph",
        name: "Dependency Graph Inspector",
        description: "Evaluates circular dependency cycles across codebase imports.",
        purpose: "Detect architecture boundary violations early.",
        availability: "always",
        requiredPermissions: ["write"],
        schema: {
          type: "object",
          properties: {
            rootPath: { type: "string" },
          },
          required: ["rootPath"],
        },
      },
    ],
    permissionPolicy: {
      network: false,
      fileSystem: "read",
      shell: false,
      maxTokens: 16000,
      readOnly: true,
      workspaceAccess: true,
      writeOperations: false,
      restrictedPaths: [".git", ".env"],
      humanApprovalRequired: true,
    },
    compatibility: ["copilot", "claude", "openai", "neutral"],
  };

  it("exports canonical agent specification (agent-spec)", () => {
    const res = exportAgentConfig(sampleAgent, "agent-spec");
    expect(res.format).toBe("agent-spec");
    expect(res.fileName).toBe("agent-architecture.agent.json");
    expect(res.mimeType).toBe("application/json");

    const parsed = JSON.parse(res.content);
    expect(parsed.id).toBe("agent-architecture");
    expect(parsed.name).toBe("Architecture Agent");
    expect(parsed.version).toBe("1.2.0");
    expect(parsed.assignedSkillIds).toEqual(["skill-review", "skill-planning"]);
  });

  it("exports GitHub Copilot workspace instructions (copilot-instructions)", () => {
    const res = exportAgentConfig(sampleAgent, "copilot-instructions");
    expect(res.format).toBe("copilot-instructions");
    expect(res.fileName).toBe("agent-architecture.copilot-instructions.md");
    expect(res.mimeType).toBe("text/markdown");

    expect(res.content).toContain("# Architecture Agent");
    expect(res.content).toContain("**Role:** System Architect");
    expect(res.content).toContain("## Objective");
    expect(res.content).toContain("## Operating Principles");
    expect(res.content).toContain("Favor composition over deep inheritance");
    expect(res.content).toContain("## Security & Permission Guardrails");
    expect(res.content).toContain("- **Read-Only:** true");
  });

  it("exports Claude Subagent prompt format (claude-subagent)", () => {
    const res = exportAgentConfig(sampleAgent, "claude-subagent");
    expect(res.format).toBe("claude-subagent");
    expect(res.fileName).toBe("agent-architecture.claude-subagent.md");
    expect(res.mimeType).toBe("text/markdown");

    expect(res.content).toContain('<agent id="agent-architecture" version="1.2.0">');
    expect(res.content).toContain("<name>Architecture Agent</name>");
    expect(res.content).toContain("<system_instructions>");
    expect(res.content).toContain("<declared_tools>");
    expect(res.content).toContain('<tool id="inspect-dep-graph" availability="always">');
    expect(res.content).toContain("<permissions>");
    expect(res.content).toContain("<read_only>true</read_only>");
  });

  it("exports OpenAI Assistant function calling format (openai-assistant)", () => {
    const res = exportAgentConfig(sampleAgent, "openai-assistant");
    expect(res.format).toBe("openai-assistant");
    expect(res.fileName).toBe("agent-architecture.openai-assistant.json");
    expect(res.mimeType).toBe("application/json");

    const parsed = JSON.parse(res.content);
    expect(parsed.name).toBe("Architecture Agent");
    expect(parsed.instructions).toContain("ROLE: System Architect");
    expect(parsed.instructions).toContain("OBJECTIVE: Design scalable components");
    expect(parsed.tools).toHaveLength(1);
    expect(parsed.tools[0].type).toBe("function");
    expect(parsed.tools[0].function.name).toBe("inspect_dep_graph");
    expect(parsed.metadata.agentforge_id).toBe("agent-architecture");
  });
});
