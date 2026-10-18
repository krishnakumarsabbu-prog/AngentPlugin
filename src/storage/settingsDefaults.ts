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
};
