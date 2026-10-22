export type AuditEventType =
  | "skill.created"
  | "skill.edited"
  | "skill.exported"
  | "skill.installed"
  | "skill.removed"
  | "agent.created"
  | "agent.edited"
  | "agent.exported"
  | "agent.installed"
  | "agent.removed"
  | "workflow.created"
  | "workflow.updated"
  | "workflow.deleted"
  | "execution.started"
  | "execution.paused"
  | "execution.completed"
  | "execution.failed"
  | "execution.cancelled"
  | "approval.recorded"
  | "package.imported"
  | "package.exported"
  | "settings.changed";

export type AuditOutcome = "success" | "failure" | "denied" | "cancelled";

export type AuditSeverity = "info" | "warning" | "error" | "critical";

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  resourceId: string;
  resourceName: string;
  outcome: AuditOutcome;
  severity: AuditSeverity;
  actor: string;
  details: Record<string, unknown>;
}

export interface AuditFilters {
  search?: string;
  eventType?: string;
  outcome?: string;
  resourceId?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
}

export interface GovernancePolicyConfig {
  leastPrivilegeEnforced: boolean;
  defaultNetworkAllowed: boolean;
  defaultFileSystemMode: "none" | "read" | "readwrite";
  defaultShellExecutionAllowed: boolean;
  defaultHumanApprovalRequired: boolean;
  defaultRestrictedPaths: string[];
  maxTokensLimit: number;
}

export interface PathValidationResult {
  valid: boolean;
  normalizedPath?: string;
  error?: string;
}

export const DEFAULT_GOVERNANCE_POLICY: GovernancePolicyConfig = {
  leastPrivilegeEnforced: true,
  defaultNetworkAllowed: false,
  defaultFileSystemMode: "read",
  defaultShellExecutionAllowed: false,
  defaultHumanApprovalRequired: true,
  defaultRestrictedPaths: [
    ".git",
    ".env",
    "*.pem",
    "*.key",
    "id_rsa*",
    "credentials*",
    "secrets*",
    "*.pfx",
    "*.keystore",
  ],
  maxTokensLimit: 8000,
};

export const SECURITY_DISCLAIMER =
  "Security Disclaimer: Local UI permission settings and policy declarations provide operational guardrails and defense-in-depth enforcement for AI tools. They do not provide complete isolation against a compromised host or malicious extension execution.";
