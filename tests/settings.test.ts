import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, STORAGE_SCHEMA_VERSION } from "../src/storage/settingsDefaults";

describe("settings defaults", () => {
  it("has a schema version matching the storage version", () => {
    expect(DEFAULT_SETTINGS.schemaVersion).toBe(STORAGE_SCHEMA_VERSION);
  });

  it("defaults to light theme and neutral platform", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("light");
    expect(DEFAULT_SETTINGS.defaultPlatform).toBe("neutral");
  });

  it("disables telemetry by default", () => {
    expect(DEFAULT_SETTINGS.telemetry).toBe(false);
  });
});
