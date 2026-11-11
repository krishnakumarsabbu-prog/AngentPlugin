# CodeSculpt — Generic Agent Adapter

## Activation

For agents that do not fit the Copilot or Claude model (e.g., OpenAI Assistants, custom agent frameworks), CodeSculpt is activated by:

1. Including the SKILL.md content in the agent's system prompt or instructions.
2. Loading the relevant reference files based on the task (review, audit, debt, gain).
3. Providing the agent with file read, search, and shell tools.

## Minimal Integration

At minimum, the agent must receive:
- The engineering decision ladder (8 rungs).
- The quality guardrails.
- The command descriptions (review, audit, debt, gain, help).

## System Prompt Injection

The skill context builder injects the following into the system prompt:

```
## Active Skill: CodeSculpt (Engineering Discipline, mode: FULL)

### Decision Ladder
1. Does this functionality need to exist?
2. Does the existing application already support it?
3. Can existing code be reused?
4. Can the language standard library solve it?
5. Can native platform functionality solve it?
6. Is there an existing dependency that can solve it?
7. Can a smaller implementation solve it?
8. Only then implement new code.

### Quality Guardrails
Never sacrifice: security, input validation, error handling, data integrity, accessibility, correctness, regression tests.

### Commands
- ponytail: Activate engineering discipline mode
- codesculpt-review: Review the current diff
- codesculpt-audit: Audit the repository
- codesculpt-debt: Track technical debt
- codesculpt-gain: Report session metrics
- codesculpt-help: Show help
```

## Tool Requirements

The agent needs at minimum:
- File read access (to inspect existing code before modifying).
- Search/grep capability (to find callers and dependencies).
- Shell access (to run tests and git diff).

If any of these are unavailable, Ponytail should report the limitation rather than attempting to operate without inspection capabilities.
