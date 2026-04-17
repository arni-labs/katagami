import { DynamicEmbodiment } from "@/components/dynamic-embodiment";

// Bare embodiment page — no header, footer, or mobile nav.
// Loaded inside an iframe from the gallery/detail/compare pages so the
// embodiment renders in its own isolated browsing context.

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

  // Fill the whole iframe viewport; nest the embodiment with min-height so
  // components that don't self-size still occupy the visible area.
  return (
    <div className="fixed inset-0 overflow-auto bg-white">
      <div className="min-h-screen w-full">
        <DynamicEmbodiment fileId={id} format={format} />
      </div>
    </div>
  );
}
