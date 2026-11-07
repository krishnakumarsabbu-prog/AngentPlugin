# AI System Quality Engineering

## Objective

Assess AI system quality across hallucination, grounding, retrieval, prompt
injection, data leakage, model latency, token usage, tool permissions, model
fallback, evaluation, and drift.

## Assessment Areas

### Hallucination Control
- Are outputs grounded in retrieved context or verified sources?
- Are citations or references provided for factual claims?
- Are confidence thresholds used to gate responses?
- Is refusal behavior defined for low-confidence or out-of-scope queries?
- Are hallucination rates measured via evaluation datasets?

### Retrieval Quality (RAG)
- Is chunking strategy appropriate for the content type?
- Are embeddings appropriate for the domain?
- Is relevance scoring tuned (hybrid search, reranking)?
- Is retrieval freshness maintained (re-indexing cadence)?
- Are retrieval metrics tracked (recall, precision, MRR)?
- Is the corpus quality controlled (no stale or irrelevant documents)?

### Prompt Injection Defense
- Are user inputs separated from system instructions?
- Is input sanitization applied (delimiter-based separation, structural separation)?
- Are system prompts isolated from user content?
- Are tool calls authorized and scoped (least privilege)?
- Is there a defense against indirect prompt injection (untrusted retrieved content)?
- Are guardrails or safety filters configured?

### Data Leakage
- Is PII redacted before sending to external models?
- Are prompts logged with sensitive data scrubbed?
- Is cross-tenant data isolation enforced in retrieval?
- Is training data exposure assessed?
- Are there controls against model memorization of sensitive data?

### Model Latency & Token Usage
- Is model latency measured (p50, p95, p99)?
- Is token usage monitored per feature and per user?
- Is prompt caching used for repeated queries?
- Is streaming used to reduce perceived latency?
- Is batch processing used for non-real-time workloads?
- Is model selection optimized (smallest sufficient model)?

### Tool Permissions
- Are tool calls scoped to least privilege?
- Do destructive tool calls require explicit confirmation?
- Are tool allowlists enforced?
- Are tool outputs validated before use?
- Is there a maximum number of tool calls per turn (to prevent loops)?

### Model Fallback
- Is there a fallback for model unavailability?
- Is there a degraded mode when AI features fail?
- Is fallback behavior tested?
- Are there circuit breakers for model API calls?
- Is there a retry strategy with backoff for transient failures?

### Evaluation
- Is there an offline evaluation suite?
- Is there an online evaluation (production monitoring)?
- Are human review processes defined?
- Are regression tests for AI behavior defined?
- Is evaluation data representative and maintained?
- Are evaluation metrics defined (accuracy, faithfulness, relevance, safety)?

### Drift Detection
- Is model drift detected (performance degradation over time)?
- Is data drift detected (input distribution changes)?
- Is evaluation drift detected (evaluation scores trending down)?
- Are drift alerts configured?
- Is there a retraining or re-evaluation cadence?

## Measurable Criteria Examples

- "Hallucination rate < 5% as measured by [evaluation dataset]"
- "All tool calls require explicit confirmation for destructive actions"
- "Model p95 latency < 2 seconds for first token"
- "Token usage monitored with per-feature cost attribution"
- "Drift detected when evaluation score drops > 10% from baseline"
- "No PII sent to external models without redaction"

## Security Considerations

- Prompt injection is the primary attack vector for AI systems.
- Tool use amplifies the blast radius of prompt injection.
- Data leakage via prompts is a compliance and privacy risk.
- See `security-engineering.md` for general security controls.
- Use `checklists/ai-security-review.md` for rapid coverage.

## Standards Reference

This domain extends beyond ISO/IEC 25010. It draws on emerging AI quality
frameworks, OWASP guidelines for AI, and industry practice. Used as guidance
only. Do not claim certified compliance with any AI standard.
