import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCw,
  ExternalLink,
  Bot,
  Sparkles,
  Workflow,
  Search,
  Plus,
  Trash2,
  Info,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  FileCheck,
  Layers,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import type {
  Skill,
  Agent,
  Workflow as PipelineWorkflow,
  EvaluationReport,
  EvaluationCheck,
  EvaluationCheckStatus,
  EvaluationTargetType,
  ConfigurableTestCase,
} from "../../types";
import { getSkillsStore } from "../../services/skillsService";
import { getAgentsStore } from "../../services/agentsService";
import { workflowsService } from "../../services/workflowsService";
import {
  evaluateSkillClient,
  evaluateAgentClient,
  evaluatePipelineClient,
} from "../../services/evaluationService";

interface TestEvaluationStudioPageProps {
  onNavigate?: (route: string) => void;
  onToast: (msg: string, type?: "success" | "info" | "warning" | "error") => void;
}

export const TestEvaluationStudioPage: React.FC<TestEvaluationStudioPageProps> = ({
  onNavigate,
  onToast,
}) => {
  // Target type: "skill" | "agent" | "pipeline"
  const [targetType, setTargetType] = useState<EvaluationTargetType>("skill");

  // Loaded data
  const [skills, setSkills] = useState<Skill[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [workflows, setWorkflows] = useState<PipelineWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected resource id
  const [selectedId, setSelectedId] = useState<string>("");

  // Evaluation Report
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Filter checks
  const [statusFilter, setStatusFilter] = useState<"all" | "failed" | "warning" | "passed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Configurable Test Cases
  const [showTestConfig, setShowTestConfig] = useState(false);
  const [customTestCases, setCustomTestCases] = useState<ConfigurableTestCase[]>([
    {
      id: "tc-1",
      name: "Default Dry-Run Invocation",
      description: "Verifies basic input contract conformance and execution boundary.",
      inputPayload: { query: "Perform initial static validation check", options: { strictMode: true } },
      expectedOutputMatcher: "status",
      expectedStatus: "Succeeded",
    },
  ]);
  const [newTcName, setNewTcName] = useState("");
  const [newTcInput, setNewTcInput] = useState("");

  // Load resources on mount
  useEffect(() => {
    let isMounted = true;
    async function loadResources() {
      setIsLoading(true);
      try {
        const [skList, agList, wfList] = await Promise.all([
          getSkillsStore().list(),
          getAgentsStore().list(),
          workflowsService.list(),
        ]);
        if (!isMounted) return;
        setSkills(skList);
        setAgents(agList);
        setWorkflows(wfList);

        if (skList.length > 0) {
          setSelectedId(skList[0].id);
        }
      } catch (e) {
        onToast("Failed to load resources for evaluation studio", "error");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadResources();
    return () => {
      isMounted = false;
    };
  }, [onToast]);

  // Context for references
  const evalContext = useMemo(() => {
    return {
      knownSkillIds: new Set(skills.map((s) => s.id)),
      knownAgentIds: new Set(agents.map((a) => a.id)),
      knownWorkflowIds: new Set(workflows.map((w) => w.id)),
      customTestCases,
    };
  }, [skills, agents, workflows, customTestCases]);

  // Execute Evaluation on Selected Target
  const runEvaluation = useCallback(
    (type = targetType, id = selectedId) => {
      if (!id) return;
      setIsEvaluating(true);

      try {
        let rep: EvaluationReport | null = null;
        if (type === "skill") {
          const item = skills.find((s) => s.id === id);
          if (item) rep = evaluateSkillClient(item, evalContext);
        } else if (type === "agent") {
          const item = agents.find((a) => a.id === id);
          if (item) rep = evaluateAgentClient(item, evalContext);
        } else if (type === "pipeline") {
          const item = workflows.find((w) => w.id === id);
          if (item) rep = evaluatePipelineClient(item, evalContext);
        }

        if (rep) {
          setReport(rep);
          if (rep.overallStatus === "passed") {
            onToast(`Evaluation passed for ${rep.targetName}`, "success");
          } else if (rep.overallStatus === "warning") {
            onToast(`Evaluation passed with warnings for ${rep.targetName}`, "warning");
          } else {
            onToast(`Evaluation failed with ${rep.errors.length} issue(s)`, "error");
          }
        }
      } catch (e) {
        onToast("Evaluation execution failed", "error");
      } finally {
        setIsEvaluating(false);
      }
    },
    [targetType, selectedId, skills, agents, workflows, evalContext, onToast]
  );

  // Auto-run when target or selection changes
  useEffect(() => {
    if (selectedId) {
      runEvaluation(targetType, selectedId);
    }
  }, [targetType, selectedId]);

  // Switch Target Type
  const handleTypeChange = (newType: EvaluationTargetType) => {
    setTargetType(newType);
    if (newType === "skill" && skills.length > 0) {
      setSelectedId(skills[0].id);
    } else if (newType === "agent" && agents.length > 0) {
      setSelectedId(agents[0].id);
    } else if (newType === "pipeline" && workflows.length > 0) {
      setSelectedId(workflows[0].id);
    } else {
      setSelectedId("");
      setReport(null);
    }
  };

  // Add Custom Test Case
  const handleAddTestCase = () => {
    if (!newTcName.trim()) {
      onToast("Test case name is required", "warning");
      return;
    }
    let parsedInput: Record<string, unknown> | string = newTcInput;
    try {
      if (newTcInput.trim().startsWith("{")) {
        parsedInput = JSON.parse(newTcInput);
      }
    } catch {
      parsedInput = newTcInput;
    }

    const tc: ConfigurableTestCase = {
      id: `tc-${Date.now()}`,
      name: newTcName.trim(),
      inputPayload: parsedInput,
      expectedStatus: "Succeeded",
    };
    setCustomTestCases((prev) => [...prev, tc]);
    setNewTcName("");
    setNewTcInput("");
    onToast(`Added test case '${tc.name}'`, "success");
  };

  const handleRemoveTestCase = (id: string) => {
    setCustomTestCases((prev) => prev.filter((t) => t.id !== id));
    onToast("Test case removed", "info");
  };

  // Filtered checks
  const filteredChecks = useMemo(() => {
    if (!report) return [];
    return report.checks.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (selectedCategory !== "all" && c.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesMsg = c.message.toLowerCase().includes(q);
        const matchesCat = c.category.toLowerCase().includes(q);
        return matchesName || matchesMsg || matchesCat;
      }
      return true;
    });
  }, [report, statusFilter, selectedCategory, searchQuery]);

  // Unique categories in report
  const categories = useMemo(() => {
    if (!report) return [];
    return Array.from(new Set(report.checks.map((c) => c.category)));
  }, [report]);

  return (
    <div
      className="test-evaluation-studio"
      style={{
        padding: "20px 24px",
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <FlaskConical size={22} style={{ color: "var(--accent)" }} /> Test & Evaluation Studio
            </h1>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: "#FEF3C7",
                color: "#92400E",
                border: "1px solid #FDE68A",
                fontWeight: 600,
              }}
              title="Static verification & deterministic mock test cases. Does not make live LLM API calls."
            >
              Deterministic Mock & Static Evaluation • No Live Model APIs
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            Validate Skills, Agents, and Harness Pipelines against schema contracts, structural constraints, policy boundaries, and configurable mock test scenarios.
          </p>
        </div>

        {/* Target Type Selector Buttons */}
        <div style={{ display: "flex", background: "var(--bg-secondary, #F1F5F9)", padding: 3, borderRadius: 6, border: "1px solid var(--border-color, #E2E8F0)" }}>
          <button
            className={`btn ${targetType === "skill" ? "primary" : "secondary"}`}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 4, border: "none" }}
            onClick={() => handleTypeChange("skill")}
          >
            <Sparkles size={13} style={{ marginRight: 6 }} /> Skills
          </button>
          <button
            className={`btn ${targetType === "agent" ? "primary" : "secondary"}`}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 4, border: "none" }}
            onClick={() => handleTypeChange("agent")}
          >
            <Bot size={13} style={{ marginRight: 6 }} /> Agents
          </button>
          <button
            className={`btn ${targetType === "pipeline" ? "primary" : "secondary"}`}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 4, border: "none" }}
            onClick={() => handleTypeChange("pipeline")}
          >
            <Workflow size={13} style={{ marginRight: 6 }} /> Pipelines
          </button>
        </div>
      </div>

      {/* Resource Target & Actions Control Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          background: "var(--card-bg, #FFFFFF)",
          padding: "12px 16px",
          borderRadius: 8,
          border: "1px solid var(--border-color, #E2E8F0)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 280 }}>
          <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
            Target {targetType === "skill" ? "Skill" : targetType === "agent" ? "Agent" : "Pipeline"}:
          </label>
          <select
            className="prop-select"
            style={{ width: "100%", maxWidth: 420, fontSize: 13, padding: "6px 10px" }}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={isLoading || isEvaluating}
          >
            {targetType === "skill" &&
              skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (v{s.version || "1.0.0"}) {s.author?.includes("Demo") ? "[Sample]" : ""}
                </option>
              ))}
            {targetType === "agent" &&
              agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (v{a.version || "1.0.0"}) {a.id.startsWith("agent-") ? "[Sample]" : ""}
                </option>
              ))}
            {targetType === "pipeline" &&
              workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (v{w.version || "1.0.0"} • {w.nodes?.length || 0} nodes) {w.id.startsWith("wf-") ? "[Sample]" : ""}
                </option>
              ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn secondary"
            style={{ padding: "6px 12px", fontSize: 12 }}
            onClick={() => setShowTestConfig((prev) => !prev)}
            title="Configure test cases and scenarios"
          >
            <SlidersHorizontal size={13} style={{ marginRight: 6 }} />
            {showTestConfig ? "Hide Test Config" : "Test Cases (" + customTestCases.length + ")"}
          </button>

          <button
            className="btn primary"
            style={{ padding: "6px 14px", fontSize: 12 }}
            onClick={() => runEvaluation()}
            disabled={isEvaluating || !selectedId}
          >
            <Play size={13} style={{ marginRight: 6 }} />
            {isEvaluating ? "Evaluating…" : "Run Evaluation"}
          </button>

          {report?.resourceLink && onNavigate && (
            <button
              className="btn secondary"
              style={{ padding: "6px 10px", fontSize: 12 }}
              onClick={() => onNavigate(report.resourceLink.route)}
              title="Open resource editor"
            >
              <ExternalLink size={13} style={{ marginRight: 4 }} /> View Resource
            </button>
          )}
        </div>
      </div>

      {/* Configurable Test Cases Panel (Collapsible) */}
      {showTestConfig && (
        <div
          style={{
            background: "var(--card-bg, #FFFFFF)",
            border: "1px solid var(--border-color, #E2E8F0)",
            borderRadius: 8,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Configurable Mock Scenarios & Test Cases
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                Declare input parameters to verify deterministic output expectations and schema bounds.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {customTestCases.map((tc) => (
              <div
                key={tc.id}
                style={{
                  background: "var(--bg-secondary, #F8FAFC)",
                  border: "1px solid var(--border-color, #E2E8F0)",
                  borderRadius: 6,
                  padding: 10,
                  fontSize: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{tc.name}</span>
                  <button
                    onClick={() => handleRemoveTestCase(tc.id)}
                    style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: 2 }}
                    title="Remove test case"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {tc.description && <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{tc.description}</div>}
                <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-secondary)" }}>
                  Payload: <code>{typeof tc.inputPayload === "string" ? tc.inputPayload : JSON.stringify(tc.inputPayload)}</code>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Test Case Input */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Test case name (e.g. Strict Mode Review)"
              value={newTcName}
              onChange={(e) => setNewTcName(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: "6px 10px", fontSize: 12, border: "1px solid var(--border-color, #CBD5E1)", borderRadius: 4 }}
            />
            <input
              type="text"
              placeholder='Input JSON payload (e.g. {"strict": true})'
              value={newTcInput}
              onChange={(e) => setNewTcInput(e.target.value)}
              style={{ flex: 2, minWidth: 260, padding: "6px 10px", fontSize: 12, border: "1px solid var(--border-color, #CBD5E1)", borderRadius: 4 }}
            />
            <button className="btn secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={handleAddTestCase}>
              <Plus size={13} style={{ marginRight: 4 }} /> Add Scenario
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      {report && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {/* Status Card */}
          <div
            style={{
              background: "var(--card-bg, #FFFFFF)",
              border: `1px solid ${
                report.overallStatus === "passed"
                  ? "#A7F3D0"
                  : report.overallStatus === "warning"
                    ? "#FDE68A"
                    : "#FECACA"
              }`,
              borderRadius: 8,
              padding: "12px 16px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Overall Evaluation Status
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              {report.overallStatus === "passed" && <CheckCircle2 size={20} style={{ color: "#10B981" }} />}
              {report.overallStatus === "warning" && <AlertTriangle size={20} style={{ color: "#F59E0B" }} />}
              {report.overallStatus === "failed" && <XCircle size={20} style={{ color: "#EF4444" }} />}
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color:
                    report.overallStatus === "passed"
                      ? "#065F46"
                      : report.overallStatus === "warning"
                        ? "#92400E"
                        : "#991B1B",
                }}
              >
                {report.overallStatus}
              </span>
            </div>
          </div>

          {/* Checks Count Card */}
          <div
            style={{
              background: "var(--card-bg, #FFFFFF)",
              border: "1px solid var(--border-color, #E2E8F0)",
              borderRadius: 8,
              padding: "12px 16px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Checks Performed
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
              {report.metrics.totalChecks}
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginLeft: 6 }}>
                ({report.metrics.passedChecks} passed, {report.metrics.failedChecks} failed, {report.metrics.warningChecks} warnings)
              </span>
            </div>
          </div>

          {/* Duration & Timestamp Card */}
          <div
            style={{
              background: "var(--card-bg, #FFFFFF)",
              border: "1px solid var(--border-color, #E2E8F0)",
              borderRadius: 8,
              padding: "12px 16px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Execution & Timestamp
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 6 }}>
              {report.metrics.durationMs}ms duration
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
              {new Date(report.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {/* Traceability Card */}
          <div
            style={{
              background: "var(--card-bg, #FFFFFF)",
              border: "1px solid var(--border-color, #E2E8F0)",
              borderRadius: 8,
              padding: "12px 16px",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Resource Traceability
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>
              {report.targetName}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
              <code>{report.targetId}</code> • v{report.targetVersion}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar for Checks */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          borderBottom: "1px solid var(--border-color, #E2E8F0)",
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "failed", "warning", "passed"] as const).map((statusKey) => (
            <button
              key={statusKey}
              className={`btn ${statusFilter === statusKey ? "primary" : "secondary"}`}
              style={{ padding: "4px 10px", fontSize: 12, borderRadius: 4 }}
              onClick={() => setStatusFilter(statusKey)}
            >
              {statusKey === "all" && "All Checks"}
              {statusKey === "failed" && `Failed (${report?.metrics.failedChecks || 0})`}
              {statusKey === "warning" && `Warnings (${report?.metrics.warningChecks || 0})`}
              {statusKey === "passed" && `Passed (${report?.metrics.passedChecks || 0})`}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Category Dropdown */}
          <select
            className="prop-select"
            style={{ fontSize: 12, padding: "4px 8px" }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 8, top: 8, color: "var(--text-secondary)" }} />
            <input
              type="text"
              placeholder="Search checks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "4px 8px 4px 26px",
                fontSize: 12,
                borderRadius: 4,
                border: "1px solid var(--border-color, #CBD5E1)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Checks Results List */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredChecks.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              background: "var(--card-bg, #FFFFFF)",
              borderRadius: 8,
              border: "1px solid var(--border-color, #E2E8F0)",
            }}
          >
            <CheckCircle2 size={32} style={{ color: "#10B981", margin: "0 auto 8px" }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              No issues matching current filter.
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
              Try switching filters or selecting another resource to evaluate.
            </div>
          </div>
        ) : (
          filteredChecks.map((check) => {
            const isPassed = check.status === "passed";
            const isFailed = check.status === "failed";
            const isWarning = check.status === "warning";

            return (
              <div
                key={check.id}
                style={{
                  background: "var(--card-bg, #FFFFFF)",
                  borderRadius: 6,
                  border: `1px solid ${
                    isFailed ? "#FECACA" : isWarning ? "#FDE68A" : "var(--border-color, #E2E8F0)"
                  }`,
                  padding: "10px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isPassed && <CheckCircle2 size={15} style={{ color: "#10B981", flexShrink: 0 }} />}
                    {isFailed && <XCircle size={15} style={{ color: "#EF4444", flexShrink: 0 }} />}
                    {isWarning && <AlertTriangle size={15} style={{ color: "#F59E0B", flexShrink: 0 }} />}

                    <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                      {check.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "var(--bg-secondary, #F1F5F9)",
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        fontWeight: 600,
                      }}
                    >
                      {check.category.replace(/_/g, " ")}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: isPassed ? "#10B981" : isFailed ? "#EF4444" : "#F59E0B",
                    }}
                  >
                    {check.status}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 23 }}>
                  {check.message}
                </div>

                {check.suggestedCorrection && (
                  <div
                    style={{
                      marginLeft: 23,
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      borderRadius: 4,
                      padding: "6px 10px",
                      fontSize: 11,
                      color: "#1E40AF",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                    }}
                  >
                    <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>Suggested Correction:</strong> {check.suggestedCorrection}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Static / Mock Evaluation Transparency Disclaimer */}
      <div
        style={{
          background: "var(--bg-secondary, #F8FAFC)",
          border: "1px solid var(--border-color, #E2E8F0)",
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 11,
          color: "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <ShieldAlert size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />
        <span>
          <strong>Evaluation Model Disclaimer:</strong> Static deterministic validation and mock scenario evaluation. Does not benchmark live model generation quality or require external API keys. Results are strictly traceable to the resource specification and declared version.
        </span>
      </div>
    </div>
  );
};
