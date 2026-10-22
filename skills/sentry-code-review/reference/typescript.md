# TypeScript / JavaScript Code Review Guide

> Comprehensive TypeScript and JavaScript code review guide covering strict type safety, generic constraints, mapped and conditional types, asynchronous patterns, immutability, and TypeScript 5.x modern idioms.

## Table of Contents

- [Core Type Safety Principles](#core-type-safety-principles)
- [Generic Patterns & Constraints](#generic-patterns--constraints)
- [Advanced Types & Discriminated Unions](#advanced-types--discriminated-unions)
- [Strict Compiler Settings](#strict-compiler-settings)
- [Asynchronous Best Practices](#asynchronous-best-practices)
- [Immutability & Const Assertions](#immutability--const-assertions)
- [TypeScript 5.x Features](#typescript-5x-features)
- [Review Checklist](#review-checklist)

---

## Core Type Safety Principles

### Avoid `any`; Prefer Strongly-Typed Interfaces or `unknown`

```typescript
// ❌ Using any disables all static type checking and introduces runtime vulnerability
function processData(data: any) {
  return data.value; // No compile-time guarantee that `value` exists!
}

// ✅ Explicit strongly-typed schema
interface DataPayload {
  value: string;
}
function processData(data: DataPayload): string {
  return data.value;
}

// ✅ Use `unknown` with runtime type narrowing guards for untrusted input
function processUnknown(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    const val = (data as { value: unknown }).value;
    if (typeof val === 'string') return val;
  }
  throw new TypeError('Invalid payload shape');
}
```

### Type Narrowing & Custom Type Guards

```typescript
// ❌ Dangerous type assertions bypass compiler validation
function getLength(value: string | string[]): number {
  return (value as string[]).length; // Throws error or behaves unexpectedly if value is a string
}

// ✅ Narrowing with native type guards
function getLength(value: string | string[]): number {
  if (Array.isArray(value)) {
    return value.length; // Narrowed to string[]
  }
  return value.length;   // Narrowed to string
}

// ✅ Custom user-defined type guard
function isApiResponse(obj: unknown): obj is { data: Record<string, unknown> } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'data' in obj &&
    typeof (obj as any).data === 'object'
  );
}
```

### Const Assertions for Literal Narrowing

```typescript
// ❌ Inferred as broad string types
const config = {
  endpoint: '/api/v1',
  method: 'GET', // Inferred as type `string`
};

// ✅ Const assertion locks literal values and makes properties deeply readonly
const config = {
  endpoint: '/api/v1',
  method: 'GET',
} as const; // method is type literal 'GET'
```

---

## Generic Patterns & Constraints

### Constraining Generics via `extends`

```typescript
// ❌ Unconstrained generic cannot safely index properties
function getProperty<T>(obj: T, key: string) {
  return obj[key]; // Compile Error: Element implicitly has an 'any' type
}

// ✅ Constrained generic using `keyof` index lookup
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Alice', age: 30 };
const userName = getProperty(user, 'name'); // Type: string
const userAge = getProperty(user, 'age');   // Type: number
// getProperty(user, 'invalid');             // Compile-time Error!
```

---

## Advanced Types & Discriminated Unions

### Exhaustive Discriminated Unions

```typescript
type ApiResponse<T> =
  | { success: true; data: T; timestamp: number }
  | { success: false; error: string; code: number };

function handleResponse<T>(res: ApiResponse<T>) {
  if (res.success) {
    console.log(res.data); // Safely narrowed to success branch
  } else {
    console.error(res.error, res.code); // Safely narrowed to error branch
  }
}

// ✅ Exhaustive switch with `never` assertion check
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.size ** 2;
    default: {
      const _exhaustiveCheck: never = shape;
      throw new Error(`Unhandled shape: ${_exhaustiveCheck}`);
    }
  }
}
```

---

## Strict Compiler Settings

Ensure `tsconfig.json` enforces enterprise strict flags:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

---

## Asynchronous Best Practices

### Avoid Floating Promises & Unhandled Rejections

```typescript
// ❌ Floating promise ignores errors and runs detached
function logEvent(event: string) {
  sendTelemetryAsync(event); // If this rejects, it causes unhandled rejection!
}

// ✅ Either await, return, or explicitly catch detached promises
function logEvent(event: string) {
  void sendTelemetryAsync(event).catch(err => {
    console.error('Telemetry failed:', err);
  });
}
```

---

## TypeScript 5.x Features

### The `satisfies` Operator

```typescript
// ✅ Validates object conforms to a contract without widening specific literal types
type Theme = Record<string, string | number[]>;

const palette = {
  primary: '#3b82f6',
  accent: [255, 0, 128],
} satisfies Theme;

// Specific types are preserved for autocomplete and operations:
palette.primary.toUpperCase(); // Type string preserved!
palette.accent.map(n => n * 2); // Type number[] preserved!
```

---

## Review Checklist

### Type Precision
- [ ] No explicit or implicit `any` typings; `unknown` used with narrowing guards.
- [ ] Discriminated unions implement exhaustive checks via `never`.
- [ ] String literals and event dictionaries typed with `as const`.
- [ ] Optional parameters marked with `?` rather than `| undefined`.

### Compiler Hygiene
- [ ] `strictNullChecks` and `noUncheckedIndexedAccess` enabled.
- [ ] No unsafe type assertions (`as unknown as Target`) without justification.
- [ ] `satisfies` operator used to enforce schemas without widening literal values.

### Asynchronous Flow
- [ ] All Promise rejections handled or forwarded (`await` or `void promise.catch()`).
- [ ] Multi-operation asynchronous tasks bounded by `Promise.all` with concurrency limits.
