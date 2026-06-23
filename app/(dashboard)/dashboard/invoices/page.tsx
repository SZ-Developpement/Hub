import { getInvoices } from "@/server/actions/invoices";
import { InvoiceList } from "@/components/invoices/invoice-list";

export default async function InvoicesPage() {
  const invoices = await getInvoices();

  return <InvoiceList invoices={invoices} />;
}
