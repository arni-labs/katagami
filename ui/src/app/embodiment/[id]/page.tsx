import { DynamicEmbodiment } from "@/components/dynamic-embodiment";

// Bare embodiment page — no header, footer, or mobile nav.
// Designed to be loaded inside the gallery card's iframe so the embodiment
// renders in its own isolated browsing context (React tree, memory,
// event listeners all scoped to the iframe).

export default async function EmbodimentRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const format: "html" | "tsx" = sp.format === "html" ? "html" : "tsx";

  return (
    <div className="min-h-screen w-full bg-white">
      <DynamicEmbodiment fileId={id} format={format} />
    </div>
  );
}
