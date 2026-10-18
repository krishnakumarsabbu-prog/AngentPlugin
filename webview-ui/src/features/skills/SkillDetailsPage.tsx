import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Copy, Trash as Trash2, FileText, Scroll, FileCode, FilePlus, PackageCheck, PackageOpen, RefreshCw } from "lucide-react";
import type { Skill, InstallationState, SkillResource } from "../../types";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { getSkillsStore } from "../../services/skillsService";

interface SkillDetailsPageProps {
  skillId: string;
  onNavigate: (route: string) => void;
  onSkillsChanged: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  copilot: "Copilot",
  claude: "Claude",
  openai: "OpenAI",
  neutral: "Neutral",
};

const INSTALL_LABELS: Record<InstallationState, string> = {
  "installed": "Installed",
  "not-installed": "Not installed",
  "outdated": "Update available",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resourceIcon(kind: SkillResource["kind"]) {
  switch (kind) {
    case "script": return FileCode;
    case "template": return FilePlus;
    case "reference": return Scroll;
    default: return FileText;
  }
}

function InstallBadge({ state }: { state: InstallationState }) {
  const tone = state === "installed" ? "success" : state === "outdated" ? "warning" : "neutral";
  const Icon = state === "installed" ? PackageCheck : state === "outdated" ? RefreshCw : PackageOpen;
  return (
    <span className={`badge ${tone}`}>
      <Icon size={11} /> {INSTALL_LABELS[state]}
    </span>
  );
}

export function SkillDetailsPage({ skillId, onNavigate, onSkillsChanged, onToast }: SkillDetailsPageProps) {
  const store = getSkillsStore();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setSkill(null);
    setError(null);
    store
      .get(skillId)
      .then((s) => {
        if (active) setSkill(s);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load skill");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId]);

  const handleDelete = async () => {
    if (!skill) return;
    setBusy(true);
    try {
      await store.remove(skill.id);
      onToast(`Deleted skill "${skill.name}"`, "success");
      onSkillsChanged();
      onNavigate("skills-studio");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to delete skill", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async () => {
    if (!skill) return;
    try {
      const copy = await store.duplicate(skill.id);
      onToast(`Duplicated as "${copy.name}"`, "success");
      onSkillsChanged();
      onNavigate(`skill-details:${copy.id}`);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to duplicate skill", "error");
    }
  };

  if (error) {
    return (
      <div className="error-state">
        <span className="error-state-title">Could not load skill</span>
        <span className="error-state-text">{error}</span>
        <div className="error-state-actions">
          <button className="btn secondary" onClick={() => onNavigate("skills-studio")}>
            Back to Skills Studio
          </button>
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="loading-state">
        <span className="spinner large" />
        Loading skill…
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Skills Studio", onClick: () => onNavigate("skills-studio") },
          { label: skill.name },
        ]}
      />

      <div className="page-header" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {skill.name}
              <StatusBadge status={skill.status} />
              <InstallBadge state={skill.installationState} />
            </h1>
            <p className="page-description">{skill.description}</p>
          </div>
          <div className="page-actions">
            <button className="btn secondary" onClick={() => onNavigate("skills-studio")}>
              <ArrowLeft size={14} /> Back
            </button>
            <button className="btn primary" onClick={() => onNavigate(`skill-edit:${skill.id}`)}>
              <Pencil size={14} /> Edit
            </button>
            <button className="btn secondary" onClick={handleDuplicate}>
              <Copy size={14} /> Duplicate
            </button>
            <button className="btn danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="section-grid">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Metadata</h2>
          </div>
          <div className="section-list">
            <div className="meta-row"><span className="meta-label">Category</span><span>{skill.category}</span></div>
            <div className="meta-row"><span className="meta-label">Version</span><span>v{skill.version}</span></div>
            <div className="meta-row">
              <span className="meta-label">Platforms</span>
              <span className="chip-row">
                {skill.compatibility.length === 0
                  ? <span className="list-row-sub">None specified</span>
                  : skill.compatibility.map((p) => (
                      <span key={p} className="badge neutral">{PLATFORM_LABELS[p] ?? p}</span>
                    ))}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Tags</span>
              <span className="chip-row">
                {skill.tags.length === 0
                  ? <span className="list-row-sub">None</span>
                  : skill.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
              </span>
            </div>
            <div className="meta-row"><span className="meta-label">Created</span><span>{formatDate(skill.createdAt)}</span></div>
            <div className="meta-row"><span className="meta-label">Last modified</span><span>{formatDate(skill.updatedAt)}</span></div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Version information</h2>
          </div>
          <div className="section-list">
            <div className="meta-row"><span className="meta-label">Current version</span><span>v{skill.version}</span></div>
            <div className="meta-row">
              <span className="meta-label">Installation</span>
              <InstallBadge state={skill.installationState} />
            </div>
            <p className="field-hint" style={{ marginTop: 8 }}>
              Installation state reflects local workspace metadata only. Sample skills have not been
              installed into any external AI platform.
            </p>
          </div>
        </section>

        <section className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <h2 className="card-title">Instructions</h2>
          </div>
          {skill.instructions.trim() ? (
            <pre className="instructions-block">{skill.instructions}</pre>
          ) : (
            <EmptyState
              icon={FileText}
              title="No instructions yet"
              text="Edit this skill to add the instructions an AI environment will follow."
            />
          )}
        </section>

        <section className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <h2 className="card-title">Resources</h2>
            <span className="list-row-sub">{skill.resources.length} item{skill.resources.length === 1 ? "" : "s"}</span>
          </div>
          {skill.resources.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No supporting resources"
              text="Add reference files, scripts, or templates when editing this skill."
            />
          ) : (
            <div className="section-list">
              {skill.resources.map((r) => {
                const Icon = resourceIcon(r.kind);
                return (
                  <div className="resource-row" key={r.id}>
                    <Icon size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                    <div className="list-row-main">
                      <span className="list-row-title">{r.name}</span>
                      <span className="list-row-sub">{r.description}</span>
                    </div>
                    <span className="badge neutral">{r.kind}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete skill"
        message={`Are you sure you want to delete "${skill.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
