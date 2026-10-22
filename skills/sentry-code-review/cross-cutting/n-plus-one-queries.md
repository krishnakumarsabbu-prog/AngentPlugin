# N+1 Query Problem — Cross-Language Universal Guide

> N+1 query patterns represent the most pervasive performance anti-pattern across ORMs and database abstraction layers. This guide defines the problem, quantifies its impact, details detection strategies, and provides cross-language remediation examples.

## Table of Contents

- [Problem Definition](#problem-definition)
- [Performance Impact](#performance-impact)
- [Detection Methods](#detection-methods)
- [Universal Remediation Strategies](#universal-remediation-strategies)
- [Language-Specific Implementations](#language-specific-implementations)
- [Review Checklist](#review-checklist)

---

## Problem Definition

An N+1 query bug occurs when: **1 primary query fetches N parent records, and subsequent iterations trigger N additional queries** to fetch related child records.

```
Request Pipeline:
  1 query   → Fetches N parent records
  N queries → Each record triggers an individual lookup for related entities
  ─────────
  Total: 1 + N queries
```

### Risks & Failure Modes

| Risk | Impact |
|---|---|
| **Linear Query Growth** | 100 records = 101 queries; 1,000 records = 1,001 queries. |
| **Network Round-Trip Latency** | Sequential network RTTs accumulate: 100 RTTs >> 1 batched query. |
| **Connection Pool Exhaustion** | Floods database connection pools, starving concurrent application threads. |
| **Silent in Local Development** | Unnoticeable with tiny test fixtures; collapses under production load. |

---

## Performance Impact

### Scenario Comparison: Fetching 100 Users and their Orders

| Strategy | Query Count | Latency (assumed RTT = 1ms) | Best Suited For |
|---|---|---|---|
| N+1 Lazy Loading | 101 queries | ~101ms | Trivial data sizes only |
| Eager Loading (SQL JOIN) | 1 query | ~1ms | One-to-one, one-to-many |
| Eager Loading (SQL IN) | 2 queries | ~2ms | Many-to-many, large result sets |
| DataLoader / Batching | 2 queries | ~2ms | GraphQL and complex graph graphs |

### SQL Volume Comparison

```sql
-- ❌ N+1: 1 + 100 = 101 queries
SELECT * FROM users;                          -- Query 1
SELECT * FROM orders WHERE user_id = 1;       -- Query 2
SELECT * FROM orders WHERE user_id = 2;       -- Query 3
...
SELECT * FROM orders WHERE user_id = 100;     -- Query 101

-- ✅ Batched: 2 queries
SELECT * FROM users;
SELECT * FROM orders WHERE user_id IN (1, 2, ..., 100);
```

---

## Detection Methods

### 1. ORM SQL Logging

Enable SQL query logging in test and staging environments to observe query explosions:

```python
# Django
import logging
logging.getLogger('django.db.backends').setLevel(logging.DEBUG)

# SQLAlchemy
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

```yaml
# Spring Boot application.yml
spring:
  jpa:
    show-sql: true
    properties:
      hibernate.format_sql: true
```

```csharp
// EF Core
optionsBuilder.LogTo(Console.WriteLine, LogLevel.Information);
```

### 2. Query Count Assertions in Automated Tests

Assert exact SQL query counts in automated test suites:

```python
# Django: CaptureQueriesContext
from django.test.utils import CaptureQueriesContext
from django.db import connection

with CaptureQueriesContext(connection) as ctx:
    list(User.objects.select_related("profile").all())
assert len(ctx) <= 2  # Expect at most 2 queries
```

```java
// Hibernate: p6spy or datasource-proxy in tests
assertThat(sqlCount).isLessThanOrEqualTo(2);
```

### 3. APM & Monitoring Tools

- **Django Debug Toolbar**: Displays query count and timings in development UI.
- **p6spy (Java)**: Intercepts JDBC statements and logs execution metrics.
- **MiniProfiler (.NET)**: In-page profiling of SQL statements.
- **Datadog / New Relic**: Production alerts on high query volume per request.

---

## Universal Remediation Strategies

### Strategy 1: Eager Loading (SQL JOIN)
Executes a single `LEFT JOIN` or `INNER JOIN` to fetch parent and child rows simultaneously. Ideal for `OneToOne` and `ManyToOne` relationships.

### Strategy 2: Batch Fetching (SQL IN Clause)
Executes 2 queries: one for primary records, and a second fetching all children via `WHERE parent_id IN (...)`. Ideal for `ManyToMany` or large one-to-many collections.

### Strategy 3: DataLoader Pattern
Batches and memoizes individual requests during a single tick of the event loop. Essential for GraphQL field resolvers.

```typescript
// DataLoader conceptual pattern
class DataLoader<K, V> {
  load(key: K): Promise<V>;          // Queues key for batched lookup
  loadMany(keys: K[]): Promise<V[]>; // Merges into a single batched SQL query
}
```

### Strategy 4: Projection
Select only required columns to minimize payload serialization overhead:

```sql
-- ❌ Overfetching all columns
SELECT * FROM users JOIN profiles ON ...

-- ✅ Projecting strictly necessary fields
SELECT u.name, p.avatar_url FROM users u JOIN profiles p ON ...
```

---

## Language-Specific Implementations

### Python / Django

```python
# ForeignKey / OneToOne → select_related (SQL JOIN)
books = Book.objects.select_related("publisher")

# ManyToMany / reverse FK → prefetch_related (2 queries + Python merge)
authors = Author.objects.prefetch_related("books")

# Nested prefetching
authors = Author.objects.prefetch_related("books__publisher")

# Granular control via Prefetch object
from django.db.models import Prefetch
authors = Author.objects.prefetch_related(
    Prefetch("books", queryset=Book.objects.filter(published=True), to_attr="published_books")
)
```

### Python / SQLAlchemy (FastAPI)

```python
from sqlalchemy.orm import selectinload, joinedload

# selectinload: IN clause batching (preferred for async engines)
stmt = select(Order).options(selectinload(Order.customer))

# joinedload: SQL JOIN loading
stmt = select(Order).options(joinedload(Order.customer))
```

### Java / JPA (Spring Boot)

```java
// ❌ Eager fetching or lazy loading in loops
@OneToMany(fetch = FetchType.EAGER)  // Dangerous global eager loading

// ✅ JOIN FETCH query
@Query("SELECT u FROM User u JOIN FETCH u.orders")
List<User> findAllWithOrders();

// ✅ @EntityGraph (declarative fetch plan)
@EntityGraph(attributePaths = {"orders", "profile"})
List<User> findAll();

// ✅ @BatchSize (reduces N queries to N/batchSize + 1)
@OneToMany
@BatchSize(size = 50)
private List<Order> orders;
```

### C# / EF Core

```csharp
// ❌ N+1: iteration triggers database lazy loading
foreach (var blog in await context.Blogs.ToListAsync())
    foreach (var post in blog.Posts)  // Triggers separate query every loop!

// ✅ Include + ThenInclude
var blogs = await context.Blogs
    .Include(b => b.Posts)
    .ToListAsync();

// ✅ Projection (Safest, prevents overfetching)
var data = await context.Blogs
    .Select(b => new { b.Url, PostTitles = b.Posts.Select(p => p.Title) })
    .ToListAsync();
```

### PHP / Laravel & Doctrine

```php
// ❌ Query inside iteration
foreach ($orders as $order) {
    $customer = $customerRepo->find($order->customerId);
    render($order, $customer);
}

// ✅ Laravel Eloquent: with()
$orders = Order::with('customer')->get();

// ✅ Doctrine: JOIN FETCH
$dql = 'SELECT o, c FROM Order o JOIN o.customer c';
```

### TypeScript / Prisma

```typescript
// ❌ N+1: iteration queries
const users = await prisma.user.findMany();
for (const user of users) {
  user.posts = await prisma.post.findMany({ where: { userId: user.id } });
}

// ✅ include (Prisma generates optimal JOIN or batch query)
const users = await prisma.user.findMany({
  include: { posts: true },
});

// ✅ Nested relations
const users = await prisma.user.findMany({
  include: {
    posts: {
      include: { comments: true },
    },
  },
});
```

---

## Review Checklist

### Detection & Monitoring
- [ ] SQL query logging enabled in staging / test profiles.
- [ ] Automated regression tests assert maximum expected query counts.
- [ ] APM or monitoring configured with alerts on anomalous query volumes.

### Remediation
- [ ] `OneToOne` and `ManyToOne` relations leverage SQL JOIN eager loading.
- [ ] `ManyToMany` and reverse relations leverage batched `IN` prefetching.
- [ ] Prohibited database calls inside iteration loops.
- [ ] Queries project only necessary columns instead of `SELECT *`.

### Architectural Controls
- [ ] Paginated list endpoints prevent unbounded entity retrieval.
- [ ] GraphQL schemas utilize DataLoaders across all relation resolvers.
- [ ] High-frequency read paths implement caching tiers (e.g. Redis).
