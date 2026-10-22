import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  FileText,
  Play,
  Upload,
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Bot,
  Sparkles,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { parsePipelineMarkdown, ParsedPipelineMarkdown } from "../../services/pipelineMarkdownService";
import type { Workflow, WorkflowNode } from "../../types";

export interface RunPipelineMarkdownModalProps {
  isOpen: boolean;
  activeWorkflow: Workflow | null;
  savedWorkflows: Workflow[];
  onRunParsedWorkflow: (workflow: Workflow) => void;
  onClose: () => void;
}

export const RunPipelineMarkdownModal: React.FC<RunPipelineMarkdownModalProps> = ({
  isOpen,
  activeWorkflow,
  savedWorkflows,
  onRunParsedWorkflow,
  onClose,
}) => {
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<"installed" | "upload" | "custom">("installed");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (activeWorkflow) {
        setSelectedWorkflowId(activeWorkflow.id);
      } else if (savedWorkflows.length > 0) {
        setSelectedWorkflowId(savedWorkflows[0].id);
      }
    }
  }, [isOpen, activeWorkflow, savedWorkflows]);

  // Load installed markdown from local storage or matching saved workflow
  useEffect(() => {
    if (selectedSource === "installed" && selectedWorkflowId) {
      const match = savedWorkflows.find((w) => w.id === selectedWorkflowId);
      if (match) {
        try {
          const storedMd = localStorage.getItem(`agentforge.installed_pipeline_md_${match.id}`);
          if (storedMd) {
            setMarkdownContent(storedMd);
            return;
          }
        } catch {
          // ignore
        }
        // Fallback to generating or simple template if not yet installed
        setMarkdownContent(`---
pipeline_id: "${match.id}"
name: "${match.name}"
version: "${match.version || "1.0.0"}"
status: "${match.status || "Active"}"
total_steps: ${match.nodes?.length || 0}
execution_order:
${(match.nodes || []).map((n) => `  - "${n.id}"`).join("\n")}
---

# Pipeline: ${match.name}

> ${match.description || "Pipeline loaded from saved repository record."}

## 2. Execution Order (Topological Sequence)

| Step | Node Name | Type | Assigned Worker | Role / Purpose | Approval Gate |
|---|---|---|---|---|---|
${(match.nodes || []).map((n, i) => `| **${i + 1}** | ${n.name || n.id} | \`${n.type}\` | ${n.configuration?.role || n.type} | ${n.description || "-"} | ${n.type === "human_approval" ? "Yes" : "No"} |`).join("\n")}
`);
      }
    }
  }, [selectedSource, selectedWorkflowId, savedWorkflows]);

  const parsed = useMemo<ParsedPipelineMarkdown>(() => {
    if (!markdownContent.trim()) {
      return { ok: false, error: "No markdown specification provided." };
    }
    return parsePipelineMarkdown(markdownContent);
  }, [markdownContent]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setMarkdownContent(text);
        setSelectedSource("upload");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExecute = () => {
    if (!parsed.ok) return;

    // Find if a matching full workflow exists in savedWorkflows
    let targetWorkflow = savedWorkflows.find(
      (w) => w.id === parsed.pipelineId || w.name.toLowerCase() === parsed.name?.toLowerCase()
    );

    if (targetWorkflow) {
      // Re-order nodes according to parsed execution order
      if (parsed.executionOrder && parsed.executionOrder.length > 0) {
        const orderMap = new Map<string, number>();
        parsed.executionOrder.forEach((id, idx) => orderMap.set(id, idx));

        const orderedNodes = [...targetWorkflow.nodes].sort((a, b) => {
          const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999;
          const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999;
          return idxA - idxB;
        });

        targetWorkflow = {
          ...targetWorkflow,
          nodes: orderedNodes,
        };
      }
    } else {
      // Synthesize a workflow from the parsed steps
      const nodes: WorkflowNode[] = (parsed.steps || []).map((st, i) => ({
        id: st.nodeId || `node-step-${i + 1}`,
        type: (st.type as any) || "agent_execution",
        name: st.name || `Step ${i + 1}`,
        description: st.role,
        configuration: {
          role: st.role,
          approverRole: st.isApproval ? st.role || "Tech Lead" : undefined,
        },
        position: { x: 100 + i * 180, y: 180 },
      }));

      const edges = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
          id: `e-${nodes[i].id}-${nodes[i + 1].id}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
        });
      }

      targetWorkflow = {
        id: parsed.pipelineId || `wf-md-${Date.now().toString(36)}`,
        name: parsed.name || "Executed Pipeline from Markdown",
        description: `Executed from markdown specification (${nodes.length} steps).`,
        version: parsed.version || "1.0.0",
        status: "Active",
        nodes,
        edges,
        executionSettings: {
          maxParallelNodes: 2,
          retryPolicy: { maxRetries: 2, backoffSeconds: 5 },
          requireApprovalFor: nodes.filter((n) => n.type === "human_approval" || n.type === "approval").map((n) => n.id),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    onRunParsedWorkflow(targetWorkflow);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="modal-container"
        style={{
          width: "90vw",
          maxWidth: 940,
          height: "82vh",
          maxHeight: 740,
          backgroundColor: "var(--surface, #FFFFFF)",
          border: "1px solid var(--border, #E2E8F0)",
          borderRadius: "var(--radius-lg, 12px)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border, #E2E8F0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface-alt, #F8FAFC)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "#ECFDF5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text-primary, #0F172A)" }}>
                Run Pipeline from Markdown (pipeline.md)
              </h2>
              <p style={{ fontSize: 12, margin: "2px 0 0", color: "var(--text-secondary, #64748B)" }}>
                Select an installed pipeline.md or upload an MD file to execute steps in strict ordered sequence.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 6,
              color: "var(--text-secondary, #64748B)",
              borderRadius: 6,
            }}
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Source Selector Bar */}
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid var(--border, #E2E8F0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface, #FFFFFF)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`btn ${selectedSource === "installed" ? "primary" : "secondary"}`}
              style={{ fontSize: 11, padding: "4px 10px" }}
              onClick={() => setSelectedSource("installed")}
            >
              Installed Pipelines
            </button>
            <button
              className={`btn ${selectedSource === "upload" ? "primary" : "secondary"}`}
              style={{ fontSize: 11, padding: "4px 10px" }}
              onClick={() => {
                setSelectedSource("upload");
                fileInputRef.current?.click();
              }}
            >
              <Upload size={12} style={{ marginRight: 4 }} /> Upload pipeline.md
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </div>

          {selectedSource === "installed" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary, #64748B)" }}>Pipeline:</span>
              <select
                className="prop-select"
                style={{ fontSize: 12, padding: "3px 8px", width: "auto", minWidth: 220 }}
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
              >
                {savedWorkflows.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.nodes?.length || 0} steps)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 2-Panel View: Left Preview & Steps, Right Raw Markdown Editor */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Left Panel: Parsed Steps & Execution Plan */}
          <div
            style={{
              flex: 1,
              borderRight: "1px solid var(--border, #E2E8F0)",
              display: "flex",
              flexDirection: "column",
              padding: "16px 20px",
              overflowY: "auto",
              background: "var(--surface-alt, #F8FAFC)",
              gap: 14,
            }}
          >
            {parsed.ok ? (
              <>
                {/* Header overview */}
                <div
                  style={{
                    background: "var(--surface, #FFFFFF)",
                    border: "1px solid var(--border, #E2E8F0)",
                    borderRadius: 8,
                    padding: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text-primary, #0F172A)" }}>
                      {parsed.name}
                    </h3>
                    <div style={{ fontSize: 11, color: "var(--text-secondary, #64748B)", marginTop: 2 }}>
                      Version: {parsed.version} • Status: {parsed.status} • Total Steps:{" "}
                      <strong>{parsed.totalSteps || parsed.steps?.length || 0}</strong>
                    </div>
                  </div>
                  <span className="badge-status ready" style={{ fontSize: 10 }}>
                    Parsed Cleanly
                  </span>
                </div>

                {/* Ordered Execution Sequence */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-secondary, #64748B)",
                      textTransform: "uppercase",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Clock size={13} style={{ color: "var(--accent)" }} /> Execution Order
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(parsed.steps && parsed.steps.length > 0 ? parsed.steps : (parsed.executionOrder || []).map((id, i) => ({
                      stepNumber: i + 1,
                      name: id,
                      nodeId: id,
                      type: "step",
                      worker: "Worker",
                      role: "Execution Step",
                      isApproval: false,
                    }))).map((st) => (
                      <div
                        key={st.stepNumber}
                        style={{
                          background: "var(--surface, #FFFFFF)",
                          border: "1px solid var(--border, #E2E8F0)",
                          borderRadius: 8,
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: "#EFF6FF",
                              color: "var(--accent, #3B82F6)",
                              fontSize: 11,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {st.stepNumber}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary, #0F172A)" }}>
                              {st.name}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-secondary, #64748B)" }}>
                              {st.role} • <span style={{ fontFamily: "monospace" }}>{st.type}</span>
                            </div>
                          </div>
                        </div>

                        {st.isApproval ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 8px",
                              background: "#FEF3C7",
                              color: "#D97706",
                              border: "1px solid #FDE68A",
                              borderRadius: 4,
                            }}
                          >
                            Human Approval Gate
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              background: "#F1F5F9",
                              color: "#475569",
                              borderRadius: 4,
                            }}
                          >
                            Automated
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: "40px 16px",
                  textAlign: "center",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 8,
                  color: "#991B1B",
                }}
              >
                <AlertTriangle size={24} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>Markdown Parse Error</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{parsed.error}</div>
              </div>
            )}
          </div>

          {/* Right Panel: Raw Markdown View / Edit */}
          <div
            style={{
              width: 380,
              display: "flex",
              flexDirection: "column",
              background: "var(--surface, #FFFFFF)",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid var(--border, #E2E8F0)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary, #64748B)",
                textTransform: "uppercase",
              }}
            >
              Markdown Content
            </div>
            <textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                padding: 12,
                fontSize: 11,
                fontFamily: "monospace",
                lineHeight: 1.45,
                resize: "none",
                color: "var(--text-primary, #0F172A)",
                background: "transparent",
              }}
              placeholder="Paste or edit pipeline.md here..."
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border, #E2E8F0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface, #FFFFFF)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-secondary, #64748B)" }}>
            {parsed.ok ? (
              <span>
                Ready to execute <strong>{parsed.name}</strong> ({parsed.steps?.length || parsed.totalSteps || 0} steps in order)
              </span>
            ) : (
              <span>Correct markdown to run pipeline.</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn secondary" onClick={onClose} style={{ fontSize: 12, padding: "6px 14px" }}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={!parsed.ok}
              onClick={handleExecute}
              style={{
                fontSize: 12,
                padding: "6px 18px",
                background: "#059669",
                borderColor: "#047857",
              }}
            >
              <Play size={13} style={{ marginRight: 6, fill: "#FFFFFF" }} /> Run Pipeline in Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
