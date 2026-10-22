# Performance Review Guide

Comprehensive performance review guide covering frontend, backend, database query optimization, algorithmic complexity, and API throughput.

## Table of Contents

- [Frontend Performance (Core Web Vitals)](#frontend-performance-core-web-vitals)
- [JavaScript Runtime Performance](#javascript-runtime-performance)
- [Memory Management & Leaks](#memory-management--leaks)
- [Database Performance & Indexing](#database-performance--indexing)
- [API Throughput & Caching](#api-throughput--caching)
- [Algorithmic Complexity](#algorithmic-complexity)
- [Performance Review Checklist](#performance-review-checklist)
- [Low-Level Efficiency Anti-Patterns](#low-level-efficiency-anti-patterns)
- [Performance Benchmarks & Thresholds](#performance-benchmarks--thresholds)
- [Recommended Profiling Tools](#recommended-profiling-tools)

---

## Frontend Performance (Core Web Vitals)

### Core Web Vitals Targets

| Metric | Full Name | Target | Significance |
|---|---|---|---|
| **LCP** | Largest Contentful Paint | ≤ 2.5s | Render time of the largest visual content element |
| **INP** | Interaction to Next Paint | ≤ 200ms | UI interaction responsiveness (replaces FID) |
| **CLS** | Cumulative Layout Shift | ≤ 0.1 | Visual stability score preventing unwanted layout movement |
| **FCP** | First Contentful Paint | ≤ 1.8s | Time when browser renders the very first DOM element |
| **TBT** | Total Blocking Time | ≤ 200ms | Total main-thread task blocking duration between FCP & TTI |

### LCP Optimization Checks

```javascript
// ❌ Anti-pattern: Lazy loading the hero/LCP image delays critical rendering path
<img src="hero.jpg" loading="lazy" />

// ✅ Best practice: Eager load LCP image with high fetch priority
<img src="hero.jpg" fetchpriority="high" />

// ❌ Anti-pattern: Unoptimized legacy image formats
<img src="hero.png" />  // Bloated PNG payload size

// ✅ Best practice: Modern responsive formats with fallbacks
<picture>
  <source srcset="hero.avif" type="image/avif" />
  <source srcset="hero.webp" type="image/webp" />
  <img src="hero.jpg" alt="Hero Banner" />
</picture>
```

**Review Checklist:**
- [ ] Is the primary LCP visual element flagged with `fetchpriority="high"`?
- [ ] Are assets served in next-gen formats (AVIF / WebP) with sensible compression?
- [ ] Is Server-Side Rendering (SSR) or Static Site Generation (SSG) utilized for critical landing paths?
- [ ] Is CDN edge caching and compression (Brotli/Gzip) properly configured?

### FCP Optimization Checks

```html
<!-- ❌ Anti-pattern: Synchronous render-blocking stylesheet -->
<link rel="stylesheet" href="all-styles.css" />

<!-- ✅ Best practice: Inline critical CSS + asynchronous non-critical stylesheet -->
<style>/* Critical above-the-fold inline styling */</style>
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />

<!-- ❌ Anti-pattern: Render-blocking custom webfont without fallback -->
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
}

<!-- ✅ Best practice: font-display swap preventing invisible text flashes (FOIT) -->
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
  font-display: swap;  /* Render system font immediately, swap when downloaded */
}
```

### INP Optimization Checks

```javascript
// ❌ Anti-pattern: Heavy long-running synchronous task blocks the main thread
button.addEventListener('click', () => {
  // Synchronous execution freezing UI for 500ms
  processLargeData(data);
  updateUI();
});

// ✅ Best practice: Yield main thread to allow browser painting between chunks
button.addEventListener('click', async () => {
  // Yield thread control
  await (globalThis.scheduler?.yield?.() ?? new Promise(r => setTimeout(r, 0)));

  // Batch process data chunks
  for (const chunk of chunks) {
    processChunk(chunk);
    await (globalThis.scheduler?.yield?.() ?? new Promise(r => setTimeout(r, 0)));
  }
  updateUI();
});

// ✅ Best practice: Offload heavy background computational work to Web Workers
const worker = new Worker('heavy-computation.js');
worker.postMessage(data);
worker.onmessage = (e) => updateUI(e.data);
```

### CLS Optimization Checks

```css
/* ❌ Anti-pattern: Media elements lacking explicit dimensions cause layout shifts */
img { width: 100%; }

/* ✅ Best practice: Preserve aspect ratio or set fixed height before loading */
img {
  width: 100%;
  aspect-ratio: 16 / 9;
}

/* ❌ Anti-pattern: Dynamically injected advertising banner displaces content downwards */
.ad-container { }

/* ✅ Best practice: Reserve container dimensions in advance */
.ad-container {
  min-height: 250px;
}
```

**CLS Review Checklist:**
- [ ] Do all images, videos, and iframes declare explicit `width`/`height` or CSS `aspect-ratio`?
- [ ] Do custom fonts specify `font-display: swap` or `optional`?
- [ ] Are dynamic injected blocks (ads, banners, notifications) assigned reserved minimum dimensions?
- [ ] Is layout insertion avoided above existing visible content?

---

## JavaScript Runtime Performance

### Code Splitting & Dynamic Imports

```javascript
// ❌ Anti-pattern: Importing all modules statically in the main entry bundle
import { HeavyChart } from './charts';
import { PDFExporter } from './pdf';
import { AdminPanel } from './admin';

// ✅ Best practice: Lazy load on demand via dynamic import()
const HeavyChart = lazy(() => import('./charts'));
const PDFExporter = lazy(() => import('./pdf'));

// ✅ Best practice: Route-level code splitting
const routes = [
  {
    path: '/dashboard',
    component: lazy(() => import('./pages/Dashboard')),
  },
  {
    path: '/admin',
    component: lazy(() => import('./pages/Admin')),
  },
];
```

### Bundle Size Optimization & Tree Shaking

```javascript
// ❌ Anti-pattern: Importing entire heavyweight libraries
import _ from 'lodash';
import moment from 'moment';

// ✅ Best practice: Path-based tree-shakeable imports or lightweight modern alternatives
import debounce from 'lodash/debounce';
import { format } from 'date-fns';

// ❌ Anti-pattern: Default export of object literal prevents tree-shaking dead code
export default {
  fn1() {},
  fn2() {},  // Bundled even if never invoked
};

// ✅ Best practice: Named exports enable static dead code elimination
export function fn1() {}
export function fn2() {}
```

**Bundle Review Checklist:**
- [ ] Are route boundaries and heavy non-critical components lazily imported?
- [ ] Are utility libraries imported by subpath rather than barrel root?
- [ ] Is bundle size actively inspected with analyzers (`webpack-bundle-analyzer`, `vite-bundle-visualizer`)?
- [ ] Are unused dependencies and transitives regularly pruned?

### Virtualized List Rendering

```javascript
// ❌ Anti-pattern: Rendering 10,000 DOM nodes simultaneously
function List({ items }) {
  return (
    <ul>
      {items.map(item => <li key={item.id}>{item.name}</li>)}
    </ul>
  );  // 10,000 DOM elements destroy frame rates and balloon memory
}

// ✅ Best practice: Virtualized list - only render visible window elements
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  return (
    <FixedSizeList
      height={400}
      itemCount={items.length}
      itemSize={35}
    >
      {({ index, style }) => (
        <div style={style}>{items[index].name}</div>
      )}
    </FixedSizeList>
  );
}
```

**Dataset Review Checklist:**
- [ ] Are lists exceeding 100 items virtualized or paginated?
- [ ] Do large tables support cursor virtualization or server pagination?
- [ ] Are unnecessary component re-renders blocked via memoization (`useMemo`, `React.memo`) where verified?

---

## Memory Management & Leaks

### Common Memory Leak Vectors

#### 1. Uncleaned Event Listeners

```javascript
// ❌ Anti-pattern: Window listener remains active after unmount
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// ✅ Best practice: Return teardown / cleanup function
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

#### 2. Dangling Timers & Intervals

```javascript
// ❌ Anti-pattern: Interval timer runs indefinitely in background
useEffect(() => {
  setInterval(fetchData, 5000);
}, []);

// ✅ Best practice: Clear interval timer on unmount
useEffect(() => {
  const timer = setInterval(fetchData, 5000);
  return () => clearInterval(timer);
}, []);
```

#### 3. Unintended Closure References

```javascript
// ❌ Anti-pattern: Closure retains massive byte array unnecessarily
function createHandler() {
  const largeData = new Array(1000000).fill('x');

  return function handler() {
    // largeData is retained in lexical scope and cannot be garbage collected
    console.log(largeData.length);
  };
}

// ✅ Best practice: Capture only required scalar values
function createHandler() {
  const largeData = new Array(1000000).fill('x');
  const length = largeData.length;  // Preserve only scalar

  return function handler() {
    console.log(length);
  };
}
```

#### 4. Orphaned Persistent Connections

```javascript
// ❌ Anti-pattern: WebSocket or SSE connection remains open after unmount
useEffect(() => {
  const ws = new WebSocket('wss://api.example.com/stream');
  ws.onmessage = handleMessage;
}, []);

// ✅ Best practice: Close socket connection during unmount
useEffect(() => {
  const ws = new WebSocket('wss://api.example.com/stream');
  ws.onmessage = handleMessage;
  return () => ws.close();
}, []);
```

### Memory Review Checklist

- [ ] Does every `useEffect` or lifecycle hook with resource subscriptions return a teardown function?
- [ ] Are DOM and window event listeners detached when components unmount?
- [ ] Are `setInterval` and `setTimeout` references cleared?
- [ ] Are WebSockets, Server-Sent Events (SSE), and WebRTC connections explicitly terminated?
- [ ] Are large caches bounded in capacity to prevent heap exhaustion?
- [ ] Is global module state prevented from accumulating uncollected request data?

---

## Database Performance & Indexing

### Mitigating N+1 Query Anti-Patterns

```python
# ❌ Anti-pattern: N+1 queries (1 user query + N individual profile queries)
users = User.objects.all()  # 1 initial query
for user in users:
    print(user.profile.bio)  # Dispatches N additional queries

# ✅ Best practice: Eager load foreign keys with select_related (single SQL JOIN)
users = User.objects.select_related('profile').all()
for user in users:
    print(user.profile.bio)  # Zero extra queries

# ✅ Best practice: Prefetch many-to-many associations with prefetch_related
posts = Post.objects.prefetch_related('tags').all()
```

```javascript
// TypeORM Example
// ❌ Anti-pattern: Iterative query dispatch inside loop
const users = await userRepository.find();
for (const user of users) {
  const posts = await user.posts;  // Dispatches SQL query on every iteration
}

// ✅ Best practice: Eager relation joining
const users = await userRepository.find({
  relations: ['posts'],
});
```

### Database Index Optimization

```sql
-- ❌ Anti-pattern: Full table scan on unindexed filter
SELECT * FROM orders WHERE status = 'pending';

-- ✅ Best practice: Add targeted index
CREATE INDEX idx_orders_status ON orders(status);

-- ❌ Anti-pattern: Function wrapping column invalidates index
SELECT * FROM users WHERE YEAR(created_at) = 2024;

-- ✅ Best practice: Range query uses B-Tree index directly
SELECT * FROM users
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- ❌ Anti-pattern: Leading wildcard prevents B-Tree index lookup
SELECT * FROM products WHERE name LIKE '%phone%';

-- ✅ Best practice: Prefix lookup utilizes index (or full-text search engine)
SELECT * FROM products WHERE name LIKE 'phone%';
```

### Query Structure & Volume

```sql
-- ❌ Anti-pattern: SELECT * retrieves large unused blob/text columns
SELECT * FROM users WHERE id = 1;

-- ✅ Best practice: Select only explicit required columns
SELECT id, name, email FROM users WHERE id = 1;

-- ❌ Anti-pattern: Querying large table without row boundary
SELECT * FROM audit_logs WHERE type = 'error';

-- ✅ Best practice: Bounded pagination limit
SELECT * FROM audit_logs WHERE type = 'error' LIMIT 100 OFFSET 0;

-- ❌ Anti-pattern: Running individual queries within procedural loop
for id in user_ids:
    cursor.execute("SELECT * FROM users WHERE id = %s", (id,))

-- ✅ Best practice: Batch retrieval via IN operator or parameterized tuple
cursor.execute("SELECT * FROM users WHERE id IN %s", (tuple(user_ids),))
```

### Database Review Checklist

**Critical:**
- [ ] Are ORM associations eager-loaded to prevent N+1 query patterns?
- [ ] Do all high-frequency `WHERE`, `JOIN`, and `ORDER BY` columns possess indexes?
- [ ] Are queries free of wildcard `SELECT *` across broad schemas?
- [ ] Do large table queries specify mandatory `LIMIT` ceilings?

**High Importance:**
- [ ] Has query execution plan been analyzed with `EXPLAIN ANALYZE`?
- [ ] Do composite indexes order columns correctly (equality first, ranges second)?
- [ ] Are unused or duplicate indexes removed to reduce write overhead?
- [ ] Is slow query logging enabled in staging/production telemetry?

---

## API Throughput & Caching

### Pagination & Result Windowing

```javascript
// ❌ Anti-pattern: Unbounded array payload risk
app.get('/users', async (req, res) => {
  const users = await User.findAll();  // Potentially returns 500,000 records
  res.json(users);
});

// ✅ Best practice: Enforced pagination with capped maximum page size
app.get('/users', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);  // Hard ceiling of 100
  const offset = (page - 1) * limit;

  const { rows, count } = await User.findAndCountAll({
    limit,
    offset,
    order: [['id', 'ASC']],
  });

  res.json({
    data: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  });
});
```

### Caching Strategy

```javascript
// ✅ Best practice: Redis cache-aside pattern
async function getUser(id) {
  const cacheKey = `user:${id}`;

  // 1. Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 2. Fetch from persistent DB
  const user = await db.users.findById(id);

  // 3. Write through cache with strict TTL
  await redis.setex(cacheKey, 3600, JSON.stringify(user));

  return user;
}

// ✅ Best practice: HTTP cache headers for static or semi-static resources
app.get('/static-data', (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    'ETag': 'W/"abc123hash"',
  });
  res.json(data);
});
```

### Compression & Rate Limiting

```javascript
// ✅ Best practice: Enable Brotli / Gzip response compression
const compression = require('compression');
app.use(compression());

// ✅ Best practice: Enforce client rate limiting to protect backend resources
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 100,             // Max 100 requests per IP
  message: { error: 'Too many requests, please retry shortly.' },
});

app.use('/api/', limiter);
```

---

## Algorithmic Complexity

### Big-O Complexity Comparison

| Complexity | Class | N = 10 | N = 1,000 | N = 1,000,000 | Typical Use Case |
|---|---|---|---|---|---|
| **O(1)** | Constant | 1 op | 1 op | 1 op | Hash table lookup |
| **O(log n)** | Logarithmic | 3 ops | 10 ops | 20 ops | Binary search |
| **O(n)** | Linear | 10 ops | 1,000 ops | 1,000,000 ops | Single-pass array iteration |
| **O(n log n)** | Linearithmic | 33 ops | 10,000 ops | 20,000,000 ops | QuickSort / MergeSort |
| **O(n²)** | Quadratic | 100 ops | 1,000,000 ops | 1,000,000,000,000 ops | Nested loop comparisons |
| **O(2ⁿ)** | Exponential | 1,024 ops | ∞ | ∞ | Naive recursive algorithms |

### Identifying Inefficient Complexity in Code Review

```javascript
// ❌ Anti-pattern: O(n²) nested loop duplicate search
function findDuplicates(arr) {
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}

// ✅ Best practice: O(n) linear search using Set / Hash Map
function findDuplicates(arr) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.add(item);
    }
    seen.add(item);
  }
  return [...duplicates];
}
```

```javascript
// ❌ Anti-pattern: O(n) array lookup repeated inside loop -> O(n²) total
const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];

function getUser(id) {
  return users.find(u => u.id === id);  // O(n) scan
}

// ✅ Best practice: O(1) indexed Map lookup
const userMap = new Map(users.map(u => [u.id, u]));

function getUser(id) {
  return userMap.get(id);  // O(1) constant time
}
```

### Space Complexity & Stack Allocation

```javascript
// ⚠️ Anti-pattern: Deep recursion risks Call Stack Overflow (O(n) stack memory)
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);  // O(n) call stack frames
}

// ✅ Best practice: Iterative loop requires O(1) auxiliary space
function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
```

---

## Performance Review Checklist

### 🔴 Critical (Blocking Severity)

**Frontend:**
- [ ] Is LCP element excluded from lazy loading?
- [ ] Are animations avoiding expensive reflow properties (`width`, `height`, `top`, `left`) in favor of `transform` and `opacity`?
- [ ] Are dataset lists exceeding 100 items virtualized?

**Backend & Storage:**
- [ ] Are ORM associations free from N+1 query loops?
- [ ] Do API list endpoints enforce strict pagination with hard ceiling limits?
- [ ] Are large production tables free from unindexed `SELECT *` full table scans?

**Universal:**
- [ ] Are algorithmic operations free from unintentional O(n²) or worse loops on user-controllable input?
- [ ] Do all event listeners, intervals, and stream handles provide guaranteed teardown logic?

### 🟡 High (Important Severity)

**Frontend:**
- [ ] Is route-level and vendor code splitting configured?
- [ ] Are heavy utility packages imported selectively rather than as entire barrels?
- [ ] Are visual media files compressed in next-gen formats (WebP/AVIF)?

**Backend:**
- [ ] Are frequently read, infrequently changed resources protected by a cache layer?
- [ ] Are filter and foreign key columns indexed?
- [ ] Are slow queries monitored via telemetry thresholds?

**API:**
- [ ] Is Gzip or Brotli compression active on textual responses?
- [ ] Is rate limiting configured to prevent resource exhaustion?
- [ ] Does response payload omit unused fields?

---

## Low-Level Efficiency Anti-Patterns

### Unnecessary Redundant Operations

- [ ] Is the same function or query executed multiple times within a single request or render pass?
- [ ] Are files, templates, or configurations read repetitively inside loops (loop-invariant)?
- [ ] Can computed values be cached or forwarded downstream?

```typescript
// ❌ Anti-pattern: Loop-invariant disk read on every iteration
for (const filePath of filePaths) {
  const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
  processFile(filePath, config);
}

// ✅ Best practice: Hoist invariant outside loop
const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
for (const filePath of filePaths) {
  processFile(filePath, config);
}
```

### Missed Concurrency Opportunities

- [ ] Are independent async promises awaited sequentially?
- [ ] Can operations execute concurrently via `Promise.all` / `asyncio.gather` / `tokio::join!`?

```typescript
// ❌ Anti-pattern: Sequential blocking awaits
const a = await fetchUserData();
const b = await fetchAccountSettings();

// ✅ Best practice: Concurrent async execution
const [a, b] = await Promise.all([fetchUserData(), fetchAccountSettings()]);
```

### Hot-Path Initialization Bloat

- [ ] Do module imports execute synchronous heavy operations (file I/O, network calls, large instance construction)?
- [ ] Can per-request resource initialization be deferred until required?
- [ ] Does service cold startup block incoming health probes?

### Unbounded In-Memory Collections

- [ ] Do global dictionaries, lists, or caches define a maximum size ceiling (`max-size`) and TTL eviction?
- [ ] Do telemetry queues and log buffers implement backpressure limits?
- [ ] Are transient request objects detached from global listeners to allow GC reclamation?

```python
# ❌ Anti-pattern: Unbounded cache causes memory growth
_cache: dict[str, Any] = {}

# ✅ Best practice: Bounded LRU cache with eviction ceiling
from functools import lru_cache

@lru_cache(maxsize=256)
def get_cached(key: str) -> Any:
    return expensive_computation(key)
```

---

## Performance Benchmarks & Thresholds

### Frontend Metrics

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| **LCP** | ≤ 2.5s | 2.5s – 4.0s | > 4.0s |
| **INP** | ≤ 200ms | 200ms – 500ms | > 500ms |
| **CLS** | ≤ 0.1 | 0.1 – 0.25 | > 0.25 |
| **FCP** | ≤ 1.8s | 1.8s – 3.0s | > 3.0s |
| **JS Bundle Size** | < 200KB gzipped | 200KB – 500KB | > 500KB |

### Backend Metrics

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| **API Response Time (P95)** | < 100ms | 100ms – 500ms | > 500ms |
| **DB Query Latency** | < 50ms | 50ms – 200ms | > 200ms |
| **End-to-End Page Load** | < 3s | 3s – 5s | > 5s |

---

## Recommended Profiling Tools

### Frontend Profilers

| Tool | Focus Area |
|---|---|
| **Lighthouse** | Automated Core Web Vitals, accessibility, and performance auditing |
| **WebPageTest** | Detailed multi-region network and waterfall timeline diagnostics |
| **webpack-bundle-analyzer** | Visual treemap inspection of bundle dependencies and sizes |
| **Chrome DevTools Performance** | Frame rate, CPU flame charts, and main-thread task breakdown |

### Memory & Leak Analyzers

| Tool | Focus Area |
|---|---|
| **MemLab (Meta)** | Automated memory leak detection and target node retention graphs |
| **Chrome Memory Tab** | Heap snapshot comparison and detached DOM node tracking |

### Backend APM & Database Analyzers

| Tool | Focus Area |
|---|---|
| **EXPLAIN / EXPLAIN ANALYZE** | Database SQL query planning and cost analysis |
| **pganalyze** | PostgreSQL query statistics, index efficiency, and lock monitoring |
| **Datadog / New Relic** | Distributed request tracing, latency histograms, and APM metrics |
