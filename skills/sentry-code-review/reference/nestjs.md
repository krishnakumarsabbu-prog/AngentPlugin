# NestJS Code Review Guide

> Comprehensive NestJS review guide covering Dependency Injection, tiered architectures, modular organization, Guards, Interceptors, Pipes, DTO validation, error handling, circular dependencies, and isolated unit testing.

## Table of Contents

- [Dependency Injection & Layered Architecture](#dependency-injection--layered-architecture)
- [Module Organization](#module-organization)
- [Guards, Interceptors & Pipes](#guards-interceptors--pipes)
- [DTO Validation Patterns](#dto-validation-patterns)
- [Error Handling](#error-handling)
- [Circular Dependencies](#circular-dependencies)
- [Testing Patterns](#testing-patterns)
- [Review Checklist](#review-checklist)

---

## Dependency Injection & Layered Architecture

### Three-Tier Architecture: Controller → Service → Repository

```typescript
// ❌ Injecting ORM directly into Controller — skips service & business layer
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.user.findMany();
  }
}

// ✅ Strict boundary: Controller → Service → Repository
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  findAll() {
    return this.usersRepo.findAll();
  }
}
```

### Repositories Must Not Cross-Inject

```typescript
// ❌ Repository injecting another Repository — cross-domain orchestration belongs in Service
@Injectable()
export class OrdersRepository {
  constructor(private readonly usersRepository: UsersRepository) {}
}

// ✅ Cross-repository orchestration coordinated inside Service layer
@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly usersRepo: UsersRepository,
  ) {}
}
```

### God Service Anti-Pattern: Split Services with > 8 Dependencies

```typescript
// ❌ Monolithic service with excessive dependencies
@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly usersRepo: UsersRepository,
    private readonly productsRepo: ProductsRepository,
    private readonly paymentsService: PaymentsService,
    private readonly mailerService: MailerService,
    private readonly inventoryService: InventoryService,
    private readonly discountService: DiscountService,
    private readonly taxService: TaxService,
    private readonly auditService: AuditService,
  ) {}
}

// ✅ Decomposed into dedicated Use-Case services (one operation per class)
@Injectable()
export class CreateOrderService {
  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly paymentsService: PaymentsService,
  ) {}

  async execute(dto: CreateOrderDto) { /* ... */ }
}
```

### Symbol Tokens for Dependency Inversion

```typescript
// ❌ Direct coupling to concrete persistence class — prevents test mocking
@Injectable()
export class UsersService {
  constructor(private readonly repo: TypeOrmUserRepository) {}
}

// ✅ Interface + Symbol Token — seamlessly swapped with in-memory implementations in tests
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
}

// Module configuration:
{
  provide: USER_REPOSITORY,
  useClass: TypeOrmUserRepository,
}

// Service definition:
@Injectable()
export class UsersService {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}
}
```

---

## Module Organization

### Recommended Four-Layer Architecture

```
src/
  common/         ← Global technical infrastructure (Guards, Filters, Interceptors, Decorators)
  core/           ← Internal configuration & drivers (Database, Queue, Secrets)
  integrations/   ← External vendor integrations (Stripe, SES, S3, Twilio)
  modules/        ← Domain feature modules
    [feature]/
      dtos/
      repositories/
      services/
        internal/     ← Intra-module shared logic
        use-cases/    ← Single-action use-case handlers
      types/
      [feature].controller.ts
      [feature].module.ts
```

### Domain Logic Must Be Framework-Agnostic

```typescript
// ❌ Domain entity tightly coupled to NestJS decorators
import { Injectable } from '@nestjs/common';

@Injectable()
export class User {
  constructor(private readonly email: string) {}
}

// ✅ Clean pure domain entity without framework decorators
export class User {
  private constructor(private readonly email: string) {}

  static create(email: string): User {
    return new User(email);
  }
}
```

---

## Guards, Interceptors & Pipes

### Keep Business Rules Out of Guards

```typescript
// ❌ Guard querying database and evaluating business logic
@Injectable()
export class OrderOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const order = await this.prisma.order.findUnique({
      where: { id: req.params.id },
    });
    return order.userId === req.user.id; // DB query belongs in service layer
  }
}

// ✅ Guard strictly handles authentication & authorization (roles / JWT claims)
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

### Enforce Global ValidationPipe Whitelisting

```typescript
// ❌ Missing whitelist — permits arbitrary unvalidated properties through the boundary
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

// ✅ Whitelist and reject unexpected payload properties
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(3000);
}
```

---

## DTO Validation Patterns

### Pair `@ValidateNested()` with `@Type()`

```typescript
// ❌ Standalone @ValidateNested — nested validation is silently skipped by class-validator!
export class CreateOrderDto {
  @ValidateNested()
  shipping: AddressDto;
}

// ✅ Paired with @Type() from class-transformer
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => AddressDto)
  shipping: AddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

### Prohibit Untyped `@Body()` Payloads

```typescript
// ❌ Untyped any payload — zero validation, no type safety, empty OpenAPI documentation
@Post()
create(@Body() body: any) {
  return this.service.create(body);
}

// ✅ Strongly-typed DTO
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;
}

@Post()
create(@Body() dto: CreateUserDto) {
  return this.service.create(dto);
}
```

---

## Error Handling

### Never Swallow Exceptions Silently

```typescript
// ❌ Catch and return null — masks underlying database or connection failures
async findOne(id: string) {
  try {
    return await this.repo.findById(id);
  } catch (e) {
    return null;
  }
}

// ✅ Throw semantic HTTP exception
async findOne(id: string): Promise<User> {
  const user = await this.repo.findById(id);
  if (!user) {
    throw new NotFoundException(`User ${id} not found`);
  }
  return user;
}
```

---

## Circular Dependencies

### Avoid Circular Module References

```typescript
// ❌ Circular module dependency: Module A ↔ Module B
@Module({ imports: [UsersModule] })
export class OrdersModule {}

@Module({ imports: [OrdersModule] })
export class UsersModule {}

// ✅ Extract shared contracts into an independent third module
@Module({
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {}

@Module({ imports: [SharedModule] })
export class OrdersModule {}

@Module({ imports: [SharedModule] })
export class UsersModule {}
```

---

## Review Checklist

### Layering & DI
- [ ] Database drivers / ORM never injected directly into Controllers.
- [ ] Business decisions occur in Service / Use-Case layers.
- [ ] Repositories never inject sibling Repositories.
- [ ] No `forwardRef()` usage unless accompanied by architectural justification.

### Validation & Payloads
- [ ] All `@ValidateNested()` decorators paired with `@Type(() => TargetDto)`.
- [ ] Global `ValidationPipe` configured with `{ whitelist: true, forbidNonWhitelisted: true }`.
- [ ] No untyped `@Body() body: any` parameters.
- [ ] Mutation and creation actions separated via `PartialType`.

### Exception Handling
- [ ] Zero empty `catch` blocks or silent `null` returns on failure.
- [ ] Standardized NestJS semantic exceptions (`NotFoundException`, `ConflictException`).
- [ ] Global exception filter handles unexpected runtime errors uniformly.
