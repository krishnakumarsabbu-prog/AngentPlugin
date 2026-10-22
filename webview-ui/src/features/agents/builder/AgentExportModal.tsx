import React, { useState } from "react";
import { Download, Copy, Check, X, FileText, CheckCircle2 } from "lucide-react";
import type { AgentExportFormat, AgentExportResult } from "../../../types";
import type { AgentBuilderFormState } from "./types";
import { builderStateToAgent } from "./types";
import { getAgentsStore } from "../../../services/agentsService";

interface AgentExportModalProps {
  state: AgentBuilderFormState;
  agentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

export const AgentExportModal: React.FC<AgentExportModalProps> = ({
  state,
  agentId,
  isOpen,
  onClose,
  onToast,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<AgentExportFormat>(state.exportFormat || "agent-spec");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<AgentExportResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerateExport = async (format: AgentExportFormat) => {
    setSelectedFormat(format);
    setExporting(true);
    try {
      const store = getAgentsStore();
      const agent = builderStateToAgent(state);
      const res = await store.exportAgent(format, agent, agentId || undefined);
      setExportResult(res);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to generate export", "error");
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (!exportResult) return;
    const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast(`Downloaded ${exportResult.fileName}`, "success");
  };

  const handleCopy = () => {
    if (!exportResult) return;
    navigator.clipboard.writeText(exportResult.content).then(() => {
      setCopied(true);
      onToast("Export content copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface-alt)",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
              Export Agent Configuration
            </h3>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              Export this agent for downstream platforms, repositories, or external runner environments.
            </span>
          </div>

          <button
            type="button"
            className="btn btn-icon btn-ghost"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label className="form-label" style={{ fontSize: "12px", marginBottom: "8px", display: "block" }}>
              Select Export Format
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { id: "agent-spec", label: "Canonical Agent Spec", ext: ".json", desc: "Complete AgentForge specification with full metadata" },
                { id: "copilot-instructions", label: "GitHub Copilot", ext: ".md", desc: "Workspace instructions for .github/copilot-instructions.md" },
                { id: "claude-subagent", label: "Claude Subagent", ext: ".md", desc: "Structured XML prompt format for Claude Projects" },
                { id: "openai-assistant", label: "OpenAI Assistant", ext: ".json", desc: "Function tools payload for OpenAI Assistants API" },
              ].map((f) => {
                const isSelected = selectedFormat === f.id;
                return (
                  <div
                    key={f.id}
                    style={{
                      border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: isSelected ? "rgba(52, 72, 197, 0.05)" : "var(--surface)",
                      borderRadius: "var(--radius)",
                      padding: "10px 12px",
                      cursor: "pointer",
                    }}
                    onClick={() => handleGenerateExport(f.id as AgentExportFormat)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "12px", color: isSelected ? "var(--accent)" : "inherit" }}>
                        {f.label}
                      </strong>
                      <code>{f.ext}</code>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--text-secondary)" }}>
                      {f.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {exportResult && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600 }}>
                  File: <code>{exportResult.fileName}</code>
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopy}
                  >
                    {copied ? <Check size={12} style={{ color: "var(--success)" }} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleDownload}
                  >
                    <Download size={12} /> Download
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: "240px", overflowY: "auto", background: "#0F172A", padding: "12px", borderRadius: "var(--radius)" }}>
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "#E2E8F0",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {exportResult.content}
                </pre>
              </div>
            </div>
          )}

          {!exportResult && !exporting && (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleGenerateExport(selectedFormat)}
              >
                Generate Export
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
