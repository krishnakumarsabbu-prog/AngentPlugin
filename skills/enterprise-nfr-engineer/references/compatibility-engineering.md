# Compatibility Engineering

## Objective

Assess compatibility across browser, OS, device, API, protocol, database, and
backward compatibility.

## Assessment Areas

### Browser Compatibility
- What browsers are supported, and is the support matrix documented?
- Are polyfills or transpilation configured (Babel, SWC)?
- Are CSS features checked for browser support?
- Is there a browser testing strategy (BrowserStack, Sauce Labs)?

### OS & Device Compatibility
- What operating systems are supported?
- Is the UI responsive across viewport sizes (mobile, tablet, desktop)?
- Are touch interactions supported where applicable?
- Is device-specific behavior tested?

### API Compatibility
- Is the API versioned (URL path, header, or content negotiation)?
- Are breaking changes documented and communicated?
- Is there a deprecation policy for old API versions?
- Are API changes backward compatible within a major version?

### Protocol Compatibility
- What protocols are supported (HTTP/1.1, HTTP/2, WebSocket, gRPC)?
- Are protocol versions negotiated gracefully?
- Are deprecated protocols disabled?

### Database Compatibility
- What database versions are supported?
- Is the schema migration strategy backward compatible?
- Are database-specific features avoided where portability is required?

### Backward Compatibility
- Are data migrations backward compatible (old code can read new data)?
- Are configuration changes backward compatible?
- Are client libraries versioned and backward compatible?

## Measurable Criteria Examples

- "Supported browser matrix documented and tested"
- "API changes are backward compatible within major version"
- "Schema migrations are backward compatible"
- "UI is responsive across mobile (360px), tablet (768px), and desktop (1280px)"

## Standards Reference

ISO/IEC 25010:2023 — Compatibility characteristic (co-existence,
interoperability). Used as guidance only.
