#!/usr/bin/env python3
"""Apply community labels, regenerate report, and export labeled graph in CodeAtlas."""
import argparse
import json
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description="Label communities and update report in CodeAtlas")
    parser.add_argument("--input", required=True, help="Input directory")
    parser.add_argument("--labels-json", help="JSON string or file containing {community_id: label}")
    parser.add_argument("--directed", action="store_true", help="Directed graph")
    args = parser.parse_args()

    graph_path = Path("code-atlas-out/graph.json")
    analysis_path = Path("code-atlas-out/.code_atlas_analysis.json")

    if not graph_path.exists():
        print("ERROR: code-atlas-out/graph.json not found.", file=sys.stderr)
        sys.exit(1)

    graph_data = json.loads(graph_path.read_text(encoding="utf-8"))
    analysis = json.loads(analysis_path.read_text(encoding="utf-8")) if analysis_path.exists() else {}

    # Parse labels
    if args.labels_json:
        p = Path(args.labels_json)
        if p.exists() and p.is_file():
            raw_labels = json.loads(p.read_text(encoding="utf-8"))
        else:
            raw_labels = json.loads(args.labels_json)
        labels = {int(k): str(v) for k, v in raw_labels.items()}
    else:
        labels = {int(k): f"Community {k}" for k in graph_data.get("communities", {})}

    # Update nodes with community labels
    for node in graph_data.get("nodes", []):
        cid = node.get("community", 0)
        if cid in labels:
            node["community_name"] = labels[cid]

    graph_path.write_text(json.dumps(graph_data, indent=2, ensure_ascii=False), encoding="utf-8")
    Path("code-atlas-out/.code_atlas_labels.json").write_text(
        json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding="utf-8"
    )

    # Regenerate report
    report_path = Path("code-atlas-out/GRAPH_REPORT.md")
    if report_path.exists():
        content = report_path.read_text(encoding="utf-8")
        for cid, label in labels.items():
            content = content.replace(f"Community {cid}", label)
        report_path.write_text(content, encoding="utf-8")

    print("Report and graph updated with community labels")


if __name__ == "__main__":
    main()
