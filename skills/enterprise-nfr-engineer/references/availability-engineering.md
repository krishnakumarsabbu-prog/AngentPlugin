# Availability Engineering

## Objective

Assess availability targets, redundancy, failover, load balancing, SLOs, and
single points of failure.

## Assessment Areas

### Availability Targets
- Is an availability SLO defined (e.g., 99.9%, 99.95%, 99.99%)?
- Is the measurement window defined (monthly, rolling 30-day)?
- Is the SLO aligned with business needs?
- Is there an error budget policy (what happens when the budget is exhausted)?

### Redundancy
- Are critical components deployed with redundancy (multi-AZ, multi-region)?
- Is there N+1 or N+M redundancy for critical services?
- Are there single points of failure (single instance, single AZ, single DNS)?

### Failover
- Is failover automated or manual?
- What is the failover time, and does it meet the RTO?
- Is failover tested regularly?
- Are health checks configured for failover triggers?

### Load Balancing
- Is traffic distributed across healthy instances?
- Are health checks configured with appropriate thresholds?
- Is session affinity used, and is it necessary?
- Is the load balancer itself redundant?

### SLOs & Error Budgets
- Are SLIs defined (what to measure)?
- Are SLOs defined (target values for SLIs)?
- Is the error budget tracked and enforced?
- Is there a policy for error budget exhaustion (freeze, prioritize reliability)?

## Measurable Criteria Examples

- "Availability >= 99.95% measured over rolling 30-day window"
- "Failover completes within 60 seconds of detected failure"
- "No single points of failure in critical paths"
- "Error budget burn rate alerted at 2x and 6x normal"

## Single Point of Failure Checklist

- Single application instance
- Single database primary without replica
- Single load balancer
- Single DNS provider
- Single CDN
- Single cloud region for a multi-region service
- Single message broker
- Single cache instance without fallback

## Standards Reference

Google SRE principles — SLOs, error budgets, burn rate alerts. Used as
guidance only.
