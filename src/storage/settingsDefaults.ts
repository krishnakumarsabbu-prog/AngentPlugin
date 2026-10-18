import { AppSettings } from "../services/interfaces";

export const STORAGE_SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  theme: "light",
  defaultPlatform: "neutral",
  telemetry: false,
  autoSave: true,
  recentRoute: "dashboard",
};
