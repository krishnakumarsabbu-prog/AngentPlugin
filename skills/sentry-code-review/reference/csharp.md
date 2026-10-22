# C# / .NET Code Review Guide

> C# and .NET 8/9 code review guide covering C# 12+ language features, async best practices, EF Core query performance, ASP.NET Core reliability, dependency injection lifecycles, and LINQ pitfalls.

## Table of Contents

- [Modern C# Features](#modern-c-features)
- [Asynchronous Programming](#asynchronous-programming)
- [EF Core Performance](#ef-core-performance)
- [ASP.NET Core Best Practices](#aspnet-core-best-practices)
- [Dependency Injection Lifecycles](#dependency-injection-lifecycles)
- [LINQ Best Practices](#linq-best-practices)
- [Review Checklist](#review-checklist)

---

## Modern C# Features

### Primary Constructors (Classes & Structs)

```csharp
// ❌ Boilerplate-heavy traditional constructor
public class ProductService
{
    private readonly ProductDbContext _db;
    private readonly ILogger<ProductService> _logger;

    public ProductService(ProductDbContext db, ILogger<ProductService> logger)
    {
        _db = db;
        _logger = logger;
    }
}

// ✅ Primary constructor provides concise dependency injection
public class ProductService(ProductDbContext db, ILogger<ProductService> logger)
{
    public async Task<Product?> GetAsync(int id)
        => await db.Products.FindAsync(id);
}

// ⚠️ Note: Primary constructor parameters in classes are mutable parameters, not properties
// If long-term immutability is required, explicitly assign to a readonly field:
public class OrderService(OrderDbContext db)
{
    private readonly OrderDbContext _db = db;
}
```

### Collection Expressions

```csharp
// ❌ Verbose legacy collection syntax
int[] nums = new int[] { 1, 2, 3 };
List<string> names = new List<string> { "alice", "bob" };

// ✅ Clean collection expressions (C# 12+)
int[] nums = [1, 2, 3];
List<string> names = ["alice", "bob"];
Span<char> span = ['a', 'b'];

// ✅ Spread operator for seamless composition
int[] merged = [..nums, 4, 5];
```

---

## Asynchronous Programming

### `Task.Wait()`, `.Result`, and `async void` are Dangerous Anti-Patterns

```csharp
// ❌ Task.Result blocks worker threads and causes thread pool starvation or deadlocks
public ActionResult<Data> Get(int id)
{
    var data = _service.GetDataAsync(id).Result; // Deadlock hazard!
    return Ok(data);
}

// ❌ async void unhandled exceptions bypass callers and terminate the host process
public async void HandleEvent()
{
    await _service.ProcessAsync(); // Unhandled exception crashes application
}

// ✅ Fully asynchronous call chain returning Task / Task<T>
public async Task<ActionResult<Data>> Get(int id)
{
    var data = await _service.GetDataAsync(id);
    return Ok(data);
}
```

### `ConfigureAwait(false)` in Non-UI Class Libraries

```csharp
// ❌ Library code unnecessarily captures the ambient SynchronizationContext
public class LibraryService
{
    public async Task<string> GetDataAsync()
    {
        var response = await _httpClient.GetAsync("/api/data");
        return await response.Content.ReadAsStringAsync();
    }
}

// ✅ Library code uses ConfigureAwait(false) to prevent context-switching overhead and deadlocks
public class LibraryService
{
    public async Task<string> GetDataAsync()
    {
        var response = await _httpClient.GetAsync("/api/data").ConfigureAwait(false);
        return await response.Content.ReadAsStringAsync().ConfigureAwait(false);
    }
}
```

### CancellationToken Propagation

```csharp
// ❌ Dropping CancellationToken ignores client disconnects, wasting backend resources
public async Task<List<User>> SearchAsync(string query)
{
    return await _db.Users.Where(u => u.Name.Contains(query)).ToListAsync();
}

// ✅ Propagate CancellationToken through all asynchronous operations
public async Task<List<User>> SearchAsync(string query, CancellationToken ct = default)
{
    return await _db.Users
        .Where(u => u.Name.Contains(query))
        .ToListAsync(ct);
}
```

### Asynchronous Disposal (`IAsyncDisposable`)

```csharp
// ❌ Synchronous dispose on asynchronous stream handles
public class DataClient : IDisposable
{
    public void Dispose()
    {
        _stream.Dispose(); // Can block synchronous thread on buffered flush
    }
}

// ✅ Implementing IAsyncDisposable and consuming with await using
public class DataClient : IAsyncDisposable
{
    public async ValueTask DisposeAsync()
    {
        await _stream.DisposeAsync();
    }
}

// Consuming:
await using var client = new DataClient();
```

---

## EF Core Performance

### N+1 Query Traps

```csharp
// ❌ Classic N+1: Each blog iteration issues a separate query for posts
foreach (var blog in await context.Blogs.ToListAsync())
{
    foreach (var post in blog.Posts) // Separate SQL query per loop!
    {
        Console.WriteLine(post.Title);
    }
}

// ✅ Eager Loading with projection
var blogs = await context.Blogs
    .Select(b => new { b.Url, PostTitles = b.Posts.Select(p => p.Title) })
    .ToListAsync();
```

### Cartesian Product Explosion with Multiple Includes

```csharp
// ❌ Multiple Includes generate explosive Cartesian product table joins
var blogs = await context.Blogs
    .Include(b => b.Posts)
    .Include(b => b.Tags)
    .ToListAsync();

// ✅ AsSplitQuery splits parent and child collections into independent queries
var blogs = await context.Blogs
    .Include(b => b.Posts)
    .Include(b => b.Tags)
    .AsSplitQuery()
    .ToListAsync();
```

### Use `AsNoTracking()` for Read-Only Workloads

```csharp
// ❌ Tracking overhead for read-only operations
var products = await context.Products.ToListAsync();

// ✅ AsNoTracking disables identity resolution and change tracking for maximum throughput
var products = await context.Products
    .AsNoTracking()
    .ToListAsync();
```

---

## ASP.NET Core Best Practices

### `HttpClient` Management via `IHttpClientFactory`

```csharp
// ❌ Instantiating HttpClient per request causes socket exhaustion under load
using var client = new HttpClient();
var response = await client.GetAsync("https://api.example.com/data");

// ✅ Injected via IHttpClientFactory or Typed Client pattern
public class MyService(HttpClient client)
{
    public async Task<string> GetDataAsync(CancellationToken ct)
        => await client.GetStringAsync("https://api.example.com/data", ct);
}
```

### Never Capture Scoped Services Directly in Unbounded Background Threads

```csharp
// ❌ Accessing scoped DbContext in detached Task.Run fails when request scope disposes
_ = Task.Run(async () =>
{
    await context.SaveChangesAsync(); // Throws ObjectDisposedException!
});

// ✅ Create a dedicated async service scope
_ = Task.Run(async () =>
{
    await using var scope = serviceScopeFactory.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.SaveChangesAsync();
});
```

---

## LINQ Best Practices

### Streamline Filtering Before Materialization

```csharp
// ❌ Materializing full table into memory before filtering
var results = context.Posts
    .ToList() // Fetches entire table across the network!
    .Where(p => p.Title.StartsWith("A"));

// ✅ Push filtering into SQL database query
var results = await context.Posts
    .Where(p => p.Title.StartsWith("A"))
    .ToListAsync();
```

### `AnyAsync()` vs `CountAsync() > 0`

```csharp
// ❌ CountAsync evaluates the entire count before returning
if (await context.Users.CountAsync() > 0) { ... }

// ✅ AnyAsync generates SELECT 1 / EXISTS and returns on the first match
if (await context.Users.AnyAsync()) { ... }
```

### Avoid Multiple Enumeration of `IEnumerable`

```csharp
// ❌ Multiple enumerations of raw IEnumerable
public void Process(IEnumerable<int> numbers)
{
    if (numbers.Any()) // First enumeration
    {
        foreach (var n in numbers) // Second enumeration
        {
            Console.WriteLine(n);
        }
    }
}

// ✅ Materialize once if multi-pass evaluation is necessary
public void Process(IEnumerable<int> numbers)
{
    var list = numbers as IReadOnlyList<int> ?? numbers.ToList();
    if (list.Count > 0)
    {
        foreach (var n in list)
        {
            Console.WriteLine(n);
        }
    }
}
```

---

## Review Checklist

### Asynchronous Execution
- [ ] Zero usage of `.Result`, `.Wait()`, or `async void`.
- [ ] Non-UI library routines leverage `.ConfigureAwait(false)`.
- [ ] `CancellationToken` accepted and forwarded through all async methods.
- [ ] Streams and unmanaged resources implement `IAsyncDisposable` and `await using`.

### EF Core & Database Tier
- [ ] Navigational properties eager-loaded or projected; zero N+1 iteration queries.
- [ ] Queries project only required fields (`.Select()`) rather than entire entity graphs.
- [ ] All collection endpoints enforce pagination (`.Skip()`, `.Take()`).
- [ ] Multiple `.Include()` collections paired with `.AsSplitQuery()`.
- [ ] Read-only query paths marked with `.AsNoTracking()`.

### ASP.NET Core & Architecture
- [ ] `HttpClient` managed via `IHttpClientFactory` or typed DI clients.
- [ ] Background threads never reuse request-scoped services; create a new `AsyncScope`.
- [ ] Scoped services never injected into Singleton components.
- [ ] LINQ filters applied to `IQueryable` before calling `.ToListAsync()`.
