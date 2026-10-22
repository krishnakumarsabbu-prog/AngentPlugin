import { useEffect, useState, type ReactNode } from "react";
import {
  Download,
  PackageCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileCode,
  Package,
  Layers,
  Copy,
} from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { getAgentsStore } from "../../services/agentsService";
import type {
  Agent,
  PlatformCompatibility,
  InstallScope,
  InstallTarget,
  InstalledArtifact,
  InstallPlanSummary,
  AgentExportFormat,
  AgentExportResult,
} from "../../types";

interface AgentPackagesDialogProps {
  open: boolean;
  agent: Agent | null;
  onClose: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
  onAgentsChanged?: () => void;
}

const PLATFORM_LABELS: Record<PlatformCompatibility, string> = {
  copilot: "GitHub Copilot (.github/agents)",
  claude: "Claude / Claude Code (.claude/agents)",
  openai: "OpenAI (.openai/agents)",
  neutral: "AgentForge Canonical (.agents/agents)",
};

const PLATFORM_OPTIONS: PlatformCompatibility[] = ["copilot", "claude", "openai", "neutral"];

type TabId = "install" | "export";

export function AgentPackagesDialog({
  open,
  agent,
  onClose,
  onToast,
  onAgentsChanged,
}: AgentPackagesDialogProps) {
  const [tab, setTab] = useState<TabId>("install");

  useEffect(() => {
    if (open) setTab("install");
  }, [open, agent?.id]);

  return (
    <Dialog
      open={open}
      title={agent ? `Agent Installation & Packages — ${agent.name}` : "Agent Installation"}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>Close</Button>
      }
    >
      <Tabs
        tabs={[
          { id: "install", label: "Install & Remove" },
          { id: "export", label: "Export Config" },
        ]}
        activeId={tab}
        onChange={(id: string) => setTab(id as TabId)}
      >
        {(active: string): ReactNode => {
          if (active === "install" && agent) {
            return <AgentInstallPanel agent={agent} onToast={onToast} onAgentsChanged={onAgentsChanged} />;
          }
          if (active === "export" && agent) {
            return <AgentExportPanel agent={agent} onToast={onToast} />;
          }
          return <div className="field-hint">Select an agent to configure installation.</div>;
        }}
      </Tabs>
    </Dialog>
  );
}

// ── Install & Remove ─────────────────────────────────────────────────────────

function AgentInstallPanel({
  agent,
  onToast,
  onAgentsChanged,
}: {
  agent: Agent;
  onToast: (m: string, t?: "success" | "error") => void;
  onAgentsChanged?: () => void;
}) {
  const store = getAgentsStore();
  const [platform, setPlatform] = useState<PlatformCompatibility>("copilot");
  const [scope, setScope] = useState<InstallScope>("workspace");
  const [targets, setTargets] = useState<{ scope: InstallScope; target: InstallTarget }[]>([]);
  const [plan, setPlan] = useState<InstallPlanSummary | null>(null);
  const [artifacts, setArtifacts] = useState<InstalledArtifact[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUninstall, setPendingUninstall] = useState<InstalledArtifact | null>(null);
  const [removeFromDisk, setRemoveFromDisk] = useState(true);

  const refreshArtifacts = async () => {
    try {
      const list = await store.installations(agent.id);
      setArtifacts(list);
    } catch {
      setArtifacts([]);
    }
  };

  const refreshTargets = async () => {
    try {
      const list = await store.installTargets(platform);
      setTargets(list);
      const hasScope = list.some((t) => t.scope === scope);
      if (!hasScope && list.length > 0) {
        setScope(list[0].scope);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load install targets");
    }
  };

  useEffect(() => {
    if (!agent) return;
    refreshArtifacts();
    refreshTargets();
    setPlan(null);
    setError(null);
  }, [agent.id, platform]);

  const target = targets.find((t) => t.scope === scope);

  const runPlan = async () => {
    setBusy(true);
    setError(null);
    setPlan(null);
    try {
      const p = await store.installPlan(agent.id, platform, scope);
      setPlan(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build install plan");
    } finally {
      setBusy(false);
    }
  };

  const runInstall = async () => {
    setBusy(true);
    setError(null);
    try {
      const artifact = await store.install(agent.id, platform, scope);
      onToast(
        artifact.simulated
          ? `Simulated install recorded for ${PLATFORM_LABELS[platform]} (${scope}). No files written.`
          : `Installed agent to ${PLATFORM_LABELS[platform]} (${scope}).`,
        "success",
      );
      setPlan(null);
      refreshArtifacts();
      onAgentsChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Install failed");
      onToast(e instanceof Error ? e.message : "Install failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const confirmUninstall = async () => {
    if (!pendingUninstall) return;
    setBusy(true);
    try {
      const result = await store.uninstall(agent.id, pendingUninstall.platform, pendingUninstall.scope, removeFromDisk);
      onToast(result.message, "success");
      setPendingUninstall(null);
      refreshArtifacts();
      onAgentsChanged?.();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Uninstall failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="section-list">
      {error && (
        <div className="card" style={{ padding: "8px 12px", color: "var(--error)", background: "var(--surface-alt)", borderLeft: "3px solid var(--error)" }}>
          {error}
        </div>
      )}

      {/* Target selection */}
      <section className="card" style={{ padding: 14 }}>
        <h3 className="card-title" style={{ margin: "0 0 10px 0", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <Package size={15} /> Select Target Platform & Scope
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label className="field-label">Target Platform</label>
            <select
              className="select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformCompatibility)}
              disabled={busy}
              style={{ width: "100%" }}
            >
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Scope</label>
            <select
              className="select"
              value={scope}
              onChange={(e) => setScope(e.target.value as InstallScope)}
              disabled={busy || targets.length === 0}
              style={{ width: "100%" }}
            >
              {targets.map((t) => (
                <option key={t.scope} value={t.scope}>
                  {t.scope === "workspace" ? "Workspace (current project)" : "User Home (~/)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {target && (
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-secondary)" }}>
            Destination directory: <code style={{ color: "var(--accent)", background: "var(--surface-alt)", padding: "2px 5px", borderRadius: 4 }}>{target.target.displayPath}</code>
          </div>
        )}

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={runPlan} disabled={busy || !target}>
            Inspect Plan
          </Button>
          <Button variant="primary" onClick={runInstall} disabled={busy || !target}>
            Install Agent
          </Button>
        </div>
      </section>

      {/* Plan Preview */}
      {plan && (
        <section className="card" style={{ padding: 14, borderLeft: plan.supported ? "3px solid var(--success)" : "3px solid var(--warning)" }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            {plan.supported ? <CheckCircle2 size={14} style={{ color: "var(--success)" }} /> : <AlertTriangle size={14} style={{ color: "var(--warning)" }} />}
            Install Plan: {plan.supported ? "Real Workspace Files" : "Simulated Preview"}
          </h4>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>
            Files to be written into <code>{plan.target.displayPath}</code>:
          </div>
          <ul style={{ margin: "0 0 10px 16px", padding: 0, fontSize: 12 }}>
            {plan.files.map((f) => (
              <li key={f} style={{ color: plan.existing.includes(f) ? "var(--warning)" : "var(--text-primary)" }}>
                {f} {plan.existing.includes(f) ? "(will overwrite existing file)" : "(new file)"}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Installed Artifacts */}
      <section className="card" style={{ padding: 14 }}>
        <h3 className="card-title" style={{ margin: "0 0 10px 0", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          <PackageCheck size={15} /> Active Installations ({artifacts.length})
        </h3>
        {artifacts.length === 0 ? (
          <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            This agent is not currently recorded as installed in any workspace or user target.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {artifacts.map((a, i) => (
              <div
                key={`${a.platform}-${a.scope}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "var(--surface-alt)",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {PLATFORM_LABELS[a.platform] || a.platform} ({a.scope})
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    Files: {a.files.join(", ")} &bull; Installed: {new Date(a.installedAt).toLocaleDateString()}
                    {a.simulated ? " (simulated)" : " (on disk)"}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPendingUninstall(a)}
                  disabled={busy}
                  style={{ color: "var(--error)" }}
                >
                  <Trash2 size={12} /> Uninstall
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Uninstall confirmation */}
      {pendingUninstall && (
        <div className="card" style={{ padding: 14, borderLeft: "3px solid var(--error)", background: "var(--surface-alt)" }}>
          <h4 style={{ margin: "0 0 6px 0", color: "var(--error)", fontSize: 13 }}>
            Confirm Uninstall from {pendingUninstall.platform} ({pendingUninstall.scope})?
          </h4>
          <p style={{ margin: "0 0 10px 0", fontSize: 12 }}>
            This will remove the AgentForge installation record.
          </p>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={removeFromDisk}
              onChange={(e) => setRemoveFromDisk(e.target.checked)}
            />
            Also delete the installed file(s) from workspace disk
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="danger" size="sm" onClick={confirmUninstall} disabled={busy}>
              Confirm Uninstall
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPendingUninstall(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Export Panel ─────────────────────────────────────────────────────────────

function AgentExportPanel({
  agent,
  onToast,
}: {
  agent: Agent;
  onToast: (m: string, t?: "success" | "error") => void;
}) {
  const store = getAgentsStore();
  const [format, setFormat] = useState<AgentExportFormat>("agent-spec");
  const [result, setResult] = useState<AgentExportResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    setBusy(true);
    store
      .exportAgent(format, agent, agent.id)
      .then((res) => {
        if (!active) return;
        setResult(res);
      })
      .catch((e) => {
        if (!active) return;
        onToast(e instanceof Error ? e.message : "Failed to generate export", "error");
      })
      .finally(() => {
        if (active) setBusy(false);
      });

    return () => {
      active = false;
    };
  }, [format, agent]);

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.content);
    onToast(`Copied ${result.fileName} to clipboard!`, "success");
  };

  const downloadFile = () => {
    if (!result) return;
    const blob = new Blob([result.content], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Downloaded ${result.fileName}`, "success");
  };

  return (
    <div className="section-list">
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <label className="field-label" style={{ margin: 0 }}>Format:</label>
        <select
          className="select"
          value={format}
          onChange={(e) => setFormat(e.target.value as AgentExportFormat)}
          style={{ flex: 1 }}
        >
          <option value="agent-spec">AgentForge Canonical Specification (JSON)</option>
          <option value="copilot-instructions">GitHub Copilot (.github/copilot-instructions.md)</option>
          <option value="claude-subagent">Claude Subagent Prompt (Markdown)</option>
          <option value="openai-assistant">OpenAI Assistant Schema (JSON)</option>
        </select>
      </div>

      {result && (
        <section className="card" style={{ padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{result.fileName}</span>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{result.description}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant="secondary" size="sm" onClick={copyToClipboard}>
                <Copy size={12} /> Copy
              </Button>
              <Button variant="secondary" size="sm" onClick={downloadFile}>
                <Download size={12} /> Download
              </Button>
            </div>
          </div>
          <pre
            style={{
              maxHeight: 280,
              overflow: "auto",
              padding: 10,
              background: "var(--surface-alt)",
              borderRadius: 6,
              border: "1px solid var(--border)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          >
            {result.content}
          </pre>
        </section>
      )}
    </div>
  );
}
