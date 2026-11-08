import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as vscode from "vscode";
import {
  ponytailSkill,
  ponytailAgent,
  graphifySkill,
  graphifyAgent,
  securityArchitectureReviewSkill,
  securityArchitectureReviewAgent,
} from "../src/storage/sampleData";
import { validateSkill } from "../src/skills/SkillValidator";
import { validateAgent } from "../src/agents/AgentValidator";
import { CopilotAgentAdapter } from "../src/agents/adapters/CopilotAgentAdapter";
import { ClaudeAgentAdapter } from "../src/agents/adapters/ClaudeAgentAdapter";
import { OpenAIAgentAdapter } from "../src/agents/adapters/OpenAIAgentAdapter";
import { exportAgentConfig } from "../src/agents/AgentExporter";
import { LocalRepository } from "../src/storage/LocalRepository";
import { AgentForgeBridge } from "../src/bridge/AgentForgeBridge";

function createMockContext(storageDir: string): vscode.ExtensionContext {
  const store = new Map<string, unknown>();
  return {
    subscriptions: [],
    workspaceState: {
      get: (key: string) => store.get(key),
      update: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      keys: () => [...store.keys()],
    },
    globalState: {
      get: <T>(key: string) => store.get(key) as T,
      update: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      keys: () => [...store.keys()],
      setKeysForSync: () => {},
    },
    extensionPath: storageDir,
    storagePath: storageDir,
    globalStoragePath: storageDir,
    storageUri: vscode.Uri.file(storageDir),
    globalStorageUri: vscode.Uri.file(storageDir),
    logUri: vscode.Uri.file(path.join(storageDir, "log")),
    extensionUri: vscode.Uri.file(storageDir),
    environmentVariableCollection: {} as any,
    extensionMode: vscode.ExtensionMode.Test,
    secrets: {} as any,
    extension: { packageJSON: { version: "0.1.0" } } as any,
    asAbsolutePath: (rel: string) => path.join(storageDir, rel),
  };
}

describe("End-to-End Verification: @ponytail, @graphify, and @security-architecture-review", () => {
  let tempWorkspaceRoot: string;
  let mockContext: vscode.ExtensionContext;
  let repo: LocalRepository;

  beforeEach(async () => {
    tempWorkspaceRoot = path.join(
      os.tmpdir(),
      `af-verify-skills-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    );
    await fs.promises.mkdir(tempWorkspaceRoot, { recursive: true });
    mockContext = createMockContext(path.join(tempWorkspaceRoot, ".global-storage"));
    repo = new LocalRepository(mockContext, tempWorkspaceRoot);
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(tempWorkspaceRoot, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe("1. Metadata & Exact Contract Verification", () => {
    it("verifies Ponytail (Engineering Discipline) skill and agent specifications", () => {
      // Skill metadata
      expect(ponytailSkill.id).toBe("ponytail");
      expect(ponytailSkill.name).toBe("Engineering Discipline");
      expect(ponytailSkill.description).toBe(
        "Controls code quality, complexity, maintainability, and implementation discipline.",
      );
      expect(ponytailSkill.frontmatter).toContain(
        "description: Controls code quality, complexity, maintainability, and implementation discipline.",
      );

      // Agent metadata
      expect(ponytailAgent.id).toBe("ponytail");
      expect(ponytailAgent.name).toBe("Engineering Discipline");
      expect(ponytailAgent.description).toBe(
        "Controls code quality, complexity, maintainability, and implementation discipline.",
      );
      expect(ponytailAgent.objective).toBe(
        "Controls code quality, complexity, maintainability, and implementation discipline.",
      );
      expect(ponytailAgent.assignedSkillIds).toContain("ponytail");
      expect(ponytailAgent.instructions).toContain("When invoked as @ponytail");
      expect(ponytailAgent.toolDefinitions.map((t) => t.name)).toEqual([
        "ponytail_review",
        "ponytail_audit",
        "ponytail_debt",
        "ponytail_gain",
      ]);
    });

    it("verifies Graphify (Codebase Intelligence) skill and agent specifications", () => {
      // Skill metadata
      expect(graphifySkill.id).toBe("graphify");
      expect(graphifySkill.name).toBe("Codebase Intelligence");
      expect(graphifySkill.description).toBe(
        "Understands architecture, dependencies, relationships, and impact across the codebase.",
      );
      expect(graphifySkill.frontmatter).toContain(
        "description: Understands architecture, dependencies, relationships, and impact across the codebase.",
      );

      // Agent metadata
      expect(graphifyAgent.id).toBe("graphify");
      expect(graphifyAgent.name).toBe("Codebase Intelligence");
      expect(graphifyAgent.description).toBe(
        "Understands architecture, dependencies, relationships, and impact across the codebase.",
      );
      expect(graphifyAgent.objective).toBe(
        "Understands architecture, dependencies, relationships, and impact across the codebase.",
      );
      expect(graphifyAgent.assignedSkillIds).toContain("graphify");
      expect(graphifyAgent.instructions).toContain("When invoked as @graphify");
      expect(graphifyAgent.toolDefinitions.map((t) => t.name)).toEqual([
        "graphify_build",
        "graphify_query",
        "graphify_path",
        "graphify_explain",
        "graphify_impact",
        "graphify_update",
      ]);
    });

    it("verifies Security Architecture Review (Security & Architecture Assurance) skill and agent specifications", () => {
      // Skill metadata
      expect(securityArchitectureReviewSkill.id).toBe("security-architecture-review");
      expect(securityArchitectureReviewSkill.name).toBe("Security & Architecture Assurance");
      expect(securityArchitectureReviewSkill.description).toBe(
        "Performs code reviews, security assessments, threat modeling, and architecture audits.",
      );
      expect(securityArchitectureReviewSkill.frontmatter).toContain(
        "description: Performs code reviews, security assessments, threat modeling, and architecture audits.",
      );

      // Agent metadata
      expect(securityArchitectureReviewAgent.id).toBe("security-architecture-review");
      expect(securityArchitectureReviewAgent.name).toBe("Security & Architecture Assurance");
      expect(securityArchitectureReviewAgent.description).toBe(
        "Performs code reviews, security assessments, threat modeling, and architecture audits.",
      );
      expect(securityArchitectureReviewAgent.objective).toBe(
        "Performs code reviews, security assessments, threat modeling, and architecture audits.",
      );
      expect(securityArchitectureReviewAgent.assignedSkillIds).toContain("security-architecture-review");
      expect(securityArchitectureReviewAgent.instructions).toContain(
        "When invoked as @security-architecture-review",
      );
      expect(securityArchitectureReviewAgent.toolDefinitions.map((t) => t.name)).toEqual([
        "security_architecture_review",
        "security_threat_model",
        "security_risk_assessment",
        "security_attack_path",
        "security_data_flow",
        "security_compliance_mapping",
        "security_remediation_plan",
      ]);
    });
  });

  describe("2. Schema Validation Engine", () => {
    it("validates all 3 skills strictly against SkillValidator schema", () => {
      const pRes = validateSkill(ponytailSkill);
      expect(pRes.valid).toBe(true);
      expect(pRes.errors).toHaveLength(0);

      const gRes = validateSkill(graphifySkill);
      expect(gRes.valid).toBe(true);
      expect(gRes.errors).toHaveLength(0);

      const sRes = validateSkill(securityArchitectureReviewSkill);
      expect(sRes.valid).toBe(true);
      expect(sRes.errors).toHaveLength(0);
    });

    it("validates all 3 agents strictly against AgentValidator schema", () => {
      const pRes = validateAgent(ponytailAgent);
      expect(pRes.valid).toBe(true);
      expect(pRes.errors).toHaveLength(0);

      const gRes = validateAgent(graphifyAgent);
      expect(gRes.valid).toBe(true);
      expect(gRes.errors).toHaveLength(0);

      const sRes = validateAgent(securityArchitectureReviewAgent);
      expect(sRes.valid).toBe(true);
      expect(sRes.errors).toHaveLength(0);
    });
  });

  describe("3. Multi-Platform Export Adapters", () => {
    it("exports valid GitHub Copilot agent configs for @ponytail, @graphify, and @security-architecture-review", () => {
      const copilotAdapter = new CopilotAgentAdapter();

      // 1. Ponytail
      const pExport = copilotAdapter.exportAgent(ponytailAgent);
      expect(pExport.files[0].relativePath).toBe(".github/copilot-instructions.md");
      expect(pExport.files[0].content).toContain("# Engineering Discipline");
      expect(pExport.files[0].content).toContain(
        "Controls code quality, complexity, maintainability, and implementation discipline.",
      );
      expect(pExport.files[0].content).toContain("When invoked as @ponytail");

      // 2. Graphify
      const gExport = copilotAdapter.exportAgent(graphifyAgent);
      expect(gExport.files[0].relativePath).toBe(".github/copilot-instructions.md");
      expect(gExport.files[0].content).toContain("# Codebase Intelligence");
      expect(gExport.files[0].content).toContain(
        "Understands architecture, dependencies, relationships, and impact across the codebase.",
      );
      expect(gExport.files[0].content).toContain("When invoked as @graphify");

      // 3. Security Architecture Review
      const sExport = copilotAdapter.exportAgent(securityArchitectureReviewAgent);
      expect(sExport.files[0].relativePath).toBe(".github/copilot-instructions.md");
      expect(sExport.files[0].content).toContain("# Security & Architecture Assurance");
      expect(sExport.files[0].content).toContain(
        "Performs code reviews, security assessments, threat modeling, and architecture audits.",
      );
      expect(sExport.files[0].content).toContain("When invoked as @security-architecture-review");
    });

    it("exports valid Claude Code agent configs for @ponytail, @graphify, and @security-architecture-review", () => {
      const claudeAdapter = new ClaudeAgentAdapter();

      const pExport = claudeAdapter.exportAgent(ponytailAgent);
      const pSubagent = pExport.files.find((f) => f.relativePath.includes(".claude/agents"));
      expect(pSubagent).toBeDefined();
      expect(pSubagent?.content).toContain('<agent id="ponytail"');
      expect(pSubagent?.content).toContain(
        "Controls code quality, complexity, maintainability, and implementation discipline.",
      );

      const gExport = claudeAdapter.exportAgent(graphifyAgent);
      const gSubagent = gExport.files.find((f) => f.relativePath.includes(".claude/agents"));
      expect(gSubagent).toBeDefined();
      expect(gSubagent?.content).toContain('<agent id="graphify"');
      expect(gSubagent?.content).toContain(
        "Understands architecture, dependencies, relationships, and impact across the codebase.",
      );

      const sExport = claudeAdapter.exportAgent(securityArchitectureReviewAgent);
      const sSubagent = sExport.files.find((f) => f.relativePath.includes(".claude/agents"));
      expect(sSubagent).toBeDefined();
      expect(sSubagent?.content).toContain('<agent id="security-architecture-review"');
      expect(sSubagent?.content).toContain(
        "Performs code reviews, security assessments, threat modeling, and architecture audits.",
      );
    });

    it("exports valid OpenAI Assistants API agent configurations", () => {
      const openAiAdapter = new OpenAIAgentAdapter();

      const pExport = openAiAdapter.exportAgent(ponytailAgent);
      const pAssistant = pExport.files.find((f) => f.fileName.includes("assistant.json"));
      expect(pAssistant).toBeDefined();
      const pJson = JSON.parse(pAssistant!.content);
      expect(pJson.name).toBe("Engineering Discipline");
      expect(pJson.description).toBe(
        "Controls code quality, complexity, maintainability, and implementation discipline.",
      );

      const gExport = openAiAdapter.exportAgent(graphifyAgent);
      const gAssistant = gExport.files.find((f) => f.fileName.includes("assistant.json"));
      expect(gAssistant).toBeDefined();
      const gJson = JSON.parse(gAssistant!.content);
      expect(gJson.name).toBe("Codebase Intelligence");
      expect(gJson.description).toBe(
        "Understands architecture, dependencies, relationships, and impact across the codebase.",
      );

      const sExport = openAiAdapter.exportAgent(securityArchitectureReviewAgent);
      const sAssistant = sExport.files.find((f) => f.fileName.includes("assistant.json"));
      expect(sAssistant).toBeDefined();
      const sJson = JSON.parse(sAssistant!.content);
      expect(sJson.name).toBe("Security & Architecture Assurance");
      expect(sJson.description).toBe(
        "Performs code reviews, security assessments, threat modeling, and architecture audits.",
      );
    });
  });

  describe("4. End-to-End Installation & Bridge RPC Dispatch", () => {
    it("installs all 3 agents and auto-cascades their skills to .github and .claude workspace directories", async () => {
      const channel = {
        appendLine: () => {},
      } as unknown as vscode.OutputChannel;
      const bridge = new AgentForgeBridge(mockContext, repo, channel);
      const posted: any[] = [];
      const mockWebview: any = {
        postMessage: (msg: any) => posted.push(msg),
      };

      // 1. Install @ponytail to Copilot
      await bridge.handleMessage(
        {
          id: "install-ponytail-copilot",
          type: "agents.install",
          payload: {
            id: ponytailAgent.id,
            platform: "copilot",
            scope: "workspace",
          },
        },
        mockWebview,
      );
      const pRes = posted.find((m) => m.requestId === "install-ponytail-copilot");
      expect(pRes?.ok).toBe(true);

      const copilotPonytailAgentFile = path.join(
        tempWorkspaceRoot,
        ".github",
        "agents",
        "ponytail.agent.md",
      );
      expect(fs.existsSync(copilotPonytailAgentFile)).toBe(true);
      const copilotPonytailContent = await fs.promises.readFile(copilotPonytailAgentFile, "utf8");
      expect(copilotPonytailContent).toContain("# Engineering Discipline");
      expect(copilotPonytailContent).toContain(
        "Controls code quality, complexity, maintainability, and implementation discipline.",
      );
      expect(copilotPonytailContent).toContain("When invoked as @ponytail");

      // Verify cascaded ponytail skill in .github/skills/ponytail/SKILL.md
      const copilotPonytailSkillFile = path.join(
        tempWorkspaceRoot,
        ".github",
        "skills",
        "ponytail",
        "SKILL.md",
      );
      expect(fs.existsSync(copilotPonytailSkillFile)).toBe(true);

      // 2. Install @graphify to Claude
      await bridge.handleMessage(
        {
          id: "install-graphify-claude",
          type: "agents.install",
          payload: {
            id: graphifyAgent.id,
            platform: "claude",
            scope: "workspace",
          },
        },
        mockWebview,
      );
      const gRes = posted.find((m) => m.requestId === "install-graphify-claude");
      expect(gRes?.ok).toBe(true);

      const claudeGraphifyAgentFile = path.join(
        tempWorkspaceRoot,
        ".claude",
        "agents",
        "graphify.md",
      );
      expect(fs.existsSync(claudeGraphifyAgentFile)).toBe(true);
      const claudeGraphifyContent = await fs.promises.readFile(claudeGraphifyAgentFile, "utf8");
      expect(claudeGraphifyContent).toContain('<agent id="graphify"');
      expect(claudeGraphifyContent).toContain("<name>Codebase Intelligence</name>");
      expect(claudeGraphifyContent).toContain(
        "Understands architecture, dependencies, relationships, and impact across the codebase.",
      );

      // Verify cascaded graphify skill in .claude/skills/graphify/SKILL.md
      const claudeGraphifySkillFile = path.join(
        tempWorkspaceRoot,
        ".claude",
        "skills",
        "graphify",
        "SKILL.md",
      );
      expect(fs.existsSync(claudeGraphifySkillFile)).toBe(true);

      // 3. Install @security-architecture-review to Copilot
      await bridge.handleMessage(
        {
          id: "install-sar-copilot",
          type: "agents.install",
          payload: {
            id: securityArchitectureReviewAgent.id,
            platform: "copilot",
            scope: "workspace",
          },
        },
        mockWebview,
      );
      const sRes = posted.find((m) => m.requestId === "install-sar-copilot");
      expect(sRes?.ok).toBe(true);

      const copilotSarAgentFile = path.join(
        tempWorkspaceRoot,
        ".github",
        "agents",
        "security-architecture-review.agent.md",
      );
      expect(fs.existsSync(copilotSarAgentFile)).toBe(true);
      const copilotSarContent = await fs.promises.readFile(copilotSarAgentFile, "utf8");
      expect(copilotSarContent).toContain("# Security & Architecture Assurance");
      expect(copilotSarContent).toContain(
        "Performs code reviews, security assessments, threat modeling, and architecture audits.",
      );
      expect(copilotSarContent).toContain("When invoked as @security-architecture-review");

      // Verify cascaded security-architecture-review skill in .github/skills/security-architecture-review/SKILL.md
      const copilotSarSkillFile = path.join(
        tempWorkspaceRoot,
        ".github",
        "skills",
        "security-architecture-review",
        "SKILL.md",
      );
      expect(fs.existsSync(copilotSarSkillFile)).toBe(true);
    });
  });

  describe("5. Physical Repository Files Integrity", () => {
    const root = path.resolve(__dirname, "..");

    it("verifies canonical skills and synchronized files exist across all target directories", () => {
      const skills = [
        {
          id: "ponytail",
          name: "Engineering Discipline",
          purpose: "Controls code quality, complexity, maintainability, and implementation discipline.",
        },
        {
          id: "graphify",
          name: "Codebase Intelligence",
          purpose: "Understands architecture, dependencies, relationships, and impact across the codebase.",
        },
        {
          id: "security-architecture-review",
          name: "Security & Architecture Assurance",
          purpose: "Performs code reviews, security assessments, threat modeling, and architecture audits.",
        },
      ];

      for (const sk of skills) {
        // Canonical skill in skills/<id>/SKILL.md
        const canonPath = path.join(root, "skills", sk.id, "SKILL.md");
        expect(fs.existsSync(canonPath)).toBe(true);
        const canonContent = fs.readFileSync(canonPath, "utf8");
        expect(canonContent).toContain(sk.purpose);

        // Synchronized in .github/skills/<id>/SKILL.md
        const ghPath = path.join(root, ".github", "skills", sk.id, "SKILL.md");
        expect(fs.existsSync(ghPath)).toBe(true);
        const ghContent = fs.readFileSync(ghPath, "utf8");
        expect(ghContent).toContain(sk.purpose);

        // Synchronized in .claude/skills/<id>/SKILL.md
        const clPath = path.join(root, ".claude", "skills", sk.id, "SKILL.md");
        expect(fs.existsSync(clPath)).toBe(true);
        const clContent = fs.readFileSync(clPath, "utf8");
        expect(clContent).toContain(sk.purpose);

        // Synchronized in .agents/skills/<id>/SKILL.md
        const agPath = path.join(root, ".agents", "skills", sk.id, "SKILL.md");
        expect(fs.existsSync(agPath)).toBe(true);
        const agContent = fs.readFileSync(agPath, "utf8");
        expect(agContent).toContain(sk.purpose);

        // Copilot Agent definition in .github/agents/<id>.agent.md
        const ghAgentPath = path.join(root, ".github", "agents", `${sk.id}.agent.md`);
        expect(fs.existsSync(ghAgentPath)).toBe(true);
        const ghAgentContent = fs.readFileSync(ghAgentPath, "utf8");
        expect(ghAgentContent).toContain(sk.purpose);
        expect(ghAgentContent).toContain(`@${sk.id}`);

        // Claude Agent definition in .claude/agents/<id>.md
        const clAgentPath = path.join(root, ".claude", "agents", `${sk.id}.md`);
        expect(fs.existsSync(clAgentPath)).toBe(true);
        const clAgentContent = fs.readFileSync(clAgentPath, "utf8");
        expect(clAgentContent).toContain(sk.purpose);
        expect(clAgentContent).toContain(`@${sk.id}`);
      }
    });
  });
});
