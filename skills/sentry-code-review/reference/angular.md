# Angular Code Review Guide

> Angular 17+ code review guide covering Signals, OnPush change detection, Standalone components, RxJS lifecycle management, Zoneless architectures, template best practices, and dependency injection patterns.

## Table of Contents

- [Signals & Change Detection](#signals--change-detection)
- [Standalone Component Architecture](#standalone-component-architecture)
- [RxJS Anti-Patterns & Lifecycle Management](#rxjs-anti-patterns--lifecycle-management)
- [Zoneless Change Detection](#zoneless-change-detection)
- [Template Best Practices](#template-best-practices)
- [Performance Optimization](#performance-optimization)
- [Testing Patterns](#testing-patterns)
- [Functional Route Guards](#functional-route-guards)
- [Dependency Injection Patterns](#dependency-injection-patterns)
- [HttpInterceptor Patterns](#httpinterceptor-patterns)
- [Review Checklist](#review-checklist)

---

## Signals & Change Detection

### Signals + OnPush Strategy

```typescript
// ❌ Direct mutable state with OnPush change detection fails to trigger updates
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ data.name }}</p>`,
})
export class UserProfile {
  data = { name: 'Alice' };
  changeName() { this.data.name = 'Bob'; } // UI will NOT update!
}

// ✅ Signal paired with OnPush provides precise, automatic reactivity
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ name() }}</p>`,
})
export class UserProfile {
  name = signal('Alice');
  changeName() { this.name.set('Bob'); } // Automatically schedules change detection
}
```

### Mutating `@Input()` Objects Bypasses OnPush Detection

```typescript
// ❌ In-place mutation of input object retains the same memory reference
@Input() config!: Config;
updateConfig() { this.config.theme = 'dark'; }

// ✅ Creating an immutable new reference notifies OnPush ancestors
updateConfig() { this.config = { ...this.config, theme: 'dark' }; }
```

### Use `computed()` for Derived State

```typescript
// ❌ Anti-pattern: using effect() to synchronize derived state causes extra CD cycles
export class CartComponent {
  total = signal(0);
  discounted = signal(0);

  constructor() {
    effect(() => this.discounted.set(this.total() * 0.9));
  }
}

// ✅ computed() provides lazy, memoized, glitch-free derivation
export class CartComponent {
  total = signal(0);
  discounted = computed(() => this.total() * 0.9);
}
```

### Signal Dependencies Read After `await` Are Not Tracked in `effect()`

```typescript
// ❌ Reading signal after an async await point loses reactive tracking
effect(async () => {
  const data = await fetchUserData();
  console.log(`Theme: ${theme()}`); // theme() is NOT tracked!
});

// ✅ Read signal synchronously before any await
effect(async () => {
  const currentTheme = theme(); // Tracked dependency
  const data = await fetchUserData();
  console.log(`Theme: ${currentTheme}`);
});
```

---

## Standalone Component Architecture

### Standalone is the Default in Modern Angular

```typescript
// ❌ Legacy NgModule architecture
@Component({
  selector: 'old-component',
  standalone: false,
})
export class OldComponent {}

// ✅ Modern standalone component with explicit imports
@Component({
  selector: 'user-profile',
  imports: [ProfilePhoto, RouterLink],
  template: `<profile-photo /><a routerLink="/edit">Edit</a>`,
})
export class UserProfile {}
```

---

## RxJS Anti-Patterns & Lifecycle Management

### Subscriptions Must Use `takeUntilDestroyed`

```typescript
// ❌ Unmanaged subscription creates permanent memory leak after component destruction
@Component({ /* ... */ })
export class UserProfile implements OnInit {
  ngOnInit() {
    this.data$.subscribe(data => this.processData(data));
  }
}

// ✅ takeUntilDestroyed automatically unsubscribes on teardown
@Component({ /* ... */ })
export class UserProfile {
  constructor() {
    this.data$.pipe(takeUntilDestroyed()).subscribe(data => {
      this.processData(data);
    });
  }
}

// Outside constructor: pass DestroyRef explicitly
@Component({ /* ... */ })
export class UserProfile {
  private destroyRef = inject(DestroyRef);

  startListening() {
    this.data$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(/* ... */);
  }
}
```

### Prefer `toSignal` Over `AsyncPipe`

```typescript
// ❌ AsyncPipe in template requires importing AsyncPipe and complex syntax
@Component({
  imports: [AsyncPipe],
  template: `{{ data$ | async }}`,
})

// ✅ toSignal bridges RxJS stream into native signal with automatic cleanup
export class UserProfile {
  data = toSignal(this.data$, { initialValue: null });
}
```

---

## Zoneless Change Detection

### Regular Field Mutations Are Ignored in Zoneless Mode

```typescript
// ❌ Direct property mutation does not trigger change detection in Zoneless mode
export class UserService {
  user: User | null = null;
  loadUser() { this.user = fetchResult; } // UI will NOT update!
}

// ✅ Signal updates notify the framework scheduler automatically
export class UserService {
  private _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  loadUser() { this._user.set(fetchResult); }
}
```

---

## Template Best Practices

### Prefer Native Property Bindings Over `NgClass` / `NgStyle`

```typescript
// ❌ Extra directive overhead
template: `<div [ngClass]="{ active: isActive }" [ngStyle]="{ color: textColor }">`

// ✅ Native property bindings offer superior performance and type safety
template: `<div [class.active]="isActive" [style.color]="textColor">`
```

### Mark Template-Bound Members `protected`

```typescript
// ✅ Expose template-only methods and signals as protected rather than public
export class UserProfile {
  protected formatName(name: string) { return name.trim(); }
}
```

---

## Functional Route Guards

```typescript
// ✅ Functional CanActivateFn guard (Angular 15+)
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
```

---

## Functional HttpInterceptor

```typescript
// ✅ Modern functional interceptor with inject()
export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const token = inject(AuthService).token();
  if (!token) return next(req);

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  }));
}

// Registration in app bootstrap:
provideHttpClient(withInterceptors([authInterceptor]))
```

---

## Review Checklist

### Signals & Reactivity
- [ ] OnPush change detection applied across all feature components.
- [ ] Mutable state replaced with Signals (`signal()`, `computed()`).
- [ ] No `effect()` used for derived state (use `computed()` instead).
- [ ] In `effect()`, reactive signals read synchronously before any `await`.

### Architecture & RxJS
- [ ] Components are standalone (`imports` array declared on `@Component`).
- [ ] All manual `.subscribe()` calls bounded by `takeUntilDestroyed()`.
- [ ] In Zoneless mode, all state updates routed through Signals or `markForCheck()`.
- [ ] Native class and style bindings preferred over `NgClass` and `NgStyle`.
- [ ] HTTP interceptors and Route Guards implemented using modern functional APIs.
