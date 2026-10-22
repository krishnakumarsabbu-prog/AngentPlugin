import * as path from "path";
import { PathValidationResult } from "../domain/governance/types";
import { PermissionPolicy } from "../domain/agents/types";

const SECRET_KEY_PATTERN =
  /(api_?key|secret|password|passwd|token|\bauth\b|auth_token|authToken|authorization|bearer|private_?key|credential|jwt|access_?token|refresh_?token|client_?secret)/i;

const SECRET_VALUE_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{20,}/g, // OpenAI-style API keys
  /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal tokens
  /gho_[a-zA-Z0-9]{36}/g, // GitHub OAuth tokens
  /github_pat_[a-zA-Z0-9_]{82}/g, // GitHub fine-grained PAT
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, // JWT tokens
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  /Bearer\s+[a-zA-Z0-9_.-]{16,}/gi,
];

/**
 * Recursively scrubs all sensitive secrets, credentials, API keys, and tokens
 * from audit log payloads before persistence.
 */
export function sanitizeAuditDetails(data: unknown): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    let sanitized = data;
    for (const pattern of SECRET_VALUE_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED_SECRET]");
    }
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditDetails(item));
  }

  if (typeof data === "object") {
    const cleanObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        cleanObj[key] = "[REDACTED_SECRET]";
      } else {
        cleanObj[key] = sanitizeAuditDetails(val);
      }
    }
    return cleanObj;
  }

  return data;
}

/**
 * Validates target file paths against path traversal attacks, null-byte injection,
 * and workspace sandbox escapes.
 */
export function validateWorkspacePath(
  targetPath: string,
  workspaceRoot: string = process.cwd()
): PathValidationResult {
  if (!targetPath || typeof targetPath !== "string") {
    return { valid: false, error: "Path must be a non-empty string." };
  }

  // Null-byte injection check
  if (targetPath.includes("\0") || targetPath.includes("%00")) {
    return { valid: false, error: "Path contains forbidden null-byte sequence." };
  }

  try {
    const normalizedRoot = path.resolve(workspaceRoot);
    const resolvedTarget = path.isAbsolute(targetPath)
      ? path.resolve(targetPath)
      : path.resolve(normalizedRoot, targetPath);

    // Check if the resolved target stays within the workspace root
    const relative = path.relative(normalizedRoot, resolvedTarget);
    const isEscaping = relative.startsWith("..") || path.isAbsolute(relative);

    if (isEscaping) {
      return {
        valid: false,
        error: `Path traversal detected: '${targetPath}' escapes workspace root '${workspaceRoot}'.`,
      };
    }

    return {
      valid: true,
      normalizedPath: resolvedTarget,
    };
  } catch (e) {
    return {
      valid: false,
      error: `Invalid file path syntax: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Validates permission declarations against least-privilege standards and human approval criteria.
 */
export function validatePermissionPolicy(policy?: Partial<PermissionPolicy>): {
  compliant: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!policy) {
    return { compliant: true, issues: [], warnings: [] };
  }

  const hasWrite =
    policy.fileSystem === "readwrite" ||
    (policy.fileSystem as unknown as string) === "write" ||
    !!policy.writeOperations;
  const hasShell = !!policy.shell;
  const hasNetwork = !!policy.network;
  const hasHumanApproval = !!policy.humanApprovalRequired;

  // High-privilege combinations require human approval
  if ((hasWrite || hasShell) && !hasHumanApproval) {
    issues.push("Elevated filesystem write or shell execution requires human approval gate.");
  }

  if (hasNetwork && !hasHumanApproval) {
    warnings.push("Network access declared without human approval requirement.");
  }

  if (policy.readOnly && policy.writeOperations) {
    issues.push("Contradiction: both read-only and write operations are enabled.");
  }

  // Check restricted paths list
  const restricted = policy.restrictedPaths || [];
  if (!restricted.includes(".git") || !restricted.includes(".env")) {
    warnings.push("Sensitive directories (.git, .env) should be declared in restricted paths.");
  }

  return {
    compliant: issues.length === 0,
    issues,
    warnings,
  };
}
