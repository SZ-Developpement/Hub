import "server-only";

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

import { isHexColor, mix, readableOn } from "@/lib/color";
import type {
  Buyer,
  DocumentLine,
  DocumentStyle,
  Seller,
} from "@/lib/documents/types";
import { unitLabel } from "@/lib/labels";
import { fontFamily } from "@/lib/pdf/fonts";
import { paragraphs, pdfMoney, pdfQuantity, pdfSiret } from "@/lib/pdf/format";

// ───────────────────────────── Thème ─────────────────────────────

export type PdfTheme = {
  primary: string;
  onPrimary: string;
  tint: string;
  text: string;
  muted: string;
  border: string;
  font: string;
};

export function createTheme(style: DocumentStyle): PdfTheme {
  const primary = isHexColor(style.primaryColor) ? style.primaryColor : "#111827";
  return {
    primary,
    onPrimary: readableOn(primary),
    tint: mix(primary, "#ffffff", 0.08),
    text: "#111827",
    muted: "#6b7280",
    border: "#e5e7eb",
    font: fontFamily(style.font),
  };
}

const PAGE_MARGIN = 40;
const PAGE_TOP = 36;

export const base = StyleSheet.create({
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  bold: { fontWeight: 700 },
  semibold: { fontWeight: 600 },
  right: { textAlign: "right" },
  small: { fontSize: 8.5 },
  section: { marginTop: 14 },
});

/** Dimensions d'un PNG, lues dans son en-tête (toutes les images stockées sont des PNG). */
function pngSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function FittedImage({
  data,
  maxWidth,
  maxHeight,
}: {
  data: Buffer;
  maxWidth: number;
  maxHeight: number;
}) {
  const size = pngSize(data) ?? { width: maxWidth, height: maxHeight };
  const scale = Math.min(maxWidth / size.width, maxHeight / size.height, 1);
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- composant PDF, pas une balise <img>
    <Image
      src={{ data, format: "png" }}
      style={{ width: size.width * scale, height: size.height * scale }}
    />
  );
}

// ───────────────────────────── Cadre du document ─────────────────────────────

export function DocumentFrame({
  theme,
  title,
  seller,
  style,
  children,
}: {
  theme: PdfTheme;
  /** Titre du fichier PDF (métadonnées). */
  title: string;
  seller: Seller;
  style: DocumentStyle;
  children: ReactNode;
}) {
  const identity = [
    seller.companyName,
    seller.isSoleProprietor && seller.ownerName ? `${seller.ownerName} EI` : seller.legalForm,
    seller.siret ? `SIRET ${pdfSiret(seller.siret)}` : "SIRET en cours d'attribution",
    [seller.addressLine1, `${seller.postalCode} ${seller.city}`.trim()].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join("  ·  ");
  // Le pied de page est fixe : on lui réserve exactement sa hauteur, pas davantage.
  const footerReserve = 50 + paragraphs(style.footerText).length * 11;

  return (
    <Document
      title={title}
      author={seller.companyName}
      creator={seller.companyName}
      producer="SZ Dev Hub"
      language="fr-FR"
    >
      <Page
        size="A4"
        style={{
          paddingTop: PAGE_TOP,
          paddingBottom: footerReserve,
          paddingHorizontal: PAGE_MARGIN,
          fontFamily: theme.font,
          fontSize: 9.5,
          lineHeight: 1.4,
          color: theme.text,
        }}
      >
        {children}

        <View
          fixed
          style={{
            position: "absolute",
            left: PAGE_MARGIN,
            right: PAGE_MARGIN,
            bottom: 26,
            paddingTop: 8,
            borderTopWidth: 0.75,
            borderTopColor: theme.border,
            paddingRight: 44,
          }}
        >
          <View>
            {paragraphs(style.footerText).map((line, index) => (
              <Text key={index} style={{ fontSize: 7.5, color: theme.muted }}>
                {line}
              </Text>
            ))}
            <Text style={{ fontSize: 7.5, color: theme.muted }}>{identity}</Text>
          </View>
        </View>
        <Text
          fixed
          // Largeur explicite : le texte n'est connu qu'au moment de la pagination.
          style={{
            position: "absolute",
            left: PAGE_MARGIN,
            right: PAGE_MARGIN,
            bottom: 26,
            fontSize: 7.5,
            color: theme.muted,
            textAlign: "right",
          }}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

// ───────────────────────────── En-tête ─────────────────────────────

export function Header({
  theme,
  seller,
  style,
  logo,
  kind,
  number,
  meta,
}: {
  theme: PdfTheme;
  seller: Seller;
  style: DocumentStyle;
  logo: Buffer | null;
  /** « Facture », « Devis », « Avoir »… */
  kind: string;
  number: string;
  meta: { label: string; value: string }[];
}) {
  return (
    <View>
      <View style={[base.between, { alignItems: "flex-start" }]}>
        <View style={{ maxWidth: 250 }}>
          {style.showLogo && logo ? (
            <FittedImage data={logo} maxWidth={180} maxHeight={60} />
          ) : (
            <Text style={{ fontSize: 20, lineHeight: 1.2, fontWeight: 700, color: theme.primary }}>
              {seller.companyName}
            </Text>
          )}
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 19,
              lineHeight: 1.2,
              fontWeight: 700,
              color: theme.primary,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            {kind}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>N° {number}</Text>
          <View style={{ marginTop: 6 }}>
            {meta.map((item) => (
              <View key={item.label} style={[base.row, { justifyContent: "flex-end" }]}>
                <Text style={{ color: theme.muted }}>{item.label} : </Text>
                <Text style={base.semibold}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      {style.headerText.trim() ? (
        <View style={{ marginTop: 12 }}>
          {paragraphs(style.headerText).map((line, index) => (
            <Text key={index} style={{ color: theme.muted }}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ───────────────────────────── Émetteur / client ─────────────────────────────

function PartyLabel({ theme, children }: { theme: PdfTheme; children: string }) {
  return (
    <Text
      style={{
        fontSize: 7.5,
        fontWeight: 700,
        color: theme.primary,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}

function AddressLines({ party }: { party: Seller | Buyer }) {
  const cityLine = `${party.postalCode} ${party.city}`.trim();
  return (
    <>
      {party.addressLine1 ? <Text>{party.addressLine1}</Text> : null}
      {party.addressLine2 ? <Text>{party.addressLine2}</Text> : null}
      {cityLine ? <Text>{cityLine}</Text> : null}
      {party.country && party.country.toLowerCase() !== "france" ? <Text>{party.country}</Text> : null}
    </>
  );
}

export function Parties({
  theme,
  seller,
  buyer,
  style,
}: {
  theme: PdfTheme;
  seller: Seller;
  buyer: Buyer;
  style: DocumentStyle;
}) {
  const buyerNumber = buyer.siret.replace(/\D/g, "");

  return (
    <View style={[base.row, { marginTop: 18, gap: 20 }]}>
      <View style={{ flex: 1 }}>
        <PartyLabel theme={theme}>Émetteur</PartyLabel>
        <Text style={base.bold}>{seller.companyName}</Text>
        {seller.isSoleProprietor ? (
          seller.ownerName ? (
            <Text>{seller.ownerName} — Entrepreneur individuel (EI)</Text>
          ) : null
        ) : (
          <Text>{seller.legalForm}</Text>
        )}
        <AddressLines party={seller} />
        <Text style={{ marginTop: 3 }}>
          {seller.siret ? `SIRET : ${pdfSiret(seller.siret)}` : "SIRET en cours d'attribution"}
        </Text>
        {seller.apeCode ? <Text>Code APE : {seller.apeCode}</Text> : null}
        {seller.vatNumber ? <Text>N° TVA : {seller.vatNumber}</Text> : null}
        {style.showEmail && seller.email ? <Text>{seller.email}</Text> : null}
        {style.showPhone && seller.phone ? <Text>{seller.phone}</Text> : null}
        {style.showWebsite && seller.website ? <Text>{seller.website}</Text> : null}
      </View>

      <View
        style={{
          flex: 1,
          padding: 12,
          borderRadius: 4,
          backgroundColor: theme.tint,
        }}
      >
        <PartyLabel theme={theme}>Client</PartyLabel>
        <Text style={base.bold}>{buyer.name}</Text>
        {buyer.type === "COMPANY" && buyer.contactName ? (
          <Text>À l&apos;attention de {buyer.contactName}</Text>
        ) : null}
        <AddressLines party={buyer} />
        {buyerNumber ? (
          <Text style={{ marginTop: 3 }}>
            {buyerNumber.length === 9 ? "SIREN" : "SIRET"} : {pdfSiret(buyerNumber)}
          </Text>
        ) : null}
        {buyer.vatNumber ? <Text>N° TVA : {buyer.vatNumber}</Text> : null}
      </View>
    </View>
  );
}

// ───────────────────────────── Objet & blocs de texte ─────────────────────────────

export function Subject({ theme, children }: { theme: PdfTheme; children: ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text>
        <Text style={{ color: theme.muted }}>Objet : </Text>
        <Text style={base.semibold}>{children}</Text>
      </Text>
    </View>
  );
}

export function SectionTitle({ theme, children }: { theme: PdfTheme; children: string }) {
  return (
    <Text
      style={{
        fontSize: 7.5,
        fontWeight: 700,
        color: theme.muted,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}

export function TextBlock({
  theme,
  title,
  text,
  muted = false,
}: {
  theme: PdfTheme;
  title?: string;
  text: string;
  muted?: boolean;
}) {
  const lines = paragraphs(text);
  if (lines.length === 0) return null;
  const textStyle = muted ? { fontSize: 8.5, color: theme.muted } : undefined;
  const [first, ...rest] = lines;
  return (
    <View style={base.section}>
      {/* Le titre ne se sépare jamais de son premier paragraphe en bas de page. */}
      <View wrap={false}>
        {title ? <SectionTitle theme={theme}>{title}</SectionTitle> : null}
        <Text style={textStyle}>{first}</Text>
      </View>
      {rest.map((line, index) => (
        <Text key={index} style={textStyle}>
          {line}
        </Text>
      ))}
    </View>
  );
}

// ───────────────────────────── Tableau des lignes ─────────────────────────────

const COLUMNS = { quantity: 48, unit: 52, price: 78, total: 82 };

export function LinesTable({ theme, lines }: { theme: PdfTheme; lines: DocumentLine[] }) {
  const cell = { paddingVertical: 6, paddingHorizontal: 8 };

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={[
          base.row,
          {
            backgroundColor: theme.primary,
            color: theme.onPrimary,
            borderRadius: 3,
            fontSize: 8.5,
            fontWeight: 600,
          },
        ]}
      >
        <Text style={[cell, { flex: 1 }]}>Désignation</Text>
        <Text style={[cell, base.right, { width: COLUMNS.quantity }]}>Qté</Text>
        <Text style={[cell, { width: COLUMNS.unit }]}>Unité</Text>
        <Text style={[cell, base.right, { width: COLUMNS.price }]}>P.U. HT</Text>
        <Text style={[cell, base.right, { width: COLUMNS.total }]}>Total HT</Text>
      </View>

      {lines.map((line, index) => (
        <View
          key={index}
          wrap={false}
          style={[base.row, { borderBottomWidth: 0.75, borderBottomColor: theme.border }]}
        >
          <View style={[cell, { flex: 1 }]}>
            <Text style={base.semibold}>{line.label}</Text>
            {paragraphs(line.description).map((text, lineIndex) => (
              <Text key={lineIndex} style={{ fontSize: 8.5, color: theme.muted }}>
                {text}
              </Text>
            ))}
          </View>
          <Text style={[cell, base.right, { width: COLUMNS.quantity }]}>
            {pdfQuantity(line.quantityMilli)}
          </Text>
          <Text style={[cell, { width: COLUMNS.unit }]}>
            {unitLabel(line.unit, line.quantityMilli)}
          </Text>
          <Text style={[cell, base.right, { width: COLUMNS.price }]}>
            {pdfMoney(line.unitPriceCents)}
          </Text>
          <Text style={[cell, base.right, base.semibold, { width: COLUMNS.total }]}>
            {pdfMoney(line.totalCents)}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ───────────────────────────── Totaux ─────────────────────────────

export type TotalRow = { label: string; value: string; muted?: boolean };

export function TotalsBlock({
  theme,
  rows,
  finalLabel,
  finalValue,
  mention,
}: {
  theme: PdfTheme;
  rows: TotalRow[];
  finalLabel: string;
  finalValue: string;
  /** Mention de TVA, affichée sous le total. */
  mention?: string;
}) {
  return (
    <View wrap={false} style={{ marginTop: 12, alignItems: "flex-end" }}>
      <View style={{ width: 270 }}>
        {rows.map((row) => (
          <View key={row.label} style={[base.between, { paddingVertical: 3, paddingHorizontal: 8 }]}>
            <Text style={{ color: theme.muted, flex: 1, paddingRight: 8 }}>{row.label}</Text>
            <Text style={row.muted ? { color: theme.muted } : undefined}>{row.value}</Text>
          </View>
        ))}
        <View
          style={[
            base.between,
            {
              marginTop: 4,
              paddingVertical: 8,
              paddingHorizontal: 8,
              borderRadius: 3,
              backgroundColor: theme.primary,
              color: theme.onPrimary,
              fontSize: 11,
              fontWeight: 700,
            },
          ]}
        >
          <Text>{finalLabel}</Text>
          <Text>{finalValue}</Text>
        </View>
        {mention ? (
          <Text style={{ marginTop: 5, fontSize: 8.5, color: theme.muted, textAlign: "right" }}>
            {mention}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ───────────────────────────── Signature ─────────────────────────────

export function SellerSignature({
  theme,
  seller,
  style,
  signature,
}: {
  theme: PdfTheme;
  seller: Seller;
  style: DocumentStyle;
  signature: Buffer | null;
}) {
  const showImage = style.showSignature && signature;
  const showName = style.showOwnerName && seller.ownerName;
  if (!showImage && !showName) return null;

  return (
    <View style={{ width: 200 }}>
      <SectionTitle theme={theme}>{`Pour ${seller.companyName}`}</SectionTitle>
      {showImage ? <FittedImage data={signature} maxWidth={150} maxHeight={56} /> : null}
      {showName ? (
        <View style={{ marginTop: showImage ? 4 : 0 }}>
          <Text style={base.semibold}>{seller.ownerName}</Text>
          {seller.ownerTitle ? <Text style={{ color: theme.muted }}>{seller.ownerTitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
