import * as path from "path";
import * as fs from "fs";

export interface PathValidationResult {
  valid: boolean;
  resolvedPath: string;
  error?: string;
}

export interface SecretScrubResult {
  scrubbed: string;
  secretsDetectedCount: number;
  detectedPatterns: string[];
}

export class PersonaSecuritySandbox {
  private readonly workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = path.resolve(workspaceRoot);
  }

  /**
   * Validates that targetPath is strictly inside the authorized workspace root.
   * Defends against directory traversal (`..`, null-byte injections, symlink escapes).
   */
  public validatePathWithinWorkspace(targetPath: string): PathValidationResult {
    if (!targetPath || typeof targetPath !== "string") {
      return { valid: false, resolvedPath: "", error: "Invalid path provided." };
    }

    if (targetPath.includes("\0")) {
      return { valid: false, resolvedPath: "", error: "Null byte detected in path." };
    }

    const resolved = path.resolve(this.workspaceRoot, targetPath);

    // Ensure resolved path starts with workspaceRoot
    const relative = path.relative(this.workspaceRoot, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return {
        valid: false,
        resolvedPath: resolved,
        error: `Path traversal violation: '${targetPath}' resolves outside workspace boundary '${this.workspaceRoot}'.`,
      };
    }

    // Verify symlink if path exists
    try {
      if (fs.existsSync(resolved)) {
        const real = fs.realpathSync(resolved);
        const realRel = path.relative(this.workspaceRoot, real);
        if (realRel.startsWith("..") || path.isAbsolute(realRel)) {
          return {
            valid: false,
            resolvedPath: resolved,
            error: `Symlink escape violation: '${targetPath}' points outside workspace boundary.`,
          };
        }
      }
    } catch {
      // Inaccessible or deleted during check
    }

    return { valid: true, resolvedPath: resolved };
  }

  /**
   * Secret detection and scrubbing.
   * Redacts API keys, JWTs, private keys, AWS tokens, connection strings, etc.
   */
  public scrubSecrets(content: string): SecretScrubResult {
    if (!content || typeof content !== "string") {
      return { scrubbed: "", secretsDetectedCount: 0, detectedPatterns: [] };
    }

    let scrubbed = content;
    const detectedPatterns: string[] = [];
    let count = 0;

    const patterns: { name: string; regex: RegExp; replacement: string }[] = [
      {
        name: "private_key",
        regex: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/gi,
        replacement: "[REDACTED_PRIVATE_KEY]",
      },
      {
        name: "openai_key",
        regex: /sk-[a-zA-Z0-9]{20,64}/g,
        replacement: "sk-[REDACTED_OPENAI_KEY]",
      },
      {
        name: "anthropic_key",
        regex: /sk-ant-[a-zA-Z0-9_-]{20,80}/g,
        replacement: "sk-ant-[REDACTED_ANTHROPIC_KEY]",
      },
      {
        name: "aws_access_key",
        regex: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g,
        replacement: "[REDACTED_AWS_ACCESS_KEY]",
      },
      {
        name: "github_token",
        regex: /gh[pousr]-[a-zA-Z0-9]{36,255}/g,
        replacement: "ghp-[REDACTED_GITHUB_TOKEN]",
      },
      {
        name: "jwt_token",
        regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
        replacement: "[REDACTED_JWT_TOKEN]",
      },
      {
        name: "generic_api_key_assignment",
        regex: /(api[_-]?key|secret|password|access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*["']([^"']{8,128})["']/gi,
        replacement: '$1: "[REDACTED_SECRET]"',
      },
      {
        name: "db_connection_uri",
        regex: /(postgres|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s]+:[^@\s]+@[^\s/]+/gi,
        replacement: "$1://[REDACTED_USER]:[REDACTED_PASSWORD]@[REDACTED_HOST]",
      },
    ];

    for (const p of patterns) {
      if (p.regex.test(scrubbed)) {
        scrubbed = scrubbed.replace(p.regex, (match) => {
          count++;
          if (!detectedPatterns.includes(p.name)) {
            detectedPatterns.push(p.name);
          }
          if (typeof p.replacement === "string" && p.replacement.includes("$1")) {
            return p.replacement.replace("$1", match.split(/[:=]/)[0]);
          }
          return p.replacement;
        });
      }
    }

    return { scrubbed, secretsDetectedCount: count, detectedPatterns };
  }

  /**
   * Neutralizes prompt injection attempts embedded in repository source code,
   * comments, documentation, and metadata files.
   * Wraps source extracts in safe XML delimiters and neutralizes system-level override cues.
   */
  public sanitizeUntrustedContent(rawContent: string, sourceName = "file"): string {
    if (!rawContent || typeof rawContent !== "string") return "";

    const { scrubbed } = this.scrubSecrets(rawContent);

    // Neutralize prompt injection phrases
    const injectionNeutralizers: { regex: RegExp; replacement: string }[] = [
      { regex: /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi, replacement: "[neutralized: ignore-instructions]" },
      { regex: /system\s*:\s*you\s+are/gi, replacement: "[neutralized: system-override]" },
      { regex: /<\|im_start\|>/gi, replacement: "[neutralized: im_start]" },
      { regex: /<\|im_end\|>/gi, replacement: "[neutralized: im_end]" },
      { regex: /\[INST\]/gi, replacement: "[neutralized: inst]" },
      { regex: /\[\/INST\]/gi, replacement: "[neutralized: /inst]" },
      { regex: /assistant\s*:\s*override/gi, replacement: "[neutralized: assistant-override]" },
      { regex: /act\s+as\s+DAN/gi, replacement: "[neutralized: jailbreak-pattern]" },
      { regex: /delete\s+all\s+files/gi, replacement: "[neutralized: destructive-directive]" },
    ];

    let sanitized = scrubbed;
    for (const n of injectionNeutralizers) {
      sanitized = sanitized.replace(n.regex, n.replacement);
    }

    return `<untrusted_repository_source source="${sourceName}">\n${sanitized}\n</untrusted_repository_source>`;
  }

  /**
   * Checks whether a relative path represents a sensitive file that should never be parsed.
   */
  public isSensitiveFile(relativePath: string): boolean {
    const lower = relativePath.toLowerCase().replace(/\\/g, "/");
    const filename = path.basename(lower);

    if (
      filename === ".env" ||
      filename.startsWith(".env.") ||
      filename === "id_rsa" ||
      filename === "id_ecdsa" ||
      filename === "id_ed25519" ||
      filename.endsWith(".pem") ||
      filename.endsWith(".key") ||
      filename.endsWith(".pfx") ||
      filename.endsWith(".p12") ||
      filename.endsWith(".keystore") ||
      filename === "credentials.json" ||
      filename === "service-account.json"
    ) {
      return true;
    }

    return false;
  }
}
