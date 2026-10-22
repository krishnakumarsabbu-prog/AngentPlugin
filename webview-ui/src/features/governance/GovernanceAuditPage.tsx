import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Layers,
  Bot,
  Sparkles,
  Workflow,
  Lock,
  Eye,
  Key,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  FolderLock,
  Terminal,
  AlertOctagon,
  Copy,
} from "lucide-react";
import type {
  AuditEvent,
  AuditEventType,
  AuditOutcome,
  AuditFilters,
  GovernancePolicyConfig,
  Agent,
} from "../../types";
import {
  auditService,
  DEFAULT_GOVERNANCE_POLICY,
  SECURITY_DISCLAIMER,
  validatePathClient,
} from "../../services/auditService";
import { getAgentsStore } from "../../services/agentsService";

interface GovernanceAuditPageProps {
  onNavigate?: (route: string) => void;
  onToast: (msg: string, type?: "success" | "info" | "warning" | "error") => void;
}

export const GovernanceAuditPage: React.FC<GovernanceAuditPageProps> = ({
  onNavigate,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<"audit-log" | "permissions-policy" | "security-sandbox">("audit-log");

  // Audit Events state
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // Expanded event rows in log
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});

  // Agents for policy inspection
  const [agents, setAgents] = useState<Agent[]>([]);

  // Destructive Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [confirmAction, setConfirmAction] = useState<"clear-audit" | null>(null);

  // Path Sandbox test input
  const [testPath, setTestPath] = useState("../../secret.key");
  const [pathValidationResult, setPathValidationResult] = useState<{ valid: boolean; normalizedPath?: string; error?: string } | null>(null);

  // Load audit events and registered agents
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventsList, agentsList] = await Promise.all([
        auditService.list(),
        getAgentsStore().list(),
      ]);
      setEvents(eventsList);
      setAgents(agentsList);
    } catch {
      onToast("Failed to load audit activity records", "error");
    } finally {
      setIsLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle path testing
  useEffect(() => {
    if (testPath) {
      setPathValidationResult(validatePathClient(testPath));
    } else {
      setPathValidationResult(null);
    }
  }, [testPath]);

  // Toggle row expansion
  const toggleRowExpanded = (id: string) => {
    setExpandedRowIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (eventTypeFilter !== "all" && !e.eventType.startsWith(eventTypeFilter)) return false;
      if (outcomeFilter !== "all" && e.outcome !== outcomeFilter) return false;
      if (severityFilter !== "all" && e.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = e.id.toLowerCase().includes(q);
        const matchesName = e.resourceName.toLowerCase().includes(q);
        const matchesResId = e.resourceId.toLowerCase().includes(q);
        const matchesType = e.eventType.toLowerCase().includes(q);
        const matchesDetails = JSON.stringify(e.details).toLowerCase().includes(q);
        return matchesId || matchesName || matchesResId || matchesType || matchesDetails;
      }
      return true;
    });
  }, [events, eventTypeFilter, outcomeFilter, severityFilter, searchQuery]);

  // Export Audit Log
  const handleExportJson = () => {
    try {
      const jsonStr = JSON.stringify(filteredEvents, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agentforge-audit-log-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onToast(`Exported ${filteredEvents.length} audit records as JSON`, "success");
    } catch {
      onToast("Export failed", "error");
    }
  };

  // Clear Audit Log Destructive Confirmation
  const handleTriggerClear = () => {
    setConfirmAction("clear-audit");
    setConfirmInput("");
    setConfirmModalOpen(true);
  };

  const handleExecuteConfirmedAction = async () => {
    if (confirmAction === "clear-audit") {
      if (confirmInput.trim().toUpperCase() !== "CONFIRM") {
        onToast("Please type CONFIRM to execute this action", "warning");
        return;
      }
      await auditService.clear();
      setEvents([]);
      setConfirmModalOpen(false);
      onToast("Audit log records cleared successfully", "info");
    }
  };

  const getOutcomeBadge = (outcome: AuditOutcome) => {
    switch (outcome) {
      case "success":
        return <span className="badge-status ready">Success</span>;
      case "failure":
        return <span className="badge-status" style={{ background: "#FEE2E2", color: "#991B1B" }}>Failure</span>;
      case "denied":
        return <span className="badge-status" style={{ background: "#FEF3C7", color: "#92400E" }}>Denied</span>;
      case "cancelled":
        return <span className="badge-status draft">Cancelled</span>;
      default:
        return <span className="badge-status draft">{outcome}</span>;
    }
  };

  return (
    <div
      className="governance-audit-page"
      style={{
        padding: "20px 24px",
        height: "100%",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header & Disclaimer Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={22} style={{ color: "var(--accent)" }} /> Governance, Permissions & Audit Activity
            </h1>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: "#EFF6FF",
                color: "#1E40AF",
                border: "1px solid #BFDBFE",
                fontWeight: 600,
              }}
            >
              Least-Privilege Enforcement
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
            Inspect audit activity events, enforce least-privilege permissions, inspect restricted paths, and review security guardrails.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div style={{ display: "flex", background: "var(--bg-secondary, #F1F5F9)", padding: 3, borderRadius: 6, border: "1px solid var(--border-color, #E2E8F0)" }}>
          <button
            className={`btn ${activeTab === "audit-log" ? "primary" : "secondary"}`}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 4, border: "none" }}
            onClick={() => setActiveTab("audit-log")}
          >
            <Clock size={13} style={{ marginRight: 6 }} /> Audit Log ({events.length})
          </button>
          <button
            className={`btn ${activeTab === "permissions-policy" ? "primary" : "secondary"}`}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 4, border: "none" }}
            onClick={() => setActiveTab("permissions-policy")}
          >
            <Lock size={13} style={{ marginRight: 6 }} /> Permission Policies
          </button>
          <button
            className={`btn ${activeTab === "security-sandbox" ? "primary" : "secondary"}`}
            style={{ padding: "5px 12px", fontSize: 12, borderRadius: 4, border: "none" }}
            onClick={() => setActiveTab("security-sandbox")}
          >
            <FolderLock size={13} style={{ marginRight: 6 }} /> Path Traversal Guard
          </button>
        </div>
      </div>

      {/* Security Disclaimer Alert */}
      <div
        style={{
          background: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: 6,
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12,
          color: "#991B1B",
        }}
      >
        <ShieldAlert size={16} style={{ flexShrink: 0, color: "#DC2626" }} />
        <span style={{ lineHeight: 1.4 }}>{SECURITY_DISCLAIMER}</span>
      </div>

      {/* TAB 1: AUDIT ACTIVITY LOG */}
      {activeTab === "audit-log" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          {/* Controls bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              background: "var(--card-bg, #FFFFFF)",
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid var(--border-color, #E2E8F0)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 }}>
              {/* Search */}
              <div style={{ position: "relative", minWidth: 220, flex: 1 }}>
                <Search size={14} style={{ position: "absolute", left: 8, top: 9, color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  placeholder="Search audit events by resource, type, ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px 6px 28px",
                    fontSize: 12,
                    borderRadius: 4,
                    border: "1px solid var(--border-color, #CBD5E1)",
                  }}
                />
              </div>

              {/* Event Type Filter */}
              <select
                className="prop-select"
                style={{ fontSize: 12, padding: "5px 8px", width: "auto" }}
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
              >
                <option value="all">All Event Types</option>
                <option value="skill">Skill Events</option>
                <option value="agent">Agent Events</option>
                <option value="workflow">Workflow Events</option>
                <option value="execution">Execution Events</option>
                <option value="approval">Approval Events</option>
                <option value="package">Package Events</option>
                <option value="settings">Settings Events</option>
              </select>

              {/* Outcome Filter */}
              <select
                className="prop-select"
                style={{ fontSize: 12, padding: "5px 8px", width: "auto" }}
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
              >
                <option value="all">All Outcomes</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="denied">Denied</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Reset Filters */}
              {(searchQuery || eventTypeFilter !== "all" || outcomeFilter !== "all") && (
                <button
                  className="btn secondary"
                  style={{ padding: "5px 10px", fontSize: 11 }}
                  onClick={() => {
                    setSearchQuery("");
                    setEventTypeFilter("all");
                    setOutcomeFilter("all");
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={handleExportJson} title="Export audit trail as JSON">
                <Download size={13} style={{ marginRight: 4 }} /> Export Log
              </button>
              <button
                className="btn secondary"
                style={{ padding: "6px 10px", fontSize: 12, color: "#DC2626" }}
                onClick={handleTriggerClear}
                title="Clear audit log history"
              >
                <Trash2 size={13} style={{ marginRight: 4 }} /> Clear
              </button>
            </div>
          </div>

          {/* Events Count summary */}
          <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
            <span>Showing {filteredEvents.length} of {events.length} audit activity records</span>
            <span style={{ fontStyle: "italic" }}>Secrets and credentials are automatically scrubbed prior to persistence.</span>
          </div>

          {/* Table of Events */}
          <div style={{ background: "var(--card-bg, #FFFFFF)", border: "1px solid var(--border-color, #E2E8F0)", borderRadius: 8, overflow: "hidden" }}>
            {filteredEvents.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)" }}>
                <Clock size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>No audit events found</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Audit activity records will appear as actions occur across the platform.</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--bg-secondary, #F8FAFC)", textAlign: "left", borderBottom: "1px solid var(--border-color, #E2E8F0)", color: "var(--text-secondary)" }}>
                    <th style={{ padding: "8px 12px", width: 30 }}></th>
                    <th style={{ padding: "8px 12px" }}>Timestamp</th>
                    <th style={{ padding: "8px 12px" }}>Event Type</th>
                    <th style={{ padding: "8px 12px" }}>Resource</th>
                    <th style={{ padding: "8px 12px" }}>Outcome</th>
                    <th style={{ padding: "8px 12px" }}>Actor</th>
                    <th style={{ padding: "8px 12px" }}>Event ID</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((e) => {
                    const isExpanded = !!expandedRowIds[e.id];

                    return (
                      <React.Fragment key={e.id}>
                        <tr
                          style={{
                            borderBottom: "1px solid var(--border-color, #E2E8F0)",
                            cursor: "pointer",
                            background: isExpanded ? "var(--bg-secondary, #F8FAFC)" : "transparent",
                          }}
                          onClick={() => toggleRowExpanded(e.id)}
                        >
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </td>
                          <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                            {new Date(e.timestamp).toLocaleTimeString()} ({new Date(e.timestamp).toLocaleDateString()})
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span
                              style={{
                                fontSize: 11,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "var(--bg-secondary, #F1F5F9)",
                                color: "var(--text-primary)",
                                fontFamily: "monospace",
                                fontWeight: 600,
                              }}
                            >
                              {e.eventType}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{e.resourceName}</div>
                            <code style={{ fontSize: 10, color: "var(--text-secondary)" }}>{e.resourceId}</code>
                          </td>
                          <td style={{ padding: "8px 12px" }}>{getOutcomeBadge(e.outcome)}</td>
                          <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>{e.actor}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <code style={{ fontSize: 11, color: "var(--text-secondary)" }}>{e.id}</code>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: "var(--bg-secondary, #F8FAFC)", borderBottom: "1px solid var(--border-color, #E2E8F0)" }}>
                            <td colSpan={7} style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>
                                  Sanitized Event Details & Payload
                                </div>
                                <pre
                                  style={{
                                    background: "#1E293B",
                                    color: "#F8FAFC",
                                    padding: "10px 14px",
                                    borderRadius: 6,
                                    margin: 0,
                                    fontSize: 11,
                                    fontFamily: "monospace",
                                    overflowX: "auto",
                                  }}
                                >
                                  {JSON.stringify(e.details, null, 2)}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PERMISSION POLICIES & LEAST-PRIVILEGE */}
      {activeTab === "permissions-policy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Baseline Policy Card */}
          <div style={{ background: "var(--card-bg, #FFFFFF)", padding: 16, borderRadius: 8, border: "1px solid var(--border-color, #E2E8F0)" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <Lock size={16} style={{ color: "var(--accent)" }} /> AgentForge Least-Privilege Baseline Policies
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div style={{ background: "var(--bg-secondary, #F8FAFC)", padding: 12, borderRadius: 6, border: "1px solid var(--border-color, #E2E8F0)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>FILESYSTEM BOUNDARY</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>Read-Only Default</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Write access requires explicit declaration & human gate.</div>
              </div>

              <div style={{ background: "var(--bg-secondary, #F8FAFC)", padding: 12, borderRadius: 6, border: "1px solid var(--border-color, #E2E8F0)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>SHELL / TERMINAL EXECUTION</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>Disabled by Default</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Command execution requires human approval gate.</div>
              </div>

              <div style={{ background: "var(--bg-secondary, #F8FAFC)", padding: 12, borderRadius: 6, border: "1px solid var(--border-color, #E2E8F0)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>NETWORK ACCESS</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginTop: 4 }}>Isolated (No Egress)</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Agents cannot initiate unapproved external HTTP requests.</div>
              </div>

              <div style={{ background: "var(--bg-secondary, #F8FAFC)", padding: 12, borderRadius: 6, border: "1px solid var(--border-color, #E2E8F0)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>HUMAN APPROVAL REQUIREMENTS</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#059669", marginTop: 4 }}>Mandatory for Elevated Operations</div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Halts execution until user review and explicit approval.</div>
              </div>
            </div>

            {/* Restricted Paths */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                DEFAULT RESTRICTED PATHS & SENSITIVE MASKS:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {DEFAULT_GOVERNANCE_POLICY.defaultRestrictedPaths.map((p) => (
                  <span
                    key={p}
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: "#FEE2E2",
                      color: "#991B1B",
                      border: "1px solid #FECACA",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Declared Agent Permissions Matrix */}
          <div style={{ background: "var(--card-bg, #FFFFFF)", padding: 16, borderRadius: 8, border: "1px solid var(--border-color, #E2E8F0)" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Bot size={15} /> Registered Agents Declared Permissions & Compliance ({agents.length})
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary, #F8FAFC)", textAlign: "left", borderBottom: "1px solid var(--border-color, #E2E8F0)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "8px 12px" }}>Agent</th>
                  <th style={{ padding: "8px 12px" }}>Filesystem</th>
                  <th style={{ padding: "8px 12px" }}>Shell Execution</th>
                  <th style={{ padding: "8px 12px" }}>Network</th>
                  <th style={{ padding: "8px 12px" }}>Human Approval Gate</th>
                  <th style={{ padding: "8px 12px" }}>Compliance Status</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((ag) => {
                  const perms = ag.permissionPolicy || (ag as any).permissions || {};
                  const isReadWrite = perms.fileSystem === "readwrite" || perms.fileSystem === "write" || perms.writeOperations;
                  const hasShell = !!perms.shell;
                  const hasNet = !!perms.network;
                  const hasGate = !!perms.humanApprovalRequired;
                  const isCompliant = (!isReadWrite && !hasShell) || hasGate;

                  return (
                    <tr key={ag.id} style={{ borderBottom: "1px solid var(--border-color, #E2E8F0)" }}>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ fontWeight: 600 }}>{ag.name}</div>
                        <code style={{ fontSize: 10, color: "var(--text-secondary)" }}>{ag.id}</code>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ color: isReadWrite ? "#DC2626" : "var(--text-primary)", fontWeight: isReadWrite ? 600 : 400 }}>
                          {isReadWrite ? "Read/Write" : "Read-only"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ color: hasShell ? "#DC2626" : "var(--text-secondary)", fontWeight: hasShell ? 600 : 400 }}>
                          {hasShell ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ color: hasNet ? "#DC2626" : "var(--text-secondary)" }}>
                          {hasNet ? "Allowed" : "Blocked"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ color: hasGate ? "#059669" : "#991B1B", fontWeight: 600 }}>
                          {hasGate ? "✓ Required" : "✗ Not Enforced"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {isCompliant ? (
                          <span className="badge-status ready">Compliant</span>
                        ) : (
                          <span className="badge-status" style={{ background: "#FEE2E2", color: "#991B1B" }}>
                            Warning: Gate Missing
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PATH TRAVERSAL GUARD & SANDBOX */}
      {activeTab === "security-sandbox" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "var(--card-bg, #FFFFFF)", padding: 16, borderRadius: 8, border: "1px solid var(--border-color, #E2E8F0)" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px 0", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <FolderLock size={16} style={{ color: "var(--accent)" }} /> Workspace Isolation & Path Traversal Validator
            </h2>
            <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "var(--text-secondary)" }}>
              Test any target file path or artifact reference to verify path traversal guards (`..`), null-byte checks, and workspace boundary confinement.
            </p>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Enter path to test (e.g. ../../secrets.key or src/components/button.tsx)"
                value={testPath}
                onChange={(e) => setTestPath(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: 13,
                  borderRadius: 6,
                  border: "1px solid var(--border-color, #CBD5E1)",
                  fontFamily: "monospace",
                }}
              />
              <button className="btn secondary" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => setTestPath("src/safe/resource.md")}>
                Test Safe Path
              </button>
              <button className="btn secondary" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => setTestPath("../../../etc/shadow")}>
                Test Traversal Attack
              </button>
            </div>

            {pathValidationResult && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 6,
                  background: pathValidationResult.valid ? "#ECFDF5" : "#FEF2F2",
                  border: `1px solid ${pathValidationResult.valid ? "#A7F3D0" : "#FECACA"}`,
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: pathValidationResult.valid ? "#065F46" : "#991B1B" }}>
                  {pathValidationResult.valid ? <CheckCircle2 size={16} /> : <AlertOctagon size={16} />}
                  <span>{pathValidationResult.valid ? "Path Allowed & Confined to Workspace" : "Path Traversal Rejected"}</span>
                </div>
                {pathValidationResult.error && (
                  <div style={{ marginTop: 4, color: "#991B1B" }}>
                    Reason: {pathValidationResult.error}
                  </div>
                )}
                {pathValidationResult.normalizedPath && (
                  <div style={{ marginTop: 4, color: "#065F46" }}>
                    Normalized: <code>{pathValidationResult.normalizedPath}</code>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Destructive Action Confirmation Modal */}
      {confirmModalOpen && (
        <div
          className="dialog-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            className="dialog"
            style={{
              background: "var(--card-bg, #FFFFFF)",
              borderRadius: 8,
              padding: 20,
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#DC2626" }}>
              <AlertTriangle size={20} />
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Confirm Destructive Action</h2>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8 }}>
              This will permanently purge all local audit activity log records. This operation cannot be undone.
            </p>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Type <strong style={{ color: "#DC2626" }}>CONFIRM</strong> to proceed:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="CONFIRM"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 13,
                  borderRadius: 4,
                  border: "1px solid var(--border-color, #CBD5E1)",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
              <button className="btn secondary" onClick={() => setConfirmModalOpen(false)}>
                Cancel
              </button>
              <button
                className="btn danger"
                disabled={confirmInput.trim().toUpperCase() !== "CONFIRM"}
                onClick={handleExecuteConfirmedAction}
              >
                Permanently Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
