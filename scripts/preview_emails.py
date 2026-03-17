#!/usr/bin/env python3
"""
Preview email templates locally without deploying.

Generates HTML files from the templates in bracket_utils so you can open them
in a browser and iterate on design/copy. Run from repo root:

    python scripts/preview_emails.py

Output: scripts/email_preview/welcome.html, newround.html, reminder.html
Open in a browser (or use --open to open the folder).
"""

import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "lambdas"))

# SUB_* are replaced at deploy; bracket_utils falls back to env when not set (see bracket_utils.py)
os.environ.setdefault("DeployedRootURL", "bracket.bearloves.rocks")

# Avoid real AWS calls when just previewing (optional)
if "--no-aws" in sys.argv:
    import unittest.mock as mock
    sys.modules["boto3"] = mock.MagicMock()

from bracket_common import bracket_utils


def substitute(template: str, content: dict) -> str:
    """Replace {{key}} with content[key]; leave {{key}} if key missing."""
    def repl(match):
        key = match.group(1)
        return str(content.get(key, match.group(0)))
    return re.sub(r"\{\{(\w+)\}\}", repl, template)


def main():
    out_dir = REPO_ROOT / "scripts" / "email_preview"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Shared dummy data
    year = "2026"
    compname = "Office Pool"
    deadline = "Thursday, March 20 at 12:00 PM ET"
    firstname = "Alex"
    fullname = "alex_smith"

    # ---- Welcome ----
    content = bracket_utils.populate_email_content("welcome")
    content["year"] = year
    content["compname"] = compname
    content["deadline"] = deadline
    content["firstname"] = firstname
    content["fullname"] = fullname

    t = bracket_utils.templates["welcome"]
    html = substitute(t["body"], content)
    (out_dir / "welcome.html").write_text(html, encoding="utf-8")
    print("Wrote email_preview/welcome.html")

    # ---- New round ----
    content = {"pick_round": 1}
    content = bracket_utils.populate_email_content("newround", content)
    content["year"] = year
    content["compname"] = compname
    content["deadline"] = deadline
    content["firstname"] = firstname
    content["fullname"] = fullname

    t = bracket_utils.templates["newround"]
    html = substitute(t["body"], content)
    (out_dir / "newround.html").write_text(html, encoding="utf-8")
    print("Wrote email_preview/newround.html")

    # ---- Reminder ----
    content = {"pick_round": 2}
    content = bracket_utils.populate_email_content("reminder", content)
    content["year"] = year
    content["compname"] = compname
    content["deadline"] = deadline
    content["firstname"] = firstname
    content["fullname"] = fullname

    t = bracket_utils.templates["reminder"]
    html = substitute(t["body"], content)
    (out_dir / "reminder.html").write_text(html, encoding="utf-8")
    print("Wrote email_preview/reminder.html")

    # Optional: index to jump between previews
    index = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Email previews</title></head>
<body style="font-family: sans-serif; padding: 20px;">
<h1>Email template previews</h1>
<ul>
<li><a href="welcome.html">Welcome</a></li>
<li><a href="newround.html">New round</a></li>
<li><a href="reminder.html">Reminder</a></li>
</ul>
<p>Edit <code>lambdas/bracket_common/bracket_utils.py</code> and re-run <code>python scripts/preview_emails.py</code> to refresh.</p>
</body></html>
"""
    (out_dir / "index.html").write_text(index, encoding="utf-8")
    print("Wrote email_preview/index.html")

    if "--open" in sys.argv:
        import webbrowser
        webbrowser.open(f"file://{out_dir / 'index.html'}")

    print(f"\nPreview dir: {out_dir}")


if __name__ == "__main__":
    main()
