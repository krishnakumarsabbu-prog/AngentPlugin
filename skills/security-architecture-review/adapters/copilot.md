# Security Architecture Review — GitHub Copilot Adapter

## Activation

In GitHub Copilot Chat, the skill is activated by:
- Exporting the skill as Copilot instructions (via Agent Studio export).
- Including the security review methodology in `.github/copilot-instructions.md`.
- Or invoking through the AgentForge Copilot chat participant.

## Copilot Instructions Format

The exported instructions include:
- The STRIDE threat modeling methodology.
- The risk assessment model (likelihood × impact).
- The security controls checklist (IAM, AppSec, API, Data, Infra, AI).
- The compliance mapping methodology.
- The remediation planning format.
- The honesty rules (read-only, no exploitation, evidence required).

## Command Mapping

Copilot does not support slash commands for custom skills. Commands are invoked via natural language:
- "security architecture review" → full review
- "security threat model" → STRIDE threat model
- "security risk assessment" → risk register
- "security attack path" → attack path analysis
- "security data flow" → data flow analysis
- "security compliance mapping" → compliance mapping
- "security remediation plan" → remediation plan
- "security review report" → full report

## Limitations

- Copilot Chat may not have access to all source files in the workspace depending on context.
- Infrastructure configuration files (Terraform, k8s) may not be in the workspace.
- The review quality depends on the amount of code and configuration accessible to Copilot.
- State that limitations exist in the review output and list what was not assessed.
