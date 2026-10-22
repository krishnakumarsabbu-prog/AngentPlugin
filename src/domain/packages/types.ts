export type PackageType =
  | "skill-package"
  | "agent-bundle"
  | "workflow-pipeline"
  | "full-kit";

export interface PackageEntryFile {
  path: string;
  description: string;
  type: "skill-md" | "agent-config" | "workflow-json" | "reference-doc" | "resource";
}

export interface PackageDependency {
  id: string;
  name: string;
  versionRange: string;
  optional?: boolean;
}

export interface PackageIntegrity {
  algorithm: "sha256";
  hash: string;
  signedBy?: string;
  generatedAt: string;
}

export interface PackageManagerManifest {
  id: string;
  name: string;
  version: string;
  type: PackageType;
  schemaVersion: number;
  description: string;
  author: string;
  compatibility: string[];
  entryFiles: PackageEntryFile[];
  dependencies: PackageDependency[];
  integrity: PackageIntegrity;
  changelog: string;
  tags: string[];
  license?: string;
  homepage?: string;
}

export type PackageManifest = PackageManagerManifest;

export interface PackageBundle {
  manifest: PackageManagerManifest;
  skills?: import("../skills/types").Skill[];
  agents?: import("../agents/types").Agent[];
  workflows?: import("../workflows/types").Workflow[];
  files?: { path: string; content: string }[];
  isSimulated?: boolean;
}

export interface InstalledPackageRecord {
  id: string;
  manifest: PackageManifest;
  status: "installed" | "update-available" | "conflict";
  installedAt: string;
  installedVersion: string;
  availableVersion?: string;
  scope: "workspace" | "global";
  backupAvailable?: boolean;
}

export interface PackageValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  compatibilityWarnings: string[];
  integrityVerified: boolean;
  duplicateOrConflict?: {
    existingVersion: string;
    newVersion: string;
    conflictType: "duplicate" | "downgrade" | "upgrade";
    message: string;
  };
}

export interface PackageBackupRecord {
  id: string;
  packageId: string;
  packageName: string;
  version: string;
  createdAt: string;
  reason: string;
  dataSnapshot: unknown;
}
