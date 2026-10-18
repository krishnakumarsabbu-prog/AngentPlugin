import { Skill } from "../domain/skills/types";

export interface SkillVersionEntry {
  version: string;
  timestamp: string;
  summary: string;
  snapshot: Skill;
}

export interface SkillHistory {
  id: string;
  currentVersion: string;
  entries: SkillVersionEntry[];
}

export interface HistoryStore {
  get(id: string): SkillHistory | undefined;
  record(skill: Skill, summary?: string): void;
  remove(id: string): void;
  list(): SkillHistory[];
}

export function createHistoryStore(): HistoryStore {
  const map = new Map<string, SkillHistory>();

  return {
    get(id) {
      return map.get(id);
    },
    list() {
      return [...map.values()].map(cloneHistory);
    },
    record(skill, summary) {
      const existing = map.get(skill.id);
      const entry: SkillVersionEntry = {
        version: skill.version,
        timestamp: skill.updatedAt,
        summary: summary ?? `Saved version ${skill.version}`,
        snapshot: cloneSkill(skill),
      };
      if (!existing) {
        map.set(skill.id, {
          id: skill.id,
          currentVersion: skill.version,
          entries: [entry],
        });
        return;
      }
      if (existing.entries.length > 0 && existing.entries[0].version === skill.version) {
        existing.entries[0] = entry;
      } else {
        existing.entries.unshift(entry);
        if (existing.entries.length > 20) {
          existing.entries.length = 20;
        }
      }
      existing.currentVersion = skill.version;
    },
    remove(id) {
      map.delete(id);
    },
  };
}

export function appendChangelog(existing: string, version: string, note: string): string {
  const header = `${version} — ${note}`;
  if (!existing.trim()) return header;
  if (existing.includes(`${version} —`)) return existing;
  return `${header}\n${existing}`;
}

function cloneSkill(skill: Skill): Skill {
  return {
    ...skill,
    tags: [...skill.tags],
    resources: skill.resources.map((r) => ({ ...r })),
    compatibility: [...skill.compatibility],
    otherTargets: [...skill.otherTargets],
    requiredTools: [...skill.requiredTools],
    permissions: [...skill.permissions],
  };
}

function cloneHistory(history: SkillHistory): SkillHistory {
  return {
    id: history.id,
    currentVersion: history.currentVersion,
    entries: history.entries.map((e) => ({ ...e, snapshot: cloneSkill(e.snapshot) })),
  };
}
