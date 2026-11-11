#!/usr/bin/env python3
"""Render a self-contained HTML diagram to a PNG screenshot.

Usage:
    python3 render_png.py INPUT.html OUTPUT.png [--width N] [--height N]

Requires Playwright with Chromium installed:
    pip install playwright && python3 -m playwright install --with-deps chromium

Renders both light and dark themes (if the HTML contains a .dark class toggle)
and writes OUTPUT.png (light) and OUTPUT.dark.png (dark) when a dark variant
is present.
"""

import argparse
import pathlib
import sys


def main():
    parser = argparse.ArgumentParser(description="Render HTML diagram to PNG")
    parser.add_argument("input", help="Input HTML file path")
    parser.add_argument("output", help="Output PNG file path")
    parser.add_argument("--width", type=int, default=1000, help="Viewport width")
    parser.add_argument("--height", type=int, default=800, help="Viewport height")
    parser.add_argument("--theme", choices=["light", "dark", "both"], default="light",
                        help="Theme to render")
    args = parser.parse_args()

    html_path = pathlib.Path(args.input)
    out_path = pathlib.Path(args.output)
    if not html_path.exists():
        sys.exit(f"Input file not found: {html_path}")

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit(
            "Playwright is not installed.\n"
            "Install it with:\n"
            "  pip install playwright\n"
            "  python3 -m playwright install --with-deps chromium\n"
            "Then re-run this command."
        )

    html_content = html_path.read_text(encoding="utf-8")

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        # Offline context: the rendered document must never make a network request.
        context = browser.new_context(
            viewport={"width": args.width, "height": args.height},
            offline=True,
        )
        page = context.new_page()

        page.set_content(html_content)

        themes = ["light"]
        if args.theme in ("dark", "both"):
            themes.append("dark")

        for theme in themes:
            if theme == "dark":
                page.evaluate(
                    "document.documentElement.classList.add('dark');"
                )
            else:
                page.evaluate(
                    "document.documentElement.classList.remove('dark');"
                )

            page.wait_for_timeout(200)

            # Measure actual content height
            body_height = page.evaluate(
                "Math.max(document.body.scrollHeight, "
                "document.documentElement.scrollHeight)"
            )
            if body_height > args.height:
                page.set_viewport_size(
                    {"width": args.width, "height": body_height}
                )
                page.wait_for_timeout(100)

            suffix = ".dark" if theme == "dark" else ""
            png_out = out_path.with_suffix("")
            png_name = f"{png_out.name}{suffix}.png"
            png_path = png_out.parent / png_name

            page.screenshot(path=str(png_path), full_page=True)
            print(f"rendered {png_path} ({args.width}x{body_height}px, {theme})")

        context.close()
        browser.close()


if __name__ == "__main__":
    main()
