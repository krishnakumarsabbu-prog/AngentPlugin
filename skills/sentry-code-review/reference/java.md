# Java Code Review Guide

> Java code review guide focusing on modern Java (17/21+), Spring Boot 3 enterprise patterns, concurrency with Virtual Threads, JPA performance optimization, and clean architecture.
>
> For legacy Java 8 / Spring Boot 2 / `javax.*` architectures, refer to the [Java 8 Legacy Review Guide](java8.md).

## Table of Contents

- [Modern Java Features (17/21+)](#modern-java-features-1721)
- [Stream API & Optional Idioms](#stream-api--optional-idioms)
- [Spring Boot Best Practices](#spring-boot-best-practices)
- [JPA & Database Performance](#jpa--database-performance)
- [Concurrency & Virtual Threads](#concurrency--virtual-threads)
- [Lombok Usage Guidelines](#lombok-usage-guidelines)
- [Exception Handling](#exception-handling)
- [Testing Standards](#testing-standards)
- [Review Checklist](#review-checklist)

---

## Modern Java Features (17/21+)

### Record Classes for Immutable Data Carriers

```java
// ❌ Verbose traditional POJO / DTO with boilerplate getters, equals, and hashCode
public class UserDto {
    private final String name;
    private final int age;

    public UserDto(String name, int age) {
        this.name = name;
        this.age = age;
    }
    // getters, equals, hashCode, toString...
}

// ✅ Record: concise, immutable, and semantic
public record UserDto(String name, int age) {
    // Compact constructor enforces validation invariants
    public UserDto {
        if (age < 0) throw new IllegalArgumentException("Age cannot be negative");
    }
}
```

### Pattern Matching for Switch Expressions

```java
// ❌ Legacy switch statement prone to missing break statements and fall-through bugs
String type = "";
switch (obj) {
    case Integer i:
        type = String.format("int %d", i);
        break;
    case String s:
        type = String.format("string %s", s);
        break;
    default:
        type = "unknown";
}

// ✅ Switch expression: exhaustive, returns value directly, handles nulls cleanly
String type = switch (obj) {
    case Integer i -> "int %d".formatted(i);
    case String s  -> "string %s".formatted(s);
    case null      -> "null value"; // Java 21+ null case handling
    default        -> "unknown";
};
```

### Multi-Line Text Blocks

```java
// ❌ Escaped string concatenation
String json = "{\n" +
              "  \"name\": \"Alice\",\n" +
              "  \"age\": 20\n" +
              "}";

// ✅ Text block maintains readability without escape noise
String json = """
    {
      "name": "Alice",
      "age": 20
    }
    """;
```

---

## Stream API & Optional Idioms

### Avoid Over-Complicated or Unnecessary Streams

```java
// ❌ Using Stream overhead for trivial iterations
items.stream().forEach(item -> {
    process(item);
});

// ✅ Direct for-each loop is faster and easier to debug
for (var item : items) {
    process(item);
}
```

### Proper Usage of `Optional`

```java
// ❌ Anti-pattern: Optional as method parameter or entity field
public void process(Optional<String> name) { ... } // Complicates caller interface
public class User {
    private Optional<String> email; // Fails serialization!
}

// ✅ Optional should be used strictly as a method return type
public Optional<User> findUser(String id) { ... }

// ❌ Calling isPresent() followed by get() defeats the purpose of Optional
Optional<User> userOpt = findUser(id);
if (userOpt.isPresent()) {
    return userOpt.get().getName();
} else {
    return "Unknown";
}

// ✅ Functional composition with map and orElse
return findUser(id)
    .map(User::getName)
    .orElse("Unknown");
```

---

## Spring Boot Best Practices

### Constructor Injection Over Field Injection

```java
// ❌ Field injection (@Autowired) makes unit testing difficult and hides dependency bloat
@Service
public class UserService {
    @Autowired
    private UserRepository userRepo;
}

// ✅ Constructor injection guarantees immutability (final fields) and simplifies mocking
@Service
public class UserService {
    private final UserRepository userRepo;

    public UserService(UserRepository userRepo) {
        this.userRepo = userRepo;
    }
}
```

### Type-Safe `@ConfigurationProperties`

```java
// ❌ Hardcoded configuration secrets or scattered @Value annotations
@Value("${app.payment.api-key}")
private String apiKey;

// ✅ Type-safe, validated configuration records
@ConfigurationProperties(prefix = "app.payment")
public record PaymentProperties(String apiKey, int timeout, String url) {}
```

---

## JPA & Database Performance

### Prevent N+1 Query Degradation

```java
// ❌ Eager fetching or unbatched lazy traversal
@Entity
public class User {
    @OneToMany(fetch = FetchType.EAGER) // Dangerous global eager fetch
    private List<Order> orders;
}

// ✅ Dedicated JPQL query with JOIN FETCH
@Query("SELECT u FROM User u JOIN FETCH u.orders")
List<User> findAllWithOrders();

// ✅ Or declarative @EntityGraph
@EntityGraph(attributePaths = {"orders", "profile"})
List<User> findAll();
```

### Transaction Boundaries & Read-Only Optimization

```java
// ❌ Applying @Transactional on private methods (Spring AOP proxies will ignore it)
@Transactional
private void saveInternal() { ... }

// ✅ Placed on public Service methods; marked readOnly for read-only optimization
@Service
public class UserService {
    @Transactional(readOnly = true)
    public User getUser(Long id) { ... }

    @Transactional
    public void createUser(UserDto dto) { ... }
}
```

### Avoid Lombok `@Data` on JPA Entities

```java
// ❌ @Data generates equals/hashCode traversing relations, causing recursive loops or LazyInitializationException
@Entity
@Data
public class User { ... }

// ✅ Use @Getter and @Setter with ID-based equals/hashCode
@Entity
@Getter
@Setter
public class User {
    @Id
    private Long id;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User user)) return false;
        return id != null && id.equals(user.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
```

---

## Concurrency & Virtual Threads

### Java 21+ Virtual Threads

```java
// ❌ Exhausting OS threads with fixed thread pools on blocking I/O
ExecutorService executor = Executors.newFixedThreadPool(100);

// ✅ Virtual Threads achieve massive concurrent throughput on blocking I/O
// Enabled in Spring Boot 3.2+ via: spring.threads.virtual.enabled=true
ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
```

### Thread Safety Best Practices

```java
// ❌ SimpleDateFormat is NOT thread-safe
private static final SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");

// ✅ DateTimeFormatter is immutable and thread-safe
private static final DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd");

// ❌ HashMap accessed concurrently risks data corruption
// ✅ Use ConcurrentHashMap for shared concurrent caches
Map<String, String> cache = new ConcurrentHashMap<>();
```

---

## Exception Handling

### Centralized Exception Handling via `@RestControllerAdvice`

```java
// ❌ Catching and printing stack traces or returning null
try {
    userService.create(user);
} catch (Exception e) {
    e.printStackTrace();
    return null; // Swallows error!
}

// ✅ Explicit domain exceptions mapped via Spring ProblemDetail (RFC 7807)
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(UserNotFoundException.class)
    public ProblemDetail handleNotFound(UserNotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }
}
```

---

## Review Checklist

### Modern Java Language Standards
- [ ] Record classes used for DTOs and immutable payloads.
- [ ] Pattern matching and switch expressions used instead of verbose if-else chains.
- [ ] Text blocks used for multi-line JSON or SQL literals.
- [ ] `Optional` used strictly as a method return type.

### Spring Architecture & DI
- [ ] Constructor injection preferred over field `@Autowired`.
- [ ] Configuration grouped into typed `@ConfigurationProperties`.
- [ ] Controller methods delegate business logic to Service units.
- [ ] Exceptions handled uniformly via `@RestControllerAdvice` / ProblemDetail.

### Database & Concurrency
- [ ] Read-only transactions annotated with `@Transactional(readOnly = true)`.
- [ ] Relationship queries protected against N+1 regressions via JOIN FETCH or EntityGraph.
- [ ] Entities do not use Lombok `@Data`; equals/hashCode rely on entity identifiers.
- [ ] Thread-safe classes used for shared state (`ConcurrentHashMap`, `DateTimeFormatter`).
