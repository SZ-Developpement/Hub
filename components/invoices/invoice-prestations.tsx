interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoicePrestationsProps {
  invoice: {
    items: InvoiceItem[];
    totalHT: number;
    vatRate: number | null;
    totalTTC: number;
  };
}

export default function InvoicePrestations({
  invoice,
}: InvoicePrestationsProps) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <h3 className="px-5 py-3.5 border-b border-border text-sm font-semibold text-foreground">
        Prestations
      </h3>
      {/* En-têtes */}
      <div className="grid grid-cols-[1fr_80px_110px_110px] gap-4 px-5 py-3 border-b border-border bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground">Description</p>
        <p className="text-xs font-medium text-muted-foreground">Qté</p>
        <p className="text-xs font-medium text-muted-foreground">
          Prix unitaire
        </p>
        <p className="text-xs font-medium text-muted-foreground text-right">
          Total HT
        </p>
      </div>

      {/* Lignes de prestations */}
      <div className="divide-y divide-border">
        {invoice.items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[1fr_80px_110px_110px] gap-4 px-5 py-3"
          >
            <p className="text-sm">{item.description}</p>
            <p className="text-sm text-muted-foreground">{item.quantity}</p>
            <p className="text-sm text-muted-foreground">
              {item.unitPrice.toFixed(2)} €
            </p>
            <p className="text-sm font-medium text-right">
              {item.total.toFixed(2)} €
            </p>
          </div>
        ))}
      </div>

      {/* Totaux */}
      <div className="border-t border-border px-5 py-4 space-y-2 bg-muted/20">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total HT</span>
          <span>{invoice.totalHT.toFixed(2)} €</span>
        </div>

        {invoice.vatRate !== null ? (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              TVA ({invoice.vatRate}%)
            </span>
            <span>{(invoice.totalTTC - invoice.totalHT).toFixed(2)} €</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            TVA non applicable, art. 293B du CGI
          </p>
        )}

        <div className="flex justify-between font-bold text-base border-t border-border pt-2">
          <span>Total TTC</span>
          <span>{invoice.totalTTC.toFixed(2)} €</span>
        </div>
      </div>
    </div>
  );
}
