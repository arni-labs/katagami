# `making` — how work in each art-lane tradition is made

`art_making.json` holds a draft **making** block for 1,125 art-lane cells (every art cell with a real description), generated 2026-09-20:

- five lines per cell — `composition`, `mark`, `colour`, `structure`, `rhythm` — each meant to be concrete and visible in the work, none about history, people, dates or reception; `n/a` where a field does not apply.
- drafted by Sonnet from the cell description plus a fetched excerpt of the cited source (Wikipedia via the extracts API; Aesthetics Wiki via `action=parse` wikitext; Getty vocab could not be fetched).
- every line checked by Jev (`jev-1.13.0`): `source_status` = `supported` (a section of the cited source states or directly implies it, ≥ 0.6), `unsupported`, or `unchecked` (no fetchable source: 858 cells); plus `about_making`, `visible`, `specific` scores.

Totals: 2,763 lines · 665 supported · 265 unsupported · 1,833 unchecked · 97% about making · 91% visible · 77% specific.

This is a **ledger, not live data**: nothing here is written to the production cells. To adopt it, add a `making` field to `EncyclopediaCell` (spec change, PR) and let the maintain skill accept lines with `supported` status, hold `unchecked` ones for a source, and send `unsupported` ones back to the writer with the source excerpt.

Why it exists: the mechanism scan over plain descriptions surfaced literary manifestos; over this field it surfaces visual traditions (Cloisonnism, cut-paper collage, Rinpa, Fileteado, Kirie, scratchboard, Plakatstil). See Garden `research/Katagami Encyclopedia/Jev *` notes.
