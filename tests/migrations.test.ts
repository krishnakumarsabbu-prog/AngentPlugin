import { describe, it, expect } from "vitest";
import { migrateToCurrent, MIGRATIONS, CURRENT_SCHEMA_VERSION, freshState, PersistedStateV1 } from "../src/storage/migrations";
import { DEFAULT_SETTINGS } from "../src/storage/settingsDefaults";

describe("migrations", () => {
  it("has a v1->v2 migration", () => {
    expect(MIGRATIONS.some((m) => m.from === 1 && m.to === 2)).toBe(true);
  });

  it("migrates a v1 state to current schema version", () => {
    const v1: PersistedStateV1 = {
      schemaVersion: 1,
      settings: { ...DEFAULT_SETTINGS },
      skills: [
        {
          id: "skill-a",
          name: "A",
          description: "d",
          version: "1.0.0",
          author: "t",
          category: "General",
          tags: [],
          instructions: "Do a.",
          frontmatter: "",
          resources: [],
          compatibility: ["copilot"],
          otherTargets: [],
          requiredTools: [],
          permissions: [],
          changelog: "",
          requirements: "",
          status: "Draft",
          installationState: "not-installed",
          createdAt: "2026-10-01T00:00:00Z",
          updatedAt: "2026-10-01T00:00:00Z",
        },
      ],
      agents: [],
      workflows: [],
      executions: [],
    };
    const migrated = migrateToCurrent(v1);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.history.length).toBe(1);
    expect(migrated.history[0].id).toBe("skill-a");
    expect(migrated.skills).toEqual(v1.skills);
  });

  it("returns a fresh state for malformed input", () => {
    expect(migrateToCurrent(null).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrateToCurrent({}).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrateToCurrent({ schemaVersion: "nope" }).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("returns a fresh state when no migration exists for the version", () => {
    expect(migrateToCurrent({ schemaVersion: 99 }).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("freshState has empty arrays and current schema version", () => {
    const fresh = freshState();
    expect(fresh.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(fresh.skills).toEqual([]);
    expect(fresh.history).toEqual([]);
  });
});
