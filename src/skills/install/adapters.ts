import * as path from "path";
import {
  InstallFile,
  InstallScope,
  InstallTarget,
  InstalledArtifact,
  PlatformInstallAdapter,
  PlatformId,
} from "./types";

/**
 * A simulated adapter. It records what *would* be written and never touches a
 * real platform directory. The UI must surface `simulated: true` so users never
 * mistake this for a real installation.
 *
 * Subclass and override `resolveTarget`/`install` to add a real adapter for a
 * platform; the rest of the flow stays the same.
 */
export abstract class SimulatedInstallAdapter implements PlatformInstallAdapter {
  abstract readonly platform: PlatformId;
  abstract readonly displayName: string;
  readonly supported = false;

  abstract resolveTarget(scope: InstallScope): InstallTarget | undefined;

  async check(files: InstallFile[], target: InstallTarget): Promise<{ existing: string[]; supported: boolean }> {
    const existing = files
      .filter((f) => this.existsSync(path.join(target.root, f.relativePath)))
      .map((f) => f.relativePath);
    return { existing, supported: this.supported };
  }

  async install(files: InstallFile[], target: InstallTarget): Promise<InstalledArtifact> {
    // Simulated install: we do NOT write to target.root. We record the planned
    // files so the UI and uninstall flow remain consistent.
    return {
      platform: this.platform,
      scope: target.scope,
      root: target.root,
      files: files.map((f) => f.relativePath),
      installedAt: new Date().toISOString(),
      simulated: true,
    };
  }

  async uninstall(_artifact: InstalledArtifact): Promise<boolean> {
    // Nothing was actually written, so there is nothing to remove on disk.
    return false;
  }

  protected existsSync(_absPath: string): boolean {
    return false;
  }
}

/**
 * A real adapter that writes files into an approved install root. Subclasses
 * constrain the root and provide `resolveTarget`. Used when a platform's
 * installation location is known and within an approved root.
 *
 * Safety: `install` rejects any relativePath that escapes `target.root` via
 * `..` or absolute paths, and never writes outside the root.
 */
export abstract class FileInstallAdapter implements PlatformInstallAdapter {
  abstract readonly platform: PlatformId;
  abstract readonly displayName: string;
  readonly supported = true;

  abstract resolveTarget(scope: InstallScope): InstallTarget | undefined;

  protected abstract exists(absPath: string): boolean;
  protected abstract writeFile(absPath: string, content: string): Promise<void>;
  protected abstract removeFile(absPath: string): Promise<void>;

  async check(files: InstallFile[], target: InstallTarget): Promise<{ existing: string[]; supported: boolean }> {
    const existing: string[] = [];
    for (const f of files) {
      const abs = this.safeJoin(target.root, f.relativePath);
      if (abs && this.exists(abs)) existing.push(f.relativePath);
    }
    return { existing, supported: this.supported };
  }

  async install(files: InstallFile[], target: InstallTarget): Promise<InstalledArtifact> {
    const written: string[] = [];
    for (const f of files) {
      const abs = this.safeJoin(target.root, f.relativePath);
      if (!abs) throw new Error(`Refusing to write outside install root: ${f.relativePath}`);
      await this.writeFile(abs, f.content);
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
    let removed = false;
    for (const rel of artifact.files) {
      const abs = this.safeJoin(artifact.root, rel);
      if (!abs) continue;
      try {
        await this.removeFile(abs);
        removed = true;
      } catch {
        // best-effort; a missing file is not a failure
      }
    }
    return removed;
  }

  protected safeJoin(root: string, relativePath: string): string | null {
    if (path.isAbsolute(relativePath)) return null;
    const joined = path.resolve(root, relativePath);
    const normalizedRoot = path.resolve(root);
    if (joined !== normalizedRoot && !joined.startsWith(normalizedRoot + path.sep)) {
      return null;
    }
    return joined;
  }
}
