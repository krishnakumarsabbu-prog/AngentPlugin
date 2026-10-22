import React, { useState } from "react";
import {
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Bot,
  Sparkles,
  UserCheck,
  GitBranch,
  PlayCircle,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import {
  NODE_DEFINITIONS,
  PALETTE_CATEGORIES,
  NodeDefinition,
} from "./nodeDefinitions";
import type { WorkflowNodeType } from "../../types";

interface NodePaletteProps {
  onAddNode?: (type: WorkflowNodeType) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({
  onAddNode,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [search, setSearch] = useState("");

  const allDefinitions = Object.values(NODE_DEFINITIONS).filter((d) => !d.label.includes("(Legacy)"));

  const filtered = allDefinitions.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.label.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    );
  });

  const onDragStart = (event: React.DragEvent, nodeType: WorkflowNodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  // Quick items when collapsed
  const quickTypes: { type: WorkflowNodeType; label: string; icon: LucideIcon }[] = [
    { type: "start", label: "Start", icon: PlayCircle },
    { type: "agent_execution", label: "Agent", icon: Bot },
    { type: "skill_invocation", label: "Skill", icon: Sparkles },
    { type: "human_approval", label: "Approval", icon: UserCheck },
    { type: "condition_branch", label: "Condition", icon: GitBranch },
    { type: "end", label: "End", icon: CheckCircle },
  ];

  if (isCollapsed) {
    return (
      <aside
        className="node-palette collapsed"
        aria-label="Node Palette (Collapsed)"
        style={{
          width: 48,
          background: "var(--surface, #FFFFFF)",
          borderRight: "1px solid var(--border, #E2E8F0)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px 0",
          gap: 12,
          flexShrink: 0,
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 5,
        }}
      >
        <button
          onClick={onToggleCollapse}
          className="btn-icon"
          style={{
            background: "var(--surface-alt, #F1F5F9)",
            border: "1px solid var(--border, #E2E8F0)",
            borderRadius: 6,
            cursor: "pointer",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-primary, #0F172A)",
            transition: "all 0.15s ease",
          }}
          title="Expand Node Palette (Alt+[)"
        >
          <PanelLeftOpen size={16} />
        </button>

        <div style={{ height: 1, width: 28, background: "var(--border, #E2E8F0)" }} />

        {/* Quick Icon Adders */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          {quickTypes.map((item) => {
            const Icon = item.icon;
            const def = NODE_DEFINITIONS[item.type];
            return (
              <button
                key={item.type}
                draggable
                onDragStart={(e) => onDragStart(e, item.type)}
                onClick={() => onAddNode && onAddNode(item.type)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: def?.bgLight || "#F8FAFC",
                  color: def?.color || "var(--text-primary)",
                  border: `1px solid ${def?.borderLight || "var(--border)"}`,
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                title={`Add ${item.label} node (Drag or click)`}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <div
          onClick={onToggleCollapse}
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-secondary, #64748B)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            userSelect: "none",
            padding: "8px 0",
          }}
          title="Click to expand palette"
        >
          Node Palette
        </div>
      </aside>
    );
  }

  return (
    <aside className="node-palette" aria-label="Node Palette">
      <div className="node-palette-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
              Node Palette
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--accent)",
                background: "#EFF6FF",
                padding: "1px 6px",
                borderRadius: 10,
              }}
            >
              {allDefinitions.length}
            </span>
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="btn-icon"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                borderRadius: 4,
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Minimize Node Palette"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <input
            type="text"
            className="node-palette-search"
            placeholder="Search nodes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search
            size={13}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-secondary)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      <div className="node-palette-content">
        {PALETTE_CATEGORIES.map((category) => {
          const itemsInCategory = filtered.filter((d) => d.category === category);
          if (itemsInCategory.length === 0) return null;

          return (
            <div key={category} className="palette-category">
              <div className="palette-category-title">{category}</div>
              <div className="palette-category-items">
                {itemsInCategory.map((item: NodeDefinition) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.type}
                      className="palette-item"
                      draggable
                      onDragStart={(e) => onDragStart(e, item.type)}
                      onClick={() => onAddNode && onAddNode(item.type)}
                      title={`${item.description} (Drag to canvas or click to add)`}
                    >
                      <div
                        className="palette-item-icon"
                        style={{
                          background: item.bgLight,
                          color: item.color,
                        }}
                      >
                        <Icon size={14} style={{ strokeWidth: 2.2 }} />
                      </div>
                      <div className="palette-item-text">
                        <span className="palette-item-label">{item.label}</span>
                        <span className="palette-item-desc">{item.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ padding: "24px 8px", textAlign: "center", color: "var(--text-secondary)", fontSize: 12 }}>
            No node types matching &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </aside>
  );
};
