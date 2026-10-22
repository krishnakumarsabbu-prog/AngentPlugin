import { AppSettings } from "../services/interfaces";
import { CURRENT_SCHEMA_VERSION } from "./migrations";

export const STORAGE_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  theme: "light",
  defaultPlatform: "neutral",
  telemetry: false,
  autoSave: true,
  recentRoute: "dashboard",
  defaultStartPage: "dashboard",
  confirmDestructiveActions: true,
  skillExportPreferences: {
    format: "markdown",
    includeMetadata: true,
    prettyPrint: true,
  },
  installationScope: "workspace",
  agentPermissionDefaults: {
    fileSystem: "readonly",
    shell: false,
    network: false,
    humanApprovalRequired: true,
  },
  pipelineDefaults: {
    timeoutMs: 30000,
    maxRetries: 2,
  },
  approvalPreferences: {
    autoPauseOnGate: true,
    requireNote: false,
  },
  storageLocation: ".agentforge/storage (Workspace)",
};
