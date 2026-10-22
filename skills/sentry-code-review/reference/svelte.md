# Svelte 5 & SvelteKit Code Review Guide

> Svelte 5 and SvelteKit code review guide focusing on the Runes reactivity model (`$state`, `$derived`, `$effect`), Server vs Client boundaries in load functions, form actions, store modernization, and security practices.

## Table of Contents

- [Runes Reactivity System](#runes-reactivity-system)
- [Load Functions (Server vs Client)](#load-functions-server-vs-client)
- [Form Actions & Enhancements](#form-actions--enhancements)
- [Modernizing Stores to Runes](#modernizing-stores-to-runes)
- [SSR & CSR Boundary Hygiene](#ssr--csr-boundary-hygiene)
- [Performance Optimization](#performance-optimization)
- [Security Auditing](#security-auditing)
- [Review Checklist](#review-checklist)

---

## Runes Reactivity System

### `$state` Basics

```svelte
<!-- ❌ Using $state on static values that never change -->
<script lang="ts">
  let config = $state({ timeout: 5000 }); // Unnecessary reactivity overhead
  const API_URL = $state('/api');          // Constants should be standard JS constants
</script>

<!-- ✅ Standard constants for immutable values; $state for mutable state -->
<script lang="ts">
  const config = { timeout: 5000 };
  const API_URL = '/api';

  let count = $state(0);
  let user = $state<User | null>(null);
</script>
```

### `$state.raw` for Large or External Data

```svelte
<!-- ❌ Wrapping massive nested datasets in deep reactive proxying -->
<script lang="ts">
  let data = $state(hugeApiResponse); // Deep proxy overhead
</script>

<!-- ✅ $state.raw disables deep proxying; updates on reference replacement -->
<script lang="ts">
  let data = $state.raw(hugeApiResponse);

  async function refresh() {
    data = await fetchLatestData(); // Triggers reactivity
  }
</script>
```

### Passing State to Third-Party Libraries via `$state.snapshot`

```svelte
<!-- ❌ Passing $state Proxy directly to non-reactive libraries -->
<script lang="ts">
  let state = $state({ x: 0, y: 0 });

  onMount(() => {
    chartLibrary.update(state); // External chart library fails on Svelte Proxy!
  });
</script>

<!-- ✅ $state.snapshot produces a plain, unproxied JavaScript object -->
<script lang="ts">
  let state = $state({ x: 0, y: 0 });

  onMount(() => {
    chartLibrary.update($state.snapshot(state));
  });
</script>
```

### `$derived` for Pure State Derivations

```svelte
<!-- ❌ Anti-pattern: Using $effect for state synchronization -->
<script lang="ts">
  let firstName = $state('John');
  let lastName = $state('Doe');
  let fullName = $state('');

  $effect(() => {
    fullName = `${firstName} ${lastName}`; // Unnecessary extra re-render cycle
  });
</script>

<!-- ✅ $derived computes value lazily with zero side-effects -->
<script lang="ts">
  let firstName = $state('John');
  let lastName = $state('Doe');
  let fullName = $derived(`${firstName} ${lastName}`);
</script>
```

### `$effect` Lifecycle & Teardown Guards

```svelte
<!-- ❌ Missing cleanup return leads to memory and socket leaks -->
<script lang="ts">
  let roomId = $state('general');

  $effect(() => {
    const ws = new WebSocket(`wss://chat.example.com/${roomId}`);
    ws.onmessage = (e) => { ... };
    // Leaks WebSocket when roomId changes!
  });
</script>

<!-- ✅ Return cleanup callback to close resources prior to re-execution -->
<script lang="ts">
  let roomId = $state('general');

  $effect(() => {
    const ws = new WebSocket(`wss://chat.example.com/${roomId}`);
    ws.onmessage = (e) => { ... };
    return () => ws.close(); // Clean teardown
  });
</script>
```

---

## Load Functions (Server vs Client)

### `+page.server.ts` vs `+page.ts`

```typescript
// ❌ Accessing private server credentials or databases in +page.ts (runs on client too!)
// +page.ts
export const load = async () => {
  const users = await db.query('SELECT * FROM users'); // Leaks database credentials to browser!
  return { users };
};

// ✅ Database and secret queries must strictly reside in +page.server.ts
// +page.server.ts
export const load = async () => {
  const users = await db.query('SELECT * FROM users');
  return { users };
};
```

---

## Form Actions & Enhancements

```svelte
<!-- ✅ SvelteKit standard form action with progressive enhancement -->
<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
</script>

<form method="POST" action="?/save" use:enhance>
  <input name="email" type="email" required />
  <button type="submit">Submit</button>
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}
</form>
```

---

## Security Auditing

1. **Avoid `@html` for Unsanitized User Content**: Direct rendering of raw HTML strings without DOMPurify allows stored XSS.
2. **Environment Variable Boundaries**: Never import from `$env/static/private` or `$env/dynamic/private` in client-facing components.

---

## Review Checklist

### Svelte 5 Runes
- [ ] No usage of legacy Svelte 4 `$: ` reactive statements; modernized to `$derived` or `$effect`.
- [ ] `$derived` used for all computed state; no `$effect` synchronizing variables.
- [ ] Deep proxy overhead avoided on large external datasets using `$state.raw()`.
- [ ] Non-reactive third-party libraries receive `$state.snapshot(proxy)`.
- [ ] Async `$effect` calls read reactive dependencies synchronously before `await`.

### SvelteKit Architecture & Boundaries
- [ ] Database, secrets, and private APIs isolated to `+*.server.ts` files.
- [ ] Forms implement `use:enhance` for progressive enhancement.
- [ ] No unescaped `@html` rendering untrusted user input without sanitization.
- [ ] Global listeners and WebSocket subscriptions properly torn down in cleanup blocks.
