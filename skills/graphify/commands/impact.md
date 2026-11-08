# /graphify-impact

Generates a change impact report for a function, module, or file.

## Invocation

```
graphify impact "TransactionService"           # What will be affected if I change this?
graphify impact "src/api/routes/payments.ts"   # Impact of changing a specific file
graphify impact "processPayment" --depth 3     # Include indirect callers up to 3 levels
```

## Process

1. Check that `graphify-out/graph.json` exists.
2. Find the target node (function, module, or file).
3. Trace all direct and indirect callers (reverse traversal of CALLS, IMPORTS, DEPENDS_ON edges).
4. Identify related tests (nodes connected by TESTS edges).
5. Identify configuration dependencies (nodes connected by CONFIGURES edges).
6. Identify downstream impacts (what services, APIs, or modules will be affected).
7. Produce the impact report.

## Output

```
# Change Impact Report: TransactionService

**Target:** TransactionService (src/services/TransactionService.ts:23)
**Community:** Payment Processing (Community 4)

## Direct Callers (Level 1)
1. PaymentController (src/api/controllers/payments.ts:45) — [CALLS]
2. RefundService (src/services/RefundService.ts:12) — [CALLS]
3. TransactionService.test.ts (src/services/__tests__/TransactionService.test.ts:8) — [TESTS]

## Indirect Callers (Level 2)
1. PaymentAPI (src/api/routes/payments.ts:30) — via PaymentController
2. WebhookHandler (src/webhooks/payments.ts:18) — via RefundService

## Indirect Callers (Level 3)
1. Public API endpoint POST /api/payments — via PaymentAPI
2. Webhook endpoint POST /webhooks/payment-update — via WebhookHandler

## Related Tests
1. TransactionService.test.ts — 12 test cases
2. PaymentController.test.ts — 8 test cases
3. payments.integration.test.ts — 3 test cases

## Configuration Dependencies
1. PAYMENT_TIMEOUT_MS (src/config/payments.ts:5) — [CONFIGURES]
2. MAX_RETRY_COUNT (src/config/payments.ts:8) — [CONFIGURES]

## Potential Regression Areas
1. Payment processing flow (direct)
2. Refund processing flow (direct)
3. Payment webhook handling (indirect)
4. Public payment API (indirect)

## Recommendation
Changing TransactionService will affect the payment processing, refund, and webhook
flows. Run all 23 related tests. Pay special attention to the retry logic and timeout
configuration.
```

## Rules

- Distinguish direct callers from indirect callers.
- Always include related tests.
- Identify configuration dependencies.
- Note potential regression areas.
- If the graph is stale, suggest running `--update` first.
- Distinguish EXTRACTED relationships from INFERRED ones.
