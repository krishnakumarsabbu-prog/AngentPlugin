import React, { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  Search,
  X,
  CheckCircle2,
  FileCode,
  Tag,
  Layers,
  BookOpen,
  Wrench,
} from "lucide-react";
import type { Skill } from "../../types";

export interface SkillSelectionModalProps {
  isOpen: boolean;
  currentSkillId?: string;
  availableSkills: Skill[];
  onSelectSkill: (skill: Skill) => void;
  onClose: () => void;
}

export const SkillSelectionModal: React.FC<SkillSelectionModalProps> = ({
  isOpen,
  currentSkillId,
  availableSkills,
  onSelectSkill,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      if (currentSkillId && availableSkills.some((s) => s.id === currentSkillId)) {
        setSelectedSkillId(currentSkillId);
      } else if (availableSkills.length > 0) {
        setSelectedSkillId(availableSkills[0].id);
      }
    }
  }, [isOpen, currentSkillId, availableSkills]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of availableSkills) {
      if (s.category) set.add(s.category);
    }
    return ["All", ...Array.from(set)];
  }, [availableSkills]);

  const filteredSkills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableSkills.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.tags && s.tags.some((t) => t.toLowerCase().includes(q)));
      const matchesCat = categoryFilter === "All" || s.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [availableSkills, search, categoryFilter]);

  const selectedSkill = useMemo(() => {
    return availableSkills.find((s) => s.id === selectedSkillId) || null;
  }, [availableSkills, selectedSkillId]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="modal-container"
        style={{
          width: "90vw",
          maxWidth: 960,
          height: "82vh",
          maxHeight: 740,
          backgroundColor: "var(--surface, #FFFFFF)",
          border: "1px solid var(--border, #E2E8F0)",
          borderRadius: "var(--radius-lg, 12px)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border, #E2E8F0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface-alt, #F8FAFC)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "#F5F3FF",
                color: "#7C3AED",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary, #0F172A)",
                }}
              >
                Select Reusable Skill
              </h2>
              <p
                style={{
                  fontSize: 12,
                  margin: "2px 0 0",
                  color: "var(--text-secondary, #64748B)",
                }}
              >
                Browse catalog of enterprise skills, read documentation and schemas, then assign to step.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 6,
              color: "var(--text-secondary, #64748B)",
              borderRadius: 6,
            }}
            title="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content: 2-Panel Layout */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* LEFT PANEL: Skill List & Search */}
          <div
            style={{
              width: 340,
              borderRight: "1px solid var(--border, #E2E8F0)",
              display: "flex",
              flexDirection: "column",
              background: "var(--surface, #FFFFFF)",
            }}
          >
            {/* Search Input & Category Pills */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border, #E2E8F0)" }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-secondary, #64748B)",
                  }}
                />
                <input
                  type="text"
                  className="prop-input"
                  style={{
                    paddingLeft: 32,
                    fontSize: 12,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  placeholder="Search skills by name, tag, or duty..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Category Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      border: "none",
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: categoryFilter === cat ? 700 : 500,
                      cursor: "pointer",
                      background: categoryFilter === cat ? "#7C3AED" : "#F1F5F9",
                      color: categoryFilter === cat ? "#FFFFFF" : "#475569",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {filteredSkills.map((skill) => {
                const isSelected = skill.id === selectedSkillId;
                const isCurrent = skill.id === currentSkillId;

                return (
                  <div
                    key={skill.id}
                    onClick={() => setSelectedSkillId(skill.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      marginBottom: 6,
                      cursor: "pointer",
                      border: isSelected
                        ? "1.5px solid #7C3AED"
                        : "1px solid var(--border, #E2E8F0)",
                      background: isSelected
                        ? "#F5F3FF"
                        : "var(--surface, #FFFFFF)",
                      transition: "all 0.12s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: isSelected ? "#7C3AED" : "#F1F5F9",
                            color: isSelected ? "#FFFFFF" : "#6D28D9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Sparkles size={14} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: isSelected ? 700 : 600,
                              color: "var(--text-primary, #0F172A)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {skill.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-secondary, #64748B)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {skill.category}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                        <span
                          className={`badge-status ${skill.status?.toLowerCase() || "ready"}`}
                          style={{ fontSize: 9, padding: "1px 5px" }}
                        >
                          {skill.status || "Ready"}
                        </span>
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#7C3AED",
                            }}
                          >
                            Assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredSkills.length === 0 && (
                <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-secondary, #64748B)" }}>
                  <p style={{ margin: 0, fontSize: 13 }}>No skills match your search.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Skill Details & Preview */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              background: "var(--surface-alt, #FAFAFA)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {selectedSkill ? (
              <>
                {/* Header Card */}
                <div
                  style={{
                    background: "var(--surface, #FFFFFF)",
                    border: "1px solid var(--border, #E2E8F0)",
                    borderRadius: 8,
                    padding: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: "#F5F3FF",
                        color: "#7C3AED",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--text-primary, #0F172A)" }}>
                        {selectedSkill.name}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED" }}>
                          {selectedSkill.category}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary, #64748B)" }}>•</span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary, #64748B)" }}>
                          v{selectedSkill.version || "1.0.0"}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary, #64748B)" }}>•</span>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-secondary, #64748B)" }}>
                          {selectedSkill.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className={`badge-status ${selectedSkill.status?.toLowerCase() || "ready"}`} style={{ fontSize: 11 }}>
                    {selectedSkill.status || "Ready"}
                  </span>
                </div>

                {/* Description */}
                <div
                  style={{
                    background: "var(--surface, #FFFFFF)",
                    border: "1px solid var(--border, #E2E8F0)",
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary, #64748B)", textTransform: "uppercase", marginBottom: 6 }}>
                    Skill Duty & Purpose
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-primary, #0F172A)", lineHeight: 1.5 }}>
                    {selectedSkill.description || "No description provided."}
                  </div>
                </div>

                {/* Resources & Bundled Files */}
                {selectedSkill.resources && selectedSkill.resources.length > 0 && (
                  <div
                    style={{
                      background: "var(--surface, #FFFFFF)",
                      border: "1px solid var(--border, #E2E8F0)",
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary, #64748B)", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <FileCode size={13} style={{ color: "var(--accent, #3B82F6)" }} />
                      Bundled Scripts & Documents ({selectedSkill.resources.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {selectedSkill.resources.map((res) => (
                        <div
                          key={res.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            background: "var(--surface-alt, #F8FAFC)",
                            border: "1px solid var(--border, #E2E8F0)",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "var(--text-primary, #0F172A)" }}>{res.name}</span>
                          <span style={{ fontSize: 10, color: "var(--text-secondary, #64748B)", textTransform: "uppercase" }}>{res.kind}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedSkill.tags && selectedSkill.tags.length > 0 && (
                  <div
                    style={{
                      background: "var(--surface, #FFFFFF)",
                      border: "1px solid var(--border, #E2E8F0)",
                      borderRadius: 8,
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary, #64748B)", textTransform: "uppercase" }}>
                      Tags:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {selectedSkill.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            background: "#F1F5F9",
                            borderRadius: 4,
                            color: "#475569",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-secondary, #64748B)" }}>
                <Sparkles size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <h4 style={{ margin: "0 0 6px", fontSize: 14 }}>No Skill Selected</h4>
                <p style={{ margin: 0, fontSize: 12 }}>
                  Click a skill from the list on the left to read its full details and assign it to this node.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border, #E2E8F0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface, #FFFFFF)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-secondary, #64748B)" }}>
            {selectedSkill ? (
              <span>
                Selected: <strong style={{ color: "var(--text-primary, #0F172A)" }}>{selectedSkill.name}</strong> ({selectedSkill.category})
              </span>
            ) : (
              <span>Please select a skill from the list.</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn secondary" onClick={onClose} style={{ fontSize: 12, padding: "6px 14px" }}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={!selectedSkill}
              onClick={() => {
                if (selectedSkill) {
                  onSelectSkill(selectedSkill);
                  onClose();
                }
              }}
              style={{ fontSize: 12, padding: "6px 16px", background: "#7C3AED", borderColor: "#6D28D9" }}
            >
              <CheckCircle2 size={13} style={{ marginRight: 6 }} /> Assign Skill to Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
