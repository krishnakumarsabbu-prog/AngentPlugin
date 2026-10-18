import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import type { ValidationFinding } from "./validationTypes";

interface ValidationPanelProps {
  findings: ValidationFinding[];
  validated: boolean;
  saving?: boolean;
}

export function ValidationPanel({ findings, validated, saving }: ValidationPanelProps) {
  if (!validated || saving) return null;
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const suggestions = findings.filter((f) => f.severity === "suggestion");

  if (errors.length === 0 && warnings.length === 0 && suggestions.length === 0) {
    return (
      <div className="card validation-banner success" role="status">
        <CheckCircle2 size={16} />
        <div>
          <strong>Validation passed.</strong> No errors, warnings, or suggestions.
        </div>
      </div>
    );
  }

  return (
    <div className="card validation-panel" role="status" aria-live="polite">
      <div className="card-header">
        <h2 className="card-title">Validation results</h2>
        <span className="field-hint">
          {errors.length} error{errors.length === 1 ? "" : "s"}, {warnings.length} warning
          {warnings.length === 1 ? "" : "s"}, {suggestions.length} suggestion
          {suggestions.length === 1 ? "" : "s"}
        </span>
      </div>

      {errors.length > 0 && (
        <div className="validation-group error">
          <div className="validation-group-title">
            <AlertTriangle size={14} /> Errors
          </div>
          <ul className="validation-list">
            {errors.map((f, i) => (
              <li key={`e-${i}`} className="validation-item error" role="alert">
                <span className="validation-field">{f.field}</span>
                <span className="validation-message">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="validation-group warning">
          <div className="validation-group-title">
            <Info size={14} /> Warnings
          </div>
          <ul className="validation-list">
            {warnings.map((f, i) => (
              <li key={`w-${i}`} className="validation-item warning">
                <span className="validation-field">{f.field}</span>
                <span className="validation-message">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="validation-group suggestion">
          <div className="validation-group-title">
            <Lightbulb size={14} /> Suggestions
          </div>
          <ul className="validation-list">
            {suggestions.map((f, i) => (
              <li key={`s-${i}`} className="validation-item suggestion">
                <span className="validation-field">{f.field}</span>
                <span className="validation-message">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
