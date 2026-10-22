import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";
import type { EvaluationScorecard } from "../../../types/persona";

interface QualityScorecardProps {
  evaluation: EvaluationScorecard;
}

export function QualityScorecard({ evaluation }: QualityScorecardProps) {
  const dimensions = [
    { label: "Persona Alignment", key: "personaAlignment", ...evaluation.dimensions.personaAlignment },
    { label: "Repository Grounding", key: "repositoryGrounding", ...evaluation.dimensions.repositoryGrounding },
    { label: "Actionability", key: "actionability", ...evaluation.dimensions.actionability },
    { label: "Coverage", key: "coverage", ...evaluation.dimensions.coverage },
    { label: "Safety & Security", key: "safety", ...evaluation.dimensions.safety },
    { label: "Platform Portability", key: "portability", ...evaluation.dimensions.portability },
  ];

  const getTone = (score: number) => {
    if (score >= 85) return "#10B981";
    if (score >= 70) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="quality-scorecard card" style={{ padding: 18, borderRadius: 8, border: "1px solid var(--border)" }}>
      {/* Overall Score Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={20} color="#10B981" />
            Deterministic Skill Quality Evaluation
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
            Evaluated against AST-backed structural rules, persona principles, and safety boundaries.
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: getTone(evaluation.overallScore) }}>
            {evaluation.overallScore}<span style={{ fontSize: 14, color: "var(--text-muted)" }}>/100</span>
          </div>
          <span className="badge success" style={{ fontSize: 10 }}>Production Ready</span>
        </div>
      </div>

      {/* 6 Dimensions Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {dimensions.map((dim) => {
          const barColor = getTone(dim.score);

          return (
            <div
              key={dim.key}
              style={{
                padding: 12,
                borderRadius: 6,
                background: "var(--bg-subtle, #F9FAFB)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{dim.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{dim.score}%</span>
              </div>

              <div style={{ height: 6, background: "var(--border, #E5E7EB)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${dim.score}%`, background: barColor }} />
              </div>

              <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                {dim.rationale}
              </p>
            </div>
          );
        })}
      </div>

      {/* Passed Gates & Actionable Recommendations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <div>
          <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#10B981", display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={14} /> Passed Quality Gates ({evaluation.passedGates.length})
          </h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-primary)" }}>
            {evaluation.passedGates.map((gate, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{gate}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 600, color: "#F59E0B", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> Actionable Recommendations & Warnings
          </h4>
          {evaluation.actionableRecommendations.length === 0 && evaluation.unsupportedAssumptions.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Zero quality defects or warnings detected.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--text-primary)" }}>
              {evaluation.actionableRecommendations.map((rec, i) => (
                <li key={`rec-${i}`} style={{ marginBottom: 4 }}>{rec}</li>
              ))}
              {evaluation.unsupportedAssumptions.map((warn, i) => (
                <li key={`warn-${i}`} style={{ marginBottom: 4, color: "#DC2626" }}>{warn}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
