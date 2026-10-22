import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuditRepository, AuditPersistence } from "../src/storage/AuditRepository";
import {
  sanitizeAuditDetails,
  validateWorkspacePath,
  validatePermissionPolicy,
} from "../src/governance/SecuritySanitizer";
import {
  AuditEventType,
  AuditOutcome,
  DEFAULT_GOVERNANCE_POLICY,
  SECURITY_DISCLAIMER,
} from "../src/domain/governance/types";
import * as path from "path";

describe("Governance & Audit System", () => {
  describe("AuditRepository - Event Recording & Schema Compliance", () => {
    let repo: AuditRepository;
    let mockPersistence: AuditPersistence;
    let persistedData: unknown[] = [];

    beforeEach(() => {
      persistedData = [];
      mockPersistence = {
        loadAuditEvents: vi.fn(() => [...persistedData] as any),
        saveAuditEvents: vi.fn((events) => {
          persistedData = [...events];
        }),
      };
      repo = new AuditRepository(mockPersistence);
    });

    it("records an audit event with all required fields", async () => {
      const event = await repo.recordEvent({
        eventType: "skill.created",
        resourceId: "skill-react-refactor",
        resourceName: "React Refactoring Assistant",
        outcome: "success",
        details: { version: "1.0.0", author: "Developer" },
      });

      expect(event.id).toBeDefined();
      expect(typeof event.id).toBe("string");
      expect(event.timestamp).toBeDefined();
      expect(new Date(event.timestamp).getTime()).not.toBeNaN();
      expect(event.eventType).toBe("skill.created");
      expect(event.resourceId).toBe("skill-react-refactor");
      expect(event.resourceName).toBe("React Refactoring Assistant");
      expect(event.outcome).toBe("success");
      expect(event.details).toEqual({ version: "1.0.0", author: "Developer" });
      expect(mockPersistence.saveAuditEvents).toHaveBeenCalledTimes(1);
    });

    it("records events for all mandatory event types across the platform", async () => {
      const eventTypes: AuditEventType[] = [
        "skill.created",
        "skill.edited",
        "skill.exported",
        "skill.installed",
        "skill.removed",
        "agent.created",
        "agent.edited",
        "agent.exported",
        "agent.installed",
        "agent.removed",
        "workflow.created",
        "workflow.changed",
        "execution.started",
        "execution.paused",
        "execution.completed",
        "execution.failed",
        "execution.cancelled",
        "approval.recorded",
        "package.imported",
        "package.exported",
        "settings.changed",
      ];

      for (const et of eventTypes) {
        const ev = await repo.recordEvent({
          eventType: et,
          resourceId: `res-${et}`,
          resourceName: `Resource for ${et}`,
          outcome: "success",
        });
        expect(ev.eventType).toBe(et);
      }

      const all = await repo.list();
      expect(all.length).toBe(eventTypes.length);
    });

    it("filters events by search query, eventType, outcome, and severity", async () => {
      await repo.recordEvent({
        eventType: "agent.created",
        resourceId: "agent-planner",
        resourceName: "Enterprise Planner",
        outcome: "success",
        severity: "info",
      });

      await repo.recordEvent({
        eventType: "execution.failed",
        resourceId: "run-998",
        resourceName: "Deploy Pipeline Run #998",
        outcome: "failure",
        severity: "error",
      });

      await repo.recordEvent({
        eventType: "approval.recorded",
        resourceId: "approval-gate-1",
        resourceName: "Production Deployment Gate",
        outcome: "denied",
        severity: "warning",
      });

      // Filter by search
      const searched = await repo.list({ search: "planner" });
      expect(searched.length).toBe(1);
      expect(searched[0].resourceName).toBe("Enterprise Planner");

      // Filter by eventType prefix
      const execEvents = await repo.list({ eventType: "execution" as any });
      expect(execEvents.length).toBe(1);
      expect(execEvents[0].eventType).toBe("execution.failed");

      // Filter by outcome
      const deniedEvents = await repo.list({ outcome: "denied" });
      expect(deniedEvents.length).toBe(1);
      expect(deniedEvents[0].outcome).toBe("denied");

      // Filter by severity
      const errorEvents = await repo.list({ severity: "error" });
      expect(errorEvents.length).toBe(1);
      expect(errorEvents[0].severity).toBe("error");
    });

    it("handles persistence write errors gracefully without crashing the application", async () => {
      const failingPersistence: AuditPersistence = {
        loadAuditEvents: () => [],
        saveAuditEvents: () => {
          throw new Error("Disk full or permission denied");
        },
      };

      const resilientRepo = new AuditRepository(failingPersistence);
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const event = await resilientRepo.recordEvent({
        eventType: "settings.changed",
        resourceId: "system-settings",
        resourceName: "Security Preferences",
        outcome: "success",
      });

      expect(event).toBeDefined();
      expect(event.eventType).toBe("settings.changed");
      const list = await resilientRepo.list();
      expect(list.length).toBe(1);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("enforces max retention cap to prevent unbounded disk growth", async () => {
      const testRepo = new AuditRepository();
      // Record 520 events
      for (let i = 0; i < 520; i++) {
        await testRepo.recordEvent({
          eventType: "execution.completed",
          resourceId: `run-${i}`,
          resourceName: `Run ${i}`,
          outcome: "success",
        });
      }

      const events = await testRepo.list();
      expect(events.length).toBe(500);
      expect(events[0].resourceName).toBe("Run 519"); // Latest event remains at top
    });

    it("clears audit events when requested", async () => {
      await repo.recordEvent({
        eventType: "skill.created",
        resourceId: "s-1",
        resourceName: "Test Skill",
        outcome: "success",
      });

      expect((await repo.list()).length).toBe(1);
      await repo.clear();
      expect((await repo.list()).length).toBe(0);
    });
  });

  describe("SecuritySanitizer - Sensitive Data Exclusion", () => {
    it("never stores raw API keys or passwords in audit details", () => {
      const sensitiveInput = {
        username: "admin",
        apiKey: "sk-proj-1234567890abcdef1234567890",
        password: "SuperSecretPassword123!",
        nested: {
          client_secret: "secret-token-xyz",
          normalField: "public-value",
        },
      };

      const sanitized = sanitizeAuditDetails(sensitiveInput) as any;
      expect(sanitized.username).toBe("admin");
      expect(sanitized.apiKey).toBe("[REDACTED_SECRET]");
      expect(sanitized.password).toBe("[REDACTED_SECRET]");
      expect(sanitized.nested.client_secret).toBe("[REDACTED_SECRET]");
      expect(sanitized.nested.normalField).toBe("public-value");
    });

    it("redacts tokens and keys embedded inside arbitrary strings and messages", () => {
      const stringInput =
        "Authorization: Bearer my-secret-jwt-token-with-high-entropy-12345678 and OpenAI key sk-1234567890abcdef1234567890";
      const sanitized = sanitizeAuditDetails(stringInput) as string;

      expect(sanitized).not.toContain("sk-1234567890abcdef1234567890");
      expect(sanitized).not.toContain("Bearer my-secret-jwt-token-with-high-entropy-12345678");
      expect(sanitized).toContain("[REDACTED_SECRET]");
    });

    it("redacts GitHub personal access tokens (ghp_ and gho_)", () => {
      const payload = {
        exportTarget: "github-copilot",
        token: "ghp_123456789012345678901234567890123456",
        oauth: "gho_abcdefghijklmnopqrstuvwxyz0123456789",
      };

      const sanitized = sanitizeAuditDetails(payload) as any;
      expect(sanitized.token).toBe("[REDACTED_SECRET]");
      expect(sanitized.oauth).toBe("[REDACTED_SECRET]");
    });

    it("redacts private key blocks", () => {
      const rsaKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0m4w...sample...
-----END RSA PRIVATE KEY-----`;
      const sanitized = sanitizeAuditDetails({ keyBlock: rsaKey }) as any;
      expect(sanitized.keyBlock).toBe("[REDACTED_SECRET]");
    });

    it("preserves non-sensitive data and arrays", () => {
      const safeData = {
        workflowName: "Enterprise Release",
        nodeCount: 14,
        tags: ["production", "release", "v2"],
        valid: true,
      };

      const sanitized = sanitizeAuditDetails(safeData);
      expect(sanitized).toEqual(safeData);
    });
  });

  describe("SecuritySanitizer - Path Traversal & Workspace Isolation", () => {
    const mockWorkspace = path.resolve("/app/workspace");

    it("rejects path traversal attempting to escape workspace root via '..'", () => {
      const traversalPaths = [
        "../../etc/passwd",
        "../../../windows/system32/cmd.exe",
        "subfolder/../../outside.env",
        "/outside/workspace/file.txt",
      ];

      for (const p of traversalPaths) {
        const res = validateWorkspacePath(p, mockWorkspace);
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/Path traversal detected/);
      }
    });

    it("rejects null-byte injection attacks", () => {
      const nullBytePaths = ["allowed.txt\0.exe", "test%00.sh"];

      for (const p of nullBytePaths) {
        const res = validateWorkspacePath(p, mockWorkspace);
        expect(res.valid).toBe(false);
        expect(res.error).toMatch(/null-byte/i);
      }
    });

    it("accepts valid safe relative paths inside workspace root", () => {
      const safePaths = [
        "src/index.ts",
        "package.json",
        "skills/code-review/SKILL.md",
        "docs/images/arch.png",
      ];

      for (const p of safePaths) {
        const res = validateWorkspacePath(p, mockWorkspace);
        expect(res.valid).toBe(true);
        expect(res.normalizedPath).toBeDefined();
        expect(res.normalizedPath?.startsWith(mockWorkspace)).toBe(true);
      }
    });

    it("rejects empty or non-string paths", () => {
      expect(validateWorkspacePath("", mockWorkspace).valid).toBe(false);
      expect(validateWorkspacePath(null as any, mockWorkspace).valid).toBe(false);
    });
  });

  describe("SecuritySanitizer - Permission Policy & Least Privilege", () => {
    it("flags elevated filesystem write or shell permissions without human approval gate", () => {
      const highPrivilegeNoApproval = {
        fileSystem: "write" as const,
        shell: true,
        network: false,
        humanApprovalRequired: false,
      };

      const validation = validatePermissionPolicy(highPrivilegeNoApproval);
      expect(validation.compliant).toBe(false);
      expect(validation.issues).toContain(
        "Elevated filesystem write or shell execution requires human approval gate."
      );
    });

    it("detects contradiction between read-only and writeOperations", () => {
      const contradictory = {
        readOnly: true,
        writeOperations: true,
        humanApprovalRequired: true,
      };

      const validation = validatePermissionPolicy(contradictory);
      expect(validation.compliant).toBe(false);
      expect(validation.issues).toContain(
        "Contradiction: both read-only and write operations are enabled."
      );
    });

    it("warns when sensitive directories (.git, .env) are omitted from restricted paths", () => {
      const policyWithoutRestricted = {
        fileSystem: "readonly" as const,
        shell: false,
        humanApprovalRequired: false,
        restrictedPaths: [],
      };

      const validation = validatePermissionPolicy(policyWithoutRestricted);
      expect(validation.warnings).toContain(
        "Sensitive directories (.git, .env) should be declared in restricted paths."
      );
    });

    it("passes compliant policy conforming to least-privilege standards", () => {
      const compliantPolicy = {
        fileSystem: "readonly" as const,
        shell: false,
        network: false,
        humanApprovalRequired: true,
        restrictedPaths: [".git", ".env", "*.pem", "*.key"],
      };

      const validation = validatePermissionPolicy(compliantPolicy);
      expect(validation.compliant).toBe(true);
      expect(validation.issues.length).toBe(0);
      expect(validation.warnings.length).toBe(0);
    });

    it("confirms default governance policy enforces least privilege", () => {
      expect(DEFAULT_GOVERNANCE_POLICY.leastPrivilegeEnforced).toBe(true);
      expect(DEFAULT_GOVERNANCE_POLICY.defaultFileSystemMode).toMatch(/read/);
      expect(DEFAULT_GOVERNANCE_POLICY.defaultShellExecutionAllowed).toBe(false);
      expect(DEFAULT_GOVERNANCE_POLICY.defaultNetworkAllowed).toBe(false);
      expect(DEFAULT_GOVERNANCE_POLICY.defaultHumanApprovalRequired).toBe(true);
      expect(DEFAULT_GOVERNANCE_POLICY.defaultRestrictedPaths).toContain(".git");
      expect(DEFAULT_GOVERNANCE_POLICY.defaultRestrictedPaths).toContain(".env");
    });

    it("confirms security disclaimer emphasizes non-complete isolation from hostile host", () => {
      expect(SECURITY_DISCLAIMER).toContain("Security Disclaimer");
      expect(SECURITY_DISCLAIMER).toContain("compromised host or malicious extension");
    });
  });
});
