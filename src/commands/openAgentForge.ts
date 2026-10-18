import * as vscode from "vscode";
import { AgentForgeViewProvider } from "../providers/AgentForgeViewProvider";
import { LocalRepository } from "../storage/LocalRepository";

export function registerOpenCommand(
  context: vscode.ExtensionContext,
  repo: LocalRepository,
  _provider: AgentForgeViewProvider,
): void {
  const open = vscode.commands.registerCommand("agentforge.open", () => {
    vscode.commands.executeCommand("agentforge.view.focus");
  });

  const openFromSidebar = vscode.commands.registerCommand("agentforge.openFromSidebar", () => {
    vscode.commands.executeCommand("agentforge.view.focus");
  });

  const reset = vscode.commands.registerCommand("agentforge.resetDemoData", async () => {
    await repo.resetDemoData();
    vscode.window.showInformationMessage("AgentForge demo data has been reset.");
  });

  context.subscriptions.push(open, openFromSidebar, reset);
}
