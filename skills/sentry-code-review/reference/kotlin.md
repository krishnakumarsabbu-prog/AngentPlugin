# Kotlin & Android Code Review Guide

> Production code review guide for modern Kotlin and Android covering coroutine scopes, cancellation semantics, Flow lifecycle collectors, Jetpack Compose recomposition performance, null safety, memory leak prevention, and sealed class state modeling.

## Table of Contents

- [Coroutines: Scopes & Cancellation](#coroutines-scopes--cancellation)
- [Flow Lifecycle & Collection Traps](#flow-lifecycle--collection-traps)
- [Jetpack Compose Recomposition Hygiene](#jetpack-compose-recomposition-hygiene)
- [Null Safety Idioms](#null-safety-idioms)
- [Memory Leak Prevention](#memory-leak-prevention)
- [Architecture: ViewModel & Repository Seams](#architecture-viewmodel--repository-seams)
- [Sealed Class State Modeling](#sealed-class-state-modeling)
- [Review Checklist](#review-checklist)

---

## Coroutines: Scopes & Cancellation

### Avoid `GlobalScope`

```kotlin
// ❌ GlobalScope has unbounded lifetime; continues executing after Activity/Fragment destruction
GlobalScope.launch {
    val data = api.fetchData()
    binding.textView.text = data.title // Crash: view already destroyed!
}

// ✅ Use viewModelScope — automatically cancelled when ViewModel clears
class MyViewModel(private val repo: Repository) : ViewModel() {
    fun loadData() {
        viewModelScope.launch {
            val data = repo.fetchData()
            _uiState.value = UiState.Success(data)
        }
    }
}

// ✅ Use lifecycleScope in Activity/Fragment
class MyActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launch {
            val data = repo.fetchData()
            binding.textView.text = data.title
        }
    }
}
```

### Never Swallow `CancellationException`

```kotlin
// ❌ Catching generic Exception intercepts CancellationException and breaks cooperative cancellation
viewModelScope.launch {
    try {
        repo.fetchData()
    } catch (e: Exception) {
        // CancellationException swallowed; coroutine fails to cancel!
        showError(e)
    }
}

// ✅ Explicitly rethrow CancellationException
viewModelScope.launch {
    try {
        repo.fetchData()
    } catch (e: CancellationException) {
        throw e // Must rethrow to propagate cancellation
    } catch (e: Exception) {
        showError(e)
    }
}

// ✅ Or invoke ensureActive() inside catch block
viewModelScope.launch {
    try {
        repo.fetchData()
    } catch (e: Exception) {
        ensureActive() // Rethrows CancellationException if cancelled
        showError(e)
    }
}
```

### Dispatcher Selection

- **`Dispatchers.Main`**: UI updates and lightweight invocations.
- **`Dispatchers.IO`**: Database queries, network requests, and disk operations.
- **`Dispatchers.Default`**: CPU-intensive tasks (JSON parsing, encryption, sorting large lists).

---

## Flow Lifecycle & Collection Traps

### Collect Flows with `repeatOnLifecycle` in Android Views

```kotlin
// ❌ Collecting flow directly in lifecycleScope keeps flow active in the background
lifecycleScope.launch {
    viewModel.uiState.collect { state ->
        render(state) // Continues collecting even when app is backgrounded!
    }
}

// ✅ repeatOnLifecycle stops collection when lifecycle drops below target state
lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect { state ->
            render(state)
        }
    }
}
```

### `StateFlow` vs `SharedFlow`

- **`StateFlow`**: State holders with an initial value and equality deduplication (`distinctUntilChanged`). Ideal for UI state.
- **`SharedFlow`**: Event bus for one-off events (snackbars, navigation commands) without replay retention.

---

## Jetpack Compose Recomposition Hygiene

### Stabilize Parameters to Prevent Unnecessary Recomposition

```kotlin
// ❌ Passing unstable mutable collections causes recomposition on every parent change
@Composable
fun UserList(users: List<User>) { ... } // Standard List is treated as unstable by compiler

// ✅ Use kotlinx.collections.immutable or annotate with @Immutable
@Composable
fun UserList(users: ImmutableList<User>) { ... }
```

### Hoist State and Lambda Allocations

```kotlin
// ❌ Allocating lambda inside item iterator recreates instance for every row
LazyColumn {
    items(users) { user ->
        UserRow(user = user, onClick = { viewModel.selectUser(user) }) // New lambda per item
    }
}

// ✅ Pass stable method reference or hoist selector
LazyColumn {
    items(users, key = { it.id }) { user ->
        UserRow(user = user, onSelect = viewModel::selectUser)
    }
}
```

---

## Null Safety Idioms

### Prohibit Unsafe `!!` Force-Unwrapping

```kotlin
// ❌ Force-unwrapping throws NullPointerException on unexpected nulls
val length = text!!.length

// ✅ Safe call with Elvis fallback or requireNotNull with context
val length = text?.length ?: 0
val validatedText = requireNotNull(text) { "Text parameter cannot be null during submission" }
```

---

## Sealed Class State Modeling

```kotlin
// ✅ Exhaustive sealed hierarchy for UI states
sealed interface UiState {
    data object Loading : UiState
    data class Success(val data: List<Item>) : UiState
    data class Error(val message: String) : UiState
}

// In Compose or View:
when (val state = uiState) {
    is UiState.Loading -> ShowSpinner()
    is UiState.Success -> ShowList(state.data)
    is UiState.Error   -> ShowError(state.message)
    // Compiler guarantees exhaustiveness without an else branch!
}
```

---

## Review Checklist

### Coroutines & Concurrency
- [ ] No `GlobalScope` usage; coroutines bound to `viewModelScope` or `lifecycleScope`.
- [ ] `CancellationException` explicitly rethrown in all catch blocks.
- [ ] CPU-heavy computations periodically check `isActive` or call `ensureActive()`.
- [ ] Non-blocking dispatchers selected (`Dispatchers.IO` for disk/network, `Default` for CPU).

### Flow & Architecture
- [ ] UI collects Flow inside `repeatOnLifecycle(Lifecycle.State.STARTED)`.
- [ ] State modeled via `StateFlow` and one-off events via `SharedFlow`.
- [ ] UI states modeled using exhaustive `sealed interface` or `sealed class`.

### Compose & Memory
- [ ] `LazyColumn` items specify unique, stable `key` expressions.
- [ ] Zero force-unwraps (`!!`); replaced with safe calls (`?.`), Elvis (`?:`), or `checkNotNull`.
- [ ] No Android Context or View references held in static singletons or ViewModels.
