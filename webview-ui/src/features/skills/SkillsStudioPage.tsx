import { useEffect, useMemo, useState } from "react";
import { Sparkles, Search, X, Plus, Pencil, Copy, Trash as Trash2, ArrowUp, ArrowDown, PackageCheck, PackageOpen, RefreshCw, Upload } from "lucide-react";
import type { Skill, PlatformCompatibility, InstallationState } from "../../types";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { getSkillsStore, type SkillSortKey } from "../../services/skillsService";
import { SkillPackagesDialog } from "./SkillPackagesDialog";

interface SkillsStudioPageProps {
  onNavigate: (route: string) => void;
  onOpenSkill: (id: string) => void;
  refreshSignal: number;
  onSkillsChanged: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}

const PLATFORM_LABELS: Record<PlatformCompatibility, string> = {
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

const SORT_OPTIONS: { id: SkillSortKey; label: string }[] = [
  { id: "updatedAt", label: "Last modified" },
  { id: "name", label: "Name" },
  { id: "category", label: "Category" },
  { id: "version", label: "Version" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function InstallBadge({ state }: { state: InstallationState }) {
  const tone =
    state === "installed" ? "success" : state === "outdated" ? "warning" : "neutral";
  const Icon = state === "installed" ? PackageCheck : state === "outdated" ? RefreshCw : PackageOpen;
  return (
    <span className={`badge ${tone}`}>
      <Icon size={11} /> {INSTALL_LABELS[state]}
    </span>
  );
}

export function SkillsStudioPage({
  onNavigate,
  onOpenSkill,
  refreshSignal,
  onSkillsChanged,
  onToast,
}: SkillsStudioPageProps) {
  const store = useMemo(() => getSkillsStore(), []);
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformCompatibility | null>(null);
  const [sortKey, setSortKey] = useState<SkillSortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pendingDelete, setPendingDelete] = useState<Skill | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setSkills(null);
    setLoadError(null);
    store
      .list()
      .then((data) => {
        if (active) setSkills(data);
      })
      .catch((e: unknown) => {
        if (active) setLoadError(e instanceof Error ? e.message : "Failed to load skills");
      });
    return () => {
      active = false;
    };
  }, [store, refreshSignal]);

  const categories = useMemo(
    () => Array.from(new Set((skills ?? []).map((s) => s.category))).sort(),
    [skills],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = skills ?? [];
    if (q) {
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
      );
    }
    if (categoryFilter) {
      list = list.filter((s) => s.category === categoryFilter);
    }
    if (platformFilter) {
      list = list.filter((s) => s.compatibility.includes(platformFilter));
    }
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "category":
          return a.category.localeCompare(b.category) * dir;
        case "version": {
          const pa = a.version.split(".").map(Number);
          const pb = b.version.split(".").map(Number);
          for (let i = 0; i < 3; i++) {
            const diff = ((pa[i] ?? 0) - (pb[i] ?? 0)) * dir;
            if (diff !== 0) return diff;
          }
          return 0;
        }
        default:
          return (a.updatedAt < b.updatedAt ? -1 : a.updatedAt > b.updatedAt ? 1 : 0) * dir;
      }
    });
  }, [skills, search, categoryFilter, platformFilter, sortKey, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await store.remove(pendingDelete.id);
      onToast(`Deleted skill "${pendingDelete.name}"`, "success");
      setPendingDelete(null);
      onSkillsChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to delete skill", "error");
    } finally {
      setBusy(false);
    }
  };

  const duplicateSkill = async (skill: Skill) => {
    try {
      const copy = await store.duplicate(skill.id);
      onToast(`Duplicated as "${copy.name}"`, "success");
      onSkillsChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to duplicate skill", "error");
    }
  };

  if (loadError) {
    return (
      <div className="error-state">
        <span className="error-state-title">Could not load skills</span>
        <span className="error-state-text">{loadError}</span>
        <div className="error-state-actions">
          <button className="btn secondary" onClick={onSkillsChanged}>Retry</button>
        </div>
      </div>
    );
  }

  if (!skills) {
    return (
      <div className="loading-state">
        <span className="spinner large" />
        Loading skills…
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Skills Studio</h1>
        <p className="page-subtitle">Reusable instruction packages for compatible AI platforms</p>
        <p className="page-description">
          A skill bundles instructions, procedures, and supporting files that an AI development
          environment can consume. Installation states shown here are local workspace metadata only —
          no skills have been installed into external platforms.
        </p>
        <div className="page-actions">
          <button className="btn secondary" onClick={() => setImportOpen(true)}>
            <Upload size={14} /> Import
          </button>
          <button className="btn primary" onClick={() => onNavigate("skill-new")}>
            <Plus size={14} /> Create Skill
          </button>
        </div>
      </div>

      <div className="activity-toolbar" style={{ marginBottom: 12 }}>
        <div className="search-inline">
          <Search size={13} />
          <input
            className="search-input"
            placeholder="Search by name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search skills"
          />
          {search && (
            <button className="toast-close" aria-label="Clear search" onClick={() => setSearch("")}>
              <X size={12} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="select"
            style={{ width: "auto", minWidth: 140 }}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SkillSortKey)}
            aria-label="Sort skills by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <button
            className="btn ghost"
            onClick={toggleSortDirection}
            aria-label={sortDirection === "asc" ? "Switch to descending order" : "Switch to ascending order"}
            title={sortDirection === "asc" ? "Ascending" : "Descending"}
          >
            {sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>
      </div>

      <div className="chip-row" style={{ marginBottom: 6 }} role="group" aria-label="Filter by category">
        <button
          type="button"
          className={`chip${categoryFilter === null ? " active" : ""}`}
          onClick={() => setCategoryFilter(null)}
          aria-pressed={categoryFilter === null}
        >
          All categories
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip${categoryFilter === c ? " active" : ""}`}
            onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
            aria-pressed={categoryFilter === c}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="chip-row" style={{ marginBottom: 16 }} role="group" aria-label="Filter by platform compatibility">
        <button
          type="button"
          className={`chip${platformFilter === null ? " active" : ""}`}
          onClick={() => setPlatformFilter(null)}
          aria-pressed={platformFilter === null}
        >
          All platforms
        </button>
        {(Object.keys(PLATFORM_LABELS) as PlatformCompatibility[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`chip${platformFilter === p ? " active" : ""}`}
            onClick={() => setPlatformFilter(platformFilter === p ? null : p)}
            aria-pressed={platformFilter === p}
          >
            {PLATFORM_LABELS[p]}
          </button>
        ))}
      </div>

      {skills.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Sparkles}
            title="No skills yet"
            text="Create your first skill to bundle instructions and procedures for AI platforms."
          />
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            <button className="btn secondary" onClick={() => setImportOpen(true)}>
              <Upload size={14} /> Import skill
            </button>
            <button className="btn primary" onClick={() => onNavigate("skill-new")}>
              <Plus size={14} /> Create Skill
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title="No matching skills"
            text="No skills match the current search and filters."
          />
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              className="btn secondary"
              onClick={() => {
                setSearch("");
                setCategoryFilter(null);
                setPlatformFilter(null);
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Version</th>
                <th>Platforms</th>
                <th>Status</th>
                <th>Installation</th>
                <th>Last modified</th>
                <th style={{ width: 44 }} aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="row-clickable" onClick={() => onOpenSkill(s.id)}>
                  <td>
                    <div className="list-row-main">
                      <span className="list-row-title">{s.name}</span>
                      <span className="list-row-sub">{s.description}</span>
                    </div>
                  </td>
                  <td>{s.category}</td>
                  <td>v{s.version}</td>
                  <td>
                    <div className="chip-row">
                      {s.compatibility.map((p) => (
                        <span key={p} className="badge neutral">{PLATFORM_LABELS[p]}</span>
                      ))}
                    </div>
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><InstallBadge state={s.installationState} /></td>
                  <td>{formatDate(s.updatedAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <button
                        className="btn ghost btn-sm"
                        aria-label={`Edit ${s.name}`}
                        title="Edit"
                        onClick={() => onNavigate(`skill-edit:${s.id}`)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn ghost btn-sm"
                        aria-label={`Duplicate ${s.name}`}
                        title="Duplicate"
                        onClick={() => duplicateSkill(s)}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        className="btn ghost btn-sm"
                        aria-label={`Delete ${s.name}`}
                        title="Delete"
                        onClick={() => setPendingDelete(s)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete skill"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <SkillPackagesDialog
        open={importOpen}
        skill={null}
        onClose={() => setImportOpen(false)}
        onToast={onToast}
        onSkillsChanged={onSkillsChanged}
        onImportedSkill={(id) => onOpenSkill(id)}
      />
    </div>
  );
}
