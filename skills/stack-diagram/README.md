# stack-diagram

Agent skill: describe your stack in a sentence, get an architecture diagram with official logos.

## What it does

Produces engineering-drawing-style architecture diagrams:
- Real brand logos on white tiles
- Labeled group boxes (like cloud-vendor VPC diagrams)
- Orthogonal arrows with monospace labels
- Cool graph-paper background

One self-contained HTML file is the source of truth; PNG / TSX / artifact are derived from it.

## Requirements

- Python 3.9+ (standard library only for `fetch_icons.py`, `build.py`, `share.py`)
- Network access to fetch logos from svgl, devicon, gilbarbara/logos, and vendor icon packages
- Playwright + Chromium for PNG rendering (optional)

## Quick start

```bash
# 1. Fetch icons for your stack
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

## Logo sources

Official logos fetched from:
1. svgl (api.svgl.app)
2. devicon (raw.githubusercontent.com/devicons/devicon)
3. gilbarbara/logos (cdn.jsdelivr.net/gh/gilbarbara/logos)
4. AWS Architecture Icons (aws.amazon.com/architecture/icons)
5. Google Cloud Icons (cloud.google.com/icons)
6. Azure Architecture Icons (learn.microsoft.com/azure/architecture/icons)

simple-icons is deliberately NOT used — its glyphs are monochrome redraws, not official marks.

## License

MIT — see [LICENSE](LICENSE). Bundled fonts are SIL OFL 1.1.

## Source

Upstream repository: https://github.com/caru-ini/stack-diagram
