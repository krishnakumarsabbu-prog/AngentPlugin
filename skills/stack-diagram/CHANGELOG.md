# Changelog

## 1.1.0 — 2026-11-11

- Removed all network access from the skill. `fetch_icons.py` now resolves logos only from local files (`assets/logos/` or `--logos DIR`).
- Bundled Geist and JetBrains Mono fonts under `assets/fonts/`.
- Fixed template icon markup so local logos actually render.
- Added offline enforcement to `build.py` (rejects external resource URLs) and `render_png.py` (offline browser context).
- Updated docs and agent instructions to prohibit logo downloads.

## 1.0.0 — 2026-11-08

- Integrated upstream stack-diagram skill (MIT, caru-ini/stack-diagram).
- Added SKILL.md, LICENSE, README.md.
- Added scripts: fetch_icons.py, build.py, render_png.py, share.py.
- Added references/geometry.md with coordinate system, spacing, and collision rules.
- Added assets/template.html with the diagram HTML template.
- Registered as a TASK_TRIGGERED skill in AgentForge Skill Studio.
- Paired with Stack Diagram Architect agent in Agent Studio.
- Disabled upstream public-sharing behavior by default.
