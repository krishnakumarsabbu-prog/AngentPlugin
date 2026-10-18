import * as vscode from "vscode";
import { LocalRepository } from "../storage/LocalRepository";

export function registerCommands(
  context: vscode.ExtensionContext,
  repo: LocalRepository,
): void {
  const focusView = () => {
    vscode.commands.executeCommand("agentforge.view.focus");
  };

  const open = vscode.commands.registerCommand("agentforge.open", focusView);

  const openFromSidebar = vscode.commands.registerCommand("agentforge.openFromSidebar", focusView);

  const reset = vscode.commands.registerCommand("agentforge.resetDemoData", async () => {
    try {
      await repo.resetDemoData();
      vscode.window.showInformationMessage("AgentForge demo data has been reset.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`AgentForge could not reset demo data: ${message}`);
    }
  });

  // Proves the extension activated and the host is responsive.
  const status = vscode.commands.registerCommand("agentforge.showStatus", async () => {
    try {
      const [skills, agents, workflows, executions] = await Promise.all([
        repo.listSkills(),
        repo.listAgents(),
        repo.listWorkflows(),
        repo.listExecutions(),
      ]);
      const detail = `${skills.length} skills, ${agents.length} agents, ${workflows.length} pipelines, ${executions.length} runs stored locally.`;
      const action = await vscode.window.showInformationMessage(
        `AgentForge is active. ${detail}`,
        "Open Workbench",
      );
      if (action === "Open Workbench") {
        focusView();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`AgentForge status check failed: ${message}`);
    }
  });

  context.subscriptions.push(open, openFromSidebar, reset, status);
}
