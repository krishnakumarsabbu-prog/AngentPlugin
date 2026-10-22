# Asynchronous & Concurrency Patterns — Cross-Language Guide

> Cross-language reference on asynchronous programming models, concurrency pitfalls, backpressure management, structured concurrency, and execution pool limits.

## Table of Contents

- [Concurrency Models Compared](#concurrency-models-compared)
- [Pervasive Concurrency Pitfalls](#pervasive-concurrency-pitfalls)
- [Architectural Best Practices](#architectural-best-practices)
- [Cross-Language Reference Implementations](#cross-language-reference-implementations)
- [Review Checklist](#review-checklist)

---

## Concurrency Models Compared

| Model | Primary Languages | Core Abstraction | Strengths | Trade-offs |
|---|---|---|---|---|
| **Goroutines & Channels** | Go | Lightweight user-space threads + CSP queues | Minimal overhead, straightforward syntax | Manual cancellation plumbing |
| **async/await + Event Loop** | Python, TypeScript | Single-threaded cooperative multiplexing | Lock-free simplicity, easy to reason about | Event loop starvation if blocked |
| **async/await + Tokio** | Rust | Polled Futures + work-stealing scheduler | Zero-cost abstractions, compile-time safety | Steep learning curve, pinning |
| **Coroutines & Flow** | Kotlin | Suspending functions + structured scopes | Automatic cancellation propagation | Dispatcher selection nuances |
| **async/await + Actors** | Swift | Structured concurrency + actor isolation | Compile-time data race safety | Strict concurrency migration rules |
| **async/await + TPL** | C# | Tasks + thread pool scheduler | Mature ecosystem, ConfigureAwait | Implicit context switching |
| **Threads & Mutexes** | C++, Java, Systems | OS threads + shared mutable memory | Maximum multi-core hardware saturation | High overhead, deadlock exposure |

### Workload Selection Guide

```
I/O-Bound Operations (Network, Database, Filesystem):
  → async/await (Python, TypeScript, Rust, Swift, C#)
  → goroutines (Go)
  → coroutines (Kotlin)

CPU-Bound Operations (Encryption, Image Processing, Heavy Math):
  → Thread pools / worker pools (Java, C++, C#)
  → Multiprocessing (Python)
  → spawn_blocking (Rust Tokio)
  → Dispatchers.Default (Kotlin)

Mixed Workloads:
  → async runtime + spawn_blocking thread pool (Rust)
  → async loop + run_in_executor / to_thread (Python)
  → goroutines + sync.Mutex / bounded worker pools (Go)
```

---

## Pervasive Concurrency Pitfalls

### 1. Race Conditions
Concurrent tasks perform unsynchronized read-modify-write operations on shared mutable memory.

```
Task 1: Read counter=0 -> Write counter=1
Task 2: Read counter=0 -> Write counter=1
Expected: counter=2 | Actual: counter=1
```

**Remediation**: Mutex locks, atomic primitives, or encapsulation inside an Actor/Channel.

### 2. Deadlocks
Two or more execution threads hold locks and block indefinitely waiting for each other to release dependencies.

```
Task 1: lock(A) -> await lock(B)
Task 2: lock(B) -> await lock(A)
```

**Remediation**:
- Strictly order global lock acquisition across all modules.
- Enforce acquisition timeouts (`tryLock(timeout)`).
- Avoid nested lock acquisitions entirely.

### 3. Starvation
Low-priority tasks remain continuously deferred because high-priority tasks monopolize execution resources.

**Remediation**: Fair scheduling queues, bounded worker pools, and rate limiting.

### 4. Goroutine & Task Leaks
Launching background concurrent routines without guaranteeing clean termination or cancellation signals.

```go
// ❌ Goroutine leak: channel read blocks forever if sender drops
func process() {
    ch := make(chan int)
    go func() {
        result := <-ch // Never unblocks if channel is not sent to
    }()
    // Function exits, but goroutine remains stranded in memory
}
```

```python
# ❌ Background task leak: unmonitored task outlives parent scope
async def process():
    task = asyncio.create_task(long_running())
    # Function returns, but task remains executing indefinitely
```

**Remediation**: Pass `context.Context` (Go), wrap in `asyncio.TaskGroup` (Python 3.11+), or use structured scopes (Kotlin/Swift).

### 5. Blocking the Event Loop in Async Runtimes
Invoking synchronous, blocking system calls inside cooperative single-threaded runtimes freezes all concurrent connections.

```python
# ❌ Blocking I/O freezes the entire asyncio event loop
async def handle():
    result = requests.get(url)  # Blocking! No other async task can execute
    return result

# ✅ Non-blocking async client
async def handle():
    async with httpx.AsyncClient() as client:
        return await client.get(url)

# ✅ Or offload blocking routine to thread pool
async def handle():
    return await asyncio.to_thread(requests.get, url)
```

```rust
// ❌ Synchronous filesystem blocking on Tokio worker thread
async fn handle() {
    let content = std::fs::read_to_string("large.txt");
}

// ✅ Offload to Tokio blocking thread pool
async fn handle() -> Result<String> {
    tokio::task::spawn_blocking(|| {
        std::fs::read_to_string("large.txt")
    }).await?
}
```

---

## Architectural Best Practices

### 1. Structured Concurrency
Ensure the lifetime of child tasks is strictly bounded by the parent scope. If the parent cancels or fails, all child tasks cancel automatically.

```kotlin
// ✅ Kotlin: coroutineScope guarantees child completion before exiting
suspend fun processItems(items: List<Item>) = coroutineScope {
    items.forEach { item ->
        launch { processItem(item) }
    }
}
```

```python
# ✅ Python 3.11+: TaskGroup cancels sibling tasks if one raises
async def process_items(items: list[Item]):
    async with asyncio.TaskGroup() as tg:
        for item in items:
            tg.create_task(process_item(item))
```

### 2. Cancellation Propagation
Propagate abort and cancellation tokens down through all child processes:

```go
// ✅ Go: context propagation with errgroup
func processAll(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)
    for _, item := range items {
        item := item
        g.Go(func() error {
            return processItem(ctx, item)
        })
    }
    return g.Wait() // First error cancels context for remaining routines
}
```

### 3. Backpressure Management
Prevent unbounded memory growth when producers outpace consumers using bounded buffers and flow control:

```go
// ✅ Go: Buffered channel acts as natural backpressure
func processStream(items <-chan Item) <-chan Result {
    results := make(chan Result, 10) // Fixed capacity buffer
    go func() {
        defer close(results)
        for item := range items {
            results <- processItem(item) // Blocks when buffer is full
        }
    }()
    return results
}
```

---

## Cross-Language Reference Implementations

### Go: Goroutines + Bounded Worker Semaphore

```go
func processBatch(ctx context.Context, items []Item) ([]Result, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]Result, len(items))
    sem := make(chan struct{}, 10) // Concurrency limit: 10

    for i, item := range items {
        i, item := i, item
        g.Go(func() error {
            select {
            case sem <- struct{}{}:
            case <-ctx.Done():
                return ctx.Err()
            }
            defer func() { <-sem }()

            res, err := process(ctx, item)
            if err != nil {
                return fmt.Errorf("item %d failed: %w", i, err)
            }
            results[i] = res
            return nil
        })
    }
    if err := g.Wait(); err != nil {
        return nil, err
    }
    return results, nil
}
```

### TypeScript: Bounded Worker Pool Pattern

```typescript
// ✅ Worker-pool pattern: fixed workers pull from shared queue
// Preserves original array indexing without spawning unbounded Promises
async function processWithLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}
```

### C#: Task Concurrency with SemaphoreSlim & Cancellation

```csharp
async Task<List<Result>> ProcessBatchAsync(
    List<Item> items,
    int maxConcurrent = 10,
    CancellationToken ct = default)
{
    using var semaphore = new SemaphoreSlim(maxConcurrent);
    var tasks = items.Select(async item =>
    {
        await semaphore.WaitAsync(ct);
        try
        {
            return await ProcessAsync(item, ct);
        }
        finally
        {
            semaphore.Release();
        }
    });

    var results = await Task.WhenAll(tasks);
    return results.ToList();
}
```

---

## Review Checklist

### Lifecycle & Resource Hygiene
- [ ] Concurrency tasks guarantee deterministic exit paths (zero orphan routines).
- [ ] Shared mutable state protected by mutexes, channels, or actor isolation.
- [ ] No synchronous, blocking I/O calls executed directly in async event loops.
- [ ] Cancellation signals (Context / CancellationToken / AbortSignal) propagated to all children.

### Structural Controls
- [ ] Structured concurrency scopes (TaskGroup / coroutineScope / errgroup) govern execution.
- [ ] Bounded concurrency limits (semaphores, worker pools) prevent resource exhaustion.
- [ ] Long-running operations enforce timeouts to prevent permanent hangs.
- [ ] Backpressure mechanisms guard producer-consumer queues against unbounded memory growth.

### Language-Specific Checks
- [ ] **Go**: Context passed as first argument; errgroup used for coordinated goroutines.
- [ ] **Python**: Event loop never blocks on synchronous requests; TaskGroup utilized.
- [ ] **Rust**: Blocking system calls dispatched to `tokio::task::spawn_blocking`.
- [ ] **Kotlin**: Correct `Dispatchers` selected (IO vs Default); structured scopes used.
- [ ] **TypeScript**: Concurrent executions wrapped with concurrency limiting helpers.
