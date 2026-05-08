"use client";

import { useState } from "react";
import type { DesignLanguage } from "@/lib/odata";
import { LanguageCard } from "@/components/language-card";
import {
  DeleteLanguageDialog,
  type DeleteLanguageTarget,
} from "@/components/delete-language-button";

export function LanguageGallery({
  languages,
  canDelete,
}: {
  languages: DesignLanguage[];
  canDelete: boolean;
}) {
  const [deleteTarget, setDeleteTarget] =
    useState<DeleteLanguageTarget | null>(null);

  return (
    <>
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {languages.map((lang) => (
          <LanguageCard
            key={lang.entity_id}
            lang={lang}
            canDelete={canDelete}
            onRequestDelete={setDeleteTarget}
          />
        ))}
      </div>
      <DeleteLanguageDialog
        key={deleteTarget?.id ?? "closed"}
        target={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
    </>
  );
}
