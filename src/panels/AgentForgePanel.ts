import * as vscode from "vscode";
import { AgentForgeBridge } from "../bridge/AgentForgeBridge";

export class AgentForgePanel {
  public static currentPanel: AgentForgePanel | undefined;
  public static readonly viewType = "agentforge.workbench";

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
    private readonly bridge: AgentForgeBridge,
  ) {
    this.panel = panel;
    this.panel.iconPath = vscode.Uri.joinPath(context.extensionUri, "media", "agentforge.svg");

    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist", "webview")],
    };

    this.panel.webview.html = this.bridge.getHtml(this.panel.webview);

    this.panel.webview.onDidReceiveMessage(
      (message) => this.bridge.handleMessage(message, this.panel.webview),
      null,
      this.disposables,
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public static createOrShow(
    context: vscode.ExtensionContext,
    bridge: AgentForgeBridge,
  ): AgentForgePanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    if (AgentForgePanel.currentPanel) {
      AgentForgePanel.currentPanel.panel.reveal(column ?? vscode.ViewColumn.One);
      return AgentForgePanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      AgentForgePanel.viewType,
      "AgentForge Workbench",
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist", "webview")],
      },
    );

    AgentForgePanel.currentPanel = new AgentForgePanel(panel, context, bridge);
    return AgentForgePanel.currentPanel;
  }

  public reveal(column?: vscode.ViewColumn): void {
    this.panel.reveal(column ?? vscode.ViewColumn.One);
  }

  public dispose(): void {
    AgentForgePanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }
}
