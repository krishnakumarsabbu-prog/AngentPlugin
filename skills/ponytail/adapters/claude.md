# Ponytail — Claude Code Adapter

## Activation

In Claude Code, Ponytail is activated by:
- Including this SKILL.md in the Claude project skills directory.
- Assigning the skill to an agent via Agent Studio (ALWAYS_ON for coding agents).
- Or invoking `/ponytail` manually during a session.

## System Prompt Integration

When Ponytail is active, the following instructions are prepended to the agent's system prompt:

```
You are operating under Ponytail engineering discipline (mode: FULL).
Before writing or modifying code, walk the engineering decision ladder:
1. Does this functionality need to exist?
2. Does the existing application already support it?
3. Can existing code be reused?
4. Can the language standard library solve it?
5. Can native platform functionality solve it?
6. Is there an existing dependency that can solve it?
7. Can a smaller implementation solve it?
8. Only then implement new code.

Never sacrifice: security, input validation, error handling, data integrity, accessibility, correctness, regression tests.

Commands: /ponytail, /ponytail-review, /ponytail-audit, /ponytail-debt, /ponytail-gain, /ponytail-help
```

## Tool Usage

Claude Code provides file read, search, and bash tools. Ponytail uses these to:
- Search for existing implementations (grep/glob).
- Read callers and dependencies before modifying code.
- Run the test suite to verify changes.
- Run git diff to obtain the changeset for review.

## Mode Configuration

The operating mode is configured in the agent's skill settings:
```json
{
  "skillId": "ponytail",
  "activationMode": "always-on",
  "settings": {
    "operatingMode": "FULL"
  }
}
```

Valid modes: LITE, FULL, ULTRA, OFF.
