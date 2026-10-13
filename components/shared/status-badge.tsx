import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type {
  InvoiceStatus,
  PreQuoteStatus,
  QuoteStatus,
  UrssafStatus,
} from "@/generated/prisma/enums";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  PRE_QUOTE_STATUS_LABELS,
  PRE_QUOTE_STATUS_TONES,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_TONES,
  URSSAF_STATUS_LABELS,
  URSSAF_STATUS_TONES,
  type Tone,
} from "@/lib/labels";
import { cn } from "@/lib/utils";

// Les statuts ont leurs propres couleurs sémantiques, indépendantes de la couleur
// d'accent : « en retard » doit rester rouge même si l'accent est vert.
const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-info/25 bg-info/10 text-info",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium whitespace-nowrap", TONE_CLASSES[tone], className)}>
      {children}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <StatusBadge tone={INVOICE_STATUS_TONES[status]}>{INVOICE_STATUS_LABELS[status]}</StatusBadge>;
}

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <StatusBadge tone={QUOTE_STATUS_TONES[status]}>{QUOTE_STATUS_LABELS[status]}</StatusBadge>;
}

export function PreQuoteStatusBadge({ status }: { status: PreQuoteStatus }) {
  return (
    <StatusBadge tone={PRE_QUOTE_STATUS_TONES[status]}>{PRE_QUOTE_STATUS_LABELS[status]}</StatusBadge>
  );
}

export function UrssafStatusBadge({ status }: { status: UrssafStatus }) {
  return <StatusBadge tone={URSSAF_STATUS_TONES[status]}>{URSSAF_STATUS_LABELS[status]}</StatusBadge>;
}
