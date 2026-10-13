import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DiscountType, Unit } from "@/generated/prisma/enums";
import { formatMoney, formatQuantity, formatRate } from "@/lib/format";
import { unitLabel } from "@/lib/labels";

type Line = {
  id: string;
  label: string;
  description: string;
  quantityMilli: number;
  unit: Unit;
  unitPriceCents: number;
  totalCents: number;
};

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "flex items-baseline justify-between gap-6 border-t pt-2 text-base font-semibold"
          : "flex items-baseline justify-between gap-6 text-sm"
      }
    >
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** Lignes et totaux d'un devis ou d'une facture, en lecture seule. */
export function DocumentLinesTable({
  lines,
  subtotalCents,
  discountType,
  discountValue,
  discountCents,
  deductions = [],
  finalLabel,
  finalCents,
  vatMention,
}: {
  lines: Line[];
  subtotalCents: number;
  discountType: DiscountType;
  discountValue: number;
  discountCents: number;
  /** Acomptes déduits (facture de solde). */
  deductions?: { label: string; amountCents: number }[];
  finalLabel: string;
  finalCents: number;
  vatMention?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Désignation</TableHead>
              <TableHead className="text-right">Qté</TableHead>
              <TableHead className="hidden sm:table-cell">Unité</TableHead>
              <TableHead className="text-right">P.U. HT</TableHead>
              <TableHead className="text-right">Total HT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="min-w-48 whitespace-normal">
                  <div className="font-medium">{line.label}</div>
                  {line.description ? (
                    <div className="text-xs whitespace-pre-wrap text-muted-foreground">
                      {line.description}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(line.quantityMilli)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {unitLabel(line.unit, line.quantityMilli)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(line.unitPriceCents)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatMoney(line.totalCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <dl className="ml-auto w-full max-w-xs space-y-1.5">
        <TotalRow label="Sous-total HT" value={formatMoney(subtotalCents)} />
        {discountCents !== 0 ? (
          <TotalRow
            label={discountType === "PERCENT" ? `Remise (${formatRate(discountValue)})` : "Remise"}
            value={formatMoney(-discountCents)}
          />
        ) : null}
        {deductions.map((deduction) => (
          <TotalRow
            key={deduction.label}
            label={deduction.label}
            value={formatMoney(-deduction.amountCents)}
          />
        ))}
        <TotalRow label={finalLabel} value={formatMoney(finalCents)} strong />
        {vatMention ? <p className="text-right text-xs text-muted-foreground">{vatMention}</p> : null}
      </dl>
    </div>
  );
}
