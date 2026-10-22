import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  GitCompareArrows,
  ArrowLeftRight,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Bot,
  Sparkles,
  Layers,
  Columns,
  List,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileText,
  RotateCcw,
  Check,
  XCircle,
} from "lucide-react";
import type { Workflow, ExecutionRecord, WorkflowDiffResult, NodeDiff, EdgeDiff } from "../../types";
import { workflowsService } from "../../services/workflowsService";
import { executionsService } from "../../services/executionsService";
import { compareWorkflows, compareExecutions } from "../../services/comparisonService";

interface PipelineComparisonPageProps {
  onNavigate?: (route: string) => void;
  onToast: (msg: string, type?: "success" | "info" | "warning" | "error") => void;
  route?: string;
}

export const PipelineComparisonPage: React.FC<PipelineComparisonPageProps> = ({
  onNavigate,
  onToast,
  route,
}) => {
  // Mode: "workflow" or "execution"
  const [comparisonType, setComparisonType] = useState<"workflow" | "execution">("workflow");
  const [viewMode, setViewMode] = useState<"side-by-side" | "change-list">("side-by-side");
  const [filterDiff, setFilterDiff] = useState<"all" | "changed" | "added" | "removed" | "modified">("all");

  // Available data
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected targets
  const [targetAId, setTargetAId] = useState<string>("");
  const [targetBId, setTargetBId] = useState<string>("");

  // Expanded nodes in change-list view
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Parse route parameters if present, e.g. pipeline-comparison:type=run&a=exec-1001&b=exec-1002
  useEffect(() => {
    if (route && route.startsWith("pipeline-comparison:")) {
      const queryStr = route.slice("pipeline-comparison:".length);
      const params = new URLSearchParams(queryStr);
      const type = params.get("type");
      const a = params.get("a");
      const b = params.get("b");

      if (type === "run" || type === "execution") {
        setComparisonType("execution");
      } else if (type === "workflow") {
        setComparisonType("workflow");
      }
      if (a) setTargetAId(a);
      if (b) setTargetBId(b);
    }
  }, [route]);

  // Load initial workflows and executions
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const [wfs, execs] = await Promise.all([
          workflowsService.list(),
          executionsService.list(),
        ]);
        if (!isMounted) return;
        setWorkflows(wfs);
        setExecutions(execs);

        // Auto-select defaults if not set
        if (!targetAId && !targetBId) {
          if (comparisonType === "workflow" && wfs.length >= 2) {
            setTargetAId(wfs[0].id);
            setTargetBId(wfs[1].id);
          } else if (comparisonType === "workflow" && wfs.length === 1) {
            setTargetAId(wfs[0].id);
            setTargetBId(wfs[0].id);
          } else if (comparisonType === "execution" && execs.length >= 2) {
            setTargetAId(execs[0].id);
            setTargetBId(execs[1].id);
          }
        }
      } catch (e) {
        onToast("Failed to load pipeline comparison data", "error");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // When switching modes, set sensible defaults if targets don't match
  const handleTypeChange = (newType: "workflow" | "execution") => {
    setComparisonType(newType);
    if (newType === "workflow") {
      if (workflows.length >= 2) {
        setTargetAId(workflows[0].id);
        setTargetBId(workflows[1].id);
      } else if (workflows.length === 1) {
        setTargetAId(workflows[0].id);
        setTargetBId(workflows[0].id);
      } else {
        setTargetAId("");
        setTargetBId("");
      }
    } else {
      if (executions.length >= 2) {
        setTargetAId(executions[0].id);
        setTargetBId(executions[1].id);
      } else if (executions.length === 1) {
        setTargetAId(executions[0].id);
        setTargetBId(executions[0].id);
      } else {
        setTargetAId("");
        setTargetBId("");
      }
    }
  };

  // Swap target A and target B
  const handleSwapTargets = () => {
    const temp = targetAId;
    setTargetAId(targetBId);
    setTargetBId(temp);
  };

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  // Calculate Diff Result
  const diffResult: WorkflowDiffResult | null = useMemo(() => {
    if (!targetAId || !targetBId) return null;

    if (comparisonType === "workflow") {
      const wfA = workflows.find((w) => w.id === targetAId);
      const wfB = workflows.find((w) => w.id === targetBId);
      if (!wfA || !wfB) return null;
      return compareWorkflows(wfA, wfB);
    } else {
      const execA = executions.find((e) => e.id === targetAId);
      const execB = executions.find((e) => e.id === targetBId);
      if (!execA || !execB) return null;

      const wfA = workflows.find((w) => w.id === execA.workflowId);
      const wfB = workflows.find((w) => w.id === execB.workflowId);
      return compareExecutions(execA, execB, wfA, wfB);
    }
  }, [comparisonType, targetAId, targetBId, workflows, executions]);

  // Filtered nodes
  const filteredNodeDiffs = useMemo(() => {
    if (!diffResult) return [];
    if (filterDiff === "all") return diffResult.nodeDiffs;
    if (filterDiff === "changed") return diffResult.nodeDiffs.filter((n) => n.status !== "unchanged");
    return diffResult.nodeDiffs.filter((n) => n.status === filterDiff);
  }, [diffResult, filterDiff]);

  const formatDuration = (ms?: number) => {
    if (ms === undefined || ms === null) return "--";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Succeeded":
      case "Active":
      case "Ready":
        return <span className="badge-status ready">{status}</span>;
      case "Failed":
        return <span className="badge-status" style={{ background: "#FEE2E2", color: "#991B1B" }}>{status}</span>;
      case "Waiting for Approval":
        return <span className="badge-status" style={{ background: "#FEF3C7", color: "#92400E" }}>{status}</span>;
      case "Running":
      case "Validating":
        return <span className="badge-status" style={{ background: "#E0E7FF", color: "#3730A3" }}>{status}</span>;
      default:
        return <span className="badge-status draft">{status || "Unknown"}</span>;
    }
  };

  return (
    <div className="pipeline-comparison-page" style={{ padding: "20px 24px", height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header controls bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <GitCompareArrows size={22} style={{ color: "var(--accent)" }} /> Pipeline & Run Comparison
            </h1>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE", fontWeight: 600 }}>
              v1.0 Diffs Engine
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            Inspect structural, contractual, agent, and execution performance differences between workflows or run records.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Comparison Mode Selector */}
          <div style={{ display: "flex", background: "var(--bg-secondary, #F1F5F9)", padding: 3, borderRadius: 6, border: "1px solid var(--border-color, #E2E8F0)" }}>
            <button
              className={`btn ${comparisonType === "workflow" ? "primary" : "secondary"}`}
              style={{ padding: "5px 12px", fontSize: 12, borderRadius: 4, border: "none" }}
              onClick={() => handleTypeChange("workflow")}
            >
              <Layers size={13} style={{ marginRight: 6 }} /> Compare Workflows
            </button>
            <button
              className={`btn ${comparisonType === "execution" ? "primary" : "secondary"}`}
              style={{ padding: "5px 12px", fontSize: 12, borderRadius: 4, border: "none" }}
              onClick={() => handleTypeChange("execution")}
            >
              <Clock size={13} style={{ marginRight: 6 }} /> Compare Execution Runs
            </button>
          </div>

          {/* View mode toggle */}
          <div style={{ display: "flex", background: "var(--bg-secondary, #F1F5F9)", padding: 3, borderRadius: 6, border: "1px solid var(--border-color, #E2E8F0)" }}>
            <button
              className={`btn ${viewMode === "side-by-side" ? "primary" : "secondary"}`}
              style={{ padding: "5px 10px", fontSize: 12, borderRadius: 4, border: "none" }}
              onClick={() => setViewMode("side-by-side")}
              title="Side-by-Side View"
            >
              <Columns size={13} style={{ marginRight: 4 }} /> Side-by-Side
            </button>
            <button
              className={`btn ${viewMode === "change-list" ? "primary" : "secondary"}`}
              style={{ padding: "5px 10px", fontSize: 12, borderRadius: 4, border: "none" }}
              onClick={() => setViewMode("change-list")}
              title="Change-List View"
            >
              <List size={13} style={{ marginRight: 4 }} /> Change List
            </button>
          </div>
        </div>
      </div>

      {/* Selector Panels: Target A vs Target B */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 12,
          alignItems: "center",
          background: "var(--card-bg, #FFFFFF)",
          padding: 16,
          borderRadius: 8,
          border: "1px solid var(--border-color, #E2E8F0)",
        }}
      >
        {/* Left Target (A) */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
            Base Target (A — Baseline)
          </label>
          <select
            className="prop-select"
            style={{ width: "100%", fontSize: 13, padding: "8px 10px" }}
            value={targetAId}
            onChange={(e) => setTargetAId(e.target.value)}
            disabled={isLoading}
          >
            {comparisonType === "workflow" ? (
              workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (v{w.version || "1.0.0"} • {w.nodes?.length || 0} nodes) {w.id.startsWith("wf-enterprise") || w.id.startsWith("wf-security") ? "[Sample]" : ""}
                </option>
              ))
            ) : (
              executions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} — {e.workflowName || e.workflowId} ({e.status}) {e.isSimulated ? "[Sample]" : ""}
                </option>
              ))
            )}
          </select>
          {diffResult?.targetA && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-secondary)" }}>
              <span>ID: <code>{diffResult.targetA.id}</code></span>
              {diffResult.targetA.version && <span>• v{diffResult.targetA.version}</span>}
              {diffResult.targetA.isSimulated && (
                <span style={{ background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                  Sample Data
                </span>
              )}
            </div>
          )}
        </div>

        {/* Swap button */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <button
            className="btn secondary"
            style={{ padding: "8px 10px", borderRadius: "50%", minWidth: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={handleSwapTargets}
            title="Swap targets A and B"
          >
            <ArrowLeftRight size={15} />
          </button>
        </div>

        {/* Right Target (B) */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>
            Comparison Target (B — Compared)
          </label>
          <select
            className="prop-select"
            style={{ width: "100%", fontSize: 13, padding: "8px 10px" }}
            value={targetBId}
            onChange={(e) => setTargetBId(e.target.value)}
            disabled={isLoading}
          >
            {comparisonType === "workflow" ? (
              workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (v{w.version || "1.0.0"} • {w.nodes?.length || 0} nodes) {w.id.startsWith("wf-enterprise") || w.id.startsWith("wf-security") ? "[Sample]" : ""}
                </option>
              ))
            ) : (
              executions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id} — {e.workflowName || e.workflowId} ({e.status}) {e.isSimulated ? "[Sample]" : ""}
                </option>
              ))
            )}
          </select>
          {diffResult?.targetB && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-secondary)" }}>
              <span>ID: <code>{diffResult.targetB.id}</code></span>
              {diffResult.targetB.version && <span>• v{diffResult.targetB.version}</span>}
              {diffResult.targetB.isSimulated && (
                <span style={{ background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                  Sample Data
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Empty State / Same Targets Alert */}
      {targetAId === targetBId && targetAId !== "" && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <AlertCircle size={18} style={{ color: "#2563EB", flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#1E40AF" }}>
            <strong>Identical targets selected.</strong> Baseline (A) and Compared (B) reference the same record. Select different workflows or runs above to inspect differences.
          </div>
        </div>
      )}

      {/* Metrics & Diff Summary Cards */}
      {diffResult && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div style={{ background: "var(--card-bg, #FFFFFF)", border: "1px solid var(--border-color, #E2E8F0)", borderRadius: 6, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              <PlusCircle size={13} style={{ color: "#10B981" }} /> Node Additions
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10B981", marginTop: 4 }}>
              +{diffResult.summary.addedNodesCount}
            </div>
          </div>

          <div style={{ background: "var(--card-bg, #FFFFFF)", border: "1px solid var(--border-color, #E2E8F0)", borderRadius: 6, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              <MinusCircle size={13} style={{ color: "#EF4444" }} /> Node Removals
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#EF4444", marginTop: 4 }}>
              -{diffResult.summary.removedNodesCount}
            </div>
          </div>

          <div style={{ background: "var(--card-bg, #FFFFFF)", border: "1px solid var(--border-color, #E2E8F0)", borderRadius: 6, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              <AlertTriangle size={13} style={{ color: "#F59E0B" }} /> Modified Nodes
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#F59E0B", marginTop: 4 }}>
              ~{diffResult.summary.modifiedNodesCount}
            </div>
          </div>

          <div style={{ background: "var(--card-bg, #FFFFFF)", border: "1px solid var(--border-color, #E2E8F0)", borderRadius: 6, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={13} style={{ color: "#64748B" }} /> Unchanged Nodes
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
              {diffResult.summary.unchangedNodesCount}
            </div>
          </div>

          <div style={{ background: "var(--card-bg, #FFFFFF)", border: "1px solid var(--border-color, #E2E8F0)", borderRadius: 6, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              <Layers size={13} style={{ color: "#6366F1" }} /> Edge Changes
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 8 }}>
              +{diffResult.summary.addedEdgesCount} / -{diffResult.summary.removedEdgesCount} / ~{diffResult.summary.modifiedEdgesCount}
            </div>
          </div>

          {comparisonType === "execution" && (
            <>
              <div style={{ background: "var(--card-bg, #FFFFFF)", border: "1px solid var(--border-color, #E2E8F0)", borderRadius: 6, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={13} style={{ color: "#8B5CF6" }} /> Duration Delta
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    marginTop: 6,
                    color:
                      (diffResult.summary.durationDeltaMs || 0) < 0
                        ? "#10B981"
                        : (diffResult.summary.durationDeltaMs || 0) > 0
                          ? "#EF4444"
                          : "var(--text-primary)",
                  }}
                >
                  {(diffResult.summary.durationDeltaMs || 0) > 0 ? "+" : ""}
                  {formatDuration(diffResult.summary.durationDeltaMs)}
                </div>
              </div>

              <div style={{ background: "var(--card-bg, #FFFFFF)", border: "1px solid var(--border-color, #E2E8F0)", borderRadius: 6, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                  <XCircle size={13} style={{ color: "#EF4444" }} /> Failure Points
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 6 }}>
                  A: {diffResult.summary.failurePointsA.length} | B: {diffResult.summary.failurePointsB.length}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filter Tabs for Nodes */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color, #E2E8F0)", paddingBottom: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {(["all", "changed", "added", "removed", "modified"] as const).map((filterKey) => (
            <button
              key={filterKey}
              className={`btn ${filterDiff === filterKey ? "primary" : "secondary"}`}
              style={{ padding: "4px 10px", fontSize: 12, borderRadius: 4 }}
              onClick={() => setFilterDiff(filterKey)}
            >
              {filterKey === "all" && "All Nodes"}
              {filterKey === "changed" && "Only Changed"}
              {filterKey === "added" && "Added (+)"}
              {filterKey === "removed" && "Removed (-)"}
              {filterKey === "modified" && "Modified (~)"}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Showing {filteredNodeDiffs.length} of {diffResult?.nodeDiffs.length || 0} node diff(s)
        </div>
      </div>

      {/* Main Diff Content */}
      {diffResult && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Target Metadata & Final Summary Side-by-Side */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              background: "var(--card-bg, #FFFFFF)",
              padding: 14,
              borderRadius: 8,
              border: "1px solid var(--border-color, #E2E8F0)",
            }}
          >
            {/* Target A Details */}
            <div style={{ borderRight: "1px solid var(--border-color, #E2E8F0)", paddingRight: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                  {diffResult.targetA.name}
                </span>
                {getStatusBadge(diffResult.targetA.status)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, display: "flex", gap: 12 }}>
                {diffResult.targetA.durationMs !== undefined && <span>Duration: {formatDuration(diffResult.targetA.durationMs)}</span>}
                {diffResult.targetA.startedAt && <span>Started: {new Date(diffResult.targetA.startedAt).toLocaleTimeString()}</span>}
              </div>
              {diffResult.targetA.finalSummary && (
                <div style={{ marginTop: 8, fontSize: 12, background: "var(--bg-secondary, #F8FAFC)", padding: "8px 10px", borderRadius: 4, border: "1px solid var(--border-color, #E2E8F0)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>Final Summary (A):</div>
                  {diffResult.targetA.finalSummary}
                </div>
              )}
            </div>

            {/* Target B Details */}
            <div style={{ paddingLeft: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                  {diffResult.targetB.name}
                </span>
                {getStatusBadge(diffResult.targetB.status)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, display: "flex", gap: 12 }}>
                {diffResult.targetB.durationMs !== undefined && <span>Duration: {formatDuration(diffResult.targetB.durationMs)}</span>}
                {diffResult.targetB.startedAt && <span>Started: {new Date(diffResult.targetB.startedAt).toLocaleTimeString()}</span>}
              </div>
              {diffResult.targetB.finalSummary && (
                <div style={{ marginTop: 8, fontSize: 12, background: "var(--bg-secondary, #F8FAFC)", padding: "8px 10px", borderRadius: 4, border: "1px solid var(--border-color, #E2E8F0)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>Final Summary (B):</div>
                  {diffResult.targetB.finalSummary}
                </div>
              )}
            </div>
          </div>

          {/* SIDE-BY-SIDE VIEW */}
          {viewMode === "side-by-side" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredNodeDiffs.map((node) => {
                const isAdded = node.status === "added";
                const isRemoved = node.status === "removed";
                const isModified = node.status === "modified";

                return (
                  <div
                    key={node.nodeId}
                    style={{
                      background: "var(--card-bg, #FFFFFF)",
                      borderRadius: 8,
                      border: `1px solid ${
                        isAdded ? "#A7F3D0" : isRemoved ? "#FECACA" : isModified ? "#FDE68A" : "var(--border-color, #E2E8F0)"
                      }`,
                      overflow: "hidden",
                    }}
                  >
                    {/* Node Header */}
                    <div
                      style={{
                        padding: "8px 14px",
                        background: isAdded ? "#ECFDF5" : isRemoved ? "#FEF2F2" : isModified ? "#FFFBEB" : "var(--bg-secondary, #F8FAFC)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderBottom: "1px solid var(--border-color, #E2E8F0)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isAdded && <span style={{ background: "#10B981", color: "#FFF", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>ADDED</span>}
                        {isRemoved && <span style={{ background: "#EF4444", color: "#FFF", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>REMOVED</span>}
                        {isModified && <span style={{ background: "#F59E0B", color: "#FFF", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>MODIFIED</span>}
                        {node.status === "unchanged" && <span style={{ background: "#94A3B8", color: "#FFF", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>UNCHANGED</span>}

                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{node.nodeName}</span>
                        <code style={{ fontSize: 11, color: "var(--text-secondary)" }}>{node.nodeId}</code>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>({node.nodeType})</span>
                      </div>

                      {comparisonType === "execution" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          {node.runDetailsA?.isFailurePoint && (
                            <span style={{ background: "#FEE2E2", color: "#991B1B", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>
                              <AlertTriangle size={11} /> Failure Point (A)
                            </span>
                          )}
                          {node.runDetailsB?.isFailurePoint && (
                            <span style={{ background: "#FEE2E2", color: "#991B1B", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>
                              <AlertTriangle size={11} /> Failure Point (B)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Side-by-Side Columns for this Node */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                      {/* Left Column (A) */}
                      <div style={{ padding: "12px 14px", borderRight: "1px solid var(--border-color, #E2E8F0)", background: isAdded ? "#FAFAFA" : "transparent" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                          BASELINE (A)
                        </div>
                        {isAdded ? (
                          <div style={{ fontStyle: "italic", fontSize: 12, color: "var(--text-secondary)" }}>
                            Node does not exist in Target A
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {/* Execution state if in execution mode */}
                            {node.runDetailsA && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, background: "var(--bg-secondary, #F8FAFC)", padding: "4px 8px", borderRadius: 4 }}>
                                <span>Status: {getStatusBadge(node.runDetailsA.status)}</span>
                                <span>Duration: <strong>{formatDuration(node.runDetailsA.durationMs)}</strong></span>
                                {node.runDetailsA.validationPassed !== undefined && (
                                  <span style={{ color: node.runDetailsA.validationPassed ? "#059669" : "#DC2626", fontWeight: 600 }}>
                                    {node.runDetailsA.validationPassed ? "✓ Validated" : "✗ Validation Failed"}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Agent assignment */}
                            {node.agentChange?.before && (
                              <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                <Bot size={13} style={{ color: "var(--accent)" }} />
                                <span>Agent: <strong>{node.agentChange.before}</strong></span>
                              </div>
                            )}

                            {/* Skill assignment */}
                            {node.skillChange?.before && (
                              <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                <Sparkles size={13} style={{ color: "#8B5CF6" }} />
                                <span>Skill: <strong>{node.skillChange.before}</strong></span>
                              </div>
                            )}

                            {/* Config diffs */}
                            {node.configChanges.length > 0 && (
                              <div style={{ marginTop: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Configuration:</div>
                                <div style={{ fontSize: 11, background: "var(--bg-secondary, #F8FAFC)", padding: "4px 8px", borderRadius: 4 }}>
                                  {node.configChanges.map((c, i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                      <code>{c.field}</code>:
                                      <span style={{ color: "#EF4444", fontWeight: 600 }}>{JSON.stringify(c.before) ?? "—"}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Contract diffs */}
                            {node.contractChanges.length > 0 && (
                              <div style={{ marginTop: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Contract Fields:</div>
                                <div style={{ fontSize: 11, background: "var(--bg-secondary, #F8FAFC)", padding: "4px 8px", borderRadius: 4 }}>
                                  {node.contractChanges.map((c, i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                      <span>[{c.contract}] <code>{c.field}</code></span>:
                                      <span style={{ color: "#EF4444" }}>{JSON.stringify(c.before) ?? "—"}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {node.runDetailsA?.error && (
                              <div style={{ fontSize: 11, color: "#DC2626", background: "#FEE2E2", padding: "4px 8px", borderRadius: 4, marginTop: 4 }}>
                                Error: {node.runDetailsA.error}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Column (B) */}
                      <div style={{ padding: "12px 14px", background: isRemoved ? "#FAFAFA" : "transparent" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                          COMPARED (B)
                        </div>
                        {isRemoved ? (
                          <div style={{ fontStyle: "italic", fontSize: 12, color: "var(--text-secondary)" }}>
                            Node was removed in Target B
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {/* Execution state if in execution mode */}
                            {node.runDetailsB && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, background: "var(--bg-secondary, #F8FAFC)", padding: "4px 8px", borderRadius: 4 }}>
                                <span>Status: {getStatusBadge(node.runDetailsB.status)}</span>
                                <span>Duration: <strong>{formatDuration(node.runDetailsB.durationMs)}</strong></span>
                                {node.runDetailsB.validationPassed !== undefined && (
                                  <span style={{ color: node.runDetailsB.validationPassed ? "#059669" : "#DC2626", fontWeight: 600 }}>
                                    {node.runDetailsB.validationPassed ? "✓ Validated" : "✗ Validation Failed"}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Agent assignment */}
                            {node.agentChange?.after && (
                              <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                <Bot size={13} style={{ color: "var(--accent)" }} />
                                <span>Agent: <strong style={{ color: "#10B981" }}>{node.agentChange.after}</strong></span>
                              </div>
                            )}

                            {/* Skill assignment */}
                            {node.skillChange?.after && (
                              <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                <Sparkles size={13} style={{ color: "#8B5CF6" }} />
                                <span>Skill: <strong style={{ color: "#10B981" }}>{node.skillChange.after}</strong></span>
                              </div>
                            )}

                            {/* Config diffs */}
                            {node.configChanges.length > 0 && (
                              <div style={{ marginTop: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Configuration:</div>
                                <div style={{ fontSize: 11, background: "var(--bg-secondary, #F8FAFC)", padding: "4px 8px", borderRadius: 4 }}>
                                  {node.configChanges.map((c, i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                      <code>{c.field}</code>:
                                      <span style={{ color: "#10B981", fontWeight: 600 }}>{JSON.stringify(c.after) ?? "—"}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Contract diffs */}
                            {node.contractChanges.length > 0 && (
                              <div style={{ marginTop: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Contract Fields:</div>
                                <div style={{ fontSize: 11, background: "var(--bg-secondary, #F8FAFC)", padding: "4px 8px", borderRadius: 4 }}>
                                  {node.contractChanges.map((c, i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                      <span>[{c.contract}] <code>{c.field}</code></span>:
                                      <span style={{ color: "#10B981" }}>{JSON.stringify(c.after) ?? "—"}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {node.runDetailsB?.error && (
                              <div style={{ fontSize: 11, color: "#DC2626", background: "#FEE2E2", padding: "4px 8px", borderRadius: 4, marginTop: 4 }}>
                                Error: {node.runDetailsB.error}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CHANGE LIST VIEW */}
          {viewMode === "change-list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredNodeDiffs.map((node) => {
                const isExpanded = !!expandedNodes[node.nodeId];
                const isAdded = node.status === "added";
                const isRemoved = node.status === "removed";
                const isModified = node.status === "modified";

                return (
                  <div
                    key={node.nodeId}
                    style={{
                      background: "var(--card-bg, #FFFFFF)",
                      borderRadius: 6,
                      border: "1px solid var(--border-color, #E2E8F0)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        background: isAdded ? "#ECFDF5" : isRemoved ? "#FEF2F2" : isModified ? "#FFFBEB" : "transparent",
                      }}
                      onClick={() => toggleNodeExpanded(node.nodeId)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        {isAdded && <PlusCircle size={14} style={{ color: "#10B981" }} />}
                        {isRemoved && <MinusCircle size={14} style={{ color: "#EF4444" }} />}
                        {isModified && <AlertTriangle size={14} style={{ color: "#F59E0B" }} />}
                        {node.status === "unchanged" && <Check size={14} style={{ color: "#64748B" }} />}

                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                          {node.nodeName}
                        </span>
                        <code style={{ fontSize: 11, color: "var(--text-secondary)" }}>{node.nodeId}</code>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>({node.nodeType})</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                        {node.configChanges.length > 0 && (
                          <span style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", padding: "1px 6px", borderRadius: 4 }}>
                            {node.configChanges.length} config change(s)
                          </span>
                        )}
                        {node.contractChanges.length > 0 && (
                          <span style={{ fontSize: 11, background: "#E0E7FF", color: "#3730A3", padding: "1px 6px", borderRadius: 4 }}>
                            {node.contractChanges.length} contract change(s)
                          </span>
                        )}
                        <span style={{ fontWeight: 600, textTransform: "capitalize", color: isAdded ? "#10B981" : isRemoved ? "#EF4444" : isModified ? "#F59E0B" : "var(--text-secondary)" }}>
                          {node.status}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-color, #E2E8F0)", fontSize: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Agent change */}
                        {node.agentChange && (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Bot size={14} />
                            <strong>Agent Assignment:</strong>
                            <span style={{ color: "#EF4444", textDecoration: "line-through" }}>{node.agentChange.before || "None"}</span>
                            <span>→</span>
                            <span style={{ color: "#10B981", fontWeight: 600 }}>{node.agentChange.after || "None"}</span>
                          </div>
                        )}

                        {/* Skill change */}
                        {node.skillChange && (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <Sparkles size={14} />
                            <strong>Skill Assignment:</strong>
                            <span style={{ color: "#EF4444", textDecoration: "line-through" }}>{node.skillChange.before || "None"}</span>
                            <span>→</span>
                            <span style={{ color: "#10B981", fontWeight: 600 }}>{node.skillChange.after || "None"}</span>
                          </div>
                        )}

                        {/* Config changes table */}
                        {node.configChanges.length > 0 && (
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Configuration Diffs:</div>
                            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ textAlign: "left", background: "var(--bg-secondary, #F8FAFC)", borderBottom: "1px solid var(--border-color, #E2E8F0)" }}>
                                  <th style={{ padding: "4px 8px" }}>Field</th>
                                  <th style={{ padding: "4px 8px" }}>Before (A)</th>
                                  <th style={{ padding: "4px 8px" }}>After (B)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {node.configChanges.map((c, i) => (
                                  <tr key={i} style={{ borderBottom: "1px solid var(--border-color, #E2E8F0)" }}>
                                    <td style={{ padding: "4px 8px" }}><code>{c.field}</code></td>
                                    <td style={{ padding: "4px 8px", color: "#EF4444" }}>{JSON.stringify(c.before) ?? "—"}</td>
                                    <td style={{ padding: "4px 8px", color: "#10B981", fontWeight: 600 }}>{JSON.stringify(c.after) ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Contract changes table */}
                        {node.contractChanges.length > 0 && (
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Contract Field Diffs:</div>
                            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ textAlign: "left", background: "var(--bg-secondary, #F8FAFC)", borderBottom: "1px solid var(--border-color, #E2E8F0)" }}>
                                  <th style={{ padding: "4px 8px" }}>Contract</th>
                                  <th style={{ padding: "4px 8px" }}>Field</th>
                                  <th style={{ padding: "4px 8px" }}>Before (A)</th>
                                  <th style={{ padding: "4px 8px" }}>After (B)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {node.contractChanges.map((c, i) => (
                                  <tr key={i} style={{ borderBottom: "1px solid var(--border-color, #E2E8F0)" }}>
                                    <td style={{ padding: "4px 8px" }}>{c.contract}</td>
                                    <td style={{ padding: "4px 8px" }}><code>{c.field}</code></td>
                                    <td style={{ padding: "4px 8px", color: "#EF4444" }}>{JSON.stringify(c.before) ?? "—"}</td>
                                    <td style={{ padding: "4px 8px", color: "#10B981", fontWeight: 600 }}>{JSON.stringify(c.after) ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Execution run step comparison */}
                        {(node.runDetailsA || node.runDetailsB) && (
                          <div>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Execution Step Comparison:</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                              <div style={{ background: "var(--bg-secondary, #F8FAFC)", padding: 8, borderRadius: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: 700 }}>Run A:</div>
                                <div>Status: {node.runDetailsA?.status || "Did not run"}</div>
                                <div>Duration: {formatDuration(node.runDetailsA?.durationMs)}</div>
                                <div>Validation: {node.runDetailsA?.validationPassed ? "Passed" : "Failed / None"}</div>
                                {node.runDetailsA?.error && <div style={{ color: "#EF4444" }}>Error: {node.runDetailsA.error}</div>}
                              </div>
                              <div style={{ background: "var(--bg-secondary, #F8FAFC)", padding: 8, borderRadius: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: 700 }}>Run B:</div>
                                <div>Status: {node.runDetailsB?.status || "Did not run"}</div>
                                <div>Duration: {formatDuration(node.runDetailsB?.durationMs)}</div>
                                <div>Validation: {node.runDetailsB?.validationPassed ? "Passed" : "Failed / None"}</div>
                                {node.runDetailsB?.error && <div style={{ color: "#EF4444" }}>Error: {node.runDetailsB.error}</div>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Edge Differences Section */}
          <div style={{ background: "var(--card-bg, #FFFFFF)", padding: 14, borderRadius: 8, border: "1px solid var(--border-color, #E2E8F0)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Layers size={14} /> Edge & Dependency Flow Changes ({diffResult.edgeDiffs.length})
            </h3>
            {diffResult.edgeDiffs.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
                No edge modifications between Target A and Target B.
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {diffResult.edgeDiffs.map((edge) => {
                  const isAdded = edge.status === "added";
                  const isRemoved = edge.status === "removed";
                  const isModified = edge.status === "modified";

                  return (
                    <div
                      key={edge.edgeId}
                      style={{
                        fontSize: 11,
                        padding: "4px 8px",
                        borderRadius: 4,
                        border: `1px solid ${
                          isAdded ? "#A7F3D0" : isRemoved ? "#FECACA" : isModified ? "#FDE68A" : "var(--border-color, #E2E8F0)"
                        }`,
                        background: isAdded ? "#ECFDF5" : isRemoved ? "#FEF2F2" : isModified ? "#FFFBEB" : "var(--bg-secondary, #F8FAFC)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {isAdded && <span style={{ color: "#10B981", fontWeight: 700 }}>+</span>}
                      {isRemoved && <span style={{ color: "#EF4444", fontWeight: 700 }}>-</span>}
                      {isModified && <span style={{ color: "#F59E0B", fontWeight: 700 }}>~</span>}
                      <span><code>{edge.source}</code> → <code>{edge.target}</code></span>
                      {edge.labelChange && (
                        <span style={{ color: "var(--text-secondary)" }}>
                          ({edge.labelChange.before || "none"} → {edge.labelChange.after || "none"})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
