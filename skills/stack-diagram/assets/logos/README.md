# Local logo library

Put logos you are allowed to use in this directory. `fetch_icons.py` resolves them
locally and never makes a network request.

Supported files: `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`.

Lookup examples:

```bash
# matches assets/logos/react.svg
python3 scripts/fetch_icons.py icons/ react

# matches assets/logos/better-auth.svg
python3 scripts/fetch_icons.py icons/ betterauth:better-auth

# copies a local file
python3 scripts/fetch_icons.py icons/ orpc=./logos/orpc.webp
```

Dark variants:

- `assets/logos/_dark/react.svg`
- or `assets/logos/react.dark.svg`

If a logo is missing, the script writes a text-placeholder SVG. No download
fallback exists by design.
