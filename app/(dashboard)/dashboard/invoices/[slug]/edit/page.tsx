import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { getReadableType } from "@/lib/utils/type-invoice";
import { getInvoiceBySlug } from "@/server/actions/invoices";
import { notFound } from "next/navigation";

export default async function EditInvoices({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = await params;
  const invoice = await getInvoiceBySlug(slug);

  if (!invoice) notFound();

  return (
    <div className="flex flex-col gap-8">
      {/* Header Invoice */}
      <div className="flex flex-row items-start justify-between">
        {/* Information Invoice */}
        <div className="flex flex-col gap-2 items-start">
          {/* Invoice Title and Status */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">
              Modifier le document
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {invoice.number} - {getReadableType(invoice.type)}
          </p>
        </div>
      </div>
    </div>
  );
}
