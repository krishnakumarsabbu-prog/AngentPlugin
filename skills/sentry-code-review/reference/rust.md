# Rust Code Review Guide

> Production Rust code review guide. While the rustc borrow checker guarantees memory safety, code reviews focus on concerns beyond compiler enforcement: domain logic invariants, API ergonomics, unnecessary allocations, cancellation safety, and unsafe blocks.

## Table of Contents

- [Ownership & Borrowing](#ownership--borrowing)
- [Unsafe Block Verification](#unsafe-block-verification)
- [Asynchronous Rust & Tokio](#asynchronous-rust--tokio)
- [Cancellation Safety in `tokio::select!`](#cancellation-safety-in-tokioselect)
- [Spawn vs Direct Await](#spawn-vs-direct-await)
- [Error Handling (`thiserror` vs `anyhow`)](#error-handling-thiserror-vs-anyhow)
- [Performance & Memory Allocation](#performance--memory-allocation)
- [Trait Design Guidelines](#trait-design-guidelines)
- [Review Checklist](#review-checklist)

---

## Ownership & Borrowing

### Eliminate Unnecessary `.clone()` Calls

```rust
// ❌ Using .clone() defensively to bypass borrow checker constraints
fn bad_process(data: &Data) -> Result<()> {
    let owned = data.clone(); // Unnecessary heap allocation
    expensive_operation(owned)
}

// ✅ Pass borrowed references whenever ownership transfer is not required
fn good_process(data: &Data) -> Result<()> {
    expensive_operation(data)
}

// ✅ Document explicitly when a clone is strictly necessary (e.g. crossing thread boundaries)
fn justified_clone(data: &Data) -> Result<()> {
    // Clone required: data is moved into a detached Tokio task
    let owned = data.clone();
    tokio::spawn(async move {
        process(owned).await
    });
    Ok(())
}
```

### Optimize Strings via `Cow<'_, str>`

```rust
use std::borrow::Cow;

// ❌ Allocating a new String on every branch
fn bad_process_name(name: &str) -> String {
    if name.is_empty() {
        "Unknown".to_string() // Allocation
    } else {
        name.to_string()      // Unnecessary allocation
    }
}

// ✅ Cow (Copy-on-Write) borrows static data and only allocates when mutated
fn good_process_name(name: &str) -> Cow<'_, str> {
    if name.is_empty() {
        Cow::Borrowed("Unknown")
    } else {
        Cow::Borrowed(name)
    }
}
```

---

## Unsafe Block Verification

### Mandatory Invariant Documentation

Every `unsafe` block must be accompanied by an explicit `// SAFETY:` comment justifying why memory safety is preserved:

```rust
// ❌ Undocumented unsafe block
unsafe {
    *ptr = 42;
}

// ✅ Mandatory // SAFETY: documentation proving pointer validity and non-aliasing
// SAFETY: The pointer was obtained from a valid Box::into_raw, is aligned,
// non-null, and no concurrent references exist at this execution point.
unsafe {
    *ptr = 42;
}
```

---

## Asynchronous Rust & Tokio

### Cancellation Safety in `tokio::select!`

In `tokio::select!`, when one branch completes, all other pending branch futures are dropped immediately. If a future holds partially-mutated state, dropping it can lead to data loss or broken protocol states.

```rust
// ❌ NOT cancellation-safe: read_exact drops buffer halfway through stream read
tokio::select! {
    res = stream.read_exact(&mut buf) => { ... },
    _ = cancel_rx.recv() => { return; } // Discards partially read bytes!
}

// ✅ Cancellation-safe pattern: Read into framing buffer incrementally
tokio::select! {
    res = frame_reader.next_frame() => { ... },
    _ = cancel_rx.recv() => { return; }
}
```

### Blocking System Calls Must Use `spawn_blocking`

```rust
// ❌ Blocking system call freezes Tokio worker thread
async fn handle() {
    let content = std::fs::read_to_string("config.json").unwrap();
}

// ✅ Offload blocking calls to dedicated thread pool
async fn handle() -> Result<String> {
    tokio::task::spawn_blocking(|| {
        std::fs::read_to_string("config.json")
    }).await?
}
```

---

## Error Handling (`thiserror` vs `anyhow`)

- **Libraries & Reusable Crates**: Use `thiserror` to define typed, structured enums.
- **Application Binaries & Services**: Use `anyhow::Result<T>` with `.context()` for rich callstack diagnostics.

```rust
// ✅ Application layer error propagation with context
use anyhow::{Context, Result};

async fn load_config(path: &Path) -> Result<Config> {
    let raw = tokio::fs::read_to_string(path)
        .await
        .with_context(|| format!("Failed to read configuration at {}", path.display()))?;

    toml::from_str(&raw)
        .with_context(|| format!("Invalid TOML syntax in {}", path.display()))
}
```

---

## Review Checklist

### Ownership & Safety
- [ ] No superfluous `.clone()` calls; references preferred where feasible.
- [ ] Every `unsafe` block documented with a formal `// SAFETY:` comment proving validity.
- [ ] Concurrency locks (`Mutex`, `RwLock`) held across the minimum scope possible.

### Asynchronous Correctness
- [ ] Futures inside `tokio::select!` evaluated for cancellation safety.
- [ ] Blocking I/O or heavy CPU algorithms offloaded to `tokio::task::spawn_blocking`.
- [ ] Standard library `std::sync::Mutex` never held across `.await` points (use `tokio::sync::Mutex` or restructure).

### Errors & API Design
- [ ] Library crates expose typed error enums via `thiserror`; applications use `anyhow::Context`.
- [ ] `Cow<'_, str>` leveraged to avoid allocations when returning borrowed slices.
- [ ] Traits follow object-safety rules (`dyn Trait`) when dynamic dispatch is intended.
