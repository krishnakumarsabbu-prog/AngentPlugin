import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Search,
  X,
  Plus,
  Pencil,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Upload,
  Download,
  CheckSquare,
  Check,
  LayoutGrid,
  Table as TableIcon,
  Shield,
  Code,
  Terminal,
  Cpu,
  Layers,
  Eye,
  CheckCircle2,
  Package,
  SlidersHorizontal,
  Bot,
  Clock,
  Filter,
} from "lucide-react";
import type { Skill, PlatformCompatibility, InstallationState, SkillStatus } from "../../types";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { getSkillsStore, batchInstallSkills, installSkill, type SkillSortKey } from "../../services/skillsService";
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
  installed: "Installed",
  "not-installed": "Not installed",
  outdated: "Update available",
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

function getCategoryIcon(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("security") || c.includes("audit") || c.includes("auth")) return Shield;
  if (c.includes("dev") || c.includes("code") || c.includes("engineer")) return Code;
  if (c.includes("ops") || c.includes("cli") || c.includes("infra")) return Terminal;
  if (c.includes("ai") || c.includes("model") || c.includes("ml")) return Cpu;
  return Layers;
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
  const [statusFilter, setStatusFilter] = useState<SkillStatus | null>(null);
  const [installFilter, setInstallFilter] = useState<InstallationState | null>(null);
  const [sortKey, setSortKey] = useState<SkillSortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [pendingDelete, setPendingDelete] = useState<Skill | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportSkillTarget, setExportSkillTarget] = useState<Skill | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === (filtered.length || 0)) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const handleBatchInstall = async (platform: "copilot" | "claude") => {
    if (selectedIds.size === 0) return;
    setInstalling(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await batchInstallSkills(ids, platform);
      const platformName = platform === "copilot" ? "GitHub Copilot (.github/skills)" : "Claude Code (.claude/skills)";
      onToast(`Successfully installed ${res.count} skill(s) to ${platformName}!`, "success");
      setSelectedIds(new Set());
      onSkillsChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Batch installation failed", "error");
    } finally {
      setInstalling(false);
    }
  };

  const handleSingleInstall = async (skill: Skill, platform: "copilot" | "claude", e: React.MouseEvent) => {
    e.stopPropagation();
    setInstalling(true);
    try {
      await installSkill(skill.id, platform);
      const platformName = platform === "copilot" ? ".github/skills" : ".claude/skills";
      onToast(`Installed "${skill.name}" to ${platformName}!`, "success");
      onSkillsChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Install failed", "error");
    } finally {
      setInstalling(false);
    }
  };

  const loadSkillsData = () => {
    setRefreshing(true);
    setLoadError(null);
    store
      .list()
      .then((data) => {
        setSkills(data);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Failed to load skills");
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadSkillsData();
  }, [store, refreshSignal]);

  const categories = useMemo(
    () => Array.from(new Set((skills ?? []).map((s) => s.category))).filter(Boolean).sort(),
    [skills],
  );

  // Statistics calculation for high-impact metric cards
  const stats = useMemo(() => {
    const list = skills ?? [];
    const total = list.length;
    const readyCount = list.filter((s) => s.status === "Ready").length;
    const draftCount = list.filter((s) => s.status === "Draft").length;
    const installedCount = list.filter((s) => s.installationState === "installed").length;
    const copilotCount = list.filter((s) => s.compatibility.includes("copilot")).length;
    const claudeCount = list.filter((s) => s.compatibility.includes("claude")).length;
    const validCount = list.filter((s) => !!s.name && !!s.version && !!s.instructions).length;
    const healthPercent = total > 0 ? Math.round((validCount / total) * 100) : 100;

    return {
      total,
      readyCount,
      draftCount,
      installedCount,
      copilotCount,
      claudeCount,
      healthPercent,
    };
  }, [skills]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = skills ?? [];
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.tags && s.tags.some((t) => t.toLowerCase().includes(q))),
      );
    }
    if (categoryFilter) {
      list = list.filter((s) => s.category === categoryFilter);
    }
    if (platformFilter) {
      list = list.filter((s) => s.compatibility.includes(platformFilter));
    }
    if (statusFilter) {
      list = list.filter((s) => s.status === statusFilter);
    }
    if (installFilter) {
      list = list.filter((s) => s.installationState === installFilter);
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
  }, [skills, search, categoryFilter, platformFilter, statusFilter, installFilter, sortKey, sortDirection]);

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

  const duplicateSkill = async (skill: Skill, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const copy = await store.duplicate(skill.id);
      onToast(`Duplicated as "${copy.name}"`, "success");
      onSkillsChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to duplicate skill", "error");
    }
  };

  const clearAllFilters = () => {
    setSearch("");
    setCategoryFilter(null);
    setPlatformFilter(null);
    setStatusFilter(null);
    setInstallFilter(null);
  };

  const hasActiveFilters = Boolean(
    search || categoryFilter || platformFilter || statusFilter || installFilter,
  );

  if (loadError) {
    return (
      <div className="error-state">
        <span className="error-state-title">Could not load skills</span>
        <span className="error-state-text">{loadError}</span>
        <div className="error-state-actions">
          <button className="btn secondary" onClick={loadSkillsData}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!skills) {
    return (
      <div className="loading-state">
        <span className="spinner large" />
        <span>Loading AI Skill Infrastructure…</span>
      </div>
    );
  }

  return (
    <div className="skills-studio-container">
      {/* ── Glassmorphic Hero Banner ── */}
      <div className="skills-hero-banner">
        <div className="skills-hero-content">
          <div className="skills-hero-main">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="dashboard-hero-icon" style={{ width: 40, height: 40, borderRadius: 10 }}>
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h1 className="skills-hero-title">Skills Studio</h1>
                  <span className="skills-hero-badge">AI SKILL INFRASTRUCTURE</span>
                </div>
                <p className="skills-hero-desc">
                  Author, test, and deploy modular instruction packages for compatible AI platforms.
                  Skills install directly to <code>.github/skills</code> and <code>.claude/skills</code> with full SemVer control.
                </p>
              </div>
            </div>

            <div className="skills-hero-meta">
              <div className="skills-status-indicator">
                <span className="pulse-dot" />
                <span>Workspace Targets Active</span>
              </div>
              <span style={{ color: "var(--border)" }}>•</span>
              <span className="skills-status-indicator">
                <Bot size={13} style={{ color: "var(--accent)" }} />
                <span>Copilot &amp; Claude Ready</span>
              </span>
              <span style={{ color: "var(--border)" }}>•</span>
              <span className="skills-status-indicator">
                <Clock size={13} style={{ color: "var(--text-secondary)" }} />
                <span>Auto-sync enabled</span>
              </span>
            </div>
          </div>

          <div className="skills-hero-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={loadSkillsData}
              title="Refresh skills catalog"
              aria-label="Refresh skills"
              disabled={refreshing}
            >
              <RefreshCw size={13} className={refreshing ? "spinner" : ""} /> Refresh
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setExportSkillTarget(null);
                setImportOpen(true);
              }}
            >
              <Upload size={14} /> Import Package
            </button>
            <button
              type="button"
              className="btn secondary"
              style={{ borderColor: "var(--accent, #6366F1)", color: "var(--accent, #6366F1)", fontWeight: 600 }}
              onClick={() => onNavigate("persona-studio")}
            >
              <Sparkles size={14} /> Persona Studio
            </button>
            <button
              type="button"
              className="btn btn-glowing-primary"
              onClick={() => onNavigate("skill-new")}
            >
              <Plus size={14} /> Create Skill
            </button>
          </div>
        </div>
      </div>

      {/* ── Analytical Metrics Cards Grid ── */}
      <div className="skills-metrics-grid" role="region" aria-label="Skill Metrics">
        <div
          className="skills-stat-card"
          onClick={clearAllFilters}
          title="Click to view all skills"
        >
          <div className="skills-stat-icon blue">
            <Layers size={18} />
          </div>
          <div className="skills-stat-content">
            <span className="skills-stat-label">Total Skills</span>
            <div className="kpi-value-row">
              <span className="skills-stat-value">{stats.total}</span>
              <span className="kpi-badge">Catalog</span>
            </div>
            <div className="skills-stat-sub">
              <span style={{ color: "var(--success)", fontWeight: 600 }}>{stats.readyCount} Ready</span>
              <span>•</span>
              <span>{stats.draftCount} Draft</span>
            </div>
          </div>
        </div>

        <div
          className={`skills-stat-card${installFilter === "installed" ? " active" : ""}`}
          onClick={() => setInstallFilter(installFilter === "installed" ? null : "installed")}
          title="Click to filter by installed skills"
        >
          <div className="skills-stat-icon green">
            <PackageCheck size={18} />
          </div>
          <div className="skills-stat-content">
            <span className="skills-stat-label">Workspace Active</span>
            <div className="kpi-value-row">
              <span className="skills-stat-value">{stats.installedCount}</span>
              <span className="kpi-badge green">Active</span>
            </div>
            <div className="skills-stat-sub">
              <span>Installed in .github / .claude</span>
            </div>
          </div>
        </div>

        <div
          className={`skills-stat-card${platformFilter !== null ? " active" : ""}`}
          onClick={() => setPlatformFilter(platformFilter ? null : "copilot")}
          title="Click to toggle platform filter"
        >
          <div className="skills-stat-icon purple">
            <Bot size={18} />
          </div>
          <div className="skills-stat-content">
            <span className="skills-stat-label">Platform Coverage</span>
            <div className="kpi-value-row">
              <span className="skills-stat-value">{stats.copilotCount + stats.claudeCount > 0 ? "Multi" : "Local"}</span>
              <span className="kpi-badge purple">Adapters</span>
            </div>
            <div className="skills-stat-sub">
              <span>{stats.copilotCount} Copilot • {stats.claudeCount} Claude</span>
            </div>
          </div>
        </div>

        <div className="skills-stat-card" title="Validation and schema health">
          <div className="skills-stat-icon amber">
            <CheckCircle2 size={18} />
          </div>
          <div className="skills-stat-content">
            <span className="skills-stat-label">Quality Score</span>
            <div className="kpi-value-row">
              <span className="skills-stat-value">{stats.healthPercent}%</span>
              <span className="kpi-badge amber">Verified</span>
            </div>
            <div className="skills-stat-sub">
              <span>SemVer &amp; Frontmatter verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Control & Filter Toolbar ── */}
      <div className="dashboard-control-bar">
        {/* Search */}
        <div className="dashboard-search-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="dashboard-search-input"
            placeholder="Search skills by name, description, category, or tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="search-clear-btn"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={12} />
            </button>
          ) : (
            <span className="skills-search-shortcut" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>/</span>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="status-filter-pills">
          <button
            type="button"
            className={`status-pill-btn ${statusFilter === null && installFilter === null ? "selected" : ""}`}
            onClick={() => {
              setStatusFilter(null);
              setInstallFilter(null);
            }}
          >
            <span>All</span>
            <span className="status-pill-count">{skills.length}</span>
          </button>
          <button
            type="button"
            className={`status-pill-btn ${statusFilter === "Ready" ? "selected" : ""}`}
            onClick={() => {
              setStatusFilter(statusFilter === "Ready" ? null : "Ready");
              setInstallFilter(null);
            }}
          >
            <span>Ready</span>
            <span className="status-pill-count">{stats.readyCount}</span>
          </button>
          <button
            type="button"
            className={`status-pill-btn ${statusFilter === "Draft" ? "selected" : ""}`}
            onClick={() => {
              setStatusFilter(statusFilter === "Draft" ? null : "Draft");
              setInstallFilter(null);
            }}
          >
            <span>Draft</span>
            <span className="status-pill-count">{stats.draftCount}</span>
          </button>
          <button
            type="button"
            className={`status-pill-btn ${installFilter === "installed" ? "selected" : ""}`}
            onClick={() => {
              setInstallFilter(installFilter === "installed" ? null : "installed");
              setStatusFilter(null);
            }}
          >
            <span>Installed</span>
            <span className="status-pill-count">{stats.installedCount}</span>
          </button>
        </div>

        {/* Category Dropdown */}
        <div className="dashboard-sort-wrapper">
          <Layers size={13} style={{ color: "var(--text-secondary)" }} />
          <select
            className="dashboard-sort-select"
            value={categoryFilter ?? ""}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Platform Dropdown */}
        <div className="dashboard-sort-wrapper">
          <Bot size={13} style={{ color: "var(--text-secondary)" }} />
          <select
            className="dashboard-sort-select"
            value={platformFilter ?? ""}
            onChange={(e) => setPlatformFilter((e.target.value as PlatformCompatibility) || null)}
          >
            <option value="">All Platforms</option>
            {(Object.keys(PLATFORM_LABELS) as PlatformCompatibility[]).map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Selector with Direction Toggle */}
        <div className="dashboard-sort-wrapper">
          <SlidersHorizontal size={13} style={{ color: "var(--text-secondary)" }} />
          <select
            className="dashboard-sort-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SkillSortKey)}
            aria-label="Sort skills by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "2px 4px", height: "auto", border: "none" }}
            onClick={toggleSortDirection}
            title={sortDirection === "asc" ? "Ascending order" : "Descending order"}
          >
            {sortDirection === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === "cards" ? "active" : ""}`}
            onClick={() => setViewMode("cards")}
            title="Grid view"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table view"
          >
            <TableIcon size={14} />
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn ghost btn-sm"
            style={{ fontSize: 11, color: "var(--accent)" }}
            onClick={clearAllFilters}
          >
            Reset
          </button>
        )}
      </div>

      {/* ── Content Area: Empty State vs Cards vs Table ── */}
      {skills.length === 0 ? (
        <EmptyState
          variant="glass"
          icon={Sparkles}
          title="No AI Skills in Catalog"
          text="Author your first modular skill package to empower GitHub Copilot, Claude Code, and custom agent workflows with specialized instructions."
          action={
            <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setExportSkillTarget(null);
                  setImportOpen(true);
                }}
              >
                <Upload size={14} /> Import Skill Package
              </button>
              <button
                type="button"
                className="btn primary glow-cta"
                onClick={() => onNavigate("skill-new")}
              >
                <Plus size={14} /> Create Skill
              </button>
            </div>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Search}
            title="No matching skills found"
            text="No skills match your current search and filter combination."
          />
          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <button type="button" className="btn secondary" onClick={clearAllFilters}>
              Clear All Filters
            </button>
          </div>
        </div>
      ) : viewMode === "cards" ? (
        /* ── Modern Cards Grid ── */
        <div className="skills-grid">
          {filtered.map((skill) => {
            const isSelected = selectedIds.has(skill.id);
            const CategoryIcon = getCategoryIcon(skill.category);
            const resourceCount = skill.resources ? skill.resources.length : 0;
            const toolsCount = skill.requiredTools ? skill.requiredTools.length : 0;

            return (
              <div
                key={skill.id}
                className={`skill-card${isSelected ? " selected" : ""}`}
                onClick={() => onOpenSkill(skill.id)}
              >
                <div style={{ minWidth: 0, width: "100%" }}>
                  <div className="skill-card-top">
                    <div className="skill-card-header-left">
                      <input
                        type="checkbox"
                        className="item-select-checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        onClick={(e) => toggleSelect(skill.id, e)}
                        aria-label={`Select ${skill.name}`}
                      />
                      <div className="skill-card-avatar" title={`Category: ${skill.category}`}>
                        <CategoryIcon size={18} />
                      </div>
                      <div className="skill-card-title-group">
                        <span className="skill-card-title" title={skill.name}>
                          {skill.name}
                        </span>
                        <span className="skill-card-id">{skill.id}</span>
                      </div>
                    </div>

                    <div className="skill-card-top-right">
                      <span className="skill-meta-pill" style={{ fontWeight: 700 }}>
                        v{skill.version}
                      </span>
                      <StatusBadge status={skill.status} />
                    </div>
                  </div>

                  <p className="skill-card-desc" title={skill.description}>
                    {skill.description || "No description provided."}
                  </p>
                </div>

                <div style={{ minWidth: 0, width: "100%" }}>
                  <div className="skill-card-meta-row">
                    {skill.compatibility.map((p) => (
                      <span key={p} className={`platform-pill ${p}`}>
                        {PLATFORM_LABELS[p]}
                      </span>
                    ))}
                    {resourceCount > 0 && (
                      <span className="skill-meta-pill">
                        <Layers size={11} /> {resourceCount} {resourceCount === 1 ? "res" : "res"}
                      </span>
                    )}
                    {toolsCount > 0 && (
                      <span className="skill-meta-pill">
                        <Terminal size={11} /> {toolsCount} {toolsCount === 1 ? "tool" : "tools"}
                      </span>
                    )}
                    <span className="skill-meta-pill" style={{ marginLeft: "auto", fontSize: 10.5 }}>
                      {formatDate(skill.updatedAt)}
                    </span>
                  </div>

                  <div className="skill-card-footer">
                    {/* Top Row: Deployment status & direct platform installs */}
                    <div className="skill-card-footer-top">
                      <InstallBadge state={skill.installationState} />

                      <div className="skill-card-install-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn-card-install"
                          title="Install to GitHub Copilot (.github/skills)"
                          disabled={installing}
                          onClick={(e) => handleSingleInstall(skill, "copilot", e)}
                        >
                          <Download size={11} /> Copilot
                        </button>
                        <button
                          type="button"
                          className="btn-card-install"
                          title="Install to Claude Code (.claude/skills)"
                          disabled={installing}
                          onClick={(e) => handleSingleInstall(skill, "claude", e)}
                        >
                          <Download size={11} /> Claude
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Skill management actions toolbar */}
                    <div className="skill-card-actions-toolbar" onClick={(e) => e.stopPropagation()}>
                      <div className="skill-card-actions-left">
                        <button
                          type="button"
                          className="skill-card-action-btn"
                          title="Inspect Skill Details"
                          aria-label={`View details for ${skill.name}`}
                          onClick={() => onOpenSkill(skill.id)}
                        >
                          <Eye size={12} />
                          <span>Details</span>
                        </button>
                        <button
                          type="button"
                          className="skill-card-action-btn"
                          title="Edit Skill"
                          aria-label={`Edit ${skill.name}`}
                          onClick={() => onNavigate(`skill-edit:${skill.id}`)}
                        >
                          <Pencil size={12} />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="skill-card-actions-right">
                        <button
                          type="button"
                          className="skill-card-icon-btn"
                          title="Export Package"
                          aria-label={`Export ${skill.name}`}
                          onClick={() => setExportSkillTarget(skill)}
                        >
                          <Package size={13} />
                        </button>
                        <button
                          type="button"
                          className="skill-card-icon-btn"
                          title="Duplicate Skill"
                          aria-label={`Duplicate ${skill.name}`}
                          onClick={(e) => duplicateSkill(skill, e)}
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          className="skill-card-icon-btn danger"
                          title="Delete Skill"
                          aria-label={`Delete ${skill.name}`}
                          onClick={() => setPendingDelete(skill)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Modern Table View ── */
        <div className="skills-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    className="item-select-checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all skills"
                    title="Select all"
                  />
                </th>
                <th>Skill</th>
                <th>Category</th>
                <th>Version</th>
                <th>Platforms</th>
                <th>Status</th>
                <th>Installation</th>
                <th>Last Modified</th>
                <th style={{ width: 180, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((skill) => {
                const isSelected = selectedIds.has(skill.id);
                const CategoryIcon = getCategoryIcon(skill.category);

                return (
                  <tr
                    key={skill.id}
                    className={`row-clickable${isSelected ? " row-selected" : ""}`}
                    onClick={() => onOpenSkill(skill.id)}
                  >
                    <td style={{ textAlign: "center" }} onClick={(e) => toggleSelect(skill.id, e)}>
                      <input
                        type="checkbox"
                        className="item-select-checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        aria-label={`Select ${skill.name}`}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="skill-card-avatar" style={{ width: 30, height: 30 }}>
                          <CategoryIcon size={14} />
                        </div>
                        <div className="list-row-main">
                          <span className="list-row-title">{skill.name}</span>
                          <span className="list-row-sub">{skill.description}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="skill-meta-pill">{skill.category}</span>
                    </td>
                    <td>
                      <span className="skill-meta-pill" style={{ fontWeight: 600 }}>
                        v{skill.version}
                      </span>
                    </td>
                    <td>
                      <div className="chip-row">
                        {skill.compatibility.map((p) => (
                          <span key={p} className={`platform-pill ${p}`} style={{ fontSize: 10.5 }}>
                            {PLATFORM_LABELS[p]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={skill.status} />
                    </td>
                    <td>
                      <InstallBadge state={skill.installationState} />
                    </td>
                    <td>{formatDate(skill.updatedAt)}</td>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 4,
                          alignItems: "center",
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          type="button"
                          className="btn secondary btn-sm"
                          style={{ fontSize: 11, padding: "2px 7px" }}
                          title="Install to GitHub Copilot (.github/skills)"
                          disabled={installing}
                          onClick={(e) => handleSingleInstall(skill, "copilot", e)}
                        >
                          <Download size={11} /> Copilot
                        </button>
                        <button
                          type="button"
                          className="btn secondary btn-sm"
                          style={{ fontSize: 11, padding: "2px 7px" }}
                          title="Install to Claude Code (.claude/skills)"
                          disabled={installing}
                          onClick={(e) => handleSingleInstall(skill, "claude", e)}
                        >
                          <Download size={11} /> Claude
                        </button>
                        <button
                          type="button"
                          className="btn ghost btn-sm"
                          title="Edit"
                          aria-label={`Edit ${skill.name}`}
                          onClick={() => onNavigate(`skill-edit:${skill.id}`)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn ghost btn-sm"
                          title="Export Package"
                          aria-label={`Export ${skill.name}`}
                          onClick={() => setExportSkillTarget(skill)}
                        >
                          <Package size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn ghost btn-sm"
                          title="Duplicate"
                          aria-label={`Duplicate ${skill.name}`}
                          onClick={(e) => duplicateSkill(skill, e)}
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn ghost btn-sm"
                          title="Delete"
                          aria-label={`Delete ${skill.name}`}
                          onClick={() => setPendingDelete(skill)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Floating Batch Action Dock ── */}
      {selectedIds.size > 0 && (
        <div className="skills-batch-dock" role="toolbar" aria-label="Batch operations">
          <div className="skills-batch-dock-info">
            <CheckSquare size={16} />
            <span>
              {selectedIds.size} skill{selectedIds.size > 1 ? "s" : ""} selected
            </span>
          </div>
          <button
            type="button"
            className="btn primary btn-sm glow-cta"
            onClick={() => handleBatchInstall("copilot")}
            disabled={installing}
          >
            <Download size={13} /> Install to Copilot (.github/skills)
          </button>
          <button
            type="button"
            className="btn primary btn-sm glow-cta"
            onClick={() => handleBatchInstall("claude")}
            disabled={installing}
          >
            <Download size={13} /> Install to Claude (.claude/skills)
          </button>
          <button
            type="button"
            className="btn secondary btn-sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete skill"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This action removes the skill definition and cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {/* ── Skill Import Dialog ── */}
      <SkillPackagesDialog
        open={importOpen}
        skill={null}
        initialTab="import"
        onClose={() => setImportOpen(false)}
        onToast={onToast}
        onSkillsChanged={onSkillsChanged}
        onImportedSkill={(id) => onOpenSkill(id)}
      />

      {/* ── Skill Export Dialog ── */}
      {exportSkillTarget && (
        <SkillPackagesDialog
          open={Boolean(exportSkillTarget)}
          skill={exportSkillTarget}
          initialTab="export"
          onClose={() => setExportSkillTarget(null)}
          onToast={onToast}
          onSkillsChanged={onSkillsChanged}
        />
      )}
    </div>
  );
}
