# Production Readiness Checklist

## Deployment

- [ ] Deployment process automated (CI/CD)
- [ ] Deployments reproducible (same artifact, same process)
- [ ] Deployment runbook documented per service
- [ ] Incremental deployment supported (canary, blue-green, rolling)
- [ ] Post-deploy health check configured

## Rollback

- [ ] Automated rollback mechanism exists
- [ ] Rollback triggerable by on-call without specialist assistance
- [ ] Rollback tested regularly
- [ ] Rollback time within RTO
- [ ] Database migrations backward compatible

## Monitoring & Alerting

- [ ] System monitored 24/7 (or per business requirements)
- [ ] Dashboards available for on-call
- [ ] Health endpoints configured for all services
- [ ] Synthetic monitoring for critical user journeys
- [ ] Alerts based on SLOs with runbook links

## On-Call & Incident Response

- [ ] On-call rotation documented
- [ ] Escalation policy defined
- [ ] Incident severity levels defined
- [ ] Communication plan (internal, external, stakeholders)
- [ ] Postmortem process for significant incidents
- [ ] Postmortem action items tracked to completion

## Runbooks

- [ ] Runbooks documented for each critical service
- [ ] Runbooks cover common incidents
- [ ] Runbooks linked from alerts
- [ ] Runbooks kept up to date
- [ ] Runbooks tested by on-call

## Operational Ownership

- [ ] Clear owner for each service
- [ ] Team that builds also operates (you build it, you run it)
- [ ] Operational ownership documented
- [ ] Service-level agreements between teams documented

## Capacity

- [ ] Current capacity documented and monitored
- [ ] Growth projections defined
- [ ] Capacity review cadence established
- [ ] Capacity threshold alerts configured
