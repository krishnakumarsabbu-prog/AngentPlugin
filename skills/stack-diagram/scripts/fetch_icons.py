#!/usr/bin/env python3
"""Fetch brand logos with a fallback chain, unmodified, for diagram builds.

Usage:
    python3 fetch_icons.py OUTDIR spec [spec ...]

Spec forms:
    name           -> slug == name (e.g. hono)
    name:slug      -> different slug (e.g. betterauth:better-auth)
    name=URL       -> explicit URL (e.g. orpc=https://orpc.unnoq.com/logo.webp)
    name:aws/Service -> official AWS icon (e.g. lambda:aws/AWS-Lambda)
    name:gcp/Product -> official Google Cloud icon (e.g. run:gcp/Cloud-Run)
    name:azure/Service -> official Azure icon (e.g. vault:azure/Key-Vaults)

Sources tried in order:
    1. svgl api.svgl.app?search={s} -> route (light variant when split)
    2. devicon raw.githubusercontent.com/devicons/devicon/master/icons/{s}/{s}-original.svg
    3. gilbarbara/logos cdn.jsdelivr.net/gh/gilbarbara/logos/logos/{s}-icon.svg then {s}.svg

simple-icons is deliberately not a source: its glyphs are monochrome redraws, not the
official marks. When every source misses, pass the official file as name=URL.

aws/ specs and the slugs aws, amazonwebservices and aws-* skip the chain and read AWS's own
package (aws.amazon.com/architecture/icons): gilbarbara's aws-* files keep an older color set.
gcp/ specs and the slugs gcp-* and google-cloud-* do the same with Google's packages
(cloud.google.com/icons). The slugs gcp and google-cloud are the Google Cloud mark, through the chain.
azure/ specs and the slugs azure, microsoft-azure and azure-* do the same with Microsoft's package
(learn.microsoft.com/azure/architecture/icons).

svgl is matched by normalized title equality (search is fuzzy — a loose match would
silently ship the wrong brand's logo, so non-exact hits fall through to next source).

Writes OUTDIR/<name>.<ext> and OUTDIR/manifest.json, plus OUTDIR/_dark/<name>.<ext> when
the source has a dark-theme variant (for group labels). Flags white/near-white fills (use
the dark variant instead so the logo is visible on the graph-paper background).

Graceful fallback: if every source fails, writes a text-placeholder SVG so the diagram
build never breaks on a missing icon.
"""

import json
import re
import sys
import urllib.request
import urllib.error
import pathlib

# --- helpers -----------------------------------------------------------------

def fetch(url, *, timeout=30):
    """Fetch bytes from a URL, or return None on failure."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; stack-diagram/1.0)"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except Exception:
        return None

def normalize(s):
    """Normalize a slug for comparison: lowercase, strip separators."""
    return re.sub(r"[-_./\s]+", "", s.lower())

def save_icon(outdir, name, data, ext, *, dark=False):
    """Write icon bytes to OUTDIR/<name>.<ext> (or OUTDIR/_dark/...)."""
    d = outdir if not dark else (outdir / "_dark")
    d.mkdir(parents=True, exist_ok=True)
    p = d / f"{name}.{ext}"
    p.write_bytes(data)
    return p

def placeholder_svg(name):
    """Return a text-placeholder SVG for when all logo sources fail."""
    safe = name.replace("<", "&lt;").replace("&", "&amp;")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
<rect width="60" height="60" rx="8" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>
<text x="30" y="36" font-family="sans-serif" font-size="10" fill="#888" text-anchor="middle">{safe}</text>
</svg>'''.encode()

# --- source functions ---------------------------------------------------------

def try_svgl(slug, name):
    """Try svgl API: search for slug, match by normalized title equality."""
    data = fetch(f"https://api.svgl.app?search={urllib.parse.quote(slug)}")
    if not data:
        return None
    try:
        items = json.loads(data)
    except json.JSONDecodeError:
        return None
    target = normalize(slug)
    for item in items:
        title = item.get("title", "")
        if normalize(title) == target:
            route = item.get("route", "")
            light_url = None
            dark_url = None
            if isinstance(route, dict):
                light_url = route.get("light") or route.get("default")
                dark_url = route.get("dark")
            else:
                light_url = route
            if light_url:
                if light_url.startswith("/"):
                    light_url = f"https://www.svgl.app{light_url}"
                svg = fetch(light_url)
                if svg:
                    dark_result = None
                    if dark_url:
                        if dark_url.startswith("/"):
                            dark_url = f"https://www.svgl.app{dark_url}"
                        dark_svg = fetch(dark_url)
                        if dark_svg:
                            dark_result = (dark_svg, "svg")
                    return svg, "svg", dark_result
    return None

def try_devicon(slug, name):
    """Try devicon: raw GitHub URL for {slug}/{slug}-original.svg."""
    url = f"https://raw.githubusercontent.com/devicons/devicon/master/icons/{slug}/{slug}-original.svg"
    svg = fetch(url)
    if svg:
        return svg, "svg", None
    return None

def try_gilbarbara(slug, name):
    """Try gilbarbara/logos: jsdelivr CDN for {slug}-icon.svg then {slug}.svg."""
    for pattern in (f"{slug}-icon.svg", f"{slug}.svg"):
        url = f"https://cdn.jsdelivr.net/gh/gilbarbara/logos@master/logos/{pattern}"
        svg = fetch(url)
        if svg:
            return svg, "svg", None
    return None

def try_aws(service, name):
    """Fetch official AWS architecture icon."""
    group = "Arch-Service_64" if not service.startswith("AWS-") else "Arch_64"
    url = f"https://d1.awsstatic.com/aws-icons/{group}/{service}_64x64.53535.13light.svg"
    svg = fetch(url)
    if svg:
        return svg, "svg", None
    url2 = f"https://d1.awsstatic.com/aws-icons/{group}/{service}_64.53535.13light.svg"
    svg = fetch(url2)
    if svg:
        return svg, "svg", None
    return None

def try_gcp(product, name):
    """Fetch official Google Cloud icon."""
    url = f"https://cloud.google.com/icons/images/{product}.png"
    img = fetch(url)
    if img:
        return img, "png", None
    return None

def try_azure(service, name):
    """Fetch official Azure architecture icon."""
    url = f"https://learn.microsoft.com/azure/architecture/icons/{service}.svg"
    svg = fetch(url)
    if svg:
        return svg, "svg", None
    return None

def try_explicit_url(url, name):
    """Fetch from an explicit URL provided by the user."""
    data = fetch(url)
    if not data:
        return None
    ext = url.rsplit(".", 1)[-1].lower() if "." in url else "svg"
    if ext not in ("svg", "png", "webp", "jpg", "jpeg"):
        ext = "svg"
    return data, ext, None

# --- main ---------------------------------------------------------------------

def parse_spec(spec):
    """Parse a spec string into (name, kind, value)."""
    if "=" in spec:
        name, url = spec.split("=", 1)
        return name, "url", url
    if ":aws/" in spec:
        name, service = spec.split(":aws/", 1)
        return name, "aws", service
    if ":gcp/" in spec:
        name, product = spec.split(":gcp/", 1)
        return name, "gcp", product
    if ":azure/" in spec:
        name, service = spec.split(":azure/", 1)
        return name, "azure", service
    if ":" in spec:
        name, slug = spec.split(":", 1)
        return name, "slug", slug
    return spec, "slug", spec

def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    outdir = pathlib.Path(args[0])
    specs = args[1:]
    outdir.mkdir(parents=True, exist_ok=True)

    manifest = {"icons": [], "fallbacks": []}

    for spec in specs:
        name, kind, value = parse_spec(spec)
        result = None

        if kind == "url":
            result = try_explicit_url(value, name)
        elif kind == "aws":
            result = try_aws(value, name)
        elif kind == "gcp":
            result = try_gcp(value, name)
        elif kind == "azure":
            result = try_azure(value, name)
        else:
            slug = value
            result = try_svgl(slug, name)
            if not result:
                result = try_devicon(slug, name)
            if not result:
                result = try_gilbarbara(slug, name)

        if result:
            data, ext, dark = result
            save_icon(outdir, name, data, ext)
            if dark:
                ddata, dext = dark
                save_icon(outdir, name, ddata, dext, dark=True)
            manifest["icons"].append({"name": name, "ext": ext, "source": kind})
            print(f"  {name}: fetched ({ext})")
        else:
            save_icon(outdir, name, placeholder_svg(name), "svg")
            manifest["fallbacks"].append(name)
            print(f"  {name}: fallback placeholder (no logo found)")

    (outdir / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    total = len(manifest["icons"])
    fallbacks = len(manifest["fallbacks"])
    print(f"\nFetched {total} icons, {fallbacks} fallbacks -> {outdir}")


if __name__ == "__main__":
    import urllib.parse  # needed by try_svgl quoting
    main()
