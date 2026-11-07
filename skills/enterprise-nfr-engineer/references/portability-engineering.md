# Portability Engineering

## Objective

Assess portability across cloud, runtime, infrastructure, configuration, and
deployment portability.

## Assessment Areas

### Cloud Portability
- Is the application deployable to multiple cloud providers?
- Are cloud-specific services abstracted behind interfaces?
- Is IaC (Terraform, Pulumi) used for infrastructure provisioning?
- Are cloud-specific APIs and SDKs isolated to adapter modules?

### Runtime Portability
- Is the application runtime-portable (JVM, container, Node.js runtime)?
- Are runtime-specific features isolated or abstracted?
- Can the application run on different OS platforms (Linux, Windows)?
- Are platform-specific paths and behaviors abstracted?

### Infrastructure Portability
- Is infrastructure defined as code and version-controlled?
- Are environment-specific values externalized (config, secrets)?
- Can the application be deployed to a different region without code changes?
- Are load balancers, CDNs, and DNS abstracted from the application?

### Configuration Portability
- Is configuration externalized (environment variables, config files, vault)?
- Are no environment-specific values hardcoded?
- Is there a clear distinction between code, config, and secrets?
- Can the application be reconfigured without redeployment?

### Deployment Portability
- Is the application packaged as a container or equivalent portable artifact?
- Is the deployment process environment-agnostic?
- Are deployment scripts parameterized (not hardcoded to a specific environment)?
- Is there a CI/CD pipeline that can target multiple environments?

## Measurable Criteria Examples

- "Application deployable to AWS and GCP without code changes"
- "All environment-specific values externalized to configuration"
- "Infrastructure defined as code and version-controlled"
- "Application packaged as a container with no host-specific dependencies"

## Standards Reference

ISO/IEC 25010:2023 — Portability characteristic (adaptability, installability,
replaceability). Used as guidance only.
