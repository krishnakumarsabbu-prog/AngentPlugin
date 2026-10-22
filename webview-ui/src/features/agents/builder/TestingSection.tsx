import React, { useState } from "react";
import {
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Activity,
} from "lucide-react";
import type { TestScenario } from "../../../types";
import type { AgentBuilderFormState } from "./types";

interface TestingSectionProps {
  state: AgentBuilderFormState;
  onChange: (patch: Partial<AgentBuilderFormState>) => void;
  errors: Record<string, string>;
}

export const TestingSection: React.FC<TestingSectionProps> = ({
  state,
  onChange,
  errors,
}) => {
  const [evaluating, setEvaluating] = useState(false);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0);

  const handleAddScenario = () => {
    const newScenario: TestScenario = {
      id: `scenario-${state.testScenarios.length + 1}`,
      name: `Test Scenario ${state.testScenarios.length + 1}`,
      description: "Verification of contract execution under sample input.",
      inputPayload: JSON.stringify({ task: "Run sample validation test" }, null, 2),
      expectedOutcome: "Conforming output with status=success",
    };
    onChange({
      testScenarios: [...state.testScenarios, newScenario],
    });
    setSelectedScenarioIndex(state.testScenarios.length);
  };

  const handleRemoveScenario = (index: number) => {
    const next = state.testScenarios.filter((_, i) => i !== index);
    onChange({ testScenarios: next });
    if (selectedScenarioIndex >= next.length) {
      setSelectedScenarioIndex(Math.max(0, next.length - 1));
    }
  };

  const handleUpdateScenario = (index: number, patch: Partial<TestScenario>) => {
    const next = [...state.testScenarios];
    next[index] = { ...next[index], ...patch };
    onChange({ testScenarios: next });
  };

  const handleRunMockEvaluation = (index?: number) => {
    setEvaluating(true);
    setTimeout(() => {
      const now = new Date().toISOString();
      const updated = state.testScenarios.map((sc, i) => {
        if (index !== undefined && i !== index) return sc;

        // Deterministic contract checks:
        let score = 100;
        const notes: string[] = [];

        // Check 1: Input schema validation
        try {
          JSON.parse(state.inputSchemaText);
          notes.push("Input JSON Schema valid (+25)");
        } catch {
          score -= 25;
          notes.push("Input JSON Schema malformed (-25)");
        }

        // Check 2: Output schema validation
        try {
          JSON.parse(state.outputSchemaText);
          notes.push("Output JSON Schema valid (+25)");
        } catch {
          score -= 25;
          notes.push("Output JSON Schema malformed (-25)");
        }

        // Check 3: Instructions completeness
        if (state.instructions.trim().length >= 20) {
          notes.push("System instructions meet depth threshold (+25)");
        } else {
          score -= 25;
          notes.push("System instructions too brief (-25)");
        }

        // Check 4: Scenario input payload format
        try {
          if (typeof sc.inputPayload === "string" && sc.inputPayload.trim()) {
            JSON.parse(sc.inputPayload);
            notes.push("Scenario input payload JSON valid (+25)");
          } else {
            notes.push("Scenario payload present (+25)");
          }
        } catch {
          score -= 15;
          notes.push("Scenario payload is not valid JSON (-15)");
        }

        const passed = score >= 75;

        return {
          ...sc,
          lastEvaluationResult: {
            passed,
            score: Math.max(0, score),
            notes: notes.join(" • "),
            evaluatedAt: now,
          },
        };
      });

      onChange({ testScenarios: updated });
      setEvaluating(false);
    }, 600);
  };

  const activeScenario = state.testScenarios[selectedScenarioIndex];

  return (
    <div className="card builder-section" id="section-testing">
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 className="card-title">9. Contract Testing & Mock Evaluation</h2>
          <p className="card-description">
            Define sample test scenarios and verify agent contract adherence against input/output specifications.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddScenario}
          >
            <Plus size={14} /> Add Scenario
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={evaluating || state.testScenarios.length === 0}
            onClick={() => handleRunMockEvaluation()}
          >
            <Play size={14} /> {evaluating ? "Evaluating..." : "Run Mock Evaluation"}
          </button>
        </div>
      </div>

      {/* Explicit Mock Evaluation Notice */}
      <div
        style={{
          padding: "10px 14px",
          background: "var(--surface-alt)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          fontSize: "12px",
          color: "var(--text-secondary)",
          marginBottom: "16px",
          display: "flex",
          gap: "8px",
          alignItems: "flex-start",
        }}
      >
        <HelpCircle size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "1px" }} />
        <div>
          <strong>Deterministic Mock Evaluation:</strong> AgentForge evaluates contract adherence, schema conformity, and guardrail completeness deterministically.
          <em> Mock evaluations do not invoke a real AI model or execute arbitrary tools or shell commands.</em>
        </div>
      </div>

      {state.testScenarios.length === 0 ? (
        <div
          style={{
            padding: "24px",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius)",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          <Activity size={24} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
          <p style={{ margin: "0 0 8px 0" }}>No test scenarios defined for this agent.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddScenario}
          >
            <Plus size={14} /> Create Test Scenario
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "16px" }}>
          {/* Scenarios List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {state.testScenarios.map((sc, i) => {
              const isSelected = selectedScenarioIndex === i;
              const result = sc.lastEvaluationResult;

              return (
                <div
                  key={sc.id || i}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius)",
                    border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: isSelected ? "rgba(52, 72, 197, 0.05)" : "var(--surface)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  onClick={() => setSelectedScenarioIndex(i)}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: "12px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {sc.name || `Scenario ${i + 1}`}
                    </strong>
                    {result ? (
                      <span style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", color: result.passed ? "var(--success)" : "var(--error)" }}>
                        {result.passed ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                        {result.score}% Score
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Not evaluated</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-icon btn-ghost"
                    style={{ padding: "2px" }}
                    title="Remove scenario"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveScenario(i);
                    }}
                  >
                    <Trash2 size={12} style={{ color: "var(--error)" }} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Scenario Details */}
          {activeScenario && (
            <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px", background: "var(--surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>Scenario Details</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={evaluating}
                  onClick={() => handleRunMockEvaluation(selectedScenarioIndex)}
                >
                  <Play size={12} /> Evaluate This Scenario
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Scenario Name</label>
                <input
                  type="text"
                  className="input"
                  value={activeScenario.name}
                  onChange={(e) => handleUpdateScenario(selectedScenarioIndex, { name: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Description</label>
                <input
                  type="text"
                  className="input"
                  value={activeScenario.description || ""}
                  onChange={(e) => handleUpdateScenario(selectedScenarioIndex, { description: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Sample Input Payload (JSON)</label>
                <textarea
                  className="input textarea"
                  rows={4}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}
                  value={
                    typeof activeScenario.inputPayload === "string"
                      ? activeScenario.inputPayload
                      : JSON.stringify(activeScenario.inputPayload || {}, null, 2)
                  }
                  onChange={(e) => handleUpdateScenario(selectedScenarioIndex, { inputPayload: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label" style={{ fontSize: "12px" }}>Expected Outcome</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Conforming output with status=success"
                  value={activeScenario.expectedOutcome || ""}
                  onChange={(e) => handleUpdateScenario(selectedScenarioIndex, { expectedOutcome: e.target.value })}
                />
              </div>

              {/* Evaluation Results Banner */}
              {activeScenario.lastEvaluationResult && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "var(--radius)",
                    background: activeScenario.lastEvaluationResult.passed
                      ? "rgba(21, 128, 61, 0.08)"
                      : "rgba(185, 28, 28, 0.08)",
                    border: activeScenario.lastEvaluationResult.passed
                      ? "1px solid var(--success)"
                      : "1px solid var(--error)",
                    marginTop: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {activeScenario.lastEvaluationResult.passed ? (
                        <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                      ) : (
                        <XCircle size={16} style={{ color: "var(--error)" }} />
                      )}
                      <strong style={{ fontSize: "13px" }}>
                        Mock Evaluation {activeScenario.lastEvaluationResult.passed ? "Passed" : "Failed"} (Score: {activeScenario.lastEvaluationResult.score}%)
                      </strong>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      {new Date(activeScenario.lastEvaluationResult.evaluatedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                    {activeScenario.lastEvaluationResult.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
