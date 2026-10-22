import * as vscode from "vscode";
import { AgentForgeViewProvider } from "./providers/AgentForgeViewProvider";
import { LocalRepository } from "./storage/LocalRepository";
import { AgentForgeBridge } from "./bridge/AgentForgeBridge";
import { registerCommands } from "./commands/openAgentForge";

export function activate(context: vscode.ExtensionContext): void {
  const channel = vscode.window.createOutputChannel("AgentForge");
  context.subscriptions.push(channel);

  try {
    const repo = new LocalRepository(context);
    const bridge = new AgentForgeBridge(context, repo, channel);
    const provider = new AgentForgeViewProvider(context, bridge, channel);

    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(AgentForgeViewProvider.viewType, provider, {
        webviewOptions: { retainContextWhenHidden: true },
      }),
    );

    registerCommands(context, repo, bridge);

    channel.appendLine(`AgentForge activated (version ${context.extension.packageJSON?.version ?? "unknown"})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    channel.appendLine(`Activation failed: ${message}`);
    vscode.window.showErrorMessage(`AgentForge failed to activate: ${message}`);
  }
}

export function deactivate(): void {
  // Disposables registered on context.subscriptions are released by VS Code.
}
