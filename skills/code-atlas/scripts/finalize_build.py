#!/usr/bin/env python3
"""Save manifest, update cost tracker, and clean up temporary build artifacts in CodeAtlas."""
import argparse
from datetime import datetime, timezone
import glob
import json
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description="Finalize CodeAtlas build and clean up temporary files")
    parser.add_argument("--input", required=True, help="Input directory")
    args = parser.parse_args()

    detect_path = Path("code-atlas-out/.code_atlas_detect.json")
    extract_path = Path("code-atlas-out/.code_atlas_extract.json")

    if detect_path.exists() and extract_path.exists():
        detect = json.loads(detect_path.read_text(encoding="utf-8"))
        extract = json.loads(extract_path.read_text(encoding="utf-8"))

        # Save manifest
        manifest_path = Path("code-atlas-out/manifest.json")
        manifest_data = {
            "root": args.input,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "files": detect.get("files", {}),
            "node_count": len(extract.get("nodes", [])),
            "edge_count": len(extract.get("edges", [])),
        }
        manifest_path.write_text(json.dumps(manifest_data, indent=2, ensure_ascii=False), encoding="utf-8")

        # Update cost tracker
        input_tok = extract.get("input_tokens", 0)
        output_tok = extract.get("output_tokens", 0)

        cost_path = Path("code-atlas-out/cost.json")
        if cost_path.exists():
            cost = json.loads(cost_path.read_text(encoding="utf-8"))
        else:
            cost = {"runs": [], "total_input_tokens": 0, "total_output_tokens": 0}

        cost["runs"].append({
            "date": datetime.now(timezone.utc).isoformat(),
            "input_tokens": input_tok,
            "output_tokens": output_tok,
            "files": detect.get("total_files", 0),
        })
        cost["total_input_tokens"] += input_tok
        cost["total_output_tokens"] += output_tok
        cost_path.write_text(json.dumps(cost, indent=2, ensure_ascii=False), encoding="utf-8")

        print(f"This run: {input_tok:,} input tokens, {output_tok:,} output tokens")
        print(f"All time: {cost['total_input_tokens']:,} input, {cost['total_output_tokens']:,} output ({len(cost['runs'])} runs)")

    # Cleanup temporary scratch files
    for temp_file in (
        "code-atlas-out/.code_atlas_detect.json",
        "code-atlas-out/.code_atlas_extract.json",
        "code-atlas-out/.code_atlas_ast.json",
        "code-atlas-out/.code_atlas_semantic.json",
        "code-atlas-out/.code_atlas_analysis.json",
        "code-atlas-out/.code_atlas_partial.txt",
        "code-atlas-out/.needs_update",
    ):
        Path(temp_file).unlink(missing_ok=True)

    for chunk in Path("code-atlas-out").glob(".code_atlas_chunk_*.json"):
        chunk.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
