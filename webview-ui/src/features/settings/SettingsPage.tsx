import { useEffect, useState } from "react";
import { sendRequest } from "../../services/vscodeApi";
import { useToast } from "../../components/ui/Toast";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Checkbox } from "../../components/ui/Checkbox";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingState } from "../../components/ui/LoadingState";
import {
  Download,
  Upload,
  ShieldAlert,
  HardDrive,
  Sun,
  ShieldCheck,
  CheckCircle2,
  History,
  RotateCcw,
} from "lucide-react";
import type { AppSettings } from "../../types";
import { useTheme, THEMES, type Theme } from "../../services/ThemeContext";
import { SparkleIcon, LeafIcon, SunIcon } from "../../components/ui/Icons";

export function SettingsPage() {
  const { showToast } = useToast();
  const { theme: activeTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [extensionVersion] = useState<string>("0.1.0");

  const [importJsonText, setImportJsonText] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let active = true;
    sendRequest<AppSettings>("settings.get")
      .then((s) => {
        if (active) setSettings(s);
      })
      .catch((e: Error) => {
        if (active) setLoadError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async (patch: Partial<AppSettings>) => {
    if (!settings) return;
    const next: AppSettings = { ...settings, ...patch };
    setSettings(next);
    setSaving(true);
    try {
      const saved = await sendRequest<AppSettings>("settings.update", { settings: next });
      if (saved) setSettings(saved);
      showToast("Settings saved", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleExportWorkspace = async () => {
    try {
      let data: unknown;
      try {
        data = await sendRequest("settings.exportAll");
      } catch {
        data = {
          schemaVersion: settings?.schemaVersion ?? 1,
          exportedAt: new Date().toISOString(),
          settings,
        };
      }
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agentforge-workspace-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Workspace data exported", "success");
    } catch {
      showToast("Failed to export workspace data", "error");
    }
  };

  const handleImportWorkspace = async () => {
    if (!importJsonText.trim()) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(importJsonText);
      await sendRequest("settings.importAll", { data: parsed });
      showToast("Workspace data imported successfully", "success");
      setShowImportModal(false);
      setImportJsonText("");
      // Reload settings
      const reloaded = await sendRequest<AppSettings>("settings.get");
      if (reloaded) setSettings(reloaded);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Invalid import payload", "error");
    } finally {
      setImporting(false);
    }
  };

  const resetDemo = async () => {
    setResetting(true);
    try {
      await sendRequest("app.resetDemoData");
      showToast("Demo data has been reset", "success");
      const reloaded = await sendRequest<AppSettings>("settings.get");
      if (reloaded) setSettings(reloaded);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to reset demo data", "error");
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  if (loading) return <LoadingState label="Loading settings…" />;
  if (loadError || !settings) {
    return (
      <ErrorState
        title="Settings unavailable"
        text={loadError ?? "Settings could not be loaded."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="settings-section" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* General Settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">General Preferences</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Color Theme
            </label>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
              Choose a refined modern theme tailored for clarity, contrast, and visual delight.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {(Object.keys(THEMES) as Theme[]).map((key) => {
                const item = THEMES[key];
                const isSelected = activeTheme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setTheme(key);
                      showToast(`Switched theme to ${item.label}`, "success");
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: isSelected ? `2px solid ${item.primaryColor}` : "1px solid var(--border)",
                      background: item.bgColor,
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: isSelected ? `0 4px 14px ${item.primaryColor}26` : "var(--shadow-sm)",
                      transition: "all 0.2s cubic-bezier(0, 0, 0.2, 1)",
                      position: "relative",
                      transform: isSelected ? "translateY(-2px)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            backgroundColor: item.primaryColor,
                            boxShadow: `0 0 8px ${item.primaryColor}80`,
                          }}
                        />
                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                          {item.label}
                        </span>
                      </div>
                      {isSelected && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 10,
                            background: item.primaryColor,
                            color: "#ffffff",
                            fontWeight: 700,
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {item.sublabel}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Select
            label="Default Startup Page"
            value={settings.defaultStartPage || "dashboard"}
            hint="The initial view presented when AgentForge is opened."
            options={[
              { value: "dashboard", label: "Dashboard" },
              { value: "skills-studio", label: "Skills Studio" },
              { value: "agent-studio", label: "Agent Studio" },
              { value: "harness-pipeline", label: "Harness Pipeline" },
              { value: "execution-history", label: "Execution History" },
              { value: "test-evaluation", label: "Test & Evaluation" },
              { value: "pipeline-comparison", label: "Pipeline Comparison" },
              { value: "platform-integrations", label: "Platform Integrations" },
              { value: "package-manager", label: "Package Manager" },
              { value: "governance-audit", label: "Governance & Audit" },
              { value: "settings", label: "Settings" },
            ]}
            onChange={(v) => save({ defaultStartPage: v, recentRoute: v })}
          />

          <Checkbox
            label="Confirm destructive actions"
            description="Prompt for explicit confirmation before deleting skills, agents, workflows, or resetting state."
            checked={settings.confirmDestructiveActions ?? true}
            onChange={(v) => save({ confirmDestructiveActions: v })}
            disabled={saving}
          />

          <Checkbox
            label="Auto-save"
            description="Persist changes automatically as you edit skills, agents, and pipelines."
            checked={settings.autoSave}
            onChange={(v) => save({ autoSave: v })}
            disabled={saving}
          />

          <Checkbox
            label="Usage telemetry"
            description="Send anonymous usage events. Prompts, credentials, and code content are never collected."
            checked={settings.telemetry}
            onChange={(v) => save({ telemetry: v })}
            disabled={saving}
          />
        </div>
      </div>

      {/* Skill Export & Scope Preferences */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Skill & Platform Export Preferences</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Select
            label="Default Export Platform"
            value={settings.defaultPlatform}
            hint="Used when exporting skills and agents without an explicit target."
            options={[
              { value: "neutral", label: "Platform-neutral (Canonical Markdown & JSON)" },
              { value: "copilot", label: "GitHub Copilot (.github/copilot-instructions.md)" },
              { value: "claude", label: "Claude / Claude Code (.claude/config.json)" },
              { value: "openai", label: "OpenAI API (JSON Schema & Functions)" },
            ]}
            onChange={(v) => save({ defaultPlatform: v as AppSettings["defaultPlatform"] })}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select
              label="Skill Export Format"
              value={settings.skillExportPreferences?.format || "markdown"}
              hint="Preferred primary serialization format."
              options={[
                { value: "markdown", label: "Markdown (SKILL.md)" },
                { value: "json", label: "JSON (.agentforge.json)" },
                { value: "yaml", label: "YAML Manifest" },
              ]}
              onChange={(v) =>
                save({
                  skillExportPreferences: {
                    format: v as any,
                    includeMetadata: settings.skillExportPreferences?.includeMetadata ?? true,
                    prettyPrint: settings.skillExportPreferences?.prettyPrint ?? true,
                  },
                })
              }
            />

            <Select
              label="Default Installation Scope"
              value={settings.installationScope || "workspace"}
              hint="Where newly imported skills and packages are saved."
              options={[
                { value: "workspace", label: "Workspace Folder (.agents/)" },
                { value: "global", label: "Global User Storage" },
              ]}
              onChange={(v) => save({ installationScope: v as any })}
            />
          </div>

          <Checkbox
            label="Pretty-print exported JSON manifests"
            description="Format exported files with 2-space indentation."
            checked={settings.skillExportPreferences?.prettyPrint ?? true}
            onChange={(v) =>
              save({
                skillExportPreferences: {
                  format: settings.skillExportPreferences?.format || "markdown",
                  includeMetadata: settings.skillExportPreferences?.includeMetadata ?? true,
                  prettyPrint: v,
                },
              })
            }
          />
        </div>
      </div>

      {/* Agent Permission Defaults */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Agent Governance & Permission Defaults</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, color: "#475569" }}>
            Configure default permissions applied to newly authored agents. Least-privilege defaults protect against
            accidental host modifications.
          </div>

          <Select
            label="Default File System Access"
            value={settings.agentPermissionDefaults?.fileSystem || "readonly"}
            options={[
              { value: "readonly", label: "Read-only (Recommended: inspect files safely)" },
              { value: "readwrite", label: "Read & Write (Requires human approval gate)" },
              { value: "none", label: "None (Fully isolated memory)" },
            ]}
            onChange={(v) =>
              save({
                agentPermissionDefaults: {
                  fileSystem: v as any,
                  shell: settings.agentPermissionDefaults?.shell ?? false,
                  network: settings.agentPermissionDefaults?.network ?? false,
                  humanApprovalRequired: settings.agentPermissionDefaults?.humanApprovalRequired ?? true,
                },
              })
            }
          />

          <Checkbox
            label="Require Human Approval Gate by Default"
            description="Ensure any elevated file writes or tool actions require manual approval."
            checked={settings.agentPermissionDefaults?.humanApprovalRequired ?? true}
            onChange={(v) =>
              save({
                agentPermissionDefaults: {
                  fileSystem: settings.agentPermissionDefaults?.fileSystem || "readonly",
                  shell: settings.agentPermissionDefaults?.shell ?? false,
                  network: settings.agentPermissionDefaults?.network ?? false,
                  humanApprovalRequired: v,
                },
              })
            }
          />

          <Checkbox
            label="Allow Shell Execution by Default"
            description="Enable command execution. (Disabled by default for least privilege)."
            checked={settings.agentPermissionDefaults?.shell ?? false}
            onChange={(v) =>
              save({
                agentPermissionDefaults: {
                  fileSystem: settings.agentPermissionDefaults?.fileSystem || "readonly",
                  shell: v,
                  network: settings.agentPermissionDefaults?.network ?? false,
                  humanApprovalRequired: settings.agentPermissionDefaults?.humanApprovalRequired ?? true,
                },
              })
            }
          />
        </div>
      </div>

      {/* Pipeline Defaults */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Pipeline Simulation & Approval Defaults</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input
              label="Step Timeout (milliseconds)"
              value={String(settings.pipelineDefaults?.timeoutMs || 30000)}
              onChange={(val) =>
                save({
                  pipelineDefaults: {
                    timeoutMs: parseInt(val, 10) || 30000,
                    maxRetries: settings.pipelineDefaults?.maxRetries ?? 2,
                  },
                })
              }
            />

            <Input
              label="Max Retries per Step"
              value={String(settings.pipelineDefaults?.maxRetries ?? 2)}
              onChange={(val) =>
                save({
                  pipelineDefaults: {
                    timeoutMs: settings.pipelineDefaults?.timeoutMs || 30000,
                    maxRetries: parseInt(val, 10) || 0,
                  },
                })
              }
            />
          </div>

          <Checkbox
            label="Auto-pause at Human Approval gates"
            description="Simulation halts automatically whenever an approval gate node is reached."
            checked={settings.approvalPreferences?.autoPauseOnGate ?? true}
            onChange={(v) =>
              save({
                approvalPreferences: {
                  autoPauseOnGate: v,
                  requireNote: settings.approvalPreferences?.requireNote ?? false,
                },
              })
            }
          />
        </div>
      </div>

      {/* Storage & Data Management */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Storage & Workspace Backups</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <HardDrive size={18} color="#2563EB" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>
                Storage Location: {settings.storageLocation || ".agentforge/storage (Workspace)"}
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                Data persists through local extension storage with atomic file writing and backup preservation.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <Button
              variant="secondary"
              onClick={handleExportWorkspace}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Download size={14} /> Export All Workspace Data (JSON)
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowImportModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <Upload size={14} /> Import Workspace Data
            </Button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="danger-zone">
        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Reset Demo Data</span>
            <span className="settings-row-desc">
              Restores bundled sample skills, agents, pipelines, packages, and execution records.
              Requires confirmation.
            </span>
          </div>
          <Button variant="danger" onClick={() => setConfirmReset(true)} disabled={resetting}>
            Reset Data
          </Button>
        </div>
      </div>

      <div className="footer-note">
        AgentForge extension {extensionVersion} · Local VS Code Storage · No remote backend required.
      </div>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        message="This restores bundled sample records and resets your local workspace data. This action cannot be undone."
        confirmLabel="Reset data"
        danger
        busy={resetting}
        onConfirm={resetDemo}
        onCancel={() => setConfirmReset(false)}
      />

      {/* Import Modal */}
      {showImportModal && (
        <div className="dialog-overlay" onClick={() => setShowImportModal(false)}>
          <div className="dialog" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h2 className="dialog-title">Import Workspace Data</h2>
            </div>
            <div className="dialog-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: "#475569" }}>
                Paste the exported AgentForge workspace JSON payload to restore skills, agents, pipelines, and settings.
              </div>
              <textarea
                rows={8}
                placeholder="Paste workspace JSON here..."
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: 12,
                  padding: 8,
                  border: "1px solid #CBD5E1",
                  borderRadius: 6,
                }}
              />
            </div>
            <div className="dialog-footer">
              <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!importJsonText.trim() || importing}
                onClick={handleImportWorkspace}
              >
                {importing ? "Importing…" : "Import Data"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
