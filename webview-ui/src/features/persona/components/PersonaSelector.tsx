import React from "react";
import {
  Code,
  Layers,
  ShieldAlert,
  Compass,
  Lock,
  Activity,
  Check,
  Info,
} from "lucide-react";
import type { EngineeringPersona, PersonaId } from "../../../types/persona";

interface PersonaSelectorProps {
  personas: EngineeringPersona[];
  selectedIds: PersonaId[];
  onTogglePersona: (id: PersonaId) => void;
  onSelectPrimary: (id: PersonaId) => void;
}

function getIcon(name: string) {
  switch (name) {
    case "Code":
      return Code;
    case "Layers":
      return Layers;
    case "ShieldAlert":
      return ShieldAlert;
    case "Compass":
      return Compass;
    case "Lock":
      return Lock;
    case "Activity":
      return Activity;
    default:
      return Code;
  }
}

export function PersonaSelector({
  personas,
  selectedIds,
  onTogglePersona,
}: PersonaSelectorProps) {
  return (
    <div className="persona-selector-container">
      <div className="persona-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {personas.map((persona) => {
          const isSelected = selectedIds.includes(persona.id);
          const Icon = getIcon(persona.icon);

          return (
            <div
              key={persona.id}
              className={`card persona-card ${isSelected ? "selected-card" : ""}`}
              style={{
                cursor: "pointer",
                border: isSelected ? "2px solid var(--accent, #6366F1)" : "1px solid var(--border)",
                background: isSelected ? "var(--bg-card-selected, rgba(99, 102, 241, 0.04))" : "var(--bg-card, #FFFFFF)",
                borderRadius: 8,
                padding: 16,
                transition: "all 0.2s ease",
                position: "relative",
              }}
              onClick={() => onTogglePersona(persona.id)}
            >
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "var(--accent, #6366F1)",
                    color: "#FFFFFF",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={14} />
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    background: isSelected ? "rgba(99, 102, 241, 0.15)" : "var(--bg-subtle, #F3F4F6)",
                    color: isSelected ? "var(--accent, #6366F1)" : "var(--text-muted)",
                  }}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{persona.name}</h3>
                  <span className="badge neutral" style={{ fontSize: 10, marginTop: 2 }}>
                    {persona.badge}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4, margin: "8px 0 12px" }}>
                {persona.roleDescription}
              </p>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                  PRIMARY FOCUS:
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: "var(--text-primary)" }}>
                  {persona.primaryFocus.slice(0, 3).map((f, i) => (
                    <li key={i} style={{ marginBottom: 2 }}>{f}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span className="badge" style={{ fontSize: 10, background: "rgba(16, 185, 129, 0.1)", color: "#059669" }}>
                  {persona.qualityGates.length} Quality Gates
                </span>
                <span className="badge" style={{ fontSize: 10, background: "rgba(239, 68, 68, 0.1)", color: "#DC2626" }}>
                  {persona.prohibitedActions.length} Prohibitions
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedIds.length > 1 && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            background: "rgba(99, 102, 241, 0.06)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Info size={16} color="var(--accent, #6366F1)" />
          <div style={{ fontSize: 12 }}>
            <strong>Multi-Persona Composition Active ({selectedIds.length} Personas):</strong> Responsibilities will be synthesized into a coherent, non-conflicting sequential lifecycle (Architecture Assessment ➔ Threat Verification ➔ Implementation Conventions ➔ Reliability Observability ➔ Verification Gates).
          </div>
        </div>
      )}
    </div>
  );
}
