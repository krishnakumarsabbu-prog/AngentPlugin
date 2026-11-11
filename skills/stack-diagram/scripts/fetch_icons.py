#!/usr/bin/env python3
"""Resolve brand logos from local files only. This script never uses the network.

Usage:
    python3 fetch_icons.py OUTDIR [--logos LOGODIR] spec [spec ...]

Spec forms:
    name              -> look up a local logo named name
    name:slug         -> look up a local logo named slug
    name=PATH         -> copy a local image file
    name:aws/Service  -> look up a local logo named Service (and aws/Service)
    name:gcp/Product  -> look up a local logo named Product (and gcp/Product)
    name:azure/Service-> look up a local logo named Service (and azure/Service)

Lookup order:
    1. the exact relative path inside LOGODIR
    2. the file stem (case- and separator-insensitive)
    3. the vendor-qualified name without its prefix
    4. a matching dark variant in LOGODIR/_dark or <name>.dark.<ext>

No remote source is contacted. When a logo is missing, a text-placeholder SVG is
written so diagram generation never breaks. Put logos under assets/logos/ (or pass
--logos DIR); the skill does not download anything.
"""

import json
import pathlib
import re
import sys

IMAGE_EXTS = {".svg", ".png", ".webp", ".jpg", ".jpeg"}
DEFAULT_LOGOS = pathlib.Path(__file__).resolve().parent.parent / "assets" / "logos"


def normalize_key(value):
    """Normalize a name for case- and separator-insensitive lookup."""
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def save_icon(outdir, name, data, ext, *, dark=False):
    """Write icon bytes to OUTDIR/<name>.<ext> (or OUTDIR/_dark/...)."""
    target_dir = outdir if not dark else (outdir / "_dark")
    target_dir.mkdir(parents=True, exist_ok=True)
    path = target_dir / f"{name}.{ext.lstrip('.')}"
    path.write_bytes(data)
    return path


def placeholder_svg(name):
    """Return a text-placeholder SVG for when a local logo is missing."""
    safe = name.replace("&", "&amp;").replace("<", "&lt;")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
<rect width="60" height="60" rx="8" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>
<text x="30" y="36" font-family="sans-serif" font-size="10" fill="#888" text-anchor="middle">{safe}</text>
</svg>'''.encode()


def index_logos(logo_dir):
    """Index local light/dark logo files by relative path, stem, and normalized key."""
    light = {}
    dark = {}
    if not logo_dir or not logo_dir.is_dir():
        return light, dark

    for path in logo_dir.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTS:
            continue
        rel = path.relative_to(logo_dir).with_suffix("").as_posix()
        parts = rel.split("/")
        is_dark = any(part.lower() in ("_dark", "dark") for part in parts[:-1])
        stem = parts[-1]
        if stem.lower().endswith(".dark"):
            stem = stem[:-5]
            is_dark = True

        keys = {rel, stem, parts[-1]}
        if is_dark:
            keys = {k[:-5] if k.lower().endswith(".dark") else k for k in keys}
        bucket = dark if is_dark else light
        for key in keys:
            bucket.setdefault(key, path)
            bucket.setdefault(normalize_key(key), path)

    return light, dark


def candidate_keys(value):
    """Return lookup keys for a spec value."""
    raw = value.strip().replace("\\", "/")
    base = raw.rsplit("/", 1)[-1]
    keys = {raw, base}
    for prefix in ("aws/", "gcp/", "azure/"):
        if raw.lower().startswith(prefix):
            keys.add(raw[len(prefix):])
            keys.add(raw.replace("/", "-"))
            keys.add(f"{prefix[:-1]}-{base}")
    expanded = set()
    for key in keys:
        expanded.add(key)
        expanded.add(normalize_key(key))
    return [key for key in expanded if key]


def find_logo(index, value):
    """Find a local logo by spec value."""
    for key in candidate_keys(value):
        hit = index.get(key)
        if hit:
            return hit
    return None


def resolve_local_path(value):
    """Return a local image path if value is an existing local file."""
    path = pathlib.Path(value).expanduser()
    if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
        return path
    return None


def parse_spec(spec):
    """Parse a spec string into (name, kind, value)."""
    if "=" in spec:
        name, value = spec.split("=", 1)
        return name, "path", value
    if ":" in spec:
        name, slug = spec.split(":", 1)
        return name, "local", slug
    return spec, "local", spec


def main():
    args = sys.argv[1:]
    logo_dir = DEFAULT_LOGOS
    if "--logos" in args:
        i = args.index("--logos")
        if i + 1 >= len(args):
            print("error: --logos requires a directory")
            sys.exit(1)
        logo_dir = pathlib.Path(args[i + 1]).expanduser()
        del args[i:i + 2]

    if len(args) < 2:
        print(__doc__)
        sys.exit(1)

    outdir = pathlib.Path(args[0])
    specs = args[1:]
    outdir.mkdir(parents=True, exist_ok=True)
    light_index, dark_index = index_logos(logo_dir)

    manifest = {"icons": [], "fallbacks": [], "dark": [], "logo_dir": str(logo_dir)}

    for spec in specs:
        name, kind, value = parse_spec(spec)
        source = None

        if kind == "path":
            if "://" in value:
                print(f"  {name}: refused remote URL (network access is disabled)")
                source = None
            else:
                source = resolve_local_path(value)
                if not source:
                    print(f"  {name}: local file not found: {value}")
        else:
            source = find_logo(light_index, value)

        if source:
            ext = source.suffix.lower().lstrip(".")
            save_icon(outdir, name, source.read_bytes(), ext)
            manifest["icons"].append({"name": name, "ext": ext, "source": "local"})
            print(f"  {name}: copied from {source}")

            dark_source = find_logo(dark_index, value)
            if dark_source:
                dark_ext = dark_source.suffix.lower().lstrip(".")
                save_icon(outdir, name, dark_source.read_bytes(), dark_ext, dark=True)
                manifest["dark"].append(name)
        else:
            save_icon(outdir, name, placeholder_svg(name), "svg")
            manifest["fallbacks"].append(name)
            print(f"  {name}: fallback placeholder (no local logo found)")

    (outdir / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    total = len(manifest["icons"])
    fallbacks = len(manifest["fallbacks"])
    print(f"\nResolved {total} local icons, {fallbacks} fallbacks -> {outdir}")
    print("No network access was used.")


if __name__ == "__main__":
    main()
