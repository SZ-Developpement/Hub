import { DocumentsForm } from "@/components/settings/documents-form";
import type { DocumentKind } from "@/generated/prisma/enums";
import { today } from "@/lib/dates";
import { db } from "@/lib/db";
import { counterYear, DEFAULT_NUMBERING, DOCUMENT_KINDS } from "@/lib/numbering";
import { getAppContext } from "@/lib/session";
import type { DocumentsValues, NumberingFormatValues } from "@/lib/validation/settings";

const SEPARATORS = ["-", "/", ".", ""] as const;

export default async function DocumentsSettingsPage() {
  const { settings, organizationId } = await getAppContext();
  const todayDate = today();

  const [formats, counters] = await Promise.all([
    db.numberingFormat.findMany({ where: { organizationId } }),
    db.numberCounter.findMany({ where: { organizationId } }),
  ]);

  const numbering = Object.fromEntries(
    DOCUMENT_KINDS.map((kind) => {
      const format = formats.find((item) => item.kind === kind) ?? DEFAULT_NUMBERING[kind];
      const year = counterYear(format, todayDate);
      const counter = counters.find((item) => item.kind === kind && item.year === year);
      const separator = SEPARATORS.find((value) => value === format.separator) ?? "-";
      const values: NumberingFormatValues = {
        prefix: format.prefix,
        separator,
        yearFormat: format.yearFormat,
        digits: format.digits,
        nextNumber: (counter?.lastValue ?? 0) + 1,
      };
      return [kind, values];
    }),
  ) as Record<DocumentKind, NumberingFormatValues>;

  const defaultValues: DocumentsValues = {
    docPrimaryColor: settings.docPrimaryColor,
    docFont: settings.docFont,
    docShowLogo: settings.docShowLogo,
    docShowSignature: settings.docShowSignature,
    docShowOwnerName: settings.docShowOwnerName,
    docShowIban: settings.docShowIban,
    docShowEmail: settings.docShowEmail,
    docShowPhone: settings.docShowPhone,
    docShowWebsite: settings.docShowWebsite,
    docHeaderText: settings.docHeaderText,
    docFooterText: settings.docFooterText,
    quoteDefaultNotes: settings.quoteDefaultNotes,
    quoteDefaultTerms: settings.quoteDefaultTerms,
    invoiceDefaultNotes: settings.invoiceDefaultNotes,
    invoiceDefaultTerms: settings.invoiceDefaultTerms,
    quoteValidityDays: settings.quoteValidityDays,
    quoteDefaultDepositRateBp: settings.quoteDefaultDepositRateBp,
    numbering,
  };

  return (
    <DocumentsForm
      defaultValues={defaultValues}
      logoFileId={settings.docLogoFileId}
      signatureFileId={settings.signatureFileId}
      year={todayDate.getUTCFullYear()}
    />
  );
}
