#!/usr/bin/env python3
"""
Enterprise NFR Engineer — Restricted Org & Air-Gapped Compliance Auditor (Zero-Dependency)
Verifies whether a software application, service, or agent plugin can run completely
offline in a secure, air-gapped, or highly restricted enterprise organization without
relying on external internet endpoints, public CDNs, or unvetted remote registries.
"""

import os
import sys
import json
import re

PUBLIC_CDNS = [
    "cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com", "fonts.googleapis.com",
    "fonts.gstatic.com", "cdn.tailwindcss.com", "ajax.googleapis.com", "stackpath.bootstrapcdn.com",
    "code.jquery.com", "raw.githubusercontent.com", "registry.npmjs.org"
]

TELEMETRY_BEACONS = [
    "google-analytics.com", "googletagmanager.com", "mixpanel.com", "segment.io",
    "segment.com", "sentry.io", "datadoghq.com", "hotjar.com", "amplitude.com",
    "clarity.ms", "telemetry", "tracking"
]

SAFE_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "internal", "local", "schema.org", "w3.org", "json-schema.org"]

def audit_restricted_org(target_dir):
    findings = []
    total_files = 0
    cdn_hits = 0
    telemetry_hits = 0
    external_url_hits = 0
    public_ip_hits = 0

    url_re = re.compile(r'https?://([a-zA-Z0-9.-]+)(?::[0-9]+)?(/[^\s"\'<>)]*)?')
    ip_re = re.compile(r'\b(?!(?:10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[01])\.|127\.|0\.0\.0\.0))(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b')
    remote_download_re = re.compile(r'\b(curl\s+[^|\n]+\|\s*(?:ba)?sh|wget\s+[^|\n]+\|\s*(?:ba)?sh|npm\s+install\s+http)\b', re.IGNORECASE)

    # 1. Lockfile verification
    has_package_json = os.path.exists(os.path.join(target_dir, "package.json"))
    has_package_lock = os.path.exists(os.path.join(target_dir, "package-lock.json")) or os.path.exists(os.path.join(target_dir, "yarn.lock")) or os.path.exists(os.path.join(target_dir, "pnpm-lock.yaml"))
    
    if has_package_json and not has_package_lock:
        findings.append({
            "category": "MISSING_LOCKFILE",
            "severity": "CRITICAL",
            "file": "package.json",
            "line": 1,
            "detail": "package.json exists without a committed deterministic lockfile (package-lock.json / yarn.lock).",
            "recommendation": "Generate and commit package-lock.json to guarantee deterministic offline builds."
        })

    # 2. File traversal
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'dist', 'out', 'build', '__pycache__', '.venv')]

        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            fpath = os.path.join(root, fname)
            rel_path = os.path.relpath(fpath, target_dir)

            if ext in ('.ts', '.js', '.tsx', '.jsx', '.json', '.html', '.css', '.py', '.yml', '.yaml', '.sh', '.bat', '.ps1', '.dockerfile', 'dockerfile'):
                total_files += 1
                try:
                    with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                        lines = f.readlines()

                    for line_num, line in enumerate(lines, 1):
                        stripped = line.strip()
                        if not stripped:
                            continue

                        # Check remote script execution pipes
                        m_pipe = remote_download_re.search(line)
                        if m_pipe:
                            findings.append({
                                "category": "UNVERIFIED_REMOTE_EXECUTION",
                                "severity": "CRITICAL",
                                "file": rel_path,
                                "line": line_num,
                                "detail": f"Script contains unverified remote download pipe: '{m_pipe.group(1)}'",
                                "recommendation": "Package dependencies locally; never pipe remote scripts directly into shells."
                            })

                        # Check URLs
                        for match in url_re.finditer(line):
                            domain = match.group(1).lower()
                            full_url = match.group(0)

                            if any(safe in domain for safe in SAFE_HOSTS):
                                continue

                            # CDN check
                            if any(cdn in domain for cdn in PUBLIC_CDNS):
                                cdn_hits += 1
                                if cdn_hits <= 20:
                                    findings.append({
                                        "category": "EXTERNAL_PUBLIC_CDN",
                                        "severity": "HIGH",
                                        "file": rel_path,
                                        "line": line_num,
                                        "detail": f"Reference to public CDN '{domain}' in url: {full_url}",
                                        "recommendation": "Vendor the asset into local workspace/bundle; do not pull from public CDNs at runtime."
                                    })
                            # Telemetry check
                            elif any(tele in domain for tele in TELEMETRY_BEACONS):
                                telemetry_hits += 1
                                if telemetry_hits <= 15:
                                    findings.append({
                                        "category": "EXTERNAL_TELEMETRY_BEACON",
                                        "severity": "HIGH",
                                        "file": rel_path,
                                        "line": line_num,
                                        "detail": f"Remote telemetry beacon or analytics host: {domain}",
                                        "recommendation": "Disable remote telemetry or route through enterprise-approved local collector proxy."
                                    })
                            else:
                                external_url_hits += 1
                                if external_url_hits <= 20 and not fname.endswith('.md'):
                                    findings.append({
                                        "category": "EXTERNAL_NETWORK_CALL",
                                        "severity": "MEDIUM",
                                        "file": rel_path,
                                        "line": line_num,
                                        "detail": f"External network endpoint reference: {full_url}",
                                        "recommendation": "Verify offline fallback or route through internal API gateway."
                                    })

                        # Public IP check (non-RFC1918)
                        m_ip = ip_re.search(line)
                        if m_ip and not ('0.0.0.0' in line or '127.0.0.1' in line):
                            public_ip_hits += 1
                            if public_ip_hits <= 10:
                                findings.append({
                                    "category": "HARDCODED_PUBLIC_IP",
                                    "severity": "HIGH",
                                    "file": rel_path,
                                    "line": line_num,
                                    "detail": f"Hardcoded non-private IP address: {m_ip.group(0)}",
                                    "recommendation": "Use internal enterprise DNS names or environment configuration."
                                })

                except Exception:
                    pass

    # Score calculation
    # CRITICAL: -25, HIGH: -10, MEDIUM: -3
    crit_count = sum(1 for f in findings if f["severity"] == "CRITICAL")
    high_count = sum(1 for f in findings if f["severity"] == "HIGH")
    med_count = sum(1 for f in findings if f["severity"] == "MEDIUM")

    penalty = (crit_count * 25) + (high_count * 10) + (med_count * 3)
    score = max(0, 100 - min(100, penalty))

    status = "AIR_GAPPED_READY" if score >= 85 and crit_count == 0 else (
        "RESTRICTED_WITH_EXCEPTIONS" if score >= 65 and crit_count == 0 else "AIR_GAPPED_NON_COMPLIANT"
    )

    return {
        "tool": "restricted_org_auditor",
        "target_directory": target_dir,
        "files_scanned": total_files,
        "lockfile_compliance": has_package_lock if has_package_json else True,
        "public_cdn_references": cdn_hits,
        "external_telemetry_references": telemetry_hits,
        "external_url_references": external_url_hits,
        "hardcoded_public_ips": public_ip_hits,
        "findings_count": len(findings),
        "air_gapped_readiness_score": score,
        "compliance_status": status,
        "findings": findings
    }

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    res = audit_restricted_org(target)
    if "--json" in sys.argv or "-j" in sys.argv:
        print(json.dumps(res, indent=2))
    else:
        print("=" * 65)
        print("  Enterprise NFR Engineer — Restricted Org & Air-Gapped Auditor")
        print("=" * 65)
        print(f"Target: {res['target_directory']}")
        print(f"Files Scanned: {res['files_scanned']}")
        print(f"Lockfile Compliance: {'PASS' if res['lockfile_compliance'] else 'FAIL'}")
        print(f"Public CDN References: {res['public_cdn_references']}")
        print(f"Telemetry Beacons: {res['external_telemetry_references']}")
        print(f"External URLs in Code: {res['external_url_references']}")
        print(f"Air-Gapped Readiness Score: {res['air_gapped_readiness_score']}/100 [{res['compliance_status']}]")
        print("=" * 65)
        if res['findings']:
            print(f"\nIdentified {len(res['findings'])} Potential Compliance Flag(s):")
            for f in res['findings'][:15]:
                print(f"  [{f['severity']}] {f['file']}:{f['line']} - {f['detail']}")
                print(f"         Remediation: {f['recommendation']}")
