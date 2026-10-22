# React Code Review Guide

> Comprehensive code review guidelines for React: Hooks rules, sensible memoization, component boundaries, Server Components (RSC), React 19 Actions, and TanStack Query v5.

## Table of Contents

- [Fundamental Hooks Rules](#fundamental-hooks-rules)
- [useEffect Patterns](#useeffect-patterns)
- [useMemo & useCallback](#usememo--usecallback)
- [Component Design & Boundary Practices](#component-design--boundary-practices)
- [Error Boundaries & Suspense](#error-boundaries--suspense)
- [Server Components (RSC)](#server-components-rsc)
- [React 19 Actions & Forms](#react-19-actions--forms)
- [Suspense & Streaming SSR](#suspense--streaming-ssr)
- [TanStack Query v5](#tanstack-query-v5)
- [Review Checklists](#review-checklists)

---

## Fundamental Hooks Rules

```tsx
// ❌ Conditional Hook invocation — violates React Hook execution order
function BadComponent({ isLoggedIn }: { isLoggedIn: boolean }) {
  if (isLoggedIn) {
    const [user, setUser] = useState<User | null>(null);  // Error!
  }
  return <div>...</div>;
}

// ✅ Hooks must be declared unconditionally at the top level
function GoodComponent({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  if (!isLoggedIn) return <LoginPrompt />;
  return <div>{user?.name}</div>;
}
```

---

## useEffect Patterns

```tsx
// ❌ Missing or incomplete dependency array
function BadEffect({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, []);  // Missing userId dependency!
}

// ✅ Complete dependency array with cancellation guard
function GoodEffect({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchUser(userId).then(data => {
      if (!cancelled) setUser(data);
    });
    return () => { cancelled = true; };  // Cleanup avoids stale state writes
  }, [userId]);
}

// ❌ Using useEffect for derived state (Anti-pattern)
function BadDerived({ items }: { items: Item[] }) {
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  useEffect(() => {
    setFilteredItems(items.filter(i => i.active));
  }, [items]);  // Causes an unnecessary extra render cycle
  return <List items={filteredItems} />;
}

// ✅ Compute directly during render, or wrap in useMemo for expensive calculations
function GoodDerived({ items }: { items: Item[] }) {
  const filteredItems = useMemo(
    () => items.filter(i => i.active),
    [items]
  );
  return <List items={filteredItems} />;
}

// ❌ Using useEffect to respond to user events
function BadEventEffect() {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (query) {
      analytics.track('search', { query });  // Belongs in the event handler!
    }
  }, [query]);
}

// ✅ Fire side effects directly inside user event handlers
function GoodEvent() {
  const [query, setQuery] = useState('');
  const handleSearch = (q: string) => {
    setQuery(q);
    analytics.track('search', { query: q });
  };
}
```

---

## useMemo & useCallback

```tsx
// ❌ Premature optimization — primitives and simple objects do not need useMemo
function OverOptimized() {
  const config = useMemo(() => ({ timeout: 5000 }), []);  // Pointless overhead
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);  // Pointless if not passed to a memoized child component
}

// ✅ Optimize only when reference stability is required by memoized children
function ProperlyOptimized() {
  const config = { timeout: 5000 };
  const handleClick = () => console.log('clicked');
}

// ❌ useCallback with unstable dependencies
function BadCallback({ data }: { data: Item[] }) {
  // If data is a new object reference every render, useCallback provides zero value
  const process = useCallback(() => {
    return data.map(transform);
  }, [data]);
}

// ✅ useMemo and useCallback paired intentionally with React.memo
const MemoizedChild = React.memo(function Child({ onClick, items }: ChildProps) {
  return <div onClick={onClick}>{items.length}</div>;
});

function Parent({ rawItems }: { rawItems: RawItem[] }) {
  const items = useMemo(() => processItems(rawItems), [rawItems]);
  const handleClick = useCallback(() => {
    console.log(items.length);
  }, [items]);
  return <MemoizedChild onClick={handleClick} items={items} />;
}
```

---

## Component Design & Boundary Practices

```tsx
// ❌ Defining components inside other components — recreates component type on every render
function BadParent() {
  function ChildComponent() {  // Re-declared every render; loses state and remounts DOM
    return <div>child</div>;
  }
  return <ChildComponent />;
}

// ✅ Component declared at module scope
function ChildComponent() {
  return <div>child</div>;
}
function GoodParent() {
  return <ChildComponent />;
}

// ❌ Passing unstable object and function literals to memoized children
function BadProps() {
  return (
    <MemoizedComponent
      style={{ color: 'red' }}  // New object reference every render
      onClick={() => {}}         // New function reference every render
    />
  );
}

// ✅ Stable references for memoized components
const staticStyle = { color: 'red' };
function GoodProps() {
  const handleClick = useCallback(() => {}, []);
  return <MemoizedComponent style={staticStyle} onClick={handleClick} />;
}
```

---

## Error Boundaries & Suspense

```tsx
// ❌ Suspense without an Error Boundary — unexpected failures crash the whole view
function BadApp() {
  return (
    <Suspense fallback={<Loading />}>
      <DataComponent />
    </Suspense>
  );
}

// ✅ Error Boundary wrapping Suspense for isolated fallback recovery
function GoodApp() {
  return (
    <ErrorBoundary fallback={<ErrorUI />}>
      <Suspense fallback={<Loading />}>
        <DataComponent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## Server Components (RSC)

```tsx
// ❌ Using client-side state inside a Server Component
// app/page.tsx (Server Component by default in modern frameworks)
function BadServerComponent() {
  const [count, setCount] = useState(0);  // Error! Hooks are not allowed in RSC
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// ✅ Interactive logic extracted into an explicit Client Component
// app/counter.tsx
'use client';
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// app/page.tsx (Server Component)
async function GoodServerComponent() {
  const data = await fetchData();  // Can await directly in RSC
  return (
    <div>
      <h1>{data.title}</h1>
      <Counter />  {/* Client component leaf */}
    </div>
  );
}

// ❌ Excessive 'use client' at high levels turns entire subtree into client bundle
// layout.tsx
'use client';  // Forces all children to be bundled for client execution
export default function Layout({ children }: { children: React.ReactNode }) { ... }

// ✅ Push 'use client' down to leaf interactive components
```

---

## React 19 Actions & Forms

React 19 introduces the Actions standard and streamlined form hooks to simplify asynchronous workflows and optimistic mutations.

### useActionState

```tsx
// ❌ Legacy approach: multiple disjoint state variables
function OldForm() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Result | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    setError(null);
    try {
      const result = await submitForm(formData);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsPending(false);
    }
  };
}

// ✅ React 19: useActionState coordinates submission, pending state, and feedback
import { useActionState } from 'react';

function NewForm() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      try {
        const result = await submitForm(formData);
        return { success: true, data: result, error: null };
      } catch (e: any) {
        return { success: false, data: null, error: e.message };
      }
    },
    { success: false, data: null, error: null }
  );

  return (
    <form action={formAction}>
      <input name="email" />
      <button disabled={isPending}>
        {isPending ? 'Submitting...' : 'Submit'}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

### useFormStatus

```tsx
// ❌ Prop-drilling pending state to submit buttons
function BadSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return <button disabled={isSubmitting}>Submit</button>;
}

// ✅ useFormStatus reads parent <form> state automatically
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  // Must be called inside a child component within the <form>
  return (
    <button disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}

// ❌ Calling useFormStatus in the same component rendering the <form>
function BadForm() {
  const { pending } = useFormStatus();  // Will NOT read this form's status!
  return (
    <form action={action}>
      <button disabled={pending}>Submit</button>
    </form>
  );
}

// ✅ Calling useFormStatus in a nested child component
function GoodForm() {
  return (
    <form action={action}>
      <SubmitButton />  {/* useFormStatus invoked internally here */}
    </form>
  );
}
```

### useOptimistic

```tsx
// ❌ Waiting for full server roundtrip before providing UI feedback
function SlowLike({ postId, likes }: { postId: string; likes: number }) {
  const [likeCount, setLikeCount] = useState(likes);
  const [isPending, setIsPending] = useState(false);

  const handleLike = async () => {
    setIsPending(true);
    const newCount = await likePost(postId);
    setLikeCount(newCount);
    setIsPending(false);
  };
}

// ✅ useOptimistic provides instant UI feedback and rolls back on failure
import { useOptimistic } from 'react';

function FastLike({ postId, likes }: { postId: string; likes: number }) {
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (current, increment: number) => current + increment
  );

  const handleLike = async () => {
    addOptimisticLike(1);  // Immediately render optimistic state
    try {
      await likePost(postId);
    } catch {
      // React automatically reverts to canonical `likes` prop on rejection
    }
  };

  return <button onClick={handleLike}>{optimisticLikes} likes</button>;
}
```

---

## Suspense & Streaming SSR

### Granular Suspense Boundaries

```tsx
// ❌ Monolithic boundary blocks the entire UI on the slowest component
function BadLayout() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Header />
      <MainContent />  {/* Slow query */}
      <Sidebar />      {/* Fast query */}
    </Suspense>
  );
}

// ✅ Independent boundaries stream sections as they resolve
function GoodLayout() {
  return (
    <>
      <Header />  {/* Renders instantly */}
      <div className="flex">
        <Suspense fallback={<ContentSkeleton />}>
          <MainContent />  {/* Streams independently */}
        </Suspense>
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />      {/* Streams independently */}
        </Suspense>
      </div>
    </>
  );
}
```

### React 19 `use()` Hook

```tsx
// ✅ Reading a Promise directly during component render
import { use, Suspense } from 'react';

function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise);  // Triggers Suspense until resolved
  return (
    <ul>
      {comments.map(c => <li key={c.id}>{c.text}</li>)}
    </ul>
  );
}

function Post({ postId }: { postId: string }) {
  const commentsPromise = fetchComments(postId);  // Initiate Promise without await
  return (
    <article>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments commentsPromise={commentsPromise} />
      </Suspense>
    </article>
  );
}
```

---

## TanStack Query v5

### Standard Recommended Defaults

```tsx
// ✅ Enterprise recommended queryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // Consider data fresh for 5 minutes
      gcTime: 1000 * 60 * 30,    // Retain in cache for 30 minutes (v5 renamed from cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Type-Safe queryOptions

```tsx
import { queryOptions, useQuery } from '@tanstack/react-query';

// ✅ Reusable, strongly-typed query configuration
const userQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId),
  });

function UserProfile({ userId }: { userId: string }) {
  const { data } = useQuery(userQueryOptions(userId));
  return <div>{data?.name}</div>;
}

// Prefetching shares the identical key and return types
await queryClient.prefetchQuery(userQueryOptions(userId));
```

### Key Differences in useSuspenseQuery

| Feature | `useQuery` | `useSuspenseQuery` |
|---|---|---|
| `enabled` option | ✅ Supported | ❌ Not supported |
| `placeholderData` | ✅ Supported | ❌ Not supported |
| `data` return type | `T \| undefined` | `T` (Guaranteed defined) |
| Error handling | `error` property | Throws to nearest Error Boundary |
| Loading state | `isLoading` property | Suspends to nearest Suspense fallback |

---

## Review Checklists

### Hooks Rules
- [ ] Hooks declared strictly at top-level component scope.
- [ ] No hook calls inside conditionals, loops, or nested functions.
- [ ] Complete `useEffect` dependency arrays; no omitted reactive variables.
- [ ] Cleanup functions implemented for subscriptions, timers, and abort controllers.
- [ ] No `useEffect` calls used to compute derived state.

### Performance & Memoization
- [ ] `useMemo` and `useCallback` reserved for expensive computations or memoized props.
- [ ] `React.memo` components receive stable function and object references.
- [ ] No nested component definitions inside render functions.
- [ ] Large lists virtualized via modern windowing libraries.

### Component Design
- [ ] Single Responsibility Principle: complex components split into modular units.
- [ ] Business and data-fetching logic decoupled into custom hooks.
- [ ] Explicit TypeScript props interfaces; avoids broad `any` typings.

### Server Components & Forms
- [ ] `'use client'` pushed to leaf interactive components.
- [ ] Server Components do not import client hooks or DOM event handlers.
- [ ] React 19 forms leverage `useActionState` and `useFormStatus`.
- [ ] Non-critical mutations provide optimistic UI feedback via `useOptimistic`.

### Suspense & Data Layer
- [ ] Isolated Suspense boundaries paired with Error Boundaries.
- [ ] Query keys contain all parameters that affect data retrieval.
- [ ] Sensible `staleTime` configured (avoids continuous refetch loops on zero default).
- [ ] `useSuspenseQuery` accompanied by an Error Boundary ancestor.
