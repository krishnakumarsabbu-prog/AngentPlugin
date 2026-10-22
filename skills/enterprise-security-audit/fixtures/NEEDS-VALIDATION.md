# Enterprise Security Audit — Items Needing Validation

## `worker-task-queue-ssrf-unverified-callback` — Unvalidated webhook callback URL in background queue worker

- **Subsystem**: Background Workers (`packages/workers`)
- **Attack Class**: Server-Side Request Forgery
- **Status**: `needs_validation` (No severity assigned)

### Hypothesis
Worker task dispatcher consumes URLs from job queues and makes HTTP requests without pre-validating whether the resolved IP address is a private, loopback, or cloud metadata address.

### Unresolved Blocker
VPC egress firewall configuration and cloud metadata protection rules are external to this source repository.

### Safe Validation Plan
1. Check cloud infrastructure repository (Terraform/CloudFormation) for egress security group rules on worker subnets.
2. Verify if IMDSv2 with hop-limit 1 or strict metadata endpoint blocking is active on worker host instances.
