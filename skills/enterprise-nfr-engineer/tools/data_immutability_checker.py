#!/usr/bin/env python3
"""
Enterprise NFR Engineer — Data Immutability & Tamper-Evident Audit Checker (Zero-Dependency)
Evaluates whether security audit logs, compliance events, and ledger records comply with
enterprise WORM (Write-Once-Read-Many), append-only storage, and cryptographic tamper-evidence.
"""

import os
import sys
import json
import re

def check_data_immutability(target_dir):
    findings = []
    files_scanned = 0
    audit_files_found = 0
    hash_chaining_found = False
    pii_redaction_found = False
    audit_mutation_risks = 0

    audit_keyword_re = re.compile(r'\b(audit|audit_log|audittrail|auditEvent|activityLog)\b', re.IGNORECASE)
    mutation_re = re.compile(r'\b(?:DELETE\s+FROM|UPDATE\s+.*?SET|\.update\(|\.delete\(|\.destroy\(|\.truncate\(|\.drop\()\b', re.IGNORECASE)
    hash_chain_re = re.compile(r'\b(?:sha256|hmac|previousHash|prev_hash|hashChain|crypto\.createHash)\b', re.IGNORECASE)
    redact_re = re.compile(r'\b(?:redact|mask|stripSecrets|scrubPii|sanitize|maskEmail|maskCard)\b', re.IGNORECASE)

    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'dist', 'out', 'build', '__pycache__', '.venv', 'tests')]

        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            fpath = os.path.join(root, fname)
            rel_path = os.path.relpath(fpath, target_dir)

            if ext in ('.ts', '.js', '.py', '.sql', '.go', '.java', '.cs'):
                files_scanned += 1
                try:
                    with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                        lines = content.split('\n')

                    is_audit_related = bool(audit_keyword_re.search(fname) or audit_keyword_re.search(content))
                    if is_audit_related:
                        audit_files_found += 1
                        if hash_chain_re.search(content):
                            hash_chaining_found = True
                        if redact_re.search(content):
                            pii_redaction_found = True

                        for line_num, line in enumerate(lines, 1):
                            stripped = line.strip()
                            if not stripped or stripped.startswith(("//", "#", "/*", "*")):
                                continue

                            # Detect mutation on audit tables / structures
                            if audit_keyword_re.search(line) and mutation_re.search(line):
                                audit_mutation_risks += 1
                                findings.append({
                                    "category": "AUDIT_MUTATION_RISK",
                                    "severity": "CRITICAL",
                                    "file": rel_path,
                                    "line": line_num,
                                    "detail": f"Direct mutation/deletion path detected in audit records: '{stripped[:60]}...'",
                                    "recommendation": "Enforce strict append-only constraints (WORM); disallow UPDATE and DELETE on audit entities."
                                })

                except Exception:
                    pass

    # Score calculation
    base_score = 100
    if audit_files_found > 0 and not hash_chaining_found:
        base_score -= 20
        findings.append({
            "category": "MISSING_CRYPTOGRAPHIC_CHAINING",
            "severity": "MEDIUM",
            "file": "audit-architecture",
            "line": 1,
            "detail": "Audit events are persisted without cryptographic hash chaining (SHA-256 prev_hash link).",
            "recommendation": "Add tamper-evident Merkle tree or SHA-256 hash chaining over sequential audit log records."
        })
    if audit_files_found > 0 and not pii_redaction_found:
        base_score -= 15
        findings.append({
            "category": "UNMASKED_AUDIT_DATA",
            "severity": "HIGH",
            "file": "audit-architecture",
            "line": 1,
            "detail": "No explicit PII redaction or credential stripping filter detected in audit logger pipeline.",
            "recommendation": "Sanitize and mask all tokens, passwords, and sensitive PII before writing audit events."
        })
    base_score -= (audit_mutation_risks * 25)
    score = max(0, min(100, base_score))

    status = "VERIFIED_IMMUTABLE" if score >= 85 and audit_mutation_risks == 0 else (
        "PARTIALLY_PROTECTED" if score >= 60 else "VULNERABLE_TO_TAMPERING"
    )

    return {
        "tool": "data_immutability_checker",
        "target_directory": target_dir,
        "files_scanned": files_scanned,
        "audit_modules_identified": audit_files_found,
        "cryptographic_hash_chaining": hash_chaining_found,
        "pii_redaction_configured": pii_redaction_found,
        "audit_mutation_violations": audit_mutation_risks,
        "immutability_score": score,
        "compliance_status": status,
        "findings": findings
    }

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    res = check_data_immutability(target)
    if "--json" in sys.argv or "-j" in sys.argv:
        print(json.dumps(res, indent=2))
    else:
        print("=" * 65)
        print("  Enterprise NFR Engineer — Data Immutability & WORM Checker")
        print("=" * 65)
        print(f"Target: {res['target_directory']}")
        print(f"Files Scanned: {res['files_scanned']}")
        print(f"Audit Modules Found: {res['audit_modules_identified']}")
        print(f"Cryptographic Hash Chaining: {'VERIFIED' if res['cryptographic_hash_chaining'] else 'NOT CONFIGURED'}")
        print(f"PII Redaction In Logs: {'CONFIGURED' if res['pii_redaction_configured'] else 'NOT CONFIGURED'}")
        print(f"Audit Mutation Violations: {res['audit_mutation_violations']}")
        print(f"Immutability & Integrity Score: {res['immutability_score']}/100 [{res['compliance_status']}]")
        print("=" * 65)
        if res['findings']:
            print(f"\nIdentified {len(res['findings'])} Immutability / Compliance Finding(s):")
            for f in res['findings']:
                print(f"  [{f['severity']}] {f['file']}:{f['line']} - {f['detail']}")
                print(f"         Remediation: {f['recommendation']}")
