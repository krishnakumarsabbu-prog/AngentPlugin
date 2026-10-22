import { promises as fs, existsSync as fsExistsSync } from "fs";
import * as path from "path";
import { FileInstallAdapter } from "./adapters";
import { InstallFile, InstallScope, InstallTarget, InstalledArtifact, PlatformId, PlatformInstallAdapter } from "./types";

function safeJoin(root: string, relativePath: string): string | null {
  if (path.isAbsolute(relativePath)) return null;
  const joined = path.resolve(root, relativePath);
  const normalizedRoot = path.resolve(root);
  if (joined !== normalizedRoot && !joined.startsWith(normalizedRoot + path.sep)) {
    return null;
  }
  return joined;
}

/**
 * Base adapter supporting both simulated previews and real workspace file installation.
 */
abstract class ConfigurableWorkspaceAdapter implements PlatformInstallAdapter {
  abstract readonly platform: PlatformId;
  abstract readonly displayName: string;
  abstract readonly workspaceSubdir: string;
  abstract readonly displaySubdir: string;

  constructor(protected readonly workspaceRoot?: string) {}

  get supported(): boolean {
    return Boolean(this.workspaceRoot);
  }

  resolveTarget(scope: InstallScope): InstallTarget | undefined {
    if (scope === "user") {
      return {
        platform: this.platform,
        scope: "user",
        root: `<user home>/.${this.platform}/skills`,
        displayPath: `~/.${this.platform}/skills (simulated)`,
      };
    }

    if (this.workspaceRoot) {
      const root = path.join(this.workspaceRoot, this.workspaceSubdir);
      return {
        platform: this.platform,
        scope: "workspace",
        root,
        displayPath: this.displaySubdir,
      };
    }

    return {
      platform: this.platform,
      scope: "workspace",
      root: `<workspace>/.${this.platform}/skills`,
      displayPath: `<workspace>/.${this.platform}/skills (simulated)`,
    };
  }

  async check(files: InstallFile[], target: InstallTarget): Promise<{ existing: string[]; supported: boolean }> {
    if (!this.supported || target.scope !== "workspace") {
      return { existing: [], supported: false };
    }
    const existing: string[] = [];
    for (const f of files) {
      const abs = safeJoin(target.root, f.relativePath);
      if (abs && fsExistsSync(abs)) {
        existing.push(f.relativePath);
      }
    }
    return { existing, supported: true };
  }

  async install(files: InstallFile[], target: InstallTarget): Promise<InstalledArtifact> {
    if (!this.supported || target.scope !== "workspace") {
      return {
        platform: this.platform,
        scope: target.scope,
        root: target.root,
        files: files.map((f) => f.relativePath),
        installedAt: new Date().toISOString(),
        simulated: true,
      };
    }

    const written: string[] = [];
    for (const f of files) {
      const abs = safeJoin(target.root, f.relativePath);
      if (!abs) throw new Error(`Refusing to write outside install root: ${f.relativePath}`);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, f.content, "utf8");
      written.push(f.relativePath);
    }

    return {
      platform: this.platform,
      scope: target.scope,
      root: target.root,
      files: written,
      installedAt: new Date().toISOString(),
      simulated: false,
    };
  }

  async uninstall(artifact: InstalledArtifact): Promise<boolean> {
    if (artifact.simulated || !this.supported) {
      return false;
    }
    let removed = false;
    for (const rel of artifact.files) {
      const abs = safeJoin(artifact.root, rel);
      if (abs) {
        try {
          await fs.rm(abs, { force: true });
          removed = true;
        } catch {
          // ignore missing
        }
      }
    }

    // Try cleaning up parent directory if empty
    try {
      if (artifact.files.length > 0) {
        const firstRel = artifact.files[0];
        const dir = path.dirname(safeJoin(artifact.root, firstRel) || "");
        if (dir && dir !== artifact.root) {
          const remaining = await fs.readdir(dir).catch(() => []);
          if (remaining.length === 0) {
            await fs.rmdir(dir).catch(() => {});
          }
        }
      }
    } catch {
      // ignore
    }

    return removed;
  }
}

/**
 * GitHub Copilot install adapter.
 * Writes to <workspace>/.github/skills when workspaceRoot is provided.
 */
export class CopilotInstallAdapter extends ConfigurableWorkspaceAdapter {
  readonly platform = "copilot" satisfies PlatformId;
  readonly displayName = "GitHub Copilot";
  readonly workspaceSubdir = path.join(".github", "skills");
  readonly displaySubdir = ".github/skills";

  constructor(workspaceRoot?: string) {
    super(workspaceRoot);
  }
}

/**
 * Claude / Claude Code install adapter.
 * Writes to <workspace>/.claude/skills when workspaceRoot is provided.
 */
export class ClaudeInstallAdapter extends ConfigurableWorkspaceAdapter {
  readonly platform = "claude" satisfies PlatformId;
  readonly displayName = "Claude / Claude Code";
  readonly workspaceSubdir = path.join(".claude", "skills");
  readonly displaySubdir = ".claude/skills";

  constructor(workspaceRoot?: string) {
    super(workspaceRoot);
  }
}

/**
 * OpenAI install adapter.
 * Writes to <workspace>/.openai/skills when workspaceRoot is provided.
 */
export class OpenAiInstallAdapter extends ConfigurableWorkspaceAdapter {
  readonly platform = "openai" satisfies PlatformId;
  readonly displayName = "OpenAI";
  readonly workspaceSubdir = path.join(".openai", "skills");
  readonly displaySubdir = ".openai/skills";

  constructor(workspaceRoot?: string) {
    super(workspaceRoot);
  }

  override resolveTarget(scope: InstallScope): InstallTarget | undefined {
    if (scope === "user") return undefined;
    return super.resolveTarget(scope);
  }
}

/**
 * Neutral / generic filesystem install. Writes a skill directory under
 * the workspace root (.agents/skills) or approved root.
 */
export class NeutralInstallAdapter extends FileInstallAdapter {
  readonly platform = "neutral" satisfies PlatformId;
  readonly displayName = "Local skill directory";

  constructor(
    private approvedRoot: string,
    private workspaceRoot?: string,
  ) {
    super();
  }

  resolveTarget(scope: InstallScope): InstallTarget | undefined {
    if (scope === "user") return undefined;
    const root = this.workspaceRoot
      ? path.join(this.workspaceRoot, ".agents", "skills")
      : path.join(this.approvedRoot, "workspace-skills");
    return {
      platform: "neutral",
      scope: "workspace",
      root,
      displayPath: this.workspaceRoot ? ".agents/skills" : root,
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
