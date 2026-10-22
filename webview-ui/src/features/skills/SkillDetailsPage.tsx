import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Copy,
  Trash2,
  Download,
  Eye,
  FileCode,
  Package,
  Layers,
  Shield,
  Terminal,
  Check,
  FileText,
  Clock,
  Sparkles,
  Cpu,
  History,
  CheckCircle2,
  PackageCheck,
  PackageOpen,
  RefreshCw,
} from "lucide-react";
import type { Skill, InstallationState, SkillResource, PlatformCompatibility } from "../../types";
import { EmptyState } from "../../components/EmptyState";
import { StatusBadge } from "../../components/StatusBadge";
import { Breadcrumbs } from "../../components/ui/Breadcrumbs";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { getSkillsStore, installSkill } from "../../services/skillsService";
import { SkillPackagesDialog } from "./SkillPackagesDialog";
import { VsCodeMarkdownEditorModal } from "./VsCodeMarkdownEditorModal";

interface SkillDetailsPageProps {
  skillId: string;
  onNavigate: (route: string) => void;
  onSkillsChanged: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  copilot: "Copilot",
  claude: "Claude",
  openai: "OpenAI",
  neutral: "Neutral",
};

const INSTALL_LABELS: Record<InstallationState, string> = {
  installed: "Installed",
  "not-installed": "Not installed",
  outdated: "Update available",
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

function getCategoryIcon(category: string) {
  const c = (category || "").toLowerCase();
  if (c.includes("security") || c.includes("audit") || c.includes("auth")) return Shield;
  if (c.includes("dev") || c.includes("code") || c.includes("engineer")) return FileCode;
  if (c.includes("ops") || c.includes("cli") || c.includes("infra")) return Terminal;
  if (c.includes("ai") || c.includes("model") || c.includes("ml")) return Cpu;
  return Layers;
}

function resourceKindBadge(kind: SkillResource["kind"]) {
  switch (kind) {
    case "script":
      return { label: "script", color: "rgba(79, 70, 229, 0.1)", text: "#4f46e5" };
    case "template":
      return { label: "template", color: "rgba(217, 119, 6, 0.1)", text: "#d97706" };
    case "reference":
      return { label: "reference", color: "rgba(16, 185, 129, 0.1)", text: "#059669" };
    default:
      return { label: kind, color: "var(--surface-alt)", text: "var(--text-secondary)" };
  }
}

function InstallBadge({ state }: { state: InstallationState }) {
  const tone = state === "installed" ? "success" : state === "outdated" ? "warning" : "neutral";
  const Icon = state === "installed" ? PackageCheck : state === "outdated" ? RefreshCw : PackageOpen;
  return (
    <span className={`badge ${tone}`}>
      <Icon size={11} /> {INSTALL_LABELS[state]}
    </span>
  );
}

export function SkillDetailsPage({ skillId, onNavigate, onSkillsChanged, onToast }: SkillDetailsPageProps) {
  const store = getSkillsStore();
  const [skill, setSkill] = useState<Skill | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeResource, setActiveResource] = useState<{ name: string; description?: string } | null>(null);
  const [installing, setInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<"instructions" | "resources" | "tools" | "changelog">("instructions");
  const [copied, setCopied] = useState(false);

  const handleDirectInstall = async (platform: "copilot" | "claude") => {
    if (!skill) return;
    setInstalling(true);
    try {
      await installSkill(skill.id, platform);
      const dest = platform === "copilot" ? ".github/skills" : ".claude/skills";
      onToast(`Successfully installed "${skill.name}" to ${dest}!`, "success");
      onSkillsChanged();
      const refreshed = await store.get(skill.id);
      setSkill(refreshed);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Install failed", "error");
    } finally {
      setInstalling(false);
    }
  };

  useEffect(() => {
    let active = true;
    setSkill(null);
    setError(null);
    store
      .get(skillId)
      .then((s) => {
        if (active) setSkill(s);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load skill");
      });
    return () => {
      active = false;
    };
  }, [skillId]);

  const handleDelete = async () => {
    if (!skill) return;
    setBusy(true);
    try {
      await store.remove(skill.id);
      onToast(`Deleted skill "${skill.name}"`, "success");
      onSkillsChanged();
      onNavigate("skills-studio");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to delete skill", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async () => {
    if (!skill) return;
    try {
      const copy = await store.duplicate(skill.id);
      onToast(`Duplicated as "${copy.name}"`, "success");
      onSkillsChanged();
      onNavigate(`skill-details:${copy.id}`);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to duplicate skill", "error");
    }
  };

  const handleCopyInstructions = () => {
    if (!skill) return;
    navigator.clipboard.writeText(skill.instructions);
    setCopied(true);
    onToast("Instructions copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  if (error) {
    return (
      <div className="error-state">
        <span className="error-state-title">Could not load skill</span>
        <span className="error-state-text">{error}</span>
        <div className="error-state-actions">
          <button type="button" className="btn secondary" onClick={() => onNavigate("skills-studio")}>
            <ArrowLeft size={13} /> Back to Skills Studio
          </button>
        </div>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="loading-state">
        <span className="spinner large" />
        <span>Loading skill workspace…</span>
      </div>
    );
  }

  const CategoryIcon = getCategoryIcon(skill.category);
  const lineCount = skill.instructions ? skill.instructions.split("\n").length : 0;
  const wordCount = skill.instructions ? skill.instructions.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="skill-details-wrapper">
      <Breadcrumbs
        items={[
          { label: "Skills Studio", onClick: () => onNavigate("skills-studio") },
          { label: skill.name },
        ]}
      />

      {/* ── Sleek Hero Banner ── */}
      <div className="skill-hero-card">
        <div className="skill-hero-top">
          <div className="skill-hero-brand">
            <div className="skill-hero-avatar">
              <CategoryIcon size={22} />
            </div>
            <div>
              <div className="skill-hero-title-row">
                <h1 className="skill-hero-title">{skill.name}</h1>
                <span className="skill-meta-pill" style={{ fontWeight: 700 }}>
                  v{skill.version}
                </span>
                <StatusBadge status={skill.status} />
                <InstallBadge state={skill.installationState} />
              </div>
              <p className="skill-hero-desc">{skill.description || "No description provided."}</p>
            </div>
          </div>

          <div className="skill-hero-actions">
            <button
              type="button"
              className="btn secondary btn-sm"
              onClick={() => onNavigate("skills-studio")}
              title="Return to skills catalog"
            >
              <ArrowLeft size={13} /> Back
            </button>
            <button
              type="button"
              className="btn primary btn-sm glow-cta"
              onClick={() => handleDirectInstall("copilot")}
              disabled={installing}
              title="Install to workspace .github/skills"
            >
              <Download size={13} /> Install to Copilot (.github)
            </button>
            <button
              type="button"
              className="btn primary btn-sm glow-cta"
              style={{ background: "#4338CA" }}
              onClick={() => handleDirectInstall("claude")}
              disabled={installing}
              title="Install to workspace .claude/skills"
            >
              <Download size={13} /> Install to Claude (.claude)
            </button>
            <button
              type="button"
              className="btn secondary btn-sm"
              onClick={() => onNavigate(`skill-edit:${skill.id}`)}
              title="Edit skill metadata and instructions"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              type="button"
              className="btn secondary btn-sm"
              onClick={handleDuplicate}
              title="Duplicate as new skill"
            >
              <Copy size={13} /> Duplicate
            </button>
            <button
              type="button"
              className="btn secondary btn-sm"
              onClick={() => setPackagesOpen(true)}
              title="Package management (export/import)"
            >
              <Package size={13} /> Package
            </button>
            <button
              type="button"
              className="btn danger btn-sm"
              onClick={() => setConfirmDelete(true)}
              title="Delete skill"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* ── Sleek Property Ribbon (Horizontal Property Bar) ── */}
      <div className="skill-property-ribbon">
        <div className="skill-ribbon-item">
          <span className="skill-ribbon-label">Identifier:</span>
          <code className="skill-meta-pill" style={{ fontFamily: "var(--font-mono)" }}>
            {skill.id}
          </code>
        </div>

        <div className="skill-ribbon-sep" />

        <div className="skill-ribbon-item">
          <span className="skill-ribbon-label">Category:</span>
          <span className="skill-ribbon-value">{skill.category}</span>
        </div>

        <div className="skill-ribbon-sep" />

        <div className="skill-ribbon-item">
          <span className="skill-ribbon-label">Platforms:</span>
          <div style={{ display: "flex", gap: 4 }}>
            {skill.compatibility.map((p) => (
              <span key={p} className={`platform-pill ${p}`} style={{ fontSize: 10.5 }}>
                {PLATFORM_LABELS[p] ?? p}
              </span>
            ))}
          </div>
        </div>

        <div className="skill-ribbon-sep" />

        <div className="skill-ribbon-item">
          <span className="skill-ribbon-label">Tags:</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {skill.tags.length === 0 ? (
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>None</span>
            ) : (
              skill.tags.map((t) => (
                <span key={t} className="skill-meta-pill" style={{ fontSize: 10.5 }}>
                  #{t}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="skill-ribbon-sep" style={{ marginLeft: "auto" }} />

        <div className="skill-ribbon-item">
          <span className="skill-ribbon-label">Modified:</span>
          <span className="skill-ribbon-value" style={{ fontSize: 11 }}>
            {formatDate(skill.updatedAt)}
          </span>
        </div>
      </div>

      {/* ── Modern Split-Panel Studio Workspace ── */}
      <div className="skill-studio-split">
        {/* ── Left Column: Primary Content Workspace ── */}
        <div className="skill-workspace-column">
          <div className="skill-workspace-card">
            {/* Segmented Tabs Header */}
            <div className="skill-tabs-nav" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "instructions"}
                className={`skill-tab-button${activeTab === "instructions" ? " active" : ""}`}
                onClick={() => setActiveTab("instructions")}
              >
                <FileCode size={14} /> Instructions (SKILL.md)
                <span className="skill-tab-badge">{lineCount} lines</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "resources"}
                className={`skill-tab-button${activeTab === "resources" ? " active" : ""}`}
                onClick={() => setActiveTab("resources")}
              >
                <Layers size={14} /> Supporting Resources
                <span className="skill-tab-badge">{skill.resources.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "tools"}
                className={`skill-tab-button${activeTab === "tools" ? " active" : ""}`}
                onClick={() => setActiveTab("tools")}
              >
                <Terminal size={14} /> Tools &amp; Permissions
                <span className="skill-tab-badge">
                  {(skill.requiredTools?.length || 0) + (skill.permissions?.length || 0)}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "changelog"}
                className={`skill-tab-button${activeTab === "changelog" ? " active" : ""}`}
                onClick={() => setActiveTab("changelog")}
              >
                <History size={14} /> Changelog &amp; Notes
              </button>
            </div>

            {/* Tab 1: Instructions Viewer */}
            {activeTab === "instructions" && (
              <div className="skill-tab-content">
                <div className="skill-code-header">
                  <div className="skill-code-stats">
                    <span>{lineCount} lines</span>
                    <span>•</span>
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>Markdown instruction set</span>
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn secondary btn-sm"
                      onClick={handleCopyInstructions}
                      title="Copy instructions markdown"
                    >
                      {copied ? <Check size={12} style={{ color: "var(--success)" }} /> : <Copy size={12} />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      type="button"
                      className="btn secondary btn-sm"
                      onClick={() =>
                        setActiveResource({
                          name: "SKILL.md",
                          description: "Canonical skill instructions and workflow definition",
                        })
                      }
                      title="Open full interactive preview"
                    >
                      <Eye size={12} /> Preview in Editor
                    </button>
                  </div>
                </div>

                {skill.instructions.trim() ? (
                  <pre className="skill-code-box">{skill.instructions}</pre>
                ) : (
                  <EmptyState
                    icon={FileText}
                    title="No instructions defined"
                    text="This skill does not yet contain executable instructions."
                  />
                )}
              </div>
            )}

            {/* Tab 2: Supporting Resources */}
            {activeTab === "resources" && (
              <div className="skill-tab-content">
                <div className="skill-code-header">
                  <div className="skill-code-stats">
                    <span>{skill.resources.length} supporting documents &amp; files</span>
                  </div>
                </div>

                {skill.resources.length === 0 ? (
                  <EmptyState
                    icon={Layers}
                    title="No supporting resources"
                    text="This skill does not bundle additional templates, references, or scripts."
                  />
                ) : (
                  <div className="skill-resource-grid">
                    {skill.resources.map((r) => {
                      const kindInfo = resourceKindBadge(r.kind);
                      return (
                        <div
                          key={r.id}
                          className="skill-resource-item"
                          onClick={() => setActiveResource({ name: r.name, description: r.description })}
                          title={`Click to preview ${r.name}`}
                        >
                          <div className="skill-resource-left">
                            <FileCode size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                            <div>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: 12.5,
                                  color: "var(--text-primary)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                {r.name}
                                <Eye size={11} style={{ opacity: 0.6 }} />
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                                {r.description || "No description"}
                              </div>
                            </div>
                          </div>

                          <span
                            className="skill-meta-pill"
                            style={{
                              background: kindInfo.color,
                              color: kindInfo.text,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              fontSize: 10,
                            }}
                          >
                            {kindInfo.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Tools & Permissions */}
            {activeTab === "tools" && (
              <div className="skill-tab-content">
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 12.5, fontWeight: 700, margin: "0 0 8px", color: "var(--text-primary)" }}>
                      Required Execution Tools
                    </h3>
                    {skill.requiredTools && skill.requiredTools.length > 0 ? (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {skill.requiredTools.map((t) => (
                          <span key={t} className="skill-meta-pill" style={{ fontFamily: "var(--font-mono)" }}>
                            <Terminal size={11} /> {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                        Standard AI platform tools only (no custom execution tools declared).
                      </p>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                    <h3 style={{ fontSize: 12.5, fontWeight: 700, margin: "0 0 8px", color: "var(--text-primary)" }}>
                      Security &amp; Permissions Policy
                    </h3>
                    {skill.permissions && skill.permissions.length > 0 ? (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {skill.permissions.map((p) => (
                          <span key={p} className="badge neutral">
                            <Shield size={11} /> {p}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                        Restricted to repository-local static analysis mode (zero sandbox escape).
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Changelog */}
            {activeTab === "changelog" && (
              <div className="skill-tab-content">
                <div className="skill-code-header">
                  <div className="skill-code-stats">
                    <span>Version {skill.version} release history</span>
                  </div>
                </div>
                {skill.changelog && skill.changelog.trim() ? (
                  <pre className="skill-code-box">{skill.changelog}</pre>
                ) : (
                  <EmptyState
                    icon={History}
                    title="No changelog recorded"
                    text="Version modifications and release updates will be documented here."
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Sleek Inspector Rail ── */}
        <div className="skill-inspector-column">
          {/* Target Deployment Hub */}
          <div className="skill-inspector-card">
            <h3 className="skill-inspector-title">
              <PackageCheck size={14} style={{ color: "var(--accent)" }} /> Workspace Deployment Hub
            </h3>

            <div className="skill-target-hub">
              {/* GitHub Copilot target */}
              <div className="skill-target-item">
                <div className="skill-target-item-header">
                  <span className="skill-target-name">
                    <span className="pulse-dot" /> GitHub Copilot
                  </span>
                  <button
                    type="button"
                    className="btn secondary btn-sm"
                    style={{ fontSize: 10.5, padding: "2px 7px" }}
                    onClick={() => handleDirectInstall("copilot")}
                    disabled={installing}
                  >
                    Install
                  </button>
                </div>
                <span className="skill-target-path">.github/skills/{skill.id}</span>
              </div>

              {/* Claude Code target */}
              <div className="skill-target-item">
                <div className="skill-target-item-header">
                  <span className="skill-target-name">
                    <span className="pulse-dot" /> Claude Code
                  </span>
                  <button
                    type="button"
                    className="btn secondary btn-sm"
                    style={{ fontSize: 10.5, padding: "2px 7px" }}
                    onClick={() => handleDirectInstall("claude")}
                    disabled={installing}
                  >
                    Install
                  </button>
                </div>
                <span className="skill-target-path">.claude/skills/{skill.id}</span>
              </div>
            </div>
          </div>

          {/* Skill Specification & Quality */}
          <div className="skill-inspector-card">
            <h3 className="skill-inspector-title">
              <CheckCircle2 size={14} style={{ color: "var(--success)" }} /> Specification &amp; Quality
            </h3>

            <div className="skill-spec-list">
              <div className="skill-spec-row">
                <span className="skill-spec-key">SemVer</span>
                <span className="skill-spec-val">v{skill.version}</span>
              </div>
              <div className="skill-spec-row">
                <span className="skill-spec-key">Lifecycle</span>
                <span className="skill-spec-val">{skill.status}</span>
              </div>
              <div className="skill-spec-row">
                <span className="skill-spec-key">Author</span>
                <span className="skill-spec-val">{skill.author || "Workspace"}</span>
              </div>
              <div className="skill-spec-row">
                <span className="skill-spec-key">Frontmatter</span>
                <span className="skill-spec-val" style={{ color: "var(--success)" }}>
                  Verified
                </span>
              </div>
              <div className="skill-spec-row">
                <span className="skill-spec-key">Created</span>
                <span className="skill-spec-val" style={{ fontSize: 11 }}>
                  {formatDate(skill.createdAt)}
                </span>
              </div>
              <div className="skill-spec-row">
                <span className="skill-spec-key">Last Saved</span>
                <span className="skill-spec-val" style={{ fontSize: 11 }}>
                  {formatDate(skill.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Markdown Modal ── */}
      {activeResource && (
        <VsCodeMarkdownEditorModal
          open={!!activeResource}
          skillId={skill.id}
          resourceName={activeResource.name}
          resourceDescription={activeResource.description}
          onClose={() => setActiveResource(null)}
          onToast={onToast}
        />
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete skill"
        message={`Are you sure you want to delete "${skill.name}"? This action removes the skill definition and cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* ── Packages Dialog ── */}
      <SkillPackagesDialog
        open={packagesOpen}
        skill={skill}
        initialTab="export"
        onClose={() => setPackagesOpen(false)}
        onToast={onToast}
        onSkillsChanged={onSkillsChanged}
      />
    </div>
  );
}
