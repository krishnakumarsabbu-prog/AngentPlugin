import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { statSync } from "fs";
import { LocalRepository } from "../storage/LocalRepository";
import { validateIncomingMessage, makeResponse, unsupportedResponse } from "./messageValidator";
import {
  BaseMessage,
  ResponseMessage,
  IdPayload,
  SkillWritePayload,
  SkillValidatePayload,
  SkillDiffPayload,
  SkillExportPayload,
  SkillImportPreviewPayload,
  SkillInstallTargetsPayload,
  SkillInstallPlanPayload,
  SkillInstallPayload,
  SkillBatchInstallPayload,
  SkillUninstallPayload,
  AgentInstallTargetsPayload,
  AgentInstallPlanPayload,
  AgentInstallPayload,
  AgentBatchInstallPayload,
  AgentUninstallPayload,
} from "./messages";
import { SkillService } from "../skills/SkillService";
import { SkillPackageService, ImportPreview, ExportResult } from "../skills/SkillPackageService";
import {
  InstallationService,
  createInstallRegistry,
  InMemoryArtifactsStore,
  InstallRegistry,
  InstalledArtifactsStore,
} from "../skills/install/installationService";
import { InstallFile, InstallScope, PlatformId } from "../skills/install/types";
import { validateAgent } from "../agents/AgentValidator";
import { exportAgentConfig } from "../agents/AgentExporter";
import { analyzeAgentCompatibility, exportAgentForPlatform, AgentPlatformId } from "../agents/adapters";
import { AgentInstallationService } from "../agents/install/AgentInstallationService";
import { AgentInstallScope } from "../agents/install/types";
import { validateWorkflow } from "../workflows/WorkflowValidator";
import { exportWorkflowPackage, parseWorkflowPackage } from "../workflows/workflowFormat";
import { LocalSimulationEngine } from "../executions/LocalSimulationEngine";
import { LiveExecutionEngine } from "../executions/LiveExecutionEngine";
import { SecureCredentialStore, InMemorySecretStorage } from "../security/SecureCredentialStore";
import { AuditRepository } from "../storage/AuditRepository";
import { PackageManagerService } from "../packages/PackageManagerService";
import { PlatformIntegrationService } from "../integrations/PlatformIntegrationService";
import { getAllPersonas, getPersonaById } from "../domain/persona/catalog";
import { RepositoryCrawler } from "../services/persona/RepositoryCrawler";
import { SkillCompiler } from "../services/persona/SkillCompiler";
import { SkillQualityEvaluator } from "../services/persona/SkillQualityEvaluator";
import { IncrementalCrawlStore } from "../services/persona/IncrementalCrawlStore";
import { CrawlOptions, SkillGenerationRequest } from "../domain/persona/types";

const APP_VERSION = "0.1.0";

export class AgentForgeBridge {
  private readonly skills: SkillService;
  private readonly packages: SkillPackageService;
  private readonly artifactsStore: InstalledArtifactsStore;
  private readonly installRegistry: InstallRegistry;
  private readonly installation: InstallationService;
  private readonly agentInstallation: AgentInstallationService;
  private readonly simulationEngine: LocalSimulationEngine;
  private readonly liveEngine: LiveExecutionEngine;
  private readonly credentialStore: SecureCredentialStore;
  private readonly packageManager: PackageManagerService;
  private readonly integrations: PlatformIntegrationService;
  private readonly auditRepo: AuditRepository;
  private readonly skillCompiler: SkillCompiler;
  private readonly qualityEvaluator: SkillQualityEvaluator;
  private activeCrawlAbortController?: AbortController;
  private readonly importPreviews = new Map<string, ImportPreview>();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly repo: LocalRepository,
    private readonly channel: vscode.OutputChannel,
  ) {
    this.skills = new SkillService({ store: repo, history: repo.getHistoryStore() });
    this.packages = new SkillPackageService(repo);
    this.artifactsStore = new InMemoryArtifactsStore();
    this.skillCompiler = new SkillCompiler();
    this.qualityEvaluator = new SkillQualityEvaluator();
    const workspaceRoot = repo.getWorkspaceRoot() ?? vscode.workspace?.workspaceFolders?.[0]?.uri?.fsPath;
    this.installRegistry = createInstallRegistry(
      context.globalStorageUri?.fsPath ?? null,
      workspaceRoot ?? null,
    );
    this.installation = new InstallationService(this.installRegistry, this.artifactsStore);
    this.agentInstallation = new AgentInstallationService(workspaceRoot);
    this.packageManager = new PackageManagerService();

    const secretProvider =
      context.secrets && typeof (context.secrets as any).get === "function"
        ? (context.secrets as any)
        : new InMemorySecretStorage();
    this.credentialStore = new SecureCredentialStore(secretProvider);
    this.integrations = new PlatformIntegrationService(this.credentialStore);

    this.auditRepo = new AuditRepository();
    this.simulationEngine = new LocalSimulationEngine({
      storage: {
        saveExecution: (record) => this.repo.saveExecution(record),
        getExecution: (id) => this.repo.getExecution(id),
        listExecutions: () => this.repo.listExecutions(),
      },
      workflowProvider: (wfId) => this.repo.getWorkflow(wfId),
    });
    this.liveEngine = new LiveExecutionEngine({
      storage: {
        saveExecution: (record) => this.repo.saveExecution(record),
        getExecution: (id) => this.repo.getExecution(id),
        listExecutions: () => this.repo.listExecutions(),
      },
      credentialStore: this.credentialStore,
      agentProvider: (agentId) => this.repo.getAgent(agentId),
      workflowProvider: (wfId) => this.repo.getWorkflow(wfId),
      workspaceRoot: workspaceRoot ?? process.cwd(),
    });
  }

  public async handleMessage(raw: unknown, webview: vscode.Webview): Promise<void> {
    const result = validateIncomingMessage(raw);
    if (!result.ok) {
      this.channel.appendLine(`Rejected message: ${result.error}`);
      const errorResponse: ResponseMessage = {
        type: "response",
        requestId: (raw as { id?: string })?.id ?? "unknown",
        ok: false,
        error: result.error,
      };
      await webview.postMessage(errorResponse);
      return;
    }

    const msg = result.message;
    try {
      const data = await this.dispatch(msg, webview);
      await webview.postMessage(makeResponse(msg.id, true, data));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      this.channel.appendLine(`Message ${msg.type} (${msg.id}) failed: ${message}`);
      await webview.postMessage(makeResponse(msg.id, false, undefined, message));
    }
  }

  private async dispatch(msg: BaseMessage, webview?: vscode.Webview): Promise<unknown> {
    switch (msg.type) {
      case "app.ready":
        return { version: APP_VERSION };
      case "app.getState": {
        const settings = await this.repo.getSettings();
        return { version: APP_VERSION, settings };
      }
      case "app.getDashboardData":
        return this.repo.getDashboardData();
      case "skills.list":
        return this.repo.listSkills();
      case "skills.get": {
        const payload = msg.payload as IdPayload;
        const skill = await this.repo.getSkill(payload.id);
        if (!skill) throw new Error(`Skill not found: ${payload.id}`);
        return skill;
      }
      case "skills.create": {
        const payload = msg.payload as SkillWritePayload;
        const { skill } = await this.skills.create(
          payload.skill as Record<string, unknown> as Partial<import("../domain/skills/types").Skill>,
        );
        return skill;
      }
      case "skills.update": {
        const payload = msg.payload as SkillWritePayload;
        const rec = payload.skill as { id: string };
        const { skill } = await this.skills.update(
          rec.id,
          payload.skill as Record<string, unknown> as Partial<import("../domain/skills/types").Skill>,
        );
        return skill;
      }
      case "skills.duplicate": {
        const payload = msg.payload as IdPayload;
        return this.skills.duplicate(payload.id);
      }
      case "skills.delete": {
        const payload = msg.payload as IdPayload;
        await this.skills.remove(payload.id);
        return { ok: true };
      }
      case "skills.validate": {
        const payload = msg.payload as SkillValidatePayload;
        return this.skills.validate(
          payload.skill as Partial<import("../domain/skills/types").Skill>,
          payload.id,
        );
      }
      case "skills.history": {
        const payload = msg.payload as IdPayload;
        return this.repo.getHistory(payload.id);
      }
      case "skills.diff": {
        const payload = msg.payload as SkillDiffPayload;
        return this.skills.diff(
          payload.id,
          payload.skill as Partial<import("../domain/skills/types").Skill>,
        );
      }
      case "skills.export": {
        const payload = msg.payload as SkillExportPayload;
        const result = await this.packages.exportSkill(payload.id, payload.format);
        return serializeExport(result);
      }
      case "skills.importPreview": {
        const payload = msg.payload as SkillImportPreviewPayload;
        const preview = await this.packages
          .previewImport({
            manifest: payload.content,
            files: payload.files,
            skillMd: payload.skillMd,
          })
          .catch(async () => {
            return this.packages.previewImport(payload.content);
          });
        const key = msg.id;
        this.importPreviews.set(key, preview);
        return serializeImportPreview(preview);
      }
      case "skills.importSave": {
        const key = msg.id;
        const preview = this.importPreviews.get(key);
        if (!preview) throw new Error("Import preview not found. Please re-open the import dialog.");
        const result = await this.packages.saveImport(preview);
        this.importPreviews.delete(key);
        return {
          skill: result.skill,
          updated: result.updated,
          files: result.files,
        };
      }
      case "skills.installTargets": {
        const payload = msg.payload as SkillInstallTargetsPayload;
        return this.installation.targetsFor(payload.platform as PlatformId);
      }
      case "skills.installPlan": {
        const payload = msg.payload as SkillInstallPlanPayload;
        const pkg = await this.packages.buildPackage(payload.id);
        const skillSubdir = payload.id;
        const files: InstallFile[] = [
          { relativePath: path.join(skillSubdir, "SKILL.md"), content: pkg.skillMd, overwriteSafe: true },
        ];
        for (const f of pkg.files) {
          files.push({ relativePath: path.join(skillSubdir, f.path), content: f.content });
        }
        const plan = await this.installation.plan(
          payload.id,
          payload.platform as PlatformId,
          payload.scope as InstallScope,
          files,
        );
        return {
          target: plan.target,
          existing: plan.existing,
          supported: plan.supported,
          simulated: plan.simulated,
          files: plan.files.map((f) => f.relativePath),
        };
      }
      case "skills.install": {
        const payload = msg.payload as SkillInstallPayload;
        return this.installSkillFiles(payload.id, payload.platform, (payload.scope as InstallScope) || "workspace");
      }
      case "skills.batchInstall": {
        const payload = msg.payload as SkillBatchInstallPayload;
        const results: any[] = [];
        for (const id of payload.ids) {
          const res = await this.installSkillFiles(id, payload.platform, (payload.scope as InstallScope) || "workspace");
          results.push({ id, ...res });
        }
        return { ok: true, platform: payload.platform, count: results.length, results };
      }
      case "skills.installations": {
        const payload = msg.payload as IdPayload;
        return this.installation.artifactsFor(payload.id);
      }
      case "skills.uninstall": {
        const payload = msg.payload as SkillUninstallPayload;
        const result = await this.installation.uninstall(
          payload.id,
          payload.platform as PlatformId,
          payload.scope as InstallScope,
        );
        return {
          recordRemoved: result.recordRemoved,
          diskRemoved: result.diskRemoved,
          simulated: result.artifact.simulated,
          message: payload.removeFromDisk
            ? result.artifact.simulated
              ? "Removed AgentForge record. No files were written during the (simulated) install, so nothing was removed from disk."
              : `Removed AgentForge record and ${result.diskRemoved ? "removed installed files" : "no files needed removal"}.`
            : "Removed only the AgentForge installation record. Installed files on disk were left untouched.",
        };
      }
      case "skills.getResourceContent": {
        const payload = msg.payload as { skillId: string; resourceName: string };
        const workspaceRoot = this.repo.getWorkspaceRoot();
        const candidatePaths: string[] = [];

        if (workspaceRoot) {
          candidatePaths.push(
            path.join(workspaceRoot, "skills", payload.skillId, payload.resourceName),
            path.join(workspaceRoot, ".github", "skills", payload.skillId, payload.resourceName),
            path.join(workspaceRoot, ".claude", "skills", payload.skillId, payload.resourceName),
            path.join(workspaceRoot, payload.resourceName),
            path.join(workspaceRoot, "skills", payload.skillId, "resources", payload.resourceName)
          );
        }
        candidatePaths.push(
          path.resolve(__dirname, "..", "skills", payload.skillId, payload.resourceName),
          path.resolve(__dirname, "..", "..", "skills", payload.skillId, payload.resourceName)
        );

        for (const candidate of candidatePaths) {
          try {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
              const content = fs.readFileSync(candidate, "utf8");
              return {
                ok: true,
                content,
                path: candidate,
                resourceName: payload.resourceName,
                language: payload.resourceName.endsWith(".json")
                  ? "json"
                  : payload.resourceName.endsWith(".cjs") || payload.resourceName.endsWith(".js")
                  ? "javascript"
                  : "markdown",
              };
            }
          } catch {
            // try next candidate
          }
        }

        const skill = await this.repo.getSkill(payload.skillId);
        const res = skill?.resources?.find((r) => r.name === payload.resourceName);
        if (res) {
          return {
            ok: true,
            content: `# ${res.name}\n\n${res.description}\n`,
            path: `skills/${payload.skillId}/${payload.resourceName}`,
            resourceName: payload.resourceName,
            language: payload.resourceName.endsWith(".json") ? "json" : "markdown",
          };
        }
        throw new Error(`Resource file not found: ${payload.resourceName}`);
      }
      case "skills.saveResourceContent": {
        const payload = msg.payload as { skillId: string; resourceName: string; content: string };
        const workspaceRoot = this.repo.getWorkspaceRoot();
        const targetPath = workspaceRoot
          ? path.join(workspaceRoot, "skills", payload.skillId, payload.resourceName)
          : path.resolve(__dirname, "..", "skills", payload.skillId, payload.resourceName);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, payload.content, "utf8");
        return { ok: true, path: targetPath };
      }
      case "agents.list":
        return this.repo.listAgents();
      case "agents.get": {
        const payload = msg.payload as IdPayload;
        const agent = await this.repo.getAgent(payload.id);
        if (!agent) throw new Error(`Agent not found: ${payload.id}`);
        return agent;
      }
      case "agents.create": {
        const payload = msg.payload as { agent: Partial<import("../domain/agents/types").Agent> };
        return this.repo.createAgent(payload.agent);
      }
      case "agents.update": {
        const payload = msg.payload as { agent: Partial<import("../domain/agents/types").Agent> & { id: string } };
        return this.repo.updateAgent(payload.agent.id, payload.agent);
      }
      case "agents.duplicate": {
        const payload = msg.payload as IdPayload;
        return this.repo.duplicateAgent(payload.id);
      }
      case "agents.delete": {
        const payload = msg.payload as IdPayload;
        await this.agentInstallation.uninstallAll(payload.id);
        await this.repo.deleteAgent(payload.id);
        return { ok: true };
      }
      case "agents.validate": {
        const payload = msg.payload as { agent: Partial<import("../domain/agents/types").Agent>; id?: string };
        const allAgents = await this.repo.listAgents();
        const existingIds = new Set(allAgents.map((a) => a.id));
        const allSkills = await this.repo.listSkills();
        const knownSkills = new Map(
          allSkills.map((s) => [s.id, { id: s.id, name: s.name, compatibility: s.compatibility }])
        );
        return validateAgent(payload.agent, {
          existingIds,
          selfId: payload.id,
          knownSkills,
        });
      }
      case "agents.export": {
        const payload = msg.payload as {
          id?: string;
          agent?: Partial<import("../domain/agents/types").Agent>;
          format: import("../domain/agents/types").AgentExportFormat;
        };
        let agentToExport = payload.agent;
        if (!agentToExport && payload.id) {
          const fetched = await this.repo.getAgent(payload.id);
          if (!fetched) throw new Error(`Agent not found: ${payload.id}`);
          agentToExport = fetched;
        }
        if (!agentToExport) {
          throw new Error("No agent provided for export");
        }
        return exportAgentConfig(agentToExport, payload.format);
      }
      case "agents.compatibility": {
        const payload = msg.payload as {
          id?: string;
          agent?: Partial<import("../domain/agents/types").Agent>;
        };
        let agentToAnalyze = payload.agent;
        if (!agentToAnalyze && payload.id) {
          const fetched = await this.repo.getAgent(payload.id);
          if (!fetched) throw new Error(`Agent not found: ${payload.id}`);
          agentToAnalyze = fetched;
        }
        if (!agentToAnalyze) {
          throw new Error("No agent provided for compatibility analysis");
        }
        return analyzeAgentCompatibility(agentToAnalyze);
      }
      case "agents.exportPlatform": {
        const payload = msg.payload as {
          id?: string;
          agent?: Partial<import("../domain/agents/types").Agent>;
          platform: AgentPlatformId;
        };
        let agentToExport = payload.agent;
        if (!agentToExport && payload.id) {
          const fetched = await this.repo.getAgent(payload.id);
          if (!fetched) throw new Error(`Agent not found: ${payload.id}`);
          agentToExport = fetched;
        }
        if (!agentToExport) {
          throw new Error("No agent provided for platform export");
        }
        return exportAgentForPlatform(agentToExport, payload.platform);
      }
      case "agents.installTargets": {
        const payload = msg.payload as AgentInstallTargetsPayload;
        return this.agentInstallation.targetsFor(payload.platform as AgentPlatformId);
      }
      case "agents.installPlan": {
        const payload = msg.payload as AgentInstallPlanPayload;
        const agent = await this.repo.getAgent(payload.id);
        if (!agent) throw new Error(`Agent not found: ${payload.id}`);
        return this.agentInstallation.plan(agent, payload.platform as AgentPlatformId, payload.scope as AgentInstallScope);
      }
      case "agents.install": {
        const payload = msg.payload as AgentInstallPayload;
        return this.installAgentFiles(
          payload.id,
          payload.platform as AgentPlatformId,
          (payload.scope as AgentInstallScope) || "workspace",
          payload.installRelatedSkills !== false,
        );
      }
      case "agents.batchInstall": {
        const payload = msg.payload as AgentBatchInstallPayload;
        const results: any[] = [];
        for (const id of payload.ids) {
          const res = await this.installAgentFiles(
            id,
            payload.platform as AgentPlatformId,
            (payload.scope as AgentInstallScope) || "workspace",
            payload.installRelatedSkills !== false,
          );
          results.push({ id, ...res });
        }
        return { ok: true, platform: payload.platform, count: results.length, results };
      }
      case "agents.installations": {
        const payload = msg.payload as IdPayload;
        return this.agentInstallation.artifactsFor(payload.id);
      }
      case "agents.uninstall": {
        const payload = msg.payload as AgentUninstallPayload;
        return this.agentInstallation.uninstall(
          payload.id,
          payload.platform as AgentPlatformId,
          payload.scope as AgentInstallScope,
          payload.removeFromDisk !== false,
        );
      }
      case "workflows.list":
        return this.repo.listWorkflows();
      case "workflows.get": {
        const payload = msg.payload as IdPayload;
        const workflow = await this.repo.getWorkflow(payload.id);
        if (!workflow) throw new Error(`Workflow not found: ${payload.id}`);
        return workflow;
      }
      case "workflows.create": {
        const payload = msg.payload as { workflow: Partial<import("../domain/workflows/types").Workflow> };
        return this.repo.createWorkflow(payload.workflow);
      }
      case "workflows.update": {
        const payload = msg.payload as { workflow: Partial<import("../domain/workflows/types").Workflow> & { id: string } };
        return this.repo.updateWorkflow(payload.workflow.id, payload.workflow);
      }
      case "workflows.duplicate": {
        const payload = msg.payload as IdPayload;
        return this.repo.duplicateWorkflow(payload.id);
      }
      case "workflows.delete": {
        const payload = msg.payload as IdPayload;
        await this.repo.deleteWorkflow(payload.id);
        return { ok: true };
      }
      case "workflows.validate": {
        const payload = msg.payload as { workflow: Partial<import("../domain/workflows/types").Workflow>; id?: string };
        const [allWf, allAgents, allSkills] = await Promise.all([
          this.repo.listWorkflows(),
          this.repo.listAgents(),
          this.skills.list(),
        ]);
        const existingIds = new Set(allWf.map((w) => w.id));
        const knownAgentIds = new Set(allAgents.map((a) => a.id));
        const knownSkillIds = new Set(allSkills.map((s) => s.id));
        return validateWorkflow(payload.workflow, {
          existingIds,
          selfId: payload.id,
          knownAgentIds,
          knownSkillIds,
        });
      }
      case "workflows.exportPackage": {
        const payload = msg.payload as { id?: string; workflow?: import("../domain/workflows/types").Workflow };
        let wf = payload.workflow;
        if (!wf && payload.id) {
          wf = await this.repo.getWorkflow(payload.id);
        }
        if (!wf) throw new Error("Workflow not found for export");
        return exportWorkflowPackage(wf);
      }
      case "workflows.importPackage": {
        const payload = msg.payload as { content: string | unknown; save?: boolean };
        const parseRes = parseWorkflowPackage(payload.content);
        if (!parseRes.ok || !parseRes.workflow) {
          throw new Error(parseRes.error || "Failed to parse workflow package");
        }
        if (payload.save) {
          return this.repo.createWorkflow(parseRes.workflow);
        }
        return parseRes.workflow;
      }
      case "workflows.install": {
        const payload = msg.payload as {
          id?: string;
          workflow?: import("../domain/workflows/types").Workflow;
          markdown?: string;
        };
        let wf = payload.workflow;
        if (!wf && payload.id) {
          wf = await this.repo.getWorkflow(payload.id);
        }
        if (!wf) throw new Error("Workflow not found for installation");

        const workspaceRoot = this.repo.getWorkspaceRoot() ?? vscode.workspace?.workspaceFolders?.[0]?.uri?.fsPath;
        const mdContent = payload.markdown || `# Pipeline: ${wf.name}\n\n${wf.description || ""}\n`;
        const slug = (wf.name || "pipeline").toLowerCase().replace(/[^a-z0-9]+/g, "-");

        const primaryPath = `.agents/pipelines/${wf.id}/pipeline.md`;
        const writtenFiles: { path: string; fullPath: string }[] = [];

        if (workspaceRoot) {
          const dir = path.join(workspaceRoot, ".agents", "pipelines", wf.id);
          fs.mkdirSync(dir, { recursive: true });
          const filePath = path.join(dir, "pipeline.md");
          fs.writeFileSync(filePath, mdContent, "utf8");
          writtenFiles.push({ path: primaryPath, fullPath: filePath });

          const rootPipelineFile = path.join(workspaceRoot, `${slug}.pipeline.md`);
          fs.writeFileSync(rootPipelineFile, mdContent, "utf8");
          writtenFiles.push({ path: `${slug}.pipeline.md`, fullPath: rootPipelineFile });
        }

        await this.auditRepo.recordEvent({
          eventType: "workflow.updated",
          resourceId: wf.id,
          resourceName: wf.name,
          outcome: "success",
          details: { action: "install", primaryPath, filesCount: writtenFiles.length },
        });

        this.channel.appendLine(`[AgentForge] Installed pipeline "${wf.name}" to ${primaryPath}`);

        return {
          ok: true,
          workflowId: wf.id,
          workflowName: wf.name,
          primaryPath,
          files: writtenFiles,
          installedAt: new Date().toISOString(),
        };
      }
      case "executions.list":
        return this.repo.listExecutions();
      case "executions.get": {
        const payload = msg.payload as IdPayload;
        const exec = await this.repo.getExecution(payload.id);
        if (!exec) throw new Error(`Execution record not found: ${payload.id}`);
        return exec;
      }
      case "executions.start": {
        const payload = msg.payload as {
          workflow?: import("../domain/workflows/types").Workflow;
          id?: string;
          options?: Record<string, unknown>;
        };
        let wf = payload.workflow;
        if (!wf && payload.id) {
          wf = await this.repo.getWorkflow(payload.id);
        }
        if (!wf) throw new Error("Workflow not found for execution run");
        if (payload.options?.simulated === false || payload.options?.live === true) {
          return this.liveEngine.startExecution(wf, payload.options);
        }
        return this.simulationEngine.startExecution(wf, payload.options);
      }
      case "executions.resume": {
        const payload = msg.payload as {
          id: string;
          decision: { action: "approve" | "reject"; comment?: string; approver?: string };
        };
        const exec = await this.repo.getExecution(payload.id);
        if (exec && !exec.isSimulated) {
          return this.liveEngine.resumeExecution(payload.id, payload.decision);
        }
        return this.simulationEngine.resumeExecution(payload.id, payload.decision);
      }
      case "executions.recover": {
        const payload = msg.payload as IdPayload;
        const exec = await this.repo.getExecution(payload.id);
        if (exec && !exec.isSimulated) {
          return this.liveEngine.recoverInterruptedExecution(payload.id);
        }
        return this.simulationEngine.recoverInterruptedExecution(payload.id);
      }
      case "executions.cancel": {
        const payload = msg.payload as IdPayload;
        const exec = await this.repo.getExecution(payload.id);
        if (exec && !exec.isSimulated) {
          return this.liveEngine.cancelExecution(payload.id);
        }
        return this.simulationEngine.cancelExecution(payload.id);
      }
      case "settings.get":
        return this.repo.getSettings();
      case "settings.update": {
        const payload = msg.payload as { settings: Partial<Record<string, unknown>> };
        return this.repo.updateSettings(payload.settings as Record<string, unknown>);
      }
      case "app.resetDemoData":
        await this.repo.resetDemoData();
        return this.repo.getDashboardData();
      case "app.navigate": {
        const payload = msg.payload as { route: string };
        return { ok: true, route: payload.route };
      }
      case "app.clientError": {
        const payload = msg.payload as { error?: string; stack?: string };
        this.channel.appendLine(`[Webview Error] ${payload?.error ?? "unknown error"}`);
        if (payload?.stack) {
          this.channel.appendLine(payload.stack);
        }
        return { ok: true };
      }
      case "audit.list": {
        const payload = msg.payload as import("../domain/governance/types").AuditFilters | undefined;
        return this.auditRepo.list(payload);
      }
      case "audit.record": {
        const payload = msg.payload as any;
        return this.auditRepo.recordEvent(payload);
      }
      case "audit.clear": {
        await this.auditRepo.clear();
        return { ok: true };
      }
      case "packages.list": {
        const payload = msg.payload as { query?: string; type?: any; status?: string } | undefined;
        return this.packageManager.listPackages(payload);
      }
      case "packages.validate": {
        const payload = msg.payload as { bundle: import("../domain/packages/types").PackageBundle };
        return this.packageManager.validatePackage(payload.bundle);
      }
      case "packages.install": {
        const payload = msg.payload as {
          bundle: import("../domain/packages/types").PackageBundle;
          scope?: "workspace" | "global";
          createBackup?: boolean;
        };
        const record = await this.packageManager.installPackage(payload.bundle, payload.scope, payload.createBackup);
        await this.auditRepo.recordEvent({
          eventType: "package.imported",
          resourceId: record.id,
          resourceName: record.manifest.name,
          outcome: "success",
          details: { version: record.installedVersion, scope: record.scope },
        });
        return record;
      }
      case "packages.uninstall": {
        const payload = msg.payload as { id: string; createBackup?: boolean };
        const ok = await this.packageManager.removePackage(payload.id, payload.createBackup);
        await this.auditRepo.recordEvent({
          eventType: "package.exported",
          resourceId: payload.id,
          resourceName: payload.id,
          outcome: ok ? "success" : "failure",
          details: { action: "uninstall", backupCreated: payload.createBackup ?? true },
        });
        return { ok };
      }
      case "packages.export": {
        const payload = msg.payload as {
          manifest: Partial<import("../domain/packages/types").PackageManifest>;
          content: any;
        };
        const bundle = this.packageManager.exportPackageBundle(payload.manifest, payload.content);
        await this.auditRepo.recordEvent({
          eventType: "package.exported",
          resourceId: bundle.manifest.id,
          resourceName: bundle.manifest.name,
          outcome: "success",
          details: { version: bundle.manifest.version, type: bundle.manifest.type },
        });
        return bundle;
      }
      case "packages.backups": {
        return this.packageManager.listBackups();
      }
      case "packages.restoreBackup": {
        const payload = msg.payload as { backupId: string };
        const restored = this.packageManager.restoreBackup(payload.backupId);
        return { ok: !!restored, restored };
      }
      case "integrations.list": {
        return this.integrations.listIntegrations();
      }
      case "integrations.configure": {
        const payload = msg.payload as { id: import("../domain/integrations/types").PlatformIntegrationId; patch: any };
        if (payload.patch?.secret) {
          await this.integrations.setCredential(payload.id, payload.patch.secret);
          delete payload.patch.secret;
        }
        const updated = this.integrations.configureIntegration(payload.id, payload.patch);
        await this.auditRepo.recordEvent({
          eventType: "settings.changed",
          resourceId: `integration-${payload.id}`,
          resourceName: updated.name,
          outcome: "success",
          details: { isMock: updated.isMock, status: updated.connectionStatus },
        });
        return updated;
      }
      case "integrations.validate": {
        const payload = msg.payload as { id: import("../domain/integrations/types").PlatformIntegrationId };
        return this.integrations.validateConnection(payload.id);
      }
      case "integrations.disconnect": {
        const payload = msg.payload as { id: import("../domain/integrations/types").PlatformIntegrationId };
        const updated = this.integrations.disconnectIntegration(payload.id);
        await this.auditRepo.recordEvent({
          eventType: "settings.changed",
          resourceId: `integration-${payload.id}`,
          resourceName: updated.name,
          outcome: "success",
          details: { action: "disconnect" },
        });
        return updated;
      }
      case "settings.exportAll": {
        const settings = await this.repo.getSettings();
        const skills = await this.skills.list();
        const agents = await this.repo.listAgents();
        const workflows = await this.repo.listWorkflows();
        const audits = await this.auditRepo.list();
        const packages = this.packageManager.listPackages();
        return {
          schemaVersion: settings.schemaVersion,
          exportedAt: new Date().toISOString(),
          settings,
          skills,
          agents,
          workflows,
          packages,
          audits,
        };
      }
      case "settings.importAll": {
        const payload = msg.payload as { data: any };
        if (!payload?.data || typeof payload.data !== "object") {
          throw new Error("Invalid import data payload.");
        }
        if (payload.data.settings) {
          await this.repo.updateSettings(payload.data.settings);
        }
        await this.auditRepo.recordEvent({
          eventType: "settings.changed",
          resourceId: "workspace-import",
          resourceName: "Full Workspace Data Import",
          outcome: "success",
          details: { importedAt: new Date().toISOString() },
        });
        return { ok: true };
      }
      case "persona.list": {
        return getAllPersonas();
      }
      case "persona.listWorkspaces": {
        const folders = vscode.workspace.workspaceFolders || [];
        return folders.map((f) => ({
          name: f.name,
          path: f.uri.fsPath,
        }));
      }
      case "persona.crawl": {
        const payload = (msg.payload || {}) as CrawlOptions;
        const workspacePath =
          payload.workspacePath ||
          this.repo.getWorkspaceRoot() ||
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!workspacePath) {
          throw new Error("No active workspace or folder selected for repository crawl.");
        }

        this.activeCrawlAbortController = new AbortController();
        const crawler = new RepositoryCrawler(workspacePath, payload.exclusions);

        const onProgress = (event: import("../domain/persona/types").CrawlProgressEvent) => {
          if (webview) {
            webview.postMessage({
              type: "persona.progress",
              data: event,
            });
          }
        };

        const result = await crawler.crawl(
          payload,
          onProgress,
          this.activeCrawlAbortController.signal
        );

        this.channel.appendLine(
          `[PersonaEngine] Crawl complete for "${result.repositoryName}": ${result.findings.length} findings, ${result.totalFilesScanned} files`
        );
        return result;
      }
      case "persona.cancelCrawl": {
        if (this.activeCrawlAbortController) {
          this.activeCrawlAbortController.abort();
          this.activeCrawlAbortController = undefined;
          this.channel.appendLine("[PersonaEngine] Active crawl was cancelled by user.");
          return { ok: true, cancelled: true };
        }
        return { ok: true, cancelled: false };
      }
      case "persona.compile": {
        const payload = msg.payload as SkillGenerationRequest;
        if (!payload || !payload.mode) {
          throw new Error("Invalid skill generation request payload.");
        }
        const result = this.skillCompiler.compile(payload);
        return result;
      }
      case "persona.evaluate": {
        const payload = msg.payload as {
          ir: import("../domain/persona/types").SkillIntermediateRepresentation;
          crawlResult?: import("../domain/persona/types").CrawlResult;
        };
        if (!payload?.ir) {
          throw new Error("Invalid evaluation payload: IR required.");
        }
        return this.qualityEvaluator.evaluate(payload.ir, payload.crawlResult);
      }
      case "persona.reCrawl": {
        const payload = (msg.payload || {}) as {
          workspacePath?: string;
          previousFingerprint?: import("../domain/persona/types").RepositoryFingerprint;
          personas?: string[];
        };
        const workspacePath =
          payload.workspacePath ||
          this.repo.getWorkspaceRoot() ||
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!workspacePath) {
          throw new Error("No active workspace selected for re-crawl.");
        }

        const store = new IncrementalCrawlStore(workspacePath);
        const crawler = new RepositoryCrawler(workspacePath);
        const crawlRes = await crawler.crawl({ workspacePath, selectedPersonas: payload.personas });
        const eligible = crawlRes.findings.map((f) => f.filePath);
        const delta = store.detectDelta(workspacePath, eligible, payload.previousFingerprint);

        return {
          crawlResult: crawlRes,
          delta,
        };
      }
      case "persona.save": {
        const payload = msg.payload as {
          ir: import("../domain/persona/types").SkillIntermediateRepresentation;
          installTargets?: ("copilot" | "claude" | "openai" | "neutral")[];
          writeFilesToWorkspace?: boolean;
        };
        if (!payload?.ir) {
          throw new Error("Invalid save payload: IR required.");
        }

        const ir = payload.ir;
        const workspaceRoot =
          this.repo.getWorkspaceRoot() || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        // Write files to workspace disk if requested
        if (workspaceRoot && payload.writeFilesToWorkspace !== false) {
          const baseSkillDir = path.join(workspaceRoot, "skills", ir.metadata.id);
          fs.mkdirSync(baseSkillDir, { recursive: true });

          for (const file of ir.files) {
            const targetFile = path.join(baseSkillDir, file.path);
            fs.mkdirSync(path.dirname(targetFile), { recursive: true });
            fs.writeFileSync(targetFile, file.content, "utf8");
          }

          // If install targets specify copilot, install to .github/skills/<id>
          if (payload.installTargets?.includes("copilot")) {
            const copilotDir = path.join(workspaceRoot, ".github", "skills", ir.metadata.id);
            for (const file of ir.files) {
              const targetFile = path.join(copilotDir, file.path);
              fs.mkdirSync(path.dirname(targetFile), { recursive: true });
              fs.writeFileSync(targetFile, file.content, "utf8");
            }
          }

          // If install targets specify claude, install to .claude/skills/<id>
          if (payload.installTargets?.includes("claude")) {
            const claudeDir = path.join(workspaceRoot, ".claude", "skills", ir.metadata.id);
            for (const file of ir.files) {
              const targetFile = path.join(claudeDir, file.path);
              fs.mkdirSync(path.dirname(targetFile), { recursive: true });
              fs.writeFileSync(targetFile, file.content, "utf8");
            }
          }
        }

        // Store skill record in AgentForge repository
        const skillMd = ir.files.find((f) => f.path === "SKILL.md")?.content || "";
        const resources: import("../domain/skills/types").SkillResource[] = ir.files
          .filter((f) => f.path !== "SKILL.md")
          .map((f) => ({
            id: `res-${path.basename(f.path, path.extname(f.path))}`,
            name: f.path,
            kind: f.path.startsWith("workflows/") ? "script" : "reference",
            description: f.purpose,
          }));

        const existingSkill = await this.repo.getSkill(ir.metadata.id);
        const skillRecordData: Partial<import("../domain/skills/types").Skill> = {
          id: ir.metadata.id,
          name: ir.metadata.name,
          description: ir.metadata.description,
          version: ir.metadata.version,
          author: ir.metadata.author,
          category: ir.metadata.category,
          tags: ir.metadata.tags,
          instructions: skillMd,
          frontmatter: "",
          resources,
          compatibility: ir.metadata.targetPlatforms,
          otherTargets: [],
          requiredTools: [],
          permissions: ["read", "write"],
          changelog: `Initial persona-engineered generation (${ir.metadata.generationMode})`,
          requirements: "AI agent runtime conforming to SKILL.md progressive disclosure",
          status: "Ready",
          installationState: payload.installTargets && payload.installTargets.length > 0 ? "installed" : "not-installed",
        };

        if (existingSkill) {
          await this.skills.update(ir.metadata.id, skillRecordData);
        } else {
          await this.skills.create(skillRecordData);
        }

        // Save version snapshot
        if (workspaceRoot) {
          const store = new IncrementalCrawlStore(workspaceRoot);
          store.saveSnapshot({
            version: ir.metadata.version,
            timestamp: new Date().toISOString(),
            personas: ir.metadata.personas,
            fingerprintHash: ir.metadata.fingerprintHash || "unknown",
            ir,
            summaryNote: `Generated via Persona Skill Studio (${ir.metadata.generationMode})`,
          });
        }

        await this.auditRepo.recordEvent({
          eventType: existingSkill ? "skill.edited" : "skill.created",
          resourceId: ir.metadata.id,
          resourceName: ir.metadata.name,
          outcome: "success",
          details: {
            action: "persona.save",
            generationMode: ir.metadata.generationMode,
            personas: ir.metadata.personas,
            filesCount: ir.files.length,
          },
        });

        return {
          ok: true,
          skillId: ir.metadata.id,
          filesWritten: ir.files.length,
        };
      }
      case "persona.listVersions": {
        const workspaceRoot =
          this.repo.getWorkspaceRoot() || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) return [];
        const store = new IncrementalCrawlStore(workspaceRoot);
        return store.listSnapshots();
      }
      case "persona.rollbackVersion": {
        const payload = msg.payload as { version: string };
        const workspaceRoot =
          this.repo.getWorkspaceRoot() || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) throw new Error("No active workspace for rollback.");
        const store = new IncrementalCrawlStore(workspaceRoot);
        const snapshot = store.getSnapshot(payload.version);
        if (!snapshot) throw new Error(`Snapshot version ${payload.version} not found.`);
        return snapshot;
      }
      default:
        return unsupportedResponse(msg.id, String(msg.type));
    }
  }

  public getHtml(webview: vscode.Webview): string {
    const dist = vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview");
    const scriptPath = vscode.Uri.joinPath(dist, "assets", "index.js");
    const stylePath = vscode.Uri.joinPath(dist, "assets", "index.css");

    if (!this.assetExists(scriptPath) || !this.assetExists(stylePath)) {
      this.channel.appendLine(
        "WebView assets missing. Run 'npm run build' before launching the extension host.",
      );
      return this.errorHtml(
        "AgentForge assets are missing. Run <code>npm run build</code> in the project root, then reopen this view.",
      );
    }

    const scriptUri = webview.asWebviewUri(scriptPath);
    const styleUri = webview.asWebviewUri(stylePath);
    const nonce = getNonce();

    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data: https:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}' ${webview.cspSource}`,
      `font-src ${webview.cspSource} data:`,
      `connect-src ${webview.cspSource}`,
    ].join("; ");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AgentForge</title>
<link rel="stylesheet" href="${styleUri}" />
<script nonce="${nonce}">
  window.addEventListener('error', function (e) {
    var fb = document.getElementById('error-fallback');
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = '<div style="font-weight:600;margin-bottom:6px;">AgentForge Runtime Error:</div>' +
        '<div>' + (e.message || 'Script error') + (e.lineno ? ' (Line: ' + e.lineno + ')' : '') + '</div>' +
        (e.error && e.error.stack ? '<pre style="margin-top:8px;font-size:11px;white-space:pre-wrap;color:#DC2626;">' + e.error.stack + '</pre>' : '');
    }
  });
</script>
</head>
<body>
<div id="root"></div>
<div id="error-fallback" style="display:none;padding:16px;font-family:sans-serif;color:#B91C1C;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:6px;margin:16px;">
  AgentForge failed to load. Check the AgentForge output channel for details.
</div>
<script type="module" nonce="${nonce}" src="${scriptUri}"></script>
<script nonce="${nonce}">
  (function () {
    var root = document.getElementById('root');
    var fb = document.getElementById('error-fallback');
    if (!root) return;

    // As soon as React mounts elements into #root, ensure error fallback is hidden
    var observer = new MutationObserver(function () {
      if (root.children.length > 0 && fb) {
        fb.style.display = 'none';
      }
    });
    observer.observe(root, { childList: true });

    // Only if nothing rendered after 3.5 seconds, display fallback
    setTimeout(function () {
      if (root.children.length === 0 && fb && fb.style.display !== 'block') {
        fb.style.display = 'block';
      }
    }, 3500);
  })();
</script>
</body>
</html>`;
  }

  private assetExists(uri: vscode.Uri): boolean {
    try {
      statSync(uri.fsPath);
      return true;
    } catch {
      return false;
    }
  }

  public async installSkillFiles(skillId: string, platform: string, scope: InstallScope = "workspace") {
    const workspaceRoot = this.repo.getWorkspaceRoot() ?? vscode.workspace?.workspaceFolders?.[0]?.uri?.fsPath;
    const skill = await this.repo.getSkill(skillId);

    const files: InstallFile[] = [];
    const skillSubdir = skillId;

    if (workspaceRoot) {
      const sourceDir = path.join(workspaceRoot, "skills", skillId);
      if (fs.existsSync(sourceDir) && fs.statSync(sourceDir).isDirectory()) {
        const readDirRecursive = (dir: string, baseRel = ""): { rel: string; full: string }[] => {
          const res: { rel: string; full: string }[] = [];
          const list = fs.readdirSync(dir);
          for (const item of list) {
            const itemPath = path.join(dir, item);
            const rel = baseRel ? path.join(baseRel, item) : item;
            if (fs.statSync(itemPath).isDirectory()) {
              res.push(...readDirRecursive(itemPath, rel));
            } else {
              res.push({ rel, full: itemPath });
            }
          }
          return res;
        };

        const allEntries = readDirRecursive(sourceDir);
        for (const entry of allEntries) {
          try {
            const content = fs.readFileSync(entry.full, "utf8");
            files.push({
              relativePath: path.join(skillSubdir, entry.rel),
              content,
              overwriteSafe: true,
            });
          } catch {
            // ignore unreadable/binary
          }
        }
      }
    }

    // If no existing disk files found in skills/<skillId>, fallback to package builder
    if (files.length === 0 && skill) {
      const pkg = await this.packages.buildPackage(skillId);
      files.push({
        relativePath: path.join(skillSubdir, "SKILL.md"),
        content: pkg.skillMd,
        overwriteSafe: true,
      });
      for (const f of pkg.files) {
        files.push({ relativePath: path.join(skillSubdir, f.path), content: f.content });
      }
    }

    const plan = await this.installation.plan(
      skillId,
      platform as PlatformId,
      scope,
      files,
    );
    const artifact = await this.installation.install(skillId, plan);

    if (skill) {
      try {
        await this.repo.updateSkill(skillId, { installationState: "installed" });
      } catch {
        // ignore update errors
      }
    }

    return artifact;
  }

  public async installAgentFiles(
    agentId: string,
    platform: AgentPlatformId,
    scope: AgentInstallScope = "workspace",
    installRelatedSkills = true,
  ) {
    const agent = await this.repo.getAgent(agentId);
    if (!agent) throw new Error(`Agent not found: ${agentId}`);

    const plan = await this.agentInstallation.plan(agent, platform, scope);
    const artifact = await this.agentInstallation.install(agent, plan);

    // If agent is installed, also copy its assigned skills to the platform's skills folder!
    const installedSkills: string[] = [];
    if (installRelatedSkills && agent.assignedSkillIds && agent.assignedSkillIds.length > 0) {
      for (const skillId of agent.assignedSkillIds) {
        try {
          await this.installSkillFiles(skillId, platform as string, scope as any);
          installedSkills.push(skillId);
        } catch (e) {
          this.channel.appendLine(`[WARN] Failed to auto-install assigned skill "${skillId}": ${e}`);
        }
      }
    }

    return {
      ...artifact,
      installedSkills,
    };
  }

  private errorHtml(message: string): string {
    return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="font-family: sans-serif; padding: 16px; color: #18233B;">
<p>${message}</p>
</body>
</html>`;
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function serializeExport(result: ExportResult): unknown {
  return {
    format: result.format,
    skillId: result.skillId,
    skillName: result.skillName,
    version: result.version,
    fileName: result.fileName,
    primaryContent: result.primaryContent,
    files: result.files,
    manifest: result.manifest,
    validation: result.validation,
  };
}

function serializeImportPreview(preview: ImportPreview): unknown {
  return {
    valid: preview.valid,
    skill: preview.skill,
    files: preview.files,
    duplicate: preview.duplicate,
    validation: preview.validation,
    warnings: preview.warnings,
    errors: preview.errors,
  };
}
