import { DownloadIcon, FileTextIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Ouvre le PDF dans un nouvel onglet, avec un accès direct au téléchargement. */
export function PdfButton({ href, label = "PDF" }: { href: string; label?: string }) {
  return (
    <div className="flex">
      <Button asChild variant="outline" className="rounded-r-none">
        <a href={href} target="_blank" rel="noreferrer">
          <FileTextIcon data-icon="inline-start" />
          {label}
        </a>
      </Button>
      <Button asChild variant="outline" size="icon" className="-ml-px rounded-l-none">
        <a href={`${href}?download`} aria-label="Télécharger le PDF">
          <DownloadIcon />
        </a>
      </Button>
    </div>
  );
}
