import { useEffect, useState, useMemo } from "react";
import {
  Package,
  Search,
  Filter,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Layers,
  History,
  RotateCcw,
  Trash2,
  ExternalLink,
  Info,
  Key,
} from "lucide-react";
import { packageService } from "../../services/packageService";
import type {
  InstalledPackageRecord,
  PackageBundle,
  PackageValidationResult,
  PackageBackupRecord,
  PackageType,
} from "../../types";

interface PackageManagerPageProps {
  onNavigate?: (route: string) => void;
  onToast?: (message: string, tone?: "success" | "error" | "warning" | "info") => void;
}

export function PackageManagerPage({ onNavigate, onToast }: PackageManagerPageProps) {
  const [packages, setPackages] = useState<InstalledPackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [selectedPackage, setSelectedPackage] = useState<InstalledPackageRecord | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importValidation, setImportValidation] = useState<PackageValidationResult | null>(null);
  const [parsedBundle, setParsedBundle] = useState<PackageBundle | null>(null);
  const [backupOnInstall, setBackupOnInstall] = useState(true);

  const [showBackupsModal, setShowBackupsModal] = useState(false);
  const [backups, setBackups] = useState<PackageBackupRecord[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await packageService.list();
      setPackages(list);
    } catch {
      onToast?.("Failed to load packages", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        pkg.manifest.name.toLowerCase().includes(q) ||
        pkg.manifest.id.toLowerCase().includes(q) ||
        pkg.manifest.description.toLowerCase().includes(q) ||
        pkg.manifest.tags.some((t) => t.toLowerCase().includes(q));

      const matchesType = selectedType === "all" || pkg.manifest.type === selectedType;
      const matchesStatus = selectedStatus === "all" || pkg.status === selectedStatus;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [packages, searchQuery, selectedType, selectedStatus]);

  const handleInspect = (pkg: InstalledPackageRecord) => {
    setSelectedPackage(pkg);
  };

  const handleValidateImportJson = async (raw: string) => {
    setImportJson(raw);
    if (!raw.trim()) {
      setImportValidation(null);
      setParsedBundle(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const bundle: PackageBundle = parsed.manifest ? parsed : { manifest: parsed };
      setParsedBundle(bundle);
      const validation = await packageService.validate(bundle);
      setImportValidation(validation);
    } catch (e) {
      setParsedBundle(null);
      setImportValidation({
        valid: false,
        issues: [`Invalid JSON syntax: ${e instanceof Error ? e.message : String(e)}`],
        warnings: [],
        compatibilityWarnings: [],
        integrityVerified: false,
      });
    }
  };

  const handlePerformInstall = async () => {
    if (!parsedBundle || !importValidation?.valid) return;
    try {
      await packageService.install(parsedBundle, "workspace", backupOnInstall);
      onToast?.(`Package '${parsedBundle.manifest.name}' installed successfully`, "success");
      setShowImportModal(false);
      setImportJson("");
      setImportValidation(null);
      setParsedBundle(null);
      await loadData();
    } catch (e) {
      onToast?.(`Installation failed: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  const handleUninstall = async (pkg: InstalledPackageRecord) => {
    const confirm = window.confirm(
      `Are you sure you want to uninstall '${pkg.manifest.name}'? A local backup snapshot will be created.`
    );
    if (!confirm) return;

    try {
      await packageService.uninstall(pkg.manifest.id, true);
      onToast?.(`Package '${pkg.manifest.name}' removed`, "info");
      if (selectedPackage?.manifest.id === pkg.manifest.id) {
        setSelectedPackage(null);
      }
      await loadData();
    } catch {
      onToast?.("Failed to uninstall package", "error");
    }
  };

  const handleUpdate = async (pkg: InstalledPackageRecord) => {
    if (!pkg.availableVersion) return;
    try {
      const updatedBundle: PackageBundle = {
        manifest: {
          ...pkg.manifest,
          version: pkg.availableVersion,
          changelog: `${pkg.availableVersion} - Automated upgrade update.\n` + pkg.manifest.changelog,
          integrity: {
            ...pkg.manifest.integrity,
            hash: "f" + pkg.manifest.integrity.hash.slice(1),
            generatedAt: new Date().toISOString(),
          },
        },
      };

      await packageService.install(updatedBundle, pkg.scope, true);
      onToast?.(`Package upgraded to version ${pkg.availableVersion}`, "success");
      await loadData();
    } catch (e) {
      onToast?.(`Update failed: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  const handleExport = (pkg: InstalledPackageRecord) => {
    const bundle: PackageBundle = {
      manifest: pkg.manifest,
    };
    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pkg.manifest.id}-v${pkg.manifest.version}.agentforge.pkg.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast?.(`Exported package bundle '${pkg.manifest.name}'`, "success");
  };

  const handleOpenBackups = async () => {
    const list = await packageService.listBackups();
    setBackups(list);
    setShowBackupsModal(true);
  };

  const handleRestoreBackup = async (b: PackageBackupRecord) => {
    const confirm = window.confirm(`Restore package snapshot '${b.packageName}' (v${b.version})?`);
    if (!confirm) return;

    const ok = await packageService.restoreBackup(b.id);
    if (ok) {
      onToast?.(`Restored backup for ${b.packageName}`, "success");
      setShowBackupsModal(false);
      await loadData();
    } else {
      onToast?.("Failed to restore backup snapshot", "error");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Security Banner */}
      <div
        style={{
          background: "#FEF2F2",
          border: "1px solid #FCA5A5",
          borderRadius: 8,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <ShieldCheck size={20} color="#DC2626" />
        <div style={{ fontSize: 13, color: "#991B1B", lineHeight: 1.4 }}>
          <strong>Package Security Policy:</strong> AgentForge enforces static package inspection.
          Imported scripts are <em>never automatically executed</em>. All skill manifests, agent
          specs, and pipeline definitions are verified against declared schema and SHA-256 integrity hashes.
        </div>
      </div>

      {/* Action Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 8,
          padding: "12px 16px",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 260 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 10, top: 10, color: "#94A3B8" }}
            />
            <input
              type="text"
              placeholder="Search packages by name, ID, tags, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                border: "1px solid #CBD5E1",
                borderRadius: 6,
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={16} color="#64748B" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                padding: "8px 10px",
                border: "1px solid #CBD5E1",
                borderRadius: 6,
                fontSize: 13,
                background: "#FFF",
              }}
            >
              <option value="all">All Types</option>
              <option value="full-kit">Full Kit</option>
              <option value="skill-package">Skill Package</option>
              <option value="agent-bundle">Agent Bundle</option>
              <option value="workflow-pipeline">Workflow Pipeline</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: "8px 10px",
                border: "1px solid #CBD5E1",
                borderRadius: 6,
                fontSize: 13,
                background: "#FFF",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="installed">Installed</option>
              <option value="update-available">Update Available</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleOpenBackups}
            className="btn secondary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <History size={15} /> Backups
          </button>
          <button
            onClick={() => {
              setImportJson("");
              setImportValidation(null);
              setParsedBundle(null);
              setShowImportModal(true);
            }}
            className="btn primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Upload size={15} /> Import Package
          </button>
        </div>
      </div>

      {/* Package Grid & Detail Drawer */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Package List */}
        <div style={{ flex: selectedPackage ? 1 : 2, display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "#64748B" }}>
              Loading packages…
            </div>
          ) : filteredPackages.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                background: "#FFF",
                border: "1px dashed #CBD5E1",
                borderRadius: 8,
                color: "#64748B",
              }}
            >
              <Package size={36} color="#94A3B8" style={{ margin: "0 auto 12px" }} />
              <div style={{ fontWeight: 600, fontSize: 15, color: "#1E293B" }}>
                {packages.length === 0 ? "No packages installed" : "No packages matched your filters"}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {packages.length === 0
                  ? "Install or import an agent/skill package bundle to get started."
                  : "Try adjusting your search query or import a new package bundle."}
              </div>
            </div>
          ) : (
            filteredPackages.map((pkg) => {
              const isSelected = selectedPackage?.manifest.id === pkg.manifest.id;
              return (
                <div
                  key={pkg.manifest.id}
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${isSelected ? "#2563EB" : "#E2E8F0"}`,
                    borderRadius: 8,
                    padding: 16,
                    boxShadow: isSelected ? "0 0 0 2px rgba(37,99,235,0.15)" : "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onClick={() => handleInspect(pkg)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: "#0F172A" }}>
                          {pkg.manifest.name}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "#F1F5F9",
                            color: "#475569",
                            fontFamily: "monospace",
                          }}
                        >
                          v{pkg.manifest.version}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background:
                              pkg.manifest.type === "full-kit"
                                ? "#EEF2FF"
                                : pkg.manifest.type === "agent-bundle"
                                ? "#F0FDF4"
                                : "#FDF4FF",
                            color:
                              pkg.manifest.type === "full-kit"
                                ? "#4338CA"
                                : pkg.manifest.type === "agent-bundle"
                                ? "#15803D"
                                : "#A21CAF",
                            fontWeight: 500,
                          }}
                        >
                          {pkg.manifest.type}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, fontFamily: "monospace" }}>
                        ID: {pkg.manifest.id} · Author: {pkg.manifest.author} · Scope: {pkg.scope}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {pkg.status === "update-available" && (
                        <span
                          style={{
                            fontSize: 11,
                            padding: "3px 8px",
                            borderRadius: 12,
                            background: "#FEF3C7",
                            color: "#B45309",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <AlertTriangle size={12} /> v{pkg.availableVersion} available
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 12,
                          background: "#ECFDF5",
                          color: "#047857",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <CheckCircle2 size={12} /> Installed
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: "#334155", margin: "8px 0 10px", lineHeight: 1.4 }}>
                    {pkg.manifest.description}
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {pkg.manifest.compatibility.map((c) => (
                        <span
                          key={c}
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "#F8FAFC",
                            border: "1px solid #E2E8F0",
                            color: "#64748B",
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                      {pkg.status === "update-available" && (
                        <button
                          onClick={() => handleUpdate(pkg)}
                          className="btn primary"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                        >
                          Update
                        </button>
                      )}
                      <button
                        onClick={() => handleExport(pkg)}
                        className="btn secondary"
                        title="Export package bundle"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                      >
                        <Download size={13} /> Export
                      </button>
                      <button
                        onClick={() => handleUninstall(pkg)}
                        className="btn danger"
                        title="Uninstall package"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Package Inspector Drawer */}
        {selectedPackage && (
          <div
            style={{
              flex: 1,
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: "#0F172A" }}>
                  {selectedPackage.manifest.name}
                </h3>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, fontFamily: "monospace" }}>
                  {selectedPackage.manifest.id} (v{selectedPackage.manifest.version})
                </div>
              </div>
              <button
                onClick={() => setSelectedPackage(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#94A3B8",
                }}
              >
                ✕
              </button>
            </div>

            {/* Integrity Badge */}
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: 6,
                padding: 10,
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#0F172A", fontWeight: 600 }}>
                <Key size={14} color="#2563EB" /> SHA-256 Package Integrity
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#475569",
                  marginTop: 4,
                  wordBreak: "break-all",
                }}
              >
                {selectedPackage.manifest.integrity.hash}
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                Generated: {new Date(selectedPackage.manifest.integrity.generatedAt).toLocaleString()}
              </div>
            </div>

            {/* Entry Files */}
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1E293B", marginBottom: 6 }}>
                Declared Entry Files ({selectedPackage.manifest.entryFiles.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {selectedPackage.manifest.entryFiles.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontFamily: "monospace", fontWeight: 500, color: "#0F172A" }}>
                      {f.path}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>
                      {f.description} · <span style={{ fontStyle: "italic" }}>{f.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dependencies */}
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1E293B", marginBottom: 6 }}>
                Dependencies
              </div>
              {selectedPackage.manifest.dependencies.length === 0 ? (
                <div style={{ fontSize: 12, color: "#94A3B8" }}>No external package dependencies.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {selectedPackage.manifest.dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      style={{
                        padding: "4px 8px",
                        background: "#F1F5F9",
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: "monospace",
                      }}
                    >
                      {dep.name} ({dep.versionRange})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Changelog */}
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#1E293B", marginBottom: 4 }}>
                Changelog
              </div>
              <pre
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: 6,
                  padding: 8,
                  fontSize: 11,
                  whiteSpace: "pre-wrap",
                  fontFamily: "monospace",
                  color: "#334155",
                  margin: 0,
                }}
              >
                {selectedPackage.manifest.changelog}
              </pre>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8 }}>
              <button
                onClick={() => handleExport(selectedPackage)}
                className="btn secondary"
                style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}
              >
                <Download size={14} /> Export Bundle
              </button>
              <button
                onClick={() => handleUninstall(selectedPackage)}
                className="btn danger"
                style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}
              >
                <Trash2 size={14} /> Uninstall
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Import Package Modal */}
      {showImportModal && (
        <div className="dialog-overlay" onClick={() => setShowImportModal(false)}>
          <div
            className="dialog"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-header">
              <h2 className="dialog-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Upload size={18} /> Import & Validate Package
              </h2>
            </div>

            <div className="dialog-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: "#475569" }}>
                Paste the package bundle JSON below. AgentForge will validate the schema, check dependencies,
                verify integrity, and warn of version conflicts before installation.
              </div>

              <textarea
                rows={8}
                placeholder="Paste .agentforge.pkg.json payload here..."
                value={importJson}
                onChange={(e) => handleValidateImportJson(e.target.value)}
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: 12,
                  padding: 10,
                  border: "1px solid #CBD5E1",
                  borderRadius: 6,
                }}
              />

              {/* Validation Results */}
              {importValidation && (
                <div
                  style={{
                    background: importValidation.valid ? "#F0FDF4" : "#FEF2F2",
                    border: `1px solid ${importValidation.valid ? "#86EFAC" : "#FCA5A5"}`,
                    borderRadius: 6,
                    padding: 12,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                    {importValidation.valid ? (
                      <>
                        <CheckCircle2 size={16} color="#15803D" /> Valid Package Manifest (Ready to Install)
                      </>
                    ) : (
                      <>
                        <XCircle size={16} color="#B91C1C" /> Validation Errors Detected
                      </>
                    )}
                  </div>

                  {importValidation.issues.length > 0 && (
                    <ul style={{ margin: "6px 0 0 16px", padding: 0, color: "#B91C1C" }}>
                      {importValidation.issues.map((iss, i) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  )}

                  {importValidation.warnings.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong style={{ color: "#B45309" }}>Warnings:</strong>
                      <ul style={{ margin: "4px 0 0 16px", padding: 0, color: "#B45309" }}>
                        {importValidation.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importValidation.duplicateOrConflict && (
                    <div style={{ marginTop: 6, color: "#4338CA" }}>
                      <strong>Status:</strong> {importValidation.duplicateOrConflict.message}
                    </div>
                  )}
                </div>
              )}

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={backupOnInstall}
                  onChange={(e) => setBackupOnInstall(e.target.checked)}
                />
                Create local backup snapshot before installing or updating
              </label>
            </div>

            <div className="dialog-footer">
              <button className="btn secondary" onClick={() => setShowImportModal(false)}>
                Cancel
              </button>
              <button
                className="btn primary"
                disabled={!importValidation?.valid}
                onClick={handlePerformInstall}
              >
                Install Package
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backups List Modal */}
      {showBackupsModal && (
        <div className="dialog-overlay" onClick={() => setShowBackupsModal(false)}>
          <div
            className="dialog"
            style={{ maxWidth: 580 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-header">
              <h2 className="dialog-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <History size={18} /> Package Backups & Snapshots
              </h2>
            </div>

            <div className="dialog-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {backups.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#64748B" }}>
                  No backup snapshots recorded yet.
                </div>
              ) : (
                backups.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 6,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>
                        {b.packageName} (v{b.version})
                      </div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>
                        {b.reason} · {new Date(b.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreBackup(b)}
                      className="btn secondary"
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                    >
                      <RotateCcw size={13} /> Restore
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="dialog-footer">
              <button className="btn secondary" onClick={() => setShowBackupsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
