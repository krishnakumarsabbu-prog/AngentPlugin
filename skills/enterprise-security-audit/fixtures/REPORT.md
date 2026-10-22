# Enterprise Security Audit — Audit Report

## 1. Executive Summary

An Enterprise Security Audit was conducted on the synthetic sample codebase. The evaluation executed all six audit phases: structured reconnaissance, coverage-led hunting, adversarial candidate validation, structured findings extraction, independent record verification, and target-neutral reporting.

| Metric | Result |
|---|---|
| **Audit Profile** | Standard |
| **Audit Status** | Complete |
| **Coverage Units Total** | 3 |
| **Confirmed Vulnerabilities** | 1 |
| **Needs Validation (Blocked Leads)** | 1 |
| **Rejected Candidates** | 1 |

---

## 2. Confirmed Findings Overview

| Fingerprint | Severity | Title | Affected Subsystem |
|---|---|---|---|
| `billing-invoice-idor-unauthorized-access` | **High** | Insecure Direct Object Reference in invoice download endpoint | Billing API (`packages/api`) |

---

## 3. Coverage Ledger Summary

- **Total Planned Attack Surfaces**: 3
- **Units Fully Covered**: 1 (`covered`)
- **Units with Confirmed Candidates**: 1 (`candidate`)
- **Units Blocked by Environmental Gaps**: 1 (`blocked`)

All structured findings have been strictly validated against `report-schema.json` and verified against source-code facts.
