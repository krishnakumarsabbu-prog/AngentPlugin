# Engineering Decision Ladder

The decision ladder is the core of Ponytail. Before writing any new code, walk this ladder top-down. Stop at the first rung that solves the problem.

## Rung 1 — Does this functionality need to exist?

Ask: Is this feature actually needed? Who requested it? What problem does it solve?

- If the problem is already solved differently, do not build a duplicate.
- If the problem is hypothetical ("we might need this later"), do not build it.
- If the problem is a bug, fix the bug — do not build a new feature around it.

**Action**: If no, stop. Document why and close the task.

## Rung 2 — Does the existing application already support it?

Search the codebase for existing implementations:
- Search for function/class names matching the capability.
- Search for configuration options that enable the behavior.
- Check if a feature flag or setting already covers the use case.
- Look at exported APIs and public interfaces.

**Action**: If yes, use the existing capability. Document how to use it.

## Rung 3 — Can existing code be reused?

Before writing new code, check:
- Can an existing function be called with different parameters?
- Can an existing class be extended or composed?
- Can an existing utility be generalized slightly to cover the new case?
- Are there imports in the project that already provide this?

Trace callers and dependencies:
- `grep` for imports of the module you plan to modify.
- Check who calls the functions you plan to change.
- Identify test files that cover the code you plan to touch.

**Action**: If yes, reuse. Prefer extension over replacement.

## Rung 4 — Can the language standard library solve it?

Check the standard library:
- Does the language have a built-in for this? (e.g., `Array.prototype.flat`, `itertools`, `strings.Builder`)
- Does the platform SDK provide this? (e.g., `crypto.randomUUID`, `fs.promises`)
- Is there a well-known standard pattern?

**Action**: If yes, use the standard library. Do not add a dependency for something the language already does.

## Rung 5 — Can native platform functionality solve it?

Check platform capabilities:
- Does the OS or runtime provide this? (e.g., environment variables, file watchers, process signals)
- Does the framework provide this? (e.g., middleware, hooks, lifecycle events)
- Is there a platform API that covers the use case?

**Action**: If yes, use the platform capability.

## Rung 6 — Is there an existing dependency that can solve it?

Check already-installed dependencies:
- Look at `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `pom.xml`.
- Can an already-installed library handle this?
- Is there a transitive dependency already available?

**Action**: If yes, use the existing dependency. Do not add a new dependency when an existing one suffices.

## Rung 7 — Can a smaller implementation solve it?

Before reaching for a library or a framework:
- Can you write 10-20 lines that handle the actual requirement?
- Does the requirement really need a general solution, or is it a specific case?
- Is the "we might need this later" case actually likely?

**Action**: If yes, write the minimal implementation. Keep it focused on the actual requirement.

## Rung 8 — Only then implement new code

This is the last resort. If you reach this rung:
- Document why the prior 7 rungs did not apply.
- Write the smallest complete solution.
- Add tests.
- Do not add abstractions for hypothetical future requirements.

## Anti-Patterns

- Jumping straight to Rung 8 without checking the prior rungs.
- Adding a new dependency when the standard library suffices (Rung 4).
- Writing a general framework when a specific function is needed (Rung 7).
- Duplicating logic that already exists elsewhere in the codebase (Rung 3).
- Building a feature that nobody asked for (Rung 1).
