#!/usr/bin/env python3
"""
Enterprise NFR Engineer — Unified Gap Analysis & Tool Suite Runner
Executes the four specialized NFR gap scanners:
  1. i18n & Localization Validator (i18n_validator.py)
  2. Restricted Org & Air-Gapped Auditor (restricted_org_auditor.py)
  3. Static Concurrency & Bottleneck Profiler (static_concurrency_profiler.py)
  4. Data Immutability & WORM Audit Checker (data_immutability_checker.py)

Generates an aggregated NFR Gap Analysis Report with domain scores and actionable recommendations.
"""

import os
import sys
import json
import datetime

# Import sibling tools
from i18n_validator import scan_i18n
from restricted_org_auditor import audit_restricted_org
from static_concurrency_profiler import profile_concurrency
from data_immutability_checker import check_data_immutability

def run_all_tools(target_dir="."):
    abs_target = os.path.abspath(target_dir)

    i18n_res = scan_i18n(abs_target)
    restricted_res = audit_restricted_org(abs_target)
    concurrency_res = profile_concurrency(abs_target)
    immutability_res = check_data_immutability(abs_target)

    # Compute overall gap score (weighted)
    # Restricted Org: 35%, Concurrency: 30%, Immutability: 20%, i18n: 15%
    gap_composite_score = round(
        (restricted_res['air_gapped_readiness_score'] * 0.35) +
        (concurrency_res['concurrency_score'] * 0.30) +
        (immutability_res['immutability_score'] * 0.20) +
        (i18n_res['i18n_score'] * 0.15),
        1
    )

    all_findings = []
    for f in restricted_res.get('findings', []):
        f['domain'] = 'Restricted Org / Air-Gapped'
        all_findings.append(f)
    for f in concurrency_res.get('findings', []):
        f['domain'] = 'Concurrency & Capacity'
        all_findings.append(f)
    for f in immutability_res.get('findings', []):
        f['domain'] = 'Data Immutability & Audit'
        all_findings.append(f)
    for f in i18n_res.get('findings_sample', []):
        f['domain'] = 'i18n & Localization'
        all_findings.append(f)

    # Status gate
    has_critical = any(f.get('severity') == 'CRITICAL' for f in all_findings)
    if has_critical:
        gate_status = "FAIL (Critical Override)"
    elif gap_composite_score >= 80:
        gate_status = "PASS"
    elif gap_composite_score >= 60:
        gate_status = "CONDITIONAL_PASS"
    else:
        gate_status = "FAIL"

    return {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "target_directory": abs_target,
        "composite_gap_score": gap_composite_score,
        "overall_gate_status": gate_status,
        "domain_breakdown": {
            "restricted_org_readiness": {
                "score": restricted_res['air_gapped_readiness_score'],
                "status": restricted_res['compliance_status'],
                "violations_count": restricted_res['findings_count']
            },
            "static_concurrency_resilience": {
                "score": concurrency_res['concurrency_score'],
                "status": concurrency_res['concurrency_status'],
                "blocking_calls": concurrency_res['blocking_io_calls']
            },
            "data_immutability_and_audit": {
                "score": immutability_res['immutability_score'],
                "status": immutability_res['compliance_status'],
                "mutation_risks": immutability_res['audit_mutation_violations']
            },
            "i18n_and_localization": {
                "score": i18n_res['i18n_score'],
                "status": i18n_res['status'],
                "hardcoded_ui_strings": i18n_res['hardcoded_strings_detected']
            }
        },
        "total_findings_count": len(all_findings),
        "all_findings": all_findings
    }

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else "."
    res = run_all_tools(target)

    if "--json" in sys.argv or "-j" in sys.argv:
        print(json.dumps(res, indent=2))
    else:
        print("=" * 70)
        print("  Enterprise NFR Engineer — Specialized Gap Analysis Suite")
        print("=" * 70)
        print(f"Target Directory:      {res['target_directory']}")
        print(f"Generated Timestamp:   {res['timestamp']}")
        print(f"Composite Gap Score:   {res['composite_gap_score']}/100")
        print(f"Overall Gate Decision: {res['overall_gate_status']}")
        print("-" * 70)
        print("Domain Breakdown:")
        for dom, stats in res['domain_breakdown'].items():
            print(f"  • {dom:32}: Score {stats['score']}/100 [{stats['status']}]")
        print("-" * 70)
        print(f"Total Findings Detected: {res['total_findings_count']}")
        if res['all_findings']:
            print("\nCritical & High Priority Actions:")
            prio = [f for f in res['all_findings'] if f.get('severity') in ('CRITICAL', 'HIGH')]
            for f in prio[:10]:
                print(f"  [{f['severity']}] [{f['domain']}] {f.get('file', 'N/A')}:{f.get('line', 1)}")
                print(f"    Issue:  {f['detail']}")
                print(f"    Action: {f['recommendation']}")
        print("=" * 70)
