# Enterprise Security Audit — Confirmed Findings Detail

## `billing-invoice-idor-unauthorized-access` — Insecure Direct Object Reference in invoice download endpoint

- **Overall Severity**: **High**
- **Likelihood**: High (directly reachable via authenticated REST API)
- **Impact**: High (cross-tenant exposure of billing invoices and financial data)
- **Root Cause**: `getInvoiceHandler` queries `invoices` by ID only, omitting tenant organization ID scoping.

### Trace & Sinks
1. **Entrypoint**: `src/api/routes/invoices.ts:45` (`getInvoiceHandler`)
2. **Propagation**: `src/services/invoiceService.ts:88` (`fetchInvoiceById`)
3. **Sink**: `src/db/queries/invoices.ts:112` (`queryInvoice`)

### Verified Evidence
- `src/api/routes/invoices.ts:48`: Missing `requireTenantOwnership` validation call.
- `src/db/queries/invoices.ts:115`: SQL query lacks `AND org_id = :orgId` clause.

### Recommended Invariant & Fix
Ensure that database query criteria explicitly enforce tenant boundaries:
```sql
SELECT * FROM invoices WHERE id = :id AND org_id = :current_user_org_id;
```
Return HTTP 404 if the record does not match the active organization context.
