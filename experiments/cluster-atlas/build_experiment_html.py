#!/usr/bin/env python3
"""Render the before/after visual page for the embedding experiment.

Reads data/experiment_results.json + data/style_images.json, embeds thumbnails
from multi_image_data/, and writes out/embed_experiment.html — a self-contained
page that lets Rita SEE whether the 6 look-alike styles pull together:
  * the 6 styles' thumbnails
  * a scoreboard (NN-in-6, intra-6 cosine, collapse check) per model x variant
  * 6x6 similarity heatmaps, baseline vs winner
  * the nearest-neighbor story: each of the 6 with the actual thumbnail of its
    nearest neighbor -- baseline points outward, the winner points inward.

Follows the Katagami contract: no borders, bright/clean, <=3 accents used like
highlighters, 17px+ body, light-mode default + theme-aware, radius {0,16,24,9999},
images width:100%;height:auto (never object-fit:cover).
"""
import base64
import io
import json
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
IMG = HERE / "multi_image_data"
OUT = HERE / "out"
OUT.mkdir(exist_ok=True)

TARGETS = [
    ("Misprint",    "en-019efd20-27ed-7ec3-9d1a-ba1553784762"),
    ("Serigraph",   "en-019efc00-2c2c-7d53-9b11-374005ff0da2"),
    ("Quoin",       "en-019ef95b-4e19-7eb3-86c3-a2dbcda9b2bf"),
    ("Inlay",       "en-019ef95b-b23d-74d1-aca7-923e8bf2fb1e"),
    ("Toner Press", "en-019ef8ab-e01d-71c2-9a32-cd0f2f4424d2"),
    ("Réglure",     "en-019ef8ac-b59f-7d51-882c-8c0dbe5644fc"),
]
TARGET_IDS = [t[1] for t in TARGETS]
THUMB_PX = 360


def thumb_uri(fid):
    if not fid:
        return ""
    p = IMG / (fid + ".img")
    if not p.exists():
        return ""
    try:
        im = Image.open(p).convert("RGB")
        im.thumbnail((THUMB_PX, THUMB_PX))
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=84)
        return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:  # noqa: BLE001
        return ""


def heat(v, lo=0.55, hi=0.95):
    """Map a cosine to a highlighter fill (teal->amber->coral ramp) + text color."""
    t = max(0.0, min(1.0, (v - lo) / (hi - lo)))
    # low = faint, high = accent coral. Single-accent highlighter ramp.
    r = int(255 * (0.10 + 0.90 * t))
    g = int(255 * (0.62 - 0.42 * t))
    b = int(255 * (0.52 - 0.42 * t))
    a = 0.10 + 0.85 * t
    ink = "#0a0a0a" if t < 0.62 else "#fff"
    return f"rgba({r},{g},{b},{a:.2f})", ink


def matrix_html(score, name_by_id):
    """6x6 cosine heatmap from the pairwise list + diagonal = 1."""
    names = [t[0] for t in TARGETS]
    cos = {}
    for p in score["pairwise"]:
        cos[(p["a"], p["b"])] = p["cos"]
        cos[(p["b"], p["a"])] = p["cos"]
    head = "".join(f"<th>{n.split()[0]}</th>" for n in names)
    rows = []
    for rn in names:
        cells = [f'<th class="rh">{rn.split()[0]}</th>']
        for cn in names:
            if rn == cn:
                cells.append('<td class="diag">1.00</td>')
            else:
                v = cos.get((rn, cn), 0.0)
                bg, ink = heat(v)
                cells.append(f'<td style="background:{bg};color:{ink}">{v:.2f}</td>')
        rows.append("<tr>" + "".join(cells) + "</tr>")
    return (f'<table class="mtx"><thead><tr><th></th>{head}</tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table>')


def nn_story(score, name_by_id, thumb_by_name, thumb_by_id):
    """Each of the 6 -> its actual nearest neighbor thumbnail; flag in/out of 6."""
    cards = []
    for t in score["per_target"]:
        good = t["nn_in6"]
        badge = ("in the 6" if good else "outside the 6")
        cls = "good" if good else "bad"
        src_uri = thumb_by_name.get(t["name"], "")
        nn_uri = thumb_by_id.get(t.get("nn_id", "")) or thumb_by_name.get(t["nn_name"], "")
        cards.append(f"""<div class="nn {cls}">
  <div class="nnpair">
    <figure><img src="{src_uri}" alt="{t['name']}"/><figcaption>{t['name']}</figcaption></figure>
    <div class="arrow">&rarr;</div>
    <figure><img src="{nn_uri}" alt="{t['nn_name']}"/><figcaption>{t['nn_name']}</figcaption></figure>
  </div>
  <div class="nnmeta"><span class="tag {cls}">{badge}</span><span class="cs">cos {t['nn_cos']:.3f}</span></div>
</div>""")
    return "\n".join(cards)


def main():
    results = json.loads((DATA / "experiment_results.json").read_text())
    manifest = json.loads((DATA / "style_images.json").read_text())
    name_by_id = {sid: st["name"] for sid, st in manifest.items()}

    # thumbnails: the 6 targets + every style that appears as a nearest neighbor
    needed_ids = set(TARGET_IDS)
    nn_name_to_id = {}
    for tag, r in results.items():
        for variant in ("single", "multi"):
            for t in r[variant]["per_target"]:
                # find nn id by name (names are unique enough in practice)
                for sid, st in manifest.items():
                    if st["name"] == t["nn_name"]:
                        needed_ids.add(sid)
                        nn_name_to_id[t["nn_name"]] = sid
                        break
    thumb_by_id = {sid: thumb_uri(manifest[sid]["thumb"]) for sid in needed_ids
                   if sid in manifest}
    thumb_by_name = {}
    for sid in needed_ids:
        if sid in manifest:
            thumb_by_name[manifest[sid]["name"]] = thumb_by_id[sid]

    # choose baseline + winner: baseline = siglip2_base_224 single; winner = best
    # (max NN-in-6, then max intra6_mean) across all model x variant combos
    combos = []
    for tag, r in results.items():
        for variant in ("single", "multi"):
            s = r[variant]
            combos.append((tag, variant, s["nn_in6_count"], s["intra6_mean"], r["label"],
                           r["dim"], s["mean_margin"]))
    # winner: most NN-in-6, then biggest margin, then tightest intra-6
    winner = max(combos, key=lambda c: (c[2], c[6], c[3]))
    base = results.get("siglip2_base_224", {}).get("single") or list(results.values())[0]["single"]

    # ---- assemble the 6-style strip ----
    strip = "".join(
        f'<figure class="s"><img src="{thumb_by_id.get(tid,"")}" alt="{nm}"/>'
        f'<figcaption>{nm}</figcaption></figure>'
        for nm, tid in TARGETS)

    # ---- scoreboard ----
    order = ["siglip2_base_224", "siglip2_large_384", "siglip2_so400m_512",
             "nomic_vision_15", "dinov2_large"]
    rows = []
    best_nn = winner[2]
    for tag in order:
        if tag not in results:
            continue
        r = results[tag]
        for variant in ("single", "multi"):
            s = r[variant]
            is_win = (tag == winner[0] and variant == winner[1])
            is_base = (tag == "siglip2_base_224" and variant == "single")
            tagcls = "win" if is_win else ("base" if is_base else "")
            label = r["label"] + (" · baseline" if is_base else "") + (" · winner" if is_win else "")
            bar = int(round(s["nn_in6_count"] / 6 * 100))
            rows.append(f"""<tr class="{tagcls}">
      <td class="ml">{label}</td><td class="num">{r['dim']}</td><td>{variant}</td>
      <td class="nnc"><span class="cnt">{s['nn_in6_count']}/6</span>
        <span class="track"><span class="fill" style="width:{bar}%"></span></span></td>
      <td class="num">{s['mean_margin']:+.3f}</td>
      <td class="num">{s['intra6_mean']:.3f}</td><td class="num">{s['intra6_min']:.3f}</td>
      <td class="num muted">{s['sanity']['global_mean_cos']:.3f}</td></tr>""")
    scoreboard = "\n".join(rows)

    # ---- heatmaps baseline vs winner ----
    base_mtx = matrix_html(base, name_by_id)
    win_score = results[winner[0]][winner[1]]
    win_mtx = matrix_html(win_score, name_by_id)

    # inject nn ids into scores for the story (match by name)
    def with_ids(s):
        for t in s["per_target"]:
            t["nn_id"] = nn_name_to_id.get(t["nn_name"], "")
        return s
    base_story = nn_story(with_ids(base), name_by_id, thumb_by_name, thumb_by_id)
    win_story = nn_story(with_ids(win_score), name_by_id, thumb_by_name, thumb_by_id)

    win_label = f"{winner[4]} · {winner[1]}"
    body = PAGE.format(
        strip=strip, scoreboard=scoreboard, base_mtx=base_mtx, win_mtx=win_mtx,
        base_story=base_story, win_story=win_story,
        base_nn=base["nn_in6_count"], win_nn=win_score["nn_in6_count"],
        base_mean=base["intra6_mean"], win_mean=win_score["intra6_mean"],
        win_label=win_label,
    )
    (OUT / "embed_experiment.artifact.html").write_text(body)
    standalone = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8"/>\n'
                  '<meta name="viewport" content="width=device-width, initial-scale=1"/>\n'
                  "</head>\n<body>\n" + body + "\n</body>\n</html>\n")
    (OUT / "embed_experiment.html").write_text(standalone)
    kb = (OUT / "embed_experiment.html").stat().st_size // 1024
    print(f"winner: {winner[0]} / {winner[1]}  NN-in-6 {winner[2]}/6  mean {winner[3]:.3f}")
    print(f"wrote {OUT/'embed_experiment.html'} ({kb} KB)")


PAGE = """<title>Katagami — Do the look-alike styles pull together?</title>
<style>
  *,*::before,*::after{{box-sizing:border-box}} html,body{{margin:0}}
  :root{{--bg:#fcfbf9;--ink:#0a0a0a;--muted:#6d6a63;--panel:#fff;--accent:#ff4d2e;
    --teal:#0e9c8c;--gold:#f2a900;--faint:#f3f1ec;--line:#efece6;
    --shadow:0 6px 26px rgba(20,16,12,.09);
    --font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}}
  @media (prefers-color-scheme:dark){{:root{{--bg:#0c0d10;--ink:#f4f3ef;--muted:#9d9a92;
    --panel:#16181d;--accent:#ff6a4d;--teal:#2ac3b2;--gold:#ffbf3f;--faint:#1b1d22;
    --line:#22252b;--shadow:0 8px 30px rgba(0,0,0,.5)}}}}
  :root[data-theme="light"]{{--bg:#fcfbf9;--ink:#0a0a0a;--muted:#6d6a63;--panel:#fff;
    --accent:#ff4d2e;--teal:#0e9c8c;--gold:#f2a900;--faint:#f3f1ec;--line:#efece6;
    --shadow:0 6px 26px rgba(20,16,12,.09)}}
  :root[data-theme="dark"]{{--bg:#0c0d10;--ink:#f4f3ef;--muted:#9d9a92;--panel:#16181d;
    --accent:#ff6a4d;--teal:#2ac3b2;--gold:#ffbf3f;--faint:#1b1d22;--line:#22252b;
    --shadow:0 8px 30px rgba(0,0,0,.5)}}
  body{{background:var(--bg);color:var(--ink);font-family:var(--font);font-size:17px;
    line-height:1.55;-webkit-font-smoothing:antialiased}}
  .wrap{{max-width:1180px;margin:0 auto;padding:64px 24px 110px}}
  .k{{font-size:13px;text-transform:uppercase;letter-spacing:.10em;color:var(--accent);
    font-weight:700;margin:0 0 14px}}
  h1{{font-size:44px;line-height:1.05;letter-spacing:-.03em;margin:0 0 18px;font-weight:800;
    text-wrap:balance;max-width:20ch}}
  .lede{{font-size:19px;color:var(--muted);max-width:70ch;margin:0 0 20px}}
  .lede b{{color:var(--ink)}}
  h2{{font-size:27px;letter-spacing:-.02em;margin:74px 0 8px;font-weight:750;padding-top:8px}}
  h2+.sub{{color:var(--muted);margin:0 0 26px;max-width:74ch}}
  .verdict{{display:flex;flex-wrap:wrap;gap:12px;margin:26px 0 4px}}
  .vc{{background:var(--panel);box-shadow:var(--shadow);border-radius:16px;padding:16px 20px;min-width:150px}}
  .vc b{{font-family:var(--mono);font-size:26px;font-variant-numeric:tabular-nums;letter-spacing:-.02em}}
  .vc.win b{{color:var(--teal)}} .vc.base b{{color:var(--muted)}}
  .vc span{{display:block;font-size:12.5px;color:var(--muted);letter-spacing:.02em;margin-top:3px}}
  .strip{{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin:8px 0 4px}}
  @media (max-width:760px){{.strip{{grid-template-columns:repeat(3,1fr)}}}}
  figure{{margin:0}}
  figure.s img{{width:100%;height:auto;border-radius:16px;display:block;background:var(--faint);box-shadow:var(--shadow)}}
  figure.s figcaption{{font-size:14px;font-weight:650;margin-top:9px;letter-spacing:-.01em}}
  .board{{background:var(--panel);border-radius:24px;box-shadow:var(--shadow);padding:10px 6px;overflow-x:auto}}
  table.sb{{border-collapse:collapse;width:100%;min-width:640px;font-size:15px}}
  table.sb th{{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;
    color:var(--muted);font-weight:700;padding:14px 14px 10px}}
  table.sb td{{padding:12px 14px;font-size:15px}}
  table.sb tr+tr td{{border-top:1px solid var(--line)}}
  table.sb td.ml{{font-weight:600;letter-spacing:-.01em}}
  table.sb td.num{{font-family:var(--mono);font-variant-numeric:tabular-nums;text-align:right}}
  table.sb td.muted{{color:var(--muted)}}
  tr.win td{{background:rgba(14,156,140,.10)}}
  tr.win td.ml{{color:var(--teal)}}
  tr.base td.ml{{color:var(--muted)}}
  .nnc{{display:flex;align-items:center;gap:10px;min-width:150px}}
  .cnt{{font-family:var(--mono);font-weight:700;font-variant-numeric:tabular-nums}}
  .track{{flex:1;height:8px;border-radius:9999px;background:var(--faint);overflow:hidden;max-width:120px}}
  .fill{{display:block;height:100%;background:var(--teal);border-radius:9999px}}
  .cols{{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:8px}}
  @media (max-width:820px){{.cols{{grid-template-columns:1fr}}}}
  .col h3{{font-size:16px;margin:0 0 4px;letter-spacing:-.01em}}
  .col .cap{{font-size:13.5px;color:var(--muted);margin:0 0 14px}}
  .panel{{background:var(--panel);border-radius:20px;box-shadow:var(--shadow);padding:18px}}
  table.mtx{{border-collapse:separate;border-spacing:3px;width:100%;font-family:var(--mono);
    font-size:13px;font-variant-numeric:tabular-nums}}
  table.mtx th{{font-family:var(--font);font-size:11px;color:var(--muted);font-weight:650;padding:2px}}
  table.mtx th.rh{{text-align:right;padding-right:7px;white-space:nowrap}}
  table.mtx td{{text-align:center;padding:9px 4px;border-radius:9px;background:var(--faint)}}
  table.mtx td.diag{{background:transparent;color:var(--muted)}}
  .nngrid{{display:grid;grid-template-columns:1fr;gap:12px}}
  .nn{{background:var(--panel);border-radius:16px;box-shadow:var(--shadow);padding:12px 14px}}
  .nnpair{{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px}}
  .nnpair figure img{{width:100%;height:auto;border-radius:12px;display:block;background:var(--faint)}}
  .nnpair figcaption{{font-size:12.5px;font-weight:600;margin-top:6px;text-align:center;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
  .arrow{{font-size:22px;color:var(--muted)}}
  .nn.bad .arrow{{color:var(--accent)}} .nn.good .arrow{{color:var(--teal)}}
  .nnmeta{{display:flex;justify-content:space-between;align-items:center;margin-top:10px}}
  .tag{{font-size:12px;font-weight:700;border-radius:9999px;padding:4px 12px}}
  .tag.good{{background:rgba(14,156,140,.15);color:var(--teal)}}
  .tag.bad{{background:rgba(255,77,46,.14);color:var(--accent)}}
  .cs{{font-family:var(--mono);font-size:12.5px;color:var(--muted)}}
  footer{{margin-top:80px;color:var(--muted);font-size:14px;max-width:78ch;line-height:1.6}}
  footer code{{font-family:var(--mono);font-size:13px}}
  .legend{{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--muted);margin:16px 0 0}}
  .legend i{{display:inline-block;width:13px;height:13px;border-radius:4px;vertical-align:-2px;margin-right:6px}}
</style>
<div class="wrap">
  <p class="k">Katagami · ARN-246 · free image-embedding experiment</p>
  <h1>Do the six look-alike styles pull together?</h1>
  <p class="lede">Rita reads these six art styles as near-identical. A good visual
    embedding should make each one's <b>nearest neighbor</b> another of the six.
    The current embedding scatters them — several point <b>outward</b> to unrelated
    styles. Every model here is <b>free and runs locally</b>. No paid API.</p>

  <div class="strip">{strip}</div>

  <div class="verdict">
    <div class="vc base"><b>{base_nn}/6</b><span>baseline — styles whose nearest<br>neighbor is one of the six</span></div>
    <div class="vc win"><b>{win_nn}/6</b><span>winner — {win_label}</span></div>
    <div class="vc"><b>{base_mean:.3f} &rarr; {win_mean:.3f}</b><span>mean intra-6 cosine<br>baseline &rarr; winner</span></div>
  </div>

  <h2>Scoreboard</h2>
  <p class="sub"><b>NN-in-6</b> is the metric that matters: of the six styles, how
    many have their nearest neighbor (over all 156 styles) inside the six. Higher is
    tighter. The last column is a collapse check — the global mean cosine over all
    156 styles; it should stay low so we know the model isn't just calling everything
    similar.</p>
  <div class="board">
    <table class="sb">
      <thead><tr><th>model</th><th>dim</th><th>variant</th><th>NN-in-6</th>
        <th>margin</th><th>intra-6 mean</th><th>intra-6 min</th><th>global mean</th></tr></thead>
      <tbody>{scoreboard}</tbody>
    </table>
  </div>

  <h2>The 6×6, before and after</h2>
  <p class="sub">Cosine similarity among the six. Warmer = more similar. The baseline
    grid runs cool; the winner's grid warms up as the six recognize each other.</p>
  <div class="cols">
    <div class="col"><h3>Baseline · SigLIP2 base / 224px · single thumbnail</h3>
      <p class="cap">One representative image per style, 224px.</p>
      <div class="panel">{base_mtx}</div></div>
    <div class="col"><h3>Winner · {win_label}</h3>
      <p class="cap">The configuration that pulls the six tightest.</p>
      <div class="panel">{win_mtx}</div></div>
  </div>
  <div class="legend"><span><i style="background:rgba(26,158,133,.35)"></i>lower cosine</span>
    <span><i style="background:rgba(255,77,46,.85)"></i>higher cosine</span></div>

  <h2>Where does each style point?</h2>
  <p class="sub">Each of the six shown with the actual thumbnail of its <b>nearest
    neighbor</b> over all 156 styles. Baseline sends several of them outward to
    unrelated styles; the winner keeps them pointing at each other.</p>
  <div class="cols">
    <div class="col"><h3>Baseline — {base_nn}/6 point inward</h3>
      <p class="cap">Red badge = nearest neighbor is a different style entirely.</p>
      <div class="nngrid">{base_story}</div></div>
    <div class="col"><h3>Winner — {win_nn}/6 point inward</h3>
      <p class="cap">Green badge = nearest neighbor is one of the six.</p>
      <div class="nngrid">{win_story}</div></div>
  </div>

  <footer>All embeddings computed locally, no paid API. Baseline text vectors embed
    each style's written description; these image vectors embed the rendered proof
    shots. <b>single</b> = one representative thumbnail (the baseline method);
    <b>multi</b> = the mean of every proof/reference image for the style,
    L2-normalized. Models: <code>google/siglip2-*</code>,
    <code>nomic-ai/nomic-embed-vision-v1.5</code>, <code>facebook/dinov2-large</code>.</footer>
</div>"""


if __name__ == "__main__":
    main()
