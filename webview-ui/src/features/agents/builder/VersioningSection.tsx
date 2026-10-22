import React from "react";
import { History, GitCommit, Clock } from "lucide-react";
import type { AgentBuilderFormState } from "./types";

interface VersioningSectionProps {
  state: AgentBuilderFormState;
  onChange: (patch: Partial<AgentBuilderFormState>) => void;
  errors: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
}

export const VersioningSection: React.FC<VersioningSectionProps> = ({
  state,
  onChange,
  errors,
  createdAt,
  updatedAt,
}) => {
  return (
    <div className="card builder-section" id="section-versioning">
      <div className="card-header">
        <div>
          <h2 className="card-title">10. Versioning & Update History</h2>
          <p className="card-description">
            Track iteration milestones, semantic version tags, and changelog records for this agent.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "16px", marginBottom: "16px" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="version-semver">
            Semantic Version <span className="required-star" style={{ color: "var(--error)" }}>*</span>
          </label>
          <input
            id="version-semver"
            type="text"
            className={`input ${errors["version"] ? "input-error" : ""}`}
            placeholder="1.0.0"
            value={state.version}
            onChange={(e) => onChange({ version: e.target.value })}
          />
          <span className="field-hint" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            MAJOR.MINOR.PATCH (e.g. 1.0.0, 1.1.0-beta)
          </span>
          {errors["version"] && <span className="field-error" style={{ color: "var(--error)", fontSize: "12px", display: "block" }}>{errors["version"]}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="version-changelog">
            Changelog & Revision Notes
          </label>
          <textarea
            id="version-changelog"
            className="input textarea"
            rows={4}
            placeholder="Document updates, modifications, or breaking changes in this version..."
            value={state.changelog}
            onChange={(e) => onChange({ changelog: e.target.value })}
          />
        </div>
      </div>

      {/* Timestamp Audit Trail */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          padding: "10px 14px",
          background: "var(--surface-alt)",
          borderRadius: "var(--radius)",
          fontSize: "12px",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={14} />
          <span>Created: {createdAt ? new Date(createdAt).toLocaleString() : "New Agent (Unsaved)"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <History size={14} />
          <span>Last Updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "Pending save"}</span>
        </div>
      </div>
    </div>
  );
};
