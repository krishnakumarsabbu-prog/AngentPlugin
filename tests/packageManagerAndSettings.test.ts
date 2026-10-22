import { describe, it, expect, beforeEach } from "vitest";
import {
  PackageManagerService,
  InMemoryPackageStorage,
} from "../src/packages/PackageManagerService";
import { PlatformIntegrationService } from "../src/integrations/PlatformIntegrationService";
import { DEFAULT_SETTINGS, STORAGE_SCHEMA_VERSION } from "../src/storage/settingsDefaults";
import { PackageBundle } from "../src/domain/packages/types";

describe("Package Manager, Platform Integrations, and Settings", () => {
  describe("PackageManagerService", () => {
    let service: PackageManagerService;
    let storage: InMemoryPackageStorage;

    beforeEach(() => {
      storage = new InMemoryPackageStorage();
      service = new PackageManagerService(storage);
    });

    const createValidBundle = (overrides?: Partial<PackageBundle["manifest"]>): PackageBundle => {
      const manifest = {
        id: "pkg-test-tool",
        name: "Test Engineering Tool",
        version: "1.0.0",
        type: "skill-package" as const,
        schemaVersion: 1,
        description: "A test skill package.",
        author: "DevTeam",
        compatibility: ["copilot", "claude"],
        entryFiles: [
          { path: "skills/test/SKILL.md", description: "Test skill entry", type: "skill-md" as const },
        ],
        dependencies: [],
        integrity: {
          algorithm: "sha256" as const,
          hash: "a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
          generatedAt: new Date().toISOString(),
        },
        changelog: "1.0.0 - Initial test release",
        tags: ["testing", "tools"],
        ...overrides,
      };

      return { manifest };
    };

    it("calculates deterministic SHA-256 integrity hash", () => {
      const content = { name: "AgentForge", version: "1.0.0" };
      const hash1 = service.calculateIntegrityHash(content);
      const hash2 = service.calculateIntegrityHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("compares semver versions correctly", () => {
      expect(service.compareVersions("1.0.0", "1.0.0")).toBe(0);
      expect(service.compareVersions("1.1.0", "1.0.0")).toBe(1);
      expect(service.compareVersions("1.0.0", "1.1.0")).toBe(-1);
      expect(service.compareVersions("2.0.0", "1.9.9")).toBe(1);
      expect(service.compareVersions("v1.2.3", "1.2.3")).toBe(0);
    });

    it("validates valid package bundles successfully", () => {
      const bundle = createValidBundle();
      const validation = service.validatePackage(bundle);

      expect(validation.valid).toBe(true);
      expect(validation.issues.length).toBe(0);
      expect(validation.integrityVerified).toBe(true);
    });

    it("flags missing required manifest fields", () => {
      const invalidBundle: PackageBundle = {
        manifest: {
          id: "",
          name: "",
          version: "",
          type: "skill-package",
          schemaVersion: 0,
          description: "",
          author: "",
          compatibility: [],
          entryFiles: [],
          dependencies: [],
          integrity: { algorithm: "sha256", hash: "", generatedAt: "" },
          changelog: "",
          tags: [],
        },
      };

      const validation = service.validatePackage(invalidBundle);
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain("Package ID is required.");
      expect(validation.issues).toContain("Package name is required.");
      expect(validation.issues).toContain("Package version is required.");
      expect(validation.issues).toContain("Invalid or missing schema version.");
      expect(validation.issues).toContain("Package must declare at least one entry file.");
    });

    it("enforces security check: warns that executable scripts are NEVER automatically executed", () => {
      const scriptBundle = createValidBundle({
        id: "pkg-with-script",
        entryFiles: [
          { path: "scripts/setup.sh", description: "Shell script", type: "resource" as any },
          { path: "skills/run.md", description: "Skill", type: "skill-md" },
        ],
      });

      const validation = service.validatePackage(scriptBundle);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some((w) => w.includes("NEVER automatically executed"))).toBe(true);
    });

    it("detects duplicate versions and downgrade conflicts", async () => {
      const bundleV1 = createValidBundle({ id: "pkg-conflict-test", version: "1.0.0" });
      await service.installPackage(bundleV1, "workspace", false);

      // Duplicate check
      const duplicateValidation = service.validatePackage(bundleV1);
      expect(duplicateValidation.duplicateOrConflict?.conflictType).toBe("duplicate");

      // Downgrade check
      const bundleOlder = createValidBundle({ id: "pkg-conflict-test", version: "0.9.0" });
      const downgradeValidation = service.validatePackage(bundleOlder);
      expect(downgradeValidation.duplicateOrConflict?.conflictType).toBe("downgrade");

      // Upgrade check
      const bundleNewer = createValidBundle({ id: "pkg-conflict-test", version: "1.1.0" });
      const upgradeValidation = service.validatePackage(bundleNewer);
      expect(upgradeValidation.duplicateOrConflict?.conflictType).toBe("upgrade");
    });

    it("installs a package and auto-creates a backup snapshot on upgrade", async () => {
      const bundleV1 = createValidBundle({ id: "pkg-lifecycle", version: "1.0.0" });
      await service.installPackage(bundleV1, "workspace", true);

      const installed = service.listPackages({ query: "pkg-lifecycle" });
      expect(installed.length).toBe(1);
      expect(installed[0].installedVersion).toBe("1.0.0");

      // Upgrade to 1.1.0
      const bundleV2 = createValidBundle({ id: "pkg-lifecycle", version: "1.1.0" });
      await service.installPackage(bundleV2, "workspace", true);

      const upgraded = service.listPackages({ query: "pkg-lifecycle" });
      expect(upgraded[0].installedVersion).toBe("1.1.0");

      // Verify backup was created
      const backups = service.listBackups();
      const pkgBackup = backups.find((b) => b.packageId === "pkg-lifecycle");
      expect(pkgBackup).toBeDefined();
      expect(pkgBackup?.version).toBe("1.0.0");
    });

    it("removes a package and records backup snapshot", async () => {
      const bundle = createValidBundle({ id: "pkg-to-remove", version: "1.0.0" });
      await service.installPackage(bundle, "workspace", false);

      const removed = await service.removePackage("pkg-to-remove", true);
      expect(removed).toBe(true);
      expect(service.listPackages({ query: "pkg-to-remove" }).length).toBe(0);

      const backups = service.listBackups();
      const removedBackup = backups.find((b) => b.packageId === "pkg-to-remove");
      expect(removedBackup).toBeDefined();
    });

    it("restores a package from backup snapshot", async () => {
      const bundle = createValidBundle({ id: "pkg-restore-me", version: "1.0.0" });
      await service.installPackage(bundle, "workspace", false);

      // Create snapshot
      const backup = service.createBackupSnapshot(
        "pkg-restore-me",
        "Restore Test Package",
        "1.0.0",
        "Manual snapshot",
        { id: "pkg-restore-me", manifest: bundle.manifest, status: "installed", installedVersion: "1.0.0" }
      );

      // Remove package
      await service.removePackage("pkg-restore-me", false);
      expect(service.listPackages({ query: "pkg-restore-me" }).length).toBe(0);

      // Restore
      const restored = service.restoreBackup(backup.id);
      expect(restored).toBeDefined();
      expect(restored?.manifest.id).toBe("pkg-restore-me");
      expect(service.listPackages({ query: "pkg-restore-me" }).length).toBe(1);
    });

    it("exports a package bundle with computed SHA-256 integrity", () => {
      const exported = service.exportPackageBundle(
        { id: "pkg-exported", name: "Exported Tool", version: "1.0.0" },
        { files: [{ path: "test.txt", content: "Hello AgentForge" }] }
      );

      expect(exported.manifest.id).toBe("pkg-exported");
      expect(exported.manifest.integrity.algorithm).toBe("sha256");
      expect(exported.manifest.integrity.hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("PlatformIntegrationService", () => {
    let service: PlatformIntegrationService;

    beforeEach(() => {
      service = new PlatformIntegrationService();
    });

    it("provides entries for GitHub Copilot, Claude / Claude Code, and OpenAI API", () => {
      const list = service.listIntegrations();
      expect(list.length).toBe(3);

      const ids = list.map((i) => i.id);
      expect(ids).toContain("copilot");
      expect(ids).toContain("claude");
      expect(ids).toContain("openai");
    });

    it("displays supported features and documented limitations for each platform", () => {
      const list = service.listIntegrations();
      for (const item of list) {
        expect(item.supportedFeatures.length).toBeGreaterThan(0);
        expect(item.limitations.length).toBeGreaterThan(0);
        expect(item.documentationUrl).toBeDefined();
      }
    });

    it("truthfully validates using Mock Registry when mock mode is enabled", async () => {
      const copilot = service.getIntegration("copilot");
      expect(copilot?.isMock).toBe(true);

      const validation = await service.validateConnection("copilot");
      expect(validation.valid).toBe(true);
      expect(validation.status).toBe("mock_active");
      expect(validation.isMock).toBe(true);
      expect(validation.message).toContain("Mock Registry");
    });

    it("does not claim connected when live credentials are not verified", async () => {
      // Configure OpenAI as live without credentials
      service.configureIntegration("openai", {
        isMock: false,
        hasStoredSecret: false,
      });

      const validation = await service.validateConnection("openai");
      expect(validation.valid).toBe(false);
      expect(validation.status).toBe("disconnected");
      expect(validation.message).toContain("No secret token or credential found");
    });

    it("disconnects integration and resets status to disconnected", () => {
      const disconnected = service.disconnectIntegration("copilot");
      expect(disconnected.connectionStatus).toBe("disconnected");
      expect(disconnected.hasStoredSecret).toBe(false);
      expect(disconnected.lastValidationMessage).toContain("Disconnected by user");
    });

    it("retrieves capability matrix for target platform", () => {
      const caps = service.getCapabilities("copilot");
      expect(caps.matrix.length).toBeGreaterThan(0);
      expect(caps.adapterDetails).toBeDefined();
      expect(caps.adapterDetails?.name).toContain("Copilot");
    });
  });

  describe("Settings Configuration & Defaults", () => {
    it("preserves required baseline settings", () => {
      expect(DEFAULT_SETTINGS.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
      expect(DEFAULT_SETTINGS.theme).toBe("light");
      expect(DEFAULT_SETTINGS.defaultPlatform).toBe("neutral");
      expect(DEFAULT_SETTINGS.telemetry).toBe(false);
    });

    it("implements all Prompt 20 settings defaults", () => {
      expect(DEFAULT_SETTINGS.defaultStartPage).toBe("dashboard");
      expect(DEFAULT_SETTINGS.confirmDestructiveActions).toBe(true);
      expect(DEFAULT_SETTINGS.skillExportPreferences?.format).toBe("markdown");
      expect(DEFAULT_SETTINGS.installationScope).toBe("workspace");
      expect(DEFAULT_SETTINGS.agentPermissionDefaults?.fileSystem).toBe("readonly");
      expect(DEFAULT_SETTINGS.agentPermissionDefaults?.humanApprovalRequired).toBe(true);
      expect(DEFAULT_SETTINGS.pipelineDefaults?.timeoutMs).toBe(30000);
      expect(DEFAULT_SETTINGS.pipelineDefaults?.maxRetries).toBe(2);
      expect(DEFAULT_SETTINGS.approvalPreferences?.autoPauseOnGate).toBe(true);
      expect(DEFAULT_SETTINGS.storageLocation).toBeDefined();
      expect(DEFAULT_SETTINGS.storageLocation).toContain("Workspace");
    });
  });
});
