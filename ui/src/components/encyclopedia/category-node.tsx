"use client";
import { useState } from "react";
import { Shapes, PenLine, Palette, LayoutGrid } from "lucide-react";
import type { MapName } from "@/lib/encyclopedia";
import { MAP_LABEL, MAP_INK } from "@/lib/encyclopedia-graph";
import { type CategoryNode, BRANCH_PAGE } from "./disclosure";
import { useCellFace, brokenOnArrival } from "./map-cards";

function Study({ cell }: { cell: NonNullable<CategoryNode["preview"]> }) {
  const { face, onImageError } = useCellFace(cell);
  // These study URLs use the existing authenticated image proxy.
  if (face.kind === "image")
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={(img) => brokenOnArrival(img, onImageError)}
        src={face.url}
        alt={face.alt}
        onError={onImageError}
        loading="lazy"
        draggable={false}
      />
    );
  if (face.kind === "passage")
    return <p className="category-passage">{face.text}</p>;
  if (face.kind === "palette")
    return (
      <div className="flex h-full">
        {face.swatches.map((c, i) => (
          <span key={i} className="flex-1" style={{ background: c }} />
        ))}
      </div>
    );
  return null;
}
const icons = {
  art: Shapes,
  writing: PenLine,
  palettes: Palette,
  design: LayoutGrid,
};
export function CategoryCard({
  node,
  onToggle,
  onMore,
}: {
  node: CategoryNode;
  onToggle: (map: MapName) => void;
  onMore: (map: MapName) => void;
}) {
  const Icon = icons[node.map];
  const [imageFailed, setImageFailed] = useState(false);
  const example = node.example;
  return (
    <section
      data-map-control
      data-category={node.map}
      className="encyclopedia-category"
      style={{
        left: node.x - node.w / 2,
        top: node.y - node.h / 2,
        width: node.w,
        height: node.h,
      }}
    >
      <button
        className="category-open"
        aria-label={`${node.shown ? "Collapse" : "Expand"} ${MAP_LABEL[node.map]}`}
        aria-expanded={node.shown > 0}
        onClick={() => onToggle(node.map)}
      >
        <div className="category-visual" style={{ color: MAP_INK[node.map] }}>
          {node.preview ? (
            <Study cell={node.preview} />
          ) : node.map === "writing" && example?.excerpt ? (
            <p className="category-passage">{example.excerpt}</p>
          ) : example?.image && !imageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={(img) => brokenOnArrival(img, () => setImageFailed(true))}
              src={example.image}
              alt={`Related record: ${example.name}`}
              loading="lazy"
              draggable={false}
              onError={() => setImageFailed(true)}
            />
          ) : example?.excerpt ? (
            <p className="category-passage">{example.excerpt}</p>
          ) : (
            <Icon size={58} strokeWidth={1.3} />
          )}
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <strong>{MAP_LABEL[node.map]}</strong>
          <span>{node.count} topics</span>
        </div>
        <span className="category-caption">
          {node.preview
            ? `Study from ${node.preview.name}`
            : example
              ? `Related record · ${example.name}`
              : "Explore topics and connections"}
        </span>
        <span className="category-action">
          {node.shown ? "Collapse branch −" : "Expand topics +"}
        </span>
      </button>
      {node.shown > 0 && node.shown < node.entries.length ? (
        <button className="category-more" onClick={() => onMore(node.map)}>
          Show {Math.min(BRANCH_PAGE, node.entries.length - node.shown)} more ·{" "}
          {node.shown}/{node.entries.length}
        </button>
      ) : null}
    </section>
  );
}
