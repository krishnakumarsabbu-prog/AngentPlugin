import React from "react";
import type { AgentBuilderFormState } from "./types";
import { suggestAgentId } from "./types";

interface IdentitySectionProps {
  state: AgentBuilderFormState;
  onChange: (patch: Partial<AgentBuilderFormState>) => void;
  isEditing: boolean;
  errors: Record<string, string>;
}

const CATEGORIES = [
  "Architecture",
  "Planning",
  "Implementation",
  "Code Review",
  "Testing & QA",
  "Documentation",
  "Security & Compliance",
  "Operations",
  "Custom",
];

export const IdentitySection: React.FC<IdentitySectionProps> = ({
  state,
  onChange,
  isEditing,
  errors,
}) => {
  const handleNameChange = (name: string) => {
    const patch: Partial<AgentBuilderFormState> = { name };
    // If creating new agent and ID was either empty or matched the old slug, auto-update ID
    if (!isEditing) {
      const currentSlug = suggestAgentId(state.name);
      if (!state.id || state.id === currentSlug) {
        patch.id = suggestAgentId(name);
      }
    }
    onChange(patch);
  };

  return (
    <div className="card builder-section" id="section-identity">
      <div className="card-header">
        <div>
          <h2 className="card-title">1. Agent Identity</h2>
          <p className="card-description">
            Define basic metadata, naming, semantic identifier, role, and operational state.
          </p>
        </div>
      </div>

      <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label className="form-label" htmlFor="agent-name">
            Agent Name <span className="required-star" style={{ color: "var(--error)" }}>*</span>
          </label>
          <input
            id="agent-name"
            className={`input ${errors["name"] ? "input-error" : ""}`}
            type="text"
            placeholder="e.g., Static Code Review Agent"
            value={state.name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
          {errors["name"] && <span className="field-error" style={{ color: "var(--error)", fontSize: "12px" }}>{errors["name"]}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="agent-id">
            Agent ID <span className="required-star" style={{ color: "var(--error)" }}>*</span>
            {isEditing && <span className="field-hint" style={{ marginLeft: "6px", fontSize: "11px", color: "var(--text-secondary)" }}>(Immutable)</span>}
          </label>
          <input
            id="agent-id"
            className={`input ${errors["id"] ? "input-error" : ""}`}
            type="text"
            placeholder="e.g., code-review-agent"
            value={state.id}
            disabled={isEditing}
            onChange={(e) => onChange({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
          />
          <span className="field-hint" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Unique slug containing lowercase letters, numbers, and hyphens.
          </span>
          {errors["id"] && <span className="field-error" style={{ color: "var(--error)", fontSize: "12px", display: "block" }}>{errors["id"]}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="agent-role">
            Role Definition <span className="required-star" style={{ color: "var(--error)" }}>*</span>
          </label>
          <input
            id="agent-role"
            className={`input ${errors["role"] ? "input-error" : ""}`}
            type="text"
            placeholder="e.g., Quality Assurance Specialist"
            value={state.role}
            onChange={(e) => onChange({ role: e.target.value })}
          />
          <span className="field-hint" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            The primary functional persona of this agent.
          </span>
          {errors["role"] && <span className="field-error" style={{ color: "var(--error)", fontSize: "12px", display: "block" }}>{errors["role"]}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="agent-category">
            Category
          </label>
          <select
            id="agent-category"
            className="input select"
            value={state.category}
            onChange={(e) => onChange({ category: e.target.value })}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="agent-status">
            Status
          </label>
          <select
            id="agent-status"
            className="input select"
            value={state.status}
            onChange={(e) => onChange({ status: e.target.value as AgentBuilderFormState["status"] })}
          >
            <option value="Draft">Draft (in progress)</option>
            <option value="Ready">Ready (production ready)</option>
            <option value="Experimental">Experimental (testing phase)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="agent-version">
            Version <span className="required-star" style={{ color: "var(--error)" }}>*</span>
          </label>
          <input
            id="agent-version"
            className={`input ${errors["version"] ? "input-error" : ""}`}
            type="text"
            placeholder="1.0.0"
            value={state.version}
            onChange={(e) => onChange({ version: e.target.value })}
          />
          <span className="field-hint" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Follows Semantic Versioning (e.g. 1.0.0 or 0.1.0-alpha).
          </span>
          {errors["version"] && <span className="field-error" style={{ color: "var(--error)", fontSize: "12px", display: "block" }}>{errors["version"]}</span>}
        </div>

        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label className="form-label" htmlFor="agent-description">
            Description
          </label>
          <textarea
            id="agent-description"
            className="input textarea"
            rows={3}
            placeholder="High-level overview of what this agent does and when it should be invoked..."
            value={state.description}
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};
