import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Code, FileText, Sparkles } from "lucide-react";
import type { AgentBuilderFormState } from "./types";

interface InputsSectionProps {
  state: AgentBuilderFormState;
  onChange: (patch: Partial<AgentBuilderFormState>) => void;
  errors: Record<string, string>;
}

const INPUT_PRESETS = [
  {
    name: "General Task Directive",
    schema: {
      type: "object",
      properties: {
        task: { type: "string", description: "Primary task directive" },
        context: { type: "string", description: "Optional background context" },
      },
      required: ["task"],
    },
    example: {
      task: "Analyze the current workspace architecture",
      context: "Focus on domain boundaries and storage layer contracts.",
    },
  },
  {
    name: "Code Review Input",
    schema: {
      type: "object",
      properties: {
        targetFiles: { type: "array", items: { type: "string" }, description: "Files to inspect" },
        focusAreas: { type: "array", items: { type: "string" }, description: "Areas of emphasis (e.g. security, performance)" },
      },
      required: ["targetFiles"],
    },
    example: {
      targetFiles: ["src/agents/AgentValidator.ts", "src/bridge/AgentForgeBridge.ts"],
      focusAreas: ["least-privilege defaults", "schema error handling"],
    },
  },
  {
    name: "Testing & Validation Input",
    schema: {
      type: "object",
      properties: {
        testPath: { type: "string", description: "Path to test suite or unit test file" },
        coverageThreshold: { type: "number", description: "Minimum expected coverage percentage" },
      },
      required: ["testPath"],
    },
    example: {
      testPath: "tests/agentValidator.test.ts",
      coverageThreshold: 90,
    },
  },
];

export const InputsSection: React.FC<InputsSectionProps> = ({
  state,
  onChange,
  errors,
}) => {
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [exampleError, setExampleError] = useState<string | null>(null);

  const handleSchemaChange = (text: string) => {
    onChange({ inputSchemaText: text });
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null) {
        setSchemaError("JSON Schema must be an object.");
      } else {
        setSchemaError(null);
      }
    } catch (e) {
      setSchemaError((e as Error).message);
    }
  };

  const handleExampleChange = (text: string) => {
    onChange({ exampleInputText: text });
    try {
      JSON.parse(text);
      setExampleError(null);
    } catch (e) {
      setExampleError((e as Error).message);
    }
  };

  const applyPreset = (preset: typeof INPUT_PRESETS[0]) => {
    onChange({
      inputSchemaText: JSON.stringify(preset.schema, null, 2),
      exampleInputText: JSON.stringify(preset.example, null, 2),
    });
    setSchemaError(null);
    setExampleError(null);
  };

  return (
    <div className="card builder-section" id="section-inputs">
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 className="card-title">6. Input Contract & Schema</h2>
          <p className="card-description">
            Define the strict JSON Schema and example payload that calling pipelines and operators provide to this agent.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Presets:</span>
          {INPUT_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "11px", height: "26px", padding: "0 8px" }}
              onClick={() => applyPreset(p)}
            >
              <Sparkles size={11} /> {p.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Input JSON Schema */}
        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <label className="form-label" style={{ margin: 0 }}>
              Input JSON Schema <span className="required-star" style={{ color: "var(--error)" }}>*</span>
            </label>
            {schemaError ? (
              <span style={{ fontSize: "11px", color: "var(--error)", display: "flex", alignItems: "center", gap: "4px" }}>
                <AlertTriangle size={12} /> Invalid JSON
              </span>
            ) : (
              <span style={{ fontSize: "11px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 size={12} /> Valid JSON
              </span>
            )}
          </div>
          <textarea
            className={`input textarea ${schemaError ? "input-error" : ""}`}
            rows={10}
            style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
            value={state.inputSchemaText}
            onChange={(e) => handleSchemaChange(e.target.value)}
          />
          {schemaError && (
            <span style={{ fontSize: "11px", color: "var(--error)", display: "block", marginTop: "4px" }}>
              {schemaError}
            </span>
          )}
        </div>

        {/* Example Input */}
        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <label className="form-label" style={{ margin: 0 }}>
              Example Input Payload
            </label>
            {exampleError ? (
              <span style={{ fontSize: "11px", color: "var(--error)", display: "flex", alignItems: "center", gap: "4px" }}>
                <AlertTriangle size={12} /> Invalid JSON
              </span>
            ) : (
              <span style={{ fontSize: "11px", color: "var(--success)", display: "flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 size={12} /> Valid JSON
              </span>
            )}
          </div>
          <textarea
            className={`input textarea ${exampleError ? "input-error" : ""}`}
            rows={10}
            style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}
            value={state.exampleInputText}
            onChange={(e) => handleExampleChange(e.target.value)}
          />
          {exampleError && (
            <span style={{ fontSize: "11px", color: "var(--error)", display: "block", marginTop: "4px" }}>
              {exampleError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
