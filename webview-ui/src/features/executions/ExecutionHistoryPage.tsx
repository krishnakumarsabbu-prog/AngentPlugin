import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  FileCode,
  Layers,
  X,
  Search,
  Filter,
  ArrowUpDown,
  ChevronRight,
  GitCompareArrows,
  Eye,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Calendar,
  Layers2,
  Ban,
  Activity,
} from "lucide-react";
import type {
  ExecutionRecord,
  Workflow,
  NodeExecution,
  ExecutionFilters,
  ExecutionSortField,
} from "../../types";
import { executionsService } from "../../services/executionsService";
import { workflowsService } from "../../services/workflowsService";
import { filterExecutions, sortExecutions } from "../../services/comparisonService";

interface ExecutionHistoryPageProps {
  onNavigate: (route: string) => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}

export const ExecutionHistoryPage: React.FC<ExecutionHistoryPageProps> = ({
  onNavigate,
  onToast,
}) => {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<ExecutionRecord | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Filters & Sorting state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [workflowFilter, setWorkflowFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState<ExecutionSortField>("startedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Load executions & workflows
  const loadData = async () => {
    setLoading(true);
    try {
      const [allExecs, allWfs] = await Promise.all([
        executionsService.list(),
        workflowsService.list(),
      ]);
      setExecutions(allExecs);
      setWorkflows(allWfs);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to load execution history", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered & Sorted executions
  const filteredAndSorted = useMemo(() => {
    const filters: ExecutionFilters = {
      search,
      status: statusFilter,
      workflowId: workflowFilter,
      dateRange: dateFilter,
    };
    const filtered = filterExecutions(executions, filters);
    return sortExecutions(filtered, sortBy, sortOrder);
  }, [executions, search, statusFilter, workflowFilter, dateFilter, sortBy, sortOrder]);

  // Overall metrics summary
  const metrics = useMemo(() => {
    const total = executions.length;
    const succeeded = executions.filter((e) => e.status === "Succeeded").length;
    const failed = executions.filter((e) => e.status === "Failed").length;
    const waitingOrRunning = executions.filter(
      (e) => e.status === "Waiting for Approval" || e.status === "Running"
    ).length;
    const completedWithDuration = executions.filter((e) => (e.durationMs || 0) > 0);
    const avgDuration =
      completedWithDuration.length > 0
        ? Math.round(
            completedWithDuration.reduce((acc, curr) => acc + (curr.durationMs || 0), 0) /
              completedWithDuration.length
          )
        : 0;

    return { total, succeeded, failed, waitingOrRunning, avgDuration };
  }, [executions]);

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    workflowFilter !== "all" ||
    dateFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setWorkflowFilter("all");
    setDateFilter("all");
  };

  const selectedNodeExec: NodeExecution | null = useMemo(() => {
    if (!selectedRun || !selectedNodeId) return null;
    return selectedRun.nodeExecutions.find((ne) => ne.nodeId === selectedNodeId) || null;
  }, [selectedRun, selectedNodeId]);

  const formatDuration = (ms?: number) => {
    if (ms === undefined || ms === null) return "—";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const handleRecoverRun = async (runId: string) => {
    try {
      onToast("Recovering interrupted simulation run…", "success");
      const recovered = await executionsService.recover(runId);
      setSelectedRun(recovered);
      setExecutions((prev) => prev.map((e) => (e.id === recovered.id ? recovered : e)));
      onToast(`Simulation run ${recovered.id} recovered successfully (${recovered.status})`, "success");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to recover execution", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", padding: "16px 24px", gap: 16 }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
            Execution History
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            Inspect pipeline runs, stage-level timelines, artifact manifests, and failure diagnostics.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn secondary"
            onClick={loadData}
            style={{ fontSize: 12, padding: "6px 10px", display: "flex", alignItems: "center", gap: 5 }}
            title="Refresh runs"
          >
            <RefreshCw size={13} className={loading ? "spin" : ""} />
            Refresh
          </button>
          <button
            className="btn primary"
            onClick={() => onNavigate("pipeline-comparison")}
            style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
          >
            <GitCompareArrows size={14} />
            Compare Pipelines
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Total Runs</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>{metrics.total}</div>
        </div>
        <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: "#065F46", fontWeight: 600 }}>Succeeded</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#059669", marginTop: 2 }}>{metrics.succeeded}</div>
        </div>
        <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: "#991B1B", fontWeight: 600 }}>Failed</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#DC2626", marginTop: 2 }}>{metrics.failed}</div>
        </div>
        <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: "#92400E", fontWeight: 600 }}>In-Progress / Waiting</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#D97706", marginTop: 2 }}>{metrics.waitingOrRunning}</div>
        </div>
        <div style={{ padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Avg. Duration</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>{formatDuration(metrics.avgDuration)}</div>
        </div>
      </div>

      {/* Search & Filters Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--surface)",
          padding: "10px 14px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200, background: "var(--surface-alt)", padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>
          <Search size={14} style={{ color: "var(--text-secondary)" }} />
          <input
            type="text"
            placeholder="Search by run ID, workflow name, version, summary…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: 12, color: "var(--text-primary)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          >
            <option value="all">All Statuses</option>
            <option value="Succeeded">Succeeded</option>
            <option value="Failed">Failed</option>
            <option value="Waiting for Approval">Waiting for Approval</option>
            <option value="Running">Running</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Workflow Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Workflow:</label>
          <select
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value)}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          >
            <option value="all">All Workflows</option>
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Date:</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

        {/* Sorting */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ExecutionSortField)}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)" }}
          >
            <option value="startedAt">Start Time</option>
            <option value="durationMs">Duration</option>
            <option value="status">Status</option>
            <option value="workflowName">Workflow Name</option>
            <option value="totalSteps">Total Steps</option>
          </select>

          <button
            onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
            style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 4, padding: "4px 6px", cursor: "pointer", display: "flex", alignItems: "center" }}
            title={`Sort order: ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
          >
            <ArrowUpDown size={12} style={{ color: "var(--text-primary)" }} />
          </button>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{ fontSize: 11, padding: "4px 8px", background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Content Area: Table / Details View */}
      <div style={{ display: "grid", gridTemplateColumns: selectedRun ? "1fr 1.3fr" : "1fr", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Runs List Table */}
        <div style={{ display: "flex", flexDirection: "column", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: "var(--surface-alt)", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
            <span>Run Details & Status ({filteredAndSorted.length})</span>
            <span>Trigger & Duration</span>
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {filteredAndSorted.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
                <Activity size={32} style={{ margin: "0 auto 8px auto", opacity: 0.5 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>No execution records found</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  {hasActiveFilters
                    ? "No records match your active search and filter criteria. Try clearing filters."
                    : "No pipeline simulation executions recorded yet. Run a workflow from the Harness Pipeline canvas."}
                </div>
                {hasActiveFilters && (
                  <button className="btn secondary" onClick={clearFilters} style={{ marginTop: 12, fontSize: 11 }}>
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              filteredAndSorted.map((run) => {
                const totalSteps = run.nodeExecutions.length;
                const failedSteps = run.nodeExecutions.filter((ne) => ne.status === "Failed").length;
                const isSelected = selectedRun?.id === run.id;

                return (
                  <div
                    key={run.id}
                    onClick={() => {
                      setSelectedRun(run);
                      setSelectedNodeId(run.nodeExecutions[0]?.nodeId || null);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--border)",
                      background: isSelected ? "var(--surface-alt)" : "var(--surface)",
                      borderLeft: isSelected ? "3px solid var(--accent)" : "3px solid transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "background 0.1s",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontSize: 10,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            background:
                              run.status === "Succeeded"
                                ? "#ECFDF5"
                                : run.status === "Failed"
                                ? "#FEF2F2"
                                : run.status === "Waiting for Approval"
                                ? "#FEF3C7"
                                : run.status === "Running"
                                ? "#EFF6FF"
                                : "#F1F5F9",
                            color:
                              run.status === "Succeeded"
                                ? "#047857"
                                : run.status === "Failed"
                                ? "#B91C1C"
                                : run.status === "Waiting for Approval"
                                ? "#B45309"
                                : run.status === "Running"
                                ? "#1D4ED8"
                                : "#475569",
                          }}
                        >
                          {run.status === "Succeeded" && <CheckCircle2 size={11} />}
                          {run.status === "Failed" && <AlertCircle size={11} />}
                          {run.status === "Waiting for Approval" && <AlertTriangle size={11} />}
                          {run.status === "Running" && <Play size={11} />}
                          {run.status === "Cancelled" && <Ban size={11} />}
                          {run.status}
                        </span>

                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                          {run.workflowName || run.workflowId}
                        </span>

                        <span style={{ fontSize: 10, color: "var(--text-secondary)", background: "var(--surface-alt)", padding: "1px 5px", borderRadius: 3, border: "1px solid var(--border)" }}>
                          v{run.workflowVersion}
                        </span>

                        {run.isSimulated && (
                          <span style={{ fontSize: 9, color: "#475569", background: "#E2E8F0", padding: "1px 4px", borderRadius: 2 }}>
                            Sample
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 10 }}>
                        <span>Run: <code>{run.id}</code></span>
                        <span>•</span>
                        <span>Started: {formatTimestamp(run.startedAt)}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>
                          {formatDuration(run.durationMs)}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                          Trigger: <span style={{ textTransform: "capitalize" }}>{run.triggerType || "manual"}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 4 }}>
                        <span style={{ fontSize: 10, padding: "2px 5px", borderRadius: 3, background: "var(--surface-alt)", border: "1px solid var(--border)", color: "var(--text-secondary)" }} title="Total steps">
                          {totalSteps} steps
                        </span>
                        {failedSteps > 0 && (
                          <span style={{ fontSize: 10, padding: "2px 5px", borderRadius: 3, background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }} title="Failed steps">
                            {failedSteps} failed
                          </span>
                        )}
                      </div>

                      <ChevronRight size={14} style={{ color: "var(--text-secondary)" }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Run Detail Inspector (Run Detail View + Timeline + Node Inspector) */}
        {selectedRun && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Run Detail Header */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", background: "var(--surface-alt)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                      {selectedRun.workflowName || selectedRun.workflowId}
                    </h3>
                    <span style={{ fontSize: 10, background: "var(--surface)", border: "1px solid var(--border)", padding: "1px 5px", borderRadius: 3 }}>
                      v{selectedRun.workflowVersion}
                    </span>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: 10,
                        fontWeight: 700,
                        background:
                          selectedRun.status === "Succeeded"
                            ? "#ECFDF5"
                            : selectedRun.status === "Failed"
                            ? "#FEF2F2"
                            : "#EFF6FF",
                        color:
                          selectedRun.status === "Succeeded"
                            ? "#047857"
                            : selectedRun.status === "Failed"
                            ? "#B91C1C"
                            : "#1D4ED8",
                      }}
                    >
                      {selectedRun.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
                    Run ID: <code>{selectedRun.id}</code> | Trigger: <strong>{selectedRun.triggerType || "manual"}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {(selectedRun.status === "Cancelled" || selectedRun.status === "Running" || selectedRun.status === "Waiting for Approval") && (
                    <button
                      className="btn secondary"
                      onClick={() => handleRecoverRun(selectedRun.id)}
                      style={{ fontSize: 11, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4, color: "var(--accent)" }}
                      title="Recover and resume interrupted simulation"
                    >
                      <RotateCcw size={12} />
                      Recover Run
                    </button>
                  )}
                  <button
                    className="btn secondary"
                    onClick={() => {
                      onNavigate(`pipeline-comparison?runA=${selectedRun.id}`);
                    }}
                    style={{ fontSize: 11, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                    title="Compare this run with another execution"
                  >
                    <GitCompareArrows size={12} />
                    Compare Run
                  </button>
                  <button
                    onClick={() => setSelectedRun(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Run Timing Details */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10, fontSize: 11, background: "var(--surface)", padding: "8px 10px", borderRadius: 4, border: "1px solid var(--border)" }}>
                <div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>Started</div>
                  <div style={{ fontWeight: 600 }}>{formatTimestamp(selectedRun.startedAt)}</div>
                </div>
                <div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>Completed</div>
                  <div style={{ fontWeight: 600 }}>{formatTimestamp(selectedRun.completedAt)}</div>
                </div>
                <div>
                  <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>Duration</div>
                  <div style={{ fontWeight: 600 }}>{formatDuration(selectedRun.durationMs)}</div>
                </div>
              </div>

              {/* Final Summary Display */}
              {selectedRun.finalSummary && (
                <div style={{ marginTop: 8, fontSize: 11, padding: "6px 10px", background: selectedRun.status === "Succeeded" ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${selectedRun.status === "Succeeded" ? "#A7F3D0" : "#FECACA"}`, borderRadius: 4, color: selectedRun.status === "Succeeded" ? "#065F46" : "#991B1B" }}>
                  <strong>Final Summary:</strong> {selectedRun.finalSummary}
                </div>
              )}
            </div>

            {/* Run Detail Body (Timeline & Selected Node) */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflowY: "auto", padding: 12, gap: 12 }}>
              {/* Execution Timeline (Interactive Stage List) */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>
                  Execution Timeline ({selectedRun.nodeExecutions.length} Steps)
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {selectedRun.nodeExecutions.map((ne, idx) => {
                    const isNodeSelected = selectedNodeId === ne.nodeId;
                    return (
                      <div
                        key={ne.nodeId}
                        onClick={() => setSelectedNodeId(ne.nodeId)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 4,
                          border: `1px solid ${isNodeSelected ? "var(--accent)" : "var(--border)"}`,
                          background: isNodeSelected ? "var(--surface-alt)" : "var(--surface)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 11,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "var(--text-secondary)", width: 14 }}>{idx + 1}</span>
                          <div>
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {ne.nodeName || ne.nodeId}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--text-secondary)", marginLeft: 6 }}>
                              ({ne.nodeType})
                            </span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {ne.durationMs !== undefined && (
                            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                              {formatDuration(ne.durationMs)}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: 3,
                              background:
                                ne.status === "Succeeded"
                                  ? "#ECFDF5"
                                  : ne.status === "Failed"
                                  ? "#FEF2F2"
                                  : "#EFF6FF",
                              color:
                                ne.status === "Succeeded"
                                  ? "#047857"
                                  : ne.status === "Failed"
                                  ? "#B91C1C"
                                  : "#1D4ED8",
                            }}
                          >
                            {ne.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Node Detail Inspector */}
              {selectedNodeExec && (
                <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: 10, background: "var(--surface-alt)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text-primary)" }}>
                        Stage Inspector: {selectedNodeExec.nodeName}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                        Node ID: <code>{selectedNodeExec.nodeId}</code> | Type: <code>{selectedNodeExec.nodeType}</code>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: 10,
                        fontWeight: 700,
                        background:
                          selectedNodeExec.status === "Succeeded"
                            ? "#ECFDF5"
                            : selectedNodeExec.status === "Failed"
                            ? "#FEF2F2"
                            : "#EFF6FF",
                        color:
                          selectedNodeExec.status === "Succeeded"
                            ? "#047857"
                            : selectedNodeExec.status === "Failed"
                            ? "#B91C1C"
                            : "#1D4ED8",
                      }}
                    >
                      {selectedNodeExec.status}
                    </span>
                  </div>

                  {/* Validation Results */}
                  {selectedNodeExec.validation && (
                    <div
                      style={{
                        padding: "6px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        background: selectedNodeExec.validation.passed ? "#ECFDF5" : "#FEF2F2",
                        color: selectedNodeExec.validation.passed ? "#065F46" : "#991B1B",
                        border: `1px solid ${selectedNodeExec.validation.passed ? "#A7F3D0" : "#FECACA"}`,
                      }}
                    >
                      {selectedNodeExec.validation.passed ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                      <span>{selectedNodeExec.validation.message || (selectedNodeExec.validation.passed ? "Validation criteria passed" : "Validation assertion failed")}</span>
                    </div>
                  )}

                  {/* Error display */}
                  {selectedNodeExec.error && (
                    <div style={{ padding: "6px 8px", background: "#FEF2F2", color: "#991B1B", borderRadius: 4, fontSize: 10 }}>
                      <strong>Error:</strong> {selectedNodeExec.error}
                    </div>
                  )}

                  {/* Retry history */}
                  {selectedNodeExec.retries && selectedNodeExec.retries.length > 0 && (
                    <div style={{ fontSize: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: 6 }}>
                      <div style={{ fontWeight: 600, marginBottom: 3, display: "flex", alignItems: "center", gap: 4 }}>
                        <RotateCcw size={10} />
                        Retry Attempts ({selectedNodeExec.retries.length})
                      </div>
                      {selectedNodeExec.retries.map((r) => (
                        <div key={r.attemptNumber} style={{ padding: "2px 0", borderBottom: "1px dotted var(--border)", display: "flex", justifyContent: "space-between" }}>
                          <span>Attempt #{r.attemptNumber} ({r.backoffSeconds}s backoff)</span>
                          <span style={{ color: r.succeeded ? "#059669" : "#DC2626", fontWeight: 600 }}>{r.succeeded ? "SUCCESS" : "FAILED"}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inputs & Outputs */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Inputs</div>
                      <pre style={{ margin: 0, padding: 6, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 9, maxHeight: 90, overflowY: "auto" }}>
                        {JSON.stringify(selectedNodeExec.inputs || {}, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Outputs</div>
                      <pre style={{ margin: 0, padding: 6, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 9, maxHeight: 90, overflowY: "auto" }}>
                        {JSON.stringify(selectedNodeExec.outputs || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Artifact References */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
                  Artifact References ({(selectedRun.artifacts || []).length})
                </div>
                {(selectedRun.artifacts || []).length === 0 ? (
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic" }}>
                    No artifacts attached to this run.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {(selectedRun.artifacts || []).map((art) => (
                      <div
                        key={art.id}
                        style={{
                          padding: "6px 8px",
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 11,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <FileCode size={13} style={{ color: "var(--accent)" }} />
                          <span style={{ fontWeight: 600 }}>{art.name}</span>
                          <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>({art.type})</span>
                        </div>
                        <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>{art.id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
