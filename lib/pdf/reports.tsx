import "server-only";

import { Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

import type { DocumentStyle, Seller } from "@/lib/documents/types";
import { formatMonthYear } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, URSSAF_STATUS_LABELS } from "@/lib/labels";
import { base, createTheme, DocumentFrame, SectionTitle, type PdfTheme } from "@/lib/pdf/components";
import { pdfDate, pdfMoney } from "@/lib/pdf/format";
import type { AnnualSummary, Receipt } from "@/lib/server/accounting";
import { declarationAmounts } from "@/lib/server/accounting";
import { utcDate } from "@/lib/dates";
import { periodLabel } from "@/lib/urssaf-periods";

type Column = { label: string; width?: number; align?: "left" | "right" };

function ReportTable({
  theme,
  columns,
  rows,
  footer,
}: {
  theme: PdfTheme;
  columns: Column[];
  rows: string[][];
  footer?: string[];
}) {
  const cell = { paddingVertical: 5, paddingHorizontal: 6 };
  const cellStyle = (column: Column) => [
    cell,
    column.width ? { width: column.width } : { flex: 1 },
    column.align === "right" ? base.right : {},
  ];

  return (
    <View style={{ marginTop: 6 }}>
      <View
        fixed
        style={[
          base.row,
          {
            backgroundColor: theme.primary,
            color: theme.onPrimary,
            borderRadius: 3,
            fontSize: 8,
            fontWeight: 600,
          },
        ]}
      >
        {columns.map((column) => (
          <Text key={column.label} style={cellStyle(column)}>
            {column.label}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          wrap={false}
          style={[base.row, { fontSize: 8.5, borderBottomWidth: 0.5, borderBottomColor: theme.border }]}
        >
          {row.map((value, index) => (
            <Text key={index} style={cellStyle(columns[index])}>
              {value}
            </Text>
          ))}
        </View>
      ))}
      {footer ? (
        <View wrap={false} style={[base.row, { fontSize: 9, fontWeight: 700 }]}>
          {footer.map((value, index) => (
            <Text key={index} style={cellStyle(columns[index])}>
              {value}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ReportHeader({
  theme,
  seller,
  title,
  subtitle,
}: {
  theme: PdfTheme;
  seller: Seller;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={[base.between, { alignItems: "flex-start", marginBottom: 14 }]}>
      <View>
        <Text style={{ fontSize: 17, lineHeight: 1.2, fontWeight: 700, color: theme.primary }}>
          {title}
        </Text>
        <Text style={{ color: theme.muted, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={base.bold}>{seller.companyName}</Text>
        {seller.ownerName ? (
          <Text>
            {seller.ownerName}
            {seller.isSoleProprietor ? " EI" : ""}
          </Text>
        ) : null}
        <Text style={{ color: theme.muted }}>
          {seller.siret ? `SIRET ${seller.siret}` : "SIRET en cours d'attribution"}
        </Text>
      </View>
    </View>
  );
}

function Section({ theme, title, children }: { theme: PdfTheme; title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <SectionTitle theme={theme}>{title}</SectionTitle>
      {children}
    </View>
  );
}

// ───────────────────────────── Livre des recettes ─────────────────────────────

export function ReceiptsBookDocument({
  seller,
  style,
  from,
  to,
  receipts,
  totalCents,
}: {
  seller: Seller;
  style: DocumentStyle;
  from: string;
  to: string;
  receipts: Receipt[];
  totalCents: number;
}) {
  const theme = createTheme(style);
  const reportStyle = { ...style, footerText: "" };

  return (
    <DocumentFrame theme={theme} title="Livre des recettes" seller={seller} style={reportStyle}>
      <ReportHeader
        theme={theme}
        seller={seller}
        title="Livre des recettes"
        subtitle={`Du ${pdfDate(from)} au ${pdfDate(to)}`}
      />
      <ReportTable
        theme={theme}
        columns={[
          { label: "Date", width: 58 },
          { label: "Client" },
          { label: "Pièce", width: 82 },
          { label: "Nature", width: 110 },
          { label: "Mode de règlement", width: 90 },
          { label: "Montant", width: 70, align: "right" },
        ]}
        rows={receipts.map((receipt) => [
          pdfDate(receipt.paidOn.toISOString().slice(0, 10)),
          receipt.invoice.client.name,
          receipt.invoice.number ?? "",
          receipt.amountCents < 0 ? "Remboursement" : "Prestation de services",
          PAYMENT_METHOD_LABELS[receipt.method],
          pdfMoney(receipt.amountCents),
        ])}
        footer={["", "", "", "", "Total", pdfMoney(totalCents)]}
      />
      {receipts.length === 0 ? (
        <Text style={{ marginTop: 12, color: theme.muted }}>Aucune recette sur cette période.</Text>
      ) : null}
      <Text style={{ marginTop: 14, fontSize: 8, color: theme.muted }}>
        Recettes enregistrées à leur date d&apos;encaissement, dans l&apos;ordre chronologique.
        Montants hors taxes — {style.footerText || "document établi par le logiciel de gestion."}
      </Text>
    </DocumentFrame>
  );
}

// ───────────────────────────── Récapitulatif annuel ─────────────────────────────

export function AnnualReportDocument({
  seller,
  style,
  summary,
}: {
  seller: Seller;
  style: DocumentStyle;
  summary: AnnualSummary;
}) {
  const theme = createTheme(style);
  const reportStyle = { ...style, footerText: "" };
  const figures: [string, string][] = [
    ["Chiffre d'affaires encaissé", pdfMoney(summary.collectedCents)],
    ["Chiffre d'affaires facturé", pdfMoney(summary.invoicedCents)],
    ["Cotisations sociales", pdfMoney(summary.contributionsCents)],
    ["Dépenses", pdfMoney(summary.expensesCents)],
    ["Bénéfice estimé", pdfMoney(summary.profitCents)],
  ];

  return (
    <DocumentFrame
      theme={theme}
      title={`Récapitulatif ${summary.year}`}
      seller={seller}
      style={reportStyle}
    >
      <ReportHeader
        theme={theme}
        seller={seller}
        title={`Récapitulatif annuel ${summary.year}`}
        subtitle="Recettes, dépenses et cotisations de l'année civile"
      />

      <View style={[base.row, { flexWrap: "wrap", gap: 8 }]}>
        {figures.map(([label, value]) => (
          <View
            key={label}
            style={{ width: 164, padding: 10, borderRadius: 4, backgroundColor: theme.tint }}
          >
            <Text style={{ fontSize: 8, color: theme.muted }}>{label}</Text>
            <Text style={{ fontSize: 13, lineHeight: 1.3, fontWeight: 700 }}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={{ marginTop: 8, fontSize: 8.5, color: theme.muted }}>
        Plafond de chiffre d&apos;affaires : {pdfMoney(summary.ceiling.ceilingCents)}
        {summary.ceiling.prorated ? " (proratisé sur l'année de création)" : ""}, atteint à{" "}
        {Math.round(summary.ceiling.percent)} %. Bénéfice estimé = encaissé − cotisations −
        dépenses ; les dépenses ne sont pas déductibles en micro-entreprise.
      </Text>

      <Section theme={theme} title="Recettes encaissées par mois">
        <ReportTable
          theme={theme}
          columns={[{ label: "Mois" }, { label: "Montant", width: 110, align: "right" }]}
          rows={summary.monthlyRevenue.map((amount, month) => [
            formatMonthYear(utcDate(summary.year, month, 1)),
            pdfMoney(amount),
          ])}
          footer={["Total", pdfMoney(summary.collectedCents)]}
        />
      </Section>

      <Section theme={theme} title="Cotisations URSSAF par période">
        <ReportTable
          theme={theme}
          columns={[
            { label: "Période" },
            { label: "CA déclaré", width: 100, align: "right" },
            { label: "Cotisations", width: 100, align: "right" },
            { label: "Statut", width: 80 },
          ]}
          rows={[...summary.declarations].reverse().map((row) => {
            const amounts = declarationAmounts(row);
            return [
              periodLabel(row.periodStart, row.periodEnd),
              pdfMoney(amounts.revenueCents),
              pdfMoney(amounts.contributionsCents),
              row.status === "TO_DECLARE" ? "Estimation" : URSSAF_STATUS_LABELS[row.status],
            ];
          })}
          footer={["Total", "", pdfMoney(summary.contributionsCents), ""]}
        />
      </Section>

      <Section theme={theme} title="Dépenses par catégorie">
        <ReportTable
          theme={theme}
          columns={[
            { label: "Catégorie" },
            { label: "Nombre", width: 70, align: "right" },
            { label: "Montant", width: 110, align: "right" },
          ]}
          rows={summary.expensesByCategory.map((row) => [
            row.name,
            String(row.count),
            pdfMoney(row.amountCents),
          ])}
          footer={["Total", "", pdfMoney(summary.expensesCents)]}
        />
      </Section>
    </DocumentFrame>
  );
}
