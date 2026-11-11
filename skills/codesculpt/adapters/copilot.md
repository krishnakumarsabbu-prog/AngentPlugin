# CodeSculpt — GitHub Copilot Adapter

## Activation

In GitHub Copilot Chat, CodeSculpt is activated by:
- Exporting the skill as Copilot instructions (via Agent Studio export).
- Including the decision ladder and quality guardrails in the `.github/copilot-instructions.md` file.
- Or invoking the skill through the AgentForge Copilot chat participant.

## Copilot Instructions Format

The exported Copilot instructions include:
- The engineering decision ladder (8 rungs).
- The quality guardrails (security, validation, error handling, data integrity, accessibility, correctness, tests).
- The review methodology (severity levels and finding format).
- The audit methodology (5 dimensions).
- The debt tracking format.
- The gain reporting metrics.

## Mode Configuration

In Copilot, the operating mode is set via the agent configuration:
```json
{
  "skillId": "codesculpt",
  "activationMode": "always-on",
  "settings": {
    "operatingMode": "FULL"
  }
}
```

## Command Mapping

Copilot does not support slash commands natively for custom skills. Commands are invoked via natural language:
- "ponytail review" → review the current diff
- "ponytail audit" → audit the repository
- "ponytail debt" → list or add debt
- "ponytail gain" → report session gain
- "ponytail help" → show available commands

## Limitations

- Copilot Chat does not have a persistent skill context across messages in all editors. The instructions are included in the system prompt at the start of each conversation.
- Tool execution (file read, search, test run) depends on the editor's Copilot Chat capabilities and workspace access.
