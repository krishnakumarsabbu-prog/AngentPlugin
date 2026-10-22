import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Save,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
  Eye,
  X,
  Layers,
  Shield,
  FileCode,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import type { Agent, Skill, AgentValidationReport } from "../../types";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs";
import { ValidationPanel } from "../../components/ValidationPanel";
import { Dialog } from "../../components/ui/Dialog";
import { getAgentsStore } from "../../services/agentsService";
import { getSkillsStore } from "../../services/skillsService";

import type { AgentBuilderFormState } from "./builder/types";
import {
  DEFAULT_BUILDER_STATE,
  agentToBuilderState,
  builderStateToAgent,
} from "./builder/types";

import { IdentitySection } from "./builder/IdentitySection";
import { MissionSection } from "./builder/MissionSection";
import { SkillsSection } from "./builder/SkillsSection";
import { ToolsSection } from "./builder/ToolsSection";
import { PermissionsSection } from "./builder/PermissionsSection";
import { InputsSection } from "./builder/InputsSection";
import { OutputsSection } from "./builder/OutputsSection";
import { CompatibilitySection } from "./builder/CompatibilitySection";
import { TestingSection } from "./builder/TestingSection";
import { VersioningSection } from "./builder/VersioningSection";
import { AgentPreviewModal } from "./builder/AgentPreviewModal";
import { AgentExportModal } from "./builder/AgentExportModal";

interface AgentFormPageProps {
  agentId: string | null;
  onNavigate: (route: string) => void;
  onAgentsChanged: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
  onDirtyChange: (dirty: boolean) => void;
}

const SECTION_TABS = [
  { id: "identity", label: "1. Identity" },
  { id: "mission", label: "2. Mission" },
  { id: "skills", label: "3. Skills" },
  { id: "tools", label: "4. Tools" },
  { id: "permissions", label: "5. Permissions" },
  { id: "inputs", label: "6. Inputs" },
  { id: "outputs", label: "7. Outputs" },
  { id: "compatibility", label: "8. Compatibility" },
  { id: "testing", label: "9. Testing" },
  { id: "versioning", label: "10. Versioning" },
];

export function AgentFormPage({
  agentId,
  onNavigate,
  onAgentsChanged,
  onToast,
  onDirtyChange,
}: AgentFormPageProps) {
  const isEditing = Boolean(agentId);
  const agentStore = useMemo(() => getAgentsStore(), []);
  const skillStore = useMemo(() => getSkillsStore(), []);

  const [form, setForm] = useState<AgentBuilderFormState>(DEFAULT_BUILDER_STATE);
  const [initialForm, setInitialForm] = useState<AgentBuilderFormState>(DEFAULT_BUILDER_STATE);
  const [activeTab, setActiveTab] = useState<string>("identity");

  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);

  const [validationReport, setValidationReport] = useState<AgentValidationReport | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);

  // Load agent data and skills
  useEffect(() => {
    let active = true;

    Promise.all([
      skillStore.list(),
      agentId ? agentStore.get(agentId) : Promise.resolve(null),
    ])
      .then(([skills, agent]) => {
        if (!active) return;
        setAvailableSkills(skills);

        if (agent) {
          const loaded = agentToBuilderState(agent);
          setForm(loaded);
          setInitialForm(loaded);
          setCreatedAt(agent.createdAt);
          setUpdatedAt(agent.updatedAt);
        } else {
          setForm(DEFAULT_BUILDER_STATE);
          setInitialForm(DEFAULT_BUILDER_STATE);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        onToast(err instanceof Error ? err.message : "Failed to load agent", "error");
        onNavigate("agent-studio");
      });

    return () => {
      active = false;
    };
  }, [agentId, agentStore, skillStore, onToast, onNavigate]);

  // Check dirty state
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const updateForm = (patch: Partial<AgentBuilderFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  // Run validation
  const handleValidate = async () => {
    setValidating(true);
    try {
      const agentPayload = builderStateToAgent(form);
      const report = await agentStore.validate(agentPayload, agentId || undefined);
      setValidationReport(report);

      const errorsMap: Record<string, string> = {};
      report.errors.forEach((e) => {
        errorsMap[e.field] = e.message;
      });
      setFieldErrors(errorsMap);

      if (report.valid) {
        onToast("Agent validation passed with 0 errors", "success");
      } else {
        onToast(`Validation found ${report.errors.length} error(s)`, "error");
      }
      return report;
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Validation failed", "error");
      return null;
    } finally {
      setValidating(false);
    }
  };

  // Save agent
  const handleSave = async () => {
    // Validate first
    const report = await handleValidate();
    if (report && !report.valid) {
      onToast(`Please fix ${report.errors.length} error(s) before saving.`, "error");
      return;
    }

    setSaving(true);
    try {
      const agentPayload = builderStateToAgent(form);

      if (isEditing && agentId) {
        await agentStore.update(agentId, agentPayload);
        onToast(`Agent "${form.name}" updated successfully.`, "success");
      } else {
        const created = await agentStore.create(agentPayload);
        onToast(`Agent "${created.name}" created successfully.`, "success");
      }

      setInitialForm(form);
      onDirtyChange(false);
      onAgentsChanged();
      onNavigate("agent-studio");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to save agent", "error");
    } finally {
      setSaving(false);
    }
  };

  // Duplicate current agent
  const handleDuplicate = async () => {
    if (!agentId) return;
    try {
      const copy = await agentStore.duplicate(agentId);
      onToast(`Duplicated as "${copy.name}".`, "success");
      onAgentsChanged();
      onNavigate(`agent-edit:${copy.id}`);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to duplicate agent", "error");
    }
  };

  // Cancel with discard guard
  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      onNavigate("agent-studio");
    }
  };

  if (loading) {
    return (
      <div className="view-container">
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
          Loading agent builder...
        </div>
      </div>
    );
  }

  return (
    <div className="view-container agent-builder-page">
      <Breadcrumbs
        items={[
          { label: "Dashboard", onClick: () => onNavigate("dashboard") },
          { label: "Agent Studio", onClick: () => onNavigate("agent-studio") },
          { label: isEditing ? `Edit: ${form.name || "Agent"}` : "Create Agent" },
        ]}
      />

      {/* Builder Header Bar */}
      <div
        className="builder-header-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          marginBottom: "16px",
          position: "sticky",
          top: "10px",
          zIndex: 50,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            className="btn btn-icon btn-ghost"
            title="Cancel and return"
            onClick={handleCancel}
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bot size={18} style={{ color: "var(--accent)" }} />
              <h1 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                {form.name || "Untitled Agent"}
              </h1>
              <span className="badge" style={{ fontSize: "11px" }}>
                v{form.version || "1.0.0"}
              </span>
              <span className={`badge badge-${form.status.toLowerCase()}`} style={{ fontSize: "11px" }}>
                {form.status}
              </span>
              {isDirty && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--warning)",
                    background: "rgba(180, 83, 9, 0.1)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  Unsaved Changes
                </span>
              )}
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              {isEditing ? `Agent ID: ${form.id}` : "Configuring new agent specification"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPreviewModal(true)}
            title="Preview generated agent configuration"
          >
            <Eye size={14} /> Preview
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleValidate}
            disabled={validating}
            title="Validate required fields and schemas"
          >
            <CheckCircle2 size={14} /> {validating ? "Validating..." : "Validate"}
          </button>

          {isEditing && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDuplicate}
              title="Duplicate this agent configuration"
            >
              <Copy size={14} /> Duplicate
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowExportModal(true)}
            title="Export agent configuration"
          >
            <Download size={14} /> Export
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={14} /> {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Agent"}
          </button>
        </div>
      </div>

      {/* Validation Panel if validated */}
      {validationReport && (
        <div style={{ marginBottom: "16px" }}>
          <ValidationPanel
            findings={[
              ...validationReport.errors,
              ...validationReport.warnings,
              ...validationReport.suggestions,
            ]}
            validated={true}
          />
        </div>
      )}

      {/* 10-Section Navigation Tabs */}
      <div
        className="builder-tabs"
        style={{
          display: "flex",
          gap: "4px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "4px",
          marginBottom: "16px",
          overflowX: "auto",
        }}
      >
        {SECTION_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              style={{
                border: "none",
                background: isActive ? "var(--accent)" : "transparent",
                color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                padding: "6px 12px",
                borderRadius: "var(--radius)",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
              onClick={() => {
                setActiveTab(tab.id);
                const el = document.getElementById(`section-${tab.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sections Stack */}
      <div className="builder-sections-stack" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* 1. Identity */}
        <IdentitySection
          state={form}
          onChange={updateForm}
          isEditing={isEditing}
          errors={fieldErrors}
        />

        {/* 2. Mission */}
        <MissionSection
          state={form}
          onChange={updateForm}
          errors={fieldErrors}
        />

        {/* 3. Skills */}
        <SkillsSection
          state={form}
          onChange={updateForm}
          availableSkills={availableSkills}
        />

        {/* 4. Tools */}
        <ToolsSection
          state={form}
          onChange={updateForm}
          errors={fieldErrors}
        />

        {/* 5. Permissions */}
        <PermissionsSection
          state={form}
          onChange={updateForm}
          errors={fieldErrors}
        />

        {/* 6. Inputs */}
        <InputsSection
          state={form}
          onChange={updateForm}
          errors={fieldErrors}
        />

        {/* 7. Outputs */}
        <OutputsSection
          state={form}
          onChange={updateForm}
          errors={fieldErrors}
        />

        {/* 8. Compatibility */}
        <CompatibilitySection
          state={form}
          onChange={updateForm}
          errors={fieldErrors}
        />

        {/* 9. Testing */}
        <TestingSection
          state={form}
          onChange={updateForm}
          errors={fieldErrors}
        />

        {/* 10. Versioning */}
        <VersioningSection
          state={form}
          onChange={updateForm}
          errors={fieldErrors}
          createdAt={createdAt}
          updatedAt={updatedAt}
        />
      </div>

      {/* Preview Modal */}
      <AgentPreviewModal
        state={form}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onToast={onToast}
      />

      {/* Export Modal */}
      <AgentExportModal
        state={form}
        agentId={agentId}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onToast={onToast}
      />

      {/* Discard Unsaved Changes Dialog */}
      <Dialog
        open={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        title="Discard Unsaved Changes?"
      >
        <p style={{ margin: "0 0 16px 0", color: "var(--text-secondary)", fontSize: "13px" }}>
          You have unsaved changes in this agent configuration. Navigating away will discard your edits. Are you sure you want to proceed?
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowDiscardDialog(false)}
          >
            Keep Editing
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              setShowDiscardDialog(false);
              onDirtyChange(false);
              onNavigate("agent-studio");
            }}
          >
            Discard Changes
          </button>
        </div>
      </Dialog>
    </div>
  );
}
