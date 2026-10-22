import { describe, it, expect } from "vitest";
import {
  CopilotAgentAdapter,
  ClaudeAgentAdapter,
  OpenAIAgentAdapter,
  getCapabilityMatrix,
  analyzeAgentCompatibility,
  exportAgentForPlatform,
} from "../src/agents/adapters";
import { Agent } from "../src/domain/agents/types";

describe("Agent Platform Export Adapters", () => {
  const sampleAgent: Partial<Agent> = {
    id: "security-auditor",
    name: "Security Auditor Agent",
    role: "SecOps Specialist",
    version: "2.1.0",
    status: "Ready",
    objective: "Identify authorization flaws, OWASP Top 10 vulnerabilities, and dependency CVEs.",
    instructions: "Systematically scan all endpoints, inspect authentication tokens, and verify input sanitization.",
    scope: "Security assessment, code audit, vulnerability scoring.",
    outOfScope: "Applying production fixes, modifying live databases.",
    operatingPrinciples: [
      "Never execute untrusted payloads in unisolated environments.",
      "Always verify authorization on every route boundary.",
    ],
    assignedSkillIds: ["skill-review"],
    toolDefinitions: [
      {
        id: "scan-cve-vulns",
        name: "CVE Scanner",
        description: "Scans dependency trees against the CVE vulnerability database.",
        purpose: "Surface known dependency exploits.",
        availability: "always",
        requiredPermissions: ["network"],
        schema: {
          type: "object",
          properties: {
            manifestPath: { type: "string" },
          },
          required: ["manifestPath"],
        },
      },
    ],
    permissionPolicy: {
      network: true,
      fileSystem: "read",
      shell: false,
      maxTokens: 12000,
      readOnly: true,
      workspaceAccess: true,
      writeOperations: false,
      restrictedPaths: [".env", "*.key", ".git"],
      humanApprovalRequired: true,
    },
    compatibility: ["copilot", "claude", "openai", "neutral"],
  };

  describe("CopilotAgentAdapter", () => {
    const adapter = new CopilotAgentAdapter();

    it("declares accurate platform metadata and limitations", () => {
      expect(adapter.platformId).toBe("copilot");
      expect(adapter.platformName).toBe("GitHub Copilot");
      expect(adapter.isExperimental).toBe(false);
      expect(adapter.supportedArtifactTypes).toContain("copilot-instructions");
      expect(adapter.supportedFields).toContain("objective");
      expect(adapter.unsupportedFields).toContain("toolDefinitions");
      expect(adapter.limitations.length).toBeGreaterThanOrEqual(2);
      expect(adapter.limitations.some((l) => l.title.includes("No Runtime Tool Execution"))).toBe(true);
    });

    it("warns about tools because Copilot instructions do not execute runtime tools", () => {
      const val = adapter.validateCompatibility(sampleAgent);
      expect(val.supportLevel).toBe("partial");
      expect(val.warnings.some((w) => w.includes("does not support runtime tool execution"))).toBe(true);
    });

    it("exports markdown with destination rule for .github/copilot-instructions.md", () => {
      const res = adapter.exportAgent(sampleAgent);
      expect(res.platformId).toBe("copilot");
      expect(res.files.length).toBe(1);
      expect(res.files[0].relativePath).toBe(".github/copilot-instructions.md");
      expect(res.files[0].fileName).toBe("copilot-instructions.md");
      expect(res.files[0].mimeType).toBe("text/markdown");
      expect(res.destination.suggestedRelativePath).toBe(".github/copilot-instructions.md");
      expect(res.files[0].content).toContain("# Security Auditor Agent");
      expect(res.files[0].content).toContain("## Declared Tool Capabilities (Informational)");
      expect(res.files[0].content).toContain("scan-cve-vulns");
    });
  });

  describe("ClaudeAgentAdapter", () => {
    const adapter = new ClaudeAgentAdapter();

    it("declares native tool use support and valid destinations", () => {
      expect(adapter.platformId).toBe("claude");
      expect(adapter.platformName).toBe("Claude / Claude Code");
      expect(adapter.isExperimental).toBe(false);
      expect(adapter.supportedFields).toContain("toolDefinitions");
      expect(adapter.destinationRules.some((d) => d.suggestedRelativePath === "CLAUDE.md")).toBe(true);
    });

    it("validates compatibility as native when schemas and instructions are present", () => {
      const val = adapter.validateCompatibility(sampleAgent);
      expect(val.supportLevel).toBe("native");
    });

    it("warns when tools lack JSON parameter schema", () => {
      const agentWithBadTool: Partial<Agent> = {
        ...sampleAgent,
        toolDefinitions: [{ id: "bad-tool", name: "Bad", description: "test" }],
      };
      const val = adapter.validateCompatibility(agentWithBadTool);
      expect(val.warnings.some((w) => w.includes("lack a JSON parameter schema"))).toBe(true);
    });

    it("exports multi-file bundle with CLAUDE.md, XML subagent, and tools JSON", () => {
      const res = adapter.exportAgent(sampleAgent);
      expect(res.files.length).toBe(3);

      const claudeMd = res.files.find((f) => f.fileName === "CLAUDE.md");
      expect(claudeMd).toBeDefined();
      expect(claudeMd?.content).toContain("# Security Auditor Agent Guide");

      const subagentXml = res.files.find((f) => f.relativePath.includes(".claude/agents"));
      expect(subagentXml).toBeDefined();
      expect(subagentXml?.content).toContain('<agent id="security-auditor" version="2.1.0">');
      expect(subagentXml?.content).toContain("<declared_tools>");

      const toolsJson = res.files.find((f) => f.relativePath.includes(".claude/tools"));
      expect(toolsJson).toBeDefined();
      const parsedTools = JSON.parse(toolsJson!.content);
      expect(parsedTools[0].name).toBe("scan_cve_vulns");
      expect(parsedTools[0].input_schema).toBeDefined();
    });
  });

  describe("OpenAIAgentAdapter", () => {
    const adapter = new OpenAIAgentAdapter();

    it("declares simulated state and accurate limitations without requiring credentials", () => {
      expect(adapter.platformId).toBe("openai");
      expect(adapter.isExperimental).toBe(true);
      expect(adapter.unsupportedFields).toContain("permissionPolicy");
      expect(adapter.limitations.some((l) => l.title.includes("Client-Side Tool Execution"))).toBe(true);
      expect(adapter.limitations.some((l) => l.title.includes("No Server-Side File Sandbox"))).toBe(true);
    });

    it("evaluates supportLevel as simulated", () => {
      const val = adapter.validateCompatibility(sampleAgent);
      expect(val.supportLevel).toBe("simulated");
      expect(val.warnings.some((w) => w.includes("simulated"))).toBe(true);
    });

    it("exports Assistant JSON with function tools array and sanitized names", () => {
      const res = adapter.exportAgent(sampleAgent);
      expect(res.isSimulatedOrExperimental).toBe(true);
      expect(res.files.length).toBe(2);

      const assistantFile = res.files.find((f) => f.fileName.includes("-assistant.json"));
      expect(assistantFile).toBeDefined();
      const payload = JSON.parse(assistantFile!.content);
      expect(payload.name).toBe("Security Auditor Agent");
      expect(payload.model).toBe("gpt-4o");
      expect(payload.tools[0].type).toBe("function");
      expect(payload.tools[0].function.name).toBe("scan_cve_vulns");
      expect(payload.metadata.adapter_state).toBe("simulated_export");
    });
  });

  describe("Capability Matrix & Unified Analyzer", () => {
    it("returns comprehensive capability matrix with all 4 platforms", () => {
      const matrix = getCapabilityMatrix();
      expect(matrix.length).toBeGreaterThanOrEqual(8);
      for (const row of matrix) {
        expect(row.platforms.copilot).toBeDefined();
        expect(row.platforms.claude).toBeDefined();
        expect(row.platforms.openai).toBeDefined();
        expect(row.platforms.neutral).toBeDefined();
      }
    });

    it("analyzes agent compatibility across all platforms", () => {
      const report = analyzeAgentCompatibility(sampleAgent);
      expect(report.matrix.length).toBeGreaterThan(0);
      expect(report.platformAnalysis.copilot).toBeDefined();
      expect(report.platformAnalysis.claude).toBeDefined();
      expect(report.platformAnalysis.openai).toBeDefined();
      expect(report.platformAnalysis.neutral).toBeDefined();
    });

    it("exports agent for platform using registry function", () => {
      const res = exportAgentForPlatform(sampleAgent, "copilot");
      expect(res.platformId).toBe("copilot");
      expect(res.files[0].fileName).toBe("copilot-instructions.md");

      const canonicalRes = exportAgentForPlatform(sampleAgent, "neutral");
      expect(canonicalRes.platformId).toBe("neutral");
      expect(canonicalRes.files[0].fileName).toBe("security-auditor.json");
    });
  });
});
