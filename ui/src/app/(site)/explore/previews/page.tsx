import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Explore, the candidates — Katagami", robots: { index: false } };

// The landing-page candidates in one place, so they can be tried one after another. Linked from nowhere.
const CANDIDATES = [
  ["field", "19 · The Halftone Field", "A dot for every style in its own ink, where the atlas put it. A lens turns dots into pictures."],
  ["river", "21 · The River", "One winding ribbon of tiles, like beside like. Tiles swell toward the pointer; a strip of inks scrubs the whole."],
  ["halftone-river", "24 · The Halftone River", "The river as dots; near where you look they become stamps, then readable stamps."],
  ["mosaic", "26 · The Mosaic", "The whole library on one screen as a sheet of stamps that re-sorts by colour, family or fit."],
  ["stacks", "22 · The Stacks", "A library wall of spines in their own inks. Pull a book and it opens to a spread."],
  ["spines", "11 · The Spines", "One long shelf. A pulled spine turns to face you; fits stand taller."],
  ["stamp-sheet", "12 · The Stamp Sheets", "A perforated sheet per family, blanks marked soon. Answers are torn off onto the desk."],
  ["sentence", "05 · The Sentence", "The ask as one sentence with highlighted blanks; the answer dealt as a hand of cards."],
] as const;

export default function Previews() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Explore · landing candidates</p>
      <h1 className="mt-2 font-display text-[30px] font-bold tracking-[-0.03em]">Eight ways in</h1>
      <p className="mt-2 text-[14px] text-muted-foreground">Each is built on the real library. Try them on a desk and on a phone; they are different on each.</p>
      <ul className="mt-8 flex flex-col gap-1">
        {CANDIDATES.map(([slug, name, what]) => (
          <li key={slug}>
            <Link href={`/explore/${slug}`} className="group block px-3 py-3 hover:bg-muted">
              <span className="font-display text-[18px] font-bold tracking-[-0.02em]">{name}</span>
              <span className="mt-0.5 block text-[13.5px] text-muted-foreground">{what}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
