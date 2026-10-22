import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Copy,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Workflow as WorkflowIcon,
  CheckCircle2,
  PlayCircle,
  ShieldCheck,
  GitFork,
  LayoutGrid,
  List as ListIcon,
  Sparkles,
  Bot,
  Layers,
  FileCode2,
  Activity,
  SlidersHorizontal,
  X,
  FileText,
  Clock,
} from "lucide-react";
import type { Workflow, WorkflowNode, WorkflowNodeType } from "../../types";

export interface WorkflowListPageProps {
  workflows: Workflow[];
  onOpenWorkflow: (id: string) => void;
  onNewWorkflow: (template?: Partial<Workflow>) => void;
  onDuplicateWorkflow: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;
  onInstallWorkflow?: (id: string) => void;
  onOpenRunMarkdown?: () => void;
  activeWorkflowId?: string;
}

const STARTER_TEMPLATES: Partial<Workflow>[] = [
  {
    name: "Enterprise Feature Delivery",
    description: "Multi-agent intake, architecture design, milestone planning, Tech Lead approval gate, and automated code review.",
    status: "Active",
    nodes: [
      { id: "node-start", type: "start", name: "Start", description: "Trigger point", configuration: {}, position: { x: 60, y: 160 } },
      { id: "node-req", type: "requirement_input", name: "Requirement Intake", description: "Accepts stories & constraints", configuration: {}, position: { x: 260, y: 160 } },
      { id: "node-arch", type: "agent_execution", name: "Architecture Agent", description: "Designs technical components", configuration: { role: "Software Architect" }, position: { x: 480, y: 160 } },
      { id: "node-gate", type: "human_approval", name: "Tech Lead Approval", description: "Principal engineer sign-off", configuration: { approverRole: "Engineering Lead" }, position: { x: 700, y: 160 } },
      { id: "node-review", type: "validation", name: "Sentry Code Review", description: "PR security & syntax review", configuration: {}, position: { x: 920, y: 160 } },
      { id: "node-end", type: "end", name: "End", description: "Pipeline completion", configuration: {}, position: { x: 1140, y: 160 } },
    ],
    edges: [
      { id: "e-1", source: "node-start", target: "node-req" },
      { id: "e-2", source: "node-req", target: "node-arch" },
      { id: "e-3", source: "node-arch", target: "node-gate" },
      { id: "e-4", source: "node-gate", target: "node-review" },
      { id: "e-5", source: "node-review", target: "node-end" },
    ],
  },
  {
    name: "Autonomous Security Audit (Talon)",
    description: "Graph of Agents reconnaissance, vulnerability PoC verification, and CISO / Security Officer gate.",
    status: "Ready",
    nodes: [
      { id: "node-start", type: "start", name: "Start", description: "Audit initiation", configuration: {}, position: { x: 60, y: 160 } },
      { id: "node-recon", type: "agent_execution", name: "Talon Recon Agent", description: "Attack surface scanner", configuration: { role: "Security Auditor" }, position: { x: 280, y: 160 } },
      { id: "node-poc", type: "skill_invocation", name: "Talon Exploit PoC", description: "Dynamic verification", configuration: { skillName: "talon" }, position: { x: 500, y: 160 } },
      { id: "node-gate", type: "human_approval", name: "Security Officer Sign-off", description: "Confirm findings", configuration: { approverRole: "Security Lead" }, position: { x: 720, y: 160 } },
      { id: "node-end", type: "end", name: "End", description: "Report generated", configuration: {}, position: { x: 940, y: 160 } },
    ],
    edges: [
      { id: "e-1", source: "node-start", target: "node-recon" },
      { id: "e-2", source: "node-recon", target: "node-poc" },
      { id: "e-3", source: "node-poc", target: "node-gate" },
      { id: "e-4", source: "node-gate", target: "node-end" },
    ],
  },
  {
    name: "Token Optimization Pipeline (Anvil)",
    description: "Cuts prompt & completion token consumption by up to 65% via ASD-STE100 controlled voice and targeted AST compression.",
    status: "Draft",
    nodes: [
      { id: "node-start", type: "start", name: "Start", description: "Trigger", configuration: {}, position: { x: 60, y: 160 } },
      { id: "node-scan", type: "agent_execution", name: "Token Sink Scanner", description: "Scans repository context", configuration: { role: "Context Auditor" }, position: { x: 280, y: 160 } },
      { id: "node-anvil", type: "skill_invocation", name: "Anvil Compression", description: "ASD-STE100 compression", configuration: { skillName: "anvil" }, position: { x: 500, y: 160 } },
      { id: "node-end", type: "end", name: "End", description: "Optimized prompt suite", configuration: {}, position: { x: 720, y: 160 } },
    ],
    edges: [
      { id: "e-1", source: "node-start", target: "node-scan" },
      { id: "e-2", source: "node-scan", target: "node-anvil" },
      { id: "e-3", source: "node-anvil", target: "node-end" },
    ],
  },
];

const getNodeIcon = (type: WorkflowNodeType | string) => {
  switch (type) {
    case "start":
      return <PlayCircle size={12} style={{ color: "#10B981" }} />;
    case "end":
      return <CheckCircle2 size={12} style={{ color: "#64748B" }} />;
    case "agent_execution":
      return <Bot size={12} style={{ color: "#3B82F6" }} />;
    case "skill_invocation":
      return <Sparkles size={12} style={{ color: "#8B5CF6" }} />;
    case "human_approval":
      return <ShieldCheck size={12} style={{ color: "#F59E0B" }} />;
    case "code_review":
      return <FileCode2 size={12} style={{ color: "#06B6D4" }} />;
    default:
      return <GitFork size={12} style={{ color: "var(--accent, #3B82F6)" }} />;
  }
};

const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return "Recently";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const WorkflowListPage: React.FC<WorkflowListPageProps> = ({
  workflows,
  onOpenWorkflow,
  onNewWorkflow,
  onDuplicateWorkflow,
  onDeleteWorkflow,
  onInstallWorkflow,
  onOpenRunMarkdown,
  activeWorkflowId,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"updated" | "name" | "nodes" | "gates">("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showTemplates, setShowTemplates] = useState(false);

  // Compute KPI metrics across all workflows
  const kpiMetrics = useMemo(() => {
    const totalPipelines = workflows.length;
    const activePipelines = workflows.filter((w) => w.status === "Active").length;
    const totalNodes = workflows.reduce((acc, w) => acc + (w.nodes?.length || 0), 0);
    const totalGates = workflows.reduce(
      (acc, w) => acc + (w.nodes?.filter((n) => n.type === "human_approval").length || 0),
      0
    );
    return { totalPipelines, activePipelines, totalNodes, totalGates };
  }, [workflows]);

  // Counts for status tabs
  const statusCounts = useMemo(() => {
    const counts = { All: workflows.length, Active: 0, Ready: 0, Draft: 0 };
    workflows.forEach((w) => {
      if (w.status === "Active") counts.Active++;
      else if (w.status === "Ready") counts.Ready++;
      else counts.Draft++;
    });
    return counts;
  }, [workflows]);

  // Filter & sort
  const filteredWorkflows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = workflows.filter((w) => {
      const matchesSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q)) ||
        w.nodes?.some((n) => n.name.toLowerCase().includes(q) || n.type.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "All" || w.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === "updated") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "nodes") {
        return (b.nodes?.length || 0) - (a.nodes?.length || 0);
      }
      if (sortBy === "gates") {
        const aGates = a.nodes?.filter((n) => n.type === "human_approval").length || 0;
        const bGates = b.nodes?.filter((n) => n.type === "human_approval").length || 0;
        return bGates - aGates;
      }
      return 0;
    });

    return result;
  }, [workflows, search, statusFilter, sortBy]);

  const renderStatusBadge = (status: Workflow["status"]) => {
    switch (status) {
      case "Active":
        return (
          <span className="badge-status active">
            <span className="status-dot-pulse" />
            Active
          </span>
        );
      case "Ready":
        return (
          <span className="badge-status ready">
            <span className="status-dot-static ready" />
            Ready
          </span>
        );
      default:
        return (
          <span className="badge-status draft">
            <span className="status-dot-static draft" />
            Draft
          </span>
        );
    }
  };

  const renderNodeSequenceStrip = (nodes: WorkflowNode[] = []) => {
    if (!nodes || nodes.length === 0) {
      return <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Empty graph</span>;
    }

    // Grab sequence: start -> intermediate nodes -> end
    const startNode = nodes.find((n) => n.type === "start");
    const endNode = nodes.find((n) => n.type === "end");
    const middleNodes = nodes.filter((n) => n.type !== "start" && n.type !== "end");

    const displayNodes: WorkflowNode[] = [];
    if (startNode) displayNodes.push(startNode);

    const maxMiddle = 3;
    const truncatedMiddle = middleNodes.slice(0, maxMiddle);
    displayNodes.push(...truncatedMiddle);

    const remainingCount = middleNodes.length - maxMiddle;

    return (
      <div className="pipeline-step-strip" title={`${nodes.length} total steps in pipeline`}>
        {displayNodes.map((n, idx) => (
          <React.Fragment key={n.id}>
            <div className="pipeline-step-pill" title={`${n.name} (${n.type})`}>
              {getNodeIcon(n.type)}
              <span className="pipeline-step-name">{n.name}</span>
            </div>
            {idx < displayNodes.length - 1 && <span className="step-arrow">→</span>}
          </React.Fragment>
        ))}

        {remainingCount > 0 && (
          <>
            <span className="step-arrow">→</span>
            <div className="pipeline-step-pill more" title={`${remainingCount} more intermediate steps`}>
              +{remainingCount} more
            </div>
          </>
        )}

        {endNode && (!startNode || middleNodes.length > 0) && (
          <>
            <span className="step-arrow">→</span>
            <div className="pipeline-step-pill" title={`${endNode.name} (${endNode.type})`}>
              {getNodeIcon(endNode.type)}
              <span className="pipeline-step-name">{endNode.name}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="harness-dashboard">
      {/* Top Hero Banner */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-title-group">
            <div className="dashboard-title-row">
              <div className="dashboard-hero-icon">
                <WorkflowIcon size={22} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h1 className="dashboard-hero-title">Harness Pipelines</h1>
                  <span className="dashboard-tag-enterprise">ORCHESTRATION</span>
                </div>
                <p className="dashboard-hero-subtitle">
                  Design, validate, and orchestrate multi-agent workflows with context handoffs and governance approval gates.
                </p>
              </div>
            </div>
          </div>

          <div className="dashboard-hero-actions">
            <button
              className={`btn ${showTemplates ? "secondary active-template" : "secondary"}`}
              onClick={() => setShowTemplates((v) => !v)}
              title="Browse pre-built starter templates"
            >
              <Sparkles size={14} style={{ marginRight: 6, color: "var(--accent)" }} />
              {showTemplates ? "Hide Templates" : "Starter Templates"}
            </button>

            {onOpenRunMarkdown && (
              <button
                className="btn secondary"
                onClick={onOpenRunMarkdown}
                title="Execute a workflow parsed from pipeline.md"
              >
                <FileText size={14} style={{ marginRight: 6 }} />
                Run pipeline.md
              </button>
            )}

            <button
              className="btn btn-glowing-primary"
              onClick={() => onNewWorkflow()}
              title="Create a new visual workflow from scratch"
            >
              <Plus size={15} style={{ marginRight: 6 }} />
              New Pipeline
            </button>
          </div>
        </div>

        {/* Expandable Starter Templates Tray */}
        {showTemplates && (
          <div className="starter-templates-shelf">
            <div className="templates-shelf-header">
              <div>
                <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  Pre-built Engineering Templates
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
                  One-click blueprints with standard nodes, context flow, and approval gates.
                </p>
              </div>
              <button
                className="btn-icon-subtle"
                onClick={() => setShowTemplates(false)}
                title="Close templates"
              >
                <X size={14} />
              </button>
            </div>

            <div className="templates-cards-grid">
              {STARTER_TEMPLATES.map((tmpl, idx) => (
                <div key={idx} className="template-card">
                  <div className="template-card-header">
                    <span className="template-title">{tmpl.name}</span>
                    <span className="template-pill">{tmpl.nodes?.length} steps</span>
                  </div>
                  <p className="template-desc">{tmpl.description}</p>
                  <button
                    className="btn secondary btn-sm"
                    onClick={() => {
                      onNewWorkflow(tmpl);
                      setShowTemplates(false);
                    }}
                  >
                    <span>Use Template</span>
                    <ArrowRight size={12} style={{ marginLeft: 4 }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* KPI Insight Metrics Cards */}
      <div className="dashboard-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrapper blue">
            <WorkflowIcon size={18} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Pipelines</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{kpiMetrics.totalPipelines}</span>
              <span className="kpi-badge">Workspace</span>
            </div>
            <span className="kpi-subtext">Configured orchestrations</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper green">
            <Activity size={18} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Active Pipelines</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{kpiMetrics.activePipelines}</span>
              <span className="kpi-badge green">Live</span>
            </div>
            <span className="kpi-subtext">Automated execution enabled</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper purple">
            <Layers size={18} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Pipeline Nodes</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{kpiMetrics.totalNodes}</span>
              <span className="kpi-badge purple">Tasks</span>
            </div>
            <span className="kpi-subtext">Agents, skills, and checkpoints</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrapper amber">
            <ShieldCheck size={18} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Approval Gateways</span>
            <div className="kpi-value-row">
              <span className="kpi-value">{kpiMetrics.totalGates}</span>
              <span className="kpi-badge amber">Governance</span>
            </div>
            <span className="kpi-subtext">Human-in-the-loop sign-offs</span>
          </div>
        </div>
      </div>

      {/* Filter, Search, Sort & View Controls */}
      <div className="dashboard-control-bar">
        {/* Search */}
        <div className="dashboard-search-wrapper">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="dashboard-search-input"
            placeholder="Search pipelines by name, node type, or agent role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="search-clear-btn"
              onClick={() => setSearch("")}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="status-filter-pills">
          {(["All", "Active", "Ready", "Draft"] as const).map((st) => (
            <button
              key={st}
              className={`status-pill-btn ${statusFilter === st ? "selected" : ""}`}
              onClick={() => setStatusFilter(st)}
            >
              <span>{st}</span>
              <span className="status-pill-count">{statusCounts[st]}</span>
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="dashboard-sort-wrapper">
          <SlidersHorizontal size={13} style={{ color: "var(--text-secondary)" }} />
          <select
            className="dashboard-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="updated">Recently Updated</option>
            <option value="name">Pipeline Name (A–Z)</option>
            <option value="nodes">Most Steps</option>
            <option value="gates">Approval Gates</option>
          </select>
        </div>

        {/* View Switcher */}
        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <ListIcon size={14} />
          </button>
        </div>
      </div>

      {/* Pipeline Cards Grid View */}
      {viewMode === "grid" ? (
        <div className="dashboard-pipeline-grid">
          {filteredWorkflows.map((wf) => {
            const hasApprovalGates = wf.nodes?.some((n) => n.type === "human_approval");
            const isCurrentlyActive = activeWorkflowId === wf.id;

            return (
              <div
                key={wf.id}
                className={`pipeline-card ${isCurrentlyActive ? "is-active-workspace" : ""}`}
              >
                <div className="pipeline-card-top">
                  <div className="pipeline-card-identity">
                    <div className="pipeline-card-avatar">
                      <WorkflowIcon size={18} />
                    </div>
                    <div className="pipeline-card-title-box">
                      <div className="pipeline-title-row">
                        <h3 className="pipeline-card-title" title={wf.name}>
                          {wf.name}
                        </h3>
                        {isCurrentlyActive && (
                          <span className="badge-active-canvas">Open in Canvas</span>
                        )}
                      </div>
                      <div className="pipeline-meta-subtitle">
                        <span className="pipeline-version-tag">v{wf.version || "1.0.0"}</span>
                        <span>•</span>
                        <span className="pipeline-time-tag">
                          <Clock size={11} style={{ marginRight: 3 }} />
                          {formatRelativeTime(wf.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>{renderStatusBadge(wf.status)}</div>
                </div>

                <p className="pipeline-card-desc">
                  {wf.description || "Custom multi-agent engineering workflow."}
                </p>

                {/* Inline Visual Sequence Preview */}
                <div className="pipeline-card-flow-preview">
                  <div className="flow-preview-label">Execution Flow</div>
                  {renderNodeSequenceStrip(wf.nodes)}
                </div>

                {/* Stats row */}
                <div className="pipeline-card-stats-row">
                  <div className="stat-item">
                    <Layers size={13} style={{ color: "var(--accent)" }} />
                    <span>
                      <strong>{wf.nodes?.length || 0}</strong> steps
                    </span>
                  </div>
                  <div className="stat-item">
                    <GitFork size={13} style={{ color: "#64748B" }} />
                    <span>
                      <strong>{wf.edges?.length || 0}</strong> links
                    </span>
                  </div>
                  {hasApprovalGates && (
                    <div className="stat-item gate-indicator">
                      <ShieldCheck size={13} style={{ color: "#F59E0B" }} />
                      <span>Approval Gate</span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pipeline-card-footer">
                  <div className="pipeline-card-quick-actions">
                    <button
                      className="btn-card-action"
                      title="Duplicate workflow"
                      onClick={() => onDuplicateWorkflow(wf.id)}
                    >
                      <Copy size={13} />
                      <span>Duplicate</span>
                    </button>

                    {onInstallWorkflow && (
                      <button
                        className="btn-card-action install"
                        title="Install pipeline.md into workspace root"
                        onClick={() => onInstallWorkflow(wf.id)}
                      >
                        <FileCode2 size={13} />
                        <span>Install MD</span>
                      </button>
                    )}

                    <button
                      className="btn-card-action danger"
                      title="Delete workflow"
                      onClick={() => onDeleteWorkflow(wf.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <button
                    className="btn btn-open-canvas"
                    onClick={() => onOpenWorkflow(wf.id)}
                  >
                    <span>Open Canvas</span>
                    <ArrowRight size={14} className="arrow-hover" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredWorkflows.length === 0 && (
            <div className="dashboard-empty-state">
              <div className="empty-state-icon">
                <WorkflowIcon size={32} />
              </div>
              <h3 className="empty-state-title">No matching pipelines found</h3>
              <p className="empty-state-desc">
                {search
                  ? `No pipelines matched "${search}". Try clearing search or selecting a different status filter.`
                  : "Get started by creating your first multi-agent harness pipeline or choose from the starter templates."}
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {search && (
                  <button className="btn secondary" onClick={() => setSearch("")}>
                    Clear Search
                  </button>
                )}
                <button className="btn primary" onClick={() => onNewWorkflow()}>
                  <Plus size={14} style={{ marginRight: 6 }} /> Create New Pipeline
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Dense Table / List View */
        <div className="dashboard-pipeline-list-table-container">
          <table className="pipeline-table">
            <thead>
              <tr>
                <th style={{ width: "30%" }}>Pipeline</th>
                <th style={{ width: "12%" }}>Status</th>
                <th style={{ width: "30%" }}>Flow Sequence</th>
                <th style={{ width: "12%" }}>Last Updated</th>
                <th style={{ width: "16%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkflows.map((wf) => (
                <tr key={wf.id} className="pipeline-table-row">
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="pipeline-table-avatar">
                        <WorkflowIcon size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                          {wf.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                          v{wf.version || "1.0.0"} • {wf.nodes?.length || 0} nodes
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{renderStatusBadge(wf.status)}</td>
                  <td>{renderNodeSequenceStrip(wf.nodes)}</td>
                  <td>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {formatRelativeTime(wf.updatedAt)}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      {onInstallWorkflow && (
                        <button
                          className="btn-table-action"
                          title="Install pipeline.md"
                          onClick={() => onInstallWorkflow(wf.id)}
                        >
                          <FileCode2 size={13} />
                        </button>
                      )}
                      <button
                        className="btn-table-action"
                        title="Duplicate"
                        onClick={() => onDuplicateWorkflow(wf.id)}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        className="btn-table-action danger"
                        title="Delete"
                        onClick={() => onDeleteWorkflow(wf.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        className="btn primary btn-sm"
                        onClick={() => onOpenWorkflow(wf.id)}
                      >
                        <span>Open</span>
                        <ArrowRight size={12} style={{ marginLeft: 4 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredWorkflows.length === 0 && (
            <div className="dashboard-empty-state">
              <h3 className="empty-state-title">No pipelines found</h3>
              <button className="btn primary" onClick={() => onNewWorkflow()}>
                Create Pipeline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
