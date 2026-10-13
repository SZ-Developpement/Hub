"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { previewDocument } from "@/app/(app)/parametres/actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { isHexColor } from "@/lib/color";
import type { DocumentPreviewValues } from "@/lib/validation/settings";

function toBlobUrl(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

/**
 * Aperçu PDF en direct : régénère un document d'exemple côté serveur à chaque
 * modification des réglages (avec un léger délai), sans rien enregistrer.
 */
export function PdfPreview({
  request,
  refreshKey,
}: {
  request: DocumentPreviewValues;
  /** Change quand une image (logo, signature) vient d'être remplacée. */
  refreshKey: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const serialized = JSON.stringify(request);

  useEffect(() => {
    const values = JSON.parse(serialized) as DocumentPreviewValues;
    // Couleur en cours de saisie : on attend qu'elle soit complète.
    if (!isHexColor(values.docPrimaryColor)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const result = await previewDocument(values);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      const next = toBlobUrl(result.data.base64);
      setUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return next;
      });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [serialized, refreshKey]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border bg-white">
        {url ? (
          <iframe
            title="Aperçu du document"
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            className="aspect-[1/1.414] w-full"
          />
        ) : (
          <Skeleton className="aspect-[1/1.414] w-full rounded-none" />
        )}
        {loading && url ? (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-neutral-900/80 px-2 py-1 text-xs text-white">
            <Spinner className="size-3" />
            Mise à jour…
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{error ?? "Document d'exemple, généré avec les réglages en cours."}</span>
        {url ? (
          <Button asChild variant="ghost" size="sm">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon data-icon="inline-start" />
              Ouvrir
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
