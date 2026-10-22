import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, RotateCcw, AlertTriangle, Plus, X } from "lucide-react";
import type { PermissionPolicy } from "../../../types";
import type { AgentBuilderFormState } from "./types";
import { LEAST_PRIVILEGE_POLICY } from "./types";

interface PermissionsSectionProps {
  state: AgentBuilderFormState;
  onChange: (patch: Partial<AgentBuilderFormState>) => void;
  errors: Record<string, string>;
}

export const PermissionsSection: React.FC<PermissionsSectionProps> = ({
  state,
  onChange,
  errors,
}) => {
  const policy = state.permissionPolicy;
  const [newPath, setNewPath] = useState("");

  const updatePolicy = (patch: Partial<PermissionPolicy>) => {
    onChange({
      permissionPolicy: {
        ...policy,
        ...patch,
      },
    });
  };

  const handleResetLeastPrivilege = () => {
    onChange({
      permissionPolicy: { ...LEAST_PRIVILEGE_POLICY },
    });
  };

  const handleAddRestrictedPath = () => {
    const trimmed = newPath.trim();
    if (!trimmed) return;
    const current = policy.restrictedPaths || [];
    if (!current.includes(trimmed)) {
      updatePolicy({ restrictedPaths: [...current, trimmed] });
    }
    setNewPath("");
  };

  const handleRemoveRestrictedPath = (path: string) => {
    const current = policy.restrictedPaths || [];
    updatePolicy({ restrictedPaths: current.filter((p) => p !== path) });
  };

  const isLeastPrivilege =
    policy.readOnly === true &&
    policy.writeOperations === false &&
    policy.shell === false &&
    policy.network === false &&
    policy.humanApprovalRequired === true;

  const hasContradiction = policy.readOnly && policy.writeOperations;

  return (
    <div className="card builder-section" id="section-permissions">
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 className="card-title">5. Permission Policy & Boundaries</h2>
            {isLeastPrivilege ? (
              <span className="badge badge-success" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <ShieldCheck size={12} /> Least-Privilege Active
              </span>
            ) : (
              <span className="badge badge-warning" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <ShieldAlert size={12} /> Elevated Privileges
              </span>
            )}
          </div>
          <p className="card-description">
            Enforce strict security boundaries. By default, agents operate in read-only mode with human confirmation required.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleResetLeastPrivilege}
          title="Reset to recommended least-privilege defaults"
        >
          <RotateCcw size={12} /> Reset to Least-Privilege
        </button>
      </div>

      {hasContradiction && (
        <div style={{ padding: "10px 14px", background: "#FEE2E2", border: "1px solid #EF4444", borderRadius: "var(--radius)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", color: "#991B1B" }}>
          <AlertTriangle size={16} />
          <span><strong>Permission Contradiction:</strong> Both Read-Only and Write Operations are declared true. Uncheck write operations or set Read-Only to false.</span>
        </div>
      )}

      {/* Permission Toggles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        {/* Read-Only */}
        <div style={{ border: "1px solid var(--border)", padding: "12px", borderRadius: "var(--radius)", background: "var(--surface)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={policy.readOnly ?? true}
              onChange={(e) => updatePolicy({ readOnly: e.target.checked })}
              style={{ marginTop: "3px" }}
            />
            <div>
              <strong style={{ fontSize: "13px", display: "block" }}>Read-Only Mode</strong>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Restricts agent strictly from mutating workspace files or external state.
              </span>
            </div>
          </label>
        </div>

        {/* Workspace Access */}
        <div style={{ border: "1px solid var(--border)", padding: "12px", borderRadius: "var(--radius)", background: "var(--surface)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={policy.workspaceAccess ?? true}
              onChange={(e) => updatePolicy({ workspaceAccess: e.target.checked })}
              style={{ marginTop: "3px" }}
            />
            <div>
              <strong style={{ fontSize: "13px", display: "block" }}>Workspace Confinement</strong>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Restricts file reads strictly to the current workspace root directory.
              </span>
            </div>
          </label>
        </div>

        {/* Write Operations */}
        <div style={{ border: "1px solid var(--border)", padding: "12px", borderRadius: "var(--radius)", background: "var(--surface)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={policy.writeOperations ?? false}
              onChange={(e) => {
                const checked = e.target.checked;
                updatePolicy({
                  writeOperations: checked,
                  fileSystem: checked ? "readwrite" : "read",
                  ...(checked && policy.readOnly ? { readOnly: false } : {}),
                });
              }}
              style={{ marginTop: "3px" }}
            />
            <div>
              <strong style={{ fontSize: "13px", display: "block" }}>Write Operations</strong>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Allows the agent to write or modify project files in the workspace.
              </span>
            </div>
          </label>
        </div>

        {/* Human Approval Required */}
        <div style={{ border: "1px solid var(--border)", padding: "12px", borderRadius: "var(--radius)", background: "var(--surface)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={policy.humanApprovalRequired ?? true}
              onChange={(e) => updatePolicy({ humanApprovalRequired: e.target.checked })}
              style={{ marginTop: "3px" }}
            />
            <div>
              <strong style={{ fontSize: "13px", display: "block" }}>Human Approval Required</strong>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Requires explicit operator confirmation before executing sensitive actions or file writes.
              </span>
            </div>
          </label>
        </div>

        {/* Command Execution Declaration (Shell) */}
        <div style={{ border: "1px solid var(--border)", padding: "12px", borderRadius: "var(--radius)", background: "var(--surface)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={policy.shell ?? false}
              onChange={(e) => updatePolicy({ shell: e.target.checked })}
              style={{ marginTop: "3px" }}
            />
            <div>
              <strong style={{ fontSize: "13px", display: "block" }}>Command Execution Declaration (Shell)</strong>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Declares intent to request shell commands. (Always requires operator confirmation in runner platforms).
              </span>
            </div>
          </label>
        </div>

        {/* Network Declaration */}
        <div style={{ border: "1px solid var(--border)", padding: "12px", borderRadius: "var(--radius)", background: "var(--surface)" }}>
          <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={policy.network ?? false}
              onChange={(e) => updatePolicy({ network: e.target.checked })}
              style={{ marginTop: "3px" }}
            />
            <div>
              <strong style={{ fontSize: "13px", display: "block" }}>Network Declaration</strong>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Declares external network access for API queries or package indexing.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Max Token Budget & Restricted Paths */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div className="form-group">
          <label className="form-label" htmlFor="perm-tokens">
            Max Token Budget per Invocation
          </label>
          <input
            id="perm-tokens"
            type="number"
            className="input"
            step={1000}
            min={1000}
            max={128000}
            value={policy.maxTokens ?? 8000}
            onChange={(e) => updatePolicy({ maxTokens: parseInt(e.target.value, 10) || 8000 })}
          />
          <span className="field-hint" style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            Tokens context limit (default 8,000; max 128,000).
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">
            Restricted Paths (Security Denylist)
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {(policy.restrictedPaths || []).map((path) => (
              <span
                key={path}
                className="badge"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  background: "var(--surface-alt)",
                  border: "1px solid var(--border)",
                }}
              >
                <code>{path}</code>
                <button
                  type="button"
                  style={{ border: "none", background: "none", padding: 0, cursor: "pointer", display: "flex" }}
                  onClick={() => handleRemoveRestrictedPath(path)}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              className="input"
              style={{ fontSize: "12px", height: "30px" }}
              placeholder="e.g., .env or *.key"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRestrictedPath();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ height: "30px" }}
              onClick={handleAddRestrictedPath}
              disabled={!newPath.trim()}
            >
              <Plus size={12} /> Add Path
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
