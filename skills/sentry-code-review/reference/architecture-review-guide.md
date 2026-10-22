# Architecture Review Guide

Architecture design review guide to evaluate modularity, maintainability, architectural boundaries, and design patterns across complex codebases.

## SOLID Principles Checklist

### S — Single Responsibility Principle (SRP)

**Review Criteria:**
- Does this class or module have only one reason to change?
- Do all member methods serve a single coherent purpose?
- Can the responsibility of this class be summarized accurately in one concise sentence without "and"?

**Code Smell Signals:**
```
⚠️ Generic naming with "And", "Manager", "Handler", "Processor", or "Helper"
⚠️ Class size exceeding 200–300 lines of implementation logic
⚠️ More than 5–7 unrelated public methods exposed
⚠️ Distinct methods operating on completely disjoint sets of instance data
```

**Review Inquiries:**
- "What distinct roles does this class fulfill? Can it be decomposed into dedicated specialists?"
- "If business requirement X evolves, which methods change? What if requirement Y evolves?"

### O — Open/Closed Principle (OCP)

**Review Criteria:**
- Can new behaviors or feature types be introduced without mutating existing production code?
- Is behavior extension achieved through composition, polymorphism, or dependency injection?
- Are there cascading `if/else` or `switch` statements branching on explicit type discriminators?

**Code Smell Signals:**
```
⚠️ Giant switch or if-else ladders discriminating on type strings or enum variants
⚠️ Adding a new entity type requires modifying core orchestrator classes
⚠️ Dynamic runtime type inspections (instanceof, typeof, is_a) scattered through domain logic
```

**Review Inquiries:**
- "To add a new payment gateway or export format, how many existing files must be modified?"
- "Will this switch statement grow indefinitely as more subtypes are introduced?"

### L — Liskov Substitution Principle (LSP)

**Review Criteria:**
- Can any derived class substitute for its base interface without breaking consumer expectations?
- Does the subtype alter or weaken the preconditions or postconditions defined by the parent contract?
- Does the derived class throw unexpected runtime exceptions undeclared by the parent contract?

**Code Smell Signals:**
```
⚠️ Explicit downcasting or type assertions on interface types
⚠️ Subtype methods throwing NotImplementedException or UnsupportedOperationException
⚠️ Subtype methods implemented as no-op stubs or returning dummy values
⚠️ Callers needing to check runtime type before calling inherited methods
```

**Review Inquiries:**
- "If we swap the base implementation with this new derived class, does any consumer code break?"
- "Does this override fulfill the behavioral contract promised by the base interface?"

### I — Interface Segregation Principle (ISP)

**Review Criteria:**
- Are interfaces small, focused, and cohesive rather than broad?
- Are implementers forced to provide stubbed implementations for methods they never use?
- Do client modules depend on contract methods they never invoke?

**Code Smell Signals:**
```
⚠️ Interfaces exposing more than 5–7 public methods
⚠️ Implementing classes containing empty no-op methods or throwing NotImplementedError
⚠️ Overly broad interface names like `IManager` or `IGlobalService`
⚠️ Different consumer classes using strictly disjoint subsets of the same interface
```

**Review Inquiries:**
- "Are all methods on this interface actively consumed by all implementations?"
- "Can this broad interface be split into role-specific, focused contracts?"

### D — Dependency Inversion Principle (DIP)

**Review Criteria:**
- Do high-level business modules depend on abstractions rather than low-level concrete implementations?
- Are dependencies injected via constructor arguments rather than instantiated with direct `new` operators?
- Are interface abstractions defined and owned by the calling layer rather than the infrastructure provider?

**Code Smell Signals:**
```
⚠️ High-level domain entities directly instantiating low-level database, HTTP, or filesystem classes
⚠️ Importing concrete vendor SDK classes directly into business rule handlers
⚠️ Connection strings and infrastructure details hardcoded into domain business logic
⚠️ High friction or impossibility when writing unit tests without spinning up real databases
```

**Review Inquiries:**
- "Can this dependency be easily replaced with an in-memory mock or stub during testing?"
- "If we migrate database engines or messaging brokers, how much domain code is affected?"

---

## Architectural Anti-Patterns

### Critical Structural Anti-Patterns

| Anti-Pattern | Diagnostic Indicators | Architectural Impact |
|---|---|---|
| **Big Ball of Mud** | Absence of modular boundaries; any module directly imports or mutates any other | Severe maintenance friction; impossible isolation or independent deployment |
| **God Object** | A monolithic class centralizing state and orchestrating disproportionate system behavior | Massive coupling; high regression risk on every commit |
| **Spaghetti Code** | Tangled execution paths, unpredictable state mutations, and deep nested control flow | High cognitive load; steep bug density |
| **Lava Flow** | Untouchable legacy code with unknown side-effects, preserved out of fear | Rapid accumulation of permanent technical debt |

### Design & Solution Anti-Patterns

| Anti-Pattern | Diagnostic Indicators | Recommended Remedy |
|---|---|---|
| **Golden Hammer** | Universal application of a single tool/pattern regardless of domain fit | Choose purpose-fit solutions according to workload requirements |
| **Over-Engineering (Gas Factory)** | Trivial problems solved with complex layers of indirection and unnecessary design patterns | Apply YAGNI; favor simple direct solutions until complexity demands abstraction |
| **Boat Anchor** | Speculative code authored for hypothetical future requirements | Delete dead code; implement features when requirements are concrete |
| **Copy-Paste Architecture** | Duplicate algorithms and business rules repeated across services or modules | Abstract common behaviors into shared libraries or utility modules |

### Review Comment Framing

```markdown
🔴 [blocking] "This single controller file contains 2,200 lines and mixes HTTP parsing, database SQL, and business calculations. Decompose into Controller, Service, and Repository layers."
🟡 [important] "This pricing logic is duplicated across 3 separate handlers. Extract into a shared PricingStrategy service."
💡 [suggestion] "This cascading switch block could use the Strategy pattern to allow new payment providers to be added without modifying this class."
```

---

## Coupling & Cohesion Analysis

### Spectrum of Coupling (Best to Worst)

| Coupling Type | Evaluation | Description | Concrete Example |
|---|---|---|---|
| **Message Coupling** | ✅ Optimal | Components communicate strictly via explicit parameters or messages | `calculateTax(subtotal, rate)` |
| **Data Coupling** | ✅ Good | Components share simple, strongly-typed data structures | `processOrder(orderDto)` |
| **Stamp Coupling** | ⚠️ Moderate | Passing large composite structures when only 1–2 fields are needed | Passing entire `UserProfile` when only `email` is needed |
| **Control Coupling** | ⚠️ Risky | Passing flags or booleans that dictate internal control flow of the callee | `exportReport(data, isPdf=true, sendEmail=false)` |
| **Common Coupling** | ❌ Harmful | Modules read and write shared global state or mutable singleton registries | Multiple services mutating `window.appState` |
| **Content Coupling** | ❌ Destructive | One module directly accesses or modifies another module's private internals | Monkey-patching internal methods or accessing private fields |

### Spectrum of Cohesion (Best to Worst)

| Cohesion Type | Quality | Description |
|---|---|---|
| **Functional Cohesion** | ✅ Best | Every element in the module contributes directly to a single well-defined task |
| **Sequential Cohesion** | ✅ Good | The output of one step serves directly as input to the immediate next step |
| **Communicational Cohesion** | ⚠️ Acceptable | Different operations execute against the same underlying data set |
| **Temporal Cohesion** | ⚠️ Poor | Tasks are bundled purely because they execute around the same time (e.g., startup routines) |
| **Logical Cohesion** | ❌ Fragile | Operations are grouped by category (e.g., `GeneralUtilities`) but differ in function |
| **Coincidental Cohesion** | ❌ Worst | Elements have no meaningful technical or domain relationship |

### Quantitative Architectural Metrics

```yaml
Coupling Metrics:
  CBO (Coupling Between Object Classes):
    Optimal: < 5
    Warning: 5 - 10
    Excessive: > 10

  Ce (Efferent Coupling):
    Description: Number of external classes this module depends upon (outgoing)
    Optimal: < 7

  Ca (Afferent Coupling):
    Description: Number of external classes that depend upon this module (incoming)
    Significance: High Ca indicates a core system dependency; requires high stability

Cohesion Metrics:
  LCOM4 (Lack of Cohesion in Methods):
    1: Strong single responsibility ✅
    2 - 3: Warning, candidate for modular split ⚠️
    > 3: Deficient cohesion, mandatory refactoring required ❌
```

---

## Layered & Clean Architecture Boundaries

### Clean Architecture Onion Model

```
┌─────────────────────────────────────────┐
│          Frameworks & Drivers           │ ← Outer Layer: Web Framework, DB, UI, CLI
├─────────────────────────────────────────┤
│           Interface Adapters            │ ← Controllers, Gateways, Presenters, Serializers
├─────────────────────────────────────────┤
│            Application Layer            │ ← Use Cases, Orchestration, Workflows
├─────────────────────────────────────────┤
│              Domain Layer               │ ← Pure Entities, Business Rules, Value Objects
└─────────────────────────────────────────┘
          ↑ Dependency Rule: Inward Only ↑
```

### The Dependency Rule

**Core Invariant: Source code dependencies must only point inward toward higher-level policies.**

```typescript
// ❌ Anti-pattern: Domain entity imports concrete infrastructure driver
// domain/User.ts
import { MySQLConnection } from '../infrastructure/database';

// ✅ Best practice: Domain defines abstract repository interface; Infrastructure implements it
// domain/UserRepository.ts (Port)
export interface UserRepository {
  findById(id: string): Promise<User | null>;
}

// infrastructure/MySQLUserRepository.ts (Adapter)
import { UserRepository } from '../domain/UserRepository';

export class MySQLUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    /* Database implementation */
  }
}
```

### Layer Boundary Checklist

- [ ] Does the Domain layer remain free from third-party framework, DB, or HTTP library imports?
- [ ] Does the Application layer access persistence solely through repository interfaces?
- [ ] Are HTTP Controllers restricted to input validation, routing, and response formatting (no business rules)?
- [ ] Are cross-layer shortcuts avoided (e.g., UI directly executing raw SQL queries)?
- [ ] Is business domain state protected from presentation leakage?

---

## Design Pattern Governance

### When to Apply Established Patterns

| Pattern | Appropriate Use Case | Premature / Misguided Use Case |
|---|---|---|
| **Factory** | Creation logic involves complex conditional instantiation resolved at runtime | Constructing a single static class with fixed constructor arguments |
| **Strategy** | Swappable algorithmic behavior selected at runtime (e.g., compression algorithms) | A fixed algorithm with no anticipated variations |
| **Observer / Pub-Sub** | Decoupled one-to-many state notifications where publishers must not know subscribers | Simple synchronous method invocations between paired classes |
| **Singleton** | Managing an expensive, stateless or globally synchronized hardware/config handle | Shared mutable global state hiding hidden dependencies |
| **Decorator** | Dynamically appending cross-cutting responsibilities (logging, caching) without class explosion | Static behaviors better served by standard method composition |

### Warning Signs of Patternitis (Over-Engineering)

```
⚠️ Warning Signs of Over-Engineered Architecture:

1. A simple if-condition replaced with AbstractFactory + Strategy + Registry boilerplate
2. Interfaces with exactly one implementation across the entire system lifecycle
3. Speculative intermediate wrapper classes that do nothing except pass arguments through
4. Excessive indirection requiring navigation through 6 files to locate one line of business logic
5. Rapidly inflating codebase size without corresponding functional value
```

---

## Scalability & Extensibility Evaluation

### Extensibility Checklist

**Functional Extensibility:**
- [ ] Can new business features be plugged in via hooks, events, or strategy registries?
- [ ] Are environment-specific variables and credentials externalized into environment configuration?
- [ ] Are API contracts versioned to prevent breaking legacy consumers?

**Data & Storage Extensibility:**
- [ ] Can database schema models accommodate future attribute growth without destructive alterations?
- [ ] Are historical and analytical datasets partitioned to support volume expansion?
- [ ] Do write paths avoid unbounded row lock contention?

**Horizontal Scalability:**
- [ ] Are application services completely stateless to allow trivial multi-instance horizontal scaling?
- [ ] Is session state stored in distributed backing stores (e.g., Redis) rather than in-process memory?
- [ ] Are database connection pools sized appropriately to handle burst concurrency?

### Extension Point Design

```typescript
// ✅ Best practice: Extensible lifecycle hooks via middleware or event dispatch
class OrderService {
  constructor(private readonly hooks: OrderHooks, private readonly repo: OrderRepository) {}

  async createOrder(order: Order): Promise<OrderResult> {
    await this.hooks.beforeCreate?.(order);
    const result = await this.repo.save(order);
    await this.hooks.afterCreate?.(result);
    return result;
  }
}

// ❌ Anti-pattern: Hardcoded synchronous side-effects in core orchestration
class OrderService {
  async createOrder(order: Order) {
    await this.sendEmailNotification(order);  // Rigid coupling
    await this.syncInventoryLedger(order);    // Rigid coupling
    await this.pingWarehouseApi(order);       // Rigid coupling
    return await this.database.save(order);
  }
}
```

---

## Code Organization & Structure

### Directory Organization

**Domain / Feature-Driven Structure (Recommended):**
```
src/
├── identity/
│   ├── User.ts                  (Domain Entity)
│   ├── UserService.ts           (Application Service)
│   ├── UserRepository.ts        (Interface Port)
│   └── UserController.ts        (Interface Adapter)
├── billing/
│   ├── Invoice.ts
│   ├── InvoiceService.ts
│   └── ...
└── shared/
    ├── telemetry/
    └── contracts/
```

**Technical-Layer-Driven Structure (Discouraged for Large Systems):**
```
src/
├── controllers/     ← Unrelated business domains tangled in same directory
│   ├── UserController.ts
│   └── InvoiceController.ts
├── services/
└── repositories/
```

### Architectural Guardrails & Thresholds

```yaml
Recommended Architectural Limits:
  Source File Length: < 300 lines
  Function Body Length: < 50 lines
  Class Definition: < 200 lines
  Function Parameters: < 4 arguments (use parameter object if larger)
  Nesting Depth: < 4 indentation levels

When limits are exceeded:
  - Decompose into focused private helpers or companion services
  - Favor object composition over class inheritance hierarchies
  - Extract reusable domain value objects
```

---

## 5-Minute Architecture Quick-Check

```markdown
[ ] Does dependency flow strictly inward toward core business rules?
[ ] Is the codebase free of circular module import dependencies?
[ ] Are domain entities decoupled from databases, HTTP frameworks, and UI components?
[ ] Are classes focused on a single responsibility rather than acting as multi-purpose managers?
[ ] Are third-party vendor SDKs isolated behind boundary adapters?
```

### Architectural Red Flags (Immediate Action Required)

```markdown
🔴 God Object: Monolithic class or file exceeding 1,000 lines of mixed concerns
🔴 Circular Dependency: Module A → Module B → Module C → Module A
🔴 Layer Leakage: Domain entity directly importing database driver or web controller
🔴 Hardcoded Secrets: Cryptographic keys or database credentials embedded in code
🔴 Unbounded Concurrency: Infinite parallel background worker spawns without throttling
```

### Architectural Yellow Flags (Improvement Recommended)

```markdown
🟡 Excessive Class Coupling: CBO score > 10
🟡 Method Parameter Bloat: More than 5 positional arguments
🟡 Excessive Nesting: Greater than 4 nested conditional blocks
🟡 Fragile Interfaces: Single-implementation interfaces created without testing or extension need
```

---

## Recommended Architecture Inspection Tools

| Tool | Focus Area | Language Support |
|---|---|---|
| **SonarQube** | Code quality gates, cognitive complexity, technical debt estimation | Multi-language |
| **NDepend** | Dependency graph analysis, CQLinq architecture rules | .NET / C# |
| **JDepend** | Package dependency metrics (Ca, Ce, Instability, Abstractness) | Java |
| **Madge** | Visual module dependency graphs and circular dependency detection | JavaScript / TypeScript |
| **ESLint / ArchUnit** | Enforcing architectural layer import constraints via lint rules | JS / TS / Java / .NET |
| **CodeScene** | Behavioral code analysis, hotspot change coupling, developer churn | Multi-language |
