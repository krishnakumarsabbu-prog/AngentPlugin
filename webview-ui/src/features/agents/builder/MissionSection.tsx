import React, { useState } from "react";
import { Plus, Trash2, ShieldAlert } from "lucide-react";
import type { AgentBuilderFormState } from "./types";

interface MissionSectionProps {
  state: AgentBuilderFormState;
  onChange: (patch: Partial<AgentBuilderFormState>) => void;
  errors: Record<string, string>;
}

export const MissionSection: React.FC<MissionSectionProps> = ({
  state,
  onChange,
  errors,
}) => {
  const [newPrinciple, setNewPrinciple] = useState("");

  const handleAddPrinciple = () => {
    const trimmed = newPrinciple.trim();
    if (!trimmed) return;
    onChange({
      operatingPrinciples: [...state.operatingPrinciples, trimmed],
    });
    setNewPrinciple("");
  };

  const handleRemovePrinciple = (index: number) => {
    onChange({
      operatingPrinciples: state.operatingPrinciples.filter((_, i) => i !== index),
    });
  };

  const handleUpdatePrinciple = (index: number, val: string) => {
    const updated = [...state.operatingPrinciples];
    updated[index] = val;
    onChange({ operatingPrinciples: updated });
  };

  return (
    <div className="card builder-section" id="section-mission">
      <div className="card-header">
        <div>
          <h2 className="card-title">2. Mission & Instructions</h2>
          <p className="card-description">
            Specify the agent's objective, detailed system instructions, boundary definitions, and operating principles.
          </p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="agent-objective">
          Core Objective <span className="required-star" style={{ color: "var(--error)" }}>*</span>
        </label>
        <textarea
          id="agent-objective"
          className={`input textarea ${errors["objective"] ? "input-error" : ""}`}
          rows={3}
          placeholder="What is the single overarching goal of this agent? (e.g., Identify security vulnerabilities and stylistic violations in typescript files.)"
          value={state.objective}
          onChange={(e) => onChange({ objective: e.target.value })}
        />
        {errors["objective"] && <span className="field-error" style={{ color: "var(--error)", fontSize: "12px", display: "block" }}>{errors["objective"]}</span>}
      </div>

      <div className="form-group">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <label className="form-label" htmlFor="agent-instructions">
            System Instructions <span className="required-star" style={{ color: "var(--error)" }}>*</span>
          </label>
          <span className="field-hint" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            {state.instructions.length} characters ({state.instructions.split("\n").length} lines)
          </span>
        </div>
        <textarea
          id="agent-instructions"
          className={`input textarea ${errors["instructions"] ? "input-error" : ""}`}
          rows={8}
          style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
          placeholder="Enter complete system instructions, step-by-step methodologies, behavioral constraints, and formatting rules..."
          value={state.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
        />
        {errors["instructions"] && <span className="field-error" style={{ color: "var(--error)", fontSize: "12px", display: "block" }}>{errors["instructions"]}</span>}
      </div>

      <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="agent-scope">
            Scope (In-Scope Duties)
          </label>
          <textarea
            id="agent-scope"
            className="input textarea"
            rows={3}
            placeholder="Explicitly define what responsibilities this agent handles..."
            value={state.scope}
            onChange={(e) => onChange({ scope: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="agent-out-of-scope">
            Out-of-Scope Duties
          </label>
          <textarea
            id="agent-out-of-scope"
            className="input textarea"
            rows={3}
            placeholder="Actions, domains, or operations this agent MUST NOT perform..."
            value={state.outOfScope}
            onChange={(e) => onChange({ outOfScope: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginTop: "12px" }}>
        <label className="form-label">
          Operating Principles & Guardrails
        </label>
        <span className="field-hint" style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
          Key behavioral axioms that govern decision making and failure recovery.
        </span>

        <div className="principles-list" style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
          {state.operatingPrinciples.map((principle, index) => (
            <div key={index} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)", minWidth: "18px" }}>
                {index + 1}.
              </span>
              <input
                type="text"
                className="input"
                style={{ flex: 1 }}
                value={principle}
                onChange={(e) => handleUpdatePrinciple(index, e.target.value)}
              />
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                title="Remove principle"
                onClick={() => handleRemovePrinciple(index)}
              >
                <Trash2 size={14} style={{ color: "var(--error)" }} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            className="input"
            style={{ flex: 1 }}
            placeholder="Add new operating principle..."
            value={newPrinciple}
            onChange={(e) => setNewPrinciple(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddPrinciple();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddPrinciple}
            disabled={!newPrinciple.trim()}
          >
            <Plus size={14} /> Add Principle
          </button>
        </div>
      </div>
    </div>
  );
};
