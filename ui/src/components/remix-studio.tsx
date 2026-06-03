"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DesignShowcase } from "@/components/design-showcase";
import { buildRemixBrief } from "@/lib/remix-brief";
import { COMPOSITIONS } from "@/lib/remix-compositions";
import { saveRemix, rateRemix } from "@/app/remix-actions";

export interface SavedMix {
  id: string;
  ui: string;
  palette: string;
  art: string;
  composition: string;
  rating: number;
}

export interface UiOption {
  id: string;
  name: string;
  tokens: string;
}
export interface PaletteOption {
  id: string;
  name: string;
  roles: string;
  thumb: string;
}
export interface ArtOption {
  id: string;
  name: string;
  medium: string;
  promptTemplate: string;
  negativePrompt: string;
  slotRecipes: string;
  refs: string[];
  thumb: string;
}

function safeParse(raw?: string): Record<string, unknown> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// Palette role -> design-token color key (the keys design-showcase reads).
const ROLE_TO_TOKEN: Record<string, string> = {
  background: "bg",
  surface: "surface",
  text: "text",
  primary: "text",
  secondary: "muted",
  muted: "muted",
  border: "border",
  accent: "accent",
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
};

const card: React.CSSProperties = {
  border: "1px solid #e5e3dd",
  borderRadius: 10,
  background: "#fff",
};

export function RemixStudio({
  ui,
  palettes,
  art,
  saved = [],
}: {
  ui: UiOption[];
  palettes: PaletteOption[];
  art: ArtOption[];
  saved?: SavedMix[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uiIdx, setUiIdx] = useState(0);
  const [palIdx, setPalIdx] = useState(0);
  const [artIdx, setArtIdx] = useState(0);
  const [compIdx, setCompIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const selUi = ui[uiIdx];
  const selPal = palettes[palIdx];
  const selArt = art[artIdx];
  const comp = COMPOSITIONS[compIdx];

  const roles = useMemo(
    () => safeParse(selPal?.roles) as Record<string, string>,
    [selPal],
  );

  // Live recolor: merge palette roles into the UI language's token colors.
  const mergedTokens = useMemo(() => {
    const t = safeParse(selUi?.tokens);
    const colors = { ...((t.colors as Record<string, string>) ?? {}) };
    for (const [tokenKey, roleKey] of Object.entries(ROLE_TO_TOKEN)) {
      if (roles[roleKey]) colors[tokenKey] = roles[roleKey];
    }
    return JSON.stringify({ ...t, colors });
  }, [selUi, roles]);

  // Art lane: fill the composition's image slots with the style's reference
  // images (representative "vibe", zero generation).
  const slotImages = useMemo(() => {
    const refs = selArt?.refs ?? [];
    return comp.image_slots.map((slot, i) => ({
      slot,
      url: refs.length ? refs[i % refs.length] : (selArt?.thumb ?? ""),
    }));
  }, [selArt, comp]);

  const haveAll = ui.length > 0 && palettes.length > 0 && art.length > 0;

  const nameOf = (arr: { id: string; name: string }[], id: string) =>
    arr.find((x) => x.id === id)?.name ?? id.slice(0, 8);

  // Taste loop: average rating for the current palette × art-style pair across
  // saved+rated mixes — the compatibility signal ratings feed.
  const compat = useMemo(() => {
    if (!selPal || !selArt) return null;
    const rated = saved.filter((s) => s.palette === selPal.id && s.art === selArt.id && s.rating > 0);
    if (!rated.length) return null;
    return { avg: rated.reduce((a, s) => a + s.rating, 0) / rated.length, n: rated.length };
  }, [saved, selPal, selArt]);

  function doSave() {
    if (!haveAll) return;
    const slotAssignments = JSON.stringify(
      Object.fromEntries(slotImages.map((s) => [s.slot.key, s.url])),
    );
    startTransition(async () => {
      await saveRemix({
        designLanguageId: selUi.id,
        paletteSystemId: selPal.id,
        artStyleId: selArt.id,
        compositionKey: comp.key,
        slotAssignments,
      });
      router.refresh();
    });
  }

  function doRate(id: string, rating: number) {
    startTransition(async () => {
      await rateRemix(id, rating);
      router.refresh();
    });
  }

  function rand(n: number) {
    return Math.floor(Math.random() * n);
  }
  function shuffle() {
    if (ui.length) setUiIdx(rand(ui.length));
    if (palettes.length) setPalIdx(rand(palettes.length));
    if (art.length) setArtIdx(rand(art.length));
  }

  function copyBrief() {
    if (!haveAll) return;
    const brief = buildRemixBrief({
      language: { name: selUi.name, tokens: safeParse(selUi.tokens) },
      palette: { name: selPal.name, roles },
      artStyle: {
        name: selArt.name,
        medium: selArt.medium,
        promptTemplate: selArt.promptTemplate,
        negativePrompt: selArt.negativePrompt,
        slotRecipes: safeParse(selArt.slotRecipes) as Record<string, string>,
        referenceUrls: selArt.refs,
      },
      composition: comp,
    });
    void navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function Picker<T extends { id: string; name: string }>(props: {
    label: string;
    options: T[];
    index: number;
    onChange: (i: number) => void;
  }) {
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: "#6b665c", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11 }}>
          {props.label}
        </span>
        {props.options.length ? (
          <select
            value={props.index}
            onChange={(e) => props.onChange(Number(e.target.value))}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d9d4c7", background: "#fbfaf6", fontSize: 14 }}
          >
            {props.options.map((o, i) => (
              <option key={o.id} value={i}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ color: "#a4503f", fontSize: 13 }}>none published yet</span>
        )}
      </label>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", fontFamily: "system-ui, sans-serif", color: "#2b2a26" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, margin: 0, letterSpacing: "-0.02em" }}>Remix Studio</h1>
        <p style={{ color: "#6b665c", marginTop: 6, fontSize: 15 }}>
          Mix a UI language × a palette × an art style. The preview recolors live and shows the
          art lane&apos;s reference imagery in the composition&apos;s slots — no generation. Copy the
          brief and hand it to your agent to build the real, illustrated screen.
        </p>
      </header>

      {/* Instrument panel */}
      <div style={{ ...card, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 12 }}>
        <Picker label="UI language" options={ui} index={uiIdx} onChange={setUiIdx} />
        <Picker label="Palette" options={palettes} index={palIdx} onChange={setPalIdx} />
        <Picker label="Art style" options={art} index={artIdx} onChange={setArtIdx} />
      </div>

      {compat && (
        <div style={{ margin: "0 0 12px", fontSize: 13, color: "#5b6f52", fontWeight: 600 }}>
          ★ {compat.avg.toFixed(1)} · {compat.n} rating{compat.n > 1 ? "s" : ""} — this palette × art style pairs well
        </div>
      )}

      {/* Composition switcher + actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 18 }}>
        {COMPOSITIONS.map((c, i) => (
          <button
            key={c.key}
            onClick={() => setCompIdx(i)}
            style={{
              padding: "6px 12px", borderRadius: 999, fontSize: 13, cursor: "pointer",
              border: "1px solid " + (i === compIdx ? "#2b2a26" : "#d9d4c7"),
              background: i === compIdx ? "#2b2a26" : "#fff",
              color: i === compIdx ? "#fff" : "#2b2a26",
            }}
          >
            {c.name}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={shuffle} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #d9d4c7", background: "#fff", cursor: "pointer", fontSize: 14 }}>
          🎲 Shuffle
        </button>
        <button
          onClick={copyBrief}
          disabled={!haveAll}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2b2a26", background: haveAll ? "#2b2a26" : "#bbb", color: "#fff", cursor: haveAll ? "pointer" : "default", fontSize: 14, fontWeight: 600 }}
        >
          {copied ? "Copied ✓" : "Copy brief"}
        </button>
        <button
          onClick={doSave}
          disabled={!haveAll || pending}
          title="Persist this mix as a Remix you can rate"
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #7c6f57", background: "#fff", color: "#7c6f57", cursor: haveAll && !pending ? "pointer" : "default", fontSize: 14, fontWeight: 600 }}
        >
          {pending ? "…" : "Save mix"}
        </button>
      </div>

      {!haveAll && (
        <div style={{ ...card, padding: 16, marginBottom: 18, background: "#fdf6ec", borderColor: "#e7d4b5", color: "#7a5a23", fontSize: 14 }}>
          This studio needs at least one <b>Published</b> entry in each lane. Run{" "}
          <code>synthesize_palette</code> and <code>synthesize_art_style</code> curation jobs to
          populate the palette and art-style libraries.
        </div>
      )}

      {/* Stage: UI recolored by the palette */}
      <div style={{ ...card, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ padding: "8px 14px", borderBottom: "1px solid #eee", fontSize: 12, color: "#6b665c" }}>
          {selUi?.name ?? "—"} · themed with {selPal?.name ?? "—"}
        </div>
        <div style={{ maxHeight: 560, overflow: "auto" }}>
          {selUi ? <DesignShowcase tokensRaw={mergedTokens} languageName={selUi.name} /> : null}
        </div>
      </div>

      {/* Art lane: composition image slots filled with reference imagery */}
      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#6b665c" }}>
          Imagery — {selArt?.name ?? "—"} ({selArt?.medium || "—"}) · {comp.name} slots
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {slotImages.map(({ slot, url }) => (
            <figure key={slot.key} style={{ margin: 0 }}>
              <div style={{ position: "relative", aspectRatio: slot.aspect.replace(":", "/"), background: `linear-gradient(135deg, ${roles.accent || "#bdb6a6"}, ${roles.surface || "#efeae0"})`, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e3dd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 10, color: roles.text || "#555", opacity: 0.5, textAlign: "center", padding: 6, lineHeight: 1.3 }}>
                  {selArt?.name}
                </span>
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={slot.subject_hint}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : null}
              </div>
              <figcaption style={{ fontSize: 11, color: "#8a857a", marginTop: 4 }}>
                <b style={{ color: "#2b2a26" }}>{slot.key}</b> — {slot.subject_hint}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* Saved mixes + rating — the compatibility/taste loop */}
      {saved.length > 0 && (
        <div style={{ ...card, padding: 16, marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#6b665c" }}>
            Saved mixes · rate them to build the palette × art-style compatibility signal
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
            {saved.map((m) => (
              <div key={m.id} style={{ border: "1px solid #e5e3dd", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 13, color: "#2b2a26" }}>
                  {nameOf(ui, m.ui)} · {nameOf(palettes, m.palette)} · {nameOf(art, m.art)}
                </div>
                <div style={{ fontSize: 11, color: "#8a857a", margin: "2px 0 6px" }}>
                  {COMPOSITIONS.find((c) => c.key === m.composition)?.name ?? m.composition}
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => doRate(m.id, n)}
                      disabled={pending}
                      aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                      style={{ border: "none", background: "none", cursor: pending ? "default" : "pointer", fontSize: 18, lineHeight: 1, padding: 0, color: n <= m.rating ? "#b8893f" : "#d9d4c7" }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
