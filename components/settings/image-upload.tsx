"use client";

import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/action";
import { cn } from "@/lib/utils";

export const IMAGE_ACCEPT = "image/png,image/jpeg,image/svg+xml";

/**
 * Envoi immédiat d'une image (logo des documents, signature, photo de profil).
 * L'image est redimensionnée côté serveur ; rien d'autre n'est à enregistrer.
 */
export function ImageUpload({
  label,
  description,
  imageUrl,
  onUpload,
  onRemove,
  uploadedMessage = "Image enregistrée",
  previewClassName,
  rounded = false,
}: {
  label: string;
  description?: ReactNode;
  imageUrl: string | null;
  onUpload: (file: File) => Promise<ActionResult<unknown>>;
  onRemove?: () => Promise<ActionResult<unknown>>;
  uploadedMessage?: string;
  previewClassName?: string;
  rounded?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { pending, run } = useAction();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div
        className={cn(
          // Fond blanc dans tous les thèmes : c'est celui des documents imprimés.
          "flex h-20 w-36 shrink-0 items-center justify-center overflow-hidden border bg-white p-2",
          rounded ? "size-20 rounded-full p-0" : "rounded-lg",
          previewClassName,
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- fichier privé servi par /api/files
          <img
            src={imageUrl}
            alt={label}
            className={cn("max-h-full max-w-full object-contain", rounded && "size-full object-cover")}
          />
        ) : (
          <ImageIcon className="size-6 text-neutral-300" />
        )}
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) run(() => onUpload(file), { success: uploadedMessage });
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => input.current?.click()}
          >
            {pending ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
            {imageUrl ? "Remplacer" : "Importer"}
          </Button>
          {imageUrl && onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => run(onRemove, { success: "Image retirée" })}
            >
              <Trash2Icon data-icon="inline-start" />
              Retirer
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
