---
name: talon-dom-xss-auditor
description: Client-side DOM XSS auditor and taint-tracking engine. Maps sources to sinks and evaluates input sanitization.
---

# Talon Browser: Client-Side DOM XSS Auditing

Client-side JavaScript web applications frequently extract data from browser sources and pass them directly into dangerous DOM sinks without HTML encoding or context sanitization.

---

## Source & Sink Taint Tracking Matrix

### 1. Browser Sources (Untrusted Ingress)
- `location.search`, `location.hash`, `location.href`
- `document.referrer`, `document.URL`
- `window.name`
- `postMessage` event payloads (`event.data`)
- `localStorage`, `sessionStorage`, `document.cookie`

### 2. Dangerous Execution Sinks
- **HTML Sinks**: `element.innerHTML`, `element.outerHTML`, `document.write()`, `document.writeln()`
- **Execution Sinks**: `eval()`, `setTimeout(string)`, `setInterval(string)`, `new Function(string)`
- **Script Sinks**: `scriptElement.src`, `scriptElement.text`
- **Navigation Sinks**: `location.assign()`, `location.replace()`, `window.open()` (with `javascript:` URI)
- **Framework Sinks**: `dangerouslySetInnerHTML` (React), `v-html` (Vue), `[innerHTML]` (Angular)

---

## Audit Verification Rules

1. **Sink Reachability**: Verify if an attacker-controlled query parameter or hash fragment reaches a sink without passing through a context-aware sanitizer (such as `DOMPurify.sanitize()`).
2. **PostMessage Origin Validation**: Verify that `window.addEventListener('message', ...)` explicitly validates `event.origin === 'https://trusted.domain.com'`. Flag code omitting origin checks or using loose regexes (`/trusted\.com/`).
3. **Prototype Pollution**: Detect recursive merge/extend routines that accept `__proto__` or `constructor.prototype` properties without key guards.
