import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import type {
  DocumentAssets,
  DocumentStyle,
  InvoiceSnapshot,
  PreQuoteDocument,
  QuoteDocument,
} from "@/lib/documents/types";
import { ensureFonts } from "@/lib/pdf/fonts";
import { InvoiceDocument } from "@/lib/pdf/invoice";
import { PreQuoteDocumentPdf } from "@/lib/pdf/pre-quote";
import { QuoteDocumentPdf } from "@/lib/pdf/quote";
import { AnnualReportDocument, ReceiptsBookDocument } from "@/lib/pdf/reports";
import { readFileById } from "@/lib/server/files";

/** Charge le logo et la signature référencés par le style du document. */
export async function loadAssets(
  organizationId: string,
  style: DocumentStyle,
): Promise<DocumentAssets> {
  const [logo, signature] = await Promise.all([
    style.showLogo ? readFileById(organizationId, style.logoFileId) : null,
    style.showSignature ? readFileById(organizationId, style.signatureFileId) : null,
  ]);
  return { logo, signature };
}

export async function renderInvoicePdf(
  invoice: InvoiceSnapshot,
  assets: DocumentAssets,
): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<InvoiceDocument invoice={invoice} assets={assets} />);
}

export async function renderQuotePdf(quote: QuoteDocument, assets: DocumentAssets): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<QuoteDocumentPdf quote={quote} assets={assets} />);
}

export async function renderPreQuotePdf(
  preQuote: PreQuoteDocument,
  assets: DocumentAssets,
): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<PreQuoteDocumentPdf preQuote={preQuote} assets={assets} />);
}

export async function renderReceiptsBookPdf(
  props: Parameters<typeof ReceiptsBookDocument>[0],
): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<ReceiptsBookDocument {...props} />);
}

export async function renderAnnualReportPdf(
  props: Parameters<typeof AnnualReportDocument>[0],
): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<AnnualReportDocument {...props} />);
}
