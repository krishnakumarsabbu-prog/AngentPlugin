import React, { useRef } from "react";
import {
  Save,
  CheckCircle,
  Download,
  Upload,
  Play,
  Plus,
  List,
  Sparkles,
  History,
  GitCompareArrows,
  PackageCheck,
  FileText,
  ArrowLeft,
} from "lucide-react";
import type { Workflow } from "../../types";

interface WorkflowHeaderProps {
  workflow: Workflow;
  savedWorkflows: Workflow[];
  isDirty: boolean;
  isValidating: boolean;
  isSaving: boolean;
  onSave: () => void;
  onValidate: () => void;
  onExport: () => void;
  onImport: (content: string) => void;
  onNewWorkflow: () => void;
  onSwitchWorkflow: (id: string) => void;
  onToggleListView: () => void;
  onUpdateTitle: (name: string) => void;
  onRunWorkflow: () => void;
  onInstall?: () => void;
  isInstalling?: boolean;
  onRunFromMarkdown?: () => void;
  onNavigate?: (route: string) => void;
}

export const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  workflow,
  savedWorkflows,
  isDirty,
  isValidating,
  isSaving,
  onSave,
  onValidate,
  onExport,
  onImport,
  onNewWorkflow,
  onSwitchWorkflow,
  onToggleListView,
  onUpdateTitle,
  onRunWorkflow,
  onInstall,
  isInstalling,
  onRunFromMarkdown,
  onNavigate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) onImport(content);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const getStatusClass = (status: Workflow["status"]) => {
    switch (status) {
      case "Active":
        return "badge-status active";
      case "Ready":
        return "badge-status ready";
      default:
        return "badge-status draft";
    }
  };

  return (
    <header className="workflow-header" aria-label="Workflow Canvas Toolbar">
      <div className="workflow-header-left">
        <button
          className="btn secondary"
          style={{ padding: "5px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={onToggleListView}
          title="Return to Pipelines Dashboard"
        >
          <ArrowLeft size={13} />
          <span>Pipelines Dashboard</span>
        </button>

        {/* Switcher dropdown */}
        <select
          className="prop-select"
          style={{ width: "auto", minWidth: 160, fontSize: 12, padding: "4px 8px" }}
          value={workflow.id}
          onChange={(e) => onSwitchWorkflow(e.target.value)}
          aria-label="Switch active workflow"
        >
          {savedWorkflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.nodes?.length || 0} nodes)
            </option>
          ))}
        </select>

        {/* Editable Name */}
        <input
          className="workflow-title-input"
          value={workflow.name}
          onChange={(e) => onUpdateTitle(e.target.value)}
          title="Click to rename workflow"
          aria-label="Workflow title"
        />

        <span className={getStatusClass(workflow.status)}>{workflow.status}</span>
        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>v{workflow.version || "1.0.0"}</span>
      </div>

      <div className="workflow-header-actions">
        <button
          className="btn secondary"
          style={{ padding: "5px 10px", fontSize: 12 }}
          onClick={onNewWorkflow}
          title="Create a new workflow"
        >
          <Plus size={13} style={{ marginRight: 4 }} /> New
        </button>

        {/* Import file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button
          className="btn secondary"
          style={{ padding: "5px 10px", fontSize: 12 }}
          onClick={() => fileInputRef.current?.click()}
          title="Import workflow JSON"
        >
          <Upload size={13} style={{ marginRight: 4 }} /> Import
        </button>

        <button
          className="btn secondary"
          style={{ padding: "5px 10px", fontSize: 12 }}
          onClick={onExport}
          title="Export workflow JSON specification"
        >
          <Download size={13} style={{ marginRight: 4 }} /> Export
        </button>

        <button
          className="btn secondary"
          style={{ padding: "5px 10px", fontSize: 12 }}
          onClick={onValidate}
          disabled={isValidating}
          title="Validate graph DAG structure"
        >
          <CheckCircle size={13} style={{ marginRight: 4, color: "var(--accent)" }} />
          {isValidating ? "Validating…" : "Validate"}
        </button>

        <button
          className="btn primary"
          style={{ padding: "5px 12px", fontSize: 12 }}
          onClick={onSave}
          disabled={isSaving}
          title="Save workflow changes to repository"
        >
          <Save size={13} style={{ marginRight: 4 }} />
          {isSaving ? "Saving…" : isDirty ? "Save *" : "Saved"}
        </button>

        {onInstall && (
          <button
            className="btn secondary"
            style={{
              padding: "5px 12px",
              fontSize: 12,
              background: "#F5F3FF",
              borderColor: "#DDD6FE",
              color: "#6D28D9",
            }}
            onClick={onInstall}
            disabled={isInstalling}
            title="Install pipeline: creates pipeline.md with all ordered steps"
          >
            <PackageCheck size={13} style={{ marginRight: 4 }} />
            {isInstalling ? "Installing…" : "Install (pipeline.md)"}
          </button>
        )}

        {onRunFromMarkdown && (
          <button
            className="btn secondary"
            style={{
              padding: "5px 12px",
              fontSize: 12,
              background: "#EFF6FF",
              borderColor: "#BFDBFE",
              color: "#1D4ED8",
            }}
            onClick={onRunFromMarkdown}
            title="Select a pipeline.md and run pipeline in exact order"
          >
            <FileText size={13} style={{ marginRight: 4 }} /> Run from MD
          </button>
        )}

        <button
          className="btn secondary"
          style={{
            padding: "5px 12px",
            fontSize: 12,
            background: "#ECFDF5",
            borderColor: "#A7F3D0",
            color: "#065F46",
          }}
          onClick={onRunWorkflow}
          title="Run pipeline in AgentForge harness"
        >
          <Play size={12} style={{ marginRight: 4, fill: "#065F46" }} /> Run
        </button>

        {onNavigate && (
          <>
            <button
              className="btn secondary"
              style={{ padding: "5px 10px", fontSize: 12 }}
              onClick={() => onNavigate("execution-history")}
              title="View execution run history"
            >
              <History size={13} style={{ marginRight: 4 }} /> History
            </button>
            <button
              className="btn secondary"
              style={{ padding: "5px 10px", fontSize: 12 }}
              onClick={() => onNavigate("pipeline-comparison")}
              title="Compare workflow versions or execution records"
            >
              <GitCompareArrows size={13} style={{ marginRight: 4 }} /> Compare
            </button>
          </>
        )}
      </div>
    </header>
  );
};
