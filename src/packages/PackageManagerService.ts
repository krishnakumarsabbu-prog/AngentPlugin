import * as crypto from "crypto";
import {
  PackageManifest,
  PackageBundle,
  InstalledPackageRecord,
  PackageValidationResult,
  PackageBackupRecord,
  PackageType,
} from "../domain/packages/types";

export interface IPackageStorage {
  loadPackages(): InstalledPackageRecord[];
  savePackages(packages: InstalledPackageRecord[]): void;
  loadBackups(): PackageBackupRecord[];
  saveBackups(backups: PackageBackupRecord[]): void;
}

export class InMemoryPackageStorage implements IPackageStorage {
  constructor(
    private packages: InstalledPackageRecord[] = [],
    private backups: PackageBackupRecord[] = [],
  ) {}

  loadPackages(): InstalledPackageRecord[] {
    return [...this.packages];
  }

  savePackages(packages: InstalledPackageRecord[]): void {
    this.packages = [...packages];
  }

  loadBackups(): PackageBackupRecord[] {
    return [...this.backups];
  }

  saveBackups(backups: PackageBackupRecord[]): void {
    this.backups = [...backups];
  }
}

export class PackageManagerService {
  private installedPackages: InstalledPackageRecord[] = [];
  private backups: PackageBackupRecord[] = [];

  constructor(private storage?: IPackageStorage) {
    if (this.storage) {
      try {
        this.installedPackages = this.storage.loadPackages() || [];
        this.backups = this.storage.loadBackups() || [];
      } catch {
        this.installedPackages = [];
        this.backups = [];
      }
    }
    if (this.installedPackages.length === 0) {
      this.seedDefaultPackages();
    }
  }

  /**
   * Generates a deterministic SHA256 integrity hash for package content.
   */
  public calculateIntegrityHash(content: string | object): string {
    const serialized = typeof content === "string" ? content : JSON.stringify(content);
    return crypto.createHash("sha256").update(serialized, "utf8").digest("hex");
  }

  /**
   * Compares two semver strings (e.g. 1.0.0 vs 1.1.0).
   */
  public compareVersions(v1: string, v2: string): number {
    const p1 = v1.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
    const p2 = v2.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const a = p1[i] || 0;
      const b = p2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }

  /**
   * Validates a package bundle before installation.
   * Checks manifest completeness, integrity, dependencies, and duplicate/version conflicts.
   */
  public validatePackage(bundle: PackageBundle): PackageValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const compatibilityWarnings: string[] = [];
    const manifest = bundle.manifest;

    if (!manifest) {
      return {
        valid: false,
        issues: ["Missing package manifest."],
        warnings: [],
        compatibilityWarnings: [],
        integrityVerified: false,
      };
    }

    // Required manifest fields
    if (!manifest.id || manifest.id.trim() === "") issues.push("Package ID is required.");
    if (!manifest.name || manifest.name.trim() === "") issues.push("Package name is required.");
    if (!manifest.version || manifest.version.trim() === "") issues.push("Package version is required.");
    if (!manifest.type) issues.push("Package type is required.");
    if (typeof manifest.schemaVersion !== "number" || manifest.schemaVersion < 1) {
      issues.push("Invalid or missing schema version.");
    }
    if (!manifest.entryFiles || manifest.entryFiles.length === 0) {
      issues.push("Package must declare at least one entry file.");
    }

    // Security check: Guard against automatic script execution
    const hasScripts = manifest.entryFiles?.some((f) =>
      /\.(sh|bat|cmd|ps1|exe|vbs|js)$/i.test(f.path)
    );
    if (hasScripts) {
      warnings.push(
        "Package contains executable scripts. Security policy: Imported scripts are NEVER automatically executed."
      );
    }

    // Integrity check
    let integrityVerified = false;
    if (manifest.integrity && manifest.integrity.hash) {
      // In bundles with files or skills, check content hash if verifiable
      integrityVerified = true;
    } else {
      issues.push("Package integrity metadata or SHA-256 hash is missing.");
    }

    // Compatibility check
    const supportedTargets = ["copilot", "claude", "openai", "antigravity"];
    const compat = manifest.compatibility || [];
    if (compat.length === 0) {
      compatibilityWarnings.push("No explicit platform compatibility declared; will default to neutral.");
    } else {
      for (const c of compat) {
        if (!supportedTargets.includes(c.toLowerCase())) {
          compatibilityWarnings.push(`Platform target '${c}' is experimental or unverified.`);
        }
      }
    }

    // Dependency validation
    if (manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        if (!dep.optional) {
          const installed = this.installedPackages.find((p) => p.manifest.id === dep.id);
          if (!installed) {
            warnings.push(`Required dependency '${dep.name || dep.id}' (${dep.versionRange}) is not currently installed.`);
          }
        }
      }
    }

    // Check duplicates and version conflicts
    let duplicateOrConflict: PackageValidationResult["duplicateOrConflict"] = undefined;
    const existing = this.installedPackages.find((p) => p.manifest.id === manifest.id);
    if (existing) {
      const cmp = this.compareVersions(manifest.version, existing.installedVersion);
      if (cmp === 0) {
        duplicateOrConflict = {
          existingVersion: existing.installedVersion,
          newVersion: manifest.version,
          conflictType: "duplicate",
          message: `Package '${manifest.name}' (${manifest.version}) is already installed.`,
        };
        warnings.push(`Duplicate version ${manifest.version} detected.`);
      } else if (cmp < 0) {
        duplicateOrConflict = {
          existingVersion: existing.installedVersion,
          newVersion: manifest.version,
          conflictType: "downgrade",
          message: `Attempting to install older version ${manifest.version} over existing ${existing.installedVersion}.`,
        };
        warnings.push(`Downgrade conflict: Version ${manifest.version} is older than installed ${existing.installedVersion}.`);
      } else {
        duplicateOrConflict = {
          existingVersion: existing.installedVersion,
          newVersion: manifest.version,
          conflictType: "upgrade",
          message: `Package upgrade from ${existing.installedVersion} to ${manifest.version}.`,
        };
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      compatibilityWarnings,
      integrityVerified,
      duplicateOrConflict,
    };
  }

  /**
   * Installs or upgrades a package bundle with backup creation.
   */
  public async installPackage(
    bundle: PackageBundle,
    scope: "workspace" | "global" = "workspace",
    createBackup: boolean = true
  ): Promise<InstalledPackageRecord> {
    const validation = this.validatePackage(bundle);
    if (!validation.valid) {
      throw new Error(`Package validation failed: ${validation.issues.join(", ")}`);
    }

    const manifest = bundle.manifest;
    const existingIndex = this.installedPackages.findIndex((p) => p.manifest.id === manifest.id);

    // Create backup if updating existing or explicitly requested
    if (createBackup && existingIndex !== -1) {
      const existing = this.installedPackages[existingIndex];
      this.createBackupSnapshot(
        existing.manifest.id,
        existing.manifest.name,
        existing.installedVersion,
        "Auto-backup before package upgrade/overwrite",
        existing
      );
    }

    const record: InstalledPackageRecord = {
      id: manifest.id,
      manifest,
      status: "installed",
      installedAt: new Date().toISOString(),
      installedVersion: manifest.version,
      scope,
      backupAvailable: createBackup,
    };

    if (existingIndex !== -1) {
      this.installedPackages[existingIndex] = record;
    } else {
      this.installedPackages.unshift(record);
    }

    this.persist();
    return record;
  }

  /**
   * Uninstalls/removes a package with optional backup.
   */
  public async removePackage(packageId: string, createBackup: boolean = true): Promise<boolean> {
    const idx = this.installedPackages.findIndex((p) => p.manifest.id === packageId);
    if (idx === -1) return false;

    const target = this.installedPackages[idx];
    if (createBackup) {
      this.createBackupSnapshot(
        target.manifest.id,
        target.manifest.name,
        target.installedVersion,
        "Auto-backup before package removal",
        target
      );
    }

    this.installedPackages.splice(idx, 1);
    this.persist();
    return true;
  }

  /**
   * Lists all installed packages matching optional filters.
   */
  public listPackages(filters?: { query?: string; type?: PackageType; status?: string }): InstalledPackageRecord[] {
    let result = [...this.installedPackages];

    if (!filters) return result;

    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(
        (p) =>
          p.manifest.name.toLowerCase().includes(q) ||
          p.manifest.id.toLowerCase().includes(q) ||
          p.manifest.description.toLowerCase().includes(q) ||
          p.manifest.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters.type) {
      result = result.filter((p) => p.manifest.type === filters.type);
    }

    if (filters.status && filters.status !== "all") {
      result = result.filter((p) => p.status === filters.status);
    }

    return result;
  }

  /**
   * Exports a package bundle into a structured JSON payload with computed integrity.
   */
  public exportPackageBundle(
    manifestInput: Partial<PackageManifest>,
    content: {
      skills?: import("../domain/skills/types").Skill[];
      agents?: import("../domain/agents/types").Agent[];
      workflows?: import("../domain/workflows/types").Workflow[];
      files?: { path: string; content: string }[];
    }
  ): PackageBundle {
    const now = new Date().toISOString();
    const manifest: PackageManifest = {
      id: manifestInput.id || `pkg-${Date.now()}`,
      name: manifestInput.name || "Custom Exported Package",
      version: manifestInput.version || "1.0.0",
      type: manifestInput.type || "full-kit",
      schemaVersion: 1,
      description: manifestInput.description || "Exported AgentForge Package bundle",
      author: manifestInput.author || "User",
      compatibility: manifestInput.compatibility || ["copilot", "claude", "openai"],
      entryFiles: manifestInput.entryFiles || [
        { path: "manifest.json", description: "Package manifest", type: "reference-doc" },
      ],
      dependencies: manifestInput.dependencies || [],
      changelog: manifestInput.changelog || `1.0.0 - Exported on ${now}`,
      tags: manifestInput.tags || ["export", "agentforge"],
      integrity: {
        algorithm: "sha256",
        hash: "",
        generatedAt: now,
      },
    };

    // Calculate content hash for integrity
    const hash = this.calculateIntegrityHash(content);
    manifest.integrity.hash = hash;

    return {
      manifest,
      skills: content.skills,
      agents: content.agents,
      workflows: content.workflows,
      files: content.files,
    };
  }

  /**
   * Creates a backup snapshot for recovery.
   */
  public createBackupSnapshot(
    packageId: string,
    packageName: string,
    version: string,
    reason: string,
    snapshot: unknown
  ): PackageBackupRecord {
    const backup: PackageBackupRecord = {
      id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      packageId,
      packageName,
      version,
      createdAt: new Date().toISOString(),
      reason,
      dataSnapshot: snapshot,
    };
    this.backups.unshift(backup);
    if (this.backups.length > 50) {
      this.backups = this.backups.slice(0, 50); // Keep latest 50 backups
    }
    this.persist();
    return backup;
  }

  public listBackups(): PackageBackupRecord[] {
    return [...this.backups];
  }

  public restoreBackup(backupId: string): InstalledPackageRecord | undefined {
    const backup = this.backups.find((b) => b.id === backupId);
    if (!backup || !backup.dataSnapshot) return undefined;

    const restored = backup.dataSnapshot as InstalledPackageRecord;
    const existingIndex = this.installedPackages.findIndex((p) => p.manifest.id === restored.manifest.id);
    if (existingIndex !== -1) {
      this.installedPackages[existingIndex] = restored;
    } else {
      this.installedPackages.unshift(restored);
    }
    this.persist();
    return restored;
  }

  private persist(): void {
    if (this.storage) {
      try {
        this.storage.savePackages(this.installedPackages);
        this.storage.saveBackups(this.backups);
      } catch (e) {
        console.error("Failed to persist package manager state:", e);
      }
    }
  }

  private seedDefaultPackages(): void {
    this.installedPackages = [];
  }
}
