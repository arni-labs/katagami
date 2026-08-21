#!/usr/bin/env python3
"""Rebuild the inlined plates in docs/study/review.html from source files."""

from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML = Path(__file__).resolve().parent / "review.html"

PLATES = [
    ROOT / "katagami-curation/specs/curator_agent.ioa.toml",
    ROOT / "katagami-curation/policies/curator_agent.cedar",
    ROOT / ".agents/behaviors/curator-agent/BEHAVIOR.md",
    ROOT / ".agents/skills/katagami-study-curator/SKILL.md",
    ROOT / "katagami-curation/specs/review_agent.ioa.toml",
    ROOT / ".agents/behaviors/review-agent/BEHAVIOR.md",
    ROOT / ".agents/skills/katagami-study-reviewer/SKILL.md",
    ROOT / "katagami-curation/specs/human_curator.ioa.toml",
    ROOT / ".agents/behaviors/human-curator/BEHAVIOR.md",
    ROOT / ".agents/skills/katagami-study-human/SKILL.md",
]


def main():
    html = HTML.read_text(encoding="utf-8")
    start = 0
    marker = "<pre class='plate'>"
    close = "</pre>"
    for path in PLATES:
        i = html.find(marker, start)
        if i < 0:
            raise SystemExit(f"missing plate for {path}")
        j = html.find(close, i)
        if j < 0:
            raise SystemExit(f"unclosed plate for {path}")
        body = escape(path.read_text(encoding="utf-8"))
        html = html[: i + len(marker)] + body + html[j:]
        start = i + len(marker) + len(body) + len(close)
    HTML.write_text(html, encoding="utf-8")
    print(f"wrote {len(PLATES)} plates into {HTML}")


if __name__ == "__main__":
    main()
