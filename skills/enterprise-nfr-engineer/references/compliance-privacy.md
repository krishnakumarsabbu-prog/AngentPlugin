# Compliance and Privacy

## Objective

Assess compliance and privacy controls: data classification, encryption,
retention, deletion, consent, data residency, audit trails, and privacy
controls.

## Assessment Areas

### Data Classification
- What data types are processed (PII, PHI, payment data, credentials, proprietary)?
- Is data classified by sensitivity level?
- Are handling controls defined per classification level?
- Is data flow documented (where data enters, is stored, and exits)?

### Encryption
- Is sensitive data encrypted at rest?
- Is sensitive data encrypted in transit (TLS)?
- Are encryption keys managed in a KMS or vault?
- Are encryption keys rotated?
- Are strong algorithms used (no deprecated ciphers)?

### Data Retention & Deletion
- Is a data retention policy defined per data type?
- Is data deleted or archived after the retention period?
- Is deletion verified (not just soft-deleted)?
- Are backups included in the retention policy?
- Is there a right-to-erasure process (where applicable)?

### Consent Management
- Is user consent collected for data processing (where required)?
- Is consent recorded with timestamp and scope?
- Can users withdraw consent?
- Is consent status enforced in data processing flows?

### Data Residency
- Is data stored and processed in compliance with residency requirements?
- Are deployment regions documented?
- Is cross-border data transfer controlled and documented?
- Are residency requirements mapped to applicable regulations?

### Audit Trails
- Are audit logs recorded for security-relevant actions (login, data access, config changes)?
- Are audit logs tamper-resistant (append-only, signed)?
- Are audit logs retained per regulatory requirements?
- Are audit logs centralized and searchable?

### Privacy Controls
- Is data minimization practiced (collect only what is needed)?
- Is access to PII restricted and logged?
- Is PII masked or redacted in non-production environments?
- Are privacy impact assessments conducted for new features?

## Applicable Regulations (Context-Dependent)

| Regulation | Scope | Note |
|------------|-------|------|
| GDPR | EU personal data | Data subject rights, DPO, DPIA |
| CCPA/CPRA | California consumer data | Right to know, delete, opt-out |
| HIPAA | US health data | PHI safeguards, BAAs |
| PCI-DSS | Payment card data | Cardholder data protection |
| SOC 2 | Service organizations | Security, availability, confidentiality |

Do not claim certified compliance with any regulation. Identify applicable
regulations from business context and assess controls against their
requirements.

## Measurable Criteria Examples

- "All PII encrypted at rest and in transit"
- "Audit logs retained for 12 months"
- "Data deletion completed within 30 days of request"
- "No PII in non-production environments without masking"

## Standards Reference

ISO/IEC 25010:2023 — Security (compliance). NIST SSDF. Used as guidance only.
Do not claim certified compliance.
