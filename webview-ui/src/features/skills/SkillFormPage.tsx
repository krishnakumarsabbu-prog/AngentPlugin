import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { Skill, PlatformCompatibility, SkillStatus } from "../../types";
import { getSkillsStore } from "../../services/skillsService";

interface SkillFormPageProps {
  skillId: string | null;
  onNavigate: (route: string) => void;
  onSkillsChanged: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}

const PLATFORM_OPTIONS: { id: PlatformCompatibility; label: string }[] = [
  { id: "copilot", label: "GitHub Copilot" },
  { id: "claude", label: "Claude / Claude Code" },
  { id: "openai", label: "OpenAI" },
  { id: "neutral", label: "Platform neutral" },
];

const STATUS_OPTIONS: SkillStatus[] = ["Draft", "Ready", "Deprecated"];

export function SkillFormPage({ skillId, onNavigate, onSkillsChanged, onToast }: SkillFormPageProps) {
  const store = getSkillsStore();
  const isEdit = skillId !== null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("0.1.0");
  const [status, setStatus] = useState<SkillStatus>("Draft");
  const [compatibility, setCompatibility] = useState<PlatformCompatibility[]>([]);
  const [instructions, setInstructions] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    let active = true;
    store
      .get(skillId)
      .then((s) => {
        if (!active) return;
        setName(s.name);
        setDescription(s.description);
        setCategory(s.category);
        setVersion(s.version);
        setStatus(s.status);
        setCompatibility([...s.compatibility]);
        setInstructions(s.instructions);
        setTagsText(s.tags.join(", "));
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!active) return;
        onToast(e instanceof Error ? e.message : "Failed to load skill", "error");
        onNavigate("skills-studio");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId]);

  const togglePlatform = (p: PlatformCompatibility) => {
    setCompatibility((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Name is required");
      return;
    }
    setNameError(null);
    setSaving(true);
    const payload: Partial<Skill> = {
      name: trimmedName,
      description: description.trim(),
      category: category.trim() || "General",
      version: version.trim() || "0.1.0",
      status,
      compatibility,
      instructions,
      tags: tagsText
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    };
    try {
      if (isEdit) {
        await store.update(skillId, payload);
        onToast(`Saved skill "${trimmedName}"`, "success");
      } else {
        await store.create(payload);
        onToast(`Created skill "${trimmedName}"`, "success");
      }
      onSkillsChanged();
      onNavigate("skills-studio");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to save skill", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <span className="spinner large" />
        Loading skill…
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? "Edit Skill" : "Create Skill"}</h1>
        <p className="page-subtitle">
          {isEdit ? "Update the skill's metadata and instructions." : "Define a new reusable skill."}
        </p>
        <div className="page-actions">
          <button className="btn secondary" onClick={() => onNavigate("skills-studio")}>
            <ArrowLeft size={14} /> Cancel
          </button>
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Skill"}
          </button>
        </div>
      </div>

      <div className="settings-section">
        <div className="field">
          <label className="field-label" htmlFor="skill-name">Name</label>
          <input
            id="skill-name"
            className={`input${nameError ? " invalid" : ""}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Security Audit Skill"
          />
          {nameError && <span className="field-error">{nameError}</span>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="skill-description">Description</label>
          <input
            id="skill-description"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this skill do?"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div className="field">
            <label className="field-label" htmlFor="skill-category">Category</label>
            <input
              id="skill-category"
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Security"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="skill-version">Version</label>
            <input
              id="skill-version"
              className="input"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="0.1.0"
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="skill-status">Status</label>
            <select
              id="skill-status"
              className="select"
              value={status}
              onChange={(e) => setStatus(e.target.value as SkillStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Supported platforms</span>
          <div className="chip-row">
            {PLATFORM_OPTIONS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`chip${compatibility.includes(p.id) ? " active" : ""}`}
                onClick={() => togglePlatform(p.id)}
                aria-pressed={compatibility.includes(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="skill-tags">Tags</label>
          <input
            id="skill-tags"
            className="input"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="comma-separated, e.g. security, audit"
          />
          <span className="field-hint">Separate tags with commas.</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="skill-instructions">Instructions</label>
          <textarea
            id="skill-instructions"
            className="input"
            rows={8}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Step-by-step instructions the AI environment should follow."
            style={{ resize: "vertical", fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
        </div>
      </div>
    </div>
  );
}
