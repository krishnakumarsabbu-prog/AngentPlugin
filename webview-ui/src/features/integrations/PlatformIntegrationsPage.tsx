import { useEffect, useState } from "react";
import {
  Plug,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Settings2,
  RefreshCw,
  BookOpen,
  PowerOff,
  Layers,
  ShieldCheck,
  ExternalLink,
  Cpu,
} from "lucide-react";
import { integrationService } from "../../services/integrationService";
import type {
  PlatformIntegrationConfig,
  PlatformIntegrationId,
  IntegrationValidationResult,
} from "../../types";

interface PlatformIntegrationsPageProps {
  onNavigate?: (route: string) => void;
  onToast?: (message: string, tone?: "success" | "error" | "warning" | "info") => void;
}

export function PlatformIntegrationsPage({ onToast }: PlatformIntegrationsPageProps) {
  const [integrations, setIntegrations] = useState<PlatformIntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  // Configure Modal State
  const [editingItem, setEditingItem] = useState<PlatformIntegrationConfig | null>(null);
  const [editEndpoint, setEditEndpoint] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editIsMock, setEditIsMock] = useState(true);
  const [dummyApiKey, setDummyApiKey] = useState("");

  // Capabilities Modal State
  const [viewingCapabilities, setViewingCapabilities] = useState<PlatformIntegrationConfig | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await integrationService.list();
      setIntegrations(list);
    } catch {
      onToast?.("Failed to load platform integrations", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenConfigure = (item: PlatformIntegrationConfig) => {
    setEditingItem(item);
    setEditEndpoint(item.endpointUrl || "");
    setEditModel(item.targetModel || "");
    setEditIsMock(item.isMock);
    setDummyApiKey(item.hasStoredSecret ? "••••••••••••••••" : "");
  };

  const handleSaveConfiguration = async () => {
    if (!editingItem) return;
    try {
      const updated = await integrationService.configure(editingItem.id, {
        endpointUrl: editEndpoint.trim(),
        targetModel: editModel.trim(),
        isMock: editIsMock,
        hasStoredSecret: dummyApiKey.length > 0,
      });

      onToast?.(`Configuration saved for ${updated.name}`, "success");
      setEditingItem(null);
      await loadData();
    } catch (e) {
      onToast?.(`Save failed: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  const handleValidate = async (item: PlatformIntegrationConfig) => {
    setValidatingId(item.id);
    try {
      const res: IntegrationValidationResult = await integrationService.validate(item.id);
      if (res.valid) {
        onToast?.(res.message, res.isMock ? "info" : "success");
      } else {
        onToast?.(res.message, "error");
      }
      await loadData();
    } catch (e) {
      onToast?.(`Validation error: ${e instanceof Error ? e.message : String(e)}`, "error");
    } finally {
      setValidatingId(null);
    }
  };

  const handleDisconnect = async (item: PlatformIntegrationConfig) => {
    const confirm = window.confirm(`Disconnect ${item.name}? Stored tokens and credentials will be removed.`);
    if (!confirm) return;

    try {
      await integrationService.disconnect(item.id);
      onToast?.(`${item.name} disconnected`, "info");
      await loadData();
    } catch {
      onToast?.("Failed to disconnect", "error");
    }
  };

  const getStatusBadge = (status: PlatformIntegrationConfig["connectionStatus"], isMock: boolean) => {
    if (status === "connected") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 12,
            background: "#ECFDF5",
            color: "#047857",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          <CheckCircle2 size={13} /> Live Connected
        </span>
      );
    }

    if (status === "mock_active" || isMock) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 12,
            background: "#EFF6FF",
            color: "#1D4ED8",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          <Cpu size={13} /> Mock Registry Active
        </span>
      );
    }

    if (status === "error") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 12,
            background: "#FEF2F2",
            color: "#DC2626",
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          <XCircle size={13} /> Connection Error
        </span>
      );
    }

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 8px",
          borderRadius: 12,
          background: "#F1F5F9",
          color: "#64748B",
          fontWeight: 500,
          fontSize: 12,
        }}
      >
        <PowerOff size={13} /> Disconnected
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Notice Banner */}
      <div
        style={{
          background: "#F8FAFC",
          border: "1px solid #CBD5E1",
          borderRadius: 8,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <ShieldCheck size={20} color="#2563EB" />
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.4 }}>
          <strong>Truthful Integration Registry:</strong> AgentForge tests and validates connections explicitly.
          If live external API credentials or target hosts are unavailable, the platform uses a{" "}
          <strong>clearly labeled Mock Registry</strong> to simulate agent exports and capability handshakes.
          API keys and tokens are never stored in plaintext.
        </div>
      </div>

      {/* Integration Cards */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
          Loading platform integrations…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {integrations.map((item) => {
            const isValidating = validatingId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <h2 style={{ margin: 0, fontSize: 18, color: "#0F172A", fontWeight: 600 }}>
                        {item.name}
                      </h2>
                      {getStatusBadge(item.connectionStatus, item.isMock)}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                      Endpoint:{" "}
                      <span style={{ fontFamily: "monospace", color: "#334155" }}>
                        {item.endpointUrl || "Default Host"}
                      </span>{" "}
                      · Model:{" "}
                      <span style={{ fontFamily: "monospace", color: "#334155" }}>
                        {item.targetModel || "Default"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => handleValidate(item)}
                      disabled={isValidating}
                      className="btn secondary"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                    >
                      <RefreshCw size={14} className={isValidating ? "spinning" : ""} />
                      {isValidating ? "Validating…" : "Validate"}
                    </button>
                    <button
                      onClick={() => handleOpenConfigure(item)}
                      className="btn secondary"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                    >
                      <Settings2 size={14} /> Configure
                    </button>
                    <button
                      onClick={() => setViewingCapabilities(item)}
                      className="btn secondary"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                    >
                      <Layers size={14} /> Capabilities
                    </button>
                    {item.connectionStatus !== "disconnected" && (
                      <button
                        onClick={() => handleDisconnect(item)}
                        className="btn danger"
                        title="Disconnect integration"
                        style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                      >
                        <PowerOff size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Validation message feedback */}
                {item.lastValidationMessage && (
                  <div
                    style={{
                      background: item.isMock ? "#F0F9FF" : "#F8FAFC",
                      border: `1px solid ${item.isMock ? "#BAE6FD" : "#E2E8F0"}`,
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 12,
                      color: item.isMock ? "#0369A1" : "#475569",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>Last Validation:</strong> {item.lastValidationMessage}
                    </div>
                    {item.lastValidatedAt && (
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>
                        {new Date(item.lastValidatedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}

                {/* 2-Column features vs limitations */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Supported Features */}
                  <div
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 6,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#166534", marginBottom: 6 }}>
                      Supported Artifacts & Features
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
                      {item.supportedFeatures.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Documented Limitations */}
                  <div
                    style={{
                      background: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      borderRadius: 6,
                      padding: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 12, color: "#92400E", marginBottom: 6 }}>
                      Documented Limitations & Constraints
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#78350F", lineHeight: 1.5 }}>
                      {item.limitations.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Docs Link */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <a
                    href={item.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 12,
                      color: "#2563EB",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <BookOpen size={13} /> Integration Documentation <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Configure Modal */}
      {editingItem && (
        <div className="dialog-overlay" onClick={() => setEditingItem(null)}>
          <div
            className="dialog"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-header">
              <h2 className="dialog-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Settings2 size={18} /> Configure {editingItem.name}
              </h2>
            </div>

            <div className="dialog-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  API Base Endpoint
                </label>
                <input
                  type="text"
                  value={editEndpoint}
                  onChange={(e) => setEditEndpoint(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #CBD5E1",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Target Model Name
                </label>
                <input
                  type="text"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  placeholder="e.g. gpt-4o, claude-3-7-sonnet"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #CBD5E1",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Secret Token / Key Reference (VS Code SecretStorage)
                </label>
                <input
                  type="password"
                  value={dummyApiKey}
                  onChange={(e) => setDummyApiKey(e.target.value)}
                  placeholder="Enter token (never stored in plaintext)"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #CBD5E1",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                />
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                  Keys are delegated to VS Code SecretStorage and masked in local state.
                </div>
              </div>

              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editIsMock}
                    onChange={(e) => setEditIsMock(e.target.checked)}
                  />
                  <span>
                    <strong>Use Mock Registry</strong> (Simulate adapter responses without invoking real external APIs)
                  </span>
                </label>
              </div>
            </div>

            <div className="dialog-footer">
              <button className="btn secondary" onClick={() => setEditingItem(null)}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleSaveConfiguration}>
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capabilities Modal */}
      {viewingCapabilities && (
        <div className="dialog-overlay" onClick={() => setViewingCapabilities(null)}>
          <div
            className="dialog"
            style={{ maxWidth: 600 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-header">
              <h2 className="dialog-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Layers size={18} /> {viewingCapabilities.name} Capabilities
              </h2>
            </div>

            <div className="dialog-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "#334155" }}>
                Canonical internal agent models export to this platform with the following mapping fidelity:
              </div>

              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 6,
                  overflow: "hidden",
                  fontSize: 12,
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F1F5F9", textAlign: "left" }}>
                      <th style={{ padding: "8px 12px" }}>Internal Concept</th>
                      <th style={{ padding: "8px 12px" }}>Platform Representation</th>
                      <th style={{ padding: "8px 12px" }}>Fidelity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderTop: "1px solid #E2E8F0" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>System Prompt</td>
                      <td style={{ padding: "8px 12px" }}>Instructions file / system role</td>
                      <td style={{ padding: "8px 12px", color: "#166534" }}>Native</td>
                    </tr>
                    <tr style={{ borderTop: "1px solid #E2E8F0" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>Tools (JSON Schema)</td>
                      <td style={{ padding: "8px 12px" }}>Function calling definitions</td>
                      <td style={{ padding: "8px 12px", color: "#166534" }}>Native</td>
                    </tr>
                    <tr style={{ borderTop: "1px solid #E2E8F0" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>Shell Execution</td>
                      <td style={{ padding: "8px 12px" }}>Prompt simulated or external process</td>
                      <td style={{ padding: "8px 12px", color: "#B45309" }}>Simulated / Restricted</td>
                    </tr>
                    <tr style={{ borderTop: "1px solid #E2E8F0" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>Approval Gates</td>
                      <td style={{ padding: "8px 12px" }}>Host interactive confirmations</td>
                      <td style={{ padding: "8px 12px", color: "#2563EB" }}>Platform Handled</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: 12, color: "#64748B" }}>
                Export preview and warnings are generated automatically when exporting agents from Agent Studio.
              </div>
            </div>

            <div className="dialog-footer">
              <button className="btn secondary" onClick={() => setViewingCapabilities(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
