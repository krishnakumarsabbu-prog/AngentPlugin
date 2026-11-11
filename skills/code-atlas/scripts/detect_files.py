#!/usr/bin/env python3
"""Detect files in target directory for CodeAtlas analysis."""
import argparse
import json
import sys
from pathlib import Path

CODE_EXTS = {
    ".py", ".ts", ".js", ".tsx", ".jsx", ".go", ".rs", ".java", ".cpp", ".c",
    ".h", ".hpp", ".cs", ".rb", ".swift", ".kt", ".scala", ".php", ".sh"
}
DOC_EXTS = {".md", ".txt", ".rst", ".adoc", ".docx", ".html"}
PAPER_EXTS = {".pdf"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}
VIDEO_EXTS = {".mp4", ".mp3", ".wav", ".m4a", ".webm", ".mov"}
IGNORE_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build", "code-atlas-out"}


def detect_files(root_dir):
    root = Path(root_dir).resolve()
    categorized = {"code": [], "document": [], "paper": [], "image": [], "video": []}
    total_words = 0

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(ignored in path.parts for ignored in IGNORE_DIRS):
            continue

        ext = path.suffix.lower()
        rel_str = str(path.relative_to(root)).replace("\\", "/")

        if ext in CODE_EXTS:
            categorized["code"].append(rel_str)
        elif ext in DOC_EXTS:
            categorized["document"].append(rel_str)
            try:
                total_words += len(path.read_text(encoding="utf-8", errors="replace").split())
            except Exception:
                pass
        elif ext in PAPER_EXTS:
            categorized["paper"].append(rel_str)
        elif ext in IMAGE_EXTS:
            categorized["image"].append(rel_str)
        elif ext in VIDEO_EXTS:
            categorized["video"].append(rel_str)

    total_files = sum(len(v) for v in categorized.values())
    return {
        "total_files": total_files,
        "total_words": total_words,
        "files": categorized,
        "skipped_sensitive": [],
        "scan_root": str(root).replace("\\", "/"),
    }


def main():
    parser = argparse.ArgumentParser(description="Detect files for CodeAtlas analysis")
    parser.add_argument("--input", required=True, help="Input directory path to scan")
    parser.add_argument("--output", default="code-atlas-out/.code_atlas_detect.json", help="Path for output detect JSON")
    args = parser.parse_args()

    result = detect_files(args.input)
    out_file = Path(args.output)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Detected {result.get('total_files', 0)} files (~{result.get('total_words', 0):,} words)")


if __name__ == "__main__":
    main()
