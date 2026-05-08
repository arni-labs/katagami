import type { DesignLanguage } from "@/lib/odata";
import { LanguageCard } from "@/components/language-card";

export function LanguageGallery({
  languages,
  canDelete,
}: {
  languages: DesignLanguage[];
  canDelete: boolean;
}) {
  return (
    <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
      {languages.map((lang, index) => (
        <LanguageCard
          key={lang.entity_id}
          lang={lang}
          index={index}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
}
