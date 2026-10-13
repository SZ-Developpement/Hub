import "server-only";

import { Text, View } from "@react-pdf/renderer";

import { paymentTermLabel } from "@/lib/documents/build";
import type { DocumentAssets, InvoiceSnapshot } from "@/lib/documents/types";
import { INVOICE_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
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
import { pdfDate, pdfIban, pdfMoney, pdfRate } from "@/lib/pdf/format";

function servicePeriod(start: string | null, end: string | null): { label: string; value: string } | null {
  if (!start) return null;
  if (!end || end === start) return { label: "Date de prestation", value: pdfDate(start) };
  return { label: "Période de prestation", value: `du ${pdfDate(start)} au ${pdfDate(end)}` };
}

export function InvoiceDocument({
  invoice,
  assets,
}: {
  invoice: InvoiceSnapshot;
  assets: DocumentAssets;
}) {
  const theme = createTheme(invoice.style);
  const { seller, buyer, style, legal, totals } = invoice;
  const isCreditNote = invoice.type === "CREDIT_NOTE";
  const kind = INVOICE_TYPE_LABELS[invoice.type];

  const meta = [{ label: "Date d'émission", value: pdfDate(invoice.issueDate) }];
  const period = isCreditNote ? null : servicePeriod(invoice.serviceStart, invoice.serviceEnd);
  if (period) meta.push(period);
  if (!isCreditNote) meta.push({ label: "Échéance", value: pdfDate(invoice.dueDate) });
  if (invoice.quote) meta.push({ label: "Réf. devis", value: invoice.quote.number });

  const rows: TotalRow[] = [{ label: "Total HT", value: pdfMoney(totals.subtotalCents) }];
  if (totals.discountCents !== 0) {
    const discountLabel =
      invoice.discountType === "PERCENT" ? `Remise (${pdfRate(invoice.discountValue)})` : "Remise";
    rows.push({ label: discountLabel, value: pdfMoney(-totals.discountCents) });
    rows.push({ label: "Total HT après remise", value: pdfMoney(totals.totalCents) });
  }
  for (const deposit of invoice.deposits) {
    rows.push({
      label: `Acompte ${deposit.number} du ${pdfDate(deposit.issueDate)}`,
      value: pdfMoney(-deposit.amountCents),
    });
  }

  const showBank = style.showIban && seller.iban.trim() !== "";
  const showRecoveryFee = buyer.type === "COMPANY" && legal.recoveryFeeCents !== null;

  return (
    <DocumentFrame theme={theme} title={`${kind} ${invoice.number}`} seller={seller} style={style}>
      <Header
        theme={theme}
        seller={seller}
        style={style}
        logo={assets.logo}
        kind={kind}
        number={invoice.number}
        meta={meta}
      />
      <Parties theme={theme} seller={seller} buyer={buyer} style={style} />

      <Subject theme={theme}>{invoice.title}</Subject>
      {invoice.creditedInvoice ? (
        <Text style={{ marginTop: 4 }}>
          Avoir sur la facture {invoice.creditedInvoice.number} du{" "}
          {pdfDate(invoice.creditedInvoice.issueDate)}
          {invoice.creditReason ? ` — Motif : ${invoice.creditReason}` : ""}
        </Text>
      ) : null}

      <LinesTable theme={theme} lines={invoice.lines} />
      <TotalsBlock
        theme={theme}
        rows={rows}
        finalLabel={isCreditNote ? "Montant de l'avoir" : "Net à payer"}
        finalValue={pdfMoney(totals.netCents)}
        mention={legal.vatMention}
      />

      {!isCreditNote ? (
        <View wrap={false} style={[base.section, base.row, { gap: 20 }]}>
          <View style={{ flex: 1 }}>
            <SectionTitle theme={theme}>Règlement</SectionTitle>
            <Text>
              {paymentTermLabel(invoice.paymentTermDays)} — échéance le{" "}
              <Text style={base.semibold}>{pdfDate(invoice.dueDate)}</Text>
            </Text>
            {legal.acceptedPaymentMethods.length > 0 ? (
              <Text>
                Moyens de paiement acceptés :{" "}
                {legal.acceptedPaymentMethods
                  .map((method) => PAYMENT_METHOD_LABELS[method].toLowerCase())
                  .join(", ")}
              </Text>
            ) : null}
          </View>
          {showBank ? (
            <View style={{ flex: 1 }}>
              <SectionTitle theme={theme}>Coordonnées bancaires</SectionTitle>
              {seller.bankName ? <Text>{seller.bankName}</Text> : null}
              <Text>IBAN : {pdfIban(seller.iban)}</Text>
              {seller.bic ? <Text>BIC : {seller.bic}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <TextBlock theme={theme} title="Notes" text={invoice.notes} />
      <TextBlock theme={theme} title="Conditions" text={invoice.terms} />
      <TextBlock theme={theme} text={legal.legalMentions} muted />

      {/* Mentions légales à gauche, signature à droite : le bas de page tient sur une ligne. */}
      <View wrap={false} style={[base.section, base.row, { gap: 20, alignItems: "flex-start" }]}>
        <View style={{ flex: 1 }}>
          {!isCreditNote ? (
            <>
              <SectionTitle theme={theme}>Mentions légales</SectionTitle>
              <View style={{ fontSize: 7.5, color: theme.muted }}>
                {legal.operationNature ? (
                  <Text>Nature de l&apos;opération : {legal.operationNature.toLowerCase()}.</Text>
                ) : null}
                {legal.latePenaltyText ? <Text>{legal.latePenaltyText}</Text> : null}
                {showRecoveryFee ? (
                  <Text>
                    Indemnité forfaitaire pour frais de recouvrement due en cas de retard de
                    paiement{" "}: {pdfMoney(legal.recoveryFeeCents ?? 0)}.
                  </Text>
                ) : null}
                {legal.earlyPaymentDiscountText ? (
                  <Text>{legal.earlyPaymentDiscountText}</Text>
                ) : null}
              </View>
            </>
          ) : null}
        </View>
        <SellerSignature theme={theme} seller={seller} style={style} signature={assets.signature} />
      </View>
    </DocumentFrame>
  );
}
