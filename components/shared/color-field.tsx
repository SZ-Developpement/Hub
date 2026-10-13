"use client";

import { CheckIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

import { FormField } from "@/components/shared/form-fields";
import { Input } from "@/components/ui/input";
import { isHexColor, readableOn } from "@/lib/color";
import { cn } from "@/lib/utils";

const PRESETS = [
  "#dc2626",
  "#ea580c",
  "#d97706",
  "#16a34a",
  "#0d9488",
  "#0284c7",
  "#2563eb",
  "#4f46e5",
  "#7c3aed",
  "#c026d3",
  "#db2777",
  "#475569",
];

/** Sélecteur de couleur : nuancier natif, saisie hexadécimale et couleurs prédéfinies. */
export function ColorField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
}: {
  control: Control<Values>;
  name: FieldPath<Values>;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <FormField control={control} name={name} label={label} description={description}>
      {({ field, fieldState, id }) => {
        const value = String(field.value ?? "");
        const valid = isHexColor(value);
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label
                className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-md border"
                style={{ backgroundColor: valid ? value : "transparent" }}
              >
                <span className="sr-only">Ouvrir le nuancier</span>
                <input
                  type="color"
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  value={valid ? value : "#000000"}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </label>
              <Input
                id={id}
                className="w-32 font-mono uppercase"
                maxLength={7}
                spellCheck={false}
                value={value}
                onChange={(event) => {
                  const next = event.target.value.trim();
                  field.onChange(next && !next.startsWith("#") ? `#${next}` : next);
                }}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((color) => {
                const selected = value.toLowerCase() === color;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Choisir la couleur ${color}`}
                    aria-pressed={selected}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition",
                      selected ? "ring-2 ring-foreground/60" : "hover:scale-110",
                    )}
                    style={{ backgroundColor: color, color: readableOn(color) }}
                    onClick={() => field.onChange(color)}
                  >
                    {selected ? <CheckIcon className="size-3.5" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }}
    </FormField>
  );
}
