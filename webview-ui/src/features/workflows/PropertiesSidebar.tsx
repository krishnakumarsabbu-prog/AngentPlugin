import React from "react";
import { Settings2, PanelRightClose, PanelRightOpen, Sliders } from "lucide-react";
import type { Workflow, WorkflowNode } from "../../types";
import { NodeConfigurationPanel } from "./NodeConfigurationPanel";

interface PropertiesSidebarProps {
  selectedNode: WorkflowNode | null;
  workflow: Workflow;
  onUpdateNode: (nodeId: string, patch: Partial<WorkflowNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateWorkflowMeta: (patch: Partial<Workflow>) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const PropertiesSidebar: React.FC<PropertiesSidebarProps> = ({
  selectedNode,
  workflow,
  onUpdateNode,
  onDeleteNode,
  onUpdateWorkflowMeta,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  if (isCollapsed) {
    return (
      <aside
        className="properties-sidebar collapsed"
        aria-label="Properties Sidebar (Collapsed)"
        style={{
          width: 48,
          background: "var(--surface, #FFFFFF)",
          borderLeft: "1px solid var(--border, #E2E8F0)",
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
          title="Expand Settings Panel (Alt+])"
        >
          <PanelRightOpen size={16} />
        </button>

        <div style={{ height: 1, width: 28, background: "var(--border, #E2E8F0)" }} />

        <div
          onClick={onToggleCollapse}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: "#EFF6FF",
            color: "var(--accent, #3B82F6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          title={selectedNode ? `Node: ${selectedNode.name}` : "Workflow Settings"}
        >
          {selectedNode ? <Sliders size={16} /> : <Settings2 size={16} />}
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
          title="Click to expand settings panel"
        >
          {selectedNode ? selectedNode.name : "Workflow Settings"}
        </div>
      </aside>
    );
  }

  if (selectedNode) {
    return (
      <aside className="properties-sidebar" aria-label="Properties Sidebar">
        <NodeConfigurationPanel
          node={selectedNode}
          allNodes={workflow.nodes}
          onUpdateNode={onUpdateNode}
          onDeleteNode={onDeleteNode}
          onClose={onToggleCollapse}
        />
      </aside>
    );
  }

  // Workflow Overview
  return (
    <aside className="properties-sidebar" aria-label="Workflow Properties">
      <div className="properties-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Settings2 size={15} style={{ color: "var(--accent)" }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
            Workflow Settings
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
            title="Minimize Settings Panel"
          >
            <PanelRightClose size={15} />
          </button>
        )}
      </div>

      <div className="properties-body">
        <div className="prop-field">
          <label className="prop-label" htmlFor="wf-prop-id">Workflow ID</label>
          <input
            id="wf-prop-id"
            className="prop-input"
            value={workflow.id}
            disabled
            style={{ background: "var(--surface-alt)", color: "var(--text-secondary)" }}
          />
        </div>

        <div className="prop-field">
          <label className="prop-label" htmlFor="wf-prop-name">Workflow Name</label>
          <input
            id="wf-prop-name"
            className="prop-input"
            value={workflow.name}
            onChange={(e) => onUpdateWorkflowMeta({ name: e.target.value })}
          />
        </div>

        <div className="prop-field">
          <label className="prop-label" htmlFor="wf-prop-desc">Description</label>
          <textarea
            id="wf-prop-desc"
            className="prop-textarea"
            value={workflow.description || ""}
            onChange={(e) => onUpdateWorkflowMeta({ description: e.target.value })}
            placeholder="High-level workflow purpose..."
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="prop-field">
            <label className="prop-label" htmlFor="wf-prop-ver">Version</label>
            <input
              id="wf-prop-ver"
              className="prop-input"
              value={workflow.version || "1.0.0"}
              onChange={(e) => onUpdateWorkflowMeta({ version: e.target.value })}
            />
          </div>
          <div className="prop-field">
            <label className="prop-label" htmlFor="wf-prop-status">Status</label>
            <select
              id="wf-prop-status"
              className="prop-select"
              value={workflow.status}
              onChange={(e) => onUpdateWorkflowMeta({ status: e.target.value as Workflow["status"] })}
            >
              <option value="Draft">Draft</option>
              <option value="Ready">Ready</option>
              <option value="Active">Active</option>
            </select>
          </div>
        </div>

        <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
          Execution Policy
        </div>

        <div className="prop-field">
          <label className="prop-label" htmlFor="wf-prop-parallel">Max Parallel Agents</label>
          <input
            id="wf-prop-parallel"
            type="number"
            min={1}
            max={8}
            className="prop-input"
            value={workflow.executionSettings?.maxParallelNodes ?? 2}
            onChange={(e) =>
              onUpdateWorkflowMeta({
                executionSettings: {
                  ...workflow.executionSettings,
                  maxParallelNodes: parseInt(e.target.value, 10) || 1,
                  retryPolicy: workflow.executionSettings?.retryPolicy || { maxRetries: 2, backoffSeconds: 5 },
                  requireApprovalFor: workflow.executionSettings?.requireApprovalFor || [],
                },
              })
            }
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="prop-field">
            <label className="prop-label" htmlFor="wf-prop-retries">Max Retries</label>
            <input
              id="wf-prop-retries"
              type="number"
              min={0}
              className="prop-input"
              value={workflow.executionSettings?.retryPolicy?.maxRetries ?? 2}
              onChange={(e) =>
                onUpdateWorkflowMeta({
                  executionSettings: {
                    ...workflow.executionSettings,
                    maxParallelNodes: workflow.executionSettings?.maxParallelNodes ?? 2,
                    requireApprovalFor: workflow.executionSettings?.requireApprovalFor || [],
                    retryPolicy: {
                      maxRetries: parseInt(e.target.value, 10) || 0,
                      backoffSeconds: workflow.executionSettings?.retryPolicy?.backoffSeconds ?? 5,
                    },
                  },
                })
              }
            />
          </div>
          <div className="prop-field">
            <label className="prop-label" htmlFor="wf-prop-backoff">Backoff (s)</label>
            <input
              id="wf-prop-backoff"
              type="number"
              min={1}
              className="prop-input"
              value={workflow.executionSettings?.retryPolicy?.backoffSeconds ?? 5}
              onChange={(e) =>
                onUpdateWorkflowMeta({
                  executionSettings: {
                    ...workflow.executionSettings,
                    maxParallelNodes: workflow.executionSettings?.maxParallelNodes ?? 2,
                    requireApprovalFor: workflow.executionSettings?.requireApprovalFor || [],
                    retryPolicy: {
                      maxRetries: workflow.executionSettings?.retryPolicy?.maxRetries ?? 2,
                      backoffSeconds: parseInt(e.target.value, 10) || 1,
                    },
                  },
                })
              }
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
