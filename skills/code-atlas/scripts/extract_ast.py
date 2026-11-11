#!/usr/bin/env python3
"""Structural AST extraction for code files in CodeAtlas."""
import argparse
import ast
import json
import re
import sys
from pathlib import Path


def extract_python_ast(filepath, rel_path):
    nodes = []
    edges = []
    try:
        content = Path(filepath).read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(content, filename=filepath)
    except Exception:
        return nodes, edges

    file_stem = rel_path.replace("/", "_").replace("\\", "_").replace(".", "_")
    file_node_id = f"file_{file_stem}"
    nodes.append({
        "id": file_node_id,
        "label": Path(filepath).name,
        "file_type": "code",
        "source_file": rel_path,
        "source_location": None,
    })

    for item in tree.body:
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
            func_id = f"{file_stem}_{item.name.lower()}"
            nodes.append({
                "id": func_id,
                "label": item.name,
                "file_type": "code",
                "source_file": rel_path,
                "source_location": f"L{item.lineno}",
            })
            edges.append({
                "source": file_node_id,
                "target": func_id,
                "relation": "defines",
                "confidence": "EXTRACTED",
                "confidence_score": 1.0,
                "source_file": rel_path,
                "source_location": f"L{item.lineno}",
            })
        elif isinstance(item, ast.ClassDef):
            class_id = f"{file_stem}_{item.name.lower()}"
            nodes.append({
                "id": class_id,
                "label": item.name,
                "file_type": "code",
                "source_file": rel_path,
                "source_location": f"L{item.lineno}",
            })
            edges.append({
                "source": file_node_id,
                "target": class_id,
                "relation": "defines",
                "confidence": "EXTRACTED",
                "confidence_score": 1.0,
                "source_file": rel_path,
                "source_location": f"L{item.lineno}",
            })
            for method in item.body:
                if isinstance(method, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    method_id = f"{class_id}_{method.name.lower()}"
                    nodes.append({
                        "id": method_id,
                        "label": f"{item.name}.{method.name}",
                        "file_type": "code",
                        "source_file": rel_path,
                        "source_location": f"L{method.lineno}",
                    })
                    edges.append({
                        "source": class_id,
                        "target": method_id,
                        "relation": "defines",
                        "confidence": "EXTRACTED",
                        "confidence_score": 1.0,
                        "source_file": rel_path,
                        "source_location": f"L{method.lineno}",
                    })
    return nodes, edges


def extract_generic_code(filepath, rel_path):
    nodes = []
    edges = []
    file_stem = rel_path.replace("/", "_").replace("\\", "_").replace(".", "_")
    file_node_id = f"file_{file_stem}"
    nodes.append({
        "id": file_node_id,
        "label": Path(filepath).name,
        "file_type": "code",
        "source_file": rel_path,
        "source_location": None,
    })

    try:
        content = Path(filepath).read_text(encoding="utf-8", errors="replace")
        for i, line in enumerate(content.splitlines(), start=1):
            m_func = re.match(r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)", line)
            m_class = re.match(r"^\s*(?:export\s+)?class\s+([A-Za-z0-9_]+)", line)
            if m_func:
                name = m_func.group(1)
                nid = f"{file_stem}_{name.lower()}"
                nodes.append({
                    "id": nid, "label": name, "file_type": "code",
                    "source_file": rel_path, "source_location": f"L{i}"
                })
                edges.append({
                    "source": file_node_id, "target": nid, "relation": "defines",
                    "confidence": "EXTRACTED", "confidence_score": 1.0,
                    "source_file": rel_path, "source_location": f"L{i}"
                })
            elif m_class:
                name = m_class.group(1)
                nid = f"{file_stem}_{name.lower()}"
                nodes.append({
                    "id": nid, "label": name, "file_type": "code",
                    "source_file": rel_path, "source_location": f"L{i}"
                })
                edges.append({
                    "source": file_node_id, "target": nid, "relation": "defines",
                    "confidence": "EXTRACTED", "confidence_score": 1.0,
                    "source_file": rel_path, "source_location": f"L{i}"
                })
    except Exception:
        pass

    return nodes, edges


def main():
    parser = argparse.ArgumentParser(description="Extract AST structure from code files")
    parser.add_argument("--input", required=True, help="Input directory path")
    parser.add_argument("--detect-json", default="code-atlas-out/.code_atlas_detect.json", help="Path to detect JSON")
    parser.add_argument("--output", default="code-atlas-out/.code_atlas_ast.json", help="Path to output AST JSON")
    args = parser.parse_args()

    input_path = Path(args.input).resolve()
    detect_path = Path(args.detect_json)

    all_nodes = []
    all_edges = []

    if detect_path.exists():
        detect = json.loads(detect_path.read_text(encoding="utf-8"))
        code_files = detect.get("files", {}).get("code", [])
        for rel_file in code_files:
            full_path = input_path / rel_file
            if not full_path.is_file():
                continue
            if full_path.suffix.lower() == ".py":
                nodes, edges = extract_python_ast(full_path, rel_file)
            else:
                nodes, edges = extract_generic_code(full_path, rel_file)
            all_nodes.extend(nodes)
            all_edges.extend(edges)

    out_file = Path(args.output)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    result = {"nodes": all_nodes, "edges": all_edges, "input_tokens": 0, "output_tokens": 0}
    out_file.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"AST: {len(all_nodes)} nodes, {len(all_edges)} edges")


if __name__ == "__main__":
    main()
