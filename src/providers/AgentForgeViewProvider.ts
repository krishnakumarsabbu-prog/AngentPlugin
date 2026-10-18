import * as vscode from "vscode";
import { statSync } from "fs";
import * as path from "path";
import { LocalRepository } from "../storage/LocalRepository";
import { validateIncomingMessage, makeResponse, unsupportedResponse } from "../bridge/messageValidator";
import { BaseMessage, ResponseMessage, IdPayload, SkillWritePayload, SkillValidatePayload, SkillDiffPayload, SkillExportPayload, SkillImportPreviewPayload, SkillInstallTargetsPayload, SkillInstallPlanPayload, SkillInstallPayload, SkillUninstallPayload } from "../bridge/messages";
import { SkillService } from "../skills/SkillService";
import { SkillPackageService, ImportPreview, ExportResult } from "../skills/SkillPackageService";
import { InstallationService, createInstallRegistry, InMemoryArtifactsStore, InstallRegistry, InstalledArtifactsStore } from "../skills/install/installationService";
import { InstallFile, InstallScope, PlatformId } from "../skills/install/types";

const APP_VERSION = "0.1.0";

export class AgentForgeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "agentforge.view";

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly repo: LocalRepository,
    private readonly channel: vscode.OutputChannel,
  ) {
    this.skills = new SkillService({ store: repo, history: repo.getHistoryStore() });
  }

  private readonly skills: SkillService;
  private readonly packages = new SkillPackageService(repo);
  private readonly artifactsStore: InstalledArtifactsStore = new InMemoryArtifactsStore();
  private readonly installRegistry: InstallRegistry = createInstallRegistry(
    context.globalStorageUri?.fsPath ?? null,
  );
  private readonly installation = new InstallationService(this.installRegistry, this.artifactsStore);
  private readonly importPreviews = new Map<string, ImportPreview>();

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview")],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    const messageDisposable = webviewView.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message, webviewView),
      undefined,
      this.context.subscriptions,
    );

    const disposeDisposable = webviewView.onDidDispose(() => {
      messageDisposable.dispose();
      disposeDisposable.dispose();
    });
  }

  private async handleMessage(raw: unknown, view: vscode.WebviewView): Promise<void> {
    const result = validateIncomingMessage(raw);
    if (!result.ok) {
      this.channel.appendLine(`Rejected message: ${result.error}`);
      const errorResponse: ResponseMessage = {
        type: "response",
        requestId: (raw as { id?: string })?.id ?? "unknown",
        ok: false,
        error: result.error,
      };
      await view.webview.postMessage(errorResponse);
      return;
    }

    const msg = result.message;
    try {
      const data = await this.dispatch(msg);
      await view.webview.postMessage(makeResponse(msg.id, true, data));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      this.channel.appendLine(`Message ${msg.type} (${msg.id}) failed: ${message}`);
      await view.webview.postMessage(makeResponse(msg.id, false, undefined, message));
    }
  }

  private async dispatch(msg: BaseMessage): Promise<unknown> {
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
        const { skill } = await this.skills.create(payload.skill as Record<string, unknown> as Partial<import("../domain/skills/types").Skill>);
        return skill;
      }
      case "skills.update": {
        const payload = msg.payload as SkillWritePayload;
        const rec = payload.skill as { id: string };
        const { skill } = await this.skills.update(rec.id, payload.skill as Record<string, unknown> as Partial<import("../domain/skills/types").Skill>);
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
        return this.skills.validate(payload.skill as Partial<import("../domain/skills/types").Skill>, payload.id);
      }
      case "skills.history": {
        const payload = msg.payload as IdPayload;
        return this.repo.getHistory(payload.id);
      }
      case "skills.diff": {
        const payload = msg.payload as SkillDiffPayload;
        return this.skills.diff(payload.id, payload.skill as Partial<import("../domain/skills/types").Skill>);
      }
      case "skills.export": {
        const payload = msg.payload as SkillExportPayload;
        const result = await this.packages.exportSkill(payload.id, payload.format);
        return serializeExport(result);
      }
      case "skills.importPreview": {
        const payload = msg.payload as SkillImportPreviewPayload;
        const preview = await this.packages.previewImport({
          manifest: payload.content,
          files: payload.files,
          skillMd: payload.skillMd,
        }).catch(async () => {
          // Fall back to treating content as a raw SKILL.md document.
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
        const files: InstallFile[] = [{ relativePath: "SKILL.md", content: pkg.skillMd, overwriteSafe: true }];
        for (const f of pkg.files) {
          files.push({ relativePath: f.path, content: f.content });
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
        const pkg = await this.packages.buildPackage(payload.id);
        const files: InstallFile[] = [{ relativePath: "SKILL.md", content: pkg.skillMd, overwriteSafe: true }];
        for (const f of pkg.files) {
          files.push({ relativePath: f.path, content: f.content });
        }
        const plan = await this.installation.plan(
          payload.id,
          payload.platform as PlatformId,
          payload.scope as InstallScope,
          files,
        );
        const artifact = await this.installation.install(payload.id, plan);
        return artifact;
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
      case "agents.list":
        return this.repo.listAgents();
      case "workflows.list":
        return this.repo.listWorkflows();
      case "executions.list":
        return this.repo.listExecutions();
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
      default:
        return unsupportedResponse(msg.id, String(msg.type));
    }
  }

  private getHtml(webview: vscode.Webview): string {
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
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `font-src ${webview.cspSource}`,
    ].join("; ");

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AgentForge</title>
<link rel="stylesheet" href="${styleUri}" />
</head>
<body>
<div id="root"></div>
<div id="error-fallback" style="display:none;padding:16px;font-family:sans-serif;color:#B91C1C;">
  AgentForge failed to load. Check the AgentForge output channel for details.
</div>
<script nonce="${nonce}" src="${scriptUri}"></script>
<script nonce="${nonce}">
  window.addEventListener('load', function () {
    var root = document.getElementById('root');
    if (!root || root.children.length === 0) {
      var fb = document.getElementById('error-fallback');
      if (fb) { fb.style.display = 'block'; }
    }
  });
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
