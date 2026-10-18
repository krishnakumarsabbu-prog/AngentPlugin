import * as vscode from "vscode";
import { AgentForgeViewProvider } from "./providers/AgentForgeViewProvider";
import { LocalRepository } from "./storage/LocalRepository";
import { registerOpenCommand } from "./commands/openAgentForge";

export function activate(context: vscode.ExtensionContext): void {
  const repo = new LocalRepository(context);
  const provider = new AgentForgeViewProvider(context, repo);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AgentForgeViewProvider.viewType, provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  registerOpenCommand(context, repo, provider);
}

export function deactivate(): void {
  // Nothing to clean up beyond subscriptions handled by VS Code.
}
