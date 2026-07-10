#!/usr/bin/env python3
"""Inject the computed atlas payload into the template and emit two HTML files.

  out/atlas.html          - full standalone document (local viewing + repo deliverable)
  out/atlas.artifact.html - body-content only (for the Artifact publish wrapper)
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"

inner = (HERE / "atlas_template.html").read_text()
data = (OUT / "atlas_data.json").read_text()
inner = inner.replace("__ATLAS_DATA__", data)

(OUT / "atlas.artifact.html").write_text(inner)

standalone = (
    "<!doctype html>\n<html lang=\"en\">\n<head>\n"
    "<meta charset=\"utf-8\" />\n"
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\" />\n"
    "</head>\n<body>\n" + inner + "\n</body>\n</html>\n"
)
(OUT / "atlas.html").write_text(standalone)

kb = (OUT / "atlas.html").stat().st_size // 1024
print(f"wrote {OUT/'atlas.html'} and {OUT/'atlas.artifact.html'} ({kb} KB)")
