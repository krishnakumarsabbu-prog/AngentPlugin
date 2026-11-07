# Sample Application: PayFlow Payment API

## Application Overview

- **Name:** PayFlow
- **Description:** A high-volume REST API for processing payment transactions, refunds, and account management for an e-commerce platform.
- **Criticality Tier:** T1 — Mission Critical (outage causes immediate revenue loss and customer impact)
- **Business Purpose:** Process customer payments securely and reliably with sub-second latency.

## Technology Stack

- **Language:** Node.js / TypeScript
- **Framework:** Express
- **Database:** PostgreSQL (primary) with Redis (cache and session store)
- **Message Broker:** RabbitMQ for async webhooks and notifications
- **Deployment:** Kubernetes (EKS) across 2 AWS regions
- **CI/CD:** GitHub Actions
- **Observability:** Datadog (metrics, logs, APM)

## Architecture

- **API Gateway** → receives HTTP requests, rate limits, routes to services
- **Payment Service** → processes payment transactions (core business logic)
- **Refund Service** → processes refunds
- **Account Service** → manages merchant accounts
- **Webhook Dispatcher** → sends async notifications via RabbitMQ
- **PostgreSQL** → primary data store with read replicas
- **Redis** → caching and distributed session store

## External Integrations

- Stripe payment gateway (payment processing)
- SendGrid (email notifications)
- AWS SNS (SMS notifications)

## Traffic Profile

- **Peak RPS:** 5,000 requests/second
- **Daily transactions:** ~2 million
- **Growth:** 20% month-over-month

## Known Constraints

- PCI-DSS compliance required (payment data)
- p95 latency target: < 200ms for payment processing
- Availability target: 99.99% (measured monthly)
- RTO: < 15 minutes, RPO: 0 (synchronous replication)
