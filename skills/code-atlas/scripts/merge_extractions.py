#!/usr/bin/env python3
"""Merge AST and semantic extractions into .code_atlas_extract.json."""
import argparse
import json
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Merge AST and semantic extraction JSONs in CodeAtlas")
    parser.add_argument("--ast", default="code-atlas-out/.code_atlas_ast.json", help="Path to AST JSON")
    parser.add_argument("--semantic", default="code-atlas-out/.code_atlas_semantic.json", help="Path to semantic JSON")
    parser.add_argument("--output", default="code-atlas-out/.code_atlas_extract.json", help="Path to output extract JSON")
    args = parser.parse_args()

    ast_path = Path(args.ast)
    sem_path = Path(args.semantic)

    ast = json.loads(ast_path.read_text(encoding="utf-8")) if ast_path.exists() else {"nodes": [], "edges": []}
    sem = json.loads(sem_path.read_text(encoding="utf-8")) if sem_path.exists() else {"nodes": [], "edges": [], "hyperedges": []}

    # Stamp tier provenance on semantic items if not already stamped
    for n in sem.get("nodes", []):
        n.setdefault("_origin", "semantic")
    for e in sem.get("edges", []):
        e.setdefault("_origin", "semantic")

    seen = {n["id"] for n in ast.get("nodes", [])}
    merged_nodes = list(ast.get("nodes", []))
    for n in sem.get("nodes", []):
        if n["id"] not in seen:
            merged_nodes.append(n)
            seen.add(n["id"])

    merged_edges = ast.get("edges", []) + sem.get("edges", [])
    merged_hyperedges = sem.get("hyperedges", [])

    merged = {
        "nodes": merged_nodes,
        "edges": merged_edges,
        "hyperedges": merged_hyperedges,
        "input_tokens": sem.get("input_tokens", 0),
        "output_tokens": sem.get("output_tokens", 0),
    }

    out_file = Path(args.output)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")

    total = len(merged_nodes)
    edges = len(merged_edges)
    print(f"Merged: {total} nodes, {edges} edges ({len(ast.get('nodes', []))} AST + {len(sem.get('nodes', []))} semantic)")


if __name__ == "__main__":
    main()
