import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import type { Skill, PlatformCompatibility } from "../../../types";
import type { AgentBuilderFormState } from "./types";

interface SkillsSectionProps {
  state: AgentBuilderFormState;
  onChange: (patch: Partial<AgentBuilderFormState>) => void;
  availableSkills: Skill[];
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({
  state,
  onChange,
  availableSkills,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const skillMap = useMemo(() => {
    return new Map(availableSkills.map((s) => [s.id, s]));
  }, [availableSkills]);

  const filteredAvailableSkills = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return availableSkills.filter((s) => {
      if (state.assignedSkillIds.includes(s.id)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [availableSkills, state.assignedSkillIds, searchQuery]);

  const handleAssign = (skillId: string) => {
    if (!state.assignedSkillIds.includes(skillId)) {
      onChange({ assignedSkillIds: [...state.assignedSkillIds, skillId] });
    }
  };

  const handleRemove = (skillId: string) => {
    onChange({
      assignedSkillIds: state.assignedSkillIds.filter((id) => id !== skillId),
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const next = [...state.assignedSkillIds];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onChange({ assignedSkillIds: next });
  };

  const handleMoveDown = (index: number) => {
    if (index >= state.assignedSkillIds.length - 1) return;
    const next = [...state.assignedSkillIds];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onChange({ assignedSkillIds: next });
  };

  const checkPlatformIncompatibility = (skill: Skill | undefined): string | null => {
    if (!skill || !skill.compatibility || skill.compatibility.length === 0) return null;
    const agentPlatforms: PlatformCompatibility[] =
      state.compatibility.length > 0 ? state.compatibility : ["neutral"];
    if (skill.compatibility.includes("neutral") || agentPlatforms.includes("neutral")) {
      return null;
    }
    const overlap = agentPlatforms.filter((p) => skill.compatibility.includes(p));
    if (overlap.length === 0) {
      return `Supports [${skill.compatibility.join(", ")}], but agent targets [${agentPlatforms.join(", ")}].`;
    }
    return null;
  };

  return (
    <div className="card builder-section" id="section-skills">
      <div className="card-header">
        <div>
          <h2 className="card-title">3. Assigned Skills</h2>
          <p className="card-description">
            Attach reusable domain skills to enrich this agent's capabilities. Skills execute in sequential priority order.
          </p>
        </div>
      </div>

      {/* Currently Assigned Skills */}
      <div className="assigned-skills-container" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <label className="form-label" style={{ margin: 0 }}>
            Active Skills ({state.assignedSkillIds.length})
          </label>
          <span className="field-hint" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Use arrows to reorder execution priority
          </span>
        </div>

        {state.assignedSkillIds.length === 0 ? (
          <div
            style={{
              padding: "16px",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius)",
              textAlign: "center",
              color: "var(--text-secondary)",
              background: "var(--surface-alt)",
            }}
          >
            No skills currently assigned to this agent. Select from the available catalog below.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {state.assignedSkillIds.map((skillId, index) => {
              const skill = skillMap.get(skillId);
              const isMissing = !skill;
              const platformWarning = checkPlatformIncompatibility(skill);

              return (
                <div
                  key={skillId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 14px",
                    background: "var(--surface)",
                    border: isMissing
                      ? "1px solid var(--error)"
                      : platformWarning
                      ? "1px solid var(--warning)"
                      : "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-secondary)", minWidth: "20px" }}>
                    #{index + 1}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                        {skill ? skill.name : skillId}
                      </span>
                      <code style={{ fontSize: "11px", background: "var(--surface-alt)", padding: "1px 4px", borderRadius: "3px" }}>
                        {skillId}
                      </code>
                      {skill && (
                        <span className="badge" style={{ fontSize: "10px", padding: "1px 6px" }}>
                          {skill.category}
                        </span>
                      )}
                    </div>

                    {isMissing && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--error)", fontSize: "11px", marginTop: "4px" }}>
                        <AlertTriangle size={12} />
                        <span>Referenced skill does not exist in skill repository!</span>
                      </div>
                    )}

                    {platformWarning && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--warning)", fontSize: "11px", marginTop: "4px" }}>
                        <AlertTriangle size={12} />
                        <span>Platform incompatibility: {platformWarning}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost"
                      title="Move skill up"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost"
                      title="Move skill down"
                      disabled={index === state.assignedSkillIds.length - 1}
                      onClick={() => handleMoveDown(index)}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost"
                      title="Remove skill from agent"
                      onClick={() => handleRemove(skillId)}
                    >
                      <Trash2 size={14} style={{ color: "var(--error)" }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Skills Catalog */}
      <div className="available-skills-catalog" style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <h3 style={{ fontSize: "13px", fontWeight: 600, margin: 0 }}>Available Skills Catalog</h3>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              Search and add skills from the workspace
            </span>
          </div>

          <div style={{ position: "relative", width: "240px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: "30px", fontSize: "12px", height: "30px" }}
              placeholder="Filter skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredAvailableSkills.length === 0 ? (
          <div style={{ textAlign: "center", padding: "12px", color: "var(--text-secondary)", fontSize: "12px" }}>
            {searchQuery ? "No matching available skills found." : "All available skills are currently assigned."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
            {filteredAvailableSkills.map((skill) => (
              <div
                key={skill.id}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  background: "var(--surface-alt)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "6px",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--text-primary)" }}>{skill.name}</span>
                    <span className="badge" style={{ fontSize: "10px" }}>{skill.category}</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.3 }}>
                    {skill.description ? skill.description.slice(0, 80) + (skill.description.length > 80 ? "..." : "") : "No description provided."}
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <code style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{skill.id}</code>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ height: "24px", fontSize: "11px", padding: "0 8px" }}
                    onClick={() => handleAssign(skill.id)}
                  >
                    <Plus size={12} /> Assign
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
