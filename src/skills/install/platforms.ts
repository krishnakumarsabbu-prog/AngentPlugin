import { promises as fs, existsSync as fsExistsSync } from "fs";
import * as path from "path";
import { SimulatedInstallAdapter, FileInstallAdapter } from "./adapters";
import { InstallScope, InstallTarget, PlatformId } from "./types";

/**
 * GitHub Copilot. Real installation target is not yet supported by AgentForge;
 * this adapter simulates the install so users can preview the operation.
 */
export class CopilotInstallAdapter extends SimulatedInstallAdapter {
  readonly platform = "copilot" satisfies PlatformId;
  readonly displayName = "GitHub Copilot";

  resolveTarget(scope: InstallScope): InstallTarget | undefined {
    if (scope === "user") {
      return {
        platform: "copilot",
        scope: "user",
        root: "<user home>/.copilot/skills",
        displayPath: "~/.copilot/skills (simulated)",
      };
    }
    return {
      platform: "copilot",
      scope: "workspace",
      root: "<workspace>/.copilot/skills",
      displayPath: "<workspace>/.copilot/skills (simulated)",
    };
  }

  protected existsSync(): boolean {
    return false;
  }
}

/**
 * Claude / Claude Code. Real installation target not yet supported; simulated.
 */
export class ClaudeInstallAdapter extends SimulatedInstallAdapter {
  readonly platform = "claude" satisfies PlatformId;
  readonly displayName = "Claude / Claude Code";

  resolveTarget(scope: InstallScope): InstallTarget | undefined {
    if (scope === "user") {
      return {
        platform: "claude",
        scope: "user",
        root: "<user home>/.claude/skills",
        displayPath: "~/.claude/skills (simulated)",
      };
    }
    return {
      platform: "claude",
      scope: "workspace",
      root: "<workspace>/.claude/skills",
      displayPath: "<workspace>/.claude/skills (simulated)",
    };
  }
}

/**
 * OpenAI. Not yet supported; simulated only.
 */
export class OpenAiInstallAdapter extends SimulatedInstallAdapter {
  readonly platform = "openai" satisfies PlatformId;
  readonly displayName = "OpenAI";

  resolveTarget(scope: InstallScope): InstallTarget | undefined {
    if (scope === "user") return undefined;
    return {
      platform: "openai",
      scope: "workspace",
      root: "<workspace>/.openai/skills",
      displayPath: "<workspace>/.openai/skills (simulated)",
    };
  }
}

/**
 * Neutral / generic filesystem install. This is a *real* FileInstallAdapter:
 * it writes a skill directory under an approved root inside the extension's
 * workspace storage. Useful as a safe, reversible target that does not claim
 * to integrate with any AI platform.
 */
export class NeutralInstallAdapter extends FileInstallAdapter {
  readonly platform = "neutral" satisfies PlatformId;
  readonly displayName = "Local skill directory";

  constructor(private approvedRoot: string) {
    super();
  }

  resolveTarget(scope: InstallScope): InstallTarget | undefined {
    if (scope === "user") return undefined;
    const root = path.join(this.approvedRoot, "workspace-skills");
    return {
      platform: "neutral",
      scope: "workspace",
      root,
      displayPath: root,
    };
  }

  protected exists(absPath: string): boolean {
    return fsExistsSync(absPath);
  }

  protected async writeFile(absPath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, content, "utf8");
  }

  protected async removeFile(absPath: string): Promise<void> {
    await fs.rm(absPath, { force: true });
  }
}
