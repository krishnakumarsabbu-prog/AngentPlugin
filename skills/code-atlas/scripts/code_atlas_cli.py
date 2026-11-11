#!/usr/bin/env python3
"""Launcher for the bundled CodeAtlas engine.

Puts the ``scripts/`` directory on ``sys.path`` so the package imports without a
PYTHONPATH export (which would not survive between separate shell invocations).

Usage:
    python code_atlas_cli.py <command> [options]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from code_atlas.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
