import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import type { WorkflowValidationReport } from "../../types";

interface ValidationModalProps {
  report: WorkflowValidationReport | null;
  onClose: () => void;
  onSelectNode?: (nodeId: string) => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  report,
  onClose,
  onSelectNode,
}) => {
  if (!report) return null;

  const totalErrors = report.errors.length;
  const totalWarnings = report.warnings.length;
  const totalSuggestions = report.suggestions.length;

  return (
    <div
      className="dialog-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog validation-dialog" role="dialog" aria-modal="true" aria-label="Workflow Validation Report">
        <div className="dialog-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {report.valid ? (
              <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
            ) : (
              <AlertCircle size={18} style={{ color: "var(--error)" }} />
            )}
            <h2 className="dialog-title">
              {report.valid ? "Workflow Validation Passed" : "Workflow Validation Findings"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
            aria-label="Close validation modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="dialog-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Summary Banner */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 6,
              background: report.valid ? "#ECFDF5" : "#FEF2F2",
              border: `1px solid ${report.valid ? "#A7F3D0" : "#FECACA"}`,
              color: report.valid ? "#065F46" : "#991B1B",
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {report.valid
              ? "Graph DAG structure is sound. All nodes have valid entry and terminal endpoints."
              : `Found ${totalErrors} error${totalErrors === 1 ? "" : "s"} preventing pipeline readiness.`}
          </div>

          {/* Counts */}
          <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
            <span style={{ padding: "3px 8px", borderRadius: 4, background: "#FEE2E2", color: "#991B1B", fontWeight: 600 }}>
              {totalErrors} Errors
            </span>
            <span style={{ padding: "3px 8px", borderRadius: 4, background: "#FEF3C7", color: "#92400E", fontWeight: 600 }}>
              {totalWarnings} Warnings
            </span>
            <span style={{ padding: "3px 8px", borderRadius: 4, background: "#E0F2FE", color: "#075985", fontWeight: 600 }}>
              {totalSuggestions} Suggestions
            </span>
          </div>

          {/* Errors List */}
          {totalErrors > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", textTransform: "uppercase" }}>
                Blocking Issues
              </div>
              {report.errors.map((err, i) => (
                <div
                  key={`err-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 10px",
                    background: "#FFF5F5",
                    border: "1px solid #FED7D7",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <AlertCircle size={14} style={{ color: "#E53E3E", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <span>{err.message}</span>
                    {err.nodeId && onSelectNode && (
                      <button
                        onClick={() => {
                          onSelectNode(err.nodeId!);
                          onClose();
                        }}
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          background: "none",
                          border: "none",
                          color: "var(--accent)",
                          textDecoration: "underline",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Locate Node ({err.nodeId})
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warnings List */}
          {totalWarnings > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase" }}>
                Structural Warnings
              </div>
              {report.warnings.map((warn, i) => (
                <div
                  key={`warn-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 10px",
                    background: "#FFFBEB",
                    border: "1px solid #FDE68A",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <AlertTriangle size={14} style={{ color: "#D97706", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <span>{warn.message}</span>
                    {warn.nodeId && onSelectNode && (
                      <button
                        onClick={() => {
                          onSelectNode(warn.nodeId!);
                          onClose();
                        }}
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          background: "none",
                          border: "none",
                          color: "var(--accent)",
                          textDecoration: "underline",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Inspect ({warn.nodeId})
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions List */}
          {totalSuggestions > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#075985", textTransform: "uppercase" }}>
                Best Practices & Improvements
              </div>
              {report.suggestions.map((sug, i) => (
                <div
                  key={`sug-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 10px",
                    background: "#F0F9FF",
                    border: "1px solid #BAE6FD",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <Info size={14} style={{ color: "#0284C7", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <span>{sug.message}</span>
                    {sug.nodeId && onSelectNode && (
                      <button
                        onClick={() => {
                          onSelectNode(sug.nodeId!);
                          onClose();
                        }}
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          background: "none",
                          border: "none",
                          color: "var(--accent)",
                          textDecoration: "underline",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        Inspect ({sug.nodeId})
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
