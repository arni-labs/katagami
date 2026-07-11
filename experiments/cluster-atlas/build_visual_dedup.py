#!/usr/bin/env python3
"""Stage 2 analysis: compare image-vector similarity to text-vector similarity.

Reads the SigLIP image vectors (data/image_vectors.json) and the text taste
vectors (data/entities.json, art-style lane). Finds visual near-duplicate pairs,
computes each pair's *text* cosine too, and surfaces the pairs that look alike but
whose descriptions read as unrelated -- the duplicates text embeddings miss.

Outputs:
  data/artstyle_image_atlas.json  - image-vector 2D layout + clusters + pairs
  out/visual_dedup.html           - self-contained: near-duplicate art styles shown
                                     side by side (embedded thumbnails), image vs text cosine
  out/visual_dedup_report.md      - the same findings in text
"""
import base64
import io
import json
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.cluster.hierarchy import fcluster, linkage
from sklearn.manifold import TSNE

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
IMG = HERE / "image_data"
OUT = HERE / "out"
OUT.mkdir(parents=True, exist_ok=True)

THUMB_PX = 264


def l2(x):
    n = np.linalg.norm(x, axis=1, keepdims=True)
    n[n == 0] = 1
    return x / n


def thumb_data_uri(eid):
    p = IMG / (eid + ".img")
    if not p.exists():
        return None
    try:
        im = Image.open(p).convert("RGB")
        im.thumbnail((THUMB_PX, THUMB_PX))
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=82)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:  # noqa: BLE001
        return None


def main():
    img = json.loads((DATA / "image_vectors.json").read_text())
    ents = {r["id"]: r for r in json.loads((DATA / "entities.json").read_text())
            if r["lane"] == "artstyle"}

    img = [r for r in img if r["id"] in ents and len(r["vec"]) > 2]
    ids = [r["id"] for r in img]
    names = [r["name"] for r in img]
    model = img[0]["model"] if img else "?"
    n = len(img)

    Xi = l2(np.array([r["vec"] for r in img], dtype=np.float64))
    Xt = l2(np.array([ents[i]["vec"] for i in ids], dtype=np.float64))
    sim_i = Xi @ Xi.T
    sim_t = Xt @ Xt.T
    np.fill_diagonal(sim_i, -1)
    np.fill_diagonal(sim_t, -1)

    iu = np.triu_indices(n, 1)
    pairs = []
    for k in range(len(iu[0])):
        a, b = int(iu[0][k]), int(iu[1][k])
        si, st = float(sim_i[a, b]), float(sim_t[a, b])
        if si >= 0.70:
            pairs.append({"a": a, "b": b, "img": round(si, 4), "txt": round(st, 4),
                          "delta": round(si - st, 4)})
    pairs.sort(key=lambda p: -p["img"])

    # visual duplicates the text vectors miss: look alike, described unlike
    missed = [p for p in pairs if p["img"] >= 0.85 and p["txt"] < 0.75]
    missed.sort(key=lambda p: -p["delta"])

    # image-vector 2D layout + Ward clusters (the second atlas layer)
    perp = max(5, min(35, n // 12))
    xy = TSNE(n_components=2, perplexity=perp, init="pca", learning_rate="auto",
              random_state=42, max_iter=1500).fit_transform(Xi)
    xy = xy - xy.mean(0)
    xy = xy / (np.abs(xy).max() or 1)
    Z = linkage(Xi, method="ward")
    broad = fcluster(Z, t=min(6, n // 20 or 4), criterion="maxclust")

    counts = {t: int((np.array([p["img"] for p in pairs]) >= t).sum())
              for t in (0.95, 0.92, 0.90, 0.85, 0.80)}

    atlas = {
        "model": model, "n": n,
        "points": [{"id": ids[i], "name": names[i], "x": float(xy[i, 0]),
                    "y": float(xy[i, 1]), "cl": int(broad[i]),
                    "url": ents[ids[i]]["page_url"]} for i in range(n)],
        "pairs": pairs[:600],
        "counts": counts,
    }
    (DATA / "artstyle_image_atlas.json").write_text(json.dumps(atlas))
    print(f"image atlas: n={n} model={model} counts={counts} missed={len(missed)}")

    write_report(pairs, missed, counts, names, model, n)
    write_html(pairs, missed, counts, ids, names, model, n)


def write_report(pairs, missed, counts, names, model, n):
    L = [f"# Visual (image-vector) dedup — Art Styles", "",
         f"Model: `{model}` on each art style's rendered thumbnail. {n} art styles embedded.",
         "Compared against the text taste-vector cosine for the same pair.", ""]
    for t in ("0.95", "0.92", "0.9", "0.85", "0.8"):
        L.append(f"- image-cosine ≥ {t}: **{counts[float(t)]}** pairs")
    L += ["", "## Visual duplicates the text vectors miss "
          "(image ≥ 0.85, text < 0.75)", ""]
    if missed:
        L += ["| image cos | text cos | Δ | A | B |", "|---|---|---|---|---|"]
        for p in missed[:30]:
            L.append(f"| {p['img']:.3f} | {p['txt']:.3f} | {p['delta']:.3f} | "
                     f"{names[p['a']]} | {names[p['b']]} |")
    else:
        L.append("_None at this cutoff._")
    L += ["", "## Tightest visual pairs overall", "",
          "| image cos | text cos | A | B |", "|---|---|---|---|"]
    for p in pairs[:25]:
        L.append(f"| {p['img']:.3f} | {p['txt']:.3f} | {names[p['a']]} | {names[p['b']]} |")
    (OUT / "visual_dedup_report.md").write_text("\n".join(L))
    print(f"wrote {OUT/'visual_dedup_report.md'}")


def card(p, ids, names):
    a, b = p["a"], p["b"]
    ua = thumb_data_uri(ids[a]) or ""
    ub = thumb_data_uri(ids[b]) or ""
    dot = "hot" if p["delta"] >= 0.20 else ""
    return f"""<article class="card">
  <div class="imgs">
    <figure><img loading="lazy" src="{ua}" alt="{names[a]}"/><figcaption>{names[a]}</figcaption></figure>
    <figure><img loading="lazy" src="{ub}" alt="{names[b]}"/><figcaption>{names[b]}</figcaption></figure>
  </div>
  <div class="metrics">
    <span class="m"><b>{p['img']:.3f}</b><small>image</small></span>
    <span class="m t"><b>{p['txt']:.3f}</b><small>text</small></span>
    <span class="m d {dot}"><b>+{p['delta']:.2f}</b><small>Δ</small></span>
  </div>
</article>"""


def write_html(pairs, missed, counts, ids, names, model, n):
    missed_cards = "\n".join(card(p, ids, names) for p in missed[:24])
    tight_cards = "\n".join(card(p, ids, names) for p in pairs[:24])
    html = f"""<title>Katagami — Art Styles that Look Alike</title>
<style>
  *,*::before,*::after{{box-sizing:border-box}} html,body{{margin:0}}
  :root{{--bg:#fcfbf9;--ink:#0a0a0a;--muted:#6d6a63;--panel:#fff;--accent:#ff4d2e;
    --teal:#0e9c8c;--faint:#f1efea;--shadow:0 6px 26px rgba(20,16,12,.10);
    --font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}}
  @media (prefers-color-scheme:dark){{:root{{--bg:#0c0d10;--ink:#f4f3ef;--muted:#9d9a92;
    --panel:#16181d;--accent:#ff6a4d;--teal:#2ac3b2;--faint:#1b1d22;--shadow:0 8px 30px rgba(0,0,0,.5)}}}}
  :root[data-theme="light"]{{--bg:#fcfbf9;--ink:#0a0a0a;--muted:#6d6a63;--panel:#fff;--accent:#ff4d2e;--teal:#0e9c8c;--faint:#f1efea;--shadow:0 6px 26px rgba(20,16,12,.10)}}
  :root[data-theme="dark"]{{--bg:#0c0d10;--ink:#f4f3ef;--muted:#9d9a92;--panel:#16181d;--accent:#ff6a4d;--teal:#2ac3b2;--faint:#1b1d22;--shadow:0 8px 30px rgba(0,0,0,.5)}}
  body{{background:var(--bg);color:var(--ink);font-family:var(--font);font-size:17px;line-height:1.5;-webkit-font-smoothing:antialiased}}
  .wrap{{max-width:1160px;margin:0 auto;padding:56px 24px 96px}}
  header p.k{{font-size:13px;text-transform:uppercase;letter-spacing:.09em;color:var(--accent);font-weight:700;margin:0 0 10px}}
  h1{{font-size:40px;line-height:1.04;letter-spacing:-.03em;margin:0 0 14px;font-weight:800;text-wrap:balance;max-width:20ch}}
  .lede{{font-size:19px;color:var(--muted);max-width:66ch;margin:0 0 26px}}
  .stats{{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 8px}}
  .stat{{background:var(--panel);box-shadow:var(--shadow);border-radius:16px;padding:12px 17px}}
  .stat b{{font-family:var(--mono);font-size:21px;font-variant-numeric:tabular-nums}}
  .stat span{{display:block;font-size:12.5px;color:var(--muted);letter-spacing:.02em;margin-top:2px}}
  h2{{font-size:24px;letter-spacing:-.02em;margin:56px 0 6px;font-weight:700}}
  h2+p{{color:var(--muted);margin:0 0 22px;max-width:70ch}}
  .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:18px}}
  .card{{background:var(--panel);border-radius:20px;box-shadow:var(--shadow);overflow:hidden;padding:12px}}
  .imgs{{display:grid;grid-template-columns:1fr 1fr;gap:8px}}
  figure{{margin:0}}
  figure img{{width:100%;height:auto;border-radius:14px;display:block;background:var(--faint)}}
  figcaption{{font-size:13px;font-weight:600;letter-spacing:-.01em;margin-top:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
  .metrics{{display:flex;gap:8px;padding:12px 4px 4px}}
  .m{{flex:1;text-align:center;background:var(--faint);border-radius:12px;padding:8px 4px}}
  .m b{{font-family:var(--mono);font-size:17px;font-variant-numeric:tabular-nums}}
  .m small{{display:block;font-size:11px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase;margin-top:1px}}
  .m.d b{{color:var(--teal)}} .m.d.hot b{{color:var(--accent)}}
  footer{{margin-top:64px;color:var(--muted);font-size:14px;max-width:70ch}}
  a{{color:var(--accent)}}
</style>
<div class="wrap">
  <header>
    <p class="k">Katagami · Stage 2 · visual embeddings</p>
    <h1>Art styles that look alike</h1>
    <p class="lede">Text taste-vectors embed each style's <em>description</em>, so
      two styles that render almost identically but are worded differently read as
      unrelated. These pairs are ranked by how similar their <b>rendered thumbnails</b>
      are (SigLIP image cosine), each shown against the text cosine for the same pair.</p>
    <div class="stats">
      <div class="stat"><b>{n}</b><span>art styles embedded</span></div>
      <div class="stat"><b>{counts[0.90]}</b><span>image pairs ≥ 0.90</span></div>
      <div class="stat"><b>{counts[0.85]}</b><span>image pairs ≥ 0.85</span></div>
      <div class="stat"><b>{len(missed)}</b><span>text-missed look-alikes</span></div>
    </div>
  </header>

  <h2>Visual duplicates the text vectors miss</h2>
  <p>Image cosine ≥ 0.85 but text cosine &lt; 0.75 — they look like siblings, but
     their descriptions never say so. Δ is how much higher the image similarity is.</p>
  <div class="grid">{missed_cards or '<p style="color:var(--muted)">None at this cutoff.</p>'}</div>

  <h2>Tightest visual pairs overall</h2>
  <p>The most visually similar art-style pairs by SigLIP image cosine.</p>
  <div class="grid">{tight_cards}</div>

  <footer>Image model: <code>{model}</code>, run locally on each style's rendered
    thumbnail. Text model: <code>Xenova/all-MiniLM-L6-v2</code> on the description.
    A future upgrade would use a paid multimodal embedder (Voyage / Cohere) for
    higher-fidelity visual matching.</footer>
</div>"""
    (OUT / "visual_dedup.artifact.html").write_text(html)
    standalone = (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1" />\n'
        "</head>\n<body>\n" + html + "\n</body>\n</html>\n"
    )
    (OUT / "visual_dedup.html").write_text(standalone)
    kb = (OUT / "visual_dedup.html").stat().st_size // 1024
    print(f"wrote {OUT/'visual_dedup.html'} + .artifact.html ({kb} KB)")


if __name__ == "__main__":
    main()
