# Disaster Recovery Review Checklist

## RTO & RPO

- [ ] RTO (Recovery Time Objective) defined
- [ ] RPO (Recovery Point Objective) defined
- [ ] RTO and RPO aligned with business needs and criticality
- [ ] RTO and RPO measured and verified (not just documented)
- [ ] Cost of downtime understood and documented

## Backup Strategy

- [ ] All critical data backed up (databases, file storage, configs, secrets)
- [ ] Backup frequency appropriate (continuous, hourly, daily)
- [ ] Backup types used (full, incremental, snapshot)
- [ ] Backups stored cross-region or cross-cloud
- [ ] Backups encrypted
- [ ] Backup retention policy defined
- [ ] Backup integrity checks performed

## Restore Testing

- [ ] Restores tested regularly (at least quarterly for critical systems)
- [ ] Restore test results documented
- [ ] Restore time measured and compared to RTO
- [ ] Restores can be performed by on-call without specialist assistance

## Replication

- [ ] Replication type identified (synchronous or asynchronous)
- [ ] Replication lag monitored
- [ ] Replica promotion procedure documented
- [ ] Data consistency verified after failover

## Failover

- [ ] Failover automated or manual (documented)
- [ ] Failover time meets RTO
- [ ] Failover tested regularly
- [ ] Failover runbook documented
- [ ] Failback (returning to primary) tested

## Business Continuity

- [ ] Business continuity plan (BCP) documented
- [ ] BCP accessible to on-call
- [ ] DR roles and responsibilities defined
- [ ] Communication plan for incidents
- [ ] DR drill cadence established
