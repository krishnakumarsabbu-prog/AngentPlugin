import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Search,
  X,
  Plus,
  Pencil,
  Copy,
  Trash as Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Shield,
  Download,
  CheckSquare,
  Square,
  PackageCheck,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  SlidersHorizontal,
  ArrowRight,
  RefreshCw,
  Clock,
  Terminal,
} from "lucide-react";
import type { Agent, AgentStatus, PlatformCompatibility, Skill } from "../../types";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { getAgentsStore, installAgent, batchInstallAgents, type AgentSortKey } from "../../services/agentsService";
import { getSkillsStore } from "../../services/skillsService";

interface AgentStudioPageProps {
  onNavigate: (route: string) => void;
  onOpenAgent: (id: string) => void;
  refreshSignal: number;
  onAgentsChanged: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}

const PLATFORM_LABELS: Record<PlatformCompatibility, string> = {
  copilot: "Copilot",
  claude: "Claude",
  openai: "OpenAI",
  neutral: "Neutral",
};

const SORT_OPTIONS: { id: AgentSortKey; label: string }[] = [
  { id: "updatedAt", label: "Last modified" },
  { id: "name", label: "Name" },
  { id: "role", label: "Role" },
  { id: "version", label: "Version" },
  { id: "status", label: "Status" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AgentStudioPage({
  onNavigate,
  onOpenAgent,
  refreshSignal,
  onAgentsChanged,
  onToast,
}: AgentStudioPageProps) {
  const agentStore = useMemo(() => getAgentsStore(), []);
  const skillStore = useMemo(() => getSkillsStore(), []);

  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformCompatibility | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<AgentSortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [pendingDelete, setPendingDelete] = useState<Agent | null>(null);
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
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    }
  };

  const handleBatchInstall = async (platform: "copilot" | "claude") => {
    if (selectedIds.size === 0) return;
    setInstalling(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await batchInstallAgents(ids, platform);
      const platformName = platform === "copilot" ? "GitHub Copilot (.github)" : "Claude Code (.claude)";
      onToast(`Installed ${res.count} agent(s) & assigned skills to ${platformName}!`, "success");
      setSelectedIds(new Set());
      onAgentsChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Batch installation failed", "error");
    } finally {
      setInstalling(false);
    }
  };

  const handleSingleInstall = async (agent: Agent, platform: "copilot" | "claude", e: React.MouseEvent) => {
    e.stopPropagation();
    setInstalling(true);
    try {
      await installAgent(agent.id, platform);
      const platformName = platform === "copilot" ? ".github" : ".claude";
      onToast(`Installed "${agent.name}" & assigned skills to ${platformName}!`, "success");
      onAgentsChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Install failed", "error");
    } finally {
      setInstalling(false);
    }
  };

  const loadData = () => {
    setRefreshing(true);
    setLoadError(null);
    Promise.all([agentStore.list(), skillStore.list()])
      .then(([agentData, skillData]) => {
        setAgents(agentData);
        setSkills(skillData);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load agent configurations");
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [refreshSignal]);

  const skillNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of skills) {
      map.set(s.id, s.name);
    }
    return map;
  }, [skills]);

  const roles = useMemo(() => {
    if (!agents) return [];
    return Array.from(new Set(agents.map((a) => a.role))).filter(Boolean).sort();
  }, [agents]);

  // High-impact metrics
  const stats = useMemo(() => {
    const list = agents ?? [];
    const total = list.length;
    const readyCount = list.filter((a) => a.status === "Ready").length;
    const draftCount = list.filter((a) => a.status === "Draft").length;
    const expCount = list.filter((a) => a.status === "Experimental").length;
    const rolesCount = Array.from(new Set(list.map((a) => a.role))).filter(Boolean).length;
    const totalSkillBindings = list.reduce((acc, a) => acc + (a.assignedSkillIds?.length || 0), 0);

    return { total, readyCount, draftCount, expCount, rolesCount, totalSkillBindings };
  }, [agents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = agents ?? [];

    if (q) {
      list = list.filter((a) => {
        if (a.name.toLowerCase().includes(q)) return true;
        if (a.role.toLowerCase().includes(q)) return true;
        if (a.description?.toLowerCase().includes(q)) return true;
        if (a.assignedSkillIds?.some((sid: string) => (skillNameMap.get(sid) ?? sid).toLowerCase().includes(q))) return true;
        return false;
      });
    }

    if (statusFilter) {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (platformFilter) {
      list = list.filter((a) => (a.compatibility ?? ["copilot", "claude", "openai", "neutral"]).includes(platformFilter));
    }

    if (roleFilter) {
      list = list.filter((a) => a.role === roleFilter);
    }

    const dir = sortDirection === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "name") {
        return a.name.localeCompare(b.name) * dir;
      }
      if (sortKey === "role") {
        return a.role.localeCompare(b.role) * dir;
      }
      if (sortKey === "version") {
        return a.version.localeCompare(b.version) * dir;
      }
      if (sortKey === "status") {
        return a.status.localeCompare(b.status) * dir;
      }
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
    });
  }, [agents, search, statusFilter, platformFilter, roleFilter, sortKey, sortDirection, skillNameMap]);

  const handleDuplicate = async (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const copy = await agentStore.duplicate(agent.id);
      onToast(`Duplicated "${agent.name}" as "${copy.name}"`, "success");
      onAgentsChanged();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to duplicate agent", "error");
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await agentStore.remove(pendingDelete.id);
      onToast(`Deleted agent "${pendingDelete.name}"`, "success");
      setPendingDelete(null);
      onAgentsChanged();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to delete agent", "error");
    } finally {
      setBusy(false);
    }
  };

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter(null);
    setPlatformFilter(null);
    setRoleFilter(null);
  };

  const hasActiveFilters = Boolean(search || statusFilter || platformFilter || roleFilter);

  return (
    <div className="agent-studio-container">
      {/* ── Hero Banner ── */}
      <div className="agent-hero-banner">
        <div className="agent-hero-content">
          <div className="agent-hero-main">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="dashboard-hero-icon" style={{ width: 40, height: 40, borderRadius: 10 }}>
                <Bot size={20} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h1 className="agent-hero-title">Agent Studio</h1>
                  <span className="agent-hero-badge">AGENT ORCHESTRATION</span>
                </div>
                <p className="agent-hero-desc">
                  Configure specialized worker personas, assign domain skills, declare tools, and define runtime constraints for multi-agent workflows.
                </p>
              </div>
            </div>

            <div className="agent-hero-meta">
              <div className="agent-status-indicator">
                <span className="pulse-dot" />
                <span>Autonomous Personas Active</span>
              </div>
              <span style={{ color: "var(--border)" }}>•</span>
              <span className="agent-status-indicator">
                <Sparkles size={13} style={{ color: "var(--accent)" }} />
                <span>Skill Handoffs Enabled</span>
              </span>
              <span style={{ color: "var(--border)" }}>•</span>
              <span className="agent-status-indicator">
                <Clock size={13} style={{ color: "var(--text-secondary)" }} />
                <span>Multi-Platform Ready</span>
              </span>
            </div>
          </div>

          <div className="agent-hero-actions">
            <button
              type="button"
              className="btn secondary"
              onClick={loadData}
              title="Refresh agent configurations"
              aria-label="Refresh agents"
              disabled={refreshing}
            >
              <RefreshCw size={13} className={refreshing ? "spinner" : ""} /> Refresh
            </button>
            <button
              type="button"
              className="btn btn-glowing-primary"
              onClick={() => onNavigate("agent-new")}
            >
              <Plus size={14} /> Create Agent
            </button>
          </div>
        </div>
      </div>

      {/* ── Analytical Metrics Cards Grid ── */}
      <div className="agent-metrics-grid" role="region" aria-label="Agent Metrics">
        <div className="agent-stat-card" onClick={clearAllFilters} title="Click to view all agents">
          <div className="agent-stat-icon blue">
            <Bot size={18} />
          </div>
          <div className="agent-stat-content">
            <span className="agent-stat-label">Total Agents</span>
            <div className="kpi-value-row">
              <span className="agent-stat-value">{stats.total}</span>
              <span className="kpi-badge">Personas</span>
            </div>
            <div className="agent-stat-sub">
              <span style={{ color: "var(--success)", fontWeight: 600 }}>{stats.readyCount} Ready</span>
              <span>•</span>
              <span>{stats.draftCount} Draft</span>
            </div>
          </div>
        </div>

        <div
          className={`agent-stat-card${statusFilter === "Ready" ? " active" : ""}`}
          onClick={() => setStatusFilter(statusFilter === "Ready" ? null : "Ready")}
          title="Click to filter by Ready agents"
        >
          <div className="agent-stat-icon green">
            <PackageCheck size={18} />
          </div>
          <div className="agent-stat-content">
            <span className="agent-stat-label">Workspace Ready</span>
            <div className="kpi-value-row">
              <span className="agent-stat-value">{stats.readyCount}</span>
              <span className="kpi-badge green">Active</span>
            </div>
            <div className="agent-stat-sub">
              <span>Ready for Copilot &amp; Claude</span>
            </div>
          </div>
        </div>

        <div className="agent-stat-card" title="Distinct specialized worker roles">
          <div className="agent-stat-icon purple">
            <Layers size={18} />
          </div>
          <div className="agent-stat-content">
            <span className="agent-stat-label">Configured Roles</span>
            <div className="kpi-value-row">
              <span className="agent-stat-value">{stats.rolesCount}</span>
              <span className="kpi-badge purple">Specialized</span>
            </div>
            <div className="agent-stat-sub">
              <span>Architect, Auditor, Reviewer…</span>
            </div>
          </div>
        </div>

        <div className="agent-stat-card" title="Total skill bindings linked to workers">
          <div className="agent-stat-icon amber">
            <Sparkles size={18} />
          </div>
          <div className="agent-stat-content">
            <span className="agent-stat-label">Skill Bindings</span>
            <div className="kpi-value-row">
              <span className="agent-stat-value">{stats.totalSkillBindings}</span>
              <span className="kpi-badge amber">Capabilities</span>
            </div>
            <div className="agent-stat-sub">
              <span>Domain skills assigned</span>
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
            placeholder="Search agents by name, role, objective, or skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="status-filter-pills">
          <button
            type="button"
            className={`status-pill-btn ${statusFilter === null ? "selected" : ""}`}
            onClick={() => setStatusFilter(null)}
          >
            <span>All</span>
            <span className="status-pill-count">{agents?.length ?? 0}</span>
          </button>
          {(["Ready", "Draft", "Experimental"] as AgentStatus[]).map((st) => {
            const count = (agents ?? []).filter((a) => a.status === st).length;
            return (
              <button
                key={st}
                type="button"
                className={`status-pill-btn ${statusFilter === st ? "selected" : ""}`}
                onClick={() => setStatusFilter(statusFilter === st ? null : st)}
              >
                <span>{st}</span>
                <span className="status-pill-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Role Dropdown */}
        <div className="dashboard-sort-wrapper">
          <Layers size={13} style={{ color: "var(--text-secondary)" }} />
          <select
            className="dashboard-sort-select"
            value={roleFilter ?? ""}
            onChange={(e) => setRoleFilter(e.target.value || null)}
          >
            <option value="">All Roles ({roles.length})</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
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
            {(["copilot", "claude", "openai", "neutral"] as PlatformCompatibility[]).map((p) => (
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
            onChange={(e) => setSortKey(e.target.value as AgentSortKey)}
            aria-label="Sort agents by"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "2px 4px", height: "auto", border: "none" }}
            onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
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

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="batch-action-bar" style={{ animation: "fadeIn 0.15s ease-out" }}>
          <div className="batch-info">
            <CheckSquare size={16} />
            <span>
              <strong>{selectedIds.size}</strong> agent{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>(includes assigned skills)</span>
          </div>
          <div className="batch-actions">
            <button
              type="button"
              className="btn primary btn-sm"
              onClick={() => handleBatchInstall("copilot")}
              disabled={installing}
            >
              <Download size={13} /> Install to Copilot (.github)
            </button>
            <button
              type="button"
              className="btn secondary btn-sm"
              onClick={() => handleBatchInstall("claude")}
              disabled={installing}
            >
              <Download size={13} /> Install to Claude (.claude)
            </button>
            <button
              type="button"
              className="btn ghost btn-sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={installing}
            >
              Deselect all
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      {loadError ? (
        <div className="dashboard-empty-state">
          <div className="empty-state-title" style={{ color: "var(--error)" }}>Failed to load agents</div>
          <p className="empty-state-desc">{loadError}</p>
          <button className="btn secondary" onClick={loadData}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : agents === null ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text-secondary)" }}>
          Loading agent configurations…
        </div>
      ) : filtered.length === 0 ? (
        <div className="dashboard-empty-state">
          <div className="empty-state-icon">
            <Bot size={32} />
          </div>
          <h3 className="empty-state-title">
            {agents.length === 0 ? "No agents configured yet" : "No matching agents found"}
          </h3>
          <p className="empty-state-desc">
            {hasActiveFilters
              ? "No agent configurations match your current search and filter criteria."
              : "Register specialized AI personas with custom objectives, tools, and assigned skills."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            {hasActiveFilters ? (
              <button className="btn secondary" onClick={clearAllFilters}>
                Clear filters
              </button>
            ) : (
              <button className="btn btn-glowing-primary" onClick={() => onNavigate("agent-new")}>
                <Plus size={14} style={{ marginRight: 6 }} /> Create First Agent
              </button>
            )}
          </div>
        </div>
      ) : viewMode === "cards" ? (
        /* ── Modern Agent Cards Grid ── */
        <div className="dashboard-pipeline-grid">
          {filtered.map((agent) => {
            const isSelected = selectedIds.has(agent.id);
            const assignedCount = agent.assignedSkillIds?.length ?? 0;

            return (
              <div
                key={agent.id}
                className={`pipeline-card${isSelected ? " is-active-workspace" : ""}`}
                onClick={() => onOpenAgent(agent.id)}
              >
                <div>
                  <div className="pipeline-card-top">
                    <div className="pipeline-card-identity">
                      <button
                        type="button"
                        onClick={(e) => toggleSelect(agent.id, e)}
                        className="item-select-checkbox"
                        title={isSelected ? "Deselect agent" : "Select agent"}
                        aria-label="Select agent"
                        style={{ marginTop: 2, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        {isSelected ? (
                          <CheckSquare size={16} style={{ color: "var(--accent)" }} />
                        ) : (
                          <Square size={16} style={{ color: "var(--text-secondary)" }} />
                        )}
                      </button>

                      <div className="pipeline-card-avatar" style={{ background: "#EFF6FF", color: "#2563EB" }}>
                        <Bot size={18} />
                      </div>

                      <div className="pipeline-card-title-box">
                        <div className="pipeline-title-row">
                          <h3 className="pipeline-card-title" title={agent.name}>
                            {agent.name}
                          </h3>
                        </div>
                        <div className="pipeline-meta-subtitle">
                          <span className="pipeline-version-tag">v{agent.version || "1.0.0"}</span>
                          <span>•</span>
                          <span className="badge info" style={{ fontSize: 10, padding: "1px 6px" }}>
                            {agent.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <StatusBadge status={agent.status} />
                    </div>
                  </div>

                  <p className="pipeline-card-desc" title={agent.description || agent.objective}>
                    {agent.description || agent.objective || "No description provided."}
                  </p>

                  {/* Assigned Skills Strip */}
                  <div className="pipeline-card-flow-preview" style={{ marginBottom: 12 }}>
                    <div className="flow-preview-label" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Sparkles size={11} style={{ color: "var(--accent)" }} />
                      <span>Assigned Skills ({assignedCount})</span>
                    </div>
                    <div className="agent-skill-strip">
                      {agent.assignedSkillIds && agent.assignedSkillIds.length > 0 ? (
                        <>
                          {agent.assignedSkillIds.slice(0, 3).map((sid) => (
                            <span key={sid} className="agent-skill-pill" title={skillNameMap.get(sid) ?? sid}>
                              <Sparkles size={10} style={{ color: "#8B5CF6" }} />
                              <span>{skillNameMap.get(sid) ?? sid}</span>
                            </span>
                          ))}
                          {agent.assignedSkillIds.length > 3 && (
                            <span className="agent-skill-pill more" title={`${agent.assignedSkillIds.length - 3} more skills assigned`}>
                              +{agent.assignedSkillIds.length - 3} more
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic", padding: "2px 0" }}>
                          No skills bound
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  {/* Permissions & Platform Targets */}
                  <div className="pipeline-card-stats-row">
                    <div className="stat-item">
                      <Shield size={12} style={{ color: "var(--text-secondary)" }} />
                      <span>
                        FS: {agent.permissionPolicy?.fileSystem ?? "read"} • Shell: {agent.permissionPolicy?.shell ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="stat-item" style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                      {(agent.compatibility ?? ["copilot", "claude"]).slice(0, 2).map((p) => (
                        <span key={p} className={`platform-pill ${p}`} style={{ fontSize: 10, padding: "1px 5px" }}>
                          {PLATFORM_LABELS[p]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer with Direct Install and Actions */}
                  <div className="pipeline-card-footer">
                    <div className="pipeline-card-quick-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-card-action"
                        title="Install agent and skills to .github"
                        onClick={(e) => handleSingleInstall(agent, "copilot", e)}
                        disabled={installing}
                      >
                        <Download size={11} /> Copilot
                      </button>
                      <button
                        type="button"
                        className="btn-card-action"
                        title="Install agent and skills to .claude"
                        onClick={(e) => handleSingleInstall(agent, "claude", e)}
                        disabled={installing}
                      >
                        <Download size={11} /> Claude
                      </button>
                      <button
                        type="button"
                        className="btn-card-action"
                        title="Duplicate Agent"
                        onClick={(e) => handleDuplicate(agent, e)}
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn-card-action danger"
                        title="Delete Agent"
                        onClick={() => setPendingDelete(agent)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-open-canvas"
                      onClick={() => onOpenAgent(agent.id)}
                    >
                      <span>Profile</span>
                      <ArrowRight size={13} className="arrow-hover" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Modern Table View ── */
        <div className="dashboard-pipeline-list-table-container">
          <table className="pipeline-table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                    title={selectedIds.size === filtered.length && filtered.length > 0 ? "Deselect all" : "Select all"}
                  >
                    {selectedIds.size === filtered.length && filtered.length > 0 ? (
                      <CheckSquare size={15} style={{ color: "var(--accent)" }} />
                    ) : (
                      <Square size={15} style={{ color: "var(--text-secondary)" }} />
                    )}
                  </button>
                </th>
                <th>Agent Persona</th>
                <th>Role</th>
                <th>Status</th>
                <th>Assigned Skills</th>
                <th>Permissions</th>
                <th>Last Updated</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => {
                const isSelected = selectedIds.has(agent.id);
                const assignedCount = agent.assignedSkillIds?.length ?? 0;

                return (
                  <tr
                    key={agent.id}
                    className={`pipeline-table-row${isSelected ? " row-selected" : ""}`}
                    onClick={() => onOpenAgent(agent.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={{ textAlign: "center" }} onClick={(e) => toggleSelect(agent.id, e)}>
                      <button
                        type="button"
                        style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        {isSelected ? (
                          <CheckSquare size={15} style={{ color: "var(--accent)" }} />
                        ) : (
                          <Square size={15} style={{ color: "var(--text-secondary)" }} />
                        )}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="pipeline-table-avatar">
                          <Bot size={15} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                            {agent.name}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            v{agent.version || "1.0.0"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge info" style={{ fontSize: 11 }}>
                        {agent.role}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={agent.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {assignedCount > 0 ? `${assignedCount} skill(s) bound` : "None"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        FS: {agent.permissionPolicy?.fileSystem ?? "read"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {formatDate(agent.updatedAt)}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn-table-action"
                          title="Install to Copilot"
                          onClick={(e) => handleSingleInstall(agent, "copilot", e)}
                        >
                          <Download size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn-table-action"
                          title="Duplicate"
                          onClick={(e) => handleDuplicate(agent, e)}
                        >
                          <Copy size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn-table-action danger"
                          title="Delete"
                          onClick={() => setPendingDelete(agent)}
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn primary btn-sm"
                          onClick={() => onOpenAgent(agent.id)}
                        >
                          <span>Open</span>
                          <ArrowRight size={12} style={{ marginLeft: 4 }} />
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

      {/* Delete confirmation dialog */}
      {pendingDelete && (
        <ConfirmDialog
          open={true}
          title="Delete Agent Configuration"
          message={`Are you sure you want to remove the agent configuration "${pendingDelete.name}"? This action cannot be undone.`}
          confirmLabel={busy ? "Deleting…" : "Delete Agent"}
          danger={true}
          busy={busy}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
