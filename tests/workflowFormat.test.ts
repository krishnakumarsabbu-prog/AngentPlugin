import { describe, it, expect } from "vitest";
import {
  exportWorkflowPackage,
  parseWorkflowPackage,
  CURRENT_WORKFLOW_SCHEMA_VERSION,
  CURRENT_WORKFLOW_SCHEMA_URI,
  WORKFLOW_FORMAT_IDENTIFIER,
} from "../src/workflows/workflowFormat";
import { sampleWorkflows } from "../src/storage/sampleData";

describe("WorkflowFormat & Serialization", () => {
  const enterpriseWf = sampleWorkflows.find((w) => w.id === "wf-feature-delivery")!;

  it("exports documented workflow package envelope with correct schema and metadata", () => {
    const pkg = exportWorkflowPackage(enterpriseWf);

    expect(pkg.$schema).toBe(CURRENT_WORKFLOW_SCHEMA_URI);
    expect(pkg.format).toBe(WORKFLOW_FORMAT_IDENTIFIER);
    expect(pkg.schemaVersion).toBe(CURRENT_WORKFLOW_SCHEMA_VERSION);
    expect(pkg.exportedAt).toBeDefined();
    expect(pkg.workflow.id).toBe("wf-feature-delivery");
    expect(pkg.workflow.nodes.length).toBe(11);
    expect(pkg.workflow.edges.length).toBe(10);
  });

  it("roundtrips workflow package serialization without loss of layout or contracts", () => {
    const pkg = exportWorkflowPackage(enterpriseWf);
    const jsonStr = JSON.stringify(pkg, null, 2);

    const parsed = parseWorkflowPackage(jsonStr);
    expect(parsed.ok).toBe(true);
    expect(parsed.isDocumentedPackage).toBe(true);
    expect(parsed.schemaVersion).toBe("1.0.0");

    const restored = parsed.workflow!;
    expect(restored.id).toBe(enterpriseWf.id);
    expect(restored.name).toBe(enterpriseWf.name);
    expect(restored.nodes.length).toBe(enterpriseWf.nodes.length);
    expect(restored.edges.length).toBe(enterpriseWf.edges.length);

    // Verify positions & contracts are intact
    const startNode = restored.nodes.find((n) => n.id === "node-start");
    expect(startNode?.position).toEqual(enterpriseWf.nodes[0].position);
    expect(startNode?.outputContract).toBeDefined();

    const approvalNode = restored.nodes.find((n) => n.id === "node-approval");
    expect(approvalNode?.approvalPolicy?.required).toBe(true);
    expect(approvalNode?.approvalPolicy?.approverRole).toBe(enterpriseWf.nodes.find((n) => n.id === "node-approval")?.approvalPolicy?.approverRole);
  });

  it("parses direct raw workflow objects (backward compatibility)", () => {
    const rawWorkflow = {
      id: "wf-legacy-raw",
      name: "Legacy Raw Pipeline",
      version: "1.0.0",
      nodes: [
        { id: "s", type: "start", name: "Start", position: { x: 0, y: 0 } },
        { id: "e", type: "end", name: "End", position: { x: 100, y: 0 } },
      ],
      edges: [{ id: "e1", source: "s", target: "e" }],
    };

    const parsed = parseWorkflowPackage(rawWorkflow);
    expect(parsed.ok).toBe(true);
    expect(parsed.isDocumentedPackage).toBe(false);
    expect(parsed.workflow?.id).toBe("wf-legacy-raw");
    expect(parsed.workflow?.nodes.length).toBe(2);
  });

  it("rejects unsupported schema versions (> 1.x)", () => {
    const futurePkg = {
      $schema: CURRENT_WORKFLOW_SCHEMA_URI,
      format: WORKFLOW_FORMAT_IDENTIFIER,
      schemaVersion: "3.2.0",
      exportedAt: new Date().toISOString(),
      workflow: enterpriseWf,
    };

    const parsed = parseWorkflowPackage(futurePkg);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("Unsupported schema version");
    expect(parsed.schemaVersion).toBe("3.2.0");
  });

  it("rejects invalid JSON syntax", () => {
    const brokenJson = "{ this is not valid json }";
    const parsed = parseWorkflowPackage(brokenJson);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("Invalid JSON format");
  });

  it("rejects unexpected format identifier", () => {
    const wrongFormat = {
      $schema: CURRENT_WORKFLOW_SCHEMA_URI,
      format: "unsupported-random-format",
      schemaVersion: "1.0.0",
      workflow: enterpriseWf,
    };

    const parsed = parseWorkflowPackage(wrongFormat);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("Unsupported workflow format identifier");
  });
});
