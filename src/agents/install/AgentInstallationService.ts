import { promises as fs, existsSync as fsExistsSync, readFileSync as fsReadFileSync } from "fs";
import * as path from "path";
import { Agent } from "../../domain/agents/types";
import { exportAgentConfig } from "../AgentExporter";
import {
  AgentInstallFile,
  AgentInstallPlan,
  AgentInstallScope,
  AgentInstallTarget,
  AgentInstalledArtifact,
  AgentPlatformId,
  AgentUninstallResult,
} from "./types";

export interface IAgentArtifactsStore {
  list(): AgentInstalledArtifact[];
  listForAgent(agentId: string): AgentInstalledArtifact[];
  add(artifact: AgentInstalledArtifact): void;
  remove(agentId: string, platform: AgentPlatformId, scope: AgentInstallScope): AgentInstalledArtifact | undefined;
  clearForAgent(agentId: string): AgentInstalledArtifact[];
}

export class InMemoryAgentArtifactsStore implements IAgentArtifactsStore {
  private artifacts = new Map<string, AgentInstalledArtifact[]>();

  list(): AgentInstalledArtifact[] {
    return [...this.artifacts.values()].flat();
  }

  listForAgent(agentId: string): AgentInstalledArtifact[] {
    return [...(this.artifacts.get(agentId) ?? [])];
  }

  add(artifact: AgentInstalledArtifact): void {
    const list = this.artifacts.get(artifact.agentId) ?? [];
    const idx = list.findIndex((a) => a.platform === artifact.platform && a.scope === artifact.scope);
    if (idx >= 0) {
      list[idx] = artifact;
    } else {
      list.push(artifact);
    }
    this.artifacts.set(artifact.agentId, list);
  }

  remove(agentId: string, platform: AgentPlatformId, scope: AgentInstallScope): AgentInstalledArtifact | undefined {
    const list = this.artifacts.get(agentId) ?? [];
    const idx = list.findIndex((a) => a.platform === platform && a.scope === scope);
    if (idx < 0) return undefined;
    const [removed] = list.splice(idx, 1);
    this.artifacts.set(agentId, list);
    return removed;
  }

  clearForAgent(agentId: string): AgentInstalledArtifact[] {
    const list = this.artifacts.get(agentId) ?? [];
    this.artifacts.delete(agentId);
    return list;
  }
}

export interface AgentPlatformRule {
  platform: AgentPlatformId;
  displayName: string;
  defaultScope: AgentInstallScope;
  resolveTarget(scope: AgentInstallScope, workspaceRoot?: string): AgentInstallTarget;
  buildFiles(agent: Agent): AgentInstallFile[];
}

export function safeJoin(root: string, relativePath: string): string | null {
  if (path.isAbsolute(relativePath)) return null;
  const joined = path.resolve(root, relativePath);
  const normalizedRoot = path.resolve(root);
  if (joined !== normalizedRoot && !joined.startsWith(normalizedRoot + path.sep)) {
    return null;
  }
  return joined;
}

export class AgentInstallationService {
  constructor(
    private readonly workspaceRoot?: string,
    private readonly artifacts: IAgentArtifactsStore = new InMemoryAgentArtifactsStore(),
  ) {}

  public getWorkspaceRoot(): string | undefined {
    return this.workspaceRoot;
  }

  public targetsFor(platform: AgentPlatformId): { scope: AgentInstallScope; target: AgentInstallTarget }[] {
    const targets: { scope: AgentInstallScope; target: AgentInstallTarget }[] = [];
    if (this.workspaceRoot) {
      targets.push({ scope: "workspace", target: this.resolveTarget(platform, "workspace") });
    }
    targets.push({ scope: "user", target: this.resolveTarget(platform, "user") });
    return targets;
  }

  public resolveTarget(platform: AgentPlatformId, scope: AgentInstallScope): AgentInstallTarget {
    if (scope === "workspace" && this.workspaceRoot) {
      switch (platform) {
        case "copilot":
          return {
            platform,
            scope,
            root: path.join(this.workspaceRoot, ".github", "agents"),
            displayPath: ".github/agents",
          };
        case "claude":
          return {
            platform,
            scope,
            root: path.join(this.workspaceRoot, ".claude", "agents"),
            displayPath: ".claude/agents",
          };
        case "openai":
          return {
            platform,
            scope,
            root: path.join(this.workspaceRoot, ".openai", "agents"),
            displayPath: ".openai/agents",
          };
        case "neutral":
        default:
          return {
            platform: "neutral",
            scope,
            root: path.join(this.workspaceRoot, ".agents", "agents"),
            displayPath: ".agents/agents",
          };
      }
    }

    // User scope or simulated fallback
    return {
      platform,
      scope,
      root: `<user home>/.agentforge/agents/${platform}`,
      displayPath: `~/.agentforge/agents/${platform} (simulated)`,
    };
  }

  public async plan(agent: Agent, platform: AgentPlatformId, scope: AgentInstallScope): Promise<AgentInstallPlan> {
    const target = this.resolveTarget(platform, scope);
    const files = this.buildFilesForAgent(agent, platform);
    const supported = Boolean(this.workspaceRoot && scope === "workspace");

    const existing: string[] = [];
    if (supported) {
      for (const f of files) {
        const abs = safeJoin(target.root, f.relativePath);
        if (abs && fsExistsSync(abs)) {
          existing.push(f.relativePath);
        }
      }
    }

    return {
      target,
      files,
      existing,
      supported,
      simulated: !supported,
    };
  }

  public async install(agent: Agent, plan: AgentInstallPlan): Promise<AgentInstalledArtifact> {
    if (plan.simulated || !plan.supported) {
      const artifact: AgentInstalledArtifact = {
        agentId: agent.id,
        platform: plan.target.platform,
        scope: plan.target.scope,
        root: plan.target.root,
        files: plan.files.map((f) => f.relativePath),
        installedAt: new Date().toISOString(),
        simulated: true,
      };
      this.artifacts.add(artifact);
      return artifact;
    }

    const written: string[] = [];
    for (const f of plan.files) {
      const abs = safeJoin(plan.target.root, f.relativePath);
      if (!abs) throw new Error(`Refusing to write outside install root: ${f.relativePath}`);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, f.content, "utf8");
      written.push(f.relativePath);
    }

    if (plan.target.platform === "copilot") {
      const safeId = (agent.id || "agent").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      const legacyMd = safeJoin(plan.target.root, `${safeId}.md`);
      if (legacyMd) {
        try {
          await fs.rm(legacyMd, { force: true });
        } catch {
          // ignore
        }
      }
    }

    const artifact: AgentInstalledArtifact = {
      agentId: agent.id,
      platform: plan.target.platform,
      scope: plan.target.scope,
      root: plan.target.root,
      files: written,
      installedAt: new Date().toISOString(),
      simulated: false,
    };
    this.artifacts.add(artifact);
    return artifact;
  }

  public artifactsFor(agentId: string): AgentInstalledArtifact[] {
    return this.artifacts.listForAgent(agentId);
  }

  public async uninstall(
    agentId: string,
    platform: AgentPlatformId,
    scope: AgentInstallScope,
    removeFromDisk = true,
  ): Promise<AgentUninstallResult> {
    const artifact = this.artifacts.remove(agentId, platform, scope);
    if (!artifact) {
      return {
        artifact: {
          agentId,
          platform,
          scope,
          root: "",
          files: [],
          installedAt: new Date().toISOString(),
          simulated: true,
        },
        diskRemoved: false,
        recordRemoved: false,
        message: "No installation record found.",
      };
    }

    let diskRemoved = false;
    if (removeFromDisk && !artifact.simulated && this.workspaceRoot) {
      for (const rel of artifact.files) {
        const abs = safeJoin(artifact.root, rel);
        if (abs) {
          try {
            await fs.rm(abs, { force: true });
            diskRemoved = true;
          } catch {
            // ignore
          }
        }
      }
      try {
        const remaining = await fs.readdir(artifact.root).catch(() => []);
        if (remaining.length === 0) {
          await fs.rmdir(artifact.root).catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    return {
      artifact,
      diskRemoved,
      recordRemoved: true,
      message: removeFromDisk
        ? artifact.simulated
          ? "Removed installation record (no files were on disk)."
          : `Removed installation record and ${diskRemoved ? "deleted file(s) from disk" : "file was already gone"}.`
        : "Removed installation record. Files on disk were preserved.",
    };
  }

  public async uninstallAll(agentId: string): Promise<number> {
    const list = this.artifacts.clearForAgent(agentId);
    let count = 0;
    for (const artifact of list) {
      if (!artifact.simulated && this.workspaceRoot) {
        for (const rel of artifact.files) {
          const abs = safeJoin(artifact.root, rel);
          if (abs) {
            try {
              await fs.rm(abs, { force: true });
              count += 1;
            } catch {
              // ignore
            }
          }
        }
      }
    }
    return count;
  }

  private buildFilesForAgent(agent: Agent, platform: AgentPlatformId): AgentInstallFile[] {
    const safeId = (agent.id || "agent").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    switch (platform) {
      case "copilot": {
        let content = exportAgentConfig(agent, "copilot-instructions").content;
        if (this.workspaceRoot) {
          const customAgentPath = path.join(this.workspaceRoot, ".github", "agents", `${safeId}.agent.md`);
          if (fsExistsSync(customAgentPath)) {
            try {
              content = fsReadFileSync(customAgentPath, "utf8");
            } catch {
              // fallback to exported
            }
          }
        }
        return [
          {
            relativePath: `${safeId}.agent.md`,
            content,
            overwriteSafe: true,
          },
        ];
      }
      case "claude": {
        const exported = exportAgentConfig(agent, "claude-subagent");
        return [
          {
            relativePath: `${safeId}.md`,
            content: exported.content,
            overwriteSafe: true,
          },
        ];
      }
      case "openai": {
        const exported = exportAgentConfig(agent, "openai-assistant");
        return [
          {
            relativePath: `${safeId}.json`,
            content: exported.content,
            overwriteSafe: true,
          },
        ];
      }
      case "neutral":
      default: {
        const exported = exportAgentConfig(agent, "agent-spec");
        return [
          {
            relativePath: `${safeId}.json`,
            content: exported.content,
            overwriteSafe: true,
          },
        ];
      }
    }
  }
}
