import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, Loader2, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { getNodeDefinition } from "./nodeDefinitions";
import type { WorkflowNodeType, NodeExecutionStatus, ExecutionStatus } from "../../types";

export interface PipelineNodeData {
  label: string;
  type: WorkflowNodeType;
  description?: string;
  configuration?: Record<string, unknown>;
  executionState?: {
    status: NodeExecutionStatus | ExecutionStatus;
    summary?: string;
    durationMs?: number;
    error?: string;
    approvalStatus?: "pending" | "approved" | "rejected";
  };
  onApproveNode?: (nodeId: string) => void;
  onRejectNode?: (nodeId: string) => void;
  onDeleteNode?: (id: string) => void;
}

export const PipelineNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as PipelineNodeData;
  const def = getNodeDefinition(nodeData.type || "agent_execution");
  const Icon = def.icon;
  const exec = nodeData.executionState;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.onDeleteNode) {
      nodeData.onDeleteNode(id);
    }
  };

  const getSubDetail = () => {
    const cfg = nodeData.configuration || {};
    if (nodeData.type === "agent_execution" || nodeData.type === "agent") {
      return (cfg.role as string) || (cfg.agentId as string) || "Unassigned Agent";
    }
    if (nodeData.type === "human_approval" || nodeData.type === "approval") {
      return (cfg.approverRole as string) || "Requires sign-off";
    }
    if (nodeData.type === "skill_invocation" || nodeData.type === "skill") {
      return (cfg.skillId as string) || "Configured Skill";
    }
    if (nodeData.type === "condition_branch" || nodeData.type === "decision") {
      return (cfg.conditionExpression as string) || (cfg.conditionValue as string) || "Branch condition";
    }
    if (nodeData.type === "validation") {
      return (cfg.assertion as string) || "Quality assertion gate";
    }
    if (nodeData.type === "artifact_output" || nodeData.type === "output") {
      return (cfg.artifactName as string) || (cfg.artifactPath as string) || "Artifact bundle";
    }
    if (nodeData.type === "retry") {
      return `${cfg.maxRetries ?? 3} retries (${cfg.backoffSeconds ?? 5}s backoff)`;
    }
    if (nodeData.type === "planning") {
      return `${(cfg.role as string) || (cfg.agentId as string) || "Planning Specialist"} • ${cfg.strategy || "milestones"}`;
    }
    if (nodeData.type === "parallel_execution") {
      return `Concurrency: ${cfg.maxConcurrency ?? 3} paths`;
    }
    if (nodeData.type === "merge_results") {
      return `Strategy: ${cfg.strategy || "combine_all"}`;
    }
    if (nodeData.type === "context_handoff" || nodeData.type === "handoff") {
      const fCount = Array.isArray(cfg.forwardFields) ? cfg.forwardFields.length : 0;
      return `${fCount} field(s) forwarded`;
    }
    if (nodeData.type === "requirement_input" || nodeData.type === "input") {
      return `${cfg.source || "User Story"} (${cfg.intakeFormat || "markdown"})`;
    }
    if (nodeData.type === "start") {
      return `Trigger: ${cfg.trigger || "manual"}`;
    }
    if (nodeData.type === "end") {
      return (cfg.terminalStatus as string) || "Terminal exit point";
    }
    return def.description;
  };

  // Execution status class
  const statusClass = exec?.status
    ? exec.status === "Running"
      ? "node-running"
      : exec.status === "Succeeded"
      ? "node-succeeded"
      : exec.status === "Failed"
      ? "node-failed"
      : exec.status === "Waiting for Approval"
      ? "node-waiting"
      : exec.status === "Skipped"
      ? "node-skipped"
      : ""
    : "";

  return (
    <div className={`pipeline-node ${selected ? "selected" : ""} ${statusClass}`}>
      {/* Target Handle (Left) */}
      {def.hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          id="target"
          className="pipeline-handle"
          style={{ left: -5 }}
        />
      )}

      {/* Header with category color */}
      <div
        className="pipeline-node-header"
        style={{
          background: def.bgLight,
          color: def.color,
          borderBottomColor: def.borderLight,
        }}
      >
        <div className="pipeline-node-type">
          <Icon size={13} style={{ strokeWidth: 2.5 }} />
          <span>{def.label}</span>
        </div>
        <button
          className="btn-icon"
          title="Delete node"
          onClick={handleDelete}
          style={{
            padding: 2,
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Body */}
      <div className="pipeline-node-body">
        <div className="pipeline-node-title">{nodeData.label || def.defaultName}</div>
        <div className="pipeline-node-desc" title={getSubDetail()}>
          {getSubDetail()}
        </div>

        {/* Live Execution Status Indicator */}
        {exec && (
          <div
            style={{
              marginTop: 6,
              padding: "4px 6px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              background:
                exec.status === "Running"
                  ? "#EFF6FF"
                  : exec.status === "Succeeded"
                  ? "#ECFDF5"
                  : exec.status === "Failed"
                  ? "#FEF2F2"
                  : exec.status === "Waiting for Approval"
                  ? "#FEF3C7"
                  : "#F1F5F9",
              color:
                exec.status === "Running"
                  ? "#1D4ED8"
                  : exec.status === "Succeeded"
                  ? "#047857"
                  : exec.status === "Failed"
                  ? "#B91C1C"
                  : exec.status === "Waiting for Approval"
                  ? "#B45309"
                  : "#64748B",
              border: `1px solid ${
                exec.status === "Running"
                  ? "#BFDBFE"
                  : exec.status === "Succeeded"
                  ? "#A7F3D0"
                  : exec.status === "Failed"
                  ? "#FECACA"
                  : exec.status === "Waiting for Approval"
                  ? "#FDE68A"
                  : "#E2E8F0"
              }`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {exec.status === "Running" && <Loader2 size={11} className="spin" />}
              {exec.status === "Succeeded" && <CheckCircle2 size={11} />}
              {exec.status === "Failed" && <XCircle size={11} />}
              {exec.status === "Waiting for Approval" && <AlertTriangle size={11} />}
              <span>{exec.status}</span>
            </div>

            {/* Quick inline Approve / Reject action on canvas node */}
            {exec.status === "Waiting for Approval" && nodeData.onApproveNode && (
              <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn"
                  onClick={() => nodeData.onApproveNode!(id)}
                  style={{
                    padding: "2px 6px",
                    fontSize: 9,
                    background: "#10B981",
                    color: "#FFF",
                    borderRadius: 3,
                    border: "none",
                    cursor: "pointer",
                  }}
                  title="Approve this gate"
                >
                  Approve
                </button>
                <button
                  className="btn"
                  onClick={() => nodeData.onRejectNode?.(id)}
                  style={{
                    padding: "2px 6px",
                    fontSize: 9,
                    background: "#EF4444",
                    color: "#FFF",
                    borderRadius: 3,
                    border: "none",
                    cursor: "pointer",
                  }}
                  title="Reject this gate"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Typed Source Handles (Right) */}
      {def.hasOutput && (
        <>
          {(nodeData.type === "condition_branch" || nodeData.type === "decision") ? (
            <>
              <div className="pipeline-handle-group" style={{ position: "absolute", right: 0, top: "35%", transform: "translateY(-50%)" }}>
                <span className="pipeline-handle-label branch-true">True</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="true"
                  className="pipeline-handle handle-true"
                  style={{ top: "35%", right: -5 }}
                />
              </div>
              <div className="pipeline-handle-group" style={{ position: "absolute", right: 0, top: "70%", transform: "translateY(-50%)" }}>
                <span className="pipeline-handle-label branch-false">False</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="false"
                  className="pipeline-handle handle-false"
                  style={{ top: "70%", right: -5 }}
                />
              </div>
            </>
          ) : (nodeData.type === "human_approval" || nodeData.type === "approval") ? (
            <>
              <div className="pipeline-handle-group" style={{ position: "absolute", right: 0, top: "35%", transform: "translateY(-50%)" }}>
                <span className="pipeline-handle-label approval-approved">Approved</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="approved"
                  className="pipeline-handle handle-approved"
                  style={{ top: "35%", right: -5 }}
                />
              </div>
              <div className="pipeline-handle-group" style={{ position: "absolute", right: 0, top: "70%", transform: "translateY(-50%)" }}>
                <span className="pipeline-handle-label approval-rejected">Rejected</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id="rejected"
                  className="pipeline-handle handle-rejected"
                  style={{ top: "70%", right: -5 }}
                />
              </div>
            </>
          ) : (
            <Handle
              type="source"
              position={Position.Right}
              id="source"
              className="pipeline-handle"
              style={{ right: -5 }}
            />
          )}
        </>
      )}
    </div>
  );
});

PipelineNode.displayName = "PipelineNode";
