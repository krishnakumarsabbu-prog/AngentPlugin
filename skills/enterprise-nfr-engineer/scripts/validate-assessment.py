#!/usr/bin/env python3
"""
Validate an NFR assessment JSON file against the assessment schema.

Checks that:
1. The assessment file is valid JSON.
2. Required top-level fields are present.
3. Each finding has a valid validation_state.
4. NOT_APPLICABLE findings have na_justification.
5. No finding claims VERIFIED_PASS without evidence.
6. All 16 domains are accounted for (either applicable or excluded with justification).

Usage:
    python3 scripts/validate-assessment.py examples/sample-assessment.json
"""

import json
import os
import sys

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ALL_DOMAINS = [
    "performance", "scalability", "availability", "reliability",
    "security", "maintainability", "usability", "compatibility",
    "observability", "disaster-recovery", "portability", "compliance-privacy",
    "operability", "accessibility", "cost-efficiency", "ai-system-quality",
]

VALID_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"}
VALID_VALIDATION_STATES = {
    "VERIFIED_PASS", "VERIFIED_FAIL", "PARTIALLY_VERIFIED",
    "NOT_TESTED", "INSUFFICIENT_EVIDENCE", "NOT_APPLICABLE",
}

REQUIRED_ASSESSMENT_FIELDS = [
    "assessment_id", "application_name", "application_description",
    "criticality_tier", "scope", "applicable_domains", "excluded_domains",
    "requirements", "findings", "timestamp", "assessor",
]

REQUIRED_FINDING_FIELDS = [
    "finding_id", "assessment_id", "domain", "title", "description",
    "severity", "validation_state",
]


def validate_assessment(assessment):
    """Validate an assessment dict. Returns list of errors."""
    errors = []

    for field in REQUIRED_ASSESSMENT_FIELDS:
        if field not in assessment:
            errors.append(f"Missing required field: {field}")

    applicable = set(assessment.get("applicable_domains", []))
    excluded = set(
        e.get("domain") for e in assessment.get("excluded_domains", [])
        if isinstance(e, dict)
    )

    for domain in ALL_DOMAINS:
        if domain not in applicable and domain not in excluded:
            errors.append(f"Domain '{domain}' not accounted for (not in applicable or excluded)")

    for ed in assessment.get("excluded_domains", []):
        if isinstance(ed, dict) and not ed.get("justification"):
            errors.append(f"Excluded domain '{ed.get('domain')}' missing justification")

    findings = assessment.get("findings", [])
    for i, finding in enumerate(findings):
        for field in REQUIRED_FINDING_FIELDS:
            if field not in finding:
                errors.append(f"Finding {i}: missing required field '{field}'")

        sev = finding.get("severity")
        if sev and sev not in VALID_SEVERITIES:
            errors.append(f"Finding {i}: invalid severity '{sev}'")

        vstate = finding.get("validation_state")
        if vstate and vstate not in VALID_VALIDATION_STATES:
            errors.append(f"Finding {i}: invalid validation_state '{vstate}'")

        if vstate == "NOT_APPLICABLE" and not finding.get("na_justification"):
            errors.append(f"Finding {i}: NOT_APPLICABLE requires na_justification")

        if vstate == "VERIFIED_PASS":
            evidence = finding.get("evidence", [])
            if not evidence:
                errors.append(
                    f"Finding {i}: VERIFIED_PASS requires evidence (unknown is never PASS)"
                )

    return errors


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/validate-assessment.py <assessment.json>")
        sys.exit(1)

    filepath = sys.argv[1]

    if not os.path.isfile(filepath):
        print(f"ERROR: file not found: {filepath}")
        sys.exit(1)

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            assessment = json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: invalid JSON: {e}")
        sys.exit(1)

    print(f"Validating assessment: {filepath}\n")

    errors = validate_assessment(assessment)

    if errors:
        print(f"Validation FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  [FAIL] {e}")
        sys.exit(1)
    else:
        findings = assessment.get("findings", [])
        applicable = assessment.get("applicable_domains", [])
        excluded = assessment.get("excluded_domains", [])
        print(f"  [OK] Assessment ID: {assessment.get('assessment_id')}")
        print(f"  [OK] Application: {assessment.get('application_name')}")
        print(f"  [OK] Applicable domains: {len(applicable)}")
        print(f"  [OK] Excluded domains: {len(excluded)}")
        print(f"  [OK] Findings: {len(findings)}")
        print(f"  [OK] All 16 domains accounted for")
        print(f"\nAssessment passed validation.")
        sys.exit(0)


if __name__ == "__main__":
    main()
