import React, { useState } from "react";
import {
  Shield,
  Layers,
  Code,
  AlertTriangle,
  FileCode,
  CheckCircle,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import type { EvidenceFinding, FindingCategory } from "../../../types/persona";

interface EvidenceExplorerProps {
  findings: EvidenceFinding[];
  excludedIds: string[];
  onToggleExclude: (id: string) => void;
}

export function EvidenceExplorer({
  findings,
  excludedIds,
  onToggleExclude,
}: EvidenceExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const categories: { id: string; label: string; count: number }[] = [
    { id: "all", label: "All Findings", count: findings.length },
    { id: "architecture", label: "Architecture", count: findings.filter((f) => f.category === "architecture").length },
    { id: "convention", label: "Conventions", count: findings.filter((f) => f.category === "convention").length },
    { id: "workflow", label: "Workflows", count: findings.filter((f) => f.category === "workflow").length },
    { id: "risk", label: "Risks", count: findings.filter((f) => f.category === "risk").length },
    { id: "security", label: "Security", count: findings.filter((f) => f.category === "security").length },
  ];

  const filtered = findings.filter((f) => {
    if (selectedCategory !== "all" && f.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.filePath.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="evidence-explorer">
      {/* Category Pills & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`btn ${selectedCategory === c.id ? "primary" : "secondary"}`}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20 }}
              onClick={() => setSelectedCategory(c.id)}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter findings by file, title, or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "6px 12px",
            fontSize: 12,
            border: "1px solid var(--border)",
            borderRadius: 6,
            width: 260,
          }}
        />
      </div>

      {/* Findings List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
            No findings matching the selected filters.
          </div>
        ) : (
          filtered.map((finding) => {
            const isExcluded = excludedIds.includes(finding.id);

            return (
              <div
                key={finding.id}
                className="card"
                style={{
                  padding: 14,
                  borderRadius: 8,
                  border: isExcluded ? "1px dashed var(--border)" : "1px solid var(--border)",
                  opacity: isExcluded ? 0.6 : 1,
                  background: isExcluded ? "var(--bg-subtle, #F9FAFB)" : "var(--bg-card, #FFFFFF)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "monospace",
                        padding: "2px 6px",
                        background: "rgba(99, 102, 241, 0.1)",
                        color: "var(--accent, #6366F1)",
                        borderRadius: 4,
                      }}
                    >
                      {finding.id}
                    </span>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{finding.title}</h4>
                    <span
                      className={`badge ${
                        finding.confidence === "verified"
                          ? "success"
                          : finding.confidence === "inferred"
                          ? "warning"
                          : "neutral"
                      }`}
                      style={{ fontSize: 10 }}
                    >
                      {finding.confidence}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn secondary"
                    style={{ fontSize: 11, padding: "2px 8px" }}
                    onClick={() => onToggleExclude(finding.id)}
                    title={isExcluded ? "Include in skill generation" : "Exclude from skill generation"}
                  >
                    {isExcluded ? <Eye size={12} style={{ marginRight: 4 }} /> : <EyeOff size={12} style={{ marginRight: 4 }} />}
                    {isExcluded ? "Include" : "Exclude"}
                  </button>
                </div>

                <p style={{ margin: "6px 0 8px", fontSize: 12, color: "var(--text-secondary)" }}>
                  {finding.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <FileCode size={13} />
                    <code>
                      {finding.filePath}
                      {finding.lineRange ? `:${finding.lineRange[0]}-${finding.lineRange[1]}` : ""}
                    </code>
                  </span>
                  <span>Personas: {finding.personaRelevance.join(", ")}</span>
                </div>

                <div
                  style={{
                    padding: "6px 10px",
                    background: "rgba(16, 185, 129, 0.05)",
                    borderLeft: "3px solid #10B981",
                    borderRadius: "0 4px 4px 0",
                    fontSize: 11,
                    color: "var(--text-primary)",
                  }}
                >
                  <strong>Skill Directive:</strong> {finding.recommendedInstruction}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
