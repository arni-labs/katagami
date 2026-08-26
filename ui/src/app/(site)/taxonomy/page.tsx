import { listTaxonomies, listDesignLanguages } from "@/lib/odata";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { featuredIds } from "@/lib/catalog";
import { TaxonomyClusterView } from "@/components/taxonomy-cluster-view";
import { PageHero, Marker } from "@/components/page-hero";
import { StickyNote, Stamp } from "@/components/scrapbook";

export default async function TaxonomyPage() {
  let taxonomies;
  try {
    taxonomies = await listTaxonomies("Status eq 'Published'");
  } catch {
    return (
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        <PageHero
          eyebrowAccent="sumire"
          eyebrow="categorization"
          title={<Marker color="sumire">taxonomy</Marker>}
          description="Could not reach the server."
        />
        <StickyNote className="p-6 text-center font-mono text-sm text-muted-foreground">
          ensure the temper server is running
        </StickyNote>
      </div>
    );
  }

  let languages: Awaited<ReturnType<typeof listDesignLanguages>> = [];
  try {
    // Published-only: draft/archived languages never count toward taxonomy.
    languages = await listDesignLanguages("Status eq 'Published'");
  } catch {
    // keep empty
  }

  // ARN-385: a signed-out visitor's taxonomy map counts only the anonymous
  // featured portion — the same set every other anon surface shows.
  if (!(await hasFullGalleryAccess())) {
    const ids = await featuredIds("language");
    languages = languages.filter((l) => ids.has(l.entity_id));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-10 sm:py-10">
      <PageHero
        eyebrowAccent="sumire"
        eyebrow="categorization"
        title={
          <>
            <Marker color="sumire">taxonomy</Marker> browser
          </>
        }
        description="A cleaner map of the design-language library, grouped by browsing family and tuned for finding usable styles quickly."
        rightSlot={
          <>
            <Stamp color="sumire">{taxonomies.length} categories</Stamp>
            <Stamp color="teal" rotate={3}>
              curated
            </Stamp>
          </>
        }
      />

      {taxonomies.length === 0 ? (
        <StickyNote className="flex items-center justify-center p-16 text-center font-mono text-sm text-muted-foreground">
          no taxonomies yet · run the curation pipeline
        </StickyNote>
      ) : (
        <TaxonomyClusterView
          taxonomies={taxonomies}
          languages={languages}
        />
      )}
    </div>
  );
}
