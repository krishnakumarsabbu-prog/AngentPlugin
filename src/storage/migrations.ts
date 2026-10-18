import { PersistedState } from "../storage/LocalRepository";
import { DEFAULT_SETTINGS } from "./settingsDefaults";

export const CURRENT_SCHEMA_VERSION = 2;

export interface PersistedStateV1 {
  schemaVersion: 1;
  settings: PersistedState["settings"];
  skills: PersistedState["skills"];
  agents: PersistedState["agents"];
  workflows: PersistedState["workflows"];
  executions: PersistedState["executions"];
}

export interface PersistedStateV2 extends Omit<PersistedStateV1, "schemaVersion"> {
  schemaVersion: 2;
  history: Array<{
    id: string;
    currentVersion: string;
    entries: Array<{
      version: string;
      timestamp: string;
      summary: string;
      snapshot: PersistedState["skills"][number];
    }>;
  }>;
}

export type AnyPersistedState = PersistedStateV1 | PersistedStateV2;

export interface Migration {
  from: number;
  to: number;
  migrate(state: AnyPersistedState): AnyPersistedState;
}

export const MIGRATIONS: Migration[] = [
  {
    from: 1,
    to: 2,
    migrate(state) {
      const v1 = state as PersistedStateV1;
      const v2: PersistedStateV2 = {
        ...v1,
        schemaVersion: 2,
        history: v1.skills.map((s) => ({
          id: s.id,
          currentVersion: s.version,
          entries: [
            {
              version: s.version,
              timestamp: s.updatedAt,
              summary: `Imported from schema v1`,
              snapshot: s,
            },
          ],
        })),
      };
      return v2;
    },
  },
];

export function migrateToCurrent(raw: unknown): PersistedStateV2 {
  if (!raw || typeof raw !== "object") {
    return freshState();
  }
  let state = raw as AnyPersistedState;
  if (typeof state.schemaVersion !== "number") {
    return freshState();
  }
  let current = state.schemaVersion;
  if (current > CURRENT_SCHEMA_VERSION) {
    return freshState();
  }
  while (current < CURRENT_SCHEMA_VERSION) {
    const migration = MIGRATIONS.find((m) => m.from === current);
    if (!migration) {
      return freshState();
    }
    state = migration.migrate(state);
    current = state.schemaVersion;
  }
  return state as PersistedStateV2;
}

export function freshState(): PersistedStateV2 {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    skills: [],
    agents: [],
    workflows: [],
    executions: [],
    history: [],
  };
}
