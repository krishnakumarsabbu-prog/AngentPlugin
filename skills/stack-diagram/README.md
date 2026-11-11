# stack-diagram

Agent skill: describe your stack in a sentence, get an architecture diagram with local brand logos. Fully offline.

## What it does

Produces engineering-drawing-style architecture diagrams:
- Real brand logos on white tiles
- Labeled group boxes (like cloud-vendor VPC diagrams)
- Orthogonal arrows with monospace labels
- Cool graph-paper background

One self-contained HTML file is the source of truth; PNG / TSX / artifact are derived from it.

## Requirements

- Python 3.9+ (standard library only for `fetch_icons.py`, `build.py`, `share.py`)
- No network access — logos are resolved only from local files under `assets/logos/`
- Playwright + Chromium for PNG rendering (optional)

## Quick start

```bash
# 1. Resolve logos from assets/logos/ (no downloads, no network)
python3 scripts/fetch_icons.py icons/ react fastapi postgres redis

# 2. Write a draft HTML using assets/template.html
#    (replace %%ICON_react%% etc. with node placements)

# 3. Build the final self-contained HTML
python3 scripts/build.py draft.html icons/ architecture.html --fonts assets/fonts/

# 4. Render a PNG (requires Playwright)
python3 scripts/render_png.py architecture.html architecture.png
```

## Output formats

- **HTML** (default): self-contained, no external dependencies
- **PNG**: via Playwright + Chromium
- **React/TSX**: dependency-free React component from the same model
- **Light and dark themes**: every diagram supports both

## Local logo library

Place logos you are allowed to use under `assets/logos/` (or pass `--logos DIR`).
`fetch_icons.py` looks up files by name, relative path, or vendor-qualified name.
Dark variants can live in `assets/logos/_dark/` or use a `<name>.dark.<ext>` suffix.
Missing logos become clean text-placeholder tiles. The skill never downloads logos
and never contacts an external service.

## License

Dual License: Apache-2.0 / MIT (AgentForge Enterprise) — see [license.md](license.md) and [LICENSE](LICENSE). Bundled fonts are SIL OFL 1.1.

## Attribution

Upstream project: caru-ini/stack-diagram. See [license.md](license.md) and [LICENSE](LICENSE).
