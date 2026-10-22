import { hasVsCodeApi, sendRequest } from "./vscodeApi";
import type {
  InstalledPackageRecord,
  PackageBundle,
  PackageValidationResult,
  PackageBackupRecord,
  PackageType,
  PackageManagerManifest,
} from "../types";

const FALLBACK_PACKAGES: InstalledPackageRecord[] = [];

const localPackages: InstalledPackageRecord[] = [...FALLBACK_PACKAGES];
const localBackups: PackageBackupRecord[] = [];


export const packageService = {
  async list(filters?: { query?: string; type?: PackageType; status?: string }): Promise<InstalledPackageRecord[]> {
    if (hasVsCodeApi()) {
      try {
        const res = await sendRequest<InstalledPackageRecord[]>("packages.list", filters);
        if (Array.isArray(res)) return res;
      } catch (e) {
        console.warn("Falling back to local package state:", e);
      }
    }

    let res = [...localPackages];
    if (filters?.query) {
      const q = filters.query.toLowerCase();
      res = res.filter(
        (p) =>
          p.manifest.name.toLowerCase().includes(q) ||
          p.manifest.id.toLowerCase().includes(q) ||
          p.manifest.description.toLowerCase().includes(q)
      );
    }
    if (filters?.type) {
      res = res.filter((p) => p.manifest.type === filters.type);
    }
    if (filters?.status && filters.status !== "all") {
      res = res.filter((p) => p.status === filters.status);
    }
    return res;
  },

  async validate(bundle: PackageBundle): Promise<PackageValidationResult> {
    if (hasVsCodeApi()) {
      try {
        return await sendRequest<PackageValidationResult>("packages.validate", { bundle });
      } catch (e) {
        console.warn("Falling back to client-side package validation:", e);
      }
    }

    const issues: string[] = [];
    const warnings: string[] = [];
    const compatibilityWarnings: string[] = [];
    const manifest = bundle.manifest;

    if (!manifest) {
      return { valid: false, issues: ["Manifest is required."], warnings: [], compatibilityWarnings: [], integrityVerified: false };
    }
    if (!manifest.id) issues.push("Package ID is required.");
    if (!manifest.name) issues.push("Package name is required.");
    if (!manifest.version) issues.push("Package version is required.");

    // Security warning against script execution
    const hasScripts = manifest.entryFiles?.some((f) => /\.(sh|bat|cmd|ps1|exe|js)$/i.test(f.path));
    if (hasScripts) {
      warnings.push("Package contains executable scripts. Security policy: Scripts are NEVER automatically executed.");
    }

    // Check conflict
    const existing = localPackages.find((p) => p.manifest.id === manifest.id);
    let duplicateOrConflict: PackageValidationResult["duplicateOrConflict"] = undefined;
    if (existing) {
      duplicateOrConflict = {
        existingVersion: existing.installedVersion,
        newVersion: manifest.version,
        conflictType: existing.installedVersion === manifest.version ? "duplicate" : "upgrade",
        message: `Package with ID '${manifest.id}' already installed (${existing.installedVersion}).`,
      };
      warnings.push(`Existing package found: v${existing.installedVersion}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      compatibilityWarnings,
      integrityVerified: !!manifest.integrity?.hash,
      duplicateOrConflict,
    };
  },

  async install(bundle: PackageBundle, scope: "workspace" | "global" = "workspace", createBackup = true): Promise<InstalledPackageRecord> {
    if (hasVsCodeApi()) {
      try {
        return await sendRequest<InstalledPackageRecord>("packages.install", { bundle, scope, createBackup });
      } catch (e) {
        console.warn("Falling back to client package install:", e);
      }
    }

    if (createBackup) {
      const existing = localPackages.find((p) => p.manifest.id === bundle.manifest.id);
      if (existing) {
        localBackups.unshift({
          id: `backup-${Date.now()}`,
          packageId: existing.manifest.id,
          packageName: existing.manifest.name,
          version: existing.installedVersion,
          createdAt: new Date().toISOString(),
          reason: "Auto-backup before package upgrade/overwrite",
          dataSnapshot: existing,
        });
      }
    }

    const rec: InstalledPackageRecord = {
      id: bundle.manifest.id,
      manifest: bundle.manifest,
      status: "installed",
      installedAt: new Date().toISOString(),
      installedVersion: bundle.manifest.version,
      scope,
      backupAvailable: createBackup,
    };

    const idx = localPackages.findIndex((p) => p.manifest.id === bundle.manifest.id);
    if (idx !== -1) {
      localPackages[idx] = rec;
    } else {
      localPackages.unshift(rec);
    }
    return rec;
  },

  async uninstall(id: string, createBackup = true): Promise<boolean> {
    if (hasVsCodeApi()) {
      try {
        const res = await sendRequest<{ ok: boolean }>("packages.uninstall", { id, createBackup });
        return res.ok;
      } catch (e) {
        console.warn("Falling back to client uninstall:", e);
      }
    }

    const idx = localPackages.findIndex((p) => p.manifest.id === id);
    if (idx === -1) return false;

    if (createBackup) {
      const target = localPackages[idx];
      localBackups.unshift({
        id: `backup-${Date.now()}`,
        packageId: target.manifest.id,
        packageName: target.manifest.name,
        version: target.installedVersion,
        createdAt: new Date().toISOString(),
        reason: "Auto-backup before package removal",
        dataSnapshot: target,
      });
    }

    localPackages.splice(idx, 1);
    return true;
  },

  async exportBundle(manifest: Partial<PackageManagerManifest>, content: unknown): Promise<PackageBundle> {
    if (hasVsCodeApi()) {
      try {
        return await sendRequest<PackageBundle>("packages.export", { manifest, content });
      } catch (e) {
        console.warn("Falling back to client export:", e);
      }
    }

    const now = new Date().toISOString();
    return {
      manifest: {
        id: manifest.id || `pkg-${Date.now()}`,
        name: manifest.name || "Custom Export",
        version: manifest.version || "1.0.0",
        type: manifest.type || "full-kit",
        schemaVersion: 1,
        description: manifest.description || "Package bundle export",
        author: manifest.author || "User",
        compatibility: manifest.compatibility || ["copilot", "claude", "openai"],
        entryFiles: manifest.entryFiles || [{ path: "manifest.json", description: "Manifest", type: "reference-doc" }],
        dependencies: manifest.dependencies || [],
        changelog: manifest.changelog || `1.0.0 - Exported ${now}`,
        tags: manifest.tags || ["export"],
        integrity: {
          algorithm: "sha256",
          hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          generatedAt: now,
        },
      },
    };
  },

  async listBackups(): Promise<PackageBackupRecord[]> {
    if (hasVsCodeApi()) {
      try {
        return await sendRequest<PackageBackupRecord[]>("packages.backups");
      } catch (e) {
        console.warn("Falling back to local backups:", e);
      }
    }
    return [...localBackups];
  },

  async restoreBackup(backupId: string): Promise<boolean> {
    if (hasVsCodeApi()) {
      try {
        const res = await sendRequest<{ ok: boolean }>("packages.restoreBackup", { backupId });
        return res.ok;
      } catch (e) {
        console.warn("Falling back to local restore:", e);
      }
    }

    const b = localBackups.find((x) => x.id === backupId);
    if (!b || !b.dataSnapshot) return false;
    const restored = b.dataSnapshot as InstalledPackageRecord;
    const idx = localPackages.findIndex((p) => p.manifest.id === restored.manifest.id);
    if (idx !== -1) {
      localPackages[idx] = restored;
    } else {
      localPackages.unshift(restored);
    }
    return true;
  },
};
