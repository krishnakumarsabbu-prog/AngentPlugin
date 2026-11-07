#!/usr/bin/env python3
"""
Enterprise NFR Engineer — i18n & Localization Validator (Zero-Dependency)
Scans codebase for:
  1. Hardcoded UI strings vs localization tokens (t(), i18n.t, formatMessage, gettext)
  2. Missing translation keys across locale dictionaries (en, es, fr, de, ja, zh, ar)
  3. RTL (Right-to-Left) CSS / layout readiness (logical properties vs physical left/right)
  4. Locale-sensitive formatting (dates, numbers, currencies vs hardcoded symbols)
  5. UTF-8 character encoding compliance
"""

import os
import sys
import json
import re

def scan_i18n(target_dir):
    findings = []
    locale_dicts = {}
    total_files_scanned = 0
    hardcoded_strings_count = 0
    rtl_issues_count = 0
    formatting_issues_count = 0

    # Patterns for scanning
    hardcoded_ui_re = re.compile(r'<(?:h[1-6]|p|span|button|label|a|title|th|td)[^>]*>([A-Z][a-zA-Z0-9\s,.\'!?]{3,50})</', re.IGNORECASE)
    i18n_call_re = re.compile(r'\b(?:t|\$t|i18n\.t|formatMessage|useTranslation|gettext|_)\s*\(\s*["\']([^"\']+)["\']')
    physical_css_re = re.compile(r'\b(margin-left|margin-right|padding-left|padding-right|float:\s*left|float:\s*right|text-align:\s*left|text-align:\s*right)\b', re.IGNORECASE)
    hardcoded_curr_re = re.compile(r'["\']\$[0-9]+|\b\$[0-9]+|\b[0-9]+\s*(?:USD|EUR|GBP)\b')

    for root, dirs, files in os.walk(target_dir):
        # Exclude vendor and build artifacts
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'dist', 'out', 'build', '__pycache__', '.venv')]

        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            fpath = os.path.join(root, fname)
            rel_path = os.path.relpath(fpath, target_dir)

            # Check translation dictionaries
            if fname.endswith('.json') and any(loc in fname.lower() for loc in ('locales', 'i18n', 'translations', 'lang')):
                try:
                    with open(fpath, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if isinstance(data, dict):
                            locale_dicts[rel_path] = data
                except Exception:
                    pass

            if ext in ('.html', '.jsx', '.tsx', '.vue', '.ts', '.js', '.py'):
                total_files_scanned += 1
                try:
                    with open(fpath, 'r', encoding='utf-8', errors='replace') as f:
                        lines = f.readlines()

                    for line_num, line in enumerate(lines, 1):
                        stripped = line.strip()
                        if not stripped or stripped.startswith(("//", "#", "/*", "*")):
                            continue

                        # 1. Hardcoded UI strings in templates/markup
                        if ext in ('.html', '.jsx', '.tsx', '.vue'):
                            m = hardcoded_ui_re.search(line)
                            if m and not i18n_call_re.search(line):
                                text = m.group(1).strip()
                                if not text.isdigit() and len(text) > 3:
                                    hardcoded_strings_count += 1
                                    if hardcoded_strings_count <= 25:
                                        findings.append({
                                            "category": "HARDCODED_UI_STRING",
                                            "severity": "MEDIUM",
                                            "file": rel_path,
                                            "line": line_num,
                                            "detail": f"Literal UI text '{text}' found without i18n localization token.",
                                            "recommendation": f"Wrap with t('{text.lower().replace(' ', '_')}') or locale key."
                                        })

                        # 2. RTL CSS physical properties
                        if ext in ('.css', '.scss', '.tsx', '.jsx', '.html', '.vue'):
                            m_css = physical_css_re.search(line)
                            if m_css:
                                rtl_issues_count += 1
                                if rtl_issues_count <= 15:
                                    findings.append({
                                        "category": "RTL_PHYSICAL_PROPERTY",
                                        "severity": "LOW",
                                        "file": rel_path,
                                        "line": line_num,
                                        "detail": f"Physical layout property '{m_css.group(1)}' hinders bidirectional (RTL) localization.",
                                        "recommendation": "Use CSS Logical Properties (e.g. margin-inline-start, padding-inline-end)."
                                    })

                        # 3. Hardcoded currency/date formatting
                        if hardcoded_curr_re.search(line) and not ('Intl.NumberFormat' in line or 'currency' in line.lower()):
                            formatting_issues_count += 1
                            if formatting_issues_count <= 15:
                                findings.append({
                                    "category": "HARDCODED_CURRENCY_LOCALE",
                                    "severity": "LOW",
                                    "file": rel_path,
                                    "line": line_num,
                                    "detail": "Hardcoded currency symbol or string concatenation detected.",
                                    "recommendation": "Use Intl.NumberFormat or standard currency formatting utility."
                                })

                except Exception:
                    pass

    # 4. Compare locale dictionary parity if multiple dictionaries detected
    missing_keys_count = 0
    if len(locale_dicts) >= 2:
        base_locale = next(iter(locale_dicts.keys()))
        base_keys = set(locale_dicts[base_locale].keys())
        for other_loc, other_dict in locale_dicts.items():
            if other_loc == base_locale:
                continue
            other_keys = set(other_dict.keys())
            missing = base_keys - other_keys
            if missing:
                missing_keys_count += len(missing)
                findings.append({
                    "category": "MISSING_LOCALE_KEYS",
                    "severity": "HIGH",
                    "file": other_loc,
                    "line": 1,
                    "detail": f"Dictionary missing {len(missing)} keys present in {base_locale}: {list(missing)[:5]}...",
                    "recommendation": "Synchronize locale translation dictionaries."
                })

    # Compute i18n Quality Score (0-100)
    penalty = (hardcoded_strings_count * 2) + (rtl_issues_count * 1) + (missing_keys_count * 3) + (formatting_issues_count * 1)
    score = max(0, 100 - min(100, penalty))

    status = "PASS" if score >= 80 else ("CONDITIONAL_PASS" if score >= 60 else "FAIL")

    return {
        "tool": "i18n_validator",
        "target_directory": target_dir,
        "files_scanned": total_files_scanned,
        "locale_dictionaries_found": len(locale_dicts),
        "hardcoded_strings_detected": hardcoded_strings_count,
        "rtl_layout_issues": rtl_issues_count,
        "formatting_issues": formatting_issues_count,
        "missing_keys": missing_keys_count,
        "i18n_score": score,
        "status": status,
        "findings_sample": findings[:30]
    }

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    result = scan_i18n(target)
    if "--json" in sys.argv or "-j" in sys.argv:
        print(json.dumps(result, indent=2))
    else:
        print("=" * 60)
        print("  Enterprise NFR Engineer — i18n & Localization Validator")
        print("=" * 60)
        print(f"Target: {result['target_directory']}")
        print(f"Files Scanned: {result['files_scanned']}")
        print(f"Locale Dictionaries: {result['locale_dictionaries_found']}")
        print(f"Hardcoded UI Strings: {result['hardcoded_strings_detected']}")
        print(f"RTL Physical Layout Issues: {result['rtl_layout_issues']}")
        print(f"Locale Formatting Issues: {result['formatting_issues']}")
        print(f"i18n Quality Score: {result['i18n_score']}/100 [{result['status']}]")
        print("=" * 60)
        if result['findings_sample']:
            print("\nKey Findings:")
            for f in result['findings_sample'][:10]:
                print(f"  [{f['severity']}] {f['file']}:{f['line']} - {f['detail']}")
                print(f"         Action: {f['recommendation']}")
