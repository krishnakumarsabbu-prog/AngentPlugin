import React, { useState } from "react";
import { Plus, Trash2, Wrench, Shield, Check, Code } from "lucide-react";
import type { ToolDefinition } from "../../../types";
import type { AgentBuilderFormState } from "./types";

interface ToolsSectionProps {
  state: AgentBuilderFormState;
  onChange: (patch: Partial<AgentBuilderFormState>) => void;
  errors: Record<string, string>;
}

export const ToolsSection: React.FC<ToolsSectionProps> = ({
  state,
  onChange,
  errors,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const handleAddTool = () => {
    const newTool: ToolDefinition = {
      id: `tool-${state.toolDefinitions.length + 1}`,
      name: `Custom Tool ${state.toolDefinitions.length + 1}`,
      description: "Declarative function specification for agent invocation.",
      purpose: "Provide structured data extraction or analysis capability.",
      availability: "always",
      requiredPermissions: [],
      schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Query parameter" },
        },
        required: ["query"],
      },
    };
    onChange({
      toolDefinitions: [...state.toolDefinitions, newTool],
    });
    setExpandedIndex(state.toolDefinitions.length);
  };

  const handleRemoveTool = (index: number) => {
    onChange({
      toolDefinitions: state.toolDefinitions.filter((_, i) => i !== index),
    });
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const handleUpdateTool = (index: number, patch: Partial<ToolDefinition>) => {
    const next = [...state.toolDefinitions];
    next[index] = { ...next[index], ...patch };
    onChange({ toolDefinitions: next });
  };

  const handleTogglePermission = (index: number, perm: string) => {
    const tool = state.toolDefinitions[index];
    const currentPerms = tool.requiredPermissions || [];
    const updated = currentPerms.includes(perm)
      ? currentPerms.filter((p) => p !== perm)
      : [...currentPerms, perm];
    handleUpdateTool(index, { requiredPermissions: updated });
  };

  return (
    <div className="card builder-section" id="section-tools">
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 className="card-title">4. Declarative Tools</h2>
          <p className="card-description">
            Define functions and tool capabilities that the agent is allowed to invoke.
            Tools are declared declaratively with schemas and strict permission requirements.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleAddTool}
        >
          <Plus size={14} /> Add Tool
        </button>
      </div>

      <div style={{ marginBottom: "12px", padding: "10px 14px", background: "var(--surface-alt)", borderRadius: "var(--radius)", fontSize: "12px", color: "var(--text-secondary)" }}>
        <strong>Security Notice:</strong> AgentForge does not execute arbitrary shell commands or unsandboxed tools from the editor. Declared tools represent invocation contracts for downstream runner platforms.
      </div>

      {state.toolDefinitions.length === 0 ? (
        <div
          style={{
            padding: "24px",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius)",
            textAlign: "center",
            color: "var(--text-secondary)",
          }}
        >
          <Wrench size={24} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
          <p style={{ margin: "0 0 8px 0" }}>No declarative tools defined for this agent.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddTool}
          >
            <Plus size={14} /> Declare First Tool
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {state.toolDefinitions.map((tool, idx) => {
            const isExpanded = expandedIndex === idx;

            return (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  background: "var(--surface)",
                  overflow: "hidden",
                }}
              >
                {/* Tool Header */}
                <div
                  style={{
                    padding: "10px 14px",
                    background: isExpanded ? "var(--surface-alt)" : "var(--surface)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    borderBottom: isExpanded ? "1px solid var(--border)" : "none",
                  }}
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Wrench size={14} style={{ color: "var(--accent)" }} />
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {tool.name || "Untitled Tool"}
                    </span>
                    <code style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      {tool.id}
                    </code>
                    <span className="badge" style={{ fontSize: "10px" }}>
                      {tool.availability || "always"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost"
                      title="Delete tool"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTool(idx);
                      }}
                    >
                      <Trash2 size={14} style={{ color: "var(--error)" }} />
                    </button>
                  </div>
                </div>

                {/* Tool Details (Collapsible) */}
                {isExpanded && (
                  <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: "12px" }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "12px" }}>
                          Tool Name *
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={tool.name}
                          onChange={(e) => handleUpdateTool(idx, { name: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "12px" }}>
                          Tool ID * (lowercase, digits, hyphens)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={tool.id}
                          onChange={(e) =>
                            handleUpdateTool(idx, {
                              id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                            })
                          }
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: "12px" }}>
                          Availability
                        </label>
                        <select
                          className="input select"
                          value={tool.availability || "always"}
                          onChange={(e) =>
                            handleUpdateTool(idx, {
                              availability: e.target.value as ToolDefinition["availability"],
                            })
                          }
                        >
                          <option value="always">Always</option>
                          <option value="on-demand">On Demand</option>
                          <option value="conditional">Conditional</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "12px" }}>
                        Description
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Description of what this tool performs..."
                        value={tool.description}
                        onChange={(e) => handleUpdateTool(idx, { description: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "12px" }}>
                        Purpose / Strategic Goal
                      </label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Specific operational purpose or context when agent should pick this tool..."
                        value={tool.purpose || ""}
                        onChange={(e) => handleUpdateTool(idx, { purpose: e.target.value })}
                      />
                    </div>

                    {/* Required Permissions */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "12px" }}>
                        Required Permissions For This Tool
                      </label>
                      <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                        {["shell", "network", "write"].map((perm) => {
                          const checked = (tool.requiredPermissions || []).includes(perm);
                          return (
                            <label
                              key={perm}
                              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleTogglePermission(idx, perm)}
                              />
                              <span style={{ textTransform: "capitalize" }}>{perm}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tool Schema */}
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: "12px" }}>
                        Tool Parameters Schema (JSON Schema)
                      </label>
                      <textarea
                        className="input textarea"
                        rows={5}
                        style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}
                        value={JSON.stringify(tool.schema || { type: "object", properties: {} }, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            handleUpdateTool(idx, { schema: parsed });
                          } catch {
                            // allow typing
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
