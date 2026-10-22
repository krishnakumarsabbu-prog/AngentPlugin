import type { Workflow, WorkflowNode, WorkflowEdge, Agent, Skill } from "../types";

/**
 * Computes the exact topological execution order of nodes in a workflow DAG.
 * Handles single-entry, multi-entry, condition branching, and sequential graphs.
 */
export function getTopologicalOrder(workflow: Workflow): WorkflowNode[] {
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];

  if (nodes.length <= 1) return [...nodes];

  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();
  const nodeMap = new Map<string, WorkflowNode>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    if (edge.source && edge.target && adjList.has(edge.source) && inDegree.has(edge.target)) {
      adjList.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  // Find all entry nodes (in-degree 0 or start/input types)
  const queue: string[] = [];
  
  // Prioritize start/entry nodes first
  for (const node of nodes) {
    const isEntryType =
      node.type === "start" || node.type === "requirement_input" || node.type === "input";
    if (isEntryType && (inDegree.get(node.id) || 0) === 0) {
      queue.push(node.id);
    }
  }

  // Then add any other in-degree 0 nodes
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0 && !queue.includes(id)) {
      queue.push(id);
    }
  }

  // If no in-degree 0 nodes found, fallback to first node
  if (queue.length === 0 && nodes.length > 0) {
    queue.push(nodes[0].id);
  }

  const sorted: WorkflowNode[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currId = queue.shift()!;
    if (visited.has(currId)) continue;
    visited.add(currId);

    const node = nodeMap.get(currId);
    if (node) sorted.push(node);

    const neighbors = adjList.get(currId) || [];
    for (const nextId of neighbors) {
      const remainingDeg = (inDegree.get(nextId) || 1) - 1;
      inDegree.set(nextId, remainingDeg);
      if (remainingDeg <= 0 && !visited.has(nextId)) {
        queue.push(nextId);
      }
    }
  }

  // Append any disconnected or remaining nodes that weren't reached
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      sorted.push(node);
      visited.add(node.id);
    }
  }

  return sorted;
}

/**
 * Builds a Mermaid diagram string representing the workflow DAG.
 */
function buildMermaidDiagram(workflow: Workflow): string {
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];

  const lines: string[] = ["graph LR"];

  for (const n of nodes) {
    const safeName = (n.name || n.id).replace(/["[\]{}()]/g, "");
    if (n.type === "human_approval" || n.type === "approval" || n.type === "condition_branch") {
      lines.push(`  ${n.id}{"${safeName}"}`);
    } else if (n.type === "start" || n.type === "end") {
      lines.push(`  ${n.id}(["${safeName}"])`);
    } else {
      lines.push(`  ${n.id}["${safeName}"]`);
    }
  }

  for (const e of edges) {
    if (e.source && e.target) {
      const label = e.label ? `|${e.label}| ` : "";
      lines.push(`  ${e.source} --> ${label}${e.target}`);
    }
  }

  return lines.join("\n");
}

/**
 * Generates an enterprise-grade `pipeline.md` specification document.
 */
export function generatePipelineMarkdown(
  workflow: Workflow,
  allAgents: Agent[] = [],
  allSkills: Skill[] = []
): string {
  const orderedNodes = getTopologicalOrder(workflow);
  const now = new Date().toISOString();
  const slug = (workflow.name || "pipeline").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const mermaid = buildMermaidDiagram(workflow);

  // YAML Frontmatter
  let md = `---
pipeline_id: "${workflow.id}"
name: "${workflow.name}"
version: "${workflow.version || "1.0.0"}"
status: "${workflow.status || "Active"}"
slug: "${slug}"
total_steps: ${orderedNodes.length}
max_parallel_nodes: ${workflow.executionSettings?.maxParallelNodes ?? 2}
generated_at: "${now}"
generator: "AgentForge Pipeline Engine"
execution_order:
${orderedNodes.map((n) => `  - "${n.id}"`).join("\n")}
---

# Pipeline: ${workflow.name}

> **Description**: ${workflow.description || "Multi-agent engineered orchestration pipeline."}  
> **Version**: \`v${workflow.version || "1.0.0"}\` • **Status**: \`${workflow.status || "Active"}\` • **Steps**: \`${orderedNodes.length}\`

---

## 1. Pipeline Architecture (DAG)

The visual graph below outlines the execution dependencies and decision gates:

\`\`\`mermaid
${mermaid}
\`\`\`

---

## 2. Execution Order (Topological Sequence)

When executed, the pipeline executes the nodes in the following strict order:

| Step | Node Name | Type | Assigned Worker | Role / Purpose | Approval Gate | Timeout |
|---|---|---|---|---|---|---|
`;

  orderedNodes.forEach((node, index) => {
    const cfg = node.configuration || {};
    let assigned = "System";
    let roleOrPurpose = node.description || "-";

    if (node.type === "agent_execution" || node.type === "agent") {
      const agent = allAgents.find((a) => a.id === cfg.agentId);
      assigned = agent ? `${agent.name} (\`${agent.id}\`)` : (cfg.agentId as string) || "Agent";
      roleOrPurpose = (cfg.role as string) || agent?.role || "Execution Specialist";
    } else if (node.type === "skill_invocation" || node.type === "skill") {
      const skill = allSkills.find((s) => s.id === cfg.skillId);
      assigned = skill ? `${skill.name} (\`${skill.id}\`)` : (cfg.skillId as string) || "Skill";
      roleOrPurpose = skill?.category || "Reusable Skill";
    } else if (node.type === "human_approval" || node.type === "approval") {
      assigned = (cfg.approverRole as string) || "Tech Lead";
      roleOrPurpose = (cfg.whatIsBeingApproved as string) || "Sign-off Gate";
    } else if (node.type === "requirement_input") {
      assigned = (cfg.source as string) || "User Story";
      roleOrPurpose = "Intake & Context";
    }

    const isApproval =
      node.type === "human_approval" ||
      node.type === "approval" ||
      node.approvalPolicy?.required === true;
    const timeout = node.timeoutSeconds ? `${node.timeoutSeconds}s` : "Default (300s)";

    md += `| **${index + 1}** | ${node.name || node.id} | \`${node.type}\` | ${assigned} | ${roleOrPurpose} | ${isApproval ? "⚠️ Required" : "No"} | ${timeout} |\n`;
  });

  md += `
---

## 3. Step Specifications & Operational Contracts

`;

  orderedNodes.forEach((node, index) => {
    const cfg = node.configuration || {};
    const stepNum = index + 1;
    const isApproval =
      node.type === "human_approval" ||
      node.type === "approval" ||
      node.approvalPolicy?.required === true;

    md += `### Step ${stepNum}: ${node.name || node.id}\n\n`;
    md += `- **Step Index**: \`${stepNum}\` of \`${orderedNodes.length}\`\n`;
    md += `- **Node ID**: \`${node.id}\`\n`;
    md += `- **Type**: \`${node.type}\`\n`;
    md += `- **Purpose**: ${node.description || "No description provided."}\n`;

    if (node.type === "agent_execution" || node.type === "agent") {
      const agent = allAgents.find((a) => a.id === cfg.agentId);
      md += `- **Assigned Agent**: **${agent?.name || cfg.agentId || "Generic Agent"}**\n`;
      md += `- **Role Specialization**: ${cfg.role || agent?.role || "Software Engineer"}\n`;
      if (agent?.objective) {
        md += `- **Agent Objective**: *${agent.objective}*\n`;
      }
      if (agent?.instructions) {
        md += `\n**Agent System Instructions**:\n\`\`\`text\n${agent.instructions.slice(0, 300)}${agent.instructions.length > 300 ? "..." : ""}\n\`\`\`\n`;
      }
    } else if (node.type === "skill_invocation" || node.type === "skill") {
      const skill = allSkills.find((s) => s.id === cfg.skillId);
      md += `- **Target Skill**: **${skill?.name || cfg.skillId || "Skill"}**\n`;
      md += `- **Category**: ${skill?.category || "Utility"}\n`;
      if (skill?.description) {
        md += `- **Skill Duty**: ${skill.description}\n`;
      }
    } else if (isApproval) {
      md += `- **Approver Role**: \`${cfg.approverRole || "Principal Engineer"}\`\n`;
      md += `- **Approval Item**: ${cfg.whatIsBeingApproved || "Step deliverables"}\n`;
      md += `- **Prompt Message**: "${cfg.approvalMessage || cfg.message || "Please review and approve."}"\n`;
      md += `- **Timeout**: ${cfg.timeoutMinutes || 60} minutes\n`;
    }

    if (node.inputContract?.schema) {
      md += `\n**Input Contract Schema**:\n\`\`\`json\n${JSON.stringify(node.inputContract.schema, null, 2)}\n\`\`\`\n`;
    }

    if (node.outputContract?.schema) {
      md += `\n**Output Contract Schema**:\n\`\`\`json\n${JSON.stringify(node.outputContract.schema, null, 2)}\n\`\`\`\n`;
    }

    if (node.retryPolicy?.enabled) {
      md += `- **Retry Policy**: Up to ${node.retryPolicy.maxRetries} retries with ${node.retryPolicy.backoffSeconds}s backoff.\n`;
    }

    md += `\n---\n\n`;
  });

  md += `## 4. Execution & Orchestration Guide

### How to Run This Pipeline

1. **AgentForge Workbench**:
   - Open the **Harness Pipelines** tab.
   - Click **Run from Markdown** or select this pipeline from the catalog.
   - Click **Run Pipeline** to launch the execution engine in the specified order (\`Step 1\` through \`Step ${orderedNodes.length}\`).

2. **Automated Run**:
   - The engine validates step pre-conditions, establishes context handoffs between successive steps, executes each node worker, pauses at human checkpoints for sign-off, and bundles final deliverables into the artifacts store.

*Generated by AgentForge on ${new Date().toLocaleString()}*
`;

  return md;
}

export interface ParsedPipelineMarkdown {
  ok: boolean;
  pipelineId?: string;
  name?: string;
  version?: string;
  status?: string;
  totalSteps?: number;
  executionOrder?: string[];
  steps?: {
    stepNumber: number;
    name: string;
    nodeId: string;
    type: string;
    worker: string;
    role: string;
    isApproval: boolean;
  }[];
  rawMarkdown?: string;
  error?: string;
}

/**
 * Parses a `pipeline.md` document and extracts execution metadata and steps.
 */
export function parsePipelineMarkdown(content: string): ParsedPipelineMarkdown {
  try {
    let pipelineId = "";
    let name = "";
    let version = "1.0.0";
    let status = "Active";
    let totalSteps = 0;
    const executionOrder: string[] = [];

    // Parse Frontmatter
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (frontmatterMatch) {
      const lines = frontmatterMatch[1].split(/\r?\n/);
      let inExecOrder = false;

      for (const line of lines) {
        if (line.startsWith("pipeline_id:")) {
          pipelineId = line.replace("pipeline_id:", "").trim().replace(/['"]/g, "");
          inExecOrder = false;
        } else if (line.startsWith("name:")) {
          name = line.replace("name:", "").trim().replace(/['"]/g, "");
          inExecOrder = false;
        } else if (line.startsWith("version:")) {
          version = line.replace("version:", "").trim().replace(/['"]/g, "");
          inExecOrder = false;
        } else if (line.startsWith("status:")) {
          status = line.replace("status:", "").trim().replace(/['"]/g, "");
          inExecOrder = false;
        } else if (line.startsWith("total_steps:")) {
          totalSteps = parseInt(line.replace("total_steps:", "").trim(), 10) || 0;
          inExecOrder = false;
        } else if (line.startsWith("execution_order:")) {
          inExecOrder = true;
        } else if (inExecOrder && line.trim().startsWith("-")) {
          const id = line.replace(/^[\s-]*["']?/, "").replace(/["']?$/, "").trim();
          if (id) executionOrder.push(id);
        }
      }
    }

    if (!name) {
      const titleMatch = content.match(/# Pipeline:\s*(.+)/);
      name = titleMatch ? titleMatch[1].trim() : "Custom Pipeline";
    }

    // Parse Table Steps
    const steps: ParsedPipelineMarkdown["steps"] = [];
    const tableRegex = /\|\s*\*\*?(\d+)\*\*?\s*\|\s*([^|]+)\|\s*`?([^`|]+)`?\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/g;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const stepNumber = parseInt(match[1].trim(), 10);
      const stepName = match[2].trim();
      const nodeType = match[3].trim();
      const worker = match[4].trim();
      const role = match[5].trim();
      const approval = match[6].trim().toLowerCase();
      const nodeId = executionOrder[stepNumber - 1] || `node-step-${stepNumber}`;

      steps.push({
        stepNumber,
        name: stepName,
        nodeId,
        type: nodeType,
        worker,
        role,
        isApproval: approval.includes("require") || approval.includes("yes"),
      });
    }

    return {
      ok: true,
      pipelineId: pipelineId || `wf-parsed-${Date.now().toString(36)}`,
      name,
      version,
      status,
      totalSteps: steps.length || totalSteps,
      executionOrder: executionOrder.length > 0 ? executionOrder : steps.map((s) => s.nodeId),
      steps,
      rawMarkdown: content,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to parse pipeline markdown",
    };
  }
}
