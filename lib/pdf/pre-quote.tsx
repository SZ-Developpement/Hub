import "server-only";

import { Text, View } from "@react-pdf/renderer";

import type { DocumentAssets, PreQuoteDocument } from "@/lib/documents/types";
import {
  base,
  createTheme,
  DocumentFrame,
  Header,
  Parties,
  SectionTitle,
  Subject,
  TextBlock,
} from "@/lib/pdf/components";
import { paragraphs, pdfDate, pdfDays, pdfMoney } from "@/lib/pdf/format";

export function PreQuoteDocumentPdf({
  preQuote,
  assets,
}: {
  preQuote: PreQuoteDocument;
  assets: DocumentAssets;
}) {
  const theme = createTheme(preQuote.style);
  const { seller, buyer, style } = preQuote;
  const cell = { paddingVertical: 7, paddingHorizontal: 8 };
  const hasRange = preQuote.priceMaxCents > 0;

  return (
    <DocumentFrame
      theme={theme}
      title={`Pré-devis ${preQuote.number}`}
      seller={seller}
      style={style}
    >
      <Header
        theme={theme}
        seller={seller}
        style={style}
        logo={assets.logo}
        kind="Pré-devis"
        number={preQuote.number}
        meta={[{ label: "Date", value: pdfDate(preQuote.issueDate) }]}
      />
      <Parties theme={theme} seller={seller} buyer={buyer} style={style} />
      <Subject theme={theme}>{preQuote.title}</Subject>

      <TextBlock theme={theme} title="Votre besoin" text={preQuote.need} />

      {preQuote.items.length > 0 ? (
        <View style={base.section}>
          <SectionTitle theme={theme}>Périmètre envisagé</SectionTitle>
          <View
            style={[
              base.row,
              {
                marginTop: 2,
                backgroundColor: theme.primary,
                color: theme.onPrimary,
                borderRadius: 3,
                fontSize: 8.5,
                fontWeight: 600,
              },
            ]}
          >
            <Text style={[cell, { flex: 1 }]}>Fonctionnalité</Text>
            <Text style={[cell, base.right, { width: 100 }]}>Estimation</Text>
          </View>
          {preQuote.items.map((item, index) => (
            <View
              key={index}
              wrap={false}
              style={[base.row, { borderBottomWidth: 0.75, borderBottomColor: theme.border }]}
            >
              <View style={[cell, { flex: 1 }]}>
                <Text style={base.semibold}>{item.label}</Text>
                {paragraphs(item.description).map((text, lineIndex) => (
                  <Text key={lineIndex} style={{ fontSize: 8.5, color: theme.muted }}>
                    {text}
                  </Text>
                ))}
              </View>
              <Text style={[cell, base.right, { width: 100 }]}>
                {item.daysMilli > 0 ? pdfDays(item.daysMilli) : "—"}
              </Text>
            </View>
          ))}
          <View style={[base.row, { fontWeight: 700 }]}>
            <Text style={[cell, { flex: 1 }]}>Charge totale estimée</Text>
            <Text style={[cell, base.right, { width: 100 }]}>
              {pdfDays(preQuote.totalDaysMilli)}
            </Text>
          </View>
        </View>
      ) : null}

      {hasRange ? (
        <View
          wrap={false}
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 4,
            backgroundColor: theme.tint,
          }}
        >
          <SectionTitle theme={theme}>Fourchette budgétaire estimée</SectionTitle>
          <Text style={{ fontSize: 16, lineHeight: 1.3, fontWeight: 700, color: theme.primary }}>
            {preQuote.priceMinCents > 0 && preQuote.priceMinCents !== preQuote.priceMaxCents
              ? `${pdfMoney(preQuote.priceMinCents)} – ${pdfMoney(preQuote.priceMaxCents)} HT`
              : `${pdfMoney(preQuote.priceMaxCents)} HT`}
          </Text>
          {preQuote.legal.vatMention ? (
            <Text style={{ fontSize: 8.5, color: theme.muted, marginTop: 4 }}>
              {preQuote.legal.vatMention}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View wrap={false} style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 8, color: theme.muted }}>
          Estimation indicative, établie à partir des informations communiquées à ce jour. Elle ne
          constitue ni un devis ni un engagement contractuel : un devis détaillé vous sera adressé
          une fois le périmètre validé.
        </Text>
      </View>

      <TextBlock theme={theme} title="Notes" text={preQuote.notes} />
    </DocumentFrame>
  );
}
