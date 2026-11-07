# Usability Engineering

## Objective

Assess usability across navigation, interaction, error handling, user
feedback, and workflow usability.

## Assessment Areas

### Navigation
- Is the information architecture clear and consistent?
- Can users find key features within 3 clicks?
- Is navigation predictable and consistent across pages?
- Are breadcrumbs or navigation indicators provided for deep hierarchies?

### Interaction
- Are interactive elements (buttons, links) clearly identifiable?
- Are hover, focus, active, and disabled states visually distinct?
- Is the interaction model consistent (same action = same result)?
- Are destructive actions confirmed?

### Error Handling
- Are error messages clear, actionable, and non-technical?
- Are errors displayed near the relevant input or action?
- Is inline validation used (not just on submit)?
- Are system errors handled gracefully (no stack traces shown to users)?

### User Feedback
- Are loading states shown for async operations?
- Are success and failure states clearly communicated?
- Are toast/notification messages non-intrusive and dismissible?
- Is feedback immediate for user actions?

### Workflow Usability
- Are common workflows optimized (minimal steps for frequent tasks)?
- Are forms concise with logical grouping?
- Is undo available where appropriate?
- Are defaults sensible (pre-filled, smart defaults)?

## Measurable Criteria Examples

- "Core user journey completable within X steps"
- "All error messages are actionable (include a suggested action)"
- "Loading states shown for all operations > 200ms"
- "Destructive actions require confirmation"

## Limitations

Usability assessment from code inspection is limited. Full usability
assessment requires user testing data. Mark as NOT_TESTED when user testing
data is unavailable.

## Standards Reference

ISO/IEC 25010:2023 — Usability characteristic (appropriateness recognizability,
learnability, operability, user error protection, user interface aesthetics,
accessibility). Used as guidance only.
