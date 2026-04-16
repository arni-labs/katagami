import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getDesignLanguage, listTaxonomies, parseJson } from "@/lib/odata";
import { SpecPanel } from "@/components/spec-panel";
import { EmbodimentViewer } from "@/components/embodiment-viewer";
import { DesignShowcase } from "@/components/design-showcase";
import { DeleteLanguageButton } from "@/components/delete-language-button";
import { CuratorNotesEditor } from "@/components/curator-notes-editor";

export default async function LanguageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let lang;
  try {
    lang = await getDesignLanguage(id);
  } catch {
    notFound();
  }

  const f = lang.fields;
  const c = lang.counters;
  const tags = parseJson<string[]>(f.tags) ?? [];
  const parentIds = parseJson<string[]>(f.parent_ids) ?? [];
  const taxonomyIds = parseJson<string[]>(f.taxonomy_ids) ?? [];
  const elementCount = c.element_count ?? (parseInt(f.element_count ?? "0", 10) || 0);

  // Resolve taxonomy names
  let taxonomyNames: { id: string; name: string }[] = [];
  if (taxonomyIds.length > 0) {
    try {
      const allTax = await listTaxonomies("Status eq 'Published'");
      taxonomyNames = taxonomyIds
        .map((tid) => {
          const tax = allTax.find((t) => t.entity_id === tid);
          return tax ? { id: tid, name: tax.fields.name ?? "Unnamed" } : null;
        })
        .filter((t): t is { id: string; name: string } => t !== null);
    } catch {
      // taxonomy lookup failed, show IDs only
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {f.name || "Untitled"}
            </h1>
            <Badge
              variant="secondary"
              className={
                lang.status === "Published"
                  ? "bg-green-100 text-green-800"
                  : ""
              }
            >
              {lang.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm font-mono mt-1">
            {f.slug || id}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/compare?a=${id}`}>
            <Button variant="outline" size="sm">
              Compare
            </Button>
          </Link>
          <Link href={`/lineage?root=${id}`}>
            <Button variant="outline" size="sm">
              Lineage
            </Button>
          </Link>
          <DeleteLanguageButton
            id={id}
            name={f.name || "Untitled"}
            redirectTo="/"
          />
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{f.lineage_type ?? "original"}</Badge>
        {f.lineage_type !== "original" && (
          <Badge variant="outline">gen {f.generation_number ?? "?"}</Badge>
        )}
        <Badge variant="outline">v{c.version ?? 0}</Badge>
        <Badge variant="outline">{elementCount} elements</Badge>
        <Badge variant="outline">{c.usage_count ?? 0} uses</Badge>
        <Badge variant="outline">{c.fork_count ?? 0} forks</Badge>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <Badge key={t} variant="secondary">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {/* Parent links */}
      {parentIds.length > 0 && (
        <div className="text-sm">
          <span className="text-muted-foreground">
            {f.lineage_type === "remix" ? "Remixed from: " : "Evolved from: "}
          </span>
          {parentIds.map((pid, i) => (
            <span key={pid}>
              {i > 0 && ", "}
              <Link
                href={`/language/${pid}`}
                className="text-primary underline underline-offset-4"
              >
                {pid.slice(0, 12)}...
              </Link>
            </span>
          ))}
        </div>
      )}

      {/* Taxonomy */}
      {taxonomyNames.length > 0 ? (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-sm text-muted-foreground mr-1">Taxonomies:</span>
          {taxonomyNames.map((t) => (
            <Badge key={t.id} variant="secondary">
              {t.name}
            </Badge>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-muted-foreground">
            Unclassified
          </Badge>
        </div>
      )}

      {/* Curator notes + feedback */}
      <CuratorNotesEditor id={id} existingNotes={f.curator_notes} />

      <Separator />

      {/* Spec tabs */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Specification</h2>
        <SpecPanel
          philosophy={f.philosophy}
          tokens={f.tokens}
          rules={f.rules}
          layout={f.layout_principles}
          guidance={f.guidance}
          imageryDirection={f.imagery_direction}
          generativeCanvas={f.generative_canvas}
        />
      </section>

      <Separator />

      {/* Design Embodiment */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Design Embodiment</h2>
        {f.embodiment_file_id ? (
          <EmbodimentViewer fileId={f.embodiment_file_id} />
        ) : f.tokens ? (
          <DesignShowcase tokensRaw={f.tokens} languageName={f.name ?? "Untitled"} />
        ) : (
          <div className="text-center py-16 text-muted-foreground rounded-lg border border-dashed">
            No embodiment or design tokens defined yet.
          </div>
        )}
      </section>
    </div>
  );
}
