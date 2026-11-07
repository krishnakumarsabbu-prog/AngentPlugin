# AI Security Review Checklist

## Prompt Injection Defense

- [ ] User inputs separated from system instructions
- [ ] Input sanitization applied (delimiter-based or structural separation)
- [ ] System prompts isolated from user content
- [ ] Defense against indirect prompt injection (untrusted retrieved content)
- [ ] Guardrails or safety filters configured

## Tool Permissions

- [ ] Tool calls scoped to least privilege
- [ ] Destructive tool calls require explicit confirmation
- [ ] Tool allowlists enforced
- [ ] Tool outputs validated before use
- [ ] Maximum tool calls per turn configured (prevent loops)

## Data Leakage

- [ ] PII redacted before sending to external models
- [ ] Prompts logged with sensitive data scrubbed
- [ ] Cross-tenant data isolation enforced in retrieval
- [ ] Training data exposure assessed
- [ ] Controls against model memorization of sensitive data

## Hallucination Control

- [ ] Outputs grounded in retrieved context or verified sources
- [ ] Citations or references provided for factual claims
- [ ] Confidence thresholds used to gate responses
- [ ] Refusal behavior defined for low-confidence or out-of-scope queries
- [ ] Hallucination rates measured via evaluation datasets

## Model Fallback

- [ ] Fallback for model unavailability defined
- [ ] Degraded mode when AI features fail defined
- [ ] Fallback behavior tested
- [ ] Circuit breakers for model API calls configured
- [ ] Retry strategy with backoff for transient failures

## Evaluation & Drift

- [ ] Offline evaluation suite exists
- [ ] Online evaluation (production monitoring) configured
- [ ] Human review processes defined
- [ ] Regression tests for AI behavior defined
- [ ] Model drift detection configured
- [ ] Data drift detection configured
- [ ] Drift alerts configured
