import React, { useEffect, useState } from "react";
import {
  Sparkles,
  FolderGit2,
  Globe,
  Cpu,
  Layers,
  CheckCircle2,
  Play,
  RotateCw,
  Save,
  Download,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  History,
  FileCode,
} from "lucide-react";
import type {
  EngineeringPersona,
  PersonaId,
  CrawlResult,
  CrawlProgressEvent,
  SkillGenerationResult,
  GeneratedFile,
  SkillIntermediateRepresentation,
} from "../../types/persona";
import {
  listPersonas,
  listWorkspaces,
  startCrawl,
  cancelCrawl,
  compileSkill,
  savePersonaSkill,
  listPersonaSkillVersions,
  type WorkspaceFolderInfo,
} from "../../services/personaService";
import { PersonaSelector } from "./components/PersonaSelector";
import { CrawlProgressStepper } from "./components/CrawlProgressStepper";
import { EvidenceExplorer } from "./components/EvidenceExplorer";
import { SkillPreviewDiff } from "./components/SkillPreviewDiff";
import { QualityScorecard } from "./components/QualityScorecard";

interface PersonaSkillStudioPageProps {
  onNavigate: (route: string) => void;
  onToast: (message: string, tone?: "success" | "error") => void;
}

type StudioStep =
  | "setup"
  | "personas"
  | "crawl"
  | "evidence"
  | "preview"
  | "evaluate"
  | "install";

export function PersonaSkillStudioPage({
  onNavigate,
  onToast,
}: PersonaSkillStudioPageProps) {
  // Mode: universal vs repository-adaptive
  const [mode, setMode] = useState<"repository-adaptive" | "universal">("repository-adaptive");

  // Step state
  const [step, setStep] = useState<StudioStep>("setup");

  // Data state
  const [personas, setPersonas] = useState<EngineeringPersona[]>([]);
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<PersonaId[]>(["developer"]);
  const [workspaces, setWorkspaces] = useState<WorkspaceFolderInfo[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>("");

  // Crawl state
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState<CrawlProgressEvent | null>(null);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [excludedFindingIds, setExcludedFindingIds] = useState<string[]>([]);

  // Skill compilation state
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationResult, setCompilationResult] = useState<SkillGenerationResult | null>(null);
  const [customSkillName, setCustomSkillName] = useState("");
  const [customSkillDescription, setCustomSkillDescription] = useState("");
  const [customRules, setCustomRules] = useState<string>("");

  // Target platforms
  const [targetPlatforms, setTargetPlatforms] = useState<("copilot" | "claude" | "openai" | "neutral")[]>([
    "copilot",
    "claude",
    "neutral",
  ]);

  // Saving / Publishing
  const [isSaving, setIsSaving] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      const [allPersonas, allWorkspaces] = await Promise.all([
        listPersonas(),
        listWorkspaces(),
      ]);
      setPersonas(allPersonas);
      setWorkspaces(allWorkspaces);
      if (allWorkspaces.length > 0) {
        setSelectedWorkspace(allWorkspaces[0].path);
      }
    }
    loadData();
  }, []);

  const handleTogglePersona = (id: PersonaId) => {
    setSelectedPersonaIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((p) => p !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleStartCrawl = async () => {
    if (!selectedWorkspace && mode === "repository-adaptive") {
      onToast("Please select a workspace folder first.", "error");
      return;
    }

    setIsCrawling(true);
    setStep("crawl");
    setCrawlProgress(null);

    try {
      const result = await startCrawl(
        {
          workspacePath: selectedWorkspace,
          selectedPersonas: selectedPersonaIds,
        },
        (progress) => {
          setCrawlProgress(progress);
        }
      );
      setCrawlResult(result);
      setIsCrawling(false);
      onToast(`Crawl complete! Discovered ${result.findings.length} findings across ${result.totalFilesScanned} files.`, "success");
      setStep("evidence");
    } catch (e) {
      setIsCrawling(false);
      const msg = e instanceof Error ? e.message : "Crawl failed";
      onToast(msg, "error");
    }
  };

  const handleCancelCrawl = async () => {
    await cancelCrawl();
    setIsCrawling(false);
    onToast("Crawl was cancelled.", "error");
  };

  const handleGenerateSkill = async () => {
    setIsCompiling(true);
    try {
      const orgRules = customRules
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);

      const res = await compileSkill({
        mode,
        personaIds: selectedPersonaIds,
        targetPlatforms,
        workspacePath: selectedWorkspace,
        crawlResult: mode === "repository-adaptive" ? (crawlResult || undefined) : undefined,
        skillName: customSkillName.trim() || undefined,
        skillDescription: customSkillDescription.trim() || undefined,
        customOrganizationalRules: orgRules.length > 0 ? orgRules : undefined,
        excludedFindingIds,
      });

      setCompilationResult(res);
      setIsCompiling(false);
      setStep("preview");
      onToast("Skill compiled successfully with Intermediate Representation!", "success");
    } catch (e) {
      setIsCompiling(false);
      onToast(e instanceof Error ? e.message : "Skill compilation failed", "error");
    }
  };

  const handleFileChange = (path: string, newContent: string) => {
    if (!compilationResult) return;
    const updatedFiles = compilationResult.files.map((f: GeneratedFile) =>
      f.path === path ? { ...f, content: newContent } : f
    );
    setCompilationResult({
      ...compilationResult,
      files: updatedFiles,
    });
  };

  const handleSaveAndInstall = async () => {
    if (!compilationResult) return;
    setIsSaving(true);
    try {
      const res = await savePersonaSkill({
        ir: compilationResult.ir,
        installTargets: targetPlatforms,
        writeFilesToWorkspace: true,
      });
      setIsSaving(false);
      onToast(`Skill "${res.skillId}" successfully saved and installed!`, "success");
      onNavigate(`skill-details:${res.skillId}`);
    } catch (e) {
      setIsSaving(false);
      onToast(e instanceof Error ? e.message : "Failed to save skill", "error");
    }
  };

  return (
    <div className="persona-studio-page" style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "linear-gradient(135deg, #6366F1, #3B82F6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Persona Skill Studio</h1>
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                Generate intelligent, evidence-backed engineering skills tailored to codebases and engineering roles.
              </p>
            </div>
          </div>
        </div>

        {/* Mode Switcher */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-subtle, #F3F4F6)",
            padding: 3,
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            className={`btn ${mode === "repository-adaptive" ? "primary" : "secondary"}`}
            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6 }}
            onClick={() => {
              setMode("repository-adaptive");
              setStep("setup");
            }}
          >
            <FolderGit2 size={13} style={{ marginRight: 6 }} /> Repository-Adaptive
          </button>
          <button
            type="button"
            className={`btn ${mode === "universal" ? "primary" : "secondary"}`}
            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 6 }}
            onClick={() => {
              setMode("universal");
              setStep("personas");
            }}
          >
            <Globe size={13} style={{ marginRight: 6 }} /> Universal Practice
          </button>
        </div>
      </div>

      {/* Stepper Navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          marginBottom: 20,
          gap: 4,
          overflowX: "auto",
        }}
      >
        {mode === "repository-adaptive" && (
          <button
            type="button"
            className={`tab-btn ${step === "setup" ? "active" : ""}`}
            style={{
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              background: "none",
              borderBottom: step === "setup" ? "2px solid var(--accent, #6366F1)" : "2px solid transparent",
              color: step === "setup" ? "var(--accent, #6366F1)" : "var(--text-secondary)",
              cursor: "pointer",
            }}
            onClick={() => setStep("setup")}
          >
            1. Workspace Target
          </button>
        )}

        <button
          type="button"
          className={`tab-btn ${step === "personas" ? "active" : ""}`}
          style={{
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            border: "none",
            background: "none",
            borderBottom: step === "personas" ? "2px solid var(--accent, #6366F1)" : "2px solid transparent",
            color: step === "personas" ? "var(--accent, #6366F1)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
          onClick={() => setStep("personas")}
        >
          {mode === "repository-adaptive" ? "2." : "1."} Persona Selection ({selectedPersonaIds.length})
        </button>

        {mode === "repository-adaptive" && (
          <>
            <button
              type="button"
              className={`tab-btn ${step === "crawl" ? "active" : ""}`}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                background: "none",
                borderBottom: step === "crawl" ? "2px solid var(--accent, #6366F1)" : "2px solid transparent",
                color: step === "crawl" ? "var(--accent, #6366F1)" : "var(--text-secondary)",
                cursor: "pointer",
              }}
              onClick={() => setStep("crawl")}
              disabled={!crawlResult && !isCrawling}
            >
              3. Deep Crawl {isCrawling ? "(In Progress)" : crawlResult ? "✓" : ""}
            </button>

            <button
              type="button"
              className={`tab-btn ${step === "evidence" ? "active" : ""}`}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                background: "none",
                borderBottom: step === "evidence" ? "2px solid var(--accent, #6366F1)" : "2px solid transparent",
                color: step === "evidence" ? "var(--accent, #6366F1)" : "var(--text-secondary)",
                cursor: "pointer",
              }}
              onClick={() => setStep("evidence")}
              disabled={!crawlResult}
            >
              4. Evidence Explorer ({crawlResult?.findings.length || 0})
            </button>
          </>
        )}

        <button
          type="button"
          className={`tab-btn ${step === "preview" ? "active" : ""}`}
          style={{
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            border: "none",
            background: "none",
            borderBottom: step === "preview" ? "2px solid var(--accent, #6366F1)" : "2px solid transparent",
            color: step === "preview" ? "var(--accent, #6366F1)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
          onClick={() => setStep("preview")}
          disabled={!compilationResult}
        >
          {mode === "repository-adaptive" ? "5." : "2."} Skill Preview & Edit
        </button>

        <button
          type="button"
          className={`tab-btn ${step === "evaluate" ? "active" : ""}`}
          style={{
            padding: "8px 16px",
            fontSize: 12,
            fontWeight: 600,
            border: "none",
            background: "none",
            borderBottom: step === "evaluate" ? "2px solid var(--accent, #6366F1)" : "2px solid transparent",
            color: step === "evaluate" ? "var(--accent, #6366F1)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
          onClick={() => setStep("evaluate")}
          disabled={!compilationResult}
        >
          {mode === "repository-adaptive" ? "6." : "3."} Quality Evaluation
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          STEP 1: SETUP & WORKSPACE TARGET
      ─────────────────────────────────────────────────────────────────────────── */}
      {step === "setup" && mode === "repository-adaptive" && (
        <div className="card" style={{ padding: 20, borderRadius: 8, border: "1px solid var(--border)" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Select Repository Workspace</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)" }}>
            The crawl engine will passively discover architecture, contracts, coding conventions, and testing patterns without executing untrusted scripts.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Target Workspace Root:
            </label>
            <select
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              style={{
                width: "100%",
                maxWidth: 600,
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                fontSize: 13,
              }}
            >
              {workspaces.map((w) => (
                <option key={w.path} value={w.path}>
                  {w.name} ({w.path})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-glowing-primary"
              style={{ fontSize: 13, padding: "8px 16px" }}
              onClick={() => setStep("personas")}
            >
              Next: Select Personas <ArrowRight size={14} style={{ marginLeft: 6 }} />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          STEP 2: PERSONA SELECTION
      ─────────────────────────────────────────────────────────────────────────── */}
      {step === "personas" && (
        <div>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Select Engineering Personas</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                Choose one or compose multiple personas. Responsibilities will be reconciled into a unified workflow.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {mode === "repository-adaptive" ? (
                <button
                  type="button"
                  className="btn btn-glowing-primary"
                  style={{ fontSize: 13, padding: "8px 16px" }}
                  onClick={handleStartCrawl}
                  disabled={isCrawling}
                >
                  <Play size={14} style={{ marginRight: 6 }} /> Start Deep Repository Crawl
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-glowing-primary"
                  style={{ fontSize: 13, padding: "8px 16px" }}
                  onClick={handleGenerateSkill}
                  disabled={isCompiling}
                >
                  <Sparkles size={14} style={{ marginRight: 6 }} /> Generate Universal Skill
                </button>
              )}
            </div>
          </div>

          <PersonaSelector
            personas={personas}
            selectedIds={selectedPersonaIds}
            onTogglePersona={handleTogglePersona}
            onSelectPrimary={() => {}}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          STEP 3: DEEP CRAWL & REAL-TIME PROGRESS
      ─────────────────────────────────────────────────────────────────────────── */}
      {step === "crawl" && mode === "repository-adaptive" && (
        <div>
          <CrawlProgressStepper
            progress={crawlProgress}
            isCrawling={isCrawling}
            onCancel={handleCancelCrawl}
          />

          {!isCrawling && crawlResult && (
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn secondary"
                onClick={handleStartCrawl}
              >
                <RotateCw size={13} style={{ marginRight: 6 }} /> Re-Crawl Repository
              </button>
              <button
                type="button"
                className="btn btn-glowing-primary"
                onClick={() => setStep("evidence")}
              >
                Inspect Findings ({crawlResult.findings.length}) <ArrowRight size={14} style={{ marginLeft: 6 }} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          STEP 4: EVIDENCE EXPLORER
      ─────────────────────────────────────────────────────────────────────────── */}
      {step === "evidence" && mode === "repository-adaptive" && crawlResult && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Discovered Repository Evidence</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                Verified patterns and architectural facts extracted from {crawlResult.eligibleFilesCount} files.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-glowing-primary"
              style={{ fontSize: 13, padding: "8px 16px" }}
              onClick={handleGenerateSkill}
              disabled={isCompiling}
            >
              <Sparkles size={14} style={{ marginRight: 6 }} /> Generate Persona Skill
            </button>
          </div>

          <EvidenceExplorer
            findings={crawlResult.findings}
            excludedIds={excludedFindingIds}
            onToggleExclude={(id) => {
              setExcludedFindingIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              );
            }}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          STEP 5: SKILL PREVIEW & DIRECT EDIT
      ─────────────────────────────────────────────────────────────────────────── */}
      {step === "preview" && compilationResult && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                {compilationResult.ir.metadata.name}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                {compilationResult.files.length} production files generated via Intermediate Representation.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setStep("evaluate")}
              >
                <ShieldCheck size={14} style={{ marginRight: 6 }} /> View Quality Scorecard ({compilationResult.evaluation.overallScore}/100)
              </button>
              <button
                type="button"
                className="btn btn-glowing-primary"
                onClick={handleSaveAndInstall}
                disabled={isSaving}
              >
                <Save size={14} style={{ marginRight: 6 }} /> Save & Install Skill
              </button>
            </div>
          </div>

          <SkillPreviewDiff
            ir={compilationResult.ir}
            files={compilationResult.files}
            onFileChange={handleFileChange}
            onResetFile={() => {}}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          STEP 6: QUALITY EVALUATION SCORECARD
      ─────────────────────────────────────────────────────────────────────────── */}
      {step === "evaluate" && compilationResult && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Deterministic Quality Scorecard</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                Evaluation across 6 objective engineering dimensions.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setStep("preview")}
              >
                <ArrowLeft size={14} style={{ marginRight: 6 }} /> Back to File Preview
              </button>
              <button
                type="button"
                className="btn btn-glowing-primary"
                onClick={handleSaveAndInstall}
                disabled={isSaving}
              >
                <Save size={14} style={{ marginRight: 6 }} /> Save & Install Skill
              </button>
            </div>
          </div>

          <QualityScorecard evaluation={compilationResult.evaluation} />
        </div>
      )}
    </div>
  );
}
