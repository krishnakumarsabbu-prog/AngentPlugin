import { PlatformCompatibility } from "../../domain/skills/types";

export type InstallScope = "user" | "workspace";

export type PlatformId = PlatformCompatibility;

export interface InstallTarget {
  platform: PlatformId;
  scope: InstallScope;
  /** Absolute root the adapter is allowed to write within. */
  root: string;
  /** Human-readable display path shown in the UI. */
  displayPath: string;
}

export interface InstallFile {
  /** Path relative to the install root. Must not escape the root. */
  relativePath: string;
  content: string;
  /** When true the file is documentation/metadata only and safe to overwrite without backup. */
  overwriteSafe?: boolean;
}

export interface InstalledArtifact {
  platform: PlatformId;
  scope: InstallScope;
  root: string;
  /** Files actually written, relative to root. */
  files: string[];
  installedAt: string;
  /** True when no real platform write occurred (simulated install). */
  simulated: boolean;
}

export interface InstallCheckResult {
  /** Files that already exist at the target, relative to root. */
  existing: string[];
  /** Whether the platform is supported by a real adapter (false => simulated install). */
  supported: boolean;
}

export interface PlatformInstallAdapter {
  readonly platform: PlatformId;
  readonly supported: boolean;
  /** Human-readable name shown in the UI. */
  readonly displayName: string;
  /** Where installs land for each scope; undefined when the scope is not applicable. */
  resolveTarget(scope: InstallScope): InstallTarget | undefined;
  /** Check which files already exist at the target. */
  check(files: InstallFile[], target: InstallTarget): Promise<InstallCheckResult>;
  /** Write files to the target. Must never write outside target.root. */
  install(files: InstallFile[], target: InstallTarget): Promise<InstalledArtifact>;
  /** Remove files for a previously-recorded artifact. Returns true if any file was removed. */
  uninstall(artifact: InstalledArtifact): Promise<boolean>;
}

export interface PackageFile {
  /** Path within the package, forward-slash separated. */
  path: string;
  content: string;
}

export interface SkillPackage {
  skillId: string;
  skillName: string;
  version: string;
  /** The canonical SKILL.md document. */
  skillMd: string;
  /** Additional files included when the skill declares resources. */
  files: PackageFile[];
  /** True when the package contains more than just SKILL.md. */
  hasResources: boolean;
}

export const PACKAGE_MANIFEST_NAME = "agentforge-package.json";

export interface PackageManifest {
  kind: "agentforge-skill";
  skillId: string;
  skillName: string;
  version: string;
  exportedAt: string;
  files: string[];
}
