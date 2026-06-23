"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceStatus, InvoiceType } from "@/generated/prisma/client";
import { Search, ChevronRight } from "lucide-react";
import { InvoiceStatusBadge } from "./invoice-status-badge";
import Link from "next/link";
import { LetterAvatar } from "../ui/LetterAvatar";

export type InvoiceListItem = {
  id: string;
  slug: string;
  number: string;
  type: InvoiceType;
  status: InvoiceStatus;
  totalTTC: number;
  issuedAt: Date;
  dueAt: Date | null;
  client: { name: string; slug: string };
};

export default function InvoiceTabs({
  invoices,
}: {
  invoices: InvoiceListItem[];
}) {
  const [tab, setTab] = useState<"ALL" | "QUOTE" | "INVOICE">("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return invoices
      .filter((inv) => tab === "ALL" || inv.type === tab)
      .filter(
        (inv) =>
          inv.number.toLowerCase().includes(search.toLowerCase()) ||
          inv.client.name.toLowerCase().includes(search.toLowerCase()),
      );
  }, [invoices, tab, search]);

  // Recuper le type de document (devis ou facture) et replace le text par un text plus lisible
  // exemple: "QUOTE" => "Devis" et "INVOICE" => "Facture"
  const getReadableType = (type: InvoiceType) => {
    switch (type) {
      case "QUOTE":
        return "Devis";
      case "INVOICE":
        return "Facture";
      default:
        return type;
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Filtres */}
      <div className="flex items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="**:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
            <TabsTrigger value="ALL">
              Tous <Badge variant="secondary">{invoices.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="QUOTE">
              Devis{" "}
              <Badge variant="secondary">
                {invoices.filter((i) => i.type === "QUOTE").length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="INVOICE">
              Factures{" "}
              <Badge variant="secondary">
                {invoices.filter((i) => i.type === "INVOICE").length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <InputGroup className="flex-1 max-w-xs">
          <InputGroupInput
            placeholder="Numéro ou client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* Tableau */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* En-têtes */}
        <div className="grid grid-cols-[180px_1fr_160px_160px_120px_160px_40px] gap-4 px-5 py-3 border-b border-border bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">Numéro</p>
          <p className="text-xs font-medium text-muted-foreground">Client</p>
          <p className="text-xs font-medium text-muted-foreground">Type</p>
          <p className="text-xs font-medium text-muted-foreground">
            Montant TTC
          </p>
          <p className="text-xs font-medium text-muted-foreground">Statut</p>
          <p className="text-xs font-medium text-muted-foreground">Date</p>
          <div />
        </div>

        {/* Lignes */}
        <div className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {search
                  ? "Aucun résultat pour cette recherche."
                  : "Aucun document pour le moment."}
              </p>
            </div>
          ) : (
            filtered.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/dashboard/invoices/${invoice.slug}`}
                className="grid grid-cols-[180px_1fr_160px_160px_120px_160px_40px] gap-4 px-5 py-4 hover:bg-accent transition-colors group items-center"
              >
                <p className="text-sm font-mono font-medium">
                  {invoice.number}
                </p>
                <div className="flex items-center gap-2">
                  <LetterAvatar name={invoice.client.name} size="sm" />
                  <p className="text-sm truncate font-medium">
                    {invoice.client.name}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {getReadableType(invoice.type)}
                </p>
                <p className="text-sm font-medium">
                  {invoice.totalTTC.toFixed(2)} €
                </p>
                <InvoiceStatusBadge status={invoice.status} />
                <p className="text-xs text-muted-foreground">
                  {new Date(invoice.issuedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
