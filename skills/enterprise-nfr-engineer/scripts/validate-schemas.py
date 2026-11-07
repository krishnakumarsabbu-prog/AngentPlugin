#!/usr/bin/env python3
"""
Validate all JSON schemas in the schemas/ directory.

Checks that:
1. Each schema file is valid JSON.
2. Each schema has $schema, $id, title, type, and properties.
3. Required fields are listed and match properties.

Usage:
    python3 scripts/validate-schemas.py
"""

import json
import os
import sys

SCHEMA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "schemas")

REQUIRED_META = ["$schema", "$id", "title", "type"]


def validate_schema(filepath):
    """Validate a single JSON schema file. Returns list of errors."""
    errors = []
    filename = os.path.basename(filepath)

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            schema = json.load(f)
    except json.JSONDecodeError as e:
        return [f"{filename}: invalid JSON — {e}"]
    except FileNotFoundError:
        return [f"{filename}: file not found"]

    for field in REQUIRED_META:
        if field not in schema:
            errors.append(f"{filename}: missing required meta field '{field}'")

    if schema.get("type") != "object":
        errors.append(f"{filename}: schema type must be 'object'")

    if "properties" not in schema:
        errors.append(f"{filename}: missing 'properties'")
    elif "required" in schema:
        prop_names = set(schema.get("properties", {}).keys())
        for req in schema["required"]:
            if req not in prop_names:
                errors.append(f"{filename}: required field '{req}' not in properties")

    if errors:
        return errors
    print(f"  [OK] {filename} — valid schema with {len(schema.get('properties', {}))} properties")
    return []


def main():
    if not os.path.isdir(SCHEMA_DIR):
        print(f"ERROR: schemas directory not found: {SCHEMA_DIR}")
        sys.exit(1)

    schema_files = sorted(
        os.path.join(SCHEMA_DIR, f)
        for f in os.listdir(SCHEMA_DIR)
        if f.endswith(".schema.json")
    )

    if not schema_files:
        print("ERROR: no .schema.json files found in schemas/")
        sys.exit(1)

    print(f"Validating {len(schema_files)} schema(s) in {SCHEMA_DIR}\n")

    all_errors = []
    for filepath in schema_files:
        errors = validate_schema(filepath)
        all_errors.extend(errors)

    if all_errors:
        print(f"\nValidation FAILED with {len(all_errors)} error(s):")
        for e in all_errors:
            print(f"  [FAIL] {e}")
        sys.exit(1)
    else:
        print(f"\nAll {len(schema_files)} schema(s) passed validation.")
        sys.exit(0)


if __name__ == "__main__":
    main()
