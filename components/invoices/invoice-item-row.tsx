"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type InvoiceItemValue = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceItemRowProps = {
  index: number;
  item: InvoiceItemValue;
  onChange: (
    index: number,
    field: keyof InvoiceItemValue,
    value: string | number,
  ) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
};

export function InvoiceItemRow({
  index,
  item,
  onChange,
  onRemove,
  canRemove,
}: InvoiceItemRowProps) {
  const total = item.quantity * item.unitPrice;

  return (
    <div className="grid grid-cols-[1fr_100px_120px_100px_40px] gap-2 items-center">
      <Input
        placeholder="Description de la prestation"
        value={item.description}
        onChange={(e) => onChange(index, "description", e.target.value)}
      />
      <Input
        type="number"
        min="0"
        step="1"
        placeholder="Qté"
        value={item.quantity}
        onChange={(e) =>
          onChange(index, "quantity", parseFloat(e.target.value) || 0)
        }
      />
      <Input
        type="number"
        min="0"
        step="0.01"
        placeholder="Prix HT"
        value={item.unitPrice}
        onChange={(e) =>
          onChange(index, "unitPrice", parseFloat(e.target.value) || 0)
        }
      />
      <p className="text-sm font-medium text-right">{total.toFixed(2)} €</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:text-muted-foreground disabled:hover:bg-transparent"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
