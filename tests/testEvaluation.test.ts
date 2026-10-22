import { describe, it, expect } from "vitest";
import {
  evaluateSkill,
  evaluateAgent,
  evaluatePipeline,
} from "../src/services/EvaluationService";
import { Skill } from "../src/domain/skills/types";
import { Agent } from "../src/domain/agents/types";
import { Workflow } from "../src/domain/workflows/types";
import { sampleSkills, sampleAgents, sampleWorkflows } from "../src/storage/sampleData";

describe("Test & Evaluation Studio - Skill Evaluation", () => {
  it("evaluates a valid skill and returns passed status with all checks", () => {
    const validSkill: Skill = {
      id: "code-formatter",
      name: "Code Formatter",
      description: "Formats code according to team style guide.",
      version: "1.0.0",
      category: "Development",
      tags: ["formatting", "style"],
      author: "AgentForge",
      frontmatter: "name: Code Formatter\ndescription: Formats code",
      instructions: "# Code Formatter\n\n## Instructions\nApply prettier style guidelines to target files.",
      resources: [
        { id: "r1", name: "prettier.config.js", kind: "reference", description: "Config template" },
      ],
      compatibility: ["copilot", "claude", "openai"],
      status: "Ready",
      installationState: "installed",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };

    const report = evaluateSkill(validSkill);
    expect(report.targetType).toBe("skill");
    expect(report.targetId).toBe("code-formatter");
    expect(report.targetVersion).toBe("1.0.0");
    expect(report.overallStatus).toBe("passed");
    expect(report.errors.length).toBe(0);
    expect(report.metrics.passedChecks).toBeGreaterThanOrEqual(5);
    expect(report.isSimulatedMock).toBe(true);
    expect(report.disclaimer).toContain("Static deterministic validation");
    expect(report.resourceLink.route).toBe("skill-details:code-formatter");
  });

  it("detects invalid metadata (bad id format, missing name, invalid semver)", () => {
    const invalidSkill: Partial<Skill> = {
      id: "BAD_SKILL_ID!",
      name: "",
      version: "not-semver",
      instructions: "No headings here",
    };

    const report = evaluateSkill(invalidSkill);
    expect(report.overallStatus).toBe("failed");
    expect(report.errors.length).toBeGreaterThanOrEqual(3);

    const idCheck = report.checks.find((c) => c.category === "metadata" && c.id === "meta-id-format");
    expect(idCheck?.status).toBe("failed");
    expect(idCheck?.suggestedCorrection).toBeDefined();

    const nameCheck = report.checks.find((c) => c.id === "meta-name");
    expect(nameCheck?.status).toBe("failed");

    const semverCheck = report.checks.find((c) => c.id === "meta-version");
    expect(semverCheck?.status).toBe("failed");
  });

  it("detects dangerous code patterns in markdown instructions", () => {
    const dangerousSkill: Partial<Skill> = {
      id: "danger-skill",
      name: "Dangerous Skill",
      version: "1.0.0",
      instructions: "# Exploit\nExecute eval(userCode) and child_process.exec(cmd)",
    };

    const report = evaluateSkill(dangerousSkill);
    expect(report.overallStatus).toBe("failed");
    const secCheck = report.checks.find((c) => c.category === "markdown_frontmatter" && c.id === "md-security");
    expect(secCheck?.status).toBe("failed");
    expect(secCheck?.message).toContain("Forbidden execution keywords detected");
  });

  it("evaluates custom configurable test cases", () => {
    const skill: Partial<Skill> = {
      id: "linter-skill",
      name: "Linter Skill",
      version: "1.0.0",
      instructions: "# Linter\nRun static lint checks.",
    };

    const report = evaluateSkill(skill, {
      customTestCases: [
        {
          id: "tc-pass",
          name: "Clean Syntax Check",
          inputPayload: { file: "test.ts" },
          expectedStatus: "Succeeded",
        },
        {
          id: "tc-fail",
          name: "Should Fail Check",
          inputPayload: { file: "broken.ts" },
          expectedStatus: "Failed",
        },
      ],
    });

    const passCheck = report.checks.find((c) => c.id === "testcase-tc-pass");
    expect(passCheck?.status).toBe("passed");

    const failCheck = report.checks.find((c) => c.id === "testcase-tc-fail");
    expect(failCheck?.status).toBe("failed");
  });
});

describe("Test & Evaluation Studio - Agent Evaluation", () => {
  it("evaluates a valid agent and passes schema, permission, and tool checks", () => {
    const validAgent: Agent = {
      id: "code-review-agent",
      name: "Code Review Agent",
      description: "Reviews pull requests for defects.",
      role: "Reviewer",
      version: "1.0.0",
      systemInstructions: "Perform thorough code inspection against standard guidelines.",
      skills: ["skill-security-audit"],
      tools: [],
      permissions: {
        network: false,
        fileSystem: "read",
        shell: false,
        maxTokens: 4000,
        readOnly: true,
        workspaceAccess: true,
        writeOperations: false,
        restrictedPaths: [".git"],
        humanApprovalRequired: false,
      },
      inputSchema: { type: "object", properties: { patch: { type: "string" } } },
      outputSchema: { type: "object", properties: { score: { type: "number" } } },
      platformCompatibility: ["copilot", "claude"],
      category: "Review",
      status: "Ready",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
    };

    const report = evaluateAgent(validAgent, {
      knownSkillIds: new Set(["skill-security-audit"]),
    });

    expect(report.targetType).toBe("agent");
    expect(report.targetId).toBe("code-review-agent");
    expect(report.overallStatus).toBe("passed");
    expect(report.errors.length).toBe(0);
    expect(report.resourceLink.route).toBe("agent-details:code-review-agent");
  });

  it("detects missing skill references and invalid non-object schema roots", () => {
    const agent: Partial<Agent> = {
      id: "agent-broken",
      name: "Broken Agent",
      version: "1.0.0",
      systemInstructions: "Analyze files.",
      skills: ["non-existent-skill-xyz"],
      inputSchema: { type: "string" as any }, // Non-object root schema
      outputSchema: { type: "number" as any },
    };

    const report = evaluateAgent(agent, {
      knownSkillIds: new Set(["skill-valid-1"]),
    });

    expect(report.overallStatus).toBe("failed");

    const missingSkillCheck = report.checks.find((c) => c.category === "skill_dependencies");
    expect(missingSkillCheck?.status).toBe("failed");
    expect(missingSkillCheck?.message).toContain("non-existent-skill-xyz");

    const inputCheck = report.checks.find((c) => c.category === "input_schema");
    expect(inputCheck?.status).toBe("failed");
    expect(inputCheck?.message).toContain("must be 'object'");
  });

  it("warns when high-privilege permissions lack human approval gate", () => {
    const elevatedAgent: Partial<Agent> = {
      id: "deployer-agent",
      name: "Deployer Agent",
      version: "1.0.0",
      systemInstructions: "Deploys code.",
      permissions: {
        network: true,
        fileSystem: "write",
        shell: true,
        maxTokens: 8000,
        readOnly: false,
        workspaceAccess: true,
        writeOperations: true,
        restrictedPaths: [],
        humanApprovalRequired: false, // Security warning: write/shell without human gate
      },
    };

    const report = evaluateAgent(elevatedAgent);
    const permCheck = report.checks.find((c) => c.category === "permission_policy");
    expect(permCheck?.status).toBe("warning");
    expect(permCheck?.suggestedCorrection).toContain("humanApprovalRequired");
  });
});

describe("Test & Evaluation Studio - Pipeline Evaluation", () => {
  it("evaluates a valid pipeline with full graph and dependency integrity", () => {
    const pipeline: Workflow = {
      id: "wf-sample-delivery",
      name: "Delivery Pipeline",
      description: "Full feature delivery flow.",
      version: "1.0.0",
      status: "Active",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
      nodes: [
        {
          id: "start",
          name: "Start",
          type: "start",
          position: { x: 0, y: 0 },
          configuration: {},
        },
        {
          id: "agent-step",
          name: "Code Review",
          type: "agent_execution",
          position: { x: 100, y: 0 },
          configuration: { agentId: "agent-reviewer" },
        },
        {
          id: "end",
          name: "End",
          type: "end",
          position: { x: 200, y: 0 },
          configuration: {},
        },
      ],
      edges: [
        { id: "e1", source: "start", target: "agent-step" },
        { id: "e2", source: "agent-step", target: "end" },
      ],
    };

    const report = evaluatePipeline(pipeline, {
      knownAgentIds: new Set(["agent-reviewer"]),
    });

    expect(report.targetType).toBe("pipeline");
    expect(report.targetId).toBe("wf-sample-delivery");
    expect(report.overallStatus).toBe("passed");
    expect(report.errors.length).toBe(0);
  });

  it("detects graph cycles, missing terminal node, and unreachable nodes", () => {
    const brokenWorkflow: Workflow = {
      id: "wf-broken",
      name: "Broken Workflow",
      description: "Workflow with graph defects.",
      version: "1.0.0",
      status: "Draft",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
      nodes: [
        { id: "start", name: "Start", type: "start", position: { x: 0, y: 0 }, configuration: {} },
        { id: "step-a", name: "Step A", type: "agent_execution", position: { x: 50, y: 0 }, configuration: { agentId: "ag-1" } },
        { id: "step-b", name: "Step B", type: "agent_execution", position: { x: 100, y: 0 }, configuration: { agentId: "ag-1" } },
        { id: "orphan", name: "Orphaned Step", type: "agent_execution", position: { x: 300, y: 0 }, configuration: { agentId: "ag-1" } },
      ],
      edges: [
        { id: "e1", source: "start", target: "step-a" },
        { id: "e2", source: "step-a", target: "step-b" },
        { id: "e-cycle", source: "step-b", target: "step-a" }, // Cycle!
      ],
    };

    const report = evaluatePipeline(brokenWorkflow, {
      knownAgentIds: new Set(["ag-1"]),
    });

    expect(report.overallStatus).toBe("failed");

    // Missing terminal node (no end node)
    const termCheck = report.checks.find((c) => c.id === "graph-terminal-node");
    expect(termCheck?.status).toBe("failed");

    // Cycle detected
    const cycleCheck = report.checks.find((c) => c.id === "graph-cycle");
    expect(cycleCheck?.status).toBe("failed");

    // Unreachable orphan
    const unreachCheck = report.checks.find((c) => c.id === "graph-unreachable");
    expect(unreachCheck?.status).toBe("failed");
    expect(unreachCheck?.message).toContain("orphan");
  });

  it("detects missing agent reference in agent_execution node", () => {
    const wf: Workflow = {
      id: "wf-missing-ref",
      name: "Missing Ref Workflow",
      description: "Testing reference resolution.",
      version: "1.0.0",
      status: "Active",
      createdAt: "2026-10-01T00:00:00Z",
      updatedAt: "2026-10-01T00:00:00Z",
      nodes: [
        { id: "start", name: "Start", type: "start", position: { x: 0, y: 0 }, configuration: {} },
        { id: "step-1", name: "Unknown Worker", type: "agent_execution", position: { x: 100, y: 0 }, configuration: { agentId: "non-existent-agent-999" } },
        { id: "end", name: "End", type: "end", position: { x: 200, y: 0 }, configuration: {} },
      ],
      edges: [
        { id: "e1", source: "start", target: "step-1" },
        { id: "e2", source: "step-1", target: "end" },
      ],
    };

    const report = evaluatePipeline(wf, {
      knownAgentIds: new Set(["agent-valid-1"]),
    });

    expect(report.overallStatus).toBe("failed");
    const refCheck = report.checks.find((c) => c.id === "ref-agent-step-1");
    expect(refCheck?.status).toBe("failed");
    expect(refCheck?.message).toContain("non-existent-agent-999");
  });
});

describe("Evaluation Studio on Seeded Repository Artifacts", () => {
  it("evaluates seeded sample skills cleanly", () => {
    expect(sampleSkills.length).toBeGreaterThanOrEqual(1);
    for (const skill of sampleSkills) {
      const report = evaluateSkill(skill);
      expect(report.targetId).toBe(skill.id);
      expect(report.targetVersion).toBe(skill.version);
      expect(report.isSimulatedMock).toBe(true);
      expect(report.metrics.totalChecks).toBeGreaterThanOrEqual(5);
    }
  });

  it("evaluates seeded sample workflows cleanly", () => {
    expect(sampleWorkflows.length).toBeGreaterThanOrEqual(1);
    const knownAgentIds = new Set(sampleAgents.map((a) => a.id));
    const knownSkillIds = new Set(sampleSkills.map((s) => s.id));

    for (const wf of sampleWorkflows) {
      const report = evaluatePipeline(wf, { knownAgentIds, knownSkillIds });
      expect(report.targetId).toBe(wf.id);
      expect(report.isSimulatedMock).toBe(true);
      expect(report.metrics.totalChecks).toBeGreaterThanOrEqual(5);
    }
  });
});
