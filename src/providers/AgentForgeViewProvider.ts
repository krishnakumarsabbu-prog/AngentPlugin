import * as vscode from "vscode";
import { LocalRepository } from "../storage/LocalRepository";
import { validateIncomingMessage, makeResponse, unsupportedResponse } from "../bridge/messageValidator";
import { BaseMessage, ResponseMessage } from "../bridge/messages";

const APP_VERSION = "0.1.0";

export class AgentForgeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "agentforge.view";

  constructor(private readonly context: vscode.ExtensionContext, private readonly repo: LocalRepository) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview")],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    const disposable = webviewView.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message, webviewView),
      undefined,
      this.context.subscriptions,
    );

    webviewView.onDidDispose(() => disposable.dispose());
  }

  private async handleMessage(raw: unknown, view: vscode.WebviewView): Promise<void> {
    const result = validateIncomingMessage(raw);
    if (!result.ok) {
      const errorResponse: ResponseMessage = {
        type: "response",
        requestId: (raw as { id?: string })?.id ?? "unknown",
        ok: false,
        error: result.error,
      };
      view.webview.postMessage(errorResponse);
      return;
    }

    const msg = result.message;
    try {
      const data = await this.dispatch(msg);
      view.webview.postMessage(makeResponse(msg.id, true, data));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      view.webview.postMessage(makeResponse(msg.id, false, undefined, message));
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
      case "app.navigate":
        return { ok: true };
      default:
        return unsupportedResponse(msg.id, String(msg.type));
    }
  }

  private getHtml(webview: vscode.Webview): string {
    const dist = vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview");
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(dist, "assets", "index.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(dist, "assets", "index.css"));
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
<script nonce="${nonce}" src="${scriptUri}"></script>
<div id="error-fallback" style="display:none;padding:16px;font-family:sans-serif;color:#B91C1C;">
  AgentForge failed to load. Reopen the panel or run "AgentForge: Reset Demo Data".
</div>
<script nonce="${nonce}">
  window.addEventListener('DOMContentLoaded', function () {
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
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
