import React, { useState } from "react";
import {
  Play,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  FileCode,
  Layers,
  X,
  ExternalLink,
  Ban,
  Check,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import type { ExecutionRecord, NodeExecution, ContextHandoffRecord } from "../../types";

interface ExecutionDrawerProps {
  execution: ExecutionRecord | null;
  onClose: () => void;
  onApprove: (nodeId?: string) => void;
  onReject: (nodeId?: string) => void;
  onCancel: () => void;
  onRecover?: () => void;
  onSelectNode?: (nodeId: string) => void;
}

type DrawerTab = "timeline" | "handoffs" | "artifacts" | "context";

export const ExecutionDrawer: React.FC<ExecutionDrawerProps> = ({
  execution,
  onClose,
  onApprove,
  onReject,
  onCancel,
  onRecover,
  onSelectNode,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>("timeline");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedHandoffId, setSelectedHandoffId] = useState<string | null>(null);

  if (!execution) return null;

  const isRunning = execution.status === "Running" || execution.status === "Validating";
  const isWaitingApproval = execution.status === "Waiting for Approval";
  const isDone = execution.status === "Succeeded" || execution.status === "Failed" || execution.status === "Cancelled";

  const selectedNodeExec = selectedNodeId
    ? execution.nodeExecutions.find((ne) => ne.nodeId === selectedNodeId)
    : null;

  const waitingNodeExec = isWaitingApproval
    ? execution.nodeExecutions.find(
        (ne) => ne.nodeId === execution.currentWaitingNodeId || ne.status === "Waiting for Approval"
      )
    : null;

  const handoffs = execution.handoffs || [];
  const selectedHandoff = selectedHandoffId
    ? handoffs.find((h) => h.id === selectedHandoffId)
    : handoffs[0] || null;

  return (
    <div className="execution-drawer" role="region" aria-label="Workflow Simulation Drawer">
      {/* Drawer Header */}
      <div className="execution-drawer-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              background:
                execution.status === "Succeeded"
                  ? "#ECFDF5"
                  : execution.status === "Failed"
                  ? "#FEF2F2"
                  : isWaitingApproval
                  ? "#FEF3C7"
                  : isRunning
                  ? "#EFF6FF"
                  : "#F1F5F9",
              color:
                execution.status === "Succeeded"
                  ? "#065F46"
                  : execution.status === "Failed"
                  ? "#991B1B"
                  : isWaitingApproval
                  ? "#92400E"
                  : isRunning
                  ? "#1E40AF"
                  : "#475569",
              border: `1px solid ${
                execution.status === "Succeeded"
                  ? "#A7F3D0"
                  : execution.status === "Failed"
                  ? "#FECACA"
                  : isWaitingApproval
                  ? "#FDE68A"
                  : isRunning
                  ? "#BFDBFE"
                  : "#CBD5E1"
              }`,
            }}
          >
            {execution.status === "Succeeded" && <CheckCircle2 size={13} />}
            {execution.status === "Failed" && <AlertCircle size={13} />}
            {isWaitingApproval && <AlertTriangle size={13} />}
            {isRunning && <Play size={13} />}
            <span>{execution.status}</span>
          </div>

          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
            Simulation Run: <code style={{ fontSize: 11 }}>{execution.id}</code>
          </span>

          <span
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 3,
              background: "#E2E8F0",
              color: "#334155",
              fontWeight: 600,
            }}
          >
            Deterministic Local Simulation
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(isRunning || isWaitingApproval) && (
            <button
              className="btn secondary"
              onClick={onCancel}
              style={{ fontSize: 11, padding: "3px 8px", color: "#B91C1C", display: "flex", alignItems: "center", gap: 4 }}
              title="Cancel simulation execution"
            >
              <Ban size={12} />
              Cancel Run
            </button>
          )}

          {onRecover && (execution.status === "Cancelled" || execution.status === "Running") && (
            <button
              className="btn secondary"
              onClick={onRecover}
              style={{ fontSize: 11, padding: "3px 8px", color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}
              title="Recover and resume interrupted simulation"
            >
              <RotateCcw size={12} />
              Recover Run
            </button>
          )}

          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            aria-label="Close execution drawer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Prominent Human Approval Banner if waiting */}
      {isWaitingApproval && (
        <div
          style={{
            margin: "10px 16px 0 16px",
            padding: "12px 14px",
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 6,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <AlertTriangle size={20} style={{ color: "#D97706", flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
                  Human Approval Gate: Simulation Paused
                </div>
                <div style={{ fontSize: 11, color: "#78350F", marginTop: 2 }}>
                  <strong>Awaiting:</strong> {waitingNodeExec?.whatIsBeingApproved || "Architecture & Plan Sign-off"}
                </div>
                <div style={{ fontSize: 11, color: "#92400E", marginTop: 1 }}>
                  <strong>Message:</strong> {waitingNodeExec?.approvalMessage || waitingNodeExec?.summary || "Approval requested before continuing execution."}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="btn primary"
                onClick={() => onApprove(waitingNodeExec?.nodeId)}
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  background: "#059669",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Check size={14} />
                Approve & Resume
              </button>
              <button
                className="btn secondary"
                onClick={() => onReject(waitingNodeExec?.nodeId)}
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  color: "#DC2626",
                  borderColor: "#FCA5A5",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <X size={14} />
                Reject
              </button>
              <button
                className="btn secondary"
                onClick={onCancel}
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  color: "#64748B",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Ban size={14} />
                Cancel
              </button>
            </div>
          </div>

          <div
            style={{
              fontSize: 10,
              padding: "4px 8px",
              background: "#FEF3C7",
              color: "#78350F",
              borderRadius: 4,
              borderLeft: "3px solid #D97706",
            }}
          >
            <strong>Simulation Notice:</strong> Approving this simulated node advances the local mock workflow only; it does NOT execute external production operations or invoke third-party cloud APIs.
          </div>
        </div>
      )}

      {/* Tabs Toolbar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          padding: "0 16px",
          gap: 16,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <button
          onClick={() => setActiveTab("timeline")}
          style={{
            padding: "8px 0",
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: activeTab === "timeline" ? "2px solid var(--accent)" : "2px solid transparent",
            color: activeTab === "timeline" ? "var(--accent)" : "var(--text-secondary)",
          }}
        >
          Stages & Timeline ({execution.nodeExecutions.length})
        </button>
        <button
          onClick={() => setActiveTab("handoffs")}
          style={{
            padding: "8px 0",
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: activeTab === "handoffs" ? "2px solid var(--accent)" : "2px solid transparent",
            color: activeTab === "handoffs" ? "var(--accent)" : "var(--text-secondary)",
          }}
        >
          Context Handoffs ({handoffs.length})
        </button>
        <button
          onClick={() => setActiveTab("artifacts")}
          style={{
            padding: "8px 0",
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: activeTab === "artifacts" ? "2px solid var(--accent)" : "2px solid transparent",
            color: activeTab === "artifacts" ? "var(--accent)" : "var(--text-secondary)",
          }}
        >
          Simulated Artifacts ({(execution.artifacts || []).length})
        </button>
        <button
          onClick={() => setActiveTab("context")}
          style={{
            padding: "8px 0",
            border: "none",
            background: "none",
            cursor: "pointer",
            borderBottom: activeTab === "context" ? "2px solid var(--accent)" : "2px solid transparent",
            color: activeTab === "context" ? "var(--accent)" : "var(--text-secondary)",
          }}
        >
          Shared Context Data
        </button>
      </div>

      {/* Drawer Body Content */}
      <div className="execution-drawer-body">
        {/* TIMELINE TAB */}
        {activeTab === "timeline" && (
          <div style={{ display: "grid", gridTemplateColumns: selectedNodeExec ? "1fr 1.2fr" : "1fr", gap: 14 }}>
            {/* Stage List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {execution.nodeExecutions.map((ne, i) => (
                <div
                  key={`ne-${ne.nodeId}-${i}`}
                  onClick={() => {
                    setSelectedNodeId(ne.nodeId);
                    onSelectNode?.(ne.nodeId);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 5,
                    border: `1px solid ${selectedNodeId === ne.nodeId ? "var(--accent)" : "var(--border)"}`,
                    background: selectedNodeId === ne.nodeId ? "var(--surface-alt)" : "var(--surface)",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 18, textAlign: "center", color: "var(--text-secondary)", fontSize: 10 }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {ne.nodeName || ne.nodeId}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                        {ne.summary || `Type: ${ne.nodeType}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {(ne.retryCount || 0) > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: "#FEF3C7",
                          color: "#92400E",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                        title={`${ne.retryCount} retries logged`}
                      >
                        <RotateCcw size={10} />
                        {ne.retryCount} retry
                      </span>
                    )}

                    {ne.durationMs !== undefined && (
                      <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                        {ne.durationMs}ms
                      </span>
                    )}
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: 10,
                        fontWeight: 600,
                        background:
                          ne.status === "Succeeded"
                            ? "#ECFDF5"
                            : ne.status === "Failed"
                            ? "#FEF2F2"
                            : ne.status === "Waiting for Approval"
                            ? "#FEF3C7"
                            : ne.status === "Running"
                            ? "#EFF6FF"
                            : "#F1F5F9",
                        color:
                          ne.status === "Succeeded"
                            ? "#047857"
                            : ne.status === "Failed"
                            ? "#B91C1C"
                            : ne.status === "Waiting for Approval"
                            ? "#B45309"
                            : ne.status === "Running"
                            ? "#1D4ED8"
                            : "#64748B",
                      }}
                    >
                      {ne.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Node Inspector (Requirement 11) */}
            {selectedNodeExec && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: 12,
                  background: "var(--surface-alt)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  overflowY: "auto",
                  maxHeight: 460,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                      {selectedNodeExec.nodeName}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                      Type: <code>{selectedNodeExec.nodeType}</code> | ID: <code>{selectedNodeExec.nodeId}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Status, Duration & Validation Banner */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: 3,
                      fontWeight: 600,
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
                    Status: {selectedNodeExec.status}
                  </span>

                  {selectedNodeExec.durationMs !== undefined && (
                    <span style={{ color: "var(--text-secondary)" }}>
                      Duration: <strong>{selectedNodeExec.durationMs}ms</strong>
                    </span>
                  )}

                  {selectedNodeExec.validation && (
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontSize: 10,
                        fontWeight: 600,
                        background: selectedNodeExec.validation.passed ? "#ECFDF5" : "#FEF2F2",
                        color: selectedNodeExec.validation.passed ? "#065F46" : "#991B1B",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      {selectedNodeExec.validation.passed ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
                      {selectedNodeExec.validation.passed ? "Contract Valid" : "Validation Failed"}
                    </span>
                  )}
                </div>

                {selectedNodeExec.validation?.message && (
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", fontStyle: "italic" }}>
                    Validation Note: {selectedNodeExec.validation.message}
                  </div>
                )}

                {selectedNodeExec.error && (
                  <div style={{ padding: "6px 8px", background: "#FEF2F2", color: "#991B1B", borderRadius: 4, fontSize: 11 }}>
                    <strong>Error:</strong> {selectedNodeExec.error}
                  </div>
                )}

                {/* Retries Log (Requirement 9 & 10) */}
                {selectedNodeExec.retries && selectedNodeExec.retries.length > 0 && (
                  <div style={{ border: "1px solid var(--border)", borderRadius: 4, padding: 8, background: "var(--surface)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                      <RotateCcw size={12} />
                      Retry Attempts ({selectedNodeExec.retries.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {selectedNodeExec.retries.map((r) => (
                        <div
                          key={`retry-${r.attemptNumber}`}
                          style={{
                            fontSize: 10,
                            padding: "4px 6px",
                            borderRadius: 3,
                            background: r.succeeded ? "#ECFDF5" : "#FEF2F2",
                            border: `1px solid ${r.succeeded ? "#A7F3D0" : "#FECACA"}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <strong>Attempt #{r.attemptNumber}</strong> ({r.backoffSeconds}s backoff)
                            <div style={{ color: r.succeeded ? "#065F46" : "#991B1B" }}>
                              {r.succeeded ? "Recovered successfully" : r.error}
                            </div>
                          </div>
                          <span style={{ fontWeight: 700, color: r.succeeded ? "#047857" : "#B91C1C" }}>
                            {r.succeeded ? "SUCCESS" : "FAILED"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Context Handoffs for this node (Requirement 11) */}
                {((selectedNodeExec.handoffsIn && selectedNodeExec.handoffsIn.length > 0) ||
                  (selectedNodeExec.handoffsOut && selectedNodeExec.handoffsOut.length > 0)) && (
                  <div style={{ border: "1px solid var(--border)", borderRadius: 4, padding: 8, background: "var(--surface)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      Context Handoffs:
                    </div>
                    {selectedNodeExec.handoffsIn && selectedNodeExec.handoffsIn.length > 0 && (
                      <div style={{ fontSize: 10, marginBottom: 4 }}>
                        <span style={{ color: "var(--text-secondary)" }}>Incoming from: </span>
                        {selectedNodeExec.handoffsIn.map((h) => (
                          <span
                            key={h.id}
                            style={{
                              display: "inline-block",
                              padding: "1px 5px",
                              borderRadius: 3,
                              background: "var(--surface-alt)",
                              border: "1px solid var(--border)",
                              marginRight: 4,
                            }}
                          >
                            {h.sourceNodeName}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedNodeExec.handoffsOut && selectedNodeExec.handoffsOut.length > 0 && (
                      <div style={{ fontSize: 10 }}>
                        <span style={{ color: "var(--text-secondary)" }}>Outgoing to: </span>
                        {selectedNodeExec.handoffsOut.map((h) => (
                          <span
                            key={h.id}
                            style={{
                              display: "inline-block",
                              padding: "1px 5px",
                              borderRadius: 3,
                              background: "var(--surface-alt)",
                              border: "1px solid var(--border)",
                              marginRight: 4,
                            }}
                          >
                            {h.destinationNodeName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Node Inputs */}
                <div style={{ fontSize: 11 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Inputs:</div>
                  <pre
                    style={{
                      margin: 0,
                      padding: 8,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      fontSize: 10,
                      maxHeight: 100,
                      overflowY: "auto",
                    }}
                  >
                    {JSON.stringify(selectedNodeExec.inputs || {}, null, 2)}
                  </pre>
                </div>

                {/* Node Outputs */}
                <div style={{ fontSize: 11 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Outputs:</div>
                  <pre
                    style={{
                      margin: 0,
                      padding: 8,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      fontSize: 10,
                      maxHeight: 120,
                      overflowY: "auto",
                    }}
                  >
                    {JSON.stringify(selectedNodeExec.outputs || {}, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTEXT HANDOFFS TAB (Requirement 1, 2, 3, 4) */}
        {activeTab === "handoffs" && (
          <div style={{ display: "grid", gridTemplateColumns: selectedHandoff ? "1fr 1.4fr" : "1fr", gap: 14 }}>
            {/* List of Handoff Records */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {handoffs.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", padding: 20 }}>
                  No context handoffs recorded for this run.
                </div>
              ) : (
                handoffs.map((h, i) => (
                  <div
                    key={h.id}
                    onClick={() => setSelectedHandoffId(h.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 5,
                      border: `1px solid ${selectedHandoff?.id === h.id ? "var(--accent)" : "var(--border)"}`,
                      background: selectedHandoff?.id === h.id ? "var(--surface-alt)" : "var(--surface)",
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: "var(--text-primary)" }}>
                        <span>{h.sourceNodeName}</span>
                        <ArrowRight size={12} style={{ color: "var(--accent)" }} />
                        <span>{h.destinationNodeName}</span>
                      </div>
                      <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>
                        #{i + 1}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {h.taskSummary}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Handoff Details Inspector */}
            {selectedHandoff && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: 12,
                  background: "var(--surface-alt)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  overflowY: "auto",
                  maxHeight: 460,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{selectedHandoff.sourceNodeName}</span>
                    <ArrowRight size={14} style={{ color: "var(--accent)" }} />
                    <span>{selectedHandoff.destinationNodeName}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
                    Source ID: <code>{selectedHandoff.sourceNodeId}</code> ➔ Destination ID: <code>{selectedHandoff.destinationNodeId}</code>
                  </div>
                </div>

                <div style={{ fontSize: 11 }}>
                  <strong>Task Summary:</strong>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    {selectedHandoff.taskSummary}
                  </div>
                </div>

                {/* Relevant Prior Findings */}
                <div style={{ fontSize: 11 }}>
                  <strong>Relevant Prior Findings (Forwarded Context):</strong>
                  <pre
                    style={{
                      margin: "4px 0 0 0",
                      padding: 8,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      fontSize: 10,
                      maxHeight: 110,
                      overflowY: "auto",
                    }}
                  >
                    {JSON.stringify(selectedHandoff.priorFindings || {}, null, 2)}
                  </pre>
                </div>

                {/* Selected Artifacts / References */}
                <div style={{ fontSize: 11 }}>
                  <strong>Selected Artifacts or References:</strong>
                  {selectedHandoff.selectedArtifacts && selectedHandoff.selectedArtifacts.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                      {selectedHandoff.selectedArtifacts.map((art) => (
                        <div
                          key={art.id}
                          style={{
                            padding: "4px 8px",
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: 4,
                            fontSize: 10,
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>{art.name} ({art.type})</span>
                          <span style={{ color: "var(--text-secondary)" }}>{art.id}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
                      No artifacts attached to this handoff.
                    </div>
                  )}
                </div>

                {/* Constraints */}
                <div style={{ fontSize: 11 }}>
                  <strong>Constraints:</strong>
                  <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: 10, color: "var(--text-secondary)" }}>
                    {(selectedHandoff.constraints || []).map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Expected Output Schema */}
                <div style={{ fontSize: 11 }}>
                  <strong>Expected Output Schema:</strong>
                  <pre
                    style={{
                      margin: "4px 0 0 0",
                      padding: 8,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      fontSize: 10,
                      maxHeight: 80,
                      overflowY: "auto",
                    }}
                  >
                    {JSON.stringify(selectedHandoff.expectedOutputSchema || {}, null, 2)}
                  </pre>
                </div>

                {/* Completion Criteria */}
                <div style={{ fontSize: 11 }}>
                  <strong>Completion Criteria:</strong>
                  <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: 10, color: "var(--text-secondary)" }}>
                    {(selectedHandoff.completionCriteria || []).map((crit, i) => (
                      <li key={i}>{crit}</li>
                    ))}
                  </ul>
                </div>

                {/* Failure Details */}
                {selectedHandoff.failureDetails && (
                  <div style={{ fontSize: 11, borderTop: "1px solid var(--border)", paddingTop: 6 }}>
                    <strong>Failure Details:</strong>
                    <div style={{ fontSize: 10, color: selectedHandoff.failureDetails.hasFailed ? "#B91C1C" : "var(--text-secondary)", marginTop: 2 }}>
                      {selectedHandoff.failureDetails.hasFailed
                        ? `Failure: ${selectedHandoff.failureDetails.error || "Execution Error"} (Retries: ${selectedHandoff.failureDetails.retryCount || 0})`
                        : "Clean handoff without predecessor failures."}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ARTIFACTS TAB */}
        {activeTab === "artifacts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(execution.artifacts || []).length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", padding: 16 }}>
                No artifacts generated yet.
              </div>
            ) : (
              (execution.artifacts || []).map((art) => (
                <div
                  key={art.id}
                  style={{
                    padding: "10px 12px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <FileCode size={16} style={{ color: "var(--accent)" }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)" }}>
                        {art.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        {art.summary}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: "#ECFDF5",
                      color: "#065F46",
                      fontWeight: 600,
                    }}
                  >
                    Simulated Artifact
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* SHARED CONTEXT DATA TAB */}
        {activeTab === "context" && (
          <pre
            style={{
              margin: 0,
              padding: 10,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 11,
              lineHeight: 1.4,
              overflowY: "auto",
              maxHeight: 280,
            }}
          >
            {JSON.stringify(execution.contextData || {}, null, 2)}
          </pre>
        )}

        {/* Final Summary Banner */}
        {execution.finalSummary && (
          <div
            style={{
              padding: "8px 12px",
              background: execution.status === "Succeeded" ? "#ECFDF5" : "#F8FAFC",
              border: `1px solid ${execution.status === "Succeeded" ? "#A7F3D0" : "#E2E8F0"}`,
              borderRadius: 4,
              fontSize: 11,
              color: execution.status === "Succeeded" ? "#065F46" : "var(--text-secondary)",
            }}
          >
            <strong>Summary:</strong> {execution.finalSummary}
          </div>
        )}
      </div>
    </div>
  );
};
