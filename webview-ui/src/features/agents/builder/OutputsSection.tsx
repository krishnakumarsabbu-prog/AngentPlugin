import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, Code, Sparkles } from "lucide-react";
import type { AgentBuilderFormState } from "./types";

interface OutputsSectionProps {
  state: AgentBuilderFormState;
  onChange: (patch: Partial<AgentBuilderFormState>) => void;
  errors: Record<string, string>;
}

const OUTPUT_PRESETS = [
  {
    name: "Standard Outcome",
    schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Summary of actions taken" },
        status: { type: "string", enum: ["success", "needs_clarification", "failed"] },
        details: { type: "array", items: { type: "string" } },
      },
      required: ["summary", "status"],
    },
    example: {
      summary: "Completed execution successfully.",
      status: "success",
      details: ["Evaluated requirements", "Verified contract schemas"],
    },
  },
  {
    name: "Review Findings Output",
    schema: {
      type: "object",
      properties: {
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["error", "warning", "info"] },
              file: { type: "string" },
              line: { type: "number" },
              message: { type: "string" },
            },
            required: ["severity", "message"],
          },
        },
        passed: { type: "boolean" },
      },
      required: ["findings", "passed"],
    },
    example: {
      findings: [
        { severity: "warning", file: "src/AgentValidator.ts", line: 42, message: "Add explicit boundary check" },
      ],
      passed: true,
    },
  },
];

export const OutputsSection: React.FC<OutputsSectionProps> = ({
  state,
  onChange,
  errors,
}) => {
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [exampleError, setExampleError] = useState<string | null>(null);

  const handleSchemaChange = (text: string) => {
    onChange({ outputSchemaText: text });
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
    onChange({ exampleOutputText: text });
    try {
      JSON.parse(text);
      setExampleError(null);
    } catch (e) {
      setExampleError((e as Error).message);
    }
  };

  const applyPreset = (preset: typeof OUTPUT_PRESETS[0]) => {
    onChange({
      outputSchemaText: JSON.stringify(preset.schema, null, 2),
      exampleOutputText: JSON.stringify(preset.example, null, 2),
    });
    setSchemaError(null);
    setExampleError(null);
  };

  return (
    <div className="card builder-section" id="section-outputs">
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 className="card-title">7. Output Contract & Expected Structure</h2>
          <p className="card-description">
            Specify the required response structure returned by this agent to ensure pipeline composability.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Presets:</span>
          {OUTPUT_PRESETS.map((p) => (
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
        {/* Output JSON Schema */}
        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <label className="form-label" style={{ margin: 0 }}>
              Output JSON Schema <span className="required-star" style={{ color: "var(--error)" }}>*</span>
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
            value={state.outputSchemaText}
            onChange={(e) => handleSchemaChange(e.target.value)}
          />
          {schemaError && (
            <span style={{ fontSize: "11px", color: "var(--error)", display: "block", marginTop: "4px" }}>
              {schemaError}
            </span>
          )}
        </div>

        {/* Example Output */}
        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <label className="form-label" style={{ margin: 0 }}>
              Example Expected Output Payload
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
            value={state.exampleOutputText}
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
