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
import type { AppSettings } from "../../types";

export function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [extensionVersion] = useState<string>("");

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
    const next = { ...settings, ...patch };
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

  const resetDemo = async () => {
    setResetting(true);
    try {
      await sendRequest("app.resetDemoData");
      showToast("Demo data has been reset", "success");
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
    <div className="settings-section">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">General</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Checkbox
            label="Auto-save"
            description="Persist changes automatically as you edit skills, agents, and pipelines."
            checked={settings.autoSave}
            onChange={(v) => save({ autoSave: v })}
            disabled={saving}
          />
          <Checkbox
            label="Usage telemetry"
            description="Send anonymous usage events. No content or prompts are ever collected."
            checked={settings.telemetry}
            onChange={(v) => save({ telemetry: v })}
            disabled={saving}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Platform defaults</h2>
        </div>
        <Select
          label="Default export platform"
          value={settings.defaultPlatform}
          hint="Used when exporting skills and agents without an explicit target."
          options={[
            { value: "neutral", label: "Platform-neutral" },
            { value: "copilot", label: "GitHub Copilot" },
            { value: "claude", label: "Claude / Claude Code" },
            { value: "openai", label: "OpenAI API" },
          ]}
          onChange={(v) => save({ defaultPlatform: v as AppSettings["defaultPlatform"] })}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Workspace</h2>
        </div>
        <Input
          label="Startup page"
          value={settings.recentRoute}
          hint="The page shown when the workbench opens."
          disabled
        />
      </div>

      <div className="danger-zone">
        <div className="settings-row">
          <div className="settings-row-text">
            <span className="settings-row-title">Reset demo data</span>
            <span className="settings-row-desc">
              Restores the bundled sample skills, agents, pipelines, and execution history. Locally
              created records created through later modules will be removed.
            </span>
          </div>
          <Button variant="danger" onClick={() => setConfirmReset(true)} disabled={resetting}>
            Reset
          </Button>
        </div>
      </div>

      <div className="footer-note">
        AgentForge extension {extensionVersion || "0.1.0"} · Settings persist through VS Code's
        extension storage.
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        message="This restores the bundled sample records and discards local changes. This cannot be undone."
        confirmLabel="Reset data"
        danger
        busy={resetting}
        onConfirm={resetDemo}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
