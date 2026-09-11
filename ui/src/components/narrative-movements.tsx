import { orderedMovements, type NarrativeMovements } from "@/lib/narrative-structures";

export function NarrativeMovementsView({
  movements,
  compact = false,
}: {
  movements: NarrativeMovements;
  compact?: boolean;
}) {
  const items = orderedMovements(movements);
  return (
    <div>
      {movements.kind === "rule" ? (
        <p className={`${compact ? "text-[15px]" : "text-[17px]"} leading-relaxed text-foreground`}>
          {movements.rule}
        </p>
      ) : null}
      <ol className={`${movements.kind === "rule" ? "mt-4" : ""} grid gap-2`}>
        {items.map((movement, index) => (
          <li key={`${movement.position}-${movement.name}`} className="relative grid grid-cols-[2rem_1fr] items-start gap-3">
            <span
              className="relative z-10 grid h-8 w-8 place-items-center font-mono text-[10px] font-bold tabular-nums text-foreground shadow-[var(--shadow-sticker)]"
              style={{
                background:
                  movements.kind === "fixed"
                    ? "color-mix(in srgb, var(--ramune) 18%, var(--paper-stamp-mix))"
                    : "color-mix(in srgb, var(--yuzu) 28%, var(--paper-stamp-mix))",
              }}
            >
              {movement.position}
            </span>
            {index < items.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[15px] top-7 h-[calc(100%+0.5rem)] w-[2px]"
                style={{
                  background:
                    movements.kind === "fixed"
                      ? "color-mix(in srgb, var(--ramune) 35%, transparent)"
                      : "color-mix(in srgb, var(--yuzu) 52%, transparent)",
                }}
              />
            ) : null}
            <span className={`${compact ? "pt-1 text-[15px]" : "pt-0.5 text-[17px]"} leading-relaxed text-foreground`}>
              {movement.name}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
