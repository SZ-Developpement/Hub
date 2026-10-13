"use client";

import { ArrowDownIcon, ArrowUpIcon, PackageIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

import { MoneyInput, QuantityInput } from "@/components/shared/number-inputs";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Unit } from "@/generated/prisma/enums";
import { formatMoney } from "@/lib/format";
import { UNIT_LABELS } from "@/lib/labels";
import { lineTotalCents } from "@/lib/money";
import { EMPTY_LINE, type LineValues } from "@/lib/validation/documents";

export type CatalogChoice = {
  id: string;
  name: string;
  description: string;
  unit: Unit;
  unitPriceCents: number;
  categoryId: string | null;
  category: { name: string } | null;
};

type WithLines = { lines: LineValues[] };

const UNITS = Object.keys(UNIT_LABELS) as Unit[];

// Colonnes d'une ligne sur grand écran : désignation, quantité, unité, prix unitaire, total.
const COLUMNS = "lg:grid-cols-[minmax(0,1fr)_5rem_7rem_7.5rem_6.5rem]";

function CatalogPicker({
  catalog,
  onPick,
}: {
  catalog: CatalogChoice[];
  onPick: (service: CatalogChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const groups = new Map<string, CatalogChoice[]>();
  for (const service of catalog) {
    const key = service.category?.name ?? "Sans catégorie";
    groups.set(key, [...(groups.get(key) ?? []), service]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <PackageIcon data-icon="inline-start" />
          Depuis le catalogue
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher une prestation…" />
          <CommandList>
            <CommandEmpty>
              {catalog.length === 0 ? "Le catalogue est vide." : "Aucune prestation trouvée."}
            </CommandEmpty>
            {[...groups.entries()].map(([category, services]) => (
              <CommandGroup key={category} heading={category}>
                {services.map((service) => (
                  <CommandItem
                    key={service.id}
                    value={service.id}
                    keywords={[service.name, category]}
                    onSelect={() => {
                      onPick(service);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{service.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatMoney(service.unitPriceCents)} / {UNIT_LABELS[service.unit].toLowerCase()}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function LineTotal({ control, index }: { control: Control<WithLines>; index: number }) {
  const [quantityMilli, unitPriceCents] = useWatch({
    control,
    name: [`lines.${index}.quantityMilli`, `lines.${index}.unitPriceCents`],
  });
  return <>{formatMoney(lineTotalCents(quantityMilli || 0, unitPriceCents || 0))}</>;
}

/**
 * Éditeur des lignes d'un devis ou d'une facture : lignes libres ou issues du catalogue,
 * réordonnables, avec total calculé au fil de la saisie.
 */
export function LineItemsEditor<Values extends FieldValues & WithLines>({
  form,
  catalog,
}: {
  form: UseFormReturn<Values>;
  catalog: CatalogChoice[];
}) {
  // Le composant ne manipule que le champ `lines` : on restreint le typage à cette forme.
  const control = form.control as unknown as Control<WithLines>;
  const { fields, append, remove, move } = useFieldArray({ control, name: "lines" });
  const errors = form.formState.errors.lines as
    | { message?: string; root?: { message?: string } }
    | undefined;
  const listError = errors?.root?.message ?? errors?.message;

  return (
    <div className="space-y-3">
      <div className={`hidden gap-2 px-3 text-xs font-medium text-muted-foreground lg:grid ${COLUMNS}`}>
        <span>Désignation</span>
        <span className="text-right">Quantité</span>
        <span>Unité</span>
        <span className="text-right">Prix unitaire HT</span>
        <span className="text-right">Total HT</span>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2 rounded-lg border bg-card p-3">
          <div className={`grid gap-2 lg:items-start ${COLUMNS}`}>
            <Controller
              control={control}
              name={`lines.${index}.label`}
              render={({ field: input, fieldState }) => (
                <div>
                  <Input
                    {...input}
                    aria-label={`Désignation de la ligne ${index + 1}`}
                    placeholder="Désignation"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid ? <FieldError className="mt-1" errors={[fieldState.error]} /> : null}
                </div>
              )}
            />
            <div className="grid grid-cols-3 gap-2 lg:contents">
              <Controller
                control={control}
                name={`lines.${index}.quantityMilli`}
                render={({ field: input, fieldState }) => (
                  <div>
                    <QuantityInput
                      value={input.value}
                      onChange={(value) => input.onChange(value ?? 0)}
                      onBlur={input.onBlur}
                      aria-label={`Quantité de la ligne ${index + 1}`}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid ? <FieldError className="mt-1" errors={[fieldState.error]} /> : null}
                  </div>
                )}
              />
              <Controller
                control={control}
                name={`lines.${index}.unit`}
                render={({ field: input }) => (
                  <Select value={input.value} onValueChange={input.onChange}>
                    <SelectTrigger className="w-full" aria-label={`Unité de la ligne ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {UNIT_LABELS[unit]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name={`lines.${index}.unitPriceCents`}
                render={({ field: input, fieldState }) => (
                  <MoneyInput
                    value={input.value}
                    onChange={(value) => input.onChange(value ?? 0)}
                    onBlur={input.onBlur}
                    aria-label={`Prix unitaire de la ligne ${index + 1}`}
                    aria-invalid={fieldState.invalid}
                  />
                )}
              />
            </div>
            <p className="text-sm font-medium tabular-nums lg:pt-1.5 lg:text-right">
              <span className="mr-2 font-normal text-muted-foreground lg:hidden">Total HT</span>
              <LineTotal control={control} index={index} />
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Controller
              control={control}
              name={`lines.${index}.description`}
              render={({ field: input }) => (
                <Textarea
                  {...input}
                  rows={1}
                  aria-label={`Description de la ligne ${index + 1}`}
                  placeholder="Description (facultative)"
                  className="min-h-8 flex-1 text-sm"
                />
              )}
            />
            <div className="flex shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Monter la ligne"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Descendre la ligne"
                disabled={index === fields.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Supprimer la ligne"
                onClick={() => remove(index)}
              >
                <Trash2Icon />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {listError ? <FieldError errors={[{ message: listError }]} /> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => append({ ...EMPTY_LINE })}>
          <PlusIcon data-icon="inline-start" />
          Ligne libre
        </Button>
        <CatalogPicker
          catalog={catalog}
          onPick={(service) =>
            append({
              serviceId: service.id,
              categoryId: service.categoryId,
              label: service.name,
              description: service.description,
              quantityMilli: 1000,
              unit: service.unit,
              unitPriceCents: service.unitPriceCents,
            })
          }
        />
      </div>
    </div>
  );
}
