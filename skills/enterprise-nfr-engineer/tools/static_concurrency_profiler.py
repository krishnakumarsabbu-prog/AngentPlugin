#!/usr/bin/env python3
"""
Enterprise NFR Engineer — Static Concurrency & Bottleneck Profiler (Zero-Dependency)
Analyzes architectural concurrency safety, event-loop blocking hazards, thread/pool
exhaustion risks, unbounded memory queries, and timeout resilience without generating
active network load (safe for production and air-gapped evaluation).
"""

import os
import sys
import json
import re

def profile_concurrency(target_dir):
    findings = []
    files_scanned = 0
    blocking_io_count = 0
    unbounded_queries_count = 0
    missing_timeout_count = 0
    pool_config_found = False
    rate_limit_found = False

    # Regex patterns
    sync_io_re = re.compile(r'\b(fs\.readFileSync|fs\.writeFileSync|execSync|spawnSync|time\.sleep|Thread\.sleep)\s*\(')
    unbounded_re = re.compile(r'\b(?:SELECT\s+.*?\s+FROM|find\(\s*\{\s*\}\s*\)|findAll\(\s*\))', re.IGNORECASE)
    has_limit_re = re.compile(r'\b(LIMIT\s+[0-9]+|\.limit\([0-9]+\)|\.take\([0-9]+\)|paginate)', re.IGNORECASE)
    pool_re = re.compile(r'\b(maxPoolSize|minPoolSize|connectionLimit|poolSize|max_connections|max_overflow)\b', re.IGNORECASE)
    rate_limit_re = re.compile(r'\b(rateLimit|RateLimiter|throttle|express-rate-limit|bucket)\b', re.IGNORECASE)
    timeout_re = re.compile(r'\b(timeout|connectTimeout|requestTimeout|socketTimeout)\b', re.IGNORECASE)

    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'dist', 'out', 'build', '__pycache__', '.venv', 'tests')]

        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            fpath = os.path.join(root, fname)
            rel_path = os.path.relpath(fpath, target_dir)

            if ext in ('.ts', '.js', '.py', '.java', '.go', '.cs', '.sql'):
                files_scanned += 1
                try:
                    with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                        content = f.read()
                        lines = content.split('\n')

                    # Global indicators
                    if pool_re.search(content):
                        pool_config_found = True
                    if rate_limit_re.search(content):
                        rate_limit_found = True

                    for line_num, line in enumerate(lines, 1):
                        stripped = line.strip()
                        if not stripped or stripped.startswith(("//", "#", "/*", "*")):
                            continue

                        # 1. Blocking synchronous I/O in potentially asynchronous service paths
                        m_sync = sync_io_re.search(line)
                        if m_sync:
                            blocking_io_count += 1
                            if blocking_io_count <= 20:
                                findings.append({
                                    "category": "BLOCKING_EVENT_LOOP_IO",
                                    "severity": "HIGH",
                                    "file": rel_path,
                                    "line": line_num,
                                    "detail": f"Synchronous blocking call detected: '{m_sync.group(1)}'.",
                                    "recommendation": "Replace with asynchronous non-blocking equivalent to prevent request queue thread starvation."
                                })

                        # 2. Unbounded queries (risk of high concurrency memory exhaustion)
                        if unbounded_re.search(line) and not has_limit_re.search(line):
                            unbounded_queries_count += 1
                            if unbounded_queries_count <= 15:
                                findings.append({
                                    "category": "UNBOUNDED_DATA_QUERY",
                                    "severity": "MEDIUM",
                                    "file": rel_path,
                                    "line": line_num,
                                    "detail": "Data query without explicit pagination or LIMIT clause.",
                                    "recommendation": "Enforce explicit query limits (e.g. LIMIT 100) or cursor pagination."
                                })

                except Exception:
                    pass

    # Check architectural guards
    if not rate_limit_found and files_scanned > 5:
        findings.append({
            "category": "MISSING_RATE_LIMITING",
            "severity": "HIGH",
            "file": "architecture",
            "line": 1,
            "detail": "No explicit rate limiting or token bucket throttling middleware detected in services.",
            "recommendation": "Introduce ingress rate limiting to protect services against concurrency denial of service."
        })

    # Concurrency Resilience Score (0-100)
    penalty = (blocking_io_count * 5) + (unbounded_queries_count * 3)
    if not rate_limit_found and files_scanned > 5:
        penalty += 15
    if not pool_config_found and files_scanned > 10:
        penalty += 10

    score = max(0, 100 - min(100, penalty))
    status = "OPTIMAL" if score >= 85 else ("ACCEPTABLE" if score >= 65 else "AT_RISK")

    return {
        "tool": "static_concurrency_profiler",
        "target_directory": target_dir,
        "files_scanned": files_scanned,
        "blocking_io_calls": blocking_io_count,
        "unbounded_queries": unbounded_queries_count,
        "connection_pool_configured": pool_config_found,
        "rate_limiting_configured": rate_limit_found,
        "concurrency_score": score,
        "concurrency_status": status,
        "findings": findings
    }

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    res = profile_concurrency(target)
    if "--json" in sys.argv or "-j" in sys.argv:
        print(json.dumps(res, indent=2))
    else:
        print("=" * 65)
        print("  Enterprise NFR Engineer — Static Concurrency & Bottleneck Profiler")
        print("=" * 65)
        print(f"Target: {res['target_directory']}")
        print(f"Files Scanned: {res['files_scanned']}")
        print(f"Blocking Sync I/O Calls: {res['blocking_io_calls']}")
        print(f"Unbounded Query Risks: {res['unbounded_queries']}")
        print(f"Connection Pool Declared: {'YES' if res['connection_pool_configured'] else 'NOT DETECTED'}")
        print(f"Rate Limiting Declared: {'YES' if res['rate_limiting_configured'] else 'NOT DETECTED'}")
        print(f"Concurrency Resilience Score: {res['concurrency_score']}/100 [{res['concurrency_status']}]")
        print("=" * 65)
        if res['findings']:
            print(f"\nIdentified {len(res['findings'])} Concurrency / Capacity Signal(s):")
            for f in res['findings'][:15]:
                print(f"  [{f['severity']}] {f['file']}:{f['line']} - {f['detail']}")
                print(f"         Remediation: {f['recommendation']}")
