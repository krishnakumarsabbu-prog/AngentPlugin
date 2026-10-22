import React, { useState, useMemo, useEffect } from "react";
import {
  Bot,
  Search,
  X,
  CheckCircle2,
  Sparkles,
  Shield,
  Layers,
  ArrowRight,
  Code2,
  Cpu,
} from "lucide-react";
import type { Agent, Skill } from "../../types";

export interface AgentSelectionModalProps {
  isOpen: boolean;
  currentAgentId?: string;
  availableAgents: Agent[];
  availableSkills: Skill[];
  onSelectAgent: (agent: Agent) => void;
  onClose: () => void;
}

export const AgentSelectionModal: React.FC<AgentSelectionModalProps> = ({
  isOpen,
  currentAgentId,
  availableAgents,
  availableSkills,
  onSelectAgent,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      if (currentAgentId && availableAgents.some((a) => a.id === currentAgentId)) {
        setSelectedAgentId(currentAgentId);
      } else if (availableAgents.length > 0) {
        setSelectedAgentId(availableAgents[0].id);
      }
    }
  }, [isOpen, currentAgentId, availableAgents]);

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableAgents;
    return availableAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        (a.objective && a.objective.toLowerCase().includes(q))
    );
  }, [availableAgents, search]);

  const selectedAgent = useMemo(() => {
    return availableAgents.find((a) => a.id === selectedAgentId) || null;
  }, [availableAgents, selectedAgentId]);

  const assignedSkills = useMemo(() => {
    if (!selectedAgent?.assignedSkillIds) return [];
    const set = new Set(selectedAgent.assignedSkillIds);
    return availableSkills.filter((s) => set.has(s.id));
  }, [selectedAgent, availableSkills]);

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
                background: "#EFF6FF",
                color: "var(--accent, #3B82F6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bot size={20} />
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
                Select Agent Worker
              </h2>
              <p
                style={{
                  fontSize: 12,
                  margin: "2px 0 0",
                  color: "var(--text-secondary, #64748B)",
                }}
              >
                Browse catalog, review agent mission, prompts, and skills, then assign to step.
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
          {/* LEFT PANEL: Agent List & Search */}
          <div
            style={{
              width: 340,
              borderRight: "1px solid var(--border, #E2E8F0)",
              display: "flex",
              flexDirection: "column",
              background: "var(--surface, #FFFFFF)",
            }}
          >
            {/* Search Input */}
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
                  placeholder="Search agents by role or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary, #64748B)",
                  marginTop: 6,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Available Agents ({filteredAgents.length})</span>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent, #3B82F6)",
                      cursor: "pointer",
                      fontSize: 11,
                      padding: 0,
                    }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
              {filteredAgents.map((agent) => {
                const isSelected = agent.id === selectedAgentId;
                const isCurrent = agent.id === currentAgentId;

                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      marginBottom: 6,
                      cursor: "pointer",
                      border: isSelected
                        ? "1.5px solid var(--accent, #3B82F6)"
                        : "1px solid var(--border, #E2E8F0)",
                      background: isSelected
                        ? "#EFF6FF"
                        : "var(--surface, #FFFFFF)",
                      transition: "all 0.12s ease",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: isSelected ? "#3B82F6" : "#F1F5F9",
                            color: isSelected ? "#FFFFFF" : "#475569",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Bot size={14} />
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
                            {agent.name}
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
                            {agent.role}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                        <span
                          className={`badge-status ${agent.status?.toLowerCase() || "ready"}`}
                          style={{ fontSize: 9, padding: "1px 5px" }}
                        >
                          {agent.status || "Ready"}
                        </span>
                        {isCurrent && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "var(--accent, #3B82F6)",
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

              {filteredAgents.length === 0 && (
                <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-secondary, #64748B)" }}>
                  <p style={{ margin: 0, fontSize: 13 }}>No agents match your search.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Agent Details & Preview */}
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
            {selectedAgent ? (
              <>
                {/* Agent Header Card */}
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
                        background: "#EFF6FF",
                        color: "var(--accent, #3B82F6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Bot size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: "var(--text-primary, #0F172A)" }}>
                        {selectedAgent.name}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent, #3B82F6)" }}>
                          {selectedAgent.role}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary, #64748B)" }}>•</span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary, #64748B)" }}>
                          v{selectedAgent.version || "1.0.0"}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary, #64748B)" }}>•</span>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-secondary, #64748B)" }}>
                          {selectedAgent.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className={`badge-status ${selectedAgent.status?.toLowerCase() || "ready"}`} style={{ fontSize: 11 }}>
                    {selectedAgent.status || "Ready"}
                  </span>
                </div>

                {/* Objective Callout */}
                {selectedAgent.objective && (
                  <div
                    style={{
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: 8,
                      padding: "12px 16px",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", marginBottom: 4 }}>
                      Primary Objective
                    </div>
                    <div style={{ fontSize: 13, color: "#14532D", lineHeight: 1.5 }}>
                      {selectedAgent.objective}
                    </div>
                  </div>
                )}

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
                    Role & Duty Description
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-primary, #0F172A)", lineHeight: 1.5 }}>
                    {selectedAgent.description || "No detailed description provided."}
                  </div>
                </div>

                {/* Assigned Skills */}
                <div
                  style={{
                    background: "var(--surface, #FFFFFF)",
                    border: "1px solid var(--border, #E2E8F0)",
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary, #64748B)", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={13} style={{ color: "#7C3AED" }} />
                    Assigned Skills ({assignedSkills.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {assignedSkills.map((skill) => (
                      <div
                        key={skill.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          background: "#F5F3FF",
                          border: "1px solid #DDD6FE",
                          borderRadius: 6,
                          fontSize: 11,
                          color: "#6D28D9",
                          fontWeight: 500,
                        }}
                        title={skill.description}
                      >
                        <Sparkles size={11} />
                        <span>{skill.name}</span>
                        <span style={{ fontSize: 10, color: "#8B5CF6", opacity: 0.8 }}>({skill.category})</span>
                      </div>
                    ))}
                    {assignedSkills.length === 0 && (
                      <span style={{ fontSize: 12, color: "var(--text-secondary, #64748B)", fontStyle: "italic" }}>
                        No specialized skills linked. Agent functions using core base instructions.
                      </span>
                    )}
                  </div>
                </div>

                {/* Platform Compatibility */}
                {selectedAgent.compatibility && selectedAgent.compatibility.length > 0 && (
                  <div
                    style={{
                      background: "var(--surface, #FFFFFF)",
                      border: "1px solid var(--border, #E2E8F0)",
                      borderRadius: 8,
                      padding: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary, #64748B)", textTransform: "uppercase" }}>
                      Compatible Platforms
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {selectedAgent.compatibility.map((p) => (
                        <span
                          key={p}
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            background: "#F1F5F9",
                            border: "1px solid #E2E8F0",
                            borderRadius: 4,
                            color: "#334155",
                            textTransform: "uppercase",
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* System Prompt Instructions Preview */}
                {selectedAgent.instructions && (
                  <div
                    style={{
                      background: "var(--surface, #FFFFFF)",
                      border: "1px solid var(--border, #E2E8F0)",
                      borderRadius: 8,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary, #64748B)", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <Code2 size={13} />
                      System Prompt / Persona Instructions
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: 10,
                        background: "#0F172A",
                        color: "#E2E8F0",
                        borderRadius: 6,
                        fontSize: 11,
                        fontFamily: "monospace",
                        maxHeight: 140,
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedAgent.instructions}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-secondary, #64748B)" }}>
                <Bot size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <h4 style={{ margin: "0 0 6px", fontSize: 14 }}>No Agent Selected</h4>
                <p style={{ margin: 0, fontSize: 12 }}>
                  Click an agent from the list on the left to read its full profile and assign it to this node.
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
            {selectedAgent ? (
              <span>
                Selected: <strong style={{ color: "var(--text-primary, #0F172A)" }}>{selectedAgent.name}</strong> ({selectedAgent.role})
              </span>
            ) : (
              <span>Please select an agent from the list.</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn secondary" onClick={onClose} style={{ fontSize: 12, padding: "6px 14px" }}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={!selectedAgent}
              onClick={() => {
                if (selectedAgent) {
                  onSelectAgent(selectedAgent);
                  onClose();
                }
              }}
              style={{ fontSize: 12, padding: "6px 16px" }}
            >
              <CheckCircle2 size={13} style={{ marginRight: 6 }} /> Assign Agent to Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
