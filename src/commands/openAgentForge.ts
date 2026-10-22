import * as vscode from "vscode";
import * as path from "path";
import { LocalRepository } from "../storage/LocalRepository";
import { AgentForgeBridge } from "../bridge/AgentForgeBridge";
import { AgentForgePanel } from "../panels/AgentForgePanel";

export function registerCommands(
  context: vscode.ExtensionContext,
  repo: LocalRepository,
  bridge: AgentForgeBridge,
): void {
  const openWorkbench = () => {
    AgentForgePanel.createOrShow(context, bridge);
  };

  const open = vscode.commands.registerCommand("agentforge.open", openWorkbench);

  const openFromSidebar = vscode.commands.registerCommand("agentforge.openFromSidebar", openWorkbench);

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
        openWorkbench();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`AgentForge status check failed: ${message}`);
    }
  });

  // Runs an installed or chosen pipeline.md specification
  const runPipelineMarkdown = vscode.commands.registerCommand(
    "agentforge.runPipelineMarkdown",
    async (uri?: vscode.Uri) => {
      try {
        let filePath = uri?.fsPath;
        if (!filePath && vscode.window.activeTextEditor) {
          filePath = vscode.window.activeTextEditor.document.uri.fsPath;
        }

        openWorkbench();
        vscode.window.showInformationMessage(
          `AgentForge: Running pipeline from ${filePath ? path.basename(filePath) : "markdown specification"}`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        vscode.window.showErrorMessage(`Failed to run pipeline markdown: ${message}`);
      }
    }
  );

  context.subscriptions.push(open, openFromSidebar, reset, status, runPipelineMarkdown);
}
