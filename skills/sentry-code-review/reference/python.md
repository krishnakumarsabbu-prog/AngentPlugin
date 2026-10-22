# Python Code Review Guide

> Production Python code review guide covering type annotations, modern async/await patterns (Python 3.11+ TaskGroup, cancellation), error handling, mutable default traps, pytest standards, and performance optimization.

## Table of Contents

- [Type Annotations & Modern Typing](#type-annotations--modern-typing)
- [Asynchronous Programming](#asynchronous-programming)
- [Exception Handling & Resilience](#exception-handling--resilience)
- [Common Python Pitfalls](#common-python-pitfalls)
- [Testing Standards (pytest)](#testing-standards-pytest)
- [Performance & Memory Optimization](#performance--memory-optimization)
- [Review Checklist](#review-checklist)

---

## Type Annotations & Modern Typing

### Modern Syntax & Precise Signatures

```python
# ❌ Untyped function — lacks IDE inspection and static analysis validation
def process_data(data, count):
    return data[:count]

# ✅ Modern Python 3.10+ union and built-in generic annotations
def process_data(data: str, count: int) -> str:
    return data[:count]

def find_user(user_id: int) -> User | None:
    return db.get(user_id)

def handle_input(value: str | int) -> str:
    return str(value)
```

### Generic Functions with `TypeVar`

```python
from typing import TypeVar, Sequence

T = TypeVar('T')

# ✅ Generic first-element accessor preserving element type
def first(items: Sequence[T]) -> T | None:
    return items[0] if items else None
```

### Structural Typing with `Protocol`

```python
from typing import Protocol, runtime_checkable

# ✅ Duck-typed interface definition
@runtime_checkable
class Renderable(Protocol):
    def render(self) -> str: ...

def display(component: Renderable) -> None:
    print(component.render())
```

---

## Asynchronous Programming

### Avoid Blocking Calls Inside the Async Event Loop

```python
# ❌ Synchronous I/O freezes the entire asyncio event loop
async def fetch_data(url: str) -> str:
    return requests.get(url).text # Freezes all concurrent async tasks!

# ✅ Native non-blocking HTTP client
async def fetch_data(url: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.text

# ✅ Offload blocking CPU or legacy I/O to a background worker thread
async def execute_blocking(data: bytes) -> str:
    return await asyncio.to_thread(cpu_heavy_computation, data)
```

### Structured Concurrency via `asyncio.TaskGroup` (Python 3.11+)

```python
# ❌ Detached tasks without guaranteed lifecycle or cancellation propagation
tasks = [asyncio.create_task(fetch(u)) for u in urls]
results = await asyncio.gather(*tasks) # Swallows intermediate cancellation cleanly

# ✅ TaskGroup cancels sibling tasks immediately if one raises an unhandled exception
async def fetch_all(urls: list[str]) -> list[str]:
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch(u)) for u in urls]
    return [t.result() for t in tasks]
```

### Graceful Cancellation Handling

```python
async def worker():
    try:
        while True:
            await process_next()
    except asyncio.CancelledError:
        await teardown_resources()
        raise # Must re-raise CancelledError to acknowledge cancellation!
```

---

## Exception Handling & Resilience

### Prohibit Bare `except:` or Catching `Exception` Blindly

```python
# ❌ Swallows KeyboardInterrupt, SystemExit, and programming bugs
try:
    execute_action()
except:
    pass

# ✅ Targeted exception capture with explicit logging
try:
    execute_action()
except (ConnectionError, TimeoutError) as exc:
    logger.warning("Transient network failure: %s", exc)
    raise ServiceUnavailableError("Upstream service unreachable") from exc
```

### Explicit Exception Chaining via `raise ... from`

```python
try:
    record = database.find(entity_id)
except DBRecordNotFound as exc:
    # ✅ Chains root cause for complete traceback inspection
    raise EntityNotFoundError(f"Entity {entity_id} missing") from exc
```

---

## Common Python Pitfalls

### 1. Mutable Default Arguments

```python
# ❌ Mutable list/dict as default argument is evaluated ONCE at module import
def append_item(item: str, target: list[str] = []) -> list[str]:
    target.append(item)
    return target # Shared across all invocations!

# ✅ Use None sentinel with dynamic initialization
def append_item(item: str, target: list[str] | None = None) -> list[str]:
    if target is None:
        target = []
    target.append(item)
    return target
```

### 2. Late-Binding Closures in Loops

```python
# ❌ Closures bind variable by reference, all lambdas see the final value of i
handlers = [lambda: i for i in range(5)]
# [h() for h in handlers] == [4, 4, 4, 4, 4]

# ✅ Bind current value as default argument in function signature
handlers = [lambda i=i: i for i in range(5)]
# [h() for h in handlers] == [0, 1, 2, 3, 4]
```

---

## Testing Standards (pytest)

### Prefer Pure Fixtures Over Global State

```python
# ✅ Isolated, scoped pytest fixture
import pytest

@pytest.fixture
def test_client(db_session):
    client = TestClient(app)
    yield client
    client.close()

def test_user_creation(test_client):
    res = test_client.post("/users", json={"name": "Alice"})
    assert res.status_code == 201
```

---

## Performance & Memory Optimization

### Use Generators for Large Data Streams

```python
# ❌ Loading millions of records into memory at once
def load_records():
    return [parse(line) for line in open("huge.log")] # Out of Memory!

# ✅ Generator streams records one at a time
def stream_records():
    with open("huge.log") as f:
        for line in f:
            yield parse(line)
```

---

## Review Checklist

### Typing & Invariants
- [ ] Functions provide input and return type annotations.
- [ ] Optional values explicitly annotated as `Type | None`.
- [ ] No mutable default arguments (`def fn(arg=[])`).

### Asynchronous Execution
- [ ] No synchronous, blocking calls inside async functions (`requests.get`, `time.sleep`).
- [ ] Concurrent operations structured with `asyncio.TaskGroup`.
- [ ] `CancelledError` properly caught, cleaned up, and re-raised.

### Error Handling & Testing
- [ ] No bare `except:` or silent swallowing of exceptions.
- [ ] Exception chaining applied via `raise NewError(...) from original_exc`.
- [ ] Pytest fixtures manage setup and teardown cleanly with `yield`.
