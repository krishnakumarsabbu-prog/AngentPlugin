import { hasVsCodeApi, sendRequest } from "./vscodeApi";
import { demoAuditEvents } from "../data/demoData";
import type {
  AuditEvent,
  AuditFilters,
  AuditEventType,
  AuditOutcome,
  GovernancePolicyConfig,
  PathValidationResult,
  PermissionPolicy,
} from "../types";

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

const SECRET_KEY_PATTERN =
  /(api_?key|secret|password|passwd|token|\bauth\b|auth_token|authToken|authorization|bearer|private_?key|credential|jwt|access_?token|refresh_?token|client_?secret)/i;

const SECRET_VALUE_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /gho_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9_]{82}/g,
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
  /Bearer\s+[a-zA-Z0-9_.-]{16,}/gi,
];

export function sanitizeDetailsClient(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") {
    let sanitized = data;
    for (const pattern of SECRET_VALUE_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED_SECRET]");
    }
    return sanitized;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeDetailsClient(item));
  }
  if (typeof data === "object") {
    const cleanObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        cleanObj[key] = "[REDACTED_SECRET]";
      } else {
        cleanObj[key] = sanitizeDetailsClient(val);
      }
    }
    return cleanObj;
  }
  return data;
}

export function validatePathClient(targetPath: string): PathValidationResult {
  if (!targetPath || typeof targetPath !== "string") {
    return { valid: false, error: "Path must be a non-empty string." };
  }
  if (targetPath.includes("\0") || targetPath.includes("%00")) {
    return { valid: false, error: "Path contains forbidden null-byte sequence." };
  }
  if (targetPath.includes("..")) {
    return { valid: false, error: "Path traversal detected ('..'). Paths must be within workspace boundary." };
  }
  return { valid: true, normalizedPath: targetPath.replace(/\\/g, "/") };
}

export function validatePermissionsClient(policy?: Partial<PermissionPolicy>): {
  compliant: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  if (!policy) return { compliant: true, issues: [], warnings: [] };

  const hasWrite = policy.fileSystem === "readwrite" || !!policy.writeOperations;
  const hasShell = !!policy.shell;
  const hasNetwork = !!policy.network;
  const hasHumanApproval = !!policy.humanApprovalRequired;

  if ((hasWrite || hasShell) && !hasHumanApproval) {
    issues.push("Elevated filesystem write or shell execution requires human approval gate.");
  }
  if (hasNetwork && !hasHumanApproval) {
    warnings.push("Network access declared without human approval requirement.");
  }
  if (policy.readOnly && policy.writeOperations) {
    issues.push("Contradiction: both read-only and write operations are enabled.");
  }
  const restricted = policy.restrictedPaths || [];
  if (!restricted.includes(".git") || !restricted.includes(".env")) {
    warnings.push("Sensitive directories (.git, .env) should be declared in restricted paths.");
  }

  return { compliant: issues.length === 0, issues, warnings };
}

// In-memory browser fallback store
let localEvents: AuditEvent[] = [];

export const auditService = {
  async list(filters?: AuditFilters): Promise<AuditEvent[]> {
    if (hasVsCodeApi()) {
      try {
        const events = await sendRequest<AuditEvent[]>("audit.list", { filters });
        if (Array.isArray(events)) return events;
      } catch {
        // Fallback to local cache
      }
    }

    let res = [...localEvents];
    if (!filters) return res;

    if (filters.search) {
      const q = filters.search.toLowerCase();
      res = res.filter(
        (e) =>
          e.resourceName.toLowerCase().includes(q) ||
          e.resourceId.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q) ||
          JSON.stringify(e.details).toLowerCase().includes(q)
      );
    }
    if (filters.eventType && filters.eventType !== "all") {
      res = res.filter((e) => e.eventType.startsWith(filters.eventType!));
    }
    if (filters.outcome && filters.outcome !== "all") {
      res = res.filter((e) => e.outcome === filters.outcome);
    }
    if (filters.resourceId) {
      res = res.filter((e) => e.resourceId === filters.resourceId);
    }
    if (filters.severity && filters.severity !== "all") {
      res = res.filter((e) => e.severity === filters.severity);
    }
    return res;
  },

  async record(event: {
    eventType: AuditEventType;
    resourceId: string;
    resourceName: string;
    outcome: AuditOutcome;
    details?: Record<string, unknown>;
    actor?: string;
    severity?: "info" | "warning" | "error" | "critical";
  }): Promise<AuditEvent> {
    const cleanDetails = (sanitizeDetailsClient(event.details || {}) as Record<string, unknown>) || {};
    const newEvent: AuditEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      eventType: event.eventType,
      resourceId: event.resourceId,
      resourceName: event.resourceName,
      outcome: event.outcome,
      severity: event.severity || (event.outcome === "failure" ? "error" : "info"),
      actor: event.actor || "User",
      details: cleanDetails,
    };

    localEvents = [newEvent, ...localEvents].slice(0, 500);

    if (hasVsCodeApi()) {
      try {
        await sendRequest("audit.record", { event: newEvent });
      } catch {
        // Safe error handling
      }
    }

    return newEvent;
  },

  async clear(): Promise<void> {
    localEvents = [];
    if (hasVsCodeApi()) {
      try {
        await sendRequest("audit.clear");
      } catch {
        // Safe error handling
      }
    }
  },

  getGovernancePolicy(): GovernancePolicyConfig {
    return DEFAULT_GOVERNANCE_POLICY;
  },

  validatePath: validatePathClient,
  validatePermissions: validatePermissionsClient,
};
