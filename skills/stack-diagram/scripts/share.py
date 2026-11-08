#!/usr/bin/env python3
"""Share a diagram as a static HTML artifact.

Usage:
    python3 share.py INPUT.html [OUTPUT.html]

By default, copies the input HTML to a share-ready file with no modifications.
The upstream skill can publish to a Claude artifact or a public gallery, but
in AgentForge the public-sharing behavior is DISABLED by default.

To enable sharing, the user must explicitly approve it. This script only
copies the file locally — it does NOT upload to any external service.

AgentForge integration:
    - Public sharing is disabled by default.
    - Any external publication requires explicit user approval.
    - This script performs only local file operations.
"""

import pathlib
import shutil
import sys


def main():
    args = sys.argv[1:]
    if len(args) < 1:
        print(__doc__)
        sys.exit(1)

    src = pathlib.Path(args[0])
    if not src.exists():
        sys.exit(f"Input file not found: {src}")

    if len(args) >= 2:
        dst = pathlib.Path(args[1])
    else:
        dst = src.with_suffix("").with_name(src.stem + ".shared.html")

    shutil.copy2(src, dst)
    size_kb = dst.stat().st_size // 1024
    print(f"shared {dst} ({size_kb} KB)")
    print("Note: This is a local copy only. No external upload performed.")
    print("      Public sharing requires explicit user approval in AgentForge.")


if __name__ == "__main__":
    main()
