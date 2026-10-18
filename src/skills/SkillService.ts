import { Skill, SkillSummary } from "../domain/skills/types";
import { ISkillsStore } from "../services/interfaces";
import {
  ValidationReport,
  ValidationSeverity,
  validateSkill,
  compareDraftToStored,
  defaultValidationContext,
} from "./SkillValidator";
import { HistoryStore } from "./SkillHistory";
import { appendChangelog } from "./SkillHistory";

export interface SkillServiceDeps {
  store: ISkillsStore;
  history: HistoryStore;
}

export class SkillService {
  constructor(private deps: SkillServiceDeps) {}

  async list(): Promise<Skill[]> {
    return this.deps.store.list();
  }

  async summaries(): Promise<SkillSummary[]> {
    return this.deps.store.summaries();
  }

  async get(id: string): Promise<Skill | undefined> {
    return this.deps.store.getSkill(id);
  }

  async create(input: Partial<Skill>): Promise<{ skill: Skill; report: ValidationReport }> {
    const all = await this.deps.store.list();
    const report = validateSkill(input, {
      ...defaultValidationContext(),
      existingIds: new Set(all.map((s) => s.id)),
    });
    if (!report.valid) {
      throw new SkillValidationError(report);
    }
    const skill = await this.deps.store.createSkill(input);
    this.deps.history.record(skill, `Created ${skill.version}`);
    return { skill, report };
  }

  async update(id: string, patch: Partial<Skill>): Promise<{ skill: Skill; report: ValidationReport }> {
    const existing = await this.deps.store.getSkill(id);
    if (!existing) {
      throw new Error(`Skill not found: ${id}`);
    }
    const merged: Skill = { ...existing, ...patch, id };
    const all = await this.deps.store.list();
    const report = validateSkill(merged, {
      ...defaultValidationContext(),
      existingIds: new Set(all.map((s) => s.id)),
      selfId: id,
    });
    if (!report.valid) {
      throw new SkillValidationError(report);
    }
    const versionChanged = (patch.version ?? existing.version) !== existing.version;
    const enrichedPatch: Partial<Skill> = versionChanged
      ? { ...patch, changelog: appendChangelog(patch.changelog ?? existing.changelog, patch.version ?? existing.version, `Updated`) }
      : patch;
    const skill = await this.deps.store.updateSkill(id, enrichedPatch);
    this.deps.history.record(skill, `Saved ${skill.version}`);
    return { skill, report };
  }

  async duplicate(id: string): Promise<Skill> {
    const copy = await this.deps.store.duplicateSkill(id);
    this.deps.history.record(copy, `Duplicated from ${id}`);
    return copy;
  }

  async remove(id: string): Promise<void> {
    await this.deps.store.deleteSkill(id);
    this.deps.history.remove(id);
  }

  validate(draft: Partial<Skill>, selfId?: string): Promise<ValidationReport> {
    return this.withContext(draft, selfId).then((ctx) => validateSkill(draft, ctx));
  }

  async withContext(draft: Partial<Skill>, selfId?: string) {
    const all = await this.deps.store.list();
    return {
      ...defaultValidationContext(),
      existingIds: new Set(all.map((s) => s.id)),
      selfId,
    };
  }

  async hasUnsavedChanges(id: string, draft: Partial<Skill>): Promise<boolean> {
    const stored = await this.deps.store.getSkill(id);
    return compareDraftToStored(draft, stored).changed;
  }

  async diff(id: string, draft: Partial<Skill>) {
    const stored = await this.deps.store.getSkill(id);
    return compareDraftToStored(draft, stored);
  }

  history(id: string) {
    return this.deps.history.get(id);
  }
}

export class SkillValidationError extends Error {
  constructor(public report: ValidationReport) {
    super(formatFindings(report.errors));
    this.name = "SkillValidationError";
  }
}

export function formatFindings(findings: Array<{ severity: ValidationSeverity; field: string; message: string }>): string {
  if (findings.length === 0) return "Validation failed";
  return findings.map((f) => `[${f.field}] ${f.message}`).join("; ");
}
