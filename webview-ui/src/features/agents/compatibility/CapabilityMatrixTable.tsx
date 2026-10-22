import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, HelpCircle, XCircle, Info } from "lucide-react";
import type { CapabilityMatrixRow, AgentPlatformId, CompatibilitySupportLevel } from "../../../types";

interface CapabilityMatrixTableProps {
  matrix?: CapabilityMatrixRow[];
}

export const DEFAULT_CAPABILITY_MATRIX: CapabilityMatrixRow[] = [
  {
    capabilityId: "system_instructions",
    capabilityName: "System Instructions & Prompts",
    category: "Identity & Mission",
    description: "Ingest overarching instructions, directives, and system personas.",
    platforms: {
      copilot: { supportLevel: "native", notes: ".github/copilot-instructions.md markdown document." },
      claude: { supportLevel: "native", notes: "Native system prompt and CLAUDE.md project guide." },
      openai: { supportLevel: "native", notes: "Assistant instructions and system role message." },
      neutral: { supportLevel: "native", notes: "Canonical instructions string." },
    },
  },
  {
    capabilityId: "role_definition",
    capabilityName: "Role Persona & Identity Boundaries",
    category: "Identity & Mission",
    description: "Explicit role definitions (e.g., Architect, QA Specialist).",
    platforms: {
      copilot: { supportLevel: "partial", notes: "Included textually; no discrete role attribute." },
      claude: { supportLevel: "native", notes: "Represented via explicit <role> XML tags." },
      openai: { supportLevel: "partial", notes: "Prefixed to instructions body text." },
      neutral: { supportLevel: "native", notes: "Top-level canonical role field." },
    },
  },
  {
    capabilityId: "operating_principles",
    capabilityName: "Operating Principles & Axioms",
    category: "Identity & Mission",
    description: "Prioritized behavioral rules and reasoning constraints.",
    platforms: {
      copilot: { supportLevel: "native", notes: "Rendered as prioritized Markdown checklist." },
      claude: { supportLevel: "native", notes: "Rendered within <operating_principles> block." },
      openai: { supportLevel: "partial", notes: "Appended to instructions text block." },
      neutral: { supportLevel: "native", notes: "Structured array of principles." },
    },
  },
  {
    capabilityId: "assigned_skills",
    capabilityName: "Assigned Skills Bundle",
    category: "Skills & Tools",
    description: "Referencing and chaining modular skill packages created in AgentForge.",
    platforms: {
      copilot: { supportLevel: "partial", notes: "Referenced textually; skills must reside in workspace." },
      claude: { supportLevel: "native", notes: "Referenced in CLAUDE.md; Claude Code inspects local files." },
      openai: { supportLevel: "partial", notes: "Flattened into consolidated assistant instructions." },
      neutral: { supportLevel: "native", notes: "Canonical assignedSkillIds list." },
    },
  },
  {
    capabilityId: "declarative_tools",
    capabilityName: "Declarative Function Tools",
    category: "Skills & Tools",
    description: "Structured tool definitions with schemas, purpose, and permissions.",
    platforms: {
      copilot: { supportLevel: "unsupported", notes: "Copilot instructions do not execute runtime tools. Included textually as guidance only." },
      claude: { supportLevel: "native", notes: "Claude tool use input_schema format." },
      openai: { supportLevel: "native", notes: "tools array with type: 'function' parameters." },
      neutral: { supportLevel: "native", notes: "Full declarative toolDefinitions array." },
    },
  },
  {
    capabilityId: "permission_guardrails",
    capabilityName: "Least-Privilege Guardrails",
    category: "Governance & Safety",
    description: "Enforcing read-only mode, workspace confinement, shell and network barriers.",
    platforms: {
      copilot: { supportLevel: "partial", notes: "Advisory negative prompt rules only; no deterministic sandbox." },
      claude: { supportLevel: "partial", notes: "Claude Code prompts for tool approvals; permissions guide safety prompts." },
      openai: { supportLevel: "simulated", notes: "OpenAI API has no local machine sandbox; caller client must enforce permissions." },
      neutral: { supportLevel: "native", notes: "Canonical PermissionPolicy object." },
    },
  },
  {
    capabilityId: "restricted_paths",
    capabilityName: "Restricted Paths Denylist",
    category: "Governance & Safety",
    description: "Forbidden security globs (.git, .env, *.key).",
    platforms: {
      copilot: { supportLevel: "partial", notes: "Documented as forbidden path directives in markdown." },
      claude: { supportLevel: "partial", notes: "Configured in CLAUDE.md ignore directives." },
      openai: { supportLevel: "simulated", notes: "Enforced by calling client during function tool servicing." },
      neutral: { supportLevel: "native", notes: "Restricted paths array." },
    },
  },
  {
    capabilityId: "input_output_schemas",
    capabilityName: "Input / Output JSON Schemas",
    category: "Contracts & Runtime",
    description: "Deterministic JSON Schema validation for pipeline composition.",
    platforms: {
      copilot: { supportLevel: "unsupported", notes: "No runtime schema gating; documented for human reference." },
      claude: { supportLevel: "partial", notes: "Supports tool input schemas; top-level schemas require prompt wrapper." },
      openai: { supportLevel: "partial", notes: "Supports function parameters schema and json_object response format." },
      neutral: { supportLevel: "native", notes: "Canonical inputSchema and outputSchema objects." },
    },
  },
];

export const CapabilityMatrixTable: React.FC<CapabilityMatrixTableProps> = ({ matrix = DEFAULT_CAPABILITY_MATRIX }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Identity & Mission", "Skills & Tools", "Governance & Safety", "Contracts & Runtime"];

  const filteredMatrix = matrix.filter((row) => {
    if (selectedCategory === "All") return true;
    return row.category === selectedCategory;
  });

  const renderBadge = (level: CompatibilitySupportLevel, notes: string) => {
    switch (level) {
      case "native":
        return (
          <span
            className="badge badge-success"
            title={notes}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "help" }}
          >
            <CheckCircle2 size={11} /> Native
          </span>
        );
      case "partial":
        return (
          <span
            className="badge badge-warning"
            title={notes}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "help" }}
          >
            <AlertTriangle size={11} /> Partial
          </span>
        );
      case "simulated":
        return (
          <span
            className="badge"
            title={notes}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              cursor: "help",
              background: "rgba(124, 58, 237, 0.1)",
              color: "#7C3AED",
              border: "1px solid rgba(124, 58, 237, 0.3)",
            }}
          >
            <HelpCircle size={11} /> Simulated
          </span>
        );
      case "unsupported":
      default:
        return (
          <span
            className="badge badge-danger"
            title={notes}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", cursor: "help" }}
          >
            <XCircle size={11} /> Unsupported
          </span>
        );
    }
  };

  return (
    <div className="card capability-matrix-card" style={{ marginBottom: "20px" }}>
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 className="card-title" style={{ fontSize: "14px", margin: 0 }}>
            Cross-Platform Capability Matrix
          </h3>
          <p className="card-description" style={{ fontSize: "12px", margin: "4px 0 0" }}>
            Comparison of native, partial, and simulated platform capabilities across agent execution environments.
          </p>
        </div>

        {/* Category Filters */}
        <div style={{ display: "flex", gap: "4px" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${selectedCategory === cat ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: "11px", height: "26px", padding: "0 8px" }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-alt)" }}>
              <th style={{ textAlign: "left", padding: "10px 12px", width: "240px" }}>Capability</th>
              <th style={{ textAlign: "center", padding: "10px 12px" }}>GitHub Copilot</th>
              <th style={{ textAlign: "center", padding: "10px 12px" }}>Claude / Claude Code</th>
              <th style={{ textAlign: "center", padding: "10px 12px" }}>OpenAI API (Simulated)</th>
              <th style={{ textAlign: "center", padding: "10px 12px" }}>AgentForge Canonical</th>
            </tr>
          </thead>
          <tbody>
            {filteredMatrix.map((row) => (
              <tr key={row.capabilityId} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 12px" }}>
                  <strong style={{ display: "block", color: "var(--text-primary)" }}>{row.capabilityName}</strong>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{row.description}</span>
                </td>
                <td style={{ textAlign: "center", padding: "10px 8px" }}>
                  {renderBadge(row.platforms.copilot.supportLevel, row.platforms.copilot.notes)}
                </td>
                <td style={{ textAlign: "center", padding: "10px 8px" }}>
                  {renderBadge(row.platforms.claude.supportLevel, row.platforms.claude.notes)}
                </td>
                <td style={{ textAlign: "center", padding: "10px 8px" }}>
                  {renderBadge(row.platforms.openai.supportLevel, row.platforms.openai.notes)}
                </td>
                <td style={{ textAlign: "center", padding: "10px 8px" }}>
                  {renderBadge(row.platforms.neutral.supportLevel, row.platforms.neutral.notes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "10px 14px", background: "var(--surface-alt)", borderTop: "1px solid var(--border)", display: "flex", gap: "16px", fontSize: "11px", color: "var(--text-secondary)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <CheckCircle2 size={12} style={{ color: "var(--success)" }} /> Native: Directly supported by platform runtime
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <AlertTriangle size={12} style={{ color: "var(--warning)" }} /> Partial: Documented textually; advisory enforcement
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <HelpCircle size={12} style={{ color: "#7C3AED" }} /> Simulated: Export payload generated; credentials not required
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <XCircle size={12} style={{ color: "var(--error)" }} /> Unsupported: Platform lacks semantic equivalent
        </div>
      </div>
    </div>
  );
};
