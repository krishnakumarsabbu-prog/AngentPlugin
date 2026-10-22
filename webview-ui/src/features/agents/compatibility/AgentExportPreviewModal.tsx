import React, { useState, useEffect } from "react";
import {
  Download,
  Copy,
  Check,
  X,
  FileText,
  AlertTriangle,
  HelpCircle,
  Folder,
  Layers,
  Code,
} from "lucide-react";
import type {
  Agent,
  AgentPlatformId,
  PlatformExportResult,
} from "../../../types";
import { getAgentsStore } from "../../../services/agentsService";

interface AgentExportPreviewModalProps {
  agent: Partial<Agent>;
  initialPlatform?: AgentPlatformId;
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

export const AgentExportPreviewModal: React.FC<AgentExportPreviewModalProps> = ({
  agent,
  initialPlatform = "copilot",
  isOpen,
  onClose,
  onToast,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<AgentPlatformId>(initialPlatform);
  const [loading, setLoading] = useState(false);
  const [exportResult, setExportResult] = useState<PlatformExportResult | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPlatform(initialPlatform);
  }, [isOpen, initialPlatform]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);

    const store = getAgentsStore();
    store
      .exportPlatform(selectedPlatform, agent, agent.id)
      .then((res) => {
        if (!active) return;
        setExportResult(res);
        setSelectedFileIndex(0);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        onToast(e instanceof Error ? e.message : "Failed to generate platform export", "error");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedPlatform, agent, isOpen]);

  if (!isOpen) return null;

  const currentFile = exportResult?.files[selectedFileIndex];

  const handleCopy = () => {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.content).then(() => {
      setCopied(true);
      onToast(`Copied ${currentFile.fileName} to clipboard`, "success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadCurrent = () => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.content], { type: currentFile.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFile.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToast(`Downloaded ${currentFile.fileName}`, "success");
  };

  const handleDownloadAll = () => {
    if (!exportResult) return;
    exportResult.files.forEach((file) => {
      const blob = new Blob([file.content], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    onToast(`Downloaded all ${exportResult.files.length} artifact file(s)`, "success");
  };

  const platforms: { id: AgentPlatformId; label: string; badge?: string }[] = [
    { id: "copilot", label: "GitHub Copilot" },
    { id: "claude", label: "Claude / Claude Code" },
    { id: "openai", label: "OpenAI API", badge: "Simulated" },
    { id: "neutral", label: "Canonical Spec" },
  ];

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
          maxWidth: "860px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                Platform Export & Installation Preview
              </h3>
              {exportResult?.isSimulatedOrExperimental && (
                <span className="badge" style={{ fontSize: "10px", background: "rgba(124, 58, 237, 0.1)", color: "#7C3AED", border: "1px solid rgba(124, 58, 237, 0.3)" }}>
                  Simulated Adapter
                </span>
              )}
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              {agent.name || "Agent"} (v{agent.version || "1.0.0"}) • Formatted for downstream runner targets
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

        {/* Platform Selection Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "8px 18px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          {platforms.map((p) => {
            const isSelected = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-ghost"}`}
                style={{ fontSize: "11px", height: "28px", padding: "0 10px" }}
                onClick={() => setSelectedPlatform(p.id)}
              >
                {p.label}
                {p.badge && (
                  <span style={{ marginLeft: "4px", opacity: 0.8, fontSize: "9px" }}>({p.badge})</span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            Generating platform export bundle...
          </div>
        ) : exportResult ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Warnings and Destination Banner */}
            <div style={{ padding: "12px 18px", background: "var(--surface-alt)", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                <div>
                  <span style={{ fontWeight: 600 }}>Destination: </span>
                  <code>{exportResult.destination.suggestedRelativePath}</code>
                  <span style={{ color: "var(--text-secondary)", marginLeft: "6px" }}>({exportResult.destination.ruleDescription})</span>
                </div>
                <span className="badge" style={{ fontSize: "10px" }}>
                  {exportResult.exportFormat}
                </span>
              </div>

              {exportResult.warnings.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--warning)", fontSize: "11px" }}>
                  <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                  <span>{exportResult.warnings[0]}</span>
                </div>
              )}
            </div>

            {/* File Switcher Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {exportResult.files.map((file, idx) => (
                  <button
                    key={file.fileName}
                    type="button"
                    className={`btn btn-sm ${selectedFileIndex === idx ? "btn-secondary" : "btn-ghost"}`}
                    style={{ fontSize: "11px", height: "24px", padding: "0 8px", border: selectedFileIndex === idx ? "1px solid var(--accent)" : "1px solid transparent" }}
                    onClick={() => setSelectedFileIndex(idx)}
                  >
                    <FileText size={11} /> {file.fileName}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ height: "26px", fontSize: "11px" }}
                  onClick={handleCopy}
                >
                  {copied ? <Check size={12} style={{ color: "var(--success)" }} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy Content"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ height: "26px", fontSize: "11px" }}
                  onClick={handleDownloadCurrent}
                >
                  <Download size={12} /> Download File
                </button>
                {exportResult.files.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ height: "26px", fontSize: "11px" }}
                    onClick={handleDownloadAll}
                  >
                    <Download size={12} /> Download Bundle ({exportResult.files.length})
                  </button>
                )}
              </div>
            </div>

            {/* Code Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#0F172A" }}>
              <pre
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "#E2E8F0",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {currentFile?.content || ""}
              </pre>
            </div>

            {/* Footer Disclaimer */}
            <div
              style={{
                padding: "8px 18px",
                borderTop: "1px solid var(--border)",
                background: "var(--surface-alt)",
                fontSize: "11px",
                color: "var(--text-secondary)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{exportResult.statusDisclaimer}</span>
              <span>Credentials not required in this phase.</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
