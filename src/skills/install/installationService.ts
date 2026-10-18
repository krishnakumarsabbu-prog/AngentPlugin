import {
  InstallFile,
  InstallScope,
  InstallTarget,
  InstalledArtifact,
  PlatformId,
  PlatformInstallAdapter,
} from "./types";
import { CopilotInstallAdapter, ClaudeInstallAdapter, OpenAiInstallAdapter, NeutralInstallAdapter } from "./platforms";

export interface InstalledArtifactsStore {
  list(): InstalledArtifact[];
  listForSkill(skillId: string): InstalledArtifact[];
  add(skillId: string, artifact: InstalledArtifact): void;
  remove(skillId: string, platform: PlatformId, scope: InstallScope): InstalledArtifact | undefined;
  clearForSkill(skillId: string): InstalledArtifact[];
}

export class InMemoryArtifactsStore implements InstalledArtifactsStore {
  private map = new Map<string, InstalledArtifact[]>();

  list(): InstalledArtifact[] {
    return [...this.map.values()].flat();
  }

  listForSkill(skillId: string): InstalledArtifact[] {
    return [...(this.map.get(skillId) ?? [])];
  }

  add(skillId: string, artifact: InstalledArtifact): void {
    const arr = this.map.get(skillId) ?? [];
    const idx = arr.findIndex((a) => a.platform === artifact.platform && a.scope === artifact.scope);
    if (idx >= 0) arr[idx] = artifact;
    else arr.push(artifact);
    this.map.set(skillId, arr);
  }

  remove(skillId: string, platform: PlatformId, scope: InstallScope): InstalledArtifact | undefined {
    const arr = this.map.get(skillId) ?? [];
    const idx = arr.findIndex((a) => a.platform === platform && a.scope === scope);
    if (idx < 0) return undefined;
    const [removed] = arr.splice(idx, 1);
    this.map.set(skillId, arr);
    return removed;
  }

  clearForSkill(skillId: string): InstalledArtifact[] {
    const arr = this.map.get(skillId) ?? [];
    this.map.delete(skillId);
    return arr;
  }
}

export interface InstallRegistry {
  adapters(): PlatformInstallAdapter[];
  adapterFor(platform: PlatformId): PlatformInstallAdapter | undefined;
  targetsFor(platform: PlatformId): { scope: InstallScope; target: InstallTarget }[];
}

export function createInstallRegistry(neutralApprovedRoot: string | null): InstallRegistry {
  const adapters: PlatformInstallAdapter[] = [
    new CopilotInstallAdapter(),
    new ClaudeInstallAdapter(),
    new OpenAiInstallAdapter(),
  ];
  if (neutralApprovedRoot) {
    adapters.push(new NeutralInstallAdapter(neutralApprovedRoot));
  }
  const byPlatform = new Map<PlatformId, PlatformInstallAdapter>(adapters.map((a) => [a.platform, a]));

  return {
    adapters: () => [...adapters],
    adapterFor: (platform) => byPlatform.get(platform),
    targetsFor: (platform) => {
      const adapter = byPlatform.get(platform);
      if (!adapter) return [];
      const out: { scope: InstallScope; target: InstallTarget }[] = [];
      const user = adapter.resolveTarget("user");
      if (user) out.push({ scope: "user", target: user });
      const workspace = adapter.resolveTarget("workspace");
      if (workspace) out.push({ scope: "workspace", target: workspace });
      return out;
    },
  };
}

export interface InstallPlan {
  target: InstallTarget;
  files: InstallFile[];
  existing: string[];
  supported: boolean;
  simulated: boolean;
}

export interface UninstallResult {
  artifact: InstalledArtifact;
  diskRemoved: boolean;
  recordRemoved: boolean;
}

export class InstallationService {
  constructor(
    private registry: InstallRegistry,
    private artifacts: InstalledArtifactsStore,
  ) {}

  listAdapters(): PlatformInstallAdapter[] {
    return this.registry.adapters();
  }

  targetsFor(platform: PlatformId): { scope: InstallScope; target: InstallTarget }[] {
    return this.registry.targetsFor(platform);
  }

  async plan(skillId: string, platform: PlatformId, scope: InstallScope, files: InstallFile[]): Promise<InstallPlan> {
    const adapter = this.registry.adapterFor(platform);
    if (!adapter) throw new Error(`Unsupported platform: ${platform}`);
    const target = adapter.resolveTarget(scope);
    if (!target) throw new Error(`Platform ${platform} does not support scope "${scope}".`);
    const check = await adapter.check(files, target);
    return {
      target,
      files,
      existing: check.existing,
      supported: check.supported,
      simulated: !check.supported,
    };
  }

  async install(skillId: string, plan: InstallPlan): Promise<InstalledArtifact> {
    const adapter = this.registry.adapterFor(plan.target.platform);
    if (!adapter) throw new Error(`Unsupported platform: ${plan.target.platform}`);
    const artifact = await adapter.install(plan.files, plan.target);
    this.artifacts.add(skillId, artifact);
    return artifact;
  }

  artifactsFor(skillId: string): InstalledArtifact[] {
    return this.artifacts.listForSkill(skillId);
  }

  async uninstall(skillId: string, platform: PlatformId, scope: InstallScope): Promise<UninstallResult> {
    const artifact = this.artifacts.remove(skillId, platform, scope);
    if (!artifact) {
      return { artifact: this.emptyArtifact(platform, scope), diskRemoved: false, recordRemoved: false };
    }
    const adapter = this.registry.adapterFor(platform);
    let diskRemoved = false;
    if (adapter && !artifact.simulated) {
      diskRemoved = await adapter.uninstall(artifact);
    }
    return { artifact, diskRemoved, recordRemoved: true };
  }

  /** Remove all artifacts for a skill (used when a skill is deleted). Returns count. */
  async uninstallAll(skillId: string): Promise<number> {
    const all = this.artifacts.clearForSkill(skillId);
    let diskRemoved = 0;
    for (const artifact of all) {
      const adapter = this.registry.adapterFor(artifact.platform);
      if (adapter && !artifact.simulated) {
        if (await adapter.uninstall(artifact)) diskRemoved += 1;
      }
    }
    return diskRemoved;
  }

  private emptyArtifact(platform: PlatformId, scope: InstallScope): InstalledArtifact {
    return {
      platform,
      scope,
      root: "",
      files: [],
      installedAt: new Date().toISOString(),
      simulated: true,
    };
  }
}
