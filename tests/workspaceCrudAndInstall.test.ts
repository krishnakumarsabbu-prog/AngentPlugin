import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as vscode from "vscode";
import { LocalRepository } from "../src/storage/LocalRepository";
import { AgentInstallationService } from "../src/agents/install/AgentInstallationService";
import { InstallationService, createInstallRegistry, InMemoryArtifactsStore } from "../src/skills/install/installationService";
import { SkillPackageService } from "../src/skills/SkillPackageService";
import { validateSkill } from "../src/skills/SkillValidator";
import { validateAgent } from "../src/agents/AgentValidator";
import { AgentForgeBridge } from "../src/bridge/AgentForgeBridge";
import { InstallFile } from "../src/skills/install/types";
import { Agent } from "../src/domain/agents/types";

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

describe("Real Workspace Files: Skills & Agents CRUD, Local Persistence & Installation", () => {
  let tempWorkspaceRoot: string;
  let mockContext: vscode.ExtensionContext;
  let repo: LocalRepository;

  beforeEach(async () => {
    tempWorkspaceRoot = path.join(os.tmpdir(), `af-workspace-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
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

  describe("Skills Core CRUD on Real Workspace Files", () => {
    it("creates a skill and writes real workspace files under .agentforge/skills", async () => {
      const created = await repo.createSkill({
        id: "skill-real-test",
        name: "Workspace Skill Test",
        description: "Testing real file persistence",
        version: "1.0.0",
        instructions: "Step 1: Verify files exist.",
      });

      expect(created.id).toBe("skill-real-test");
      expect(created.name).toBe("Workspace Skill Test");

      // Verify file exists on real workspace disk
      const filePath = path.join(tempWorkspaceRoot, ".agentforge", "skills", "skill-real-test.json");
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
      expect(content.id).toBe("skill-real-test");
      expect(content.instructions).toBe("Step 1: Verify files exist.");

      // Verify state.json was written
      const statePath = path.join(tempWorkspaceRoot, ".agentforge", "state.json");
      expect(fs.existsSync(statePath)).toBe(true);
    });

    it("updates a skill and reflects changes on real workspace disk", async () => {
      await repo.createSkill({
        id: "skill-update-test",
        name: "Initial Name",
        version: "1.0.0",
      });

      const updated = await repo.updateSkill("skill-update-test", {
        name: "Updated Name",
        description: "Updated description",
        version: "1.1.0",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.version).toBe("1.1.0");

      const filePath = path.join(tempWorkspaceRoot, ".agentforge", "skills", "skill-update-test.json");
      const diskContent = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
      expect(diskContent.name).toBe("Updated Name");
      expect(diskContent.version).toBe("1.1.0");
    });

    it("deletes a skill and removes the file from real workspace disk", async () => {
      await repo.createSkill({
        id: "skill-delete-test",
        name: "Skill To Delete",
      });

      const filePath = path.join(tempWorkspaceRoot, ".agentforge", "skills", "skill-delete-test.json");
      expect(fs.existsSync(filePath)).toBe(true);

      await repo.deleteSkill("skill-delete-test");
      expect(fs.existsSync(filePath)).toBe(false);

      const fetched = await repo.getSkill("skill-delete-test");
      expect(fetched).toBeUndefined();
    });
  });

  describe("Agents Core CRUD on Real Workspace Files", () => {
    it("creates an agent and writes real workspace files under .agentforge/agents", async () => {
      const created = await repo.createAgent({
        id: "agent-real-test",
        name: "Workspace Agent Test",
        role: "Quality Assurance Specialist",
        objective: "Execute automated validation suites",
        instructions: "Verify all unit and end-to-end tests.",
      });

      expect(created.id).toBe("agent-real-test");
      expect(created.name).toBe("Workspace Agent Test");

      const filePath = path.join(tempWorkspaceRoot, ".agentforge", "agents", "agent-real-test.json");
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
      expect(content.id).toBe("agent-real-test");
      expect(content.role).toBe("Quality Assurance Specialist");
    });

    it("updates an agent and persists changes to real workspace disk", async () => {
      await repo.createAgent({
        id: "agent-update-test",
        name: "Initial Agent",
        role: "Researcher",
      });

      const updated = await repo.updateAgent("agent-update-test", {
        name: "Senior Researcher",
        operatingPrinciples: ["Principle 1", "Principle 2"],
      });

      expect(updated.name).toBe("Senior Researcher");
      expect(updated.operatingPrinciples).toContain("Principle 1");

      const filePath = path.join(tempWorkspaceRoot, ".agentforge", "agents", "agent-update-test.json");
      const diskContent = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
      expect(diskContent.name).toBe("Senior Researcher");
      expect(diskContent.operatingPrinciples).toContain("Principle 1");
    });

    it("deletes an agent and unlinks the file from real workspace disk", async () => {
      await repo.createAgent({
        id: "agent-delete-test",
        name: "Temporary Agent",
      });

      const filePath = path.join(tempWorkspaceRoot, ".agentforge", "agents", "agent-delete-test.json");
      expect(fs.existsSync(filePath)).toBe(true);

      await repo.deleteAgent("agent-delete-test");
      expect(fs.existsSync(filePath)).toBe(false);

      const fetched = await repo.getAgent("agent-delete-test");
      expect(fetched).toBeUndefined();
    });
  });

  describe("Skills Real Workspace Installation & Removal", () => {
    it("installs a skill into real workspace .github/skills and uninstalls cleanly", async () => {
      const registry = createInstallRegistry(null, tempWorkspaceRoot);
      const artifactsStore = new InMemoryArtifactsStore();
      const installer = new InstallationService(registry, artifactsStore);

      const files: InstallFile[] = [
        { relativePath: path.join("skill-copilot-test", "SKILL.md"), content: "# Copilot Skill\n\nInstructions here." },
        { relativePath: path.join("skill-copilot-test", "resources", "checklist.md"), content: "- [ ] Item 1" },
      ];

      // Plan
      const plan = await installer.plan("skill-copilot-test", "copilot", "workspace", files);
      expect(plan.supported).toBe(true);
      expect(plan.simulated).toBe(false);
      expect(plan.target.displayPath).toBe(".github/skills");

      // Install
      const artifact = await installer.install("skill-copilot-test", plan);
      expect(artifact.simulated).toBe(false);

      const installedSkillMd = path.join(tempWorkspaceRoot, ".github", "skills", "skill-copilot-test", "SKILL.md");
      const installedResource = path.join(tempWorkspaceRoot, ".github", "skills", "skill-copilot-test", "resources", "checklist.md");

      expect(fs.existsSync(installedSkillMd)).toBe(true);
      expect(fs.existsSync(installedResource)).toBe(true);
      expect(await fs.promises.readFile(installedSkillMd, "utf8")).toContain("# Copilot Skill");

      // Uninstall
      const uninstallRes = await installer.uninstall("skill-copilot-test", "copilot", "workspace");
      expect(uninstallRes.recordRemoved).toBe(true);
      expect(uninstallRes.diskRemoved).toBe(true);

      expect(fs.existsSync(installedSkillMd)).toBe(false);
      expect(fs.existsSync(installedResource)).toBe(false);
    });

    it("installs a skill into real workspace .claude/skills and uninstalls cleanly", async () => {
      const registry = createInstallRegistry(null, tempWorkspaceRoot);
      const installer = new InstallationService(registry, new InMemoryArtifactsStore());

      const files: InstallFile[] = [
        { relativePath: path.join("skill-claude-test", "SKILL.md"), content: "# Claude Skill\n\nInstructions." },
      ];

      const plan = await installer.plan("skill-claude-test", "claude", "workspace", files);
      expect(plan.supported).toBe(true);

      await installer.install("skill-claude-test", plan);
      const targetFile = path.join(tempWorkspaceRoot, ".claude", "skills", "skill-claude-test", "SKILL.md");
      expect(fs.existsSync(targetFile)).toBe(true);

      await installer.uninstall("skill-claude-test", "claude", "workspace");
      expect(fs.existsSync(targetFile)).toBe(false);
    });

    it("installs a skill into real workspace .agents/skills (Neutral) and uninstalls cleanly", async () => {
      const registry = createInstallRegistry(null, tempWorkspaceRoot);
      const installer = new InstallationService(registry, new InMemoryArtifactsStore());

      const files: InstallFile[] = [
        { relativePath: path.join("skill-neutral-test", "SKILL.md"), content: "# Neutral Skill\n\nInstructions." },
      ];

      const plan = await installer.plan("skill-neutral-test", "neutral", "workspace", files);
      expect(plan.supported).toBe(true);

      await installer.install("skill-neutral-test", plan);
      const targetFile = path.join(tempWorkspaceRoot, ".agents", "skills", "skill-neutral-test", "SKILL.md");
      expect(fs.existsSync(targetFile)).toBe(true);

      await installer.uninstall("skill-neutral-test", "neutral", "workspace");
      expect(fs.existsSync(targetFile)).toBe(false);
    });
  });

  describe("Agents Real Workspace Installation & Removal", () => {
    it("installs an agent into real workspace .github/agents and uninstalls cleanly", async () => {
      const service = new AgentInstallationService(tempWorkspaceRoot);
      const agent: Agent = {
        id: "reviewer-agent",
        name: "Code Reviewer",
        role: "Review Specialist",
        description: "Reviews code changes",
        objective: "Ensure high code quality",
        instructions: "Check for edge cases and adherence to standards.",
        version: "1.0.0",
        status: "Ready",
        scope: "All source files",
        outOfScope: "Production deployments",
        operatingPrinciples: ["Be thorough", "Be constructive"],
        assignedSkillIds: [],
        toolDefinitions: [],
        permissionPolicy: { readOnly: true, humanApprovalRequired: true, writeOperations: false, shell: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const plan = await service.plan(agent, "copilot", "workspace");
      expect(plan.supported).toBe(true);
      expect(plan.simulated).toBe(false);
      expect(plan.files[0].relativePath).toBe("reviewer-agent.agent.md");

      const artifact = await service.install(agent, plan);
      expect(artifact.simulated).toBe(false);

      const targetPath = path.join(tempWorkspaceRoot, ".github", "agents", "reviewer-agent.agent.md");
      expect(fs.existsSync(targetPath)).toBe(true);

      const mdContent = await fs.promises.readFile(targetPath, "utf8");
      expect(mdContent).toContain("# Code Reviewer");
      expect(mdContent).toContain("Review Specialist");

      // Verify list of installations
      const installations = service.artifactsFor("reviewer-agent");
      expect(installations.length).toBe(1);
      expect(installations[0].platform).toBe("copilot");

      // Uninstall
      const uninstallRes = await service.uninstall("reviewer-agent", "copilot", "workspace", true);
      expect(uninstallRes.recordRemoved).toBe(true);
      expect(uninstallRes.diskRemoved).toBe(true);
      expect(fs.existsSync(targetPath)).toBe(false);
    });

    it("installs an agent into real workspace .claude/agents and uninstalls cleanly", async () => {
      const service = new AgentInstallationService(tempWorkspaceRoot);
      const agent: Agent = {
        id: "claude-agent",
        name: "Claude Architect",
        role: "System Architect",
        description: "Designs system architecture",
        objective: "Produce maintainable architectures",
        instructions: "Apply clean architecture principles.",
        version: "1.0.0",
        status: "Ready",
        scope: "System designs",
        outOfScope: "Raw execution",
        operatingPrinciples: ["Modularity", "Decoupling"],
        assignedSkillIds: [],
        toolDefinitions: [],
        permissionPolicy: { readOnly: true, humanApprovalRequired: true, writeOperations: false, shell: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const plan = await service.plan(agent, "claude", "workspace");
      await service.install(agent, plan);

      const targetPath = path.join(tempWorkspaceRoot, ".claude", "agents", "claude-agent.md");
      expect(fs.existsSync(targetPath)).toBe(true);

      const mdContent = await fs.promises.readFile(targetPath, "utf8");
      expect(mdContent).toContain("Claude Architect");

      await service.uninstall("claude-agent", "claude", "workspace", true);
      expect(fs.existsSync(targetPath)).toBe(false);
    });

    it("installs an agent into real workspace .agents/agents (Neutral JSON) and uninstalls cleanly", async () => {
      const service = new AgentInstallationService(tempWorkspaceRoot);
      const agent: Agent = {
        id: "canonical-agent",
        name: "Canonical Worker",
        role: "General Worker",
        description: "General execution agent",
        objective: "Perform tasks",
        instructions: "Execute tasks methodically.",
        version: "1.0.0",
        status: "Ready",
        scope: "Project scope",
        outOfScope: "Unsafe commands",
        operatingPrinciples: ["Reliability"],
        assignedSkillIds: [],
        toolDefinitions: [],
        permissionPolicy: { readOnly: false, humanApprovalRequired: true, writeOperations: true, shell: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const plan = await service.plan(agent, "neutral", "workspace");
      await service.install(agent, plan);

      const targetPath = path.join(tempWorkspaceRoot, ".agents", "agents", "canonical-agent.json");
      expect(fs.existsSync(targetPath)).toBe(true);

      const parsed = JSON.parse(await fs.promises.readFile(targetPath, "utf8"));
      expect(parsed.name).toBe("Canonical Worker");

      await service.uninstall("canonical-agent", "neutral", "workspace", true);
      expect(fs.existsSync(targetPath)).toBe(false);
    });
  });

  describe("Schema Validation", () => {
    it("validates skills correctly with errors on invalid fields", () => {
      const invalidSkill = {
        name: "", // required
        version: "invalid-semver",
      };
      const res = validateSkill(invalidSkill as any);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === "name")).toBe(true);
      expect(res.errors.some((e) => e.field === "version")).toBe(true);
    });

    it("validates valid skills with clean result", () => {
      const validSkill = {
        id: "valid-skill",
        name: "Valid Skill",
        description: "A valid skill description.",
        version: "1.0.0",
        instructions: "Do something specific and useful.",
      };
      const res = validateSkill(validSkill as any);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });

    it("validates agents with errors when missing mandatory fields or contradictory policy", () => {
      const invalidAgent = {
        name: "",
        role: "",
        objective: "",
        instructions: "",
        permissionPolicy: {
          readOnly: true,
          writeOperations: true, // contradiction
        },
      };
      const res = validateAgent(invalidAgent as any);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.field === "name")).toBe(true);
      expect(res.errors.some((e) => e.field === "role")).toBe(true);
      expect(res.errors.some((e) => e.field.includes("permissionPolicy"))).toBe(true);
    });
  });

  describe("Extension-to-WebView RPC Bridge with Real Workspace Operations", () => {
    it("handles full lifecycle of skill and agent via RPC messages", async () => {
      const channel = {
        appendLine: () => {},
      } as unknown as vscode.OutputChannel;

      const bridge = new AgentForgeBridge(mockContext, repo, channel);
      const posted: any[] = [];
      const mockWebview: vscode.Webview = {
        postMessage: async (msg: any) => {
          posted.push(msg);
          return true;
        },
      } as any;

      // 1. Create skill via RPC
      await bridge.handleMessage(
        {
          id: "req-1",
          type: "skills.create",
          payload: {
            skill: {
              id: "bridge-skill",
              name: "Bridge Created Skill",
              description: "Bridge skill description.",
              version: "1.0.0",
              instructions: "Bridge instructions.",
            },
          },
        },
        mockWebview,
      );
      expect(posted[0]?.ok).toBe(true);
      expect(posted[0]?.data?.id).toBe("bridge-skill");

      // Verify file created on real workspace disk
      const skillFile = path.join(tempWorkspaceRoot, ".agentforge", "skills", "bridge-skill.json");
      expect(fs.existsSync(skillFile)).toBe(true);

      // 2. Create agent via RPC
      await bridge.handleMessage(
        {
          id: "req-2",
          type: "agents.create",
          payload: {
            agent: {
              id: "bridge-agent",
              name: "Bridge Created Agent",
              role: "Worker",
              version: "1.0.0",
              objective: "Handle work",
              instructions: "Execute tasks.",
            },
          },
        },
        mockWebview,
      );
      expect(posted[1]?.ok).toBe(true);
      expect(posted[1]?.data?.id).toBe("bridge-agent");

      // Verify agent created on real workspace disk
      const agentFile = path.join(tempWorkspaceRoot, ".agentforge", "agents", "bridge-agent.json");
      expect(fs.existsSync(agentFile)).toBe(true);

      // 3. Install agent to real workspace via RPC
      await bridge.handleMessage(
        {
          id: "req-3",
          type: "agents.install",
          payload: {
            id: "bridge-agent",
            platform: "copilot",
            scope: "workspace",
          },
        },
        mockWebview,
      );
      expect(posted[2]?.ok).toBe(true);
      const installedAgentPath = path.join(tempWorkspaceRoot, ".github", "agents", "bridge-agent.agent.md");
      expect(fs.existsSync(installedAgentPath)).toBe(true);

      // 4. Uninstall agent via RPC
      await bridge.handleMessage(
        {
          id: "req-4",
          type: "agents.uninstall",
          payload: {
            id: "bridge-agent",
            platform: "copilot",
            scope: "workspace",
            removeFromDisk: true,
          },
        },
        mockWebview,
      );
      expect(posted[3]?.ok).toBe(true);
      expect(fs.existsSync(installedAgentPath)).toBe(false);

      // 5. Delete skill & agent via RPC
      await bridge.handleMessage(
        {
          id: "req-5",
          type: "skills.delete",
          payload: { id: "bridge-skill" },
        },
        mockWebview,
      );
      expect(posted[4]?.ok).toBe(true);
      expect(fs.existsSync(skillFile)).toBe(false);

      await bridge.handleMessage(
        {
          id: "req-6",
          type: "agents.delete",
          payload: { id: "bridge-agent" },
        },
        mockWebview,
      );
      expect(posted[5]?.ok).toBe(true);
      expect(fs.existsSync(agentFile)).toBe(false);
    });

    it("supports batch installation of skills and agents with automatic cascade copy of assigned skills", async () => {
      // Create two skills and an agent assigned to both skills
      const skillA = await repo.createSkill({
        name: "Security Audit Core",
        description: "Core security checks",
        instructions: "# Core Audit Instructions",
        platform: "copilot",
        author: "Agent Forge",
        assignedTools: [],
      });
      const skillB = await repo.createSkill({
        name: "Secrets Detection",
        description: "Secret scanner checks",
        instructions: "# Secret Scanning Instructions",
        platform: "copilot",
        author: "Agent Forge",
        assignedTools: [],
      });

      const agent = await repo.createAgent({
        name: "Master Auditor",
        role: "Lead Security Auditor",
        description: "Orchestrates full audit",
        objective: "Scan entire workspace for security risks",
        status: "Ready",
        version: "1.0.0",
        assignedSkillIds: [skillA.id, skillB.id],
        instructions: "# Master Auditor System Prompt",
        compatibility: ["copilot", "claude"],
      });

      const channel = {
        appendLine: () => {},
      } as unknown as vscode.OutputChannel;
      const bridge = new AgentForgeBridge(mockContext, repo, channel);
      const posted: any[] = [];
      const mockWebview: any = {
        postMessage: (msg: any) => posted.push(msg),
      };

      // 1. Batch install both skills to GitHub Copilot (.github/skills/)
      await bridge.handleMessage(
        {
          id: "batch-skills-1",
          type: "skills.batchInstall",
          payload: {
            ids: [skillA.id, skillB.id],
            platform: "copilot",
          },
        },
        mockWebview,
      );

      const batchSkillRes = posted.find((m) => m.requestId === "batch-skills-1");
      expect(batchSkillRes?.ok).toBe(true);
      expect(batchSkillRes?.data?.count).toBe(2);
      expect(fs.existsSync(path.join(tempWorkspaceRoot, ".github", "skills", skillA.id, "SKILL.md"))).toBe(true);
      expect(fs.existsSync(path.join(tempWorkspaceRoot, ".github", "skills", skillB.id, "SKILL.md"))).toBe(true);

      // 2. Install agent to Claude (.claude/agents/)
      // This MUST automatically cascade and install assigned skills skillA and skillB to .claude/skills/
      await bridge.handleMessage(
        {
          id: "agent-install-1",
          type: "agents.install",
          payload: {
            id: agent.id,
            platform: "claude",
            scope: "workspace",
          },
        },
        mockWebview,
      );

      const agentInstallRes = posted.find((m) => m.requestId === "agent-install-1");
      expect(agentInstallRes?.ok).toBe(true);
      // Agent file in .claude/agents/
      expect(fs.existsSync(path.join(tempWorkspaceRoot, ".claude", "agents", `${agent.id}.md`))).toBe(true);
      // Cascaded assigned skills in .claude/skills/
      expect(fs.existsSync(path.join(tempWorkspaceRoot, ".claude", "skills", skillA.id, "SKILL.md"))).toBe(true);
      expect(fs.existsSync(path.join(tempWorkspaceRoot, ".claude", "skills", skillB.id, "SKILL.md"))).toBe(true);

      // 3. Batch install agents to Copilot (.github/agents/ and .github/skills/)
      await bridge.handleMessage(
        {
          id: "batch-agents-1",
          type: "agents.batchInstall",
          payload: {
            ids: [agent.id],
            platform: "copilot",
          },
        },
        mockWebview,
      );

      const batchAgentRes = posted.find((m) => m.requestId === "batch-agents-1");
      expect(batchAgentRes?.ok).toBe(true);
      expect(batchAgentRes?.data?.count).toBe(1);
      // ONLY .agent.md must exist for Copilot
      expect(fs.existsSync(path.join(tempWorkspaceRoot, ".github", "agents", `${agent.id}.agent.md`))).toBe(true);
      expect(fs.existsSync(path.join(tempWorkspaceRoot, ".github", "agents", `${agent.id}.md`))).toBe(false);
      expect(fs.existsSync(path.join(tempWorkspaceRoot, ".github", "skills", skillA.id, "SKILL.md"))).toBe(true);
    });
  });
});
