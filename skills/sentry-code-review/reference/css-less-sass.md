# CSS / Less / Sass Review Guide

> Code review guide for modern CSS, Less, and Sass stylesheets covering design system token variables, rendering performance, specificity management, responsive layouts, and cross-browser resilience.

## Table of Contents

- [CSS Custom Properties vs Hardcoding](#css-custom-properties-vs-hardcoding)
- [Selector Specificity & BEM Standards](#selector-specificity--bem-standards)
- [Rendering Performance & Reflow Hazards](#rendering-performance--reflow-hazards)
- [Layout Systems: Flexbox & Grid](#layout-systems-flexbox--grid)
- [Responsive Design & Fluid Typography](#responsive-design--fluid-typography)
- [Review Checklist](#review-checklist)

---

## CSS Custom Properties vs Hardcoding

### Centralizing Design Tokens via Variables

```css
/* ❌ Hardcoded values across components create maintenance nightmares */
.button {
  background: #3b82f6;
  border-radius: 8px;
}
.card {
  border: 1px solid #3b82f6;
  border-radius: 8px;
}

/* ✅ Leveraging semantic CSS Custom Properties */
:root {
  --color-primary: #3b82f6;
  --radius-md: 8px;
}
.button {
  background: var(--color-primary);
  border-radius: var(--radius-md);
}
.card {
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
}
```

### Semantic Token Taxonomy

```css
:root {
  /* Colors */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-text-primary: #1f2937;
  --color-text-muted: #6b7280;
  --color-bg-canvas: #ffffff;
  --color-border: #e5e7eb;

  /* Spacing Scale */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Typography */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-weight-regular: 400;
  --font-weight-bold: 700;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);

  /* Transitions */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Selector Specificity & BEM Standards

### Keep Specificity Flat

```scss
// ❌ Deep nesting in Sass/Less creates high specificity and un-overridable rules
.nav {
  ul {
    li {
      a {
        color: var(--color-primary);
        &.active {
          font-weight: bold;
        }
      }
    }
  }
}

// ✅ Flat BEM naming with minimal nesting
.nav__link {
  color: var(--color-primary);

  &--active {
    font-weight: bold;
  }
}
```

### Prohibit `!important` as an Override Mechanism

- `!important` breaks stylesheet cascading and creates specificity arms races.
- **Rule**: Reject `!important` unless applied in utility classes (e.g. `.u-hidden { display: none !important; }`) or overriding immutable third-party CSS.

---

## Rendering Performance & Reflow Hazards

### GPU-Accelerated Animation

```css
/* ❌ Animating box-model properties triggers expensive CPU Layout & Paint recalculations */
.box {
  transition: top 300ms, left 300ms, width 300ms;
}
.box:hover {
  top: 10px;
  left: 20px;
}

/* ✅ Animate transform and opacity — offloaded to GPU compositor thread */
.box {
  transition: transform var(--transition-normal), opacity var(--transition-normal);
  will-change: transform;
}
.box:hover {
  transform: translate(20px, 10px);
}
```

---

## Layout Systems: Flexbox & Grid

### Modern Responsive Layouts Without Media Queries

```css
/* ✅ Responsive CSS Grid layout with minmax avoiding explicit media queries */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
}
```

---

## Review Checklist

### Token System
- [ ] Colors, spacing, and typography consume design tokens; zero raw hex colors.
- [ ] Token names follow semantic roles (`--color-text-primary`) rather than literal colors.

### Specificity & Architecture
- [ ] Selector nesting restricted to ≤ 3 levels.
- [ ] No `!important` overrides outside dedicated atomic utility classes.
- [ ] Component styles encapsulated using CSS Modules, BEM, or Shadow DOM.

### Performance & Motion
- [ ] Animations restricted to `transform` and `opacity`.
- [ ] No transitions on `all` or layout properties (`width`, `height`, `margin`, `top`).
- [ ] Layout shifts (CLS) prevented by setting aspect ratios or dimensions on media containers.
