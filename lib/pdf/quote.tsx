import "server-only";

import { Text, View } from "@react-pdf/renderer";

import { paymentTermLabel } from "@/lib/documents/build";
import type { DocumentAssets, QuoteDocument } from "@/lib/documents/types";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import {
  base,
  createTheme,
  DocumentFrame,
  Header,
  LinesTable,
  Parties,
  SectionTitle,
  SellerSignature,
  Subject,
  TextBlock,
  TotalsBlock,
  type TotalRow,
} from "@/lib/pdf/components";
import { pdfDate, pdfMoney, pdfRate } from "@/lib/pdf/format";
import { applyRate } from "@/lib/money";

export function QuoteDocumentPdf({
  quote,
  assets,
}: {
  quote: QuoteDocument;
  assets: DocumentAssets;
}) {
  const theme = createTheme(quote.style);
  const { seller, buyer, style, legal, totals } = quote;

  const rows: TotalRow[] = [{ label: "Total HT", value: pdfMoney(totals.subtotalCents) }];
  if (totals.discountCents !== 0) {
    const discountLabel =
      quote.discountType === "PERCENT" ? `Remise (${pdfRate(quote.discountValue)})` : "Remise";
    rows.push({ label: discountLabel, value: pdfMoney(-totals.discountCents) });
  }

  const depositCents = applyRate(totals.totalCents, quote.depositRateBp);

  return (
    <DocumentFrame theme={theme} title={`Devis ${quote.number}`} seller={seller} style={style}>
      <Header
        theme={theme}
        seller={seller}
        style={style}
        logo={assets.logo}
        kind="Devis"
        number={quote.number}
        meta={[
          { label: "Date", value: pdfDate(quote.issueDate) },
          { label: "Valable jusqu'au", value: pdfDate(quote.validUntil) },
        ]}
      />
      <Parties theme={theme} seller={seller} buyer={buyer} style={style} />
      <Subject theme={theme}>{quote.title}</Subject>

      <LinesTable theme={theme} lines={quote.lines} />
      <TotalsBlock
        theme={theme}
        rows={rows}
        finalLabel="Total"
        finalValue={pdfMoney(totals.totalCents)}
        mention={legal.vatMention}
      />

      <View wrap={false} style={base.section}>
        <SectionTitle theme={theme}>Modalités</SectionTitle>
        {quote.depositRateBp > 0 ? (
          <Text>
            Acompte de {pdfRate(quote.depositRateBp)} à la commande, soit{" "}
            <Text style={base.semibold}>{pdfMoney(depositCents)}</Text>. Solde à la livraison.
          </Text>
        ) : null}
        <Text>{paymentTermLabel(quote.paymentTermDays)}.</Text>
        {legal.acceptedPaymentMethods.length > 0 ? (
          <Text>
            Moyens de paiement acceptés :{" "}
            {legal.acceptedPaymentMethods
              .map((method) => PAYMENT_METHOD_LABELS[method].toLowerCase())
              .join(", ")}
            .
          </Text>
        ) : null}
        <Text>Devis valable jusqu&apos;au {pdfDate(quote.validUntil)}.</Text>
      </View>

      <TextBlock theme={theme} title="Notes" text={quote.notes} />
      <TextBlock theme={theme} title="Conditions" text={quote.terms} />
      <TextBlock theme={theme} text={legal.legalMentions} muted />

      <View wrap={false} style={[base.between, { marginTop: 26, gap: 20 }]}>
        <View
          style={{
            flex: 1,
            minHeight: 96,
            padding: 10,
            borderWidth: 0.75,
            borderColor: theme.border,
            borderRadius: 4,
          }}
        >
          <SectionTitle theme={theme}>Bon pour accord</SectionTitle>
          <Text style={{ fontSize: 8.5, color: theme.muted }}>
            Date et signature du client, précédées de la mention « Bon pour accord ».
          </Text>
        </View>
        <SellerSignature theme={theme} seller={seller} style={style} signature={assets.signature} />
      </View>
    </DocumentFrame>
  );
}
