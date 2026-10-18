import { sendRequest, hasVsCodeApi } from "./vscodeApi";
import { demoSkillsStore } from "../data/demoData";
import type { Skill } from "../types";

export type SkillSortKey = "name" | "updatedAt" | "version" | "category";

export interface SkillQuery {
  search: string;
  categories: string[];
  platforms: string[];
  sort: SkillSortKey;
  direction: "asc" | "desc";
}

export interface SkillsStore {
  list(): Promise<Skill[]>;
  get(id: string): Promise<Skill>;
  create(input: Partial<Skill>): Promise<Skill>;
  update(id: string, patch: Partial<Skill>): Promise<Skill>;
  duplicate(id: string): Promise<Skill>;
  remove(id: string): Promise<void>;
}

function requireSkill(skill: unknown, context: string): Skill {
  if (!skill || typeof skill !== "object" || typeof (skill as Skill).id !== "string") {
    throw new Error(`${context}: unexpected response shape`);
  }
  return skill as Skill;
}

const hostStore: SkillsStore = {
  async list() {
    const data = await sendRequest<unknown>("skills.list");
    if (!Array.isArray(data)) throw new Error("skills.list: unexpected response shape");
    return data.filter(
      (s): s is Skill => !!s && typeof s === "object" && typeof (s as Skill).id === "string",
    );
  },
  async get(id) {
    return requireSkill(await sendRequest<unknown>("skills.get", { id }), "skills.get");
  },
  async create(input) {
    return requireSkill(await sendRequest<unknown>("skills.create", { skill: input }), "skills.create");
  },
  async update(id, patch) {
    return requireSkill(
      await sendRequest<unknown>("skills.update", { skill: { ...patch, id } }),
      "skills.update",
    );
  },
  async duplicate(id) {
    return requireSkill(await sendRequest<unknown>("skills.duplicate", { id }), "skills.duplicate");
  },
  async remove(id) {
    await sendRequest("skills.delete", { id });
  },
};

const browserStore: SkillsStore = {
  async list() {
    return demoSkillsStore.list();
  },
  async get(id) {
    const skill = demoSkillsStore.get(id);
    if (!skill) throw new Error(`Skill not found: ${id}`);
    return skill;
  },
  async create(input) {
    return demoSkillsStore.create(input);
  },
  async update(id, patch) {
    return demoSkillsStore.update(id, patch);
  },
  async duplicate(id) {
    return demoSkillsStore.duplicate(id);
  },
  async remove(id) {
    demoSkillsStore.remove(id);
  },
};

export function getSkillsStore(): SkillsStore {
  return hasVsCodeApi() ? hostStore : browserStore;
}
