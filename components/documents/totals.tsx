"use client";

import {
  Controller,
  useWatch,
  type Control,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

import { MoneyInput, PercentInput } from "@/components/shared/number-inputs";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DiscountType } from "@/generated/prisma/enums";
import { formatMoney, formatRate } from "@/lib/format";
import { computeTotals } from "@/lib/money";
import type { LineValues } from "@/lib/validation/documents";

type WithTotals = {
  lines: LineValues[];
  discountType: DiscountType;
  discountValue: number;
};

const DISCOUNT_LABELS: Record<DiscountType, string> = {
  NONE: "Aucune remise",
  PERCENT: "Remise en %",
  AMOUNT: "Remise en €",
};

/** Type et valeur de la remise globale. */
export function DiscountFields<Values extends FieldValues & WithTotals>({
  form,
}: {
  form: UseFormReturn<Values>;
}) {
  const typed = form as unknown as UseFormReturn<WithTotals>;
  const discountType = useWatch({ control: typed.control, name: "discountType" });

  return (
    <div className="grid grid-cols-2 gap-3">
      <Controller
        control={typed.control}
        name="discountType"
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor="discount-type">Remise</FieldLabel>
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                typed.setValue("discountValue", 0, { shouldDirty: true, shouldValidate: true });
              }}
            >
              <SelectTrigger id="discount-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DISCOUNT_LABELS) as DiscountType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {DISCOUNT_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
      {discountType !== "NONE" ? (
        <Controller
          control={typed.control}
          name="discountValue"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="discount-value">Valeur</FieldLabel>
              {discountType === "PERCENT" ? (
                <PercentInput
                  id="discount-value"
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? 0)}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                />
              ) : (
                <MoneyInput
                  id="discount-value"
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? 0)}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                />
              )}
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      ) : null}
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={
        strong
          ? "flex items-baseline justify-between gap-4 border-t pt-3 text-base font-semibold"
          : "flex items-baseline justify-between gap-4 text-sm"
      }
    >
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** Récapitulatif des totaux, recalculé à chaque frappe avec la même fonction que le serveur. */
export function TotalsSummary<Values extends FieldValues & WithTotals>({
  control,
  deposits = [],
  finalLabel = "Total HT",
  vatMention,
}: {
  control: Control<Values>;
  /** Acomptes déduits (facture de solde). */
  deposits?: { label: string; amountCents: number }[];
  finalLabel?: string;
  vatMention?: string;
}) {
  const typed = control as unknown as Control<WithTotals>;
  const [lines, discountType, discountValue] = useWatch({
    control: typed,
    name: ["lines", "discountType", "discountValue"],
  });
  const totals = computeTotals({
    lines: (lines ?? []).map((line) => ({
      quantityMilli: line?.quantityMilli || 0,
      unitPriceCents: line?.unitPriceCents || 0,
    })),
    discountType,
    discountValue: discountValue || 0,
    depositDeductionCents: deposits.reduce((sum, deposit) => sum + deposit.amountCents, 0),
  });

  return (
    <dl className="space-y-2">
      <Row label="Sous-total HT" value={formatMoney(totals.subtotalCents)} />
      {totals.discountCents !== 0 ? (
        <Row
          label={discountType === "PERCENT" ? `Remise (${formatRate(discountValue || 0)})` : "Remise"}
          value={formatMoney(-totals.discountCents)}
        />
      ) : null}
      {deposits.map((deposit) => (
        <Row key={deposit.label} label={deposit.label} value={formatMoney(-deposit.amountCents)} />
      ))}
      <Row label={finalLabel} value={formatMoney(totals.netCents)} strong />
      {vatMention ? <p className="text-xs text-muted-foreground">{vatMention}</p> : null}
    </dl>
  );
}
