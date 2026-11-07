# Accessibility Engineering

## Objective

Assess accessibility against WCAG 2.2 guidelines: keyboard access, screen
reader support, contrast, semantic HTML, focus management, and accessible
forms.

## WCAG 2.2 Principles (POUR)

1. **Perceivable** — Information and user interface components must be presentable in ways users can perceive.
2. **Operable** — User interface components and navigation must be operable.
3. **Understandable** — Information and operation of the user interface must be understandable.
4. **Robust** — Content must be robust enough to be interpreted by a wide variety of user agents, including assistive technologies.

## Assessment Areas

### Keyboard Access
- All functionality is operable from the keyboard (Tab, Enter, Space, arrows).
- No keyboard traps (focus cannot escape a component unintentionally).
- Logical tab order that follows visual order.
- Keyboard shortcuts do not conflict with assistive technology.
- Skip-to-content link provided for keyboard users.

### Focus Management
- Visible focus indicator on all interactive elements.
- Focus is managed on route changes and dynamic content updates.
- Focus is moved to modals when opened and restored when closed.
- Focus is not lost after asynchronous updates.

### Semantic HTML & ARIA
- Use semantic HTML elements (button, nav, main, header, footer, section, article).
- ARIA is used to enhance, not replace, semantics.
- ARIA roles, states, and properties are correct and valid.
- Landmark roles are present (banner, navigation, main, contentinfo).
- Heading hierarchy is logical (no skipped levels).

### Color Contrast
- Text contrast meets WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for large text.
- UI component contrast meets 3:1 (buttons, form borders, focus indicators).
- Information is not conveyed by color alone (also use text or icons).
- Contrast is maintained in dark mode and high-contrast mode.

### Forms
- All form inputs have associated labels (not just placeholder text).
- Error messages are programmatically associated with inputs.
- Required fields are indicated with text, not just color or asterisk.
- Form validation errors are announced to screen readers.
- Autofill is supported with correct autocomplete attributes.

### Images & Media
- Informative images have alt text.
- Decorative images have empty alt (alt="") or are CSS backgrounds.
- Charts and complex images have extended descriptions.
- Videos have captions.
- Audio has transcripts.
- No autoplay of media with sound.

### Screen Reader Compatibility
- Test with NVDA, JAWS, and VoiceOver.
- Live regions announce dynamic content updates.
- Custom widgets follow ARIA Authoring Practices Guide patterns.
- No aria-hidden on focusable elements.

## Measurable Criteria Examples

- "WCAG 2.2 AA conformance verified by axe-core with zero critical violations"
- "All interactive elements reachable and operable via keyboard"
- "All form inputs have associated labels"
- "Text contrast >= 4.5:1 for normal text, >= 3:1 for large text"

## Tools

| Tool | Use Case |
|------|----------|
| axe-core | Automated accessibility testing |
| Lighthouse | Accessibility auditing |
| NVDA / JAWS / VoiceOver | Screen reader testing |
| WAVE | Accessibility evaluation |

When a tool is unavailable, mark the check NOT_EXECUTED. Do not fabricate
tool output. Some accessibility issues require manual testing with assistive
technology and cannot be detected by automated tools alone.

## Standards Reference

WCAG 2.2 — Web Content Accessibility Guidelines. Used as guidance only. Do
not claim certified compliance unless formally audited.
