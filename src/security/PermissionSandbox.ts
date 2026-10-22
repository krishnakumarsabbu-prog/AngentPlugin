import * as fs from "fs";
import * as path from "path";
import { PermissionPolicy } from "../domain/agents/types";
import { validateWorkspacePath } from "../governance/SecuritySanitizer";

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  sanitizedPath?: string;
}

export type ToolCategory = "filesystem_read" | "filesystem_write" | "network" | "shell" | "computation";

const DEFAULT_RESTRICTED_PATTERNS = [
  /\.env(\.|$)/i,
  /\.git(\/|\\|$)/i,
  /\.(pem|key|crt|p12|pfx)$/i,
  /(id_rsa|id_ed25519|id_ecdsa)(\.|$)/i,
  /(credentials|secrets|passwords?)(\.json|\.yml|\.yaml|\.txt|$)/i,
];

/**
 * Sandboxing and Permission Enforcement Engine.
 * Enforces least-privilege policies, restricts filesystem escape,
 * and intercepts all tool execution requests from live platform adapters.
 */
export class PermissionEnforcer {
  /**
   * Categorizes a tool by its operational risk profile.
   */
  public static categorizeTool(toolName: string): ToolCategory {
    const lower = toolName.toLowerCase();
    if (lower.includes("write") || lower.includes("save") || lower.includes("delete") || lower.includes("remove") || lower.includes("modify")) {
      return "filesystem_write";
    }
    if (lower.includes("read") || lower.includes("list") || lower.includes("find") || lower.includes("inspect") || lower.includes("analyze") || lower.includes("search")) {
      return "filesystem_read";
    }
    if (lower.includes("fetch") || lower.includes("http") || lower.includes("download") || lower.includes("request") || lower.includes("api")) {
      return "network";
    }
    if (lower.includes("exec") || lower.includes("shell") || lower.includes("command") || lower.includes("terminal") || lower.includes("bash")) {
      return "shell";
    }
    return "computation";
  }

  /**
   * Verifies if a tool can be executed given the agent's permission policy
   * and the current workspace sandbox boundaries.
   */
  public static checkPermission(
    toolName: string,
    args: Record<string, unknown>,
    policy: Partial<PermissionPolicy> = {},
    workspaceRoot: string = process.cwd()
  ): PermissionCheckResult {
    const category = this.categorizeTool(toolName);

    // 1. Shell command permissions
    if (category === "shell") {
      if (!policy.shell) {
        return {
          allowed: false,
          reason: `Permission denied: Tool '${toolName}' requires shell execution permission, which is disabled in agent policy.`,
        };
      }
    }

    // 2. Network permissions
    if (category === "network") {
      if (!policy.network) {
        return {
          allowed: false,
          reason: `Permission denied: Tool '${toolName}' requires outbound network access, which is disabled in agent policy.`,
        };
      }
    }

    // 3. Filesystem write permissions
    if (category === "filesystem_write") {
      const fsMode = policy.fileSystem || "read";
      const isWriteAllowed = fsMode === "readwrite" && !policy.readOnly && policy.writeOperations !== false;
      if (!isWriteAllowed) {
        return {
          allowed: false,
          reason: `Permission denied: Tool '${toolName}' requires filesystem write permissions (current mode: '${fsMode}', readOnly: ${!!policy.readOnly}).`,
        };
      }
    }

    // 4. Filesystem read permissions
    if (category === "filesystem_read") {
      const fsMode = policy.fileSystem || "read";
      if (fsMode === "none") {
        return {
          allowed: false,
          reason: `Permission denied: Tool '${toolName}' requires filesystem access, but filesystem mode is set to 'none'.`,
        };
      }
    }

    // 5. File path inspection for any tool receiving path-like arguments
    const candidatePath =
      (typeof args.path === "string" && args.path) ||
      (typeof args.filePath === "string" && args.filePath) ||
      (typeof args.targetPath === "string" && args.targetPath) ||
      (typeof args.file === "string" && args.file) ||
      (typeof args.directory === "string" && args.directory) ||
      undefined;

    if (candidatePath) {
      // Path traversal check
      const pathValidation = validateWorkspacePath(candidatePath, workspaceRoot);
      if (!pathValidation.valid) {
        return {
          allowed: false,
          reason: `Sandbox violation: ${pathValidation.error}`,
        };
      }

      const normalized = pathValidation.normalizedPath!;

      // Restricted paths check
      const restrictedList = policy.restrictedPaths || [".env", ".git", "*.key", "*.pem"];
      const relative = path.relative(workspaceRoot, normalized).replace(/\\/g, "/");

      for (const pattern of DEFAULT_RESTRICTED_PATTERNS) {
        if (pattern.test(relative) || pattern.test(path.basename(normalized))) {
          return {
            allowed: false,
            reason: `Access denied: Target path '${candidatePath}' matches security-restricted file pattern.`,
          };
        }
      }

      for (const item of restrictedList) {
        const clean = item.trim().replace(/^\*\./, ".");
        if (clean && (relative.includes(clean) || path.basename(normalized).includes(clean))) {
          return {
            allowed: false,
            reason: `Access denied: Path '${candidatePath}' is restricted by agent governance policy ('${item}').`,
          };
        }
      }

      return {
        allowed: true,
        sanitizedPath: normalized,
      };
    }

    return { allowed: true };
  }

  /**
   * Executes a built-in safe workspace tool within the sandboxed environment.
   */
  public static async executeSafeTool(
    toolName: string,
    args: Record<string, unknown>,
    workspaceRoot: string = process.cwd(),
    policy: Partial<PermissionPolicy> = {}
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const check = this.checkPermission(toolName, args, policy, workspaceRoot);
    if (!check.allowed) {
      return { success: false, error: check.reason };
    }

    try {
      switch (toolName) {
        case "read_workspace_file": {
          const filePath = check.sanitizedPath || path.resolve(workspaceRoot, String(args.path || args.filePath));
          if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${args.path || args.filePath}` };
          }
          const stat = await fs.promises.stat(filePath);
          if (stat.isDirectory()) {
            return { success: false, error: `Target path is a directory, not a file: ${args.path || args.filePath}` };
          }
          if (stat.size > 1024 * 1024) {
            return { success: false, error: `File size exceeds safe inspection boundary (1 MB limit).` };
          }
          const content = await fs.promises.readFile(filePath, "utf8");
          return {
            success: true,
            result: {
              path: path.relative(workspaceRoot, filePath).replace(/\\/g, "/"),
              bytes: stat.size,
              content,
            },
          };
        }

        case "write_workspace_file": {
          const filePath = check.sanitizedPath || path.resolve(workspaceRoot, String(args.path || args.filePath));
          const content = String(args.content ?? "");
          await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
          await fs.promises.writeFile(filePath, content, "utf8");
          return {
            success: true,
            result: {
              path: path.relative(workspaceRoot, filePath).replace(/\\/g, "/"),
              bytesWritten: Buffer.byteLength(content, "utf8"),
              status: "written",
            },
          };
        }

        case "list_workspace_files": {
          const targetDir = check.sanitizedPath || path.resolve(workspaceRoot, String(args.path || args.directory || ""));
          if (!fs.existsSync(targetDir)) {
            return { success: false, error: `Directory not found: ${args.path || args.directory}` };
          }
          const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });
          const items = entries.map((e) => ({
            name: e.name,
            isDirectory: e.isDirectory(),
            relativePath: path.relative(workspaceRoot, path.join(targetDir, e.name)).replace(/\\/g, "/"),
          }));
          return {
            success: true,
            result: {
              directory: path.relative(workspaceRoot, targetDir).replace(/\\/g, "/") || ".",
              entries: items.slice(0, 50),
            },
          };
        }

        case "analyze_code_structure": {
          const filePath = check.sanitizedPath || path.resolve(workspaceRoot, String(args.path || args.filePath));
          if (!fs.existsSync(filePath)) {
            return { success: false, error: `Source file not found: ${args.path || args.filePath}` };
          }
          const content = await fs.promises.readFile(filePath, "utf8");
          const lines = content.split("\n");
          const functions = lines.filter((l) => /^\s*(export\s+)?(async\s+)?function\s+([a-zA-Z0-9_]+)/.test(l)).map((l) => l.trim());
          const classes = lines.filter((l) => /^\s*(export\s+)?class\s+([a-zA-Z0-9_]+)/.test(l)).map((l) => l.trim());
          const imports = lines.filter((l) => /^\s*import\s+/.test(l)).map((l) => l.trim());
          const exports = lines.filter((l) => /^\s*export\s+/.test(l)).map((l) => l.trim());

          return {
            success: true,
            result: {
              file: path.relative(workspaceRoot, filePath).replace(/\\/g, "/"),
              totalLines: lines.length,
              classesCount: classes.length,
              functionsCount: functions.length,
              importsSummary: imports.slice(0, 10),
              classes,
              functions: functions.slice(0, 15),
            },
          };
        }

        case "generate_deliverable": {
          const title = String(args.title || "Deliverable Artifact");
          const summary = String(args.summary || "");
          const details = args.details || {};
          return {
            success: true,
            result: {
              deliverableId: `deliv-${Date.now()}`,
              title,
              summary,
              details,
              timestamp: new Date().toISOString(),
              verified: true,
            },
          };
        }

        default:
          return {
            success: false,
            error: `Unsupported tool '${toolName}'. Only registered safe workspace tools can be executed.`,
          };
      }
    } catch (err) {
      return {
        success: false,
        error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
