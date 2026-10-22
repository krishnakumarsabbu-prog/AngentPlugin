import { describe, it, expect } from "vitest";
import {
  getTopologicalOrder,
  generatePipelineMarkdown,
  parsePipelineMarkdown,
} from "../webview-ui/src/services/pipelineMarkdownService";
import type { Workflow, WorkflowNode, Agent, Skill } from "../webview-ui/src/types";

describe("pipelineMarkdownService", () => {
  const sampleWorkflow: Workflow = {
    id: "wf-test-order",
    name: "Automated Release Pipeline",
    description: "End-to-end multi-agent delivery flow.",
    version: "1.2.0",
    status: "Active",
    executionSettings: {
      maxParallelNodes: 2,
      retryPolicy: { maxRetries: 2, backoffSeconds: 5 },
      requireApprovalFor: ["node-approval"],
    },
    nodes: [
      {
        id: "node-start",
        type: "start",
        name: "Pipeline Trigger",
        configuration: { trigger: "git_push" },
        position: { x: 50, y: 100 },
      },
      {
        id: "node-intake",
        type: "requirement_input",
        name: "Story Intake",
        configuration: { source: "Jira" },
        position: { x: 250, y: 100 },
      },
      {
        id: "node-arch",
        type: "agent_execution",
        name: "Architecture Review",
        configuration: { agentId: "agent-architecture", role: "Software Architect" },
        position: { x: 450, y: 100 },
      },
      {
        id: "node-approval",
        type: "human_approval",
        name: "Principal Sign-off",
        configuration: { approverRole: "Principal Engineer" },
        position: { x: 650, y: 100 },
      },
      {
        id: "node-end",
        type: "end",
        name: "Production Deployed",
        configuration: {},
        position: { x: 850, y: 100 },
      },
    ],
    edges: [
      { id: "e1", source: "node-start", target: "node-intake" },
      { id: "e2", source: "node-intake", target: "node-arch" },
      { id: "e3", source: "node-arch", target: "node-approval" },
      { id: "e4", source: "node-approval", target: "node-end" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleAgents: Agent[] = [
    {
      id: "agent-architecture",
      name: "Architecture Sentinel",
      role: "Software Architect",
      objective: "Enforce domain decoupling and maintain contract schemas.",
      instructions: "Inspect interfaces and validate models.",
      assignedSkillIds: ["skill-review"],
      version: "1.0.0",
      status: "Ready",
      description: "Architecture auditing specialist.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const sampleSkills: Skill[] = [
    {
      id: "skill-review",
      name: "Sentry Code Review",
      description: "Evaluates pull requests for security and architecture.",
      version: "1.0.0",
      author: "Antigravity",
      category: "Security",
      tags: ["security", "audit"],
      instructions: "Perform rigorous review.",
      frontmatter: "",
      resources: [],
      compatibility: ["claude", "copilot"],
      otherTargets: [],
      requiredTools: [],
      permissions: [],
      changelog: "",
      requirements: "",
      status: "Ready",
      installationState: "installed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it("computes accurate topological order from start to end", () => {
    const ordered = getTopologicalOrder(sampleWorkflow);
    expect(ordered.map((n) => n.id)).toEqual([
      "node-start",
      "node-intake",
      "node-arch",
      "node-approval",
      "node-end",
    ]);
  });

  it("generates markdown with metadata, mermaid DAG, and step table", () => {
    const md = generatePipelineMarkdown(sampleWorkflow, sampleAgents, sampleSkills);
    expect(md).toContain('pipeline_id: "wf-test-order"');
    expect(md).toContain("# Pipeline: Automated Release Pipeline");
    expect(md).toContain("```mermaid");
    expect(md).toContain("graph LR");
    expect(md).toContain("node-start --> node-intake");
    expect(md).toContain("Architecture Review");
    expect(md).toContain("Principal Sign-off");
    expect(md).toContain("Architecture Sentinel (`agent-architecture`)");
  });

  it("parses generated pipeline markdown back into ordered execution steps", () => {
    const md = generatePipelineMarkdown(sampleWorkflow, sampleAgents, sampleSkills);
    const parsed = parsePipelineMarkdown(md);

    expect(parsed.ok).toBe(true);
    expect(parsed.pipelineId).toBe("wf-test-order");
    expect(parsed.name).toBe("Automated Release Pipeline");
    expect(parsed.version).toBe("1.2.0");
    expect(parsed.totalSteps).toBe(5);
    expect(parsed.executionOrder).toEqual([
      "node-start",
      "node-intake",
      "node-arch",
      "node-approval",
      "node-end",
    ]);

    expect(parsed.steps?.length).toBe(5);
    expect(parsed.steps?.[0].name).toBe("Pipeline Trigger");
    expect(parsed.steps?.[2].name).toBe("Architecture Review");
    expect(parsed.steps?.[3].isApproval).toBe(true);
  });
});
