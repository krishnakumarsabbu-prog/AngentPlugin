# Vue 3 Code Review Guide

> Vue 3 Composition API code review guide covering reactivity mechanics, props and emits, Vue 3.5+ features (reactive props destructuring, `useTemplateRef`), watchers, composables, and runtime performance optimization.

## Table of Contents

- [Reactivity System Mechanics](#reactivity-system-mechanics)
- [Props & Emits](#props--emits)
- [Vue 3.5+ Modern Features](#vue-35-modern-features)
- [Watchers & Side Effects](#watchers--side-effects)
- [Template Best Practices](#template-best-practices)
- [Composables Design Rules](#composables-design-rules)
- [Performance Optimization](#performance-optimization)
- [Review Checklist](#review-checklist)

---

## Reactivity System Mechanics

### `ref` vs `reactive`

```vue
<!-- ✅ Primitive values require ref -->
<script setup lang="ts">
const count = ref(0)
const name = ref('Vue')

count.value++
</script>

<!-- ✅ Modern best practice: prefer ref everywhere for consistency -->
<script setup lang="ts">
const user = ref<User | null>(null)
const loading = ref(false)
const error = ref<Error | null>(null)
</script>
```

### Destructuring `reactive` Objects Destroys Reactivity

```vue
<!-- ❌ Destructuring a reactive object breaks connection to reactive proxy -->
<script setup lang="ts">
const state = reactive({ count: 0, name: 'Vue' })
const { count, name } = state // Reactivity is completely lost!
</script>

<!-- ✅ Use toRefs to retain reactive connection -->
<script setup lang="ts">
const state = reactive({ count: 0, name: 'Vue' })
const { count, name } = toRefs(state) // Retains reactivity
</script>
```

### Side Effects in `computed` Are Prohibited

```vue
<!-- ❌ Side effects inside computed properties -->
<script setup lang="ts">
const fullName = computed(() => {
  otherRef.value = 'mutated' // Never mutate external state inside computed!
  return `${firstName.value} ${lastName.value}`
})
</script>

<!-- ✅ computed must be a pure derivation; use watch for side effects -->
<script setup lang="ts">
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

watch(fullName, (name) => {
  analytics.track('name_change', { name })
})
</script>
```

### `shallowRef` for Massive or External Data Structures

```vue
<!-- ❌ Wrapping massive nested datasets in ref incurs expensive deep reactivity proxying -->
<script setup lang="ts">
const largeData = ref(hugeNestedObject)
</script>

<!-- ✅ shallowRef avoids deep traversal overhead; triggers on root reference replacement -->
<script setup lang="ts">
const largeData = shallowRef(hugeNestedObject)

function updateData(newData: BigDataset) {
  largeData.value = newData // Triggers update
}
</script>
```

---

## Props & Emits

### Never Mutate Props In-Place

```vue
<!-- ❌ Directly mutating prop objects violates unidirectional data flow -->
<script setup lang="ts">
const props = defineProps<{ user: User }>()
props.user.name = 'New Name' // Never mutate props directly!
</script>

<!-- ✅ Emit an event requesting parent to perform the mutation -->
<script setup lang="ts">
const props = defineProps<{ user: User }>()
const emit = defineEmits<{
  'update:name': [name: string]
}>()

const updateName = (name: string) => emit('update:name', name)
</script>
```

### Type-Safe `defineEmits`

```vue
<!-- ❌ String array defineEmits provides no parameter type safety -->
<script setup lang="ts">
const emit = defineEmits(['update', 'delete'])
emit('update', 123) // Type-unsafe!
</script>

<!-- ✅ Strongly-typed tuple event dictionary -->
<script setup lang="ts">
const emit = defineEmits<{
  update: [id: number, value: string]
  delete: [id: number]
}>()

emit('update', 1, 'active') // Type-checked
</script>
```

---

## Vue 3.5+ Modern Features

### Reactive Props Destructure (Vue 3.5+)

```vue
<!-- ✅ Vue 3.5+: Destructuring defineProps preserves reactive tracking automatically -->
<script setup lang="ts">
const { count, name = 'default' } = defineProps<{
  count: number
  name?: string
}>()

// count and name maintain full reactive tracking in templates and watchers
watch(() => count, (newCount) => {
  console.log('Count updated:', newCount)
})
</script>
```

### `defineModel` Two-Way Binding (Vue 3.4+)

```vue
<!-- ✅ defineModel eliminates boilerplate props/emits combinations -->
<script setup lang="ts">
const model = defineModel<string>({ default: '' })
const count = defineModel<number>('count', { default: 0 })
</script>

<template>
  <input v-model="model" />
</template>
```

### `useTemplateRef` (Vue 3.5+)

```vue
<!-- ✅ Type-safe template ref decoupling string identifiers from component variables -->
<script setup lang="ts">
import { useTemplateRef, onMounted } from 'vue'

const inputEl = useTemplateRef<HTMLInputElement>('my-input')

onMounted(() => {
  inputEl.value?.focus()
})
</script>

<template>
  <input ref="my-input" />
</template>
```

---

## Watchers & Side Effects

### Explicit Source Targeting in `watch`

```vue
<!-- ❌ Passing property value directly rather than getter function -->
<script setup lang="ts">
const state = reactive({ count: 0 })
watch(state.count, (val) => { ... }) // Error: primitive number is not a valid watch source
</script>

<!-- ✅ Pass getter function for nested properties -->
<script setup lang="ts">
const state = reactive({ count: 0 })
watch(() => state.count, (val) => { ... })
</script>
```

### Cleaning Up Async Watcher Side Effects

```vue
<script setup lang="ts">
watch(id, (newId, oldId, onCleanup) => {
  const controller = new AbortController()
  fetchData(newId, { signal: controller.signal })

  onCleanup(() => {
    controller.abort() // Prevents race conditions when id changes rapidly
  })
})
</script>
```

---

## Composables Design Rules

1. **Accept Both Refs and Primitives**: Wrap inputs with `toValue()` or `unref()`.
2. **Return Plain Objects of Refs**: Enables convenient destructuring while retaining reactivity.
3. **Handle Lifecycle Cleanup**: Teardown event listeners, intervals, and web sockets in `onScopeDispose()` or `onUnmounted()`.

```typescript
// ✅ Idiomatic composable pattern
export function useWindowScroll() {
  const x = ref(window.scrollX)
  const y = ref(window.scrollY)

  const update = () => {
    x.value = window.scrollX
    y.value = window.scrollY
  }

  window.addEventListener('scroll', update, { passive: true })
  onScopeDispose(() => {
    window.removeEventListener('scroll', update)
  })

  return { x: readonly(x), y: readonly(y) }
}
```

---

## Review Checklist

### Reactivity & State
- [ ] No destructuring of `reactive()` objects without `toRefs()`.
- [ ] Computed properties are pure functions with zero external state mutations.
- [ ] Deep `ref()` avoided on large static or third-party datasets; `shallowRef()` applied.
- [ ] Vue 3.5 reactive props destructuring used with default values.

### Component Contracts
- [ ] Props are strictly read-only; mutations dispatched via typed `emit()`.
- [ ] `defineModel()` used for components implementing `v-model`.
- [ ] `useTemplateRef()` used for DOM access in Vue 3.5+ components.

### Watchers & Lifecycles
- [ ] Async watchers utilize `onCleanup` to abort pending network requests.
- [ ] Composables cleanup global DOM event listeners inside `onScopeDispose()`.
- [ ] Reactive dependencies explicitly wrapped in getters inside `watch(() => target)`.
