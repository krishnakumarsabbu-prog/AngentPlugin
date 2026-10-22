#!/usr/bin/env python3
"""
AgentForge Enterprise Dual License: Apache-2.0 / MIT
Copyright (C) AgentForge Engineering. All rights reserved.
Adapted with attribution from JPeetz/agent-skills (OWASP Agentic Skills Top 10).
Licensed under the Apache License, Version 2.0 or the MIT License.

Sentinel Security Scanner — OWASP AST10 Compliance Engine (forge-sentinel)
Scans agent skill directories, manifests, and scripts for security vulnerabilities.

Usage:
    py scan_skill.py --skill-dir <path> [--format json|sarif|text] [--output <file>]
    py scan_skill.py --skill-dir <path> --max-score 60 --ci
"""
# /// script
# requires-python = ">=3.9"
# dependencies = []
# ///

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List, Optional, Tuple


class Severity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


@dataclass
class Finding:
    ast_id: str
    title: str
    severity: Severity
    file_path: str
    line_number: int
    description: str
    remediation: str
    confidence: str = "confirmed"


@dataclass
class ScanResult:
    skill_name: str
    skill_dir: str
    score: int
    risk_tier: str
    findings: List[Finding] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    @property
    def risk_label(self) -> str:
        if self.score <= 20:
            return "L0 (Safe)"
        elif self.score <= 40:
            return "L1 (Low)"
        elif self.score <= 60:
            return "L2 (Elevated)"
        elif self.score <= 80:
            return "L3 (High)"
        return "Critical"


class SecretScrubber:
    """Scrubs API keys, bearer tokens, and private credentials from outputs."""
    SECRET_PATTERNS = [
        re.compile(r'sk-[a-zA-Z0-9_-]{20,}'),
        re.compile(r'sk-ant-[a-zA-Z0-9_-]{20,}'),
        re.compile(r'ghp_[a-zA-Z0-9]{36}'),
        re.compile(r'gho_[a-zA-Z0-9]{36}'),
        re.compile(r'ghs_[a-zA-Z0-9]{36}'),
        re.compile(r'AKIA[0-9A-Z]{16}'),
        re.compile(r'eyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_.]+'),
        re.compile(r'-----BEGIN [A-Z ]+ PRIVATE KEY-----'),
    ]

    @classmethod
    def redact(cls, text: str) -> str:
        if not text:
            return text
        result = text
        for pattern in cls.SECRET_PATTERNS:
            result = pattern.sub("[REDACTED_SECRET]", result)
        return result


class PathGuard:
    """Blocks directory traversal and unauthorized sensitive file access."""
    BLOCKED_SEQUENCES = ["..", "%2e%2e", "\0"]
    BLACKLISTED_NAMES = [
        ".git", ".env", "id_rsa", "id_ed25519", "credentials", "secrets"
    ]
    BLACKLISTED_EXTENSIONS = [".pem", ".key", ".pfx", ".p12"]

    @classmethod
    def validate_path(cls, path_str: str) -> Path:
        normalized = path_str.replace("\\", "/")
        for seq in cls.BLOCKED_SEQUENCES:
            if seq in normalized:
                raise PermissionError(f"Security Guardrail: Path traversal sequence '{seq}' detected in '{path_str}'")

        parts = [p.lower() for p in normalized.split("/") if p]
        for part in parts:
            if any(b == part or part.startswith(b) for b in cls.BLACKLISTED_NAMES):
                raise PermissionError(f"Security Guardrail: Access to sensitive path segment '{part}' is restricted.")
            if any(part.endswith(ext) for ext in cls.BLACKLISTED_EXTENSIONS):
                raise PermissionError(f"Security Guardrail: Access to private key or certificate '{part}' is restricted.")

        return Path(path_str).resolve()


class SentinelSkillScanner:
    """OWASP AST10 static security analysis engine for AI agent skills."""

    DANGEROUS_PATTERNS = [
        # AST01: Malicious skills & backdoors
        (r"curl\s+.*\|\s*(?:ba)?sh", "AST01", Severity.CRITICAL,
         "Pipe-to-shell from remote URL detected",
         "Remove remote pipe-to-shell; use verified local scripts"),
        (r"wget\s+.*\|\s*(?:ba)?sh", "AST01", Severity.CRITICAL,
         "Wget pipe-to-shell detected",
         "Download script, verify integrity hash, and execute in sandbox"),
        (r"eval\s*\(.*\$", "AST01", Severity.HIGH,
         "eval() with dynamic input detected",
         "Replace eval() with safe deterministic alternatives"),
        (r"base64\s+-d.*\|", "AST01", Severity.HIGH,
         "Base64 decode piped to command execution",
         "Remove obfuscated command execution"),

        # AST02: Prompt injection in skill instructions
        (r"(?:ignore|disregard|override)\s+(?:all\s+)?(?:previous|prior)\s+instructions", "AST02", Severity.HIGH,
         "Instruction override pattern detected in prompt",
         "Isolate user input in delimited delimiters and reject instruction overrides"),
        (r"(?:bypass|disable)\s+(?:safety|security|guardrails)", "AST02", Severity.HIGH,
         "Safety bypass prompt instruction detected",
         "Enforce immutable system policy boundaries"),

        # AST03: Data exfiltration
        (r"(?:curl|wget).*-[sS].*\$\{?(?:API_KEY|TOKEN|SECRET|PASSWORD)", "AST03", Severity.CRITICAL,
         "Potential secret exfiltration in network call",
         "Never include secrets or environment tokens in external requests"),
        (r"(?:\.env|credentials|secrets).*>\s*(?:/tmp|/dev/tcp)", "AST03", Severity.HIGH,
         "Writing secrets to unsecured external socket or /tmp",
         "Use secure local credential stores with least-privilege permissions"),
        (r"requests\.(?:post|put)\s*\(.*(?:API_KEY|SECRET|TOKEN|password)", "AST03", Severity.CRITICAL,
         "Exfiltration of secrets via HTTP POST/PUT",
         "Remove transmission of sensitive tokens"),

        # AST06: Insecure script execution
        (r"subprocess\.(?:call|run|Popen)\s*\(.*shell\s*=\s*True", "AST06", Severity.HIGH,
         "Subprocess with shell=True (command injection risk)",
         "Use shell=False with explicit argument lists (shlex.split)"),
        (r"os\.system\s*\(.*\$", "AST06", Severity.MEDIUM,
         "os.system() with dynamic input concatenation",
         "Use subprocess.run with shell=False and argument arrays"),
    ]

    PROTECTED_FILES = ["SOUL.md", "MEMORY.md", "AGENTS.md", "IDENTITY.md", "USER.md"]

    def scan(self, skill_dir: str) -> ScanResult:
        # Enforce Path Guardrail
        path = PathGuard.validate_path(skill_dir)
        if not path.exists():
            raise FileNotFoundError(f"Skill directory not found: {skill_dir}")

        result = ScanResult(
            skill_name=path.name,
            skill_dir=str(path),
            score=0,
            risk_tier="L0",
        )

        skill_md = path / "SKILL.md"
        if not skill_md.exists():
            result.findings.append(Finding(
                "AST07", "Missing SKILL.md", Severity.CRITICAL,
                str(path), 0,
                "No SKILL.md file found — skill is missing its canonical manifest",
                "Create a SKILL.md file with required AgentForge YAML frontmatter"
            ))
            result.score = 100
            return result

        content = skill_md.read_text(encoding="utf-8", errors="replace")

        parts = content.split("---", 2)
        frontmatter = parts[1] if len(parts) >= 3 else content

        # 1. Frontmatter Validation (AST07)
        self._check_frontmatter(result, content, skill_md)

        # 2. Permissions & Identity Boundaries (AST04, AST08, AST09)
        self._check_permissions(result, frontmatter, skill_md)

        # 3. Dependencies (AST05)
        self._check_dependencies(result, frontmatter, skill_md)

        # 4. Pattern Scanning across scripts and prompts (AST01, AST02, AST03, AST06)
        self._scan_patterns(result, path)

        # 5. Integrity Hashes (AST07)
        self._check_integrity(result, frontmatter, skill_md)

        # Calculate final 0-100 risk score
        result.score = self._calculate_score(result)
        return result

    def _check_frontmatter(self, result: ScanResult, content: str, path: Path):
        if not content.startswith("---"):
            result.findings.append(Finding(
                "AST07", "Missing YAML frontmatter", Severity.HIGH,
                str(path), 1,
                "SKILL.md must start with YAML frontmatter containing metadata",
                "Add --- delimited YAML frontmatter with name, version, and permissions"
            ))
            return

        for field_name in ["name:", "version:", "description:"]:
            if field_name not in content[:1200]:
                result.findings.append(Finding(
                    "AST07", f"Missing required field: {field_name.rstrip(':')}",
                    Severity.MEDIUM,
                    str(path), 0,
                    f"Frontmatter missing required field '{field_name.rstrip(':')}'",
                    f"Add '{field_name}' to YAML frontmatter"
                ))

    def _check_permissions(self, result: ScanResult, content: str, path: Path):
        content_lower = content.lower()

        # AST04: Excessive Permissions
        if "permissions:" not in content_lower:
            result.findings.append(Finding(
                "AST04", "Missing permissions declaration", Severity.HIGH,
                str(path), 0,
                "No permissions block found — skill may have unrestricted access",
                "Add explicit permissions.files and permissions.network blocks"
            ))
            return

        # Check for wildcard file reads
        if re.search(r'read:\s*\[.*["\']\*["\']', content):
            result.findings.append(Finding(
                "AST04", "Wildcard file read permission", Severity.HIGH,
                str(path), 0,
                "Unrestricted file read access — violates least-privilege principle",
                "Specify explicit file paths instead of wildcards"
            ))

        # AST08: Unsafe File Operations / Wildcard write
        if re.search(r'write:\s*\[.*["\']\*["\']', content):
            result.findings.append(Finding(
                "AST08", "Wildcard file write permission", Severity.CRITICAL,
                str(path), 0,
                "Unrestricted file write access — can modify any workspace file",
                "Specify explicit write paths; add deny_write for protected files"
            ))

        # Check for protected files in deny_write
        if "deny_write:" in content:
            for protected in self.PROTECTED_FILES:
                if protected.lower() not in content_lower:
                    result.warnings.append(
                        f"Protected identity file '{protected}' not explicitly in deny_write list"
                    )
        else:
            result.findings.append(Finding(
                "AST08", "Missing deny_write for protected files", Severity.MEDIUM,
                str(path), 0,
                "No deny_write list — SOUL.md, MEMORY.md, and AGENTS.md may be writable",
                "Add deny_write with protected identity files"
            ))

        # AST09: Network Permissions
        if "network:" in content:
            if re.search(r'allow:\s*\[.*["\']\*["\']', content):
                result.findings.append(Finding(
                    "AST09", "Wildcard network allowlist", Severity.HIGH,
                    str(path), 0,
                    "Network allowlist contains wildcard — all outbound domains permitted",
                    "Specify explicit domain allowlists; use deny: '*' as default"
                ))
            if 'deny:' not in content or '"*"' not in content:
                result.warnings.append("Network deny not set to '*' — non-allowlisted domains may be accessible")
        else:
            result.findings.append(Finding(
                "AST09", "Missing network permissions declaration", Severity.MEDIUM,
                str(path), 0,
                "No network permissions block — egress may be unrestricted",
                "Add permissions.network with allow/deny domain lists"
            ))

    def _check_dependencies(self, result: ScanResult, content: str, path: Path):
        # AST05: Dependency Chain Attacks
        if "requires.binaries:" in content or "requires:" in content:
            binaries_match = re.search(r'binaries:\s*\[(.*?)\]', content)
            if binaries_match:
                items = [b.strip().strip('"\'') for b in binaries_match.group(1).split(",") if b.strip()]
                for item in items:
                    if not re.search(r'[>=<~]', item):
                        result.findings.append(Finding(
                            "AST05", f"Unpinned binary dependency: {item}", Severity.LOW,
                            str(path), 0,
                            f"Binary dependency '{item}' has no version pin constraint",
                            f"Specify version constraint for '{item}' (e.g. {item}>=1.0)"
                        ))

    def _scan_patterns(self, result: ScanResult, skill_dir: Path):
        for file_path in skill_dir.rglob("*"):
            if not file_path.is_file():
                continue
            if file_path.suffix not in [".md", ".py", ".sh", ".js", ".cjs", ".ts", ".yaml", ".yml", ".json"]:
                continue
            # Skip evaluation reference and test files to avoid false positives on test samples
            if "evals" in file_path.parts or "tests" in file_path.parts:
                continue

            try:
                content = file_path.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue

            lines = content.split("\n")
            rel_path = str(file_path.relative_to(skill_dir)).replace("\\", "/")
            is_markdown = file_path.suffix == ".md"

            for i, line in enumerate(lines, 1):
                # Don't trigger on own scanner pattern definitions
                if "DANGEROUS_PATTERNS" in line or "AST0" in line and ("r\"" in line or "r\'" in line):
                    continue
                trimmed = line.strip()
                if is_markdown:
                    if (trimmed.startswith("- **Detection:**") or
                        trimmed.startswith("- **Risk:**") or
                        trimmed.startswith("- **CVE") or
                        trimmed.startswith("#") or
                        trimmed.startswith("|") or
                        trimmed.startswith("<!--") or
                        trimmed.startswith("-->")):
                        continue

                for pattern, ast_id, severity, desc, remediation in self.DANGEROUS_PATTERNS:
                    if re.search(pattern, line, re.IGNORECASE):
                        result.findings.append(Finding(
                            ast_id, desc, severity,
                            rel_path, i,
                            f"Detected in line: {line.strip()[:100]}",
                            remediation
                        ))

    def _check_integrity(self, result: ScanResult, content: str, path: Path):
        if "content_hash:" not in content and "signature:" not in content:
            result.findings.append(Finding(
                "AST07", "Missing content integrity fields", Severity.LOW,
                str(path), 0,
                "No content_hash or signature found — skill cannot be verified for tampering",
                "Add content_hash (SHA-256) and signature (Ed25519) to frontmatter"
            ))

    def _calculate_score(self, result: ScanResult) -> int:
        weights = {
            Severity.CRITICAL: 25,
            Severity.HIGH: 15,
            Severity.MEDIUM: 8,
            Severity.LOW: 3,
            Severity.INFO: 0,
        }
        score = sum(weights[f.severity] for f in result.findings)
        return min(score, 100)


def format_output(result: ScanResult, fmt: str) -> str:
    if fmt == "json":
        raw = json.dumps({
            "skill": result.skill_name,
            "score": result.score,
            "risk_tier": result.risk_label,
            "findings": [
                {
                    "id": f.ast_id,
                    "title": f.title,
                    "severity": f.severity.value,
                    "file": f.file_path,
                    "line": f.line_number,
                    "description": f.description,
                    "remediation": f.remediation,
                }
                for f in result.findings
            ],
            "warnings": result.warnings,
        }, indent=2)
        return SecretScrubber.redact(raw)

    elif fmt == "sarif":
        sarif_data = {
            "version": "2.1.0",
            "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
            "runs": [{
                "tool": {
                    "driver": {
                        "name": "Sentinel Security Scanner (forge-sentinel)",
                        "version": "1.0.0",
                        "informationUri": "https://github.com/agentforge/skills/sentinel",
                        "rules": [
                            {"id": f"AST{i:02d}", "name": f"OWASP AST{i:02d}"}
                            for i in range(1, 11)
                        ]
                    }
                },
                "results": [
                    {
                        "ruleId": f.ast_id,
                        "level": "error" if f.severity in [Severity.CRITICAL, Severity.HIGH] else "warning",
                        "message": {"text": f.description},
                        "locations": [{
                            "physicalLocation": {
                                "artifactLocation": {"uri": f.file_path},
                                "region": {"startLine": f.line_number}
                            }
                        }],
                        "properties": {
                            "remediation": f.remediation,
                            "severity": f.severity.value,
                        }
                    }
                    for f in result.findings
                ]
            }]
        }
        return SecretScrubber.redact(json.dumps(sarif_data, indent=2))

    else:  # text
        lines = [
            f"🔍 Sentinel Security Scan Report: {result.skill_name}",
            f"{'='*60}",
            f"Score: {result.score}/100 — {result.risk_label}",
            f"Total Findings: {len(result.findings)}",
            f"Warnings: {len(result.warnings)}",
            "",
        ]
        if result.findings:
            lines.append("Findings:")
            for f in result.findings:
                lines.append(f"  [{f.ast_id}] {f.severity.value.upper()}: {f.title}")
                lines.append(f"    File: {f.file_path}:{f.line_number}")
                lines.append(f"    {f.description}")
                lines.append(f"    Remediation: {f.remediation}")
                lines.append("")
        if result.warnings:
            lines.append("Warnings:")
            for w in result.warnings:
                lines.append(f"  ⚠ {w}")
        return SecretScrubber.redact("\n".join(lines))


def main():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="Sentinel Security Scanner — OWASP AST10 Compliance Engine")
    parser.add_argument("--skill-dir", required=True, help="Path to skill directory")
    parser.add_argument("--format", choices=["json", "sarif", "text"], default="text",
                        help="Output format (default: text)")
    parser.add_argument("--output", help="Write output to file")
    parser.add_argument("--max-score", type=int, default=100,
                        help="Exit with code 1 if score exceeds this (CI gate)")
    parser.add_argument("--ci", action="store_true", help="Run in CI quality-gate mode")
    args = parser.parse_args()

    scanner = SentinelSkillScanner()
    try:
        result = scanner.scan(args.skill_dir)
    except Exception as e:
        sys.stderr.write(f"Error during scan: {e}\n")
        sys.exit(2)

    output = format_output(result, args.format)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"Results written to {args.output}")
    else:
        print(output)

    if args.ci and result.score > args.max_score:
        sys.stderr.write(f"\n[CI Gate Failed] Risk score {result.score} exceeds maximum allowed score {args.max_score}.\n")
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
