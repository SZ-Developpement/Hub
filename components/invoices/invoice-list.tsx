import Link from "next/link";
import { Button } from "@/components/ui/button";

import { Plus, FileText } from "lucide-react";
import InvoiceStats from "./invoice-stats";
import InvoiceTabs, { InvoiceListItem } from "./invoice-tabs";

export function InvoiceList({ invoices }: { invoices: InvoiceListItem[] }) {
  return (
    <div className="flex flex-col gap-8">
      {/* Titre de la section */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2">
            <FileText />
            <h1 className="text-2xl font-bold">Factures & Devis</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gérez vos factures et devis.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/invoices/new">
            <Plus className="size-4" />
            Nouveau document
          </Link>
        </Button>
      </div>

      <InvoiceStats />

      <InvoiceTabs invoices={invoices} />
    </div>
  );
}
