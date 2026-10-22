import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  FileCode2,
  ShieldAlert,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Bot,
  Sparkles,
  UserCheck,
  GitBranch,
  ArrowRightLeft,
  Clock,
  RotateCcw,
  Shield,
  HelpCircle,
  Plus,
  X,
  Play,
  FileText,
  CalendarDays,
  Split,
  GitMerge,
  PackageCheck,
} from "lucide-react";
import { getNodeDefinition, VALID_CONDITION_TYPES, ValidConditionType } from "./nodeDefinitions";
import { validateNodeLocally } from "../../services/workflowsService";
import { getAgentsStore } from "../../services/agentsService";
import { getSkillsStore } from "../../services/skillsService";
import { AgentSelectionModal } from "./AgentSelectionModal";
import { SkillSelectionModal } from "./SkillSelectionModal";
import type {
  WorkflowNode,
  Agent,
  Skill,
  NodeContractSchema,
  NodeRetryPolicy,
  NodeApprovalPolicy,
  NodeErrorHandling,
} from "../../types";

export interface NodeConfigurationPanelProps {
  node: WorkflowNode;
  allNodes: WorkflowNode[];
  onUpdateNode: (nodeId: string, patch: Partial<WorkflowNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose?: () => void;
}

type ConfigTab = "config" | "contracts" | "policies";

export const NodeConfigurationPanel: React.FC<NodeConfigurationPanelProps> = ({
  node,
  allNodes,
  onUpdateNode,
  onDeleteNode,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ConfigTab>("config");
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);

  const def = getNodeDefinition(node.type);
  const cfg = node.configuration || {};

  // Load available agents and skills for dropdowns & inspections
  useEffect(() => {
    let mounted = true;
    async function fetchLookups() {
      setLoadingLookups(true);
      try {
        const agentsStore = getAgentsStore();
        const skillsStore = getSkillsStore();
        const [agents, skills] = await Promise.all([
          agentsStore.list().catch(() => []),
          skillsStore.list().catch(() => []),
        ]);
        if (mounted) {
          setAvailableAgents(agents);
          setAvailableSkills(skills);
        }
      } finally {
        if (mounted) setLoadingLookups(false);
      }
    }
    fetchLookups();
    return () => {
      mounted = false;
    };
  }, []);

  // Real-time live validation for this node
  const validation = useMemo(() => {
    return validateNodeLocally(node, allNodes);
  }, [node, allNodes]);

  // Selected agent details (if agent_execution)
  const selectedAgent = useMemo(() => {
    const aid = (cfg.agentId as string) || "";
    return availableAgents.find((a) => a.id === aid);
  }, [availableAgents, cfg.agentId]);

  // Assigned skills of selected agent
  const agentSkills = useMemo(() => {
    if (!selectedAgent) return [];
    const skillIds = new Set(selectedAgent.assignedSkillIds || []);
    return availableSkills.filter((s) => skillIds.has(s.id));
  }, [selectedAgent, availableSkills]);

  // Selected skill details (if skill_invocation)
  const selectedSkill = useMemo(() => {
    const sid = (cfg.skillId as string) || "";
    return availableSkills.find((s) => s.id === sid);
  }, [availableSkills, cfg.skillId]);

  // Helper for updating node configuration dictionary
  const updateConfig = (key: string, value: unknown) => {
    onUpdateNode(node.id, {
      configuration: {
        ...cfg,
        [key]: value,
      },
    });
  };

  // Helper for updating input contract
  const updateInputContract = (patch: Partial<NodeContractSchema>) => {
    const current = node.inputContract || { schema: { type: "object" } };
    onUpdateNode(node.id, {
      inputContract: {
        ...current,
        ...patch,
      },
    });
  };

  // Helper for updating output contract
  const updateOutputContract = (patch: Partial<NodeContractSchema>) => {
    const current = node.outputContract || { schema: { type: "object" } };
    onUpdateNode(node.id, {
      outputContract: {
        ...current,
        ...patch,
      },
    });
  };

  // Helper for updating retry policy
  const updateRetryPolicy = (patch: Partial<NodeRetryPolicy>) => {
    const current = node.retryPolicy || { enabled: false, maxRetries: 2, backoffSeconds: 5 };
    onUpdateNode(node.id, {
      retryPolicy: {
        ...current,
        ...patch,
      },
    });
  };

  // Helper for updating approval policy
  const updateApprovalPolicy = (patch: Partial<NodeApprovalPolicy>) => {
    const current = node.approvalPolicy || { required: false, approverRole: "Tech Lead", timeoutMinutes: 60 };
    onUpdateNode(node.id, {
      approvalPolicy: {
        ...current,
        ...patch,
      },
    });
  };

  // Helper for updating error handling
  const updateErrorHandling = (patch: Partial<NodeErrorHandling>) => {
    const current = node.errorHandling || { action: "halt" };
    onUpdateNode(node.id, {
      errorHandling: {
        ...current,
        ...patch,
      },
    });
  };

  return (
    <div className="node-config-panel" aria-label={`Configuration for ${node.name}`}>
      {/* Panel Header */}
      <div className="properties-header" style={{ borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: def.bgLight,
              color: def.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <def.icon size={14} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {node.name || "Untitled Node"}
            </span>
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              ID: {node.id} • {def.label}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button
            className="btn danger"
            style={{ padding: "4px 8px", fontSize: 11 }}
            title="Delete this node from workflow"
            onClick={() => onDeleteNode(node.id)}
          >
            <Trash2 size={12} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}
              title="Close panel"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Validation Banner if errors or warnings exist */}
      {validation.errors.length > 0 && (
        <div
          style={{
            margin: "10px 14px 0",
            padding: "8px 12px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 6,
            fontSize: 11,
            color: "#991B1B",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
            <AlertCircle size={13} style={{ color: "#E53E3E" }} />
            <span>Configuration Issues ({validation.errors.length})</span>
          </div>
          {validation.errors.map((err, i) => (
            <div key={i} style={{ paddingLeft: 18 }}>• {err.message}</div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          padding: "0 14px",
          background: "var(--surface)",
          gap: 16,
          marginTop: 8,
        }}
      >
        <button
          className={`tab-btn ${activeTab === "config" ? "active" : ""}`}
          style={{
            background: "none",
            border: "none",
            padding: "8px 0",
            fontSize: 12,
            fontWeight: activeTab === "config" ? 600 : 500,
            color: activeTab === "config" ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: activeTab === "config" ? "2px solid var(--accent)" : "2px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onClick={() => setActiveTab("config")}
        >
          <Sliders size={13} /> Configuration
        </button>

        <button
          className={`tab-btn ${activeTab === "contracts" ? "active" : ""}`}
          style={{
            background: "none",
            border: "none",
            padding: "8px 0",
            fontSize: 12,
            fontWeight: activeTab === "contracts" ? 600 : 500,
            color: activeTab === "contracts" ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: activeTab === "contracts" ? "2px solid var(--accent)" : "2px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onClick={() => setActiveTab("contracts")}
        >
          <FileCode2 size={13} /> Contracts
        </button>

        <button
          className={`tab-btn ${activeTab === "policies" ? "active" : ""}`}
          style={{
            background: "none",
            border: "none",
            padding: "8px 0",
            fontSize: 12,
            fontWeight: activeTab === "policies" ? 600 : 500,
            color: activeTab === "policies" ? "var(--accent)" : "var(--text-secondary)",
            borderBottom: activeTab === "policies" ? "2px solid var(--accent)" : "2px solid transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onClick={() => setActiveTab("policies")}
        >
          <ShieldAlert size={13} /> Policies
        </button>
      </div>

      {/* Tab Contents */}
      <div className="properties-body" style={{ padding: "16px 14px", overflowY: "auto", flex: 1 }}>
        {/* ==================== TAB 1: CONFIGURATION ==================== */}
        {activeTab === "config" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* General Identity */}
            <div className="prop-field">
              <label className="prop-label" htmlFor="nc-name">Display Name *</label>
              <input
                id="nc-name"
                className="prop-input"
                value={node.name || ""}
                onChange={(e) => onUpdateNode(node.id, { name: e.target.value })}
                placeholder="e.g. Architecture Agent"
              />
            </div>

            <div className="prop-field">
              <label className="prop-label" htmlFor="nc-desc">Description</label>
              <textarea
                id="nc-desc"
                className="prop-textarea"
                style={{ minHeight: 48 }}
                value={node.description || ""}
                onChange={(e) => onUpdateNode(node.id, { description: e.target.value })}
                placeholder="Node duty and role in pipeline..."
              />
            </div>

            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

            {/* NODE-SPECIFIC CONFIGURATION SECTIONS */}

            {/* 1. AGENT EXECUTION */}
            {(node.type === "agent_execution" || node.type === "agent") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                    <Bot size={14} style={{ color: "var(--accent)" }} /> Agent Configuration
                  </div>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ fontSize: 11, padding: "3px 8px" }}
                    onClick={() => setIsAgentModalOpen(true)}
                  >
                    Browse Catalog...
                  </button>
                </div>

                <div className="prop-field">
                  <label className="prop-label">Assigned Agent Worker *</label>

                  {/* Interactive Agent Card / Picker Button */}
                  <div
                    onClick={() => setIsAgentModalOpen(true)}
                    style={{
                      background: selectedAgent ? "var(--surface-alt)" : "var(--surface)",
                      border: selectedAgent ? "1.5px solid var(--accent)" : "1px dashed var(--border)",
                      borderRadius: 8,
                      padding: 12,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      transition: "all 0.15s ease",
                    }}
                    title="Click to open 2-panel agent catalog"
                  >
                    {selectedAgent ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 6,
                                background: "#EFF6FF",
                                color: "var(--accent)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Bot size={16} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                                {selectedAgent.name}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                                {selectedAgent.role} • v{selectedAgent.version || "1.0.0"}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ fontSize: 10, padding: "2px 6px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAgentModalOpen(true);
                            }}
                          >
                            Change
                          </button>
                        </div>

                        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          {selectedAgent.objective || selectedAgent.description}
                        </div>

                        {/* Assigned Skills */}
                        {agentSkills.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                            {agentSkills.map((s) => (
                              <span
                                key={s.id}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  padding: "1px 6px",
                                  background: "#F5F3FF",
                                  color: "#6D28D9",
                                  borderRadius: 4,
                                  fontSize: 10,
                                }}
                              >
                                <Sparkles size={9} /> {s.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", color: "var(--accent)" }}>
                        <Bot size={16} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Click to Select Agent from Catalog</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-role-override">Role Specialization</label>
                  <input
                    id="nc-role-override"
                    className="prop-input"
                    value={(cfg.role as string) || ""}
                    onChange={(e) => updateConfig("role", e.target.value)}
                    placeholder="e.g. Lead Architect"
                  />
                </div>
              </div>
            )}

            {/* 2. SKILL INVOCATION */}
            {(node.type === "skill_invocation" || node.type === "skill") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                    <Sparkles size={14} style={{ color: "#7C3AED" }} /> Skill Invocation Settings
                  </div>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ fontSize: 11, padding: "3px 8px" }}
                    onClick={() => setIsSkillModalOpen(true)}
                  >
                    Browse Catalog...
                  </button>
                </div>

                <div className="prop-field">
                  <label className="prop-label">Assigned Reusable Skill *</label>

                  {/* Interactive Skill Card / Picker Button */}
                  <div
                    onClick={() => setIsSkillModalOpen(true)}
                    style={{
                      background: selectedSkill ? "var(--surface-alt)" : "var(--surface)",
                      border: selectedSkill ? "1.5px solid #7C3AED" : "1px dashed var(--border)",
                      borderRadius: 8,
                      padding: 12,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      transition: "all 0.15s ease",
                    }}
                    title="Click to open 2-panel skill catalog"
                  >
                    {selectedSkill ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 6,
                                background: "#F5F3FF",
                                color: "#7C3AED",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Sparkles size={16} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                                {selectedSkill.name}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                                {selectedSkill.category} • v{selectedSkill.version || "1.0.0"}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ fontSize: 10, padding: "2px 6px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsSkillModalOpen(true);
                            }}
                          >
                            Change
                          </button>
                        </div>

                        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                          {selectedSkill.description}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", color: "#7C3AED" }}>
                        <Sparkles size={16} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>Click to Select Skill from Catalog</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. HUMAN APPROVAL */}
            {(node.type === "human_approval" || node.type === "approval") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <UserCheck size={14} style={{ color: "#D97706" }} /> Human Approval Configuration
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-approver-role">Designated Approver Role *</label>
                  <input
                    id="nc-approver-role"
                    className="prop-input"
                    value={(cfg.approverRole as string) || ""}
                    onChange={(e) => updateConfig("approverRole", e.target.value)}
                    placeholder="e.g. Engineering Lead / Tech Lead"
                  />
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-what-approved">What Is Being Approved *</label>
                  <input
                    id="nc-what-approved"
                    className="prop-input"
                    value={(cfg.whatIsBeingApproved as string) || ""}
                    onChange={(e) => updateConfig("whatIsBeingApproved", e.target.value)}
                    placeholder="e.g. Architecture plan and component contracts"
                  />
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-approval-msg">Approval Prompt Message *</label>
                  <textarea
                    id="nc-approval-msg"
                    className="prop-textarea"
                    value={(cfg.approvalMessage as string) || (cfg.message as string) || ""}
                    onChange={(e) => {
                      updateConfig("approvalMessage", e.target.value);
                      updateConfig("message", e.target.value);
                    }}
                    placeholder="Provide detailed instructions and criteria for the approver..."
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div className="prop-field">
                    <label className="prop-label" htmlFor="nc-on-approve">On Approve</label>
                    <select
                      id="nc-on-approve"
                      className="prop-select"
                      value={(cfg.onApprove as string) || "proceed"}
                      onChange={(e) => updateConfig("onApprove", e.target.value)}
                    >
                      <option value="proceed">Proceed directly</option>
                      <option value="proceed_with_notes">Proceed with notes</option>
                    </select>
                  </div>

                  <div className="prop-field">
                    <label className="prop-label" htmlFor="nc-on-reject">On Reject</label>
                    <select
                      id="nc-on-reject"
                      className="prop-select"
                      value={(cfg.onReject as string) || "halt"}
                      onChange={(e) => updateConfig("onReject", e.target.value)}
                    >
                      <option value="halt">Halt Pipeline</option>
                      <option value="request_revision">Request Revision</option>
                      <option value="route_to_fallback">Route to Fallback</option>
                    </select>
                  </div>
                </div>

                {cfg.onReject === "route_to_fallback" && (
                  <div className="prop-field">
                    <label className="prop-label" htmlFor="nc-reject-fallback">Fallback Node on Rejection</label>
                    <select
                      id="nc-reject-fallback"
                      className="prop-select"
                      value={(cfg.fallbackNodeId as string) || ""}
                      onChange={(e) => updateConfig("fallbackNodeId", e.target.value)}
                    >
                      <option value="">-- Select Fallback Node --</option>
                      {allNodes.filter((n) => n.id !== node.id).map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name} ({n.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* 4. CONDITION / BRANCH */}
            {(node.type === "condition_branch" || node.type === "decision") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <GitBranch size={14} style={{ color: "#9333EA" }} /> Condition & Branch Routing
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-cond-type">Condition Type *</label>
                  <select
                    id="nc-cond-type"
                    className="prop-select"
                    value={(cfg.conditionType as string) || "expression"}
                    onChange={(e) => updateConfig("conditionType", e.target.value)}
                  >
                    <option value="expression">JavaScript Expression (outcome.success == true)</option>
                    <option value="field_match">Field Match (property == target)</option>
                    <option value="status_check">Status Check (task.status == &apos;passed&apos;)</option>
                    <option value="threshold">Threshold Check (score &gt;= 0.85)</option>
                  </select>
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-cond-expr">Condition Expression / Value *</label>
                  <input
                    id="nc-cond-expr"
                    className="prop-input"
                    value={(cfg.conditionExpression as string) || (cfg.conditionValue as string) || ""}
                    onChange={(e) => {
                      updateConfig("conditionExpression", e.target.value);
                      updateConfig("conditionValue", e.target.value);
                    }}
                    placeholder="e.g. review.score >= 0.9 && security.vulnerabilities == 0"
                  />
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-branches">Valid Branch Outputs (Comma-separated) *</label>
                  <input
                    id="nc-branches"
                    className="prop-input"
                    value={Array.isArray(cfg.branches) ? cfg.branches.join(", ") : "true, false"}
                    onChange={(e) =>
                      updateConfig(
                        "branches",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="e.g. true, false or approved, rejected, escalate"
                  />
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                    Connect these branch names to target nodes on canvas.
                  </span>
                </div>
              </div>
            )}

            {/* 5. CONTEXT HANDOFF */}
            {(node.type === "context_handoff" || node.type === "handoff") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <ArrowRightLeft size={14} style={{ color: "#0891B2" }} /> Context Handoff Filtering
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    id="nc-inc-mem"
                    type="checkbox"
                    checked={cfg.includeMemory !== false}
                    onChange={(e) => updateConfig("includeMemory", e.target.checked)}
                  />
                  <label htmlFor="nc-inc-mem" style={{ fontSize: 12, color: "var(--text-primary)", cursor: "pointer" }}>
                    Include prior execution memory & conversation history
                  </label>
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-fwd-fields">Forwarded Fields (Comma-separated)</label>
                  <input
                    id="nc-fwd-fields"
                    className="prop-input"
                    value={Array.isArray(cfg.forwardFields) ? cfg.forwardFields.join(", ") : ""}
                    onChange={(e) =>
                      updateConfig(
                        "forwardFields",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="e.g. architectureDoc, planMilestones, testResults"
                  />
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-fwd-artifacts">Forwarded Artifacts (Comma-separated)</label>
                  <input
                    id="nc-fwd-artifacts"
                    className="prop-input"
                    value={Array.isArray(cfg.forwardArtifacts) ? cfg.forwardArtifacts.join(", ") : ""}
                    onChange={(e) =>
                      updateConfig(
                        "forwardArtifacts",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="e.g. dist/release-bundle.json, reports/audit.md"
                  />
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-context-mapping">Context Transformations (JSON Map)</label>
                  <textarea
                    id="nc-context-mapping"
                    className="prop-textarea"
                    style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
                    value={
                      typeof cfg.contextMapping === "object" && cfg.contextMapping !== null
                        ? JSON.stringify(cfg.contextMapping, null, 2)
                        : (cfg.contextMapping as string) || ""
                    }
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateConfig("contextMapping", parsed);
                      } catch {
                        updateConfig("contextMapping", e.target.value);
                      }
                    }}
                    placeholder='{ "downstreamInput": "upstreamOutput.data" }'
                  />
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                    Maps incoming upstream context fields to downstream parameter keys.
                  </span>
                </div>
              </div>
            )}

            {/* 6. START NODE */}
            {node.type === "start" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <Play size={14} style={{ color: "#059669" }} /> Pipeline Entry Trigger
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-trigger">Trigger Mode</label>
                  <select
                    id="nc-trigger"
                    className="prop-select"
                    value={(cfg.trigger as string) || "manual"}
                    onChange={(e) => updateConfig("trigger", e.target.value)}
                  >
                    <option value="manual">Manual Trigger</option>
                    <option value="cron">Scheduled Cron</option>
                    <option value="webhook">Webhook Listener</option>
                    <option value="event">Workspace Event</option>
                  </select>
                </div>
                {cfg.trigger === "cron" && (
                  <div className="prop-field">
                    <label className="prop-label" htmlFor="nc-cron">Cron Expression</label>
                    <input
                      id="nc-cron"
                      className="prop-input"
                      value={(cfg.cronExpression as string) || "0 0 * * *"}
                      onChange={(e) => updateConfig("cronExpression", e.target.value)}
                      placeholder="e.g. 0 0 * * *"
                    />
                  </div>
                )}
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-start-payload">Default Input Format</label>
                  <select
                    id="nc-start-payload"
                    className="prop-select"
                    value={(cfg.inputFormat as string) || "json"}
                    onChange={(e) => updateConfig("inputFormat", e.target.value)}
                  >
                    <option value="json">JSON Object</option>
                    <option value="plaintext">Plain Text</option>
                    <option value="empty">No Input Required</option>
                  </select>
                </div>
              </div>
            )}

            {/* 7. REQUIREMENT INPUT */}
            {(node.type === "requirement_input" || node.type === "input") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <FileText size={14} style={{ color: "#0284C7" }} /> Requirement Ingestion Settings
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-req-source">Requirement Source</label>
                  <select
                    id="nc-req-source"
                    className="prop-select"
                    value={(cfg.source as string) || "User Story"}
                    onChange={(e) => updateConfig("source", e.target.value)}
                  >
                    <option value="User Story">User Story / Product Spec</option>
                    <option value="Issue Ticket">Issue Ticket / Bug Report</option>
                    <option value="Design Doc">Design Document / RFC</option>
                    <option value="Manual Prompt">Manual Developer Prompt</option>
                  </select>
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-req-format">Intake Format</label>
                  <select
                    id="nc-req-format"
                    className="prop-select"
                    value={(cfg.intakeFormat as string) || "markdown"}
                    onChange={(e) => updateConfig("intakeFormat", e.target.value)}
                  >
                    <option value="markdown">Markdown Document</option>
                    <option value="json">Structured JSON Schema</option>
                    <option value="plaintext">Plain Text</option>
                  </select>
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-req-template">Prompt / Acceptance Template</label>
                  <textarea
                    id="nc-req-template"
                    className="prop-textarea"
                    value={(cfg.template as string) || ""}
                    onChange={(e) => updateConfig("template", e.target.value)}
                    placeholder="e.g. As a developer, I want... Acceptance Criteria: 1. ..."
                  />
                </div>
              </div>
            )}

            {/* 8. PLANNING */}
            {node.type === "planning" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <CalendarDays size={14} style={{ color: "#2563EB" }} /> Multi-Step Planning Configuration
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-plan-agent">Planning Agent Worker *</label>
                  <select
                    id="nc-plan-agent"
                    className="prop-select"
                    value={(cfg.agentId as string) || "agent-planning"}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const matched = availableAgents.find((a) => a.id === selectedId);
                      onUpdateNode(node.id, {
                        configuration: {
                          ...cfg,
                          agentId: selectedId,
                          role: matched ? matched.role : (cfg.role || "Planning Specialist"),
                        },
                      });
                    }}
                  >
                    <option value="">-- Select Planning Agent --</option>
                    {availableAgents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-plan-strategy">Decomposition Strategy</label>
                  <select
                    id="nc-plan-strategy"
                    className="prop-select"
                    value={(cfg.strategy as string) || "milestone_breakdown"}
                    onChange={(e) => updateConfig("strategy", e.target.value)}
                  >
                    <option value="milestone_breakdown">Milestone Breakdown (Sequential)</option>
                    <option value="dependency_graph">Dependency Directed Graph</option>
                    <option value="task_list">Flat Actionable Task List</option>
                    <option value="hierarchical">Hierarchical Epic & Subtasks</option>
                  </select>
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-plan-max">Max Milestones</label>
                  <input
                    id="nc-plan-max"
                    type="number"
                    min={1}
                    max={20}
                    className="prop-input"
                    value={(cfg.maxMilestones as number) || 5}
                    onChange={(e) => updateConfig("maxMilestones", parseInt(e.target.value, 10) || 5)}
                  />
                </div>
              </div>
            )}

            {/* 9. PARALLEL EXECUTION */}
            {node.type === "parallel_execution" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <Split size={14} style={{ color: "#C026D3" }} /> Parallel Concurrency Fork
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-parallel-max">Max Concurrency (Paths)</label>
                  <input
                    id="nc-parallel-max"
                    type="number"
                    min={2}
                    max={10}
                    className="prop-input"
                    value={(cfg.maxConcurrency as number) || 3}
                    onChange={(e) => updateConfig("maxConcurrency", parseInt(e.target.value, 10) || 3)}
                  />
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-parallel-mode">Execution Mode</label>
                  <select
                    id="nc-parallel-mode"
                    className="prop-select"
                    value={(cfg.executionMode as string) || "all_settled"}
                    onChange={(e) => updateConfig("executionMode", e.target.value)}
                  >
                    <option value="all_settled">All Settled (Wait for all branches)</option>
                    <option value="all_success">All Success (Halt on any branch failure)</option>
                    <option value="first_completed">First Completed (Race / Fast exit)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 10. MERGE RESULTS */}
            {node.type === "merge_results" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <GitMerge size={14} style={{ color: "#DB2777" }} /> Branch Join & Result Synthesis
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-merge-strat">Merge Strategy</label>
                  <select
                    id="nc-merge-strat"
                    className="prop-select"
                    value={(cfg.strategy as string) || "combine_all"}
                    onChange={(e) => updateConfig("strategy", e.target.value)}
                  >
                    <option value="combine_all">Combine All Objects (Object.assign / Deep Merge)</option>
                    <option value="concat_arrays">Concatenate Arrays</option>
                    <option value="prioritize_first">Prioritize First Branch Output</option>
                    <option value="reduce_object">Custom Reduction</option>
                  </select>
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-conflict">Conflict Resolution Policy</label>
                  <select
                    id="nc-conflict"
                    className="prop-select"
                    value={(cfg.conflictResolution as string) || "overwrite"}
                    onChange={(e) => updateConfig("conflictResolution", e.target.value)}
                  >
                    <option value="overwrite">Overwrite with Latest Output</option>
                    <option value="keep_first">Retain Earliest Output</option>
                    <option value="fail_on_conflict">Raise Error on Property Collision</option>
                  </select>
                </div>
              </div>
            )}

            {/* 11. VALIDATION NODE */}
            {node.type === "validation" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <Shield size={14} style={{ color: "#16A34A" }} /> Quality Assertion Gate
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-assertion">Assertion Criteria *</label>
                  <input
                    id="nc-assertion"
                    className="prop-input"
                    value={(cfg.assertion as string) || ""}
                    onChange={(e) => updateConfig("assertion", e.target.value)}
                    placeholder="e.g. All test suites pass 100% with no regression"
                  />
                </div>

                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-assertion-fail">Failure Policy</label>
                  <select
                    id="nc-assertion-fail"
                    className="prop-select"
                    value={(cfg.failurePolicy as string) || "stop"}
                    onChange={(e) => updateConfig("failurePolicy", e.target.value)}
                  >
                    <option value="stop">Halt Pipeline (Fail)</option>
                    <option value="continue">Log Warning & Continue</option>
                    <option value="retry">Trigger Retry Loop</option>
                  </select>
                </div>
              </div>
            )}

            {/* 12. RETRY NODE */}
            {node.type === "retry" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <RotateCcw size={14} style={{ color: "#EA580C" }} /> Retry Loop Gate
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div className="prop-field">
                    <label className="prop-label" htmlFor="nc-retry-node-max">Max Retries</label>
                    <input
                      id="nc-retry-node-max"
                      type="number"
                      min={1}
                      max={10}
                      className="prop-input"
                      value={(cfg.maxRetries as number) || 3}
                      onChange={(e) => updateConfig("maxRetries", parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div className="prop-field">
                    <label className="prop-label" htmlFor="nc-retry-node-backoff">Backoff (s)</label>
                    <input
                      id="nc-retry-node-backoff"
                      type="number"
                      min={1}
                      max={120}
                      className="prop-input"
                      value={(cfg.backoffSeconds as number) || 5}
                      onChange={(e) => updateConfig("backoffSeconds", parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-retry-node-mode">Backoff Algorithm</label>
                  <select
                    id="nc-retry-node-mode"
                    className="prop-select"
                    value={(cfg.backoffMode as string) || "exponential"}
                    onChange={(e) => updateConfig("backoffMode", e.target.value)}
                  >
                    <option value="exponential">Exponential Backoff (2^n * s)</option>
                    <option value="linear">Linear Backoff (n * s)</option>
                    <option value="fixed">Fixed Interval (s)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 13. ARTIFACT OUTPUT */}
            {(node.type === "artifact_output" || node.type === "output") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <PackageCheck size={14} style={{ color: "#2563EB" }} /> Artifact Output Packaging
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-art-path">Artifact Path / Destination *</label>
                  <input
                    id="nc-art-path"
                    className="prop-input"
                    value={(cfg.artifactPath as string) || ""}
                    onChange={(e) => updateConfig("artifactPath", e.target.value)}
                    placeholder="e.g. dist/release-bundle.json"
                  />
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-art-name">Deliverable Name</label>
                  <input
                    id="nc-art-name"
                    className="prop-input"
                    value={(cfg.artifactName as string) || ""}
                    onChange={(e) => updateConfig("artifactName", e.target.value)}
                    placeholder="e.g. Enterprise Feature Bundle"
                  />
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-art-target">Publish Target</label>
                  <select
                    id="nc-art-target"
                    className="prop-select"
                    value={(cfg.publishTarget as string) || "Repository"}
                    onChange={(e) => updateConfig("publishTarget", e.target.value)}
                  >
                    <option value="Repository">Git Repository Filesystem</option>
                    <option value="Workspace">Workspace Directory</option>
                    <option value="Pull Request">Pull Request / Branch</option>
                    <option value="Distribution">Distribution Package (.zip / .tar.gz)</option>
                  </select>
                </div>
              </div>
            )}

            {/* 14. END NODE */}
            {node.type === "end" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  <CheckCircle2 size={14} style={{ color: "#475569" }} /> Terminal Exit Point
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-term-status">Exit Status Code</label>
                  <select
                    id="nc-term-status"
                    className="prop-select"
                    value={(cfg.terminalStatus as string) || "Succeeded"}
                    onChange={(e) => updateConfig("terminalStatus", e.target.value)}
                  >
                    <option value="Succeeded">Succeeded (Clean Exit)</option>
                    <option value="Completed With Warnings">Completed With Warnings</option>
                    <option value="Halted">Halted / Terminated</option>
                  </select>
                </div>
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-term-summary">Completion Deliverable Message</label>
                  <textarea
                    id="nc-term-summary"
                    className="prop-textarea"
                    value={(cfg.completionMessage as string) || ""}
                    onChange={(e) => updateConfig("completionMessage", e.target.value)}
                    placeholder="e.g. All pipeline gates satisfied. Ready for production deployment."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: DATA CONTRACTS ==================== */}
        {activeTab === "contracts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Input Contract */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Input Contract</span>
                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Schema & Ingestion</span>
              </div>

              <div className="prop-field">
                <label className="prop-label" htmlFor="nc-ic-desc">Input Description</label>
                <input
                  id="nc-ic-desc"
                  className="prop-input"
                  value={node.inputContract?.description || ""}
                  onChange={(e) => updateInputContract({ description: e.target.value })}
                  placeholder="Expected input semantics..."
                />
              </div>

              <div className="prop-field">
                <label className="prop-label" htmlFor="nc-ic-req">Required Fields (Comma-separated)</label>
                <input
                  id="nc-ic-req"
                  className="prop-input"
                  value={node.inputContract?.requiredFields ? node.inputContract.requiredFields.join(", ") : ""}
                  onChange={(e) =>
                    updateInputContract({
                      requiredFields: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. requirements, prompt, diff"
                />
              </div>

              <div className="prop-field">
                <label className="prop-label" htmlFor="nc-ic-example">Example Input Payload (JSON)</label>
                <textarea
                  id="nc-ic-example"
                  className="prop-textarea"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
                  value={
                    typeof node.inputContract?.examplePayload === "string"
                      ? node.inputContract.examplePayload
                      : JSON.stringify(node.inputContract?.examplePayload || {}, null, 2)
                  }
                  onChange={(e) => updateInputContract({ examplePayload: e.target.value })}
                  placeholder='{ "requirementText": "Add OAuth2 integration" }'
                />
              </div>
            </div>

            {/* Output Contract */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>Output Contract</span>
                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Guaranteed Deliverable</span>
              </div>

              <div className="prop-field">
                <label className="prop-label" htmlFor="nc-oc-desc">Output Description</label>
                <input
                  id="nc-oc-desc"
                  className="prop-input"
                  value={node.outputContract?.description || ""}
                  onChange={(e) => updateOutputContract({ description: e.target.value })}
                  placeholder="Produced artifact or state semantics..."
                />
              </div>

              <div className="prop-field">
                <label className="prop-label" htmlFor="nc-oc-schema">Output Schema (JSON)</label>
                <textarea
                  id="nc-oc-schema"
                  className="prop-textarea"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
                  value={JSON.stringify(node.outputContract?.schema || { type: "object", properties: {} }, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      updateOutputContract({ schema: parsed });
                    } catch {
                      // allow drafting in progress
                    }
                  }}
                  placeholder='{ "type": "object", "properties": { "result": { "type": "string" } } }'
                />
              </div>

              <div className="prop-field">
                <label className="prop-label" htmlFor="nc-oc-example">Example Output Payload (JSON)</label>
                <textarea
                  id="nc-oc-example"
                  className="prop-textarea"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
                  value={
                    typeof node.outputContract?.examplePayload === "string"
                      ? node.outputContract.examplePayload
                      : JSON.stringify(node.outputContract?.examplePayload || {}, null, 2)
                  }
                  onChange={(e) => updateOutputContract({ examplePayload: e.target.value })}
                  placeholder='{ "diff": "...", "modifiedFiles": ["src/auth.ts"] }'
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: POLICIES & RUNTIME ==================== */}
        {activeTab === "policies" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Timeout Configuration */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                <Clock size={14} style={{ color: "var(--accent)" }} /> Execution Timeout
              </div>

              <div className="prop-field">
                <label className="prop-label" htmlFor="nc-timeout">Max Node Duration (Seconds)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    id="nc-timeout"
                    type="number"
                    min={1}
                    max={86400}
                    className="prop-input"
                    value={node.timeoutSeconds ?? 300}
                    onChange={(e) => onUpdateNode(node.id, { timeoutSeconds: parseInt(e.target.value, 10) || 60 })}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    ({Math.round(((node.timeoutSeconds ?? 300) / 60) * 10) / 10} min)
                  </span>
                </div>
              </div>
            </div>

            {/* Retry Policy */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                  <RotateCcw size={14} style={{ color: "#EA580C" }} /> Retry Policy
                </div>
                <input
                  type="checkbox"
                  id="nc-retry-enable"
                  checked={node.retryPolicy?.enabled ?? false}
                  onChange={(e) => updateRetryPolicy({ enabled: e.target.checked })}
                />
              </div>

              {node.retryPolicy?.enabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                  <div className="prop-field">
                    <label className="prop-label" htmlFor="nc-retries-count">Max Retries</label>
                    <input
                      id="nc-retries-count"
                      type="number"
                      min={0}
                      max={10}
                      className="prop-input"
                      value={node.retryPolicy?.maxRetries ?? 2}
                      onChange={(e) => updateRetryPolicy({ maxRetries: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                  <div className="prop-field">
                    <label className="prop-label" htmlFor="nc-retries-backoff">Backoff Interval (s)</label>
                    <input
                      id="nc-retries-backoff"
                      type="number"
                      min={0}
                      max={120}
                      className="prop-input"
                      value={node.retryPolicy?.backoffSeconds ?? 5}
                      onChange={(e) => updateRetryPolicy({ backoffSeconds: parseInt(e.target.value, 10) || 0 })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Error Handling Settings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                <ShieldAlert size={14} style={{ color: "var(--error)" }} /> Error-Handling Settings
              </div>

              <div className="prop-field">
                <label className="prop-label" htmlFor="nc-err-action">Action on Failure</label>
                <select
                  id="nc-err-action"
                  className="prop-select"
                  value={node.errorHandling?.action || "halt"}
                  onChange={(e) => updateErrorHandling({ action: e.target.value as NodeErrorHandling["action"] })}
                >
                  <option value="halt">Halt Pipeline Immediately</option>
                  <option value="continue_with_warning">Log Warning & Continue Flow</option>
                  <option value="route_to_fallback">Route Execution to Fallback Node</option>
                  <option value="retry">Trigger Configured Retry Loop</option>
                </select>
              </div>

              {node.errorHandling?.action === "route_to_fallback" && (
                <div className="prop-field">
                  <label className="prop-label" htmlFor="nc-err-fallback">Fallback Node *</label>
                  <select
                    id="nc-err-fallback"
                    className="prop-select"
                    value={node.errorHandling?.fallbackNodeId || ""}
                    onChange={(e) => updateErrorHandling({ fallbackNodeId: e.target.value })}
                  >
                    <option value="">-- Select Fallback Node --</option>
                    {allNodes.filter((n) => n.id !== node.id).map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="prop-field">
                <label className="prop-label" htmlFor="nc-err-msg">Custom Error Log Message</label>
                <input
                  id="nc-err-msg"
                  className="prop-input"
                  value={node.errorHandling?.customErrorMessage || ""}
                  onChange={(e) => updateErrorHandling({ customErrorMessage: e.target.value })}
                  placeholder="e.g. Critical failure during architecture drafting"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2-Panel Agent Selection Popup Modal */}
      <AgentSelectionModal
        isOpen={isAgentModalOpen}
        currentAgentId={(cfg.agentId as string) || ""}
        availableAgents={availableAgents}
        availableSkills={availableSkills}
        onSelectAgent={(agent) => {
          const isDefaultName = !node.name || node.name === def.defaultName || node.name === "Untitled Node";
          onUpdateNode(node.id, {
            name: isDefaultName ? agent.name : node.name,
            configuration: {
              ...cfg,
              agentId: agent.id,
              role: agent.role,
            },
          });
        }}
        onClose={() => setIsAgentModalOpen(false)}
      />

      {/* 2-Panel Skill Selection Popup Modal */}
      <SkillSelectionModal
        isOpen={isSkillModalOpen}
        currentSkillId={(cfg.skillId as string) || ""}
        availableSkills={availableSkills}
        onSelectSkill={(skill) => {
          const isDefaultName = !node.name || node.name === def.defaultName || node.name === "Untitled Node";
          onUpdateNode(node.id, {
            name: isDefaultName ? skill.name : node.name,
            configuration: {
              ...cfg,
              skillId: skill.id,
            },
          });
        }}
        onClose={() => setIsSkillModalOpen(false)}
      />
    </div>
  );
};
