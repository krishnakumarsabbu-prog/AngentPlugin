# Universal Code Quality Anti-Patterns

> Language-agnostic code quality and anti-pattern guide covering code reuse, leaky abstractions, parameter bloat, nested conditionals, stringly-typed designs, TOCTOU race conditions, and no-op state updates. Applicable to all pull request reviews.

## Table of Contents

- [Code Reuse Review](#code-reuse-review)
- [Parameter Bloat](#parameter-bloat)
- [Leaky Abstractions](#leaky-abstractions)
- [Stringly-Typed Code](#stringly-typed-code)
- [Nested Conditionals](#nested-conditionals)
- [Copy-Paste Variations](#copy-paste-variations)
- [No-op Updates](#no-op-updates)
- [TOCTOU Race Conditions](#toctou-race-conditions)
- [Overly Broad Operations](#overly-broad-operations)
- [Redundant State](#redundant-state)
- [Universal Quality Review Checklist](#universal-quality-review-checklist)

---

## Code Reuse Review

Before accepting new code, verify whether the repository already contains reusable helpers or standard utilities.

### Search for Existing Utility Functions

```python
# ❌ Re-implementing path concatenation when PathBuilder already exists
def get_config_path(name):
    base = os.environ.get("APP_ROOT", ".")
    return os.path.join(base, "config", name + ".json")

# ✅ Reusing the existing project PathBuilder
def get_config_path(name):
    return PathBuilder.config(f"{name}.json")
```

```javascript
// ❌ Handcrafted debounce when lodash or utils/debounce.ts is available
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ✅ Reusing established utility module
import { debounce } from "@/utils/debounce";
```

**Review Checklist:**
- Does the new helper duplicate an existing utility in `shared/` or `utils/`?
- Can inline logic be consolidated into an existing module?
- Check adjacent modules and core libraries before approving reinventions.

---

## Parameter Bloat

### Continuous Parameter List Expansion

```python
# ❌ Expanding positional parameters with every new requirement
def create_user(name, email, role, team, active, avatar_url, timezone):
    ...

# ✅ Grouping parameters into a structured configuration / dataclass
@dataclass
class CreateUserParams:
    name: str
    email: str
    role: Role = Role.MEMBER
    team: str | None = None
    active: bool = True
    avatar_url: str | None = None
    timezone: str = "UTC"

def create_user(params: CreateUserParams) -> User:
    ...
```

```typescript
// ❌ 6+ positional parameters prone to misordered arguments
function renderWidget(
  title: string, width: number, height: number,
  theme: string, collapsible: boolean, icon: string
) { ... }

// ✅ Options object pattern with defaults and clear keys
interface WidgetOptions {
  title: string;
  width?: number;
  height?: number;
  theme?: "light" | "dark";
  collapsible?: boolean;
  icon?: string;
}
function renderWidget(options: WidgetOptions) { ... }
```

**Review Checklist:**
- Does the function accept ≥ 4 positional arguments? Recommend an options object or dataclass.
- Are new parameters just boolean flags? Consider an enum, bitflags, or a strategy pattern.
- Are there mutually exclusive parameters such as `enable_x` and `disable_y`?

---

## Leaky Abstractions

### Exposing Internal Implementation Details

```python
# ❌ Returning internal ORM entity — forces callers to depend on SQLAlchemy
def get_users():
    return session.query(User).filter(User.active == True).all()

# ✅ Returning domain DTOs to decouple persistence mechanics
def get_active_users() -> list[UserDTO]:
    rows = user_repo.find_active()
    return [UserDTO.from_row(r) for r in rows]
```

```typescript
// ❌ Component binds directly to raw third-party API response
<UserCard user={apiResponse.data.results[0]} />

// ✅ Component accepts clean domain interface; adapter handles transformation
interface UserSummary {
  displayName: string;
  avatarUrl: string;
}
<UserCard user={adaptUser(apiResponse)} />
```

**Review Checklist:**
- Does the return type leak database models, HTTP client handles, or raw file descriptors?
- Are UI components tightly bound to backend wire formats?
- Are domain boundaries strictly preserved across service layers?

---

## Stringly-Typed Code

### Raw Strings in Place of Enumerations or Constrained Literals

```python
# ❌ Magic strings scattered across files
if status == "active":
    ...
if role == "admin":
    ...

# ✅ Constrained enumeration
class Status(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    ARCHIVED = "archived"

if user.status == Status.ACTIVE:
    ...
```

```typescript
// ❌ Raw string event identifiers — typos cause silent runtime failures
emitter.emit("userCreated", data);
emitter.on("usercreated", handler); // bug: typo fails silently

// ✅ Const-asserted dictionary or string union types
const Events = {
  USER_CREATED: "userCreated",
  USER_SUSPENDED: "userSuspended",
} as const;
type EventType = typeof Events[keyof typeof Events];

emitter.emit(Events.USER_CREATED, data);
```

**Review Checklist:**
- Are raw strings used where an enum or union type is appropriate?
- Are event names, route targets, and status codes centralized or fragmented?
- Are case-sensitive string comparisons validated at domain boundaries?

---

## Nested Conditionals

### Ternary Chains and Deep If/Else Trees

```python
# ❌ Hard-to-read chained ternary expressions
label = (
    "Admin" if role == "admin" else
    "Manager" if role == "manager" else
    "Viewer" if role == "viewer" else
    "Unknown"
)

# ✅ Lookup table or pattern matching
ROLE_LABELS = {
    "admin": "Admin",
    "manager": "Manager",
    "viewer": "Viewer",
}
label = ROLE_LABELS.get(role, "Unknown")
```

```typescript
// ❌ Nested ternary pyramid
const bg = isHovered
  ? isSelected ? "blue" : "gray"
  : isSelected ? "navy" : "white";

// ✅ Deterministic lookup map
const bgMap: Record<string, string> = {
  "true-true": "blue",
  "true-false": "gray",
  "false-true": "navy",
  "false-false": "white",
};
const bg = bgMap[`${isHovered}-${isSelected}`];
```

```python
# ❌ 3+ levels of nested if statements (Arrow Anti-Pattern)
def process(order):
    if order is not None:
        if order.items:
            for item in order.items:
                if item.price > 0:
                    ...

# ✅ Early returns and guard clauses
def process(order):
    if not order or not order.items:
        return
    for item in order.items:
        if item.price <= 0:
            continue
        ...
```

**Review Checklist:**
- Are ternary expressions nested ≥ 2 levels?
- Is cyclomatic indentation ≥ 3 levels? Flatten with guard clauses.
- Can complex branching be replaced with a dictionary lookup or pattern match?

---

## Copy-Paste Variations

### Near-Duplicate Code Blocks

```python
# ❌ Near-duplicate formatting routines differing only by field name
def format_user(user):
    return f"{user.first_name} {user.last_name} ({user.email})"

def format_employee(emp):
    return f"{emp.first_name} {emp.last_name} ({emp.work_email})"

# ✅ Generalized abstraction
def format_person(first: str, last: str, email: str) -> str:
    return f"{first} {last} ({email})"
```

```typescript
// ❌ Copy-pasted delete handlers with only the endpoint changed
async function deletePost(id: string) {
  await fetch(`/api/posts/${id}`, { method: "DELETE" });
  router.push("/posts");
}
async function deleteComment(id: string) {
  await fetch(`/api/comments/${id}`, { method: "DELETE" });
  router.push("/comments");
}

// ✅ Parameterized reusable handler
async function deleteResource(resource: string, id: string) {
  await fetch(`/api/${resource}/${id}`, { method: "DELETE" });
  router.push(`/${resource}`);
}
```

**Review Checklist:**
- Do two or more routines share structure with only identifiers changed?
- Can common execution logic be parameterized?
- Consider template methods or higher-order functions to eliminate duplication.

---

## No-op Updates

### Unconditional State Mutations

```typescript
// ❌ Polling hook triggers state re-render even when data is unchanged
useEffect(() => {
  const interval = setInterval(() => {
    fetch("/api/status").then(r => r.json()).then(setStatus);
  }, 5000);
  return () => clearInterval(interval);
}, []);

// ✅ Only trigger updates when payload actually changes
useEffect(() => {
  const interval = setInterval(() => {
    fetch("/api/status")
      .then(r => r.json())
      .then(data => {
        setStatus(prev => isEqual(prev, data) ? prev : data);
      });
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

```python
# ❌ Commits database write on every iteration even if fields are identical
for item in items:
    item.status = compute_status(item)
    session.commit()

# ✅ Guard check avoids unnecessary I/O and audit logs
for item in items:
    new_status = compute_status(item)
    if item.status != new_status:
        item.status = new_status
        session.commit()
```

**Review Checklist:**
- Do polling intervals or event listeners execute blind state setters?
- Does database write logic check for actual field changes before committing?
- Does wrapper logic preserve referential identity for unchanged outputs?

---

## TOCTOU Race Conditions

### Time-of-Check to Time-of-Use

```python
# ❌ Separate check followed by use — file can be deleted or replaced concurrently
if os.path.exists(path):
    with open(path) as f:
        data = f.read()

# ✅ Atomic operation with exception handling (EAFP)
try:
    with open(path) as f:
        data = f.read()
except FileNotFoundError:
    data = None
```

```python
# ❌ Balance check and withdrawal are not atomic
if account.balance >= amount:
    account.balance -= amount

# ✅ Atomic transaction or mutex lock
with account.lock:
    if account.balance < amount:
        raise InsufficientFundsError()
    account.balance -= amount
```

```typescript
// ❌ Check-then-act pattern is vulnerable in async runtime
if (!fileExists(path)) {
  await writeFile(path, content);
}

// ✅ Atomic write with exclusive flag
try {
  await writeFile(path, content, { flag: "wx" });
} catch (e: any) {
  if (e.code === "EEXIST") {
    // Handle expected collision
  } else {
    throw e;
  }
}
```

**Review Checklist:**
- Can an `if exists -> execute` check be refactored into atomic `try -> catch`?
- Are multi-step mutations protected by a database transaction or lock?
- Does an async operation yield between checking conditions and applying mutations?

---

## Overly Broad Operations

### Reading Excessive Data from Storage

```python
# ❌ Loading entire file into memory just to read the first line
content = Path("log.txt").read_text()
first_line = content.split("\n")[0]

# ✅ Streaming the first line without buffering the entire file
with open("log.txt") as f:
    first_line = f.readline()
```

```typescript
// ❌ Fetching entire table to filter in application memory
const allItems = await db.query("SELECT * FROM orders");
const pending = allItems.filter(o => o.status === "pending");

// ✅ Pushing filtering down to the database engine
const pending = await db.query(
  "SELECT * FROM orders WHERE status = ?", ["pending"]
);
```

```python
# ❌ Evaluating full query set to find one item
users = list(User.objects.all())
user = next(u for u in users if u.id == user_id)

# ✅ Targeted indexed query
user = User.objects.get(id=user_id)
```

**Review Checklist:**
- Does code load complete collections or files into RAM to inspect a slice?
- Is filtering pushed down to the database or storage layer?
- Do list endpoints and API calls enforce pagination and limits?

---

## Redundant State

### Storing Derivable Values

```typescript
// ❌ Storing both parts and derived full name
interface User {
  firstName: string;
  lastName: string;
  fullName: string;  // Redundant and risks desync
}

// ✅ Deriving value on demand
interface User {
  firstName: string;
  lastName: string;
}
const fullName = `${user.firstName} ${user.lastName}`;
```

```python
# ❌ Caching computed totals without automatic invalidation
class Order:
    total: float
    item_count: int       # Redundant with len(items)
    items: list[Item]

# ✅ Deriving via property accessor
class Order:
    items: list[Item]

    @property
    def total(self) -> float:
        return sum(item.price for item in self.items)

    @property
    def item_count(self) -> int:
        return len(self.items)
```

**Review Checklist:**
- Can stored fields be computed deterministically from existing state?
- If caching computed fields, is there an explicit invalidation mechanism?
- Can reactive effects or observers be eliminated in favor of getters or pure derivation?

---

## Universal Quality Review Checklist

- [ ] **Reuse**: Verified existing utility modules; avoided duplicate helpers.
- [ ] **Parameters**: Functions take ≤ 3 arguments; complex parameters grouped into objects.
- [ ] **Abstraction**: Internal database, network, and file handles never cross service seams.
- [ ] **Typing**: Eliminated magic strings; enforced enums or union literals.
- [ ] **Complexity**: Flattened nested conditionals with early returns and guard clauses.
- [ ] **DRY**: Refactored copy-paste variations into shared, parameterized helpers.
- [ ] **Guards**: Polling and events guard against redundant, no-op state updates.
- [ ] **Concurrency**: Replaced check-then-act with atomic operations to prevent TOCTOU bugs.
- [ ] **Efficiency**: Filtered and paginated queries at the persistence tier instead of in memory.
- [ ] **State**: Derived secondary data instead of storing synchronized duplicates.
