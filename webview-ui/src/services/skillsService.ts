import { sendRequest, hasVsCodeApi } from "./vscodeApi";
import { demoSkillsStore } from "../data/demoData";
import type { Skill } from "../types";
import type { ValidationReport } from "../components/validationTypes";

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
  validate(input: Partial<Skill>, id?: string): Promise<ValidationReport>;
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
  async validate(input, id) {
    return sendRequest<ValidationReport>("skills.validate", { skill: input, id });
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
  async validate() {
    return { valid: true, errors: [], warnings: [], suggestions: [] };
  },
};

export function getSkillsStore(): SkillsStore {
  return hasVsCodeApi() ? hostStore : browserStore;
}

export interface SkillResourceFile {
  ok: boolean;
  content: string;
  path: string;
  resourceName: string;
  language: string;
}

export async function getSkillResourceContent(skillId: string, resourceName: string): Promise<SkillResourceFile> {
  if (hasVsCodeApi()) {
    try {
      const res = await sendRequest<SkillResourceFile>("skills.getResourceContent", { skillId, resourceName });
      if (res && typeof res.content === "string") {
        return res;
      }
    } catch {
      // fallback
    }
  }

  // Fallback content when running in standalone browser dev preview
  return {
    ok: true,
    content: `# ${resourceName}\n\n> [!NOTE]\n> Enterprise Security Audit supporting resource for **${skillId}**.\n\n## Overview\nThis document defines the methodology, attack surfaces, and verification contracts for **${resourceName}**.\n\n### Key Audit Areas\n- **Phase 1 Reconnaissance**: Architecture mapping and trust boundaries\n- **Phase 2 Hunting**: Coverage-led vulnerability investigation\n- **Phase 3 Candidate Validation**: Independent verifier challenges\n- **Phase 4 Structured Findings**: Deterministic findings schema adherence\n- **Phase 5 Verification**: Exact file path and line bounds validation\n- **Phase 6 Reporting**: Validated report generation\n\n\`\`\`json\n{\n  "resource": "${resourceName}",\n  "status": "active",\n  "verified": true\n}\n\`\`\`\n\n### Execution Rules\n1. Mode A (Repository-Local Static Audit) is enforced by default.\n2. No sandbox means zero target-controlled code execution.\n3. Discovered candidates without deterministic proof remain \`needs_validation\`.\n`,
    path: `skills/${skillId}/${resourceName}`,
    resourceName,
    language: resourceName.endsWith(".json") ? "json" : resourceName.endsWith(".cjs") || resourceName.endsWith(".js") ? "javascript" : "markdown",
  };
}

export async function saveSkillResourceContent(skillId: string, resourceName: string, content: string): Promise<void> {
  if (hasVsCodeApi()) {
    await sendRequest("skills.saveResourceContent", { skillId, resourceName, content });
  }
}

export interface BatchInstallResult {
  ok: boolean;
  platform: string;
  count: number;
  results?: any[];
}

export async function installSkill(
  id: string,
  platform: "copilot" | "claude" | "openai" | "neutral",
  scope: "workspace" | "user" = "workspace"
): Promise<any> {
  if (hasVsCodeApi()) {
    return sendRequest<any>("skills.install", { id, platform, scope });
  }
  return { ok: true, platform, simulated: true };
}

export async function batchInstallSkills(
  ids: string[],
  platform: "copilot" | "claude" | "openai" | "neutral",
  scope: "workspace" | "user" = "workspace"
): Promise<BatchInstallResult> {
  if (hasVsCodeApi()) {
    return sendRequest<BatchInstallResult>("skills.batchInstall", { ids, platform, scope });
  }
  return { ok: true, platform, count: ids.length, results: [] };
}

