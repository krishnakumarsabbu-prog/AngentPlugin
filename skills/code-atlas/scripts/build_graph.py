#!/usr/bin/env python3
"""Build graph, cluster, score, generate report, and perform integrity checks in CodeAtlas."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import sys


def diagnose_extraction(extraction):
    nodes = {n["id"] for n in extraction.get("nodes", [])}
    edges = extraction.get("edges", [])

    dangling = 0
    missing = 0
    self_loops = 0

    for e in edges:
        s, t = e.get("source"), e.get("target")
        if not s or not t:
            missing += 1
        elif s == t:
            self_loops += 1
        elif s not in nodes or t not in nodes:
            dangling += 1

    return {
        "dangling_endpoint_edges": dangling,
        "missing_endpoint_edges": missing,
        "self_loop_edges": self_loops,
    }


def compute_clusters(nodes, edges):
    """Cluster nodes into communities by directory / module path."""
    communities = defaultdict(list)
    for n in nodes:
        src = n.get("source_file") or ""
        parts = src.replace("\\", "/").split("/")
        comm_name = parts[0] if len(parts) > 1 else "root"
        communities[comm_name].append(n["id"])

    # map to numeric IDs
    comm_map = {}
    node_to_comm = {}
    for idx, (cname, members) in enumerate(sorted(communities.items())):
        comm_map[idx] = members
        for mid in members:
            node_to_comm[mid] = idx

    return comm_map, node_to_comm


def analyze_graph(nodes, edges, comm_map, node_to_comm):
    degree = defaultdict(int)
    for e in edges:
        degree[e["source"]] += 1
        degree[e["target"]] += 1

    node_dict = {n["id"]: n for n in nodes}

    # God nodes: highest degree
    sorted_nodes = sorted(degree.items(), key=lambda x: x[1], reverse=True)
    gods = []
    for nid, deg in sorted_nodes[:10]:
        n = node_dict.get(nid, {})
        gods.append({
            "id": nid,
            "label": n.get("label", nid),
            "degree": deg,
            "file": n.get("source_file", ""),
        })

    # Surprising connections: edges crossing community boundaries
    surprises = []
    for e in edges:
        c1 = node_to_comm.get(e["source"])
        c2 = node_to_comm.get(e["target"])
        if c1 is not None and c2 is not None and c1 != c2:
            n1 = node_dict.get(e["source"], {}).get("label", e["source"])
            n2 = node_dict.get(e["target"], {}).get("label", e["target"])
            surprises.append({
                "source": n1,
                "target": n2,
                "relation": e.get("relation", "connects"),
                "communities": f"Community {c1} -> Community {c2}",
            })
            if len(surprises) >= 8:
                break

    # Suggested questions
    questions = [
        "How do core data models connect to external service interfaces?",
        "What are the primary module boundaries and dependencies across the codebase?",
        "Which functions or classes have the highest coupling and centrality?",
    ]
    if gods:
        top_name = gods[0]["label"]
        questions.insert(0, f"What depends on {top_name} and what does it call?")

    return gods, surprises, questions


def generate_report(nodes, edges, comm_map, labels, gods, surprises, questions, input_dir):
    lines = [
        f"# CodeAtlas Knowledge Graph Report",
        f"",
        f"- **Scan Target:** `{input_dir}`",
        f"- **Total Nodes:** {len(nodes):,}",
        f"- **Total Edges:** {len(edges):,}",
        f"- **Communities:** {len(comm_map):,}",
        f"",
        f"## Communities Overview",
    ]
    for cid, members in comm_map.items():
        cname = labels.get(cid, f"Community {cid}")
        lines.append(f"- **{cname}**: {len(members)} nodes")

    lines.extend([
        f"",
        f"## God Nodes (Highest Centrality)",
    ])
    for g in gods[:7]:
        lines.append(f"- **{g['label']}** ({g['file']}) — degree: {g['degree']}")

    lines.extend([
        f"",
        f"## Surprising Connections (Cross-Community Bridges)",
    ])
    for s in surprises[:5]:
        lines.append(f"- `{s['source']}` --[{s['relation']}]--> `{s['target']}` ({s['communities']})")

    lines.extend([
        f"",
        f"## Suggested Questions",
    ])
    for q in questions[:4]:
        lines.append(f"- {q}")

    lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Build and analyze graph from extraction JSON in CodeAtlas")
    parser.add_argument("--input", required=True, help="Input directory")
    parser.add_argument("--extract-json", default="code-atlas-out/.code_atlas_extract.json", help="Path to extraction JSON")
    parser.add_argument("--detect-json", default="code-atlas-out/.code_atlas_detect.json", help="Path to detect JSON")
    parser.add_argument("--directed", action="store_true", help="Build directed graph")
    parser.add_argument("--diagnose-only", action="store_true", help="Run health diagnostic only")
    args = parser.parse_args()

    extract_path = Path(args.extract_json)
    if not extract_path.exists():
        print(f"ERROR: {args.extract_json} not found.", file=sys.stderr)
        sys.exit(1)

    extraction = json.loads(extract_path.read_text(encoding="utf-8"))
    nodes = extraction.get("nodes", [])
    edges = extraction.get("edges", [])

    if args.diagnose_only:
        diag = diagnose_extraction(extraction)
        print("Extraction Health Diagnostics:")
        print(f"  Dangling edges: {diag['dangling_endpoint_edges']}")
        print(f"  Missing endpoints: {diag['missing_endpoint_edges']}")
        print(f"  Self loops: {diag['self_loop_edges']}")
        if any(diag.values()):
            print("GRAPH HEALTH WARNING: Integrity issues detected in extracted edges.")
        else:
            print("Graph health: OK (no dangling or missing edges).")
        return

    Path("code-atlas-out").mkdir(parents=True, exist_ok=True)

    if not nodes:
        print("ERROR: Graph is empty - extraction produced no nodes.", file=sys.stderr)
        sys.exit(1)

    comm_map, node_to_comm = compute_clusters(nodes, edges)
    labels = {cid: f"Community {cid}" for cid in comm_map}
    gods, surprises, questions = analyze_graph(nodes, edges, comm_map, node_to_comm)

    # Stamp community onto nodes
    for n in nodes:
        cid = node_to_comm.get(n["id"], 0)
        n["community"] = cid
        n["community_name"] = labels.get(cid, f"Community {cid}")

    graph_data = {
        "nodes": nodes,
        "links": edges,
        "directed": args.directed,
        "communities": {str(k): len(v) for k, v in comm_map.items()},
    }
    Path("code-atlas-out/graph.json").write_text(json.dumps(graph_data, indent=2, ensure_ascii=False), encoding="utf-8")

    report_content = generate_report(nodes, edges, comm_map, labels, gods, surprises, questions, args.input)
    Path("code-atlas-out/GRAPH_REPORT.md").write_text(report_content, encoding="utf-8")

    analysis = {
        "communities": {str(k): v for k, v in comm_map.items()},
        "labels": {str(k): v for k, v in labels.items()},
        "gods": gods,
        "surprises": surprises,
        "questions": questions,
    }
    Path("code-atlas-out/.code_atlas_analysis.json").write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Graph: {len(nodes)} nodes, {len(edges)} edges, {len(comm_map)} communities")


if __name__ == "__main__":
    main()
