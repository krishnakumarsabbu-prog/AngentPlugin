import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Pencil, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Skill, PlatformCompatibility, SkillResource } from "../../types";
import {
  buildSkillMarkdown,
  draftToSkill,
  suggestIdentifier,
  validateDraft,
  OPENAI_WARNING,
  type DraftSkill,
} from "../../services/skillMd";
import { renderMarkdown } from "../../services/markdown";
import { getSkillsStore } from "../../services/skillsService";

interface SkillFormPageProps {
  skillId: string | null;
  onNavigate: (route: string) => void;
  onSkillsChanged: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const PLATFORM_OPTIONS: { id: PlatformCompatibility; label: string; hint?: string }[] = [
  { id: "copilot", label: "GitHub Copilot" },
  { id: "claude", label: "Claude / Claude Code" },
  { id: "openai", label: "OpenAI API-based integrations", hint: OPENAI_WARNING },
  { id: "neutral", label: "Platform neutral" },
];

const RESOURCE_KINDS: { id: SkillResource["kind"]; label: string }[] = [
  { id: "script", label: "Script" },
  { id: "reference", label: "Reference" },
  { id: "example", label: "Example" },
  { id: "test", label: "Test case" },
  { id: "template", label: "Template" },
  { id: "file", label: "File" },
];

const EMPTY_DRAFT: DraftSkill = {
  name: "",
  identifier: "",
  description: "",
  version: "0.1.0",
  author: "",
  category: "",
  tagsText: "",
  instructions: "",
  frontmatter: "",
  resources: [],
  compatibility: [],
  otherTargetsText: "",
  requiredToolsText: "",
  permissionsText: "",
  changelog: "",
  requirements: "",
};

function skillToDraft(skill: Skill): DraftSkill {
  return {
    name: skill.name,
    identifier: skill.id,
    description: skill.description,
    version: skill.version,
    author: skill.author,
    category: skill.category === "General" ? "" : skill.category,
    tagsText: skill.tags.join(", "),
    instructions: skill.instructions,
    frontmatter: skill.frontmatter,
    resources: skill.resources.map((r) => ({ ...r })),
    compatibility: [...skill.compatibility],
    otherTargetsText: skill.otherTargets.join(", "),
    requiredToolsText: skill.requiredTools.join(", "),
    permissionsText: skill.permissions.join(", "),
    changelog: skill.changelog,
    requirements: skill.requirements,
  };
}

function draftEquals(a: DraftSkill, b: DraftSkill): boolean {
  return (
    a.name === b.name &&
    a.identifier === b.identifier &&
    a.description === b.description &&
    a.version === b.version &&
    a.author === b.author &&
    a.category === b.category &&
    a.tagsText === b.tagsText &&
    a.instructions === b.instructions &&
    a.frontmatter === b.frontmatter &&
    a.otherTargetsText === b.otherTargetsText &&
    a.requiredToolsText === b.requiredToolsText &&
    a.permissionsText === b.permissionsText &&
    a.changelog === b.changelog &&
    a.requirements === b.requirements &&
    a.compatibility.length === b.compatibility.length &&
    a.compatibility.every((p) => b.compatibility.includes(p)) &&
    a.resources.length === b.resources.length &&
    a.resources.every((r, i) => {
      const o = b.resources[i];
      return (
        o &&
        r.id === o.id &&
        r.name === o.name &&
        r.kind === o.kind &&
        r.description === o.description
      );
    })
  );
}

export function SkillFormPage({ skillId, onNavigate, onSkillsChanged, onToast, onDirtyChange }: SkillFormPageProps) {
  const store = useMemo(() => getSkillsStore(), []);
  const isEdit = skillId !== null;

  const [draft, setDraft] = useState<DraftSkill>(EMPTY_DRAFT);
  const [baseline, setBaseline] = useState<DraftSkill>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [validated, setValidated] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const all = await store.list();
        if (!active) return;
        setExistingIds(new Set(all.map((s) => s.id)));
        if (isEdit && skillId) {
          const s = await store.get(skillId);
          if (!active) return;
          const d = skillToDraft(s);
          setDraft(d);
          setBaseline(d);
        }
        setLoading(false);
      } catch (e) {
        if (!active) return;
        onToast(e instanceof Error ? e.message : "Failed to load skill", "error");
        onNavigate("skills-studio");
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [skillId]);

  const update = (patch: Partial<DraftSkill>) => setDraft((prev) => ({ ...prev, ...patch }));

  const handleNameChange = (value: string) => {
    const patch: Partial<DraftSkill> = { name: value };
    const autoSlug = suggestIdentifier(baseline.identifier || EMPTY_DRAFT.identifier);
    if (!draft.identifier || draft.identifier === autoSlug) {
      patch.identifier = suggestIdentifier(value);
    }
    update(patch);
  };

  const dirty = !draftEquals(draft, baseline);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  const { errors, warnings } = useMemo(() => validateDraft(draft), [draft]);
  const issues = [...errors, ...warnings];

  const preview = useMemo(
    () => (showPreview ? buildSkillMarkdown(draftToSkill(draft)) : ""),
    [showPreview, draft],
  );

  const issuesFor = (field: string) => issues.filter((i) => i.field === field);

  const fieldIssues = (field: string) => {
    const list = issuesFor(field);
    if (list.length === 0) return null;
    return (
      <>
        {list.map((issue, idx) => (
          <span
            key={idx}
            className={issue.severity === "error" ? "field-error" : "field-warning"}
            role={issue.severity === "error" ? "alert" : undefined}
          >
            {issue.severity === "error" ? <AlertTriangle size={11} /> : null} {issue.message}
          </span>
        ))}
      </>
    );
  };

  const hasBlockingErrors = errors.length > 0;

  const navigateAway = (route: string) => {
    onSkillsChanged();
    onNavigate(route);
  };

  const handleCancel = () => {
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      navigateAway("skills-studio");
    }
  };

  const handleSave = async (mode: "draft" | "validate-only" = "draft") => {
    if (hasBlockingErrors) {
      setValidated(true);
      return;
    }
    if (mode === "validate-only") {
      setValidated(true);
      if (!hasBlockingErrors) {
        onToast(
          warnings.length > 0
            ? "Validation passed with warnings."
            : "Validation passed. Ready to save.",
          warnings.length > 0 ? "error" : "success",
        );
      }
      return;
    }
    setSaving(true);
    try {
      if (isEdit && skillId) {
        const trimmed = draft.identifier.trim();
        if (trimmed !== skillId && existingIds.has(trimmed)) {
          onToast(`Identifier "${trimmed}" is already in use.`, "error");
          return;
        }
        if (trimmed !== skillId) {
          const created = await store.create(draftToSkill(draft));
          await store.remove(skillId);
          onToast(`Saved as "${created.name}"`, "success");
        } else {
          await store.update(skillId, draftToSkill(draft));
          onToast(`Saved skill "${draft.name.trim()}"`, "success");
        }
      } else {
        const created = await store.create(draftToSkill(draft));
        onToast(`Created skill "${created.name}"`, "success");
      }
      setBaseline(draft);
      setValidated(false);
      navigateAway("skills-studio");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to save skill", "error");
    } finally {
      setSaving(false);
    }
  };

  const addResource = () => {
    const id = `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    update({
      resources: [...draft.resources, { id, name: "", kind: "reference", description: "" }],
    });
  };

  const updateResource = (index: number, patch: Partial<SkillResource>) => {
    update({
      resources: draft.resources.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    });
  };

  const removeResource = (index: number) => {
    update({ resources: draft.resources.filter((_, i) => i !== index) });
  };

  const togglePlatform = (p: PlatformCompatibility) => {
    update({
      compatibility: draft.compatibility.includes(p)
        ? draft.compatibility.filter((x) => x !== p)
        : [...draft.compatibility, p],
    });
  };

  if (loading) {
    return (
      <div className="loading-state">
        <span className="spinner large" />
        Loading skill…
      </div>
    );
  }

  const idIssues = issuesFor("identifier");

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? "Edit Skill" : "Create Skill"}</h1>
        <p className="page-subtitle">
          {isEdit
            ? "Update identity, instructions, compatibility, resources, and configuration."
            : "Define identity, instructions, compatibility, resources, and configuration."}
        </p>
        {dirty && (
          <p className="page-description" style={{ color: "var(--warning)" }}>
            Unsaved changes — use Save Draft or Validate before leaving.
          </p>
        )}
        <div className="page-actions">
          <button className="btn secondary" onClick={handleCancel}>
            <ArrowLeft size={14} /> Cancel
          </button>
          <button className="btn secondary" onClick={() => handleSave("validate-only")} disabled={saving}>
            <CheckCircle2 size={14} /> Validate
          </button>
          <button className="btn primary" onClick={() => handleSave("draft")} disabled={saving}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
        </div>
      </div>

      {validated && hasBlockingErrors && (
        <div className="card validation-banner error">
          <AlertTriangle size={16} />
          <div>
            <strong>Cannot save yet.</strong> Fix the {errors.length} highlighted field
            {errors.length === 1 ? "" : "s"} below.
          </div>
        </div>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2 className="card-title">Identity</h2>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="skill-name">Skill name</label>
          <input
            id="skill-name"
            className={`input${errors.some((e) => e.field === "name") ? " invalid" : ""}`}
            value={draft.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Security Audit Skill"
          />
          {fieldIssues("name")}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="skill-identifier">Unique identifier</label>
          <input
            id="skill-identifier"
            className={`input${idIssues.some((i) => i.severity === "error") ? " invalid" : ""}`}
            value={draft.identifier}
            onChange={(e) => update({ identifier: e.target.value })}
            placeholder="e.g. security-audit"
          />
          <span className="field-hint">
            Lowercase letters, numbers, and dashes. Used as the skill folder and SKILL.md id.
          </span>
          {fieldIssues("identifier")}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="skill-description">Description</label>
          <input
            id="skill-description"
            className={`input${errors.some((e) => e.field === "description") ? " invalid" : ""}`}
            value={draft.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="What does this skill do?"
          />
          {fieldIssues("description")}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
          <div className="field">
            <label className="field-label" htmlFor="skill-version">Version</label>
            <input
              id="skill-version"
              className={`input${errors.some((e) => e.field === "version") ? " invalid" : ""}`}
              value={draft.version}
              onChange={(e) => update({ version: e.target.value })}
              placeholder="1.0.0"
            />
            {fieldIssues("version")}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="skill-author">Author</label>
            <input
              id="skill-author"
              className="input"
              value={draft.author}
              onChange={(e) => update({ author: e.target.value })}
              placeholder="e.g. platform-team"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="skill-category">Category</label>
            <input
              id="skill-category"
              className="input"
              value={draft.category}
              onChange={(e) => update({ category: e.target.value })}
              placeholder="e.g. Security"
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="skill-tags">Tags</label>
          <input
            id="skill-tags"
            className="input"
            value={draft.tagsText}
            onChange={(e) => update({ tagsText: e.target.value })}
            placeholder="comma-separated, e.g. security, audit"
          />
          <span className="field-hint">Separate tags with commas.</span>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2 className="card-title">Instructions</h2>
          <button
            className="btn ghost btn-sm"
            onClick={() => setShowPreview((v) => !v)}
            aria-pressed={showPreview}
          >
            {showPreview ? <Pencil size={13} /> : <Eye size={13} />} {showPreview ? "Edit" : "Preview"}
          </button>
        </div>
        {showPreview ? (
          <div className="markdown-preview">
            {preview.trim() ? renderMarkdown(preview) : <p className="field-hint">Nothing to preview yet.</p>}
          </div>
        ) : (
          <>
            <textarea
              id="skill-instructions"
              className={`input${errors.some((e) => e.field === "instructions") ? " invalid" : ""}`}
              rows={12}
              value={draft.instructions}
              onChange={(e) => update({ instructions: e.target.value })}
              placeholder={"Step-by-step instructions the AI environment should follow.\n\nMarkdown is supported and preserved."}
              style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12 }}
            />
            <span className="field-hint">
              Markdown is preserved verbatim in the SKILL.md Instructions section.
            </span>
          </>
        )}
        {fieldIssues("instructions")}

        <div className="field" style={{ marginTop: 16 }}>
          <label className="field-label" htmlFor="skill-frontmatter">
            Extra frontmatter (optional)
          </label>
          <textarea
            id="skill-frontmatter"
            className="input"
            rows={4}
            value={draft.frontmatter}
            onChange={(e) => update({ frontmatter: e.target.value })}
            placeholder={"# extra YAML, e.g.\nvisibility: internal\nreviewers:\n  - alice"}
            style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
          <span className="field-hint">
            Preserved verbatim after the generated header. Avoid duplicate keys.
          </span>
          {fieldIssues("frontmatter")}
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2 className="card-title">Compatibility</h2>
        </div>
        <div className="chip-row">
          {PLATFORM_OPTIONS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`chip${draft.compatibility.includes(p.id) ? " active" : ""}`}
              onClick={() => togglePlatform(p.id)}
              aria-pressed={draft.compatibility.includes(p.id)}
              title={p.hint}
            >
              {p.label}
            </button>
          ))}
        </div>
        {fieldIssues("compatibility")}
        <div className="field" style={{ marginTop: 16 }}>
          <label className="field-label" htmlFor="skill-other-targets">
            Other configurable targets
          </label>
          <input
            id="skill-other-targets"
            className="input"
            value={draft.otherTargetsText}
            onChange={(e) => update({ otherTargetsText: e.target.value })}
            placeholder="comma-separated, e.g. Windsurf, Cursor"
          />
          <span className="field-hint">
            Any additional consuming tools this skill is prepared for.
          </span>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2 className="card-title">Resources</h2>
          <button className="btn secondary btn-sm" onClick={addResource}>
            <Plus size={13} /> Add resource
          </button>
        </div>
        {draft.resources.length === 0 ? (
          <p className="field-hint">
            Optional. Add scripts, references, examples, or test cases the skill may rely on.
          </p>
        ) : (
          <div className="section-list">
            {draft.resources.map((r, i) => (
              <div className="resource-row" key={r.id} style={{ flexWrap: "wrap", gap: 8 }}>
                <input
                  className="input"
                  style={{ flex: "1 1 140px" }}
                  value={r.name}
                  onChange={(e) => updateResource(i, { name: e.target.value })}
                  placeholder="File name, e.g. check.sh"
                  aria-label={`Resource ${i + 1} name`}
                />
                <select
                  className="select"
                  style={{ width: "auto", minWidth: 120 }}
                  value={r.kind}
                  onChange={(e) => updateResource(i, { kind: e.target.value as SkillResource["kind"] })}
                  aria-label={`Resource ${i + 1} kind`}
                >
                  {RESOURCE_KINDS.map((k) => (
                    <option key={k.id} value={k.id}>{k.label}</option>
                  ))}
                </select>
                <input
                  className="input"
                  style={{ flex: "2 1 200px" }}
                  value={r.description}
                  onChange={(e) => updateResource(i, { description: e.target.value })}
                  placeholder="What is it for?"
                  aria-label={`Resource ${i + 1} description`}
                />
                <button
                  className="btn ghost btn-sm"
                  aria-label={`Remove resource ${i + 1}`}
                  onClick={() => removeResource(i)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <h2 className="card-title">Configuration</h2>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="skill-tools">Required tools</label>
          <input
            id="skill-tools"
            className="input"
            value={draft.requiredToolsText}
            onChange={(e) => update({ requiredToolsText: e.target.value })}
            placeholder="comma-separated, e.g. read_files, run_tests"
          />
          <span className="field-hint">Tool names the environment must expose for this skill.</span>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="skill-permissions">Declared permissions</label>
          <input
            id="skill-permissions"
            className="input"
            value={draft.permissionsText}
            onChange={(e) => update({ permissionsText: e.target.value })}
            placeholder="comma-separated, e.g. filesystem:read, network:none"
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="skill-requirements">Requirements</label>
          <textarea
            id="skill-requirements"
            className="input"
            rows={3}
            value={draft.requirements}
            onChange={(e) => update({ requirements: e.target.value })}
            placeholder="Runtime or platform prerequisites, e.g. Node 20+"
            style={{ resize: "vertical" }}
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="skill-changelog">Changelog</label>
          <textarea
            id="skill-changelog"
            className="input"
            rows={4}
            value={draft.changelog}
            onChange={(e) => update({ changelog: e.target.value })}
            placeholder={"1.0.0 — Initial version"}
            style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
          <span className="field-hint">Markdown preserved verbatim in the SKILL.md Changelog section.</span>
        </div>
      </section>

      {confirmDiscard && (
        <div className="dialog-overlay" onMouseDown={() => setConfirmDiscard(false)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-label="Discard changes">
            <div className="dialog-header">
              <h2 className="dialog-title">Discard unsaved changes?</h2>
            </div>
            <div className="dialog-body">
              You have edits that have not been saved. Leaving this page will discard them.
            </div>
            <div className="dialog-footer">
              <button className="btn secondary" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </button>
              <button className="btn danger" onClick={() => navigateAway("skills-studio")}>
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export { SkillFormPage }