import React, { useState } from "react";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { PlatformCompatibility, AgentExportFormat } from "../../../types";
import type { AgentBuilderFormState } from "./types";
import { CapabilityMatrixTable } from "../compatibility/CapabilityMatrixTable";

interface CompatibilitySectionProps {
  state: AgentBuilderFormState;
  onChange: (patch: Partial<AgentBuilderFormState>) => void;
  errors: Record<string, string>;
}

const PLATFORMS: { id: PlatformCompatibility; label: string; desc: string }[] = [
  { id: "neutral", label: "Neutral / Cross-Platform", desc: "Standard runtime-agnostic agent specification." },
  { id: "copilot", label: "GitHub Copilot", desc: "Generates .github/copilot-instructions.md markdown." },
  { id: "claude", label: "Claude Subagent", desc: "Structured XML/markdown system prompt for Claude Projects." },
  { id: "openai", label: "OpenAI Assistants", desc: "Function calling tools JSON payload for GPT models." },
];

export const CompatibilitySection: React.FC<CompatibilitySectionProps> = ({
  state,
  onChange,
  errors,
}) => {
  const [showMatrix, setShowMatrix] = useState(false);

  const handleTogglePlatform = (platformId: PlatformCompatibility) => {
    const current = state.compatibility || [];
    const next = current.includes(platformId)
      ? current.filter((p) => p !== platformId)
      : [...current, platformId];
    onChange({ compatibility: next.length > 0 ? next : ["neutral"] });
  };

  const hasCopilotWithTools =
    state.compatibility.includes("copilot") && state.toolDefinitions.length > 0;

  const hasWriteWithShell =
    state.permissionPolicy.shell && !state.permissionPolicy.humanApprovalRequired;

  return (
    <div className="card builder-section" id="section-compatibility">
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 className="card-title">8. Target Platforms & Compatibility</h2>
          <p className="card-description">
            Select target deployment environments and default export format. AgentForge translates declarative policies across target platform semantics.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setShowMatrix((prev) => !prev)}
        >
          {showMatrix ? "Hide Capability Matrix" : "View Full Capability Matrix"}
        </button>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label className="form-label">
          Target Platforms <span className="required-star" style={{ color: "var(--error)" }}>*</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "6px" }}>
          {PLATFORMS.map((p) => {
            const checked = state.compatibility.includes(p.id);
            return (
              <div
                key={p.id}
                style={{
                  border: checked ? "1px solid var(--accent)" : "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "12px",
                  background: checked ? "rgba(52, 72, 197, 0.04)" : "var(--surface)",
                  cursor: "pointer",
                }}
                onClick={() => handleTogglePlatform(p.id)}
              >
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleTogglePlatform(p.id)}
                    style={{ marginTop: "3px" }}
                  />
                  <div>
                    <strong style={{ fontSize: "13px", display: "block", color: checked ? "var(--accent)" : "inherit" }}>
                      {p.label}
                    </strong>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{p.desc}</span>
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-group" style={{ maxWidth: "340px", marginBottom: "16px" }}>
        <label className="form-label" htmlFor="agent-export-format">
          Default Export Format
        </label>
        <select
          id="agent-export-format"
          className="input select"
          value={state.exportFormat}
          onChange={(e) => onChange({ exportFormat: e.target.value as AgentExportFormat })}
        >
          <option value="agent-spec">Canonical Agent Spec (JSON)</option>
          <option value="copilot-instructions">GitHub Copilot Instructions (.md)</option>
          <option value="claude-subagent">Claude Subagent Prompt (.md)</option>
          <option value="openai-assistant">OpenAI Assistant Schema (JSON)</option>
        </select>
      </div>

      {/* Unsupported Fields & Warnings Display */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
        <h4 style={{ fontSize: "12px", fontWeight: 600, margin: "0 0 8px 0" }}>Platform Warnings & Limitations</h4>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {hasCopilotWithTools && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "var(--surface-alt)", border: "1px solid var(--warning)", borderRadius: "var(--radius)", fontSize: "12px", color: "var(--warning)" }}>
              <AlertTriangle size={14} />
              <span><strong>Copilot Notice:</strong> GitHub Copilot workspace instructions do not natively execute runtime tool definitions. Declared tools will be documented textually as reference capabilities.</span>
            </div>
          )}

          {state.compatibility.includes("openai") && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "12px", color: "var(--text-secondary)" }}>
              <Info size={14} />
              <span><strong>OpenAI Translation:</strong> Tool definitions will be exported as OpenAI Assistant <code>function</code> calling specifications with schema parameters.</span>
            </div>
          )}

          {!hasCopilotWithTools && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "rgba(21, 128, 61, 0.05)", border: "1px solid rgba(21, 128, 61, 0.2)", borderRadius: "var(--radius)", fontSize: "12px", color: "var(--success)" }}>
              <CheckCircle size={14} />
              <span>Declarations and policies are compatible with selected target platforms.</span>
            </div>
          )}
        </div>
      </div>

      {showMatrix && (
        <div style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
          <CapabilityMatrixTable />
        </div>
      )}
    </div>
  );
};
