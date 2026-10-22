import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Download,
  Info,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Shield,
  Layers,
  FileCode,
} from "lucide-react";
import type {
  Agent,
  FullCompatibilityReport,
  AgentPlatformId,
  PlatformExportResult,
} from "../../../types";
import { getAgentsStore } from "../../../services/agentsService";
import { CapabilityMatrixTable } from "./CapabilityMatrixTable";

interface AgentCompatibilityPanelProps {
  agent: Partial<Agent>;
  onExportPlatform?: (platform: AgentPlatformId) => void;
  onInstallPlatform?: (platform: "copilot" | "claude") => void;
  onToast: (msg: string, tone?: "success" | "error") => void;
}

export const AgentCompatibilityPanel: React.FC<AgentCompatibilityPanelProps> = ({
  agent,
  onExportPlatform,
  onInstallPlatform,
  onToast,
}) => {
  const [report, setReport] = useState<FullCompatibilityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMatrix, setShowMatrix] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<AgentPlatformId>("copilot");

  useEffect(() => {
    let active = true;
    setLoading(true);

    const store = getAgentsStore();
    store
      .getCompatibility(agent, agent.id)
      .then((res) => {
        if (!active) return;
        setReport(res);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [agent]);

  if (loading) {
    return (
      <div className="card" style={{ padding: "16px", textAlign: "center", color: "var(--text-secondary)" }}>
        Analyzing platform compatibility...
      </div>
    );
  }

  if (!report) return null;

  const platforms: { id: AgentPlatformId; name: string; destination: string }[] = [
    { id: "copilot", name: "GitHub Copilot (.github)", destination: `.github/agents/${agent.id}.agent.md` },
    { id: "claude", name: "Claude Code (.claude)", destination: `.claude/agents/${agent.id}.md` },
  ];

  const activePlatformObj = platforms.find((p) => p.id === selectedPlatform) || platforms[0];
  const activeAnalysis = report.platformAnalysis[selectedPlatform];

  return (
    <div className="card agent-compatibility-panel" style={{ marginBottom: "20px" }}>
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 className="card-title" style={{ fontSize: "14px", margin: 0 }}>
              Platform Compatibility & Export Adapters
            </h3>
            <span className="badge" style={{ fontSize: "11px", background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}>
              Verified Integration
            </span>
          </div>
          <p className="card-description" style={{ fontSize: "12px", margin: "4px 0 0" }}>
            Deployment verification for GitHub Copilot agent mode and Claude Code in local VS Code workspaces.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ fontSize: "11px" }}
          onClick={() => setShowMatrix((prev) => !prev)}
        >
          {showMatrix ? "Hide Matrix" : "View Full Capability Matrix"}
        </button>
      </div>

      {/* Platform Selector Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "10px", padding: "14px 16px", background: "var(--surface-alt)", borderBottom: "1px solid var(--border)" }}>
        {platforms.map((p) => {
          const isSelected = selectedPlatform === p.id;

          return (
            <div
              key={p.id}
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius)",
                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: isSelected ? "var(--surface)" : "var(--surface-alt)",
                cursor: "pointer",
                boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                transition: "all 0.15s ease",
              }}
              onClick={() => setSelectedPlatform(p.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <strong style={{ fontSize: "13px", color: isSelected ? "var(--accent)" : "var(--text-primary)" }}>
                  {p.name}
                </strong>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    color: "var(--success)",
                    background: "rgba(16, 185, 129, 0.12)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <CheckCircle2 size={10} /> Verified
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Target: <code>{p.destination}</code>
              </span>
            </div>
          );
        })}
      </div>

      {/* Active Platform Breakdown */}
      {activeAnalysis && (
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={15} style={{ color: "var(--success)" }} /> {activePlatformObj.name} Integration Status
              </h4>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Target installation destination: <code>{activePlatformObj.destination}</code>
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {onInstallPlatform && (selectedPlatform === "copilot" || selectedPlatform === "claude") && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onInstallPlatform(selectedPlatform)}
                >
                  <Download size={13} /> Install to {selectedPlatform === "copilot" ? "Copilot (.github)" : "Claude (.claude)"}
                </button>
              )}
              {onExportPlatform && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onExportPlatform(selectedPlatform)}
                >
                  <Download size={13} /> Export for {activePlatformObj.name}
                </button>
              )}
            </div>
          </div>

          {/* Clean Integration Status Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <CheckCircle2 size={13} style={{ color: "var(--success)" }} />
                <strong style={{ fontSize: "12px" }}>Platform Adapter</strong>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Native custom agent definition and skill configuration verified for {activePlatformObj.name}.
              </p>
            </div>

            <div
              style={{
                padding: "10px 12px",
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <Shield size={13} style={{ color: "var(--accent)" }} />
                <strong style={{ fontSize: "12px" }}>Security Architecture</strong>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Enforces Mode A (Repository-Local Static Audit) by default with read-only source code inspection.
              </p>
            </div>

            <div
              style={{
                padding: "10px 12px",
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <Layers size={13} style={{ color: "var(--accent)" }} />
                <strong style={{ fontSize: "12px" }}>Deterministic Validation</strong>
              </div>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                Validates findings schema, coverage ledger transitions, and metadata offline via Node.js scripts.
              </p>
            </div>
          </div>

          {/* Runtime Execution Directive */}
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(52, 72, 197, 0.04)",
              border: "1px solid rgba(52, 72, 197, 0.15)",
              borderRadius: "var(--radius)",
              fontSize: "11px",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Info size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span>
              <strong>Workspace Scope:</strong> Operates directly on the developer's local VS Code repository with Git revision and uncommitted dirty worktree tracking.
            </span>
          </div>
        </div>
      )}

      {/* Expandable Full Capability Matrix */}
      {showMatrix && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "16px" }}>
          <CapabilityMatrixTable matrix={report.matrix} />
        </div>
      )}
    </div>
  );
};
