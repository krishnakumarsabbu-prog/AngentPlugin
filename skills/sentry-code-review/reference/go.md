# Go Code Review Guide

> Production Go code review guide aligned with Effective Go, Go Code Review Comments, and official concurrency and error-handling best practices.

## Table of Contents

- [Quick Review Checklist](#quick-review-checklist)
- [Error Handling](#error-handling)
- [Concurrency & Goroutines](#concurrency--goroutines)
- [Context Propagation](#context-propagation)
- [Pointers vs Values](#pointers-vs-values)
- [Interfaces & Dependency Inversion](#interfaces--dependency-inversion)
- [Common Pitfalls & Hygiene](#common-pitfalls--hygiene)
- [Review Checklist](#review-checklist)

---

## Quick Review Checklist

### Critical Checks
- [ ] Errors explicitly checked and enriched with context (`fmt.Errorf("...: %w", err)`).
- [ ] Every goroutine has a deterministic exit condition (guards against leaks).
- [ ] `context.Context` accepted as the first parameter and propagated downstream.
- [ ] Mutexes guard shared mutable memory; zero race conditions.
- [ ] Code formatted strictly via standard `gofmt` or `goimports`.

---

## Error Handling

### 1. Never Ignore Returned Errors

```go
// ❌ Ignoring returned errors leads to silent cascading failures
result, _ := SomeFunction()

// ✅ Explicitly inspect error and wrap with contextual information
result, err := SomeFunction()
if err != nil {
    return nil, fmt.Errorf("calling SomeFunction: %w", err)
}
```

### 2. Error Wrapping and Sentinel Checks

```go
// ❌ %v drops the inner error chain, breaking errors.Is / errors.As
if err != nil {
    return fmt.Errorf("failed: %v", err)
}

// ✅ Use %w verb to preserve the nested error chain
if err != nil {
    return fmt.Errorf("processing user %d: %w", userID, err)
}

// ✅ Inspecting wrapped errors using errors.Is
if errors.Is(err, sql.ErrNoRows) {
    return nil, ErrNotFound
}

// ✅ Extracting structured errors via errors.As
var pathErr *os.PathError
if errors.As(err, &pathErr) {
    log.Printf("failed accessing path %s", pathErr.Path)
}
```

### 3. Handle Errors Exactly Once

```go
// ❌ Anti-pattern: Logging and returning creates duplicate noisy log trails
if err != nil {
    log.Printf("error: %v", err)
    return err
}

// ✅ Propagate wrapped error and let top-level middleware log
if err != nil {
    return fmt.Errorf("operation failed: %w", err)
}
```

---

## Concurrency & Goroutines

### Guard Against Goroutine Leaks

```go
// ❌ Channel write or read blocks permanently if no receiver is active
func bad() {
    ch := make(chan int)
    go func() {
        val := <-ch // Blocks permanently if channel is never sent to
        fmt.Println(val)
    }()
}

// ✅ Use context cancellation or a quit channel
func good(ctx context.Context) {
    ch := make(chan int)
    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-ctx.Done():
            return // Clean exit on context cancellation
        }
    }()
}
```

### Channel Ownership Rules

1. **The sender owns and closes the channel**: Never close a channel from the receiver side.
2. **Never send on a closed channel**: Panics immediately.
3. **Never send on a nil channel**: Blocks permanently.

```go
// ✅ Producer owns and closes channel
func producer(ch chan<- int) {
    defer close(ch)
    for i := 0; i < 10; i++ {
        ch <- i
    }
}

// Receiver ranges until closed
for val := range ch {
    process(val)
}
```

### `sync.WaitGroup` Calling Convention

```go
// ❌ Calling wg.Add(1) inside the spawned goroutine causes a race condition
var wg sync.WaitGroup
for i := 0; i < 10; i++ {
    go func() {
        wg.Add(1) // Race condition with wg.Wait()!
        defer wg.Done()
        work()
    }()
}
wg.Wait()

// ✅ Invoke wg.Add(1) in the parent thread before launching the goroutine
var wg sync.WaitGroup
for i := 0; i < 10; i++ {
    wg.Add(1)
    go func() {
        defer wg.Done()
        work()
    }()
}
wg.Wait()
```

---

## Context Propagation

### Context Must Be the First Parameter

```go
// ❌ Context placed as second parameter or stored inside a struct field
func Process(data []byte, ctx context.Context) error
type Service struct {
    ctx context.Context // Never store Context inside a struct!
}

// ✅ Context accepted as the first argument, named ctx
func Process(ctx context.Context, data []byte) error
```

---

## Pointers vs Values

### Receiver Type Selection Guidelines

- **Use Pointer Receivers (`*T`)**:
  - If the method modifies receiver state.
  - If the struct contains synchronization primitives (e.g. `sync.Mutex`).
  - If the struct is large and copying memory is costly.
- **Use Value Receivers (`T`)**:
  - If the struct is small, immutable, or a primitive type alias (e.g. `time.Time`).
  - **Consistency Rule**: Do not mix pointer and value receivers on the same type arbitrarily.

---

## Interfaces & Dependency Inversion

### Accept Interfaces, Return Concrete Structs

```go
// ❌ Declaring broad producer-side interfaces in consumer packages
package repository
type UserRepository interface { ... } // Do not export interface from implementation package!

// ✅ Declare consumer-side interfaces at the point of consumption
package service

type UserReader interface {
    FindUser(ctx context.Context, id string) (*User, error)
}

type UserService struct {
    repo UserReader
}
```

---

## Common Pitfalls & Hygiene

### Defer Inside Long Loops

```go
// ❌ Defer executes only when the enclosing function returns, not each loop iteration
for _, filename := range files {
    f, err := os.Open(filename)
    if err != nil { return err }
    defer f.Close() // File descriptors accumulate until function returns!
}

// ✅ Wrap iteration in an explicit closure to execute defer per file
for _, filename := range files {
    if err := func(name string) error {
        f, err := os.Open(name)
        if err != nil { return err }
        defer f.Close() // Closes immediately at end of closure
        return process(f)
    }(filename); err != nil {
        return err
    }
}
```

---

## Review Checklist

### Error Handling
- [ ] No discarded errors (`_ = ...`); all errors checked and propagated.
- [ ] Errors wrapped with `%w` verb to maintain error causality.
- [ ] Sentinel checks use `errors.Is`; type extractions use `errors.As`.

### Concurrency & Lifecycle
- [ ] Every goroutine has an explicit termination path tied to `ctx.Done()` or channel close.
- [ ] `sync.WaitGroup.Add()` called before `go` invocation.
- [ ] Senders close channels; receivers never close channels.
- [ ] Shared resources protected by `sync.Mutex` or `sync.RWMutex`.

### API & Structure
- [ ] `context.Context` accepted as first parameter (`ctx`).
- [ ] Interfaces defined at consumer packages; functions accept interfaces and return structs.
- [ ] `defer` inside loops isolated within helper functions.
