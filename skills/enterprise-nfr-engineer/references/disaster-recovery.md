# Disaster Recovery

## Objective

Assess disaster recovery posture: RTO, RPO, backups, restore testing,
replication, failover, and business continuity.

## Assessment Areas

### RTO & RPO
- Are RTO (Recovery Time Objective) and RPO (Recovery Point Objective) defined?
- Are they aligned with business needs and criticality tier?
- Are they measured and verified, not just documented?
- Is the cost of downtime understood and documented?

### Backup Strategy
- What data is backed up (databases, file storage, configs, secrets)?
- What is the backup frequency (continuous, hourly, daily)?
- What backup types are used (full, incremental, snapshot)?
- Where are backups stored (same region, cross-region, cross-cloud)?
- Are backups encrypted?
- What is the backup retention policy?
- Are backup integrity checks performed?

### Restore Testing
- Are restores tested regularly (at least quarterly for critical systems)?
- Are restore test results documented?
- Is restore time measured and compared to RTO?
- Can restores be performed by on-call without specialist assistance?
- An untested backup is a gamble — flag untested backups as HIGH.

### Replication
- Is synchronous or asynchronous replication used?
- Is the replication lag monitored?
- Is there a documented procedure for promoting a replica?
- Is data consistency verified after failover?

### Failover
- Is failover automated or manual?
- What is the failover time, and does it meet the RTO?
- Is failover tested regularly?
- Is there a documented failover runbook?
- Is failback (returning to primary) tested?

### Business Continuity
- Is there a business continuity plan (BCP)?
- Is the BCP documented and accessible to on-call?
- Are DR roles and responsibilities defined?
- Is there a communication plan for incidents?
- Is there a DR drill cadence?

## Measurable Criteria Examples

- "RTO <= 4 hours, RPO <= 15 minutes for the payments service"
- "Backup restoration tested quarterly with documented results"
- "Failover completes within 60 seconds and is tested monthly"
- "Backups encrypted at rest and stored cross-region"

## Recovery Tier Reference

| Tier | RTO | RPO | Applicability |
|------|-----|-----|---------------|
| 1 | < 15 min | 0 (synchronous) | Mission-critical, zero data loss |
| 2 | < 1 hour | < 5 min | Business-critical, minimal data loss |
| 3 | < 4 hours | < 15 min | Important, small data loss acceptable |
| 4 | < 24 hours | < 1 hour | Supporting, data loss acceptable |

These are reference tiers, not universal mandates. Derive from business needs.

## Standards Reference

Google SRE principles — disaster recovery, failover testing. ISO/IEC
25010:2023 — Reliability (recoverability). Used as guidance only.
