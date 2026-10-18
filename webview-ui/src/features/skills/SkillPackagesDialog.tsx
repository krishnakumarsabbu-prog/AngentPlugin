import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Download,
  Upload,
  PackageCheck,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText,
  Package,
} from "lucide-react";
import { Dialog } from "../../components/ui/Dialog";
import { Button } from "../../components/ui/Button";
import { Tabs } from "../../components/ui/Tabs";
import { getSkillPackagesStore } from "../../services/skillPackagesService";
import { getSkillsStore } from "../../services/skillsService";
import type {
  Skill,
  PlatformCompatibility,
  InstallScope,
  InstallTarget,
  InstalledArtifact,
  InstallPlanSummary,
  ExportResult,
  ImportPreview,
  PackageFile,
} from "../../types";

interface SkillPackagesDialogProps {
  open: boolean;
  skill: Skill | null;
  onClose: () => void;
  onToast: (message: string, tone?: "success" | "error") => void;
  onSkillsChanged?: () => void;
  onImportedSkill?: (id: string) => void;
}

const PLATFORM_LABELS: Record<PlatformCompatibility, string> = {
  copilot: "GitHub Copilot",
  claude: "Claude / Claude Code",
  openai: "OpenAI",
  neutral: "Local skill directory",
};

const PLATFORM_OPTIONS: PlatformCompatibility[] = ["copilot", "claude", "openai", "neutral"];

type TabId = "export" | "import" | "install";

export function SkillPackagesDialog({
  open,
  skill,
  onClose,
  onToast,
  onSkillsChanged,
  onImportedSkill,
}: SkillPackagesDialogProps) {
  const [tab, setTab] = useState<TabId>("export");

  useEffect(() => {
    if (open) setTab("export");
  }, [open, skill?.id]);

  return (
    <Dialog
      open={open}
      title={skill ? `Skill packages — ${skill.name}` : "Skill packages"}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>Close</Button>
      }
    >
      <Tabs
        tabs={[
          { id: "export", label: "Export" },
          { id: "import", label: "Import" },
          { id: "install", label: "Install & Remove" },
        ]}
        activeId={tab}
        onChange={(id: string) => setTab(id as TabId)}
      >
        {(active: string): ReactNode => {
          if (active === "export" && skill) return <ExportPanel skill={skill} onToast={onToast} />;
          if (active === "import") return (
            <ImportPanel
              onToast={onToast}
              onSkillsChanged={onSkillsChanged}
              onImportedSkill={onImportedSkill}
              onClose={onClose}
            />
          );
          if (active === "install" && skill) return (
            <InstallPanel skill={skill} onToast={onToast} onSkillsChanged={onSkillsChanged} />
          );
          return <div className="field-hint">Select a skill to export or install.</div>;
        }}
      </Tabs>
    </Dialog>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

function ExportPanel({ skill, onToast }: { skill: Skill; onToast: (m: string, t?: "success" | "error") => void }) {
  const store = getSkillPackagesStore();
  const [format, setFormat] = useState<"skill-md" | "package">("skill-md");
  const [result, setResult] = useState<ExportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runExport = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await store.exportSkill(skill.id, format);
      setResult(res);
      if (!res.validation.valid) {
        onToast("Exported, but the skill has validation warnings.", "error");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed";
      setError(msg);
      onToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!result) return;
    if (format === "skill-md") {
      downloadText(`${result.fileName}`, result.primaryContent);
      onToast(`Exported ${result.fileName}`, "success");
    } else {
      downloadText("agentforge-package.json", result.primaryContent);
      for (const f of result.files) {
        downloadText(f.path.replace(/\//g, "__"), f.content);
      }
      onToast(`Exported package with ${result.files.length} file(s)`, "success");
    }
  };

  return (
    <div className="section-list">
      <div className="meta-row">
        <span className="meta-label">Format</span>
        <span style={{ display: "flex", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="radio"
              name="export-format"
              checked={format === "skill-md"}
              onChange={() => setFormat("skill-md")}
            />
            <FileText size={13} /> SKILL.md only
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input
              type="radio"
              name="export-format"
              checked={format === "package"}
              onChange={() => setFormat("package")}
            />
            <Package size={13} /> Full package
            {skill.resources.length === 0 && (
              <span className="list-row-sub">(no resources — equivalent to SKILL.md)</span>
            )}
          </label>
        </span>
      </div>

      <div className="field-hint">
        Exports include metadata, instructions, references, examples, and optional scripts declared as resources.
        The package is validated before export.
      </div>

      {error && <div className="error-state-text" style={{ color: "var(--error)" }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Button variant="primary" icon={Download} onClick={runExport} disabled={busy}>
          {busy ? "Preparing…" : "Prepare export"}
        </Button>
        {result && (
          <Button variant="secondary" icon={Download} onClick={download}>
            Download {format === "skill-md" ? "SKILL.md" : "package files"}
          </Button>
        )}
      </div>

      {result && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-header">
            <h3 className="card-title">Preview</h3>
            <span className="list-row-sub">
              {format === "skill-md"
                ? `${result.fileName}`
                : `${result.files.length} file(s) + manifest`}
            </span>
          </div>
          {result.validation.warnings.length > 0 && (
            <div style={{ display: "flex", gap: 6, color: "var(--warning)", marginBottom: 8 }}>
              <AlertTriangle size={13} /> Validation warnings present — review before sharing.
            </div>
          )}
          <pre className="instructions-block" style={{ maxHeight: 260 }}>
            {format === "skill-md" ? result.primaryContent : result.files.find((f: PackageFile) => f.path === "SKILL.md")?.content ?? ""}
          </pre>
          {format === "package" && result.files.length > 1 && (
            <div className="section-list" style={{ marginTop: 8 }}>
              <div className="list-row-sub">Included files:</div>
              {result.files.map((f: PackageFile) => (
                <div key={f.path} className="meta-row"><span className="meta-label">·</span><span>{f.path}</span></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Import ───────────────────────────────────────────────────────────────────

function ImportPanel({
  onToast,
  onSkillsChanged,
  onImportedSkill,
  onClose,
}: {
  onToast: (m: string, t?: "success" | "error") => void;
  onSkillsChanged?: () => void;
  onImportedSkill?: (id: string) => void;
  onClose: () => void;
}) {
  const store = getSkillPackagesStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawText, setRawText] = useState("");
  const [packageFiles, setPackageFiles] = useState<Record<string, string> | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPackage = useMemo(() => {
    try {
      const obj = JSON.parse(rawText);
      return obj && obj.kind === "agentforge-skill";
    } catch {
      return false;
    }
  }, [rawText]);

  const reset = () => {
    setRawText("");
    setPackageFiles(null);
    setPreview(null);
    setError(null);
  };

  const onFilesPicked = async (files: FileList) => {
    setError(null);
    setPreview(null);
    const read: Record<string, string> = {};
    let manifestText = "";
    let skillMd = "";
    for (const file of Array.from(files)) {
      const text = await file.text();
      if (file.name === "agentforge-package.json" || file.name.endsWith("__agentforge-package.json")) {
        manifestText = text;
      } else if (file.name === "SKILL.md" || file.name === "SKILL__md") {
        skillMd = text;
        read["SKILL.md"] = text;
      } else {
        const restored = file.name.replace(/__/g, "/");
        read[restored] = text;
      }
    }
    if (manifestText) {
      setRawText(manifestText);
      setPackageFiles(read);
    } else if (skillMd) {
      setRawText(skillMd);
      setPackageFiles(null);
    } else if (files.length === 1) {
      setRawText(await files[0].text());
      setPackageFiles(null);
    }
  };

  const runPreview = async () => {
    if (!rawText.trim()) {
      setError("Provide a SKILL.md document or an agentforge-package.json manifest.");
      return;
    }
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const res = await store.previewImport(rawText, packageFiles ?? undefined, packageFiles?.["SKILL.md"]);
      setPreview(res);
      if (!res.valid) {
        onToast("Import preview found errors.", "error");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import preview failed";
      setError(msg);
      onToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const runSave = async () => {
    if (!preview) return;
    if (!preview.valid) {
      onToast("Cannot save: the package has validation errors.", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await store.saveImport(preview);
      onToast(result.updated ? `Updated skill "${result.skill.name}"` : `Imported skill "${result.skill.name}"`, "success");
      onSkillsChanged?.();
      onImportedSkill?.(result.skill.id);
      reset();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import save failed";
      setError(msg);
      onToast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="section-list">
      <div className="field-hint">
        Import a SKILL.md document or an AgentForge package (manifest + files). Required metadata and
        file structure are validated. Duplicates and version conflicts are detected before saving.
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button variant="secondary" icon={Upload} onClick={() => fileInputRef.current?.click()}>
          Choose file(s)
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".md,.json,text/markdown,application/json"
          style={{ display: "none" }}
          onChange={(e) => e.target.files && onFilesPicked(e.target.files)}
        />
        {(rawText || packageFiles) && (
          <Button variant="ghost" onClick={reset}>Clear</Button>
        )}
      </div>

      <textarea
        className="textarea"
        placeholder="…or paste SKILL.md / manifest JSON here"
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={6}
        style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
      />

      {isPackage && (
        <div style={{ display: "flex", gap: 6, color: "var(--info)" }}>
          <Info size={13} /> Package manifest detected.
          {packageFiles && Object.keys(packageFiles).length > 0 && (
            <span className="list-row-sub">
              ({Object.keys(packageFiles).length} file(s) loaded)
            </span>
          )}
        </div>
      )}

      {error && <div className="error-state-text" style={{ color: "var(--error)" }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Button variant="primary" onClick={runPreview} disabled={busy || !rawText.trim()}>
          {busy ? "Working…" : "Preview import"}
        </Button>
        {preview && preview.valid && (
          <Button variant="primary" icon={CheckCircle2} onClick={runSave} disabled={busy}>
            Save import
          </Button>
        )}
      </div>

      {preview && <ImportPreviewView preview={preview} />}
    </div>
  );
}

function ImportPreviewView({ preview }: { preview: ImportPreview }) {
  const s = preview.skill;
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-header">
        <h3 className="card-title">Import preview</h3>
        <span className={`badge ${preview.valid ? "success" : "error"}`}>
          {preview.valid ? "Valid" : "Invalid"}
        </span>
      </div>
      <div className="section-list">
        <div className="meta-row"><span className="meta-label">Name</span><span>{s.name ?? "—"}</span></div>
        <div className="meta-row"><span className="meta-label">Identifier</span><span>{s.id ?? "—"}</span></div>
        <div className="meta-row"><span className="meta-label">Version</span><span>{s.version ?? "—"}</span></div>
        <div className="meta-row"><span className="meta-label">Category</span><span>{s.category ?? "—"}</span></div>
        <div className="meta-row"><span className="meta-label">Files</span><span>{preview.files.length}</span></div>
        <div className="meta-row">
          <span className="meta-label">Duplicate</span>
          <span>
            {preview.duplicate.kind === "none"
              ? "No conflict"
              : preview.duplicate.kind === "same-version"
                ? `Same id+version as existing "${preview.duplicate.existingId}" (${preview.duplicate.existingVersion})`
                : preview.duplicate.kind === "newer-existing"
                  ? `Newer version already exists (${preview.duplicate.existingVersion})`
                  : `Older version exists (${preview.duplicate.existingVersion})`}
          </span>
        </div>
      </div>

      {preview.errors.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {preview.errors.map((e: string, i: number) => (
            <div key={i} style={{ display: "flex", gap: 6, color: "var(--error)", marginBottom: 2 }}>
              <AlertTriangle size={12} /> {e}
            </div>
          ))}
        </div>
      )}
      {preview.warnings.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {preview.warnings.map((w: string, i: number) => (
            <div key={i} style={{ display: "flex", gap: 6, color: "var(--warning)", marginBottom: 2 }}>
              <AlertTriangle size={12} /> {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Install & Remove ─────────────────────────────────────────────────────────

function InstallPanel({
  skill,
  onToast,
  onSkillsChanged,
}: {
  skill: Skill;
  onToast: (m: string, t?: "success" | "error") => void;
  onSkillsChanged?: () => void;
}) {
  const store = getSkillPackagesStore();
  const skillsStore = getSkillsStore();
  const [platform, setPlatform] = useState<PlatformCompatibility>("copilot");
  const [scope, setScope] = useState<InstallScope>("workspace");
  const [targets, setTargets] = useState<{ scope: InstallScope; target: InstallTarget }[]>([]);
  const [plan, setPlan] = useState<InstallPlanSummary | null>(null);
  const [artifacts, setArtifacts] = useState<InstalledArtifact[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUninstall, setPendingUninstall] = useState<InstalledArtifact | null>(null);
  const [removeFromDisk, setRemoveFromDisk] = useState(true);

  void skillsStore; // retained for future installation-state refresh wiring

  const refreshArtifacts = async () => {
    try {
      const list = await store.installations(skill.id);
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
    if (!skill) return;
    refreshArtifacts();
    refreshTargets();
    setPlan(null);
    setError(null);
  }, [skill.id, platform]);

  const target = targets.find((t) => t.scope === scope);

  const runPlan = async () => {
    setBusy(true);
    setError(null);
    setPlan(null);
    try {
      const p = await store.installPlan(skill.id, platform, scope);
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
      const artifact = await store.install(skill.id, platform, scope);
      onToast(
        artifact.simulated
          ? `Simulated install recorded for ${PLATFORM_LABELS[platform]} (${scope}). No files were written.`
          : `Installed to ${PLATFORM_LABELS[platform]} (${scope}).`,
        "success",
      );
      setPlan(null);
      refreshArtifacts();
      onSkillsChanged?.();
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
      const result = await store.uninstall(skill.id, pendingUninstall.platform, pendingUninstall.scope, removeFromDisk);
      onToast(result.message, "success");
      setPendingUninstall(null);
      refreshArtifacts();
      onSkillsChanged?.();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Uninstall failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="section-list">
      <div className="field-hint">
        Installation writes files only into the approved destination shown below. Existing files are
        detected and you will be asked to confirm before replacing them. Scripts included in a package
        are never executed automatically.
      </div>

      <div className="meta-row">
        <span className="meta-label">Platform</span>
        <select className="select" style={{ width: "auto" }} value={platform} onChange={(e) => setPlatform(e.target.value as PlatformCompatibility)}>
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
          ))}
        </select>
      </div>

      <div className="meta-row">
        <span className="meta-label">Scope</span>
        <span style={{ display: "flex", gap: 12 }}>
          {targets.map((t) => (
            <label key={t.scope} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                name="install-scope"
                checked={scope === t.scope}
                onChange={() => setScope(t.scope)}
              />
              {t.scope === "user" ? "User" : "Workspace"}
            </label>
          ))}
          {targets.length === 0 && <span className="list-row-sub">No targets for this platform.</span>}
        </span>
      </div>

      {target && (
        <div className="meta-row">
          <span className="meta-label">Destination</span>
          <span className="list-row-sub">{target.target.displayPath}</span>
        </div>
      )}

      {error && <div className="error-state-text" style={{ color: "var(--error)" }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Button variant="secondary" onClick={runPlan} disabled={busy || !target}>
          Check & preview
        </Button>
        <Button variant="primary" icon={PackageCheck} onClick={runInstall} disabled={busy || !target}>
          {busy ? "Working…" : "Install"}
        </Button>
      </div>

      {plan && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-header">
            <h3 className="card-title">Install plan</h3>
            <span className={`badge ${plan.simulated ? "warning" : "success"}`}>
              {plan.simulated ? "Simulated" : "Real write"}
            </span>
          </div>
          {plan.simulated && (
            <div style={{ display: "flex", gap: 6, color: "var(--warning)", marginBottom: 6 }}>
              <Info size={13} /> This platform is not yet supported for real installation. A simulated
              installation records the operation without writing files.
            </div>
          )}
          <div className="section-list">
            <div className="meta-row"><span className="meta-label">Destination</span><span className="list-row-sub">{plan.target.displayPath}</span></div>
            <div className="meta-row"><span className="meta-label">Files</span><span>{plan.files.length}</span></div>
            {plan.existing.length > 0 && (
              <div className="meta-row">
                <span className="meta-label">Existing</span>
                <span style={{ color: "var(--warning)" }}>
                  {plan.existing.length} file(s) already present and will be replaced.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-header">
          <h3 className="card-title">Installed artifacts</h3>
          <span className="list-row-sub">{artifacts.length}</span>
        </div>
        {artifacts.length === 0 ? (
          <div className="field-hint">No installations recorded for this skill.</div>
        ) : (
          <div className="section-list">
            {artifacts.map((a) => (
              <div key={`${a.platform}-${a.scope}`} className="resource-row">
                <PackageCheck size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                <div className="list-row-main">
                  <span className="list-row-title">{PLATFORM_LABELS[a.platform]} · {a.scope}</span>
                  <span className="list-row-sub">
                    {a.simulated ? "Simulated — no files written. " : ""}
                    {a.files.length} file(s) · {new Date(a.installedAt).toLocaleString()}
                  </span>
                </div>
                <Button variant="ghost" size="sm" icon={Trash2} onClick={() => { setPendingUninstall(a); setRemoveFromDisk(!a.simulated); }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={pendingUninstall !== null}
        title="Remove installation"
        onClose={() => setPendingUninstall(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingUninstall(null)} disabled={busy}>Cancel</Button>
            <Button variant="danger" onClick={confirmUninstall} disabled={busy}>
              {busy ? "Working…" : "Remove"}
            </Button>
          </>
        }
      >
        {pendingUninstall && (
          <div className="section-list">
            <div>
              Choose what to remove for <strong>{PLATFORM_LABELS[pendingUninstall.platform]}</strong> ({pendingUninstall.scope}):
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                checked={removeFromDisk}
                onChange={() => setRemoveFromDisk(true)}
              />
              Remove AgentForge record and installed files
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="radio"
                checked={!removeFromDisk}
                onChange={() => setRemoveFromDisk(false)}
              />
              Remove only the AgentForge record (leave files on disk)
            </label>
            {pendingUninstall.simulated && (
              <div style={{ display: "flex", gap: 6, color: "var(--warning)" }}>
                <Info size={13} /> This was a simulated install — no files were written, so nothing will
                be removed from disk regardless of the choice above.
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function downloadText(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type { PackageFile };
