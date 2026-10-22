# Django / DRF Code Review Guide

> Production code review guide for Django and Django REST Framework (DRF) covering security hardening, QuerySet N+1 prevention, Serializer anti-patterns, ViewSet design, and async view mechanics.

## Table of Contents

- [Security Hardening](#security-hardening)
- [QuerySet Performance & N+1 Prevention](#queryset-performance--n1-prevention)
- [DRF Serializer Best Practices](#drf-serializer-best-practices)
- [ViewSet & View Architecture](#viewset--view-architecture)
- [Middleware & Settings](#middleware--settings)
- [Review Checklist](#review-checklist)

---

## Security Hardening

### CSRF Protection

```python
from django.views.decorators.csrf import csrf_exempt

# ❌ Disabling CSRF protection on mutation endpoints exposes users to cross-site attacks
@csrf_exempt
def process_payment(request):
    amount = request.POST["amount"]
    charge(amount)

# ✅ Retain default CSRF protection in settings.py
MIDDLEWARE = [
    # ...
    "django.middleware.csrf.CsrfViewMiddleware",
    # ...
]

# ✅ In DRF APIs, rely on Token or JWT authentication
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
}
```

### Production Cookie Security

```python
# settings.py

# ❌ Insecure cookie flags permit transmission over plaintext HTTP and JS extraction
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = False

# ✅ Production cookie configuration
SESSION_COOKIE_SECURE = True     # Transmitted over HTTPS only
SESSION_COOKIE_HTTPONLY = True   # Inaccessible to document.cookie (mitigates XSS extraction)
SESSION_COOKIE_SAMESITE = "Lax"  # Mitigates CSRF
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"
```

### File Upload Validation

```python
# ✅ Validate file extension and MIME type at the boundary
import mimetypes
from pathlib import Path
from django.core.exceptions import ValidationError

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}

def validate_upload(file):
    ext = Path(file.name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(f"File extension {ext} is not allowed.")
    mime, _ = mimetypes.guess_type(file.name)
    if mime not in ALLOWED_MIME_TYPES:
        raise ValidationError("Invalid MIME type content.")
```

---

## QuerySet Performance & N+1 Prevention

### `select_related` for Single-Valued Relationships (ForeignKey / OneToOne)

```python
# ❌ N+1: Each book iteration fires a distinct query for publisher
books = Book.objects.all()
for book in books:
    print(book.publisher.name) # Fires N extra queries!

# ✅ select_related performs a single SQL JOIN query
books = Book.objects.select_related("publisher")
for book in books:
    print(book.publisher.name) # Zero additional database lookups
```

### `prefetch_related` for Multi-Valued Relationships (ManyToMany / Reverse ForeignKey)

```python
# ❌ N+1: Iterating author.books triggers N queries
authors = Author.objects.all()
for author in authors:
    print(list(author.books.all()))

# ✅ prefetch_related executes 2 queries and joins records in Python
authors = Author.objects.prefetch_related("books")
for author in authors:
    print(list(author.books.all())) # Resolved from prefetch cache

# ✅ Granular control via Prefetch object
from django.db.models import Prefetch

authors = Author.objects.prefetch_related(
    Prefetch(
        "books",
        queryset=Book.objects.filter(is_published=True).only("id", "title", "author_id"),
        to_attr="published_books",
    )
)
```

### `count()` vs `len()` vs `exists()`

```python
# ❌ Calling len() loads the entire table into Python RAM just to count rows
total = len(Book.objects.all()) # Heavy SELECT *

# ✅ count() executes efficient SQL SELECT COUNT(*) on the database engine
total = Book.objects.count()

# ❌ if qs loads all rows into memory
if Book.objects.filter(author_id=author_id):
    pass

# ✅ exists() generates lightweight SELECT 1 / EXISTS query
if Book.objects.filter(author_id=author_id).exists():
    pass
```

---

## DRF Serializer Best Practices

### Prohibit `fields = "__all__"` on Sensitive Models

```python
from rest_framework import serializers

# ❌ Exposing all fields leaks password hashes, permissions, and internal flags
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = "__all__" # Vulnerability: leaks password, is_staff, is_superuser!

# ✅ Explicit whitelist of exposed fields; password configured write_only
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "password"]

    def create(self, validated_data):
        user = User(**validated_data)
        user.set_password(validated_data["password"])
        user.save()
        return user
```

---

## Review Checklist

### Security
- [ ] No usage of `@csrf_exempt` on state-changing endpoints without alternative token guards.
- [ ] Cookies configured with `SECURE=True`, `HTTPONLY=True`, and `SAMESITE="Lax"` or `"Strict"`.
- [ ] File uploads validate extensions, MIME types, and restrict size limits.
- [ ] Zero raw SQL queries using string formatting or unparameterized concatenation.

### QuerySet Optimization
- [ ] `select_related` applied to `ForeignKey` and `OneToOne` relations.
- [ ] `prefetch_related` applied to `ManyToMany` and reverse relations.
- [ ] `exists()` used for existence checks; `count()` used for isolated counting.
- [ ] `only()` or `defer()` applied when accessing large text / JSON columns.

### Serializers & APIs
- [ ] No `fields = "__all__"` in serializers handling sensitive models.
- [ ] Sensitive input fields marked `write_only=True`.
- [ ] All input mutation fields validated with explicit field validators or `validate_<field>()`.
