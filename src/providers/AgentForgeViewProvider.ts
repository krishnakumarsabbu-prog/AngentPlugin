import * as vscode from "vscode";
import { AgentForgeBridge } from "../bridge/AgentForgeBridge";
import { AgentForgePanel } from "../panels/AgentForgePanel";

export class AgentForgeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "agentforge.view";

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly bridge: AgentForgeBridge,
    private readonly channel: vscode.OutputChannel,
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    // Automatically open/focus the full editor panel when the sidebar view is resolved
    AgentForgePanel.createOrShow(this.context, this.bridge);

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")],
    };

    webviewView.webview.html = this.getSidebarHtml(webviewView.webview);

    const messageDisposable = webviewView.webview.onDidReceiveMessage(
      (message: { type?: string }) => {
        if (message?.type === "workbench.open") {
          AgentForgePanel.createOrShow(this.context, this.bridge);
        } else if (message?.type === "workbench.resetDemo") {
          vscode.commands.executeCommand("agentforge.resetDemoData");
        } else if (message?.type === "workbench.showStatus") {
          vscode.commands.executeCommand("agentforge.showStatus");
        }
      },
      undefined,
      this.context.subscriptions,
    );

    const visibilityDisposable = webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        AgentForgePanel.createOrShow(this.context, this.bridge);
      }
    });

    const disposeDisposable = webviewView.onDidDispose(() => {
      messageDisposable.dispose();
      visibilityDisposable.dispose();
      disposeDisposable.dispose();
    });
  }

  private getSidebarHtml(webview: vscode.Webview): string {
    const iconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "agentforge.svg"),
    );

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AgentForge Launcher</title>
<style>
  :root {
    font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background-color: var(--vscode-sideBar-background);
  }
  body {
    padding: 16px 12px;
    margin: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .header img {
    width: 28px;
    height: 28px;
  }
  .header-text h1 {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    color: var(--vscode-sideBarTitle-foreground, var(--vscode-foreground));
  }
  .header-text p {
    font-size: 11px;
    margin: 2px 0 0 0;
    opacity: 0.75;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 500;
    border-radius: 4px;
    background: var(--vscode-badge-background, #10B98120);
    color: var(--vscode-badge-foreground, #059669);
    width: fit-content;
  }
  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: #10B981;
    display: inline-block;
  }
  .info-box {
    font-size: 12px;
    line-height: 1.45;
    opacity: 0.85;
    padding: 10px;
    border-radius: 6px;
    background: var(--vscode-editor-inactiveSelectionBackground, rgba(127, 127, 127, 0.08));
    border: 1px solid var(--vscode-widget-border, rgba(127, 127, 127, 0.2));
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  button {
    cursor: pointer;
    border: none;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: opacity 0.15s ease;
  }
  button:hover {
    opacity: 0.9;
  }
  .btn-primary {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  .btn-secondary {
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
</style>
</head>
<body>
  <div class="header">
    <img src="${iconUri}" alt="AgentForge" />
    <div class="header-text">
      <h1>AgentForge</h1>
      <p>AI Workbench</p>
    </div>
  </div>

  <div class="status-badge">
    <span class="status-dot"></span>
    <span>Active in Editor Panel</span>
  </div>

  <div class="info-box">
    The full AgentForge dashboard, Skill Studio, and Harness Pipeline are open in the central editor tab.
  </div>

  <div class="actions">
    <button class="btn-primary" id="btn-open">
      Open / Focus Workbench
    </button>
    <button class="btn-secondary" id="btn-status">
      Show Status
    </button>
    <button class="btn-secondary" id="btn-reset">
      Reset Demo Data
    </button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    document.getElementById('btn-open').addEventListener('click', () => {
      vscode.postMessage({ type: 'workbench.open' });
    });
    document.getElementById('btn-status').addEventListener('click', () => {
      vscode.postMessage({ type: 'workbench.showStatus' });
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
      vscode.postMessage({ type: 'workbench.resetDemo' });
    });
  </script>
</body>
</html>`;
  }
}
