#!/usr/bin/env python3
"""
Calculate NFR scores from an assessment JSON file.

Computes:
1. Domain score (0-100 per domain) based on finding penalties by severity.
2. Requirement coverage (%).
3. Evidence coverage (%).
4. Validation coverage (%).
5. Overall weighted score (0-100).
6. Quality-gate decision (PASS, CONDITIONAL_PASS, FAIL, INCOMPLETE).

Applies critical-failure overrides and coverage caps per the scoring model.

Usage:
    python3 scripts/calculate-nfr-score.py examples/sample-assessment.json
    python3 scripts/calculate-nfr-score.py examples/sample-assessment.json --json
"""

import json
import os
import sys
import datetime

ALL_DOMAINS = [
    "performance", "scalability", "availability", "reliability",
    "security", "maintainability", "usability", "compatibility",
    "observability", "disaster-recovery", "portability", "compliance-privacy",
    "operability", "accessibility", "cost-efficiency", "ai-system-quality",
]

DEFAULT_WEIGHTS = {
    "performance": 10, "scalability": 8, "availability": 10, "reliability": 12,
    "security": 15, "maintainability": 5, "usability": 3, "compatibility": 3,
    "observability": 8, "disaster-recovery": 8, "portability": 3,
    "compliance-privacy": 8, "operability": 6, "accessibility": 3,
    "cost-efficiency": 3, "ai-system-quality": 5,
}

DEFAULT_PENALTIES = {
    "CRITICAL": 40, "HIGH": 20, "MEDIUM": 8, "LOW": 3, "INFORMATIONAL": 0,
}

BLOCKING_DOMAINS = {"security", "availability", "reliability"}

SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]
VALIDATION_STATES = [
    "VERIFIED_PASS", "VERIFIED_FAIL", "PARTIALLY_VERIFIED",
    "NOT_TESTED", "INSUFFICIENT_EVIDENCE", "NOT_APPLICABLE",
]


def calculate_domain_scores(findings, weights, penalties):
    """Calculate per-domain scores from findings."""
    domain_data = {}
    for domain in ALL_DOMAINS:
        domain_data[domain] = {
            "score": 100, "weight": weights.get(domain, 0),
            "findings_count": 0,
            "findings_by_severity": {s: 0 for s in SEVERITIES},
            "findings_by_validation_state": {v: 0 for v in VALIDATION_STATES},
            "requirement_count": 0,
        }

    for finding in findings:
        domain = finding.get("domain")
        if domain not in domain_data:
            continue
        data = domain_data[domain]
        data["findings_count"] += 1
        sev = finding.get("severity", "INFORMATIONAL")
        if sev in data["findings_by_severity"]:
            data["findings_by_severity"][sev] += 1
        vstate = finding.get("validation_state", "NOT_TESTED")
        if vstate in data["findings_by_validation_state"]:
            data["findings_by_validation_state"][vstate] += 1
        penalty = penalties.get(sev, 0)
        data["score"] -= penalty

    for domain in domain_data:
        domain_data[domain]["score"] = max(0, domain_data[domain]["score"])

    return domain_data


def calculate_overall_score(domain_data, applicable_domains):
    """Calculate the overall weighted score."""
    total_weight = 0
    weighted_sum = 0
    for domain in applicable_domains:
        data = domain_data.get(domain)
        if not data:
            continue
        w = data["weight"]
        total_weight += w
        weighted_sum += data["score"] * w
    if total_weight == 0:
        return 0
    return round(weighted_sum / total_weight, 1)


def calculate_coverage(findings, requirements, applicable_domains):
    """Calculate requirement, evidence, and validation coverage."""
    total_findings = len(findings)
    findings_with_evidence = sum(
        1 for f in findings if f.get("evidence") and len(f.get("evidence", [])) > 0
    )
    findings_verified = sum(
        1 for f in findings
        if f.get("validation_state") in ("VERIFIED_PASS", "VERIFIED_FAIL")
    )

    applicable_reqs = [
        r for r in requirements
        if r.get("domain") in applicable_domains
    ]
    assessed_reqs = [
        r for r in applicable_reqs
        if any(f.get("requirement_id") == r.get("requirement_id") for f in findings)
    ]

    req_coverage = round(
        len(assessed_reqs) / len(applicable_reqs) * 100, 1
    ) if applicable_reqs else 0.0
    evidence_coverage = round(
        findings_with_evidence / total_findings * 100, 1
    ) if total_findings else 0.0
    validation_coverage = round(
        findings_verified / total_findings * 100, 1
    ) if total_findings else 0.0

    return {
        "requirement_coverage": req_coverage,
        "evidence_coverage": evidence_coverage,
        "validation_coverage": validation_coverage,
    }


def apply_coverage_caps(score, coverage):
    """Apply coverage caps to the overall score."""
    capped_score = score
    if coverage["requirement_coverage"] < 60:
        capped_score = min(capped_score, 60)
    elif coverage["requirement_coverage"] < 80:
        capped_score = min(capped_score, 80)
    if coverage["evidence_coverage"] < 70:
        capped_score = min(capped_score, 80)
    if coverage["validation_coverage"] < 70:
        capped_score = min(capped_score, 80)
    return capped_score


def determine_gate_decision(score, coverage, findings, blocking_domains):
    """Determine the final quality-gate decision."""
    critical_blocking = [
        f for f in findings
        if f.get("severity") == "CRITICAL"
        and f.get("domain") in blocking_domains
        and f.get("validation_state") in ("VERIFIED_FAIL", "PARTIALLY_VERIFIED")
    ]

    if coverage["requirement_coverage"] < 60:
        return {
            "final_status": "INCOMPLETE",
            "decision_rule": "Requirement coverage < 60%; assessment cannot make a determination.",
            "critical_findings": [
                {"finding_id": f.get("finding_id"), "domain": f.get("domain"),
                 "title": f.get("title")}
                for f in critical_blocking
            ],
        }

    if critical_blocking:
        return {
            "final_status": "FAIL",
            "decision_rule": f"CRITICAL finding(s) in blocking domain(s): "
                             f"{', '.join(sorted(set(f.get('domain') for f in critical_blocking)))}.",
            "critical_findings": [
                {"finding_id": f.get("finding_id"), "domain": f.get("domain"),
                 "title": f.get("title")}
                for f in critical_blocking
            ],
        }

    if score < 60:
        return {
            "final_status": "FAIL",
            "decision_rule": f"Overall score {score} < 60.",
            "critical_findings": [],
        }

    if score >= 80 and coverage["requirement_coverage"] >= 80:
        return {
            "final_status": "PASS",
            "decision_rule": f"Overall score {score} >= 80 with sufficient coverage.",
            "critical_findings": [],
        }

    return {
        "final_status": "CONDITIONAL_PASS",
        "decision_rule": f"Overall score {score} >= 60 but < 80 or coverage below threshold.",
        "critical_findings": [],
    }


def calculate_scores(assessment, weights=None, penalties=None, blocking_domains=None):
    """Main scoring function. Returns the complete score result."""
    weights = weights or DEFAULT_WEIGHTS
    penalties = penalties or DEFAULT_PENALTIES
    blocking_domains = blocking_domains or BLOCKING_DOMAINS

    findings = assessment.get("findings", [])
    requirements = assessment.get("requirements", [])
    applicable_domains = assessment.get("applicable_domains", [])

    domain_data = calculate_domain_scores(findings, weights, penalties)
    overall = calculate_overall_score(domain_data, applicable_domains)
    coverage = calculate_coverage(findings, requirements, applicable_domains)
    capped_score = apply_coverage_caps(overall, coverage)
    gate = determine_gate_decision(capped_score, coverage, findings, blocking_domains)

    return {
        "assessment_id": assessment.get("assessment_id"),
        "overall_score": capped_score,
        "raw_score": overall,
        "coverage": coverage,
        "domain_scores": {
            domain: {
                "score": data["score"],
                "weight": data["weight"],
                "findings_count": data["findings_count"],
                "findings_by_severity": data["findings_by_severity"],
                "findings_by_validation_state": data["findings_by_validation_state"],
            }
            for domain, data in domain_data.items()
            if domain in applicable_domains
        },
        "gate_decision": gate,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/calculate-nfr-score.py <assessment.json> [--json]")
        sys.exit(1)

    filepath = sys.argv[1]
    output_json = "--json" in sys.argv

    if not os.path.isfile(filepath):
        print(f"ERROR: file not found: {filepath}")
        sys.exit(1)

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            assessment = json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: invalid JSON: {e}")
        sys.exit(1)

    result = calculate_scores(assessment)

    if output_json:
        print(json.dumps(result, indent=2))
    else:
        print(f"NFR Score Report for: {assessment.get('application_name', 'Unknown')}")
        print(f"Assessment ID: {result['assessment_id']}")
        print(f"Date: {result['timestamp']}\n")

        print("Domain Scores:")
        print(f"  {'Domain':<25} {'Score':>6} {'Weight':>7} {'Findings':>9} {'Critical':>9}")
        print(f"  {'-'*25} {'-'*6} {'-'*7} {'-'*9} {'-'*9}")
        for domain, data in sorted(result["domain_scores"].items()):
            crit = data["findings_by_severity"].get("CRITICAL", 0)
            print(f"  {domain:<25} {data['score']:>6} {data['weight']:>7} "
                  f"{data['findings_count']:>9} {crit:>9}")

        print(f"\nOverall Score: {result['overall_score']}/100 (raw: {result['raw_score']})")
        print(f"\nCoverage:")
        print(f"  Requirement coverage: {result['coverage']['requirement_coverage']}%")
        print(f"  Evidence coverage:   {result['coverage']['evidence_coverage']}%")
        print(f"  Validation coverage: {result['coverage']['validation_coverage']}%")

        gate = result["gate_decision"]
        print(f"\nQuality-Gate Decision: {gate['final_status']}")
        print(f"Decision Rule: {gate['decision_rule']}")
        if gate["critical_findings"]:
            print(f"\nCritical Findings in Blocking Domains:")
            for cf in gate["critical_findings"]:
                print(f"  - [{cf['domain']}] {cf['title']} ({cf['finding_id']})")

    sys.exit(0)


if __name__ == "__main__":
    main()
