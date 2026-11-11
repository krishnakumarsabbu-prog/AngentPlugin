#!/usr/bin/env python3
"""Manage semantic extraction caching, coverage validation, and chunk merging in CodeAtlas."""
import argparse
import glob
import hashlib
import json
import sys
from pathlib import Path


def get_file_hash(filepath):
    try:
        return hashlib.sha256(Path(filepath).read_bytes()).hexdigest()
    except Exception:
        return None


def cmd_check(args):
    detect_path = Path("code-atlas-out/.code_atlas_detect.json")
    if not detect_path.exists():
        print("ERROR: code-atlas-out/.code_atlas_detect.json not found.", file=sys.stderr)
        sys.exit(1)

    detect = json.loads(detect_path.read_text(encoding="utf-8"))
    all_files = [f for cat in ("document", "paper", "image") for f in detect.get("files", {}).get(cat, [])]

    cache_dir = Path("code-atlas-out/cache")
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / "semantic_cache.json"

    cache_data = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.exists() else {}

    cached_nodes = []
    cached_edges = []
    cached_hyperedges = []
    uncached = []

    root_path = Path(args.input)
    for rel_path in all_files:
        full_path = root_path / rel_path
        fhash = get_file_hash(full_path)
        if fhash and rel_path in cache_data and cache_data[rel_path].get("hash") == fhash:
            cached_nodes.extend(cache_data[rel_path].get("nodes", []))
            cached_edges.extend(cache_data[rel_path].get("edges", []))
            cached_hyperedges.extend(cache_data[rel_path].get("hyperedges", []))
        else:
            uncached.append(rel_path)

    if cached_nodes or cached_edges or cached_hyperedges:
        Path("code-atlas-out/.code_atlas_cached.json").write_text(
            json.dumps({"nodes": cached_nodes, "edges": cached_edges, "hyperedges": cached_hyperedges}, ensure_ascii=False),
            encoding="utf-8",
        )
    else:
        Path("code-atlas-out/.code_atlas_cached.json").unlink(missing_ok=True)

    Path("code-atlas-out/.code_atlas_uncached.txt").write_text("\n".join(uncached), encoding="utf-8")

    # Clear stale chunk files from prior runs
    for stale in Path("code-atlas-out").glob(".code_atlas_chunk_*.json"):
        stale.unlink()

    print(f"Cache: {len(all_files) - len(uncached)} files hit, {len(uncached)} files need extraction")


def cmd_init_empty(args):
    Path("code-atlas-out").mkdir(parents=True, exist_ok=True)
    Path("code-atlas-out/.code_atlas_semantic.json").write_text(
        json.dumps({"nodes": [], "edges": [], "hyperedges": [], "input_tokens": 0, "output_tokens": 0}),
        encoding="utf-8",
    )


def cmd_verify_coverage(args):
    covered = {}
    for c in sorted(glob.glob("code-atlas-out/.code_atlas_chunk_*.json")):
        d = json.loads(Path(c).read_text(encoding="utf-8"))
        for src, n in (d.get("coverage") or {}).items():
            covered[src] = max(covered.get(src, 0), int(n))

    partial = []
    input_path = Path(args.input)
    for src, n in sorted(covered.items()):
        p = Path(src)
        if not p.is_absolute():
            p = input_path / src
        if not p.is_file():
            continue
        try:
            total = sum(1 for _ in p.open(encoding="utf-8", errors="replace"))
        except Exception:
            continue
        if total and n < total:
            partial.append((src, n, total))

    Path("code-atlas-out/.code_atlas_partial.txt").write_text(
        "\n".join(s for s, _, _ in partial), encoding="utf-8"
    )
    if partial:
        print(f"WARNING: {len(partial)} file(s) were only partly read. They are cached as partial and retried on next --update:")
        for src, n, total in partial:
            print(f"  {src}: read {n} of {total} lines")
    else:
        print("Coverage OK - every file a subagent reported was read to its last line")


def cmd_merge_chunks(args):
    chunks = sorted(glob.glob("code-atlas-out/.code_atlas_chunk_*.json"))
    all_nodes, all_edges, all_hyperedges = [], [], []
    total_in, total_out = 0, 0
    for c in chunks:
        d = json.loads(Path(c).read_text(encoding="utf-8"))
        all_nodes += d.get("nodes", [])
        all_edges += d.get("edges", [])
        all_hyperedges += d.get("hyperedges", [])
        total_in += d.get("input_tokens", 0)
        total_out += d.get("output_tokens", 0)

    Path("code-atlas-out/.code_atlas_semantic_new.json").write_text(
        json.dumps({
            "nodes": all_nodes,
            "edges": all_edges,
            "hyperedges": all_hyperedges,
            "input_tokens": total_in,
            "output_tokens": total_out,
        }, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"Merged {len(chunks)} chunks: {total_in:,} in / {total_out:,} out tokens")


def cmd_save(args):
    new_path = Path("code-atlas-out/.code_atlas_semantic_new.json")
    new = json.loads(new_path.read_text(encoding="utf-8")) if new_path.exists() else {"nodes": [], "edges": [], "hyperedges": []}

    cache_dir = Path("code-atlas-out/cache")
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / "semantic_cache.json"
    cache_data = json.loads(cache_file.read_text(encoding="utf-8")) if cache_file.exists() else {}

    root_path = Path(args.input)
    saved_count = 0
    for node in new.get("nodes", []):
        src = node.get("source_file")
        if src:
            fhash = get_file_hash(root_path / src)
            if src not in cache_data:
                cache_data[src] = {"hash": fhash, "nodes": [], "edges": [], "hyperedges": []}
            cache_data[src]["nodes"].append(node)
            saved_count += 1

    for edge in new.get("edges", []):
        src = edge.get("source_file")
        if src and src in cache_data:
            cache_data[src]["edges"].append(edge)

    cache_file.write_text(json.dumps(cache_data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Cached {saved_count} extracted elements")


def cmd_merge_cached(args):
    cached_path = Path("code-atlas-out/.code_atlas_cached.json")
    new_path = Path("code-atlas-out/.code_atlas_semantic_new.json")

    cached = json.loads(cached_path.read_text(encoding="utf-8")) if cached_path.exists() else {"nodes": [], "edges": [], "hyperedges": []}
    new = json.loads(new_path.read_text(encoding="utf-8")) if new_path.exists() else {"nodes": [], "edges": [], "hyperedges": []}

    all_nodes = cached.get("nodes", []) + new.get("nodes", [])
    all_edges = cached.get("edges", []) + new.get("edges", [])
    all_hyperedges = cached.get("hyperedges", []) + new.get("hyperedges", [])

    seen = set()
    deduped = []
    for n in all_nodes:
        if n["id"] not in seen:
            seen.add(n["id"])
            deduped.append(n)

    merged = {
        "nodes": deduped,
        "edges": all_edges,
        "hyperedges": all_hyperedges,
        "input_tokens": new.get("input_tokens", 0),
        "output_tokens": new.get("output_tokens", 0),
    }
    Path("code-atlas-out/.code_atlas_semantic.json").write_text(
        json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Extraction complete - {len(deduped)} nodes, {len(all_edges)} edges")


def main():
    parser = argparse.ArgumentParser(description="Semantic extraction cache and chunk operations in CodeAtlas")
    subparsers = parser.add_subparsers(dest="action", required=True)

    p_check = subparsers.add_parser("check", help="Check semantic cache against detect JSON")
    p_check.add_argument("--input", required=True, help="Input directory")
    p_check.add_argument("--spec-path", required=True, help="Path to extraction-spec.md")

    subparsers.add_parser("init-empty", help="Initialize empty semantic JSON for code-only runs")

    p_cov = subparsers.add_parser("verify-coverage", help="Verify coverage of chunk extractions")
    p_cov.add_argument("--input", required=True, help="Input directory")

    subparsers.add_parser("merge-chunks", help="Merge chunk files into .code_atlas_semantic_new.json")

    p_save = subparsers.add_parser("save", help="Save new extractions to cache")
    p_save.add_argument("--input", required=True, help="Input directory")
    p_save.add_argument("--spec-path", required=True, help="Path to extraction-spec.md")

    subparsers.add_parser("merge-cached", help="Merge cached and new semantic extractions")

    args = parser.parse_args()

    actions = {
        "check": cmd_check,
        "init-empty": cmd_init_empty,
        "verify-coverage": cmd_verify_coverage,
        "merge-chunks": cmd_merge_chunks,
        "save": cmd_save,
        "merge-cached": cmd_merge_cached,
    }
    actions[args.action](args)


if __name__ == "__main__":
    main()
