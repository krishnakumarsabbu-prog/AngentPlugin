import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Copy,
  Trash as Trash2,
  Bot,
  Shield,
  Layers,
  Wrench,
  FileCode2,
  Cpu,
  History,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Package,
  PackageCheck,
} from "lucide-react";
import type { Agent, Skill, PlatformCompatibility, AgentPlatformId, InstalledArtifact } from "../../types";
import { StatusBadge } from "../../components/StatusBadge";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { getAgentsStore, installAgent } from "../../services/agentsService";
import { getSkillsStore } from "../../services/skillsService";
import { AgentExportModal } from "./builder/AgentExportModal";
import { agentToBuilderState } from "./builder/types";
import { AgentCompatibilityPanel } from "./compatibility/AgentCompatibilityPanel";
import { AgentExportPreviewModal } from "./compatibility/AgentExportPreviewModal";
import { AgentPackagesDialog } from "./AgentPackagesDialog";

interface AgentDetailsPageProps {
  agentId: string;
  onNavigate: (route: string) => void;
  onAgentsChanged: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}

const PLATFORM_INFO: Record<PlatformCompatibility, { label: string; desc: string }> = {
  copilot: { label: "GitHub Copilot", desc: "Compatible with Copilot workspace & chat extensions" },
  claude: { label: "Claude / Claude Code", desc: "Compatible with Anthropic Claude system directives and tools" },
  openai: { label: "OpenAI API", desc: "Structured for OpenAI Assistant / Function calling format" },
  neutral: { label: "Platform Neutral", desc: "Generic prompt & tool definitions adaptable to any host" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AgentDetailsPage({
  agentId,
  onNavigate,
  onAgentsChanged,
  onToast,
}: AgentDetailsPageProps) {
  const agentStore = getAgentsStore();
  const skillStore = getSkillsStore();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<AgentPlatformId | null>(null);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [installations, setInstallations] = useState<InstalledArtifact[]>([]);

  const refreshInstallations = () => {
    agentStore.installations(agentId).then(setInstallations).catch(() => setInstallations([]));
  };

  useEffect(() => {
    let active = true;
    setAgent(null);
    setError(null);

    Promise.all([agentStore.get(agentId), skillStore.list()])
      .then(([agentData, allSkills]) => {
        if (!active) return;
        setAgent(agentData);
        setSkills(allSkills);
        agentStore.installations(agentId).then((inst) => {
          if (active) setInstallations(inst);
        }).catch(() => {});
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load agent");
      });

    return () => {
      active = false;
    };
  }, [agentId]);

  const assignedSkills = skills.filter((s) => agent?.assignedSkillIds?.includes(s.id));

  const handleDuplicate = async () => {
    if (!agent) return;
    try {
      const copy = await agentStore.duplicate(agent.id);
      onToast(`Duplicated "${agent.name}" as "${copy.name}"`, "success");
      onAgentsChanged();
      onNavigate(`agent-details:${copy.id}`);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to duplicate agent", "error");
    }
  };

  const [installing, setInstalling] = useState(false);

  const handleInstall = async (platform: "copilot" | "claude") => {
    if (!agent) return;
    setInstalling(true);
    try {
      await installAgent(agent.id, platform);
      const dest = platform === "copilot" ? ".github/agents" : ".claude/agents";
      onToast(`Installed "${agent.name}" & assigned skills to ${dest}!`, "success");
      refreshInstallations();
      onAgentsChanged();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Install failed", "error");
    } finally {
      setInstalling(false);
    }
  };

  const handleDelete = async () => {
    if (!agent) return;
    setBusy(true);
    try {
      await agentStore.remove(agent.id);
      onToast(`Deleted agent "${agent.name}"`, "success");
      onAgentsChanged();
      onNavigate("agent-studio");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to delete agent", "error");
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Agent Studio", onClick: () => onNavigate("agent-studio") },
            { label: "Agent Error" },
          ]}
        />
        <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--error)", marginTop: 16 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text-secondary)" }}>
        Loading agent details…
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Agent Studio", onClick: () => onNavigate("agent-studio") },
          { label: agent.name },
        ]}
      />

      {/* Page Header */}
      <div className="page-header" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 className="page-title" style={{ margin: 0 }}>
                {agent.name}
              </h1>
              <span className="badge neutral">v{agent.version}</span>
              <span className="badge info">{agent.role}</span>
              <StatusBadge status={agent.status} />
              {installations.length > 0 ? (
                <span className="badge success" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <PackageCheck size={11} /> Installed ({installations.length})
                </span>
              ) : (
                <span className="badge neutral" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Package size={11} /> Not installed
                </span>
              )}
            </div>
            <p className="page-subtitle" style={{ margin: 0 }}>
              {agent.description || "No description provided."}
            </p>
          </div>

          <div className="page-actions">
            <button className="btn secondary" onClick={() => onNavigate("agent-studio")}>
              <ArrowLeft size={14} /> Back
            </button>
            <button
              className="btn primary"
              onClick={() => handleInstall("copilot")}
              disabled={installing}
              title="Install agent and assigned skills to .github"
            >
              <Download size={14} /> Install to Copilot (.github)
            </button>
            <button
              className="btn secondary"
              onClick={() => handleInstall("claude")}
              disabled={installing}
              title="Install agent and assigned skills to .claude"
            >
              <Download size={14} /> Install to Claude (.claude)
            </button>
            <button className="btn secondary" onClick={() => setShowExport(true)}>
              <Download size={14} /> Export
            </button>
            <button className="btn secondary" onClick={() => setPackagesOpen(true)}>
              <Package size={14} /> Packages & Install
            </button>
            <button className="btn secondary" onClick={handleDuplicate}>
              <Copy size={14} /> Duplicate
            </button>
            <button className="btn primary" onClick={() => onNavigate(`agent-edit:${agent.id}`)}>
              <Pencil size={14} /> Edit Agent
            </button>
            <button className="btn secondary" style={{ color: "var(--error)" }} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Sample configuration disclaimer */}
      <div
        className="card"
        style={{
          marginBottom: 20,
          borderLeft: "4px solid var(--accent)",
          background: "var(--surface-alt)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Bot size={18} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>
              Sample Worker Configuration
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>
              This worker profile provides declarative prompt engineering, skill bindings, and policy guardrails. It is not an active background process. To run this agent in automated workflows, assemble it within a <strong>Harness Pipeline</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* Platform Compatibility Assessment Panel */}
      <AgentCompatibilityPanel
        agent={agent}
        onExportPlatform={(p) => setPreviewPlatform(p)}
        onInstallPlatform={handleInstall}
        onToast={onToast}
      />

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 20 }}>
        {/* Left Column: Role, Instructions, Assigned Skills, Tools */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Objective & Role */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px 0", color: "var(--text-primary)" }}>
              Objective & Role Scope
            </h2>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                PRIMARY OBJECTIVE
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                {agent.objective || "No objective defined."}
              </p>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                ROLE BOUNDARY
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.5 }}>
                Operating as <strong>{agent.role}</strong> within configured harness pipelines.
              </p>
            </div>
          </div>

          {/* Prompt Instructions */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px 0", color: "var(--text-primary)" }}>
              Prompt Directives & Instructions
            </h2>
            <div
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "12px 16px",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--text-primary)",
                whiteSpace: "pre-wrap",
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {agent.instructions || "No instructions provided."}
            </div>
          </div>

          {/* Assigned Skills */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={16} /> Assigned Skills ({assignedSkills.length})
              </h2>
              <button className="btn ghost" style={{ fontSize: 11 }} onClick={() => onNavigate("skills-studio")}>
                Explore Skills Studio
              </button>
            </div>

            {assignedSkills.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--text-secondary)", fontSize: 12, background: "var(--surface-alt)", borderRadius: "var(--radius)" }}>
                No skills currently assigned to this agent configuration. Edit the agent to bind domain skills.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {assignedSkills.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-alt)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                          {s.name}
                        </span>
                        <span className="badge neutral" style={{ fontSize: 10 }}>
                          v{s.version}
                        </span>
                        <span className="badge info" style={{ fontSize: 10 }}>
                          {s.category}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        {s.description}
                      </div>
                    </div>
                    <button
                      className="btn secondary"
                      style={{ fontSize: 11, padding: "4px 8px", flexShrink: 0 }}
                      onClick={() => onNavigate(`skill-details:${s.id}`)}
                    >
                      View Skill <ExternalLink size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Declared Tools */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Wrench size={16} /> Declared Tools ({agent.toolDefinitions?.length ?? 0})
            </h2>
            {agent.toolDefinitions && agent.toolDefinitions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {agent.toolDefinitions.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-alt)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {t.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: "center", color: "var(--text-secondary)", fontSize: 12, background: "var(--surface-alt)", borderRadius: "var(--radius)" }}>
                No custom tool definitions declared for this agent.
              </div>
            )}
          </div>

          {/* Input & Output Contracts */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <FileCode2 size={16} /> Input & Output Contracts
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  INPUT SCHEMA
                </div>
                <pre
                  style={{
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 10,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                    margin: 0,
                    overflowX: "auto",
                  }}
                >
                  {JSON.stringify(agent.inputSchema ?? { type: "object" }, null, 2)}
                </pre>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  OUTPUT SCHEMA
                </div>
                <pre
                  style={{
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 10,
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                    margin: 0,
                    overflowX: "auto",
                  }}
                >
                  {JSON.stringify(agent.outputSchema ?? { type: "object" }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Permissions, Platforms, Changelog, Metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Permission Policy Summary */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 14px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Shield size={16} /> Permission Guardrails
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Network Access:</span>
                <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  {agent.permissionPolicy?.network ? (
                    <span style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} /> Allowed
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                      <XCircle size={13} /> Disabled
                    </span>
                  )}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>File System:</span>
                <span className="badge neutral" style={{ fontSize: 11, textTransform: "capitalize" }}>
                  {agent.permissionPolicy?.fileSystem ?? "read"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Shell Execution:</span>
                <span style={{ fontWeight: 600 }}>
                  {agent.permissionPolicy?.shell ? (
                    <span style={{ color: "var(--warning)", display: "flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={13} /> Permitted
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                      <XCircle size={13} /> Denied
                    </span>
                  )}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Token Budget:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {(agent.permissionPolicy?.maxTokens ?? 8000).toLocaleString()} tokens
                </span>
              </div>
            </div>
          </div>

          {/* Platform Compatibility */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Cpu size={16} /> Platform Compatibility
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(agent.compatibility && agent.compatibility.length > 0
                ? agent.compatibility
                : (["copilot", "claude", "openai", "neutral"] as PlatformCompatibility[])
              ).map((p) => {
                const info = PLATFORM_INFO[p];
                return (
                  <div
                    key={p}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-alt)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text-primary)", marginBottom: 2 }}>
                      {info?.label ?? p}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {info?.desc ?? "Supported target environment"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Version & Changelog */}
          <div className="card">
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <History size={16} /> Version & Changelog
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span className="badge neutral">v{agent.version}</span>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                Updated {formatDate(agent.updatedAt)}
              </span>
            </div>
            <div
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: 10,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--text-secondary)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.5,
              }}
            >
              {agent.changelog || "No changelog entries recorded."}
            </div>
          </div>

          {/* Configuration Metadata */}
          <div className="card" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>Identifier:</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{agent.id}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>Created:</span>
              <span>{formatDate(agent.createdAt)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Last Modified:</span>
              <span>{formatDate(agent.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <ConfirmDialog
          open={true}
          title="Delete Agent Configuration"
          message={`Are you sure you want to permanently delete the agent configuration "${agent.name}"? This cannot be undone.`}
          confirmLabel={busy ? "Deleting…" : "Delete Agent"}
          danger={true}
          busy={busy}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Platform Export Preview modal */}
      {previewPlatform && agent && (
        <AgentExportPreviewModal
          agent={agent}
          initialPlatform={previewPlatform}
          isOpen={true}
          onClose={() => setPreviewPlatform(null)}
          onToast={onToast}
        />
      )}

      {/* Packages & Installation Modal */}
      <AgentPackagesDialog
        open={packagesOpen}
        agent={agent}
        onClose={() => {
          setPackagesOpen(false);
          refreshInstallations();
        }}
        onToast={onToast}
        onAgentsChanged={() => {
          onAgentsChanged();
          refreshInstallations();
        }}
      />
    </div>
  );
}
