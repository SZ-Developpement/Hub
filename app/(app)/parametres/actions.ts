"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";

import { Prisma } from "@/generated/prisma/client";
import type { DocumentKind, FileKind } from "@/generated/prisma/enums";
import { action, ADMIN_ROLES, formAction } from "@/lib/action";
import { auth } from "@/lib/auth";
import { BRANDING_TAG } from "@/lib/branding";
import { toDate, today } from "@/lib/dates";
import { db, type Tx } from "@/lib/db";
import { buildLegal, buildSeller, buildStyle } from "@/lib/documents/build";
import { sampleInvoice, samplePreQuote, sampleQuote } from "@/lib/documents/sample";
import { AppError } from "@/lib/errors";
import {
  assertUpload,
  IMAGE_MIME_TYPES,
  processImage,
  type ImagePreset,
} from "@/lib/images";
import { DOCUMENT_KIND_LABELS } from "@/lib/labels";
import {
  counterYear,
  DEFAULT_NUMBERING,
  DOCUMENT_KINDS,
  formatDocumentNumber,
} from "@/lib/numbering";
import {
  loadAssets,
  renderInvoicePdf,
  renderPreQuotePdf,
  renderQuotePdf,
} from "@/lib/pdf/render";
import { fileUrl, removeFile, saveFile } from "@/lib/server/files";
import { ensureUrssafPeriods } from "@/lib/server/sync";
import type { AppContext } from "@/lib/session";
import { changePasswordSchema, profileSchema } from "@/lib/validation/auth";
import {
  accountingSchema,
  appearanceSchema,
  billingSchema,
  companySchema,
  contributionRateSchema,
  documentPreviewSchema,
  documentsSchema,
  type NumberingFormatValues,
} from "@/lib/validation/settings";
import { idSchema, z } from "@/lib/validation/zod";

const adminOnly = { roles: ADMIN_ROLES };

// ───────────────────────────── Entreprise ─────────────────────────────

export const saveCompany = action(
  companySchema,
  async (values, ctx) => {
    await db.$transaction([
      db.settings.update({
        where: { organizationId: ctx.organizationId },
        data: {
          ...values,
          siret: values.siret.replace(/\s/g, ""),
          iban: values.iban.replace(/\s/g, "").toUpperCase(),
          bic: values.bic.toUpperCase(),
          activityStartDate: values.activityStartDate ? toDate(values.activityStartDate) : null,
        },
      }),
      db.organization.update({
        where: { id: ctx.organizationId },
        data: { name: values.companyName },
      }),
    ]);
  },
  adminOnly,
);

// ───────────────────────────── Images (logos, signature) ─────────────────────────────

async function storeImage(ctx: AppContext, file: File, kind: FileKind, preset: ImagePreset) {
  assertUpload(file, IMAGE_MIME_TYPES);
  const processed = await processImage(Buffer.from(await file.arrayBuffer()), preset);
  return saveFile({
    organizationId: ctx.organizationId,
    kind,
    buffer: processed.buffer,
    contentType: processed.contentType,
    fileName: `${kind.toLowerCase().replace(/_/g, "-")}.png`,
    uploadedById: ctx.user.id,
  });
}

function uploadedFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

// ───────────────────────────── Apparence ─────────────────────────────

export const saveAppearance = formAction(async (formData, ctx) => {
  const parsed = appearanceSchema.safeParse({
    appName: formData.get("appName"),
    accentColor: formData.get("accentColor"),
    theme: formData.get("theme"),
  });
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Paramètres d'apparence invalides.");
  }

  const logo = uploadedFile(formData, "logo");
  const favicon = uploadedFile(formData, "favicon");
  const { appLogoFileId: previousLogo, faviconFileId: previousFavicon } = ctx.settings;

  const data: Prisma.SettingsUncheckedUpdateInput = { ...parsed.data };
  if (logo) data.appLogoFileId = (await storeImage(ctx, logo, "APP_LOGO", "logo")).id;
  else if (formData.get("removeLogo") === "1") data.appLogoFileId = null;
  if (favicon) data.faviconFileId = (await storeImage(ctx, favicon, "FAVICON", "favicon")).id;
  else if (formData.get("removeFavicon") === "1") data.faviconFileId = null;

  await db.settings.update({ where: { organizationId: ctx.organizationId }, data });

  // Les anciennes images de l'application ne sont référencées nulle part ailleurs.
  if (previousLogo && data.appLogoFileId !== undefined) {
    await removeFile(ctx.organizationId, previousLogo);
  }
  if (previousFavicon && data.faviconFileId !== undefined) {
    await removeFile(ctx.organizationId, previousFavicon);
  }

  updateTag(BRANDING_TAG);
}, adminOnly);

// ───────────────────────────── Documents ─────────────────────────────

const DOCUMENT_IMAGES = {
  DOCUMENT_LOGO: { field: "docLogoFileId", preset: "logo" },
  SIGNATURE: { field: "signatureFileId", preset: "signature" },
} as const;

type DocumentImageKind = keyof typeof DOCUMENT_IMAGES;

function documentImageKind(value: unknown): DocumentImageKind {
  if (value === "DOCUMENT_LOGO" || value === "SIGNATURE") return value;
  throw new AppError("Type d'image inconnu.");
}

/**
 * Logo des documents et signature. L'ancienne image est conservée dans le stockage :
 * des factures déjà émises peuvent encore y faire référence.
 */
export const uploadDocumentImage = formAction(async (formData, ctx) => {
  const kind = documentImageKind(formData.get("kind"));
  const file = uploadedFile(formData, "file");
  if (!file) throw new AppError("Aucun fichier reçu.");

  const { field, preset } = DOCUMENT_IMAGES[kind];
  const stored = await storeImage(ctx, file, kind, preset);
  await db.settings.update({
    where: { organizationId: ctx.organizationId },
    data: { [field]: stored.id },
  });
  return { fileId: stored.id };
}, adminOnly);

export const removeDocumentImage = action(
  z.object({ kind: z.enum(["DOCUMENT_LOGO", "SIGNATURE"]) }),
  async ({ kind }, ctx) => {
    await db.settings.update({
      where: { organizationId: ctx.organizationId },
      data: { [DOCUMENT_IMAGES[kind].field]: null },
    });
  },
  adminOnly,
);

/**
 * Enregistre un format de numérotation sans rompre la série en cours.
 *
 * Le compteur est indépendant du format : changer le préfixe ou le nombre de chiffres
 * ne le touche pas. Si l'année entre ou sort du format, la clé du compteur change
 * (annuel ↔ continu) : on reporte alors la dernière valeur sur le nouveau compteur.
 * Le « prochain numéro » ne peut qu'être augmenté, jamais ramené en arrière.
 */
async function saveNumbering(
  tx: Tx,
  organizationId: string,
  kind: DocumentKind,
  values: NumberingFormatValues,
  todayDate: Date,
): Promise<void> {
  const where = { organizationId_kind: { organizationId, kind } };
  const current = (await tx.numberingFormat.findUnique({ where })) ?? DEFAULT_NUMBERING[kind];
  const previousYear = counterYear(current, todayDate);
  const year = counterYear(values, todayDate);
  const counterWhere = (counterYearKey: number) => ({
    organizationId_kind_year: { organizationId, kind, year: counterYearKey },
  });

  const [previousCounter, counter] = await Promise.all([
    tx.numberCounter.findUnique({ where: counterWhere(previousYear) }),
    tx.numberCounter.findUnique({ where: counterWhere(year) }),
  ]);
  let lastValue = counter?.lastValue ?? 0;
  if (previousYear !== year) {
    lastValue = Math.max(lastValue, previousCounter?.lastValue ?? 0);
  }

  if (values.nextNumber - 1 < lastValue) {
    throw new AppError(
      `${DOCUMENT_KIND_LABELS[kind]} : le prochain numéro ne peut pas être inférieur à ${lastValue + 1} (numéros déjà attribués).`,
    );
  }
  lastValue = values.nextNumber - 1;

  if (lastValue !== (counter?.lastValue ?? 0) || !counter) {
    await tx.numberCounter.upsert({
      where: counterWhere(year),
      create: { organizationId, kind, year, lastValue },
      update: { lastValue },
    });
  }

  const format = {
    prefix: values.prefix.toUpperCase(),
    separator: values.separator,
    yearFormat: values.yearFormat,
    digits: values.digits,
  };
  await tx.numberingFormat.upsert({
    where,
    create: { organizationId, kind, ...format },
    update: format,
  });
}

export const saveDocuments = action(
  documentsSchema,
  async ({ numbering, ...settings }, ctx) => {
    const year = 2000;
    const sampleNumbers = new Map<string, DocumentKind>();
    // Factures et avoirs partagent la même table : leurs séries ne doivent pas se confondre.
    for (const kind of ["INVOICE", "CREDIT_NOTE"] as const) {
      const sample = formatDocumentNumber(
        { ...numbering[kind], prefix: numbering[kind].prefix.toUpperCase() },
        year,
        1,
      );
      if (sampleNumbers.has(sample)) {
        throw new AppError(
          "Les factures et les avoirs doivent avoir des formats de numérotation distincts (préfixes différents).",
        );
      }
      sampleNumbers.set(sample, kind);
    }

    const todayDate = today();
    await db.$transaction(async (tx) => {
      await tx.settings.update({
        where: { organizationId: ctx.organizationId },
        data: settings,
      });
      for (const kind of DOCUMENT_KINDS) {
        await saveNumbering(tx, ctx.organizationId, kind, numbering[kind], todayDate);
      }
    });
  },
  adminOnly,
);

/** Aperçu PDF d'un document d'exemple, avec les réglages en cours d'édition (non enregistrés). */
export const previewDocument = action(
  documentPreviewSchema,
  async ({ kind, number, notes, terms, ...styleValues }, ctx) => {
    const settings = { ...ctx.settings, ...styleValues };
    const style = buildStyle(settings);
    const sampleContext = {
      seller: buildSeller(settings),
      style,
      legal: buildLegal(settings),
      number,
      notes,
      terms,
      paymentTermDays: settings.paymentTermDays,
      today: today(),
    };
    const assets = await loadAssets(ctx.organizationId, style);

    let pdf: Buffer;
    if (kind === "QUOTE") {
      pdf = await renderQuotePdf(
        sampleQuote({
          ...sampleContext,
          validityDays: settings.quoteValidityDays,
          depositRateBp: settings.quoteDefaultDepositRateBp,
        }),
        assets,
      );
    } else if (kind === "PRE_QUOTE") {
      pdf = await renderPreQuotePdf(samplePreQuote(sampleContext), assets);
    } else {
      pdf = await renderInvoicePdf(sampleInvoice(sampleContext, kind === "CREDIT_NOTE"), assets);
    }
    return { base64: pdf.toString("base64") };
  },
  { refresh: false },
);

// ───────────────────────────── Facturation & légal ─────────────────────────────

export const saveBilling = action(
  billingSchema,
  async (values, ctx) => {
    await db.settings.update({ where: { organizationId: ctx.organizationId }, data: values });
  },
  adminOnly,
);

// ───────────────────────────── Comptabilité ─────────────────────────────

export const saveAccounting = action(
  accountingSchema,
  async (values, ctx) => {
    const periodicityChanged = values.urssafPeriodicity !== ctx.settings.urssafPeriodicity;
    const todayDate = today();

    await db.$transaction(async (tx) => {
      await tx.settings.update({ where: { organizationId: ctx.organizationId }, data: values });
      if (periodicityChanged) {
        // Les périodes en cours non déclarées sont recréées au nouveau rythme.
        await tx.urssafDeclaration.deleteMany({
          where: {
            organizationId: ctx.organizationId,
            status: "TO_DECLARE",
            periodEnd: { gte: todayDate },
          },
        });
      }
    });

    if (periodicityChanged) {
      await ensureUrssafPeriods(
        ctx.organizationId,
        { ...ctx.settings, urssafPeriodicity: values.urssafPeriodicity },
        todayDate,
      );
    }
  },
  adminOnly,
);

export const saveContributionRate = action(
  contributionRateSchema,
  async ({ id, effectiveFrom, ...rates }, ctx) => {
    const data = { ...rates, effectiveFrom: toDate(effectiveFrom) };
    try {
      if (id) {
        const updated = await db.contributionRate.updateMany({
          where: { id, organizationId: ctx.organizationId },
          data,
        });
        if (updated.count === 0) throw new AppError("Ce taux n'existe plus.");
      } else {
        await db.contributionRate.create({
          data: { ...data, organizationId: ctx.organizationId },
        });
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("Un taux est déjà défini à cette date d'effet.");
      }
      throw error;
    }
  },
  adminOnly,
);

export const deleteContributionRate = action(
  idSchema,
  async ({ id }, ctx) => {
    await db.contributionRate.deleteMany({ where: { id, organizationId: ctx.organizationId } });
  },
  adminOnly,
);

// ───────────────────────────── Compte ─────────────────────────────

function authErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "body" in error) {
    const code = (error as { body?: { code?: string } }).body?.code;
    if (code === "INVALID_PASSWORD") return "Le mot de passe actuel est incorrect.";
    if (code === "USER_ALREADY_EXISTS" || code === "COULDNT_UPDATE_YOUR_EMAIL") {
      return "Cette adresse e-mail ne peut pas être utilisée.";
    }
  }
  return fallback;
}

export const updateProfile = action(profileSchema, async ({ name, email }, ctx) => {
  const requestHeaders = await headers();
  try {
    if (name !== ctx.user.name) {
      await auth.api.updateUser({ body: { name }, headers: requestHeaders });
    }
    if (email.toLowerCase() !== ctx.user.email.toLowerCase()) {
      await auth.api.changeEmail({ body: { newEmail: email }, headers: requestHeaders });
    }
  } catch (error) {
    console.error(error);
    throw new AppError(authErrorMessage(error, "Le profil n'a pas pu être mis à jour."));
  }
});

export const changePassword = action(
  changePasswordSchema,
  async ({ currentPassword, newPassword, revokeOtherSessions }) => {
    try {
      await auth.api.changePassword({
        body: { currentPassword, newPassword, revokeOtherSessions },
        headers: await headers(),
      });
    } catch (error) {
      throw new AppError(authErrorMessage(error, "Le mot de passe n'a pas pu être modifié."));
    }
  },
);

function avatarFileId(image: string | null): string | null {
  return image?.startsWith("/api/files/") ? image.slice("/api/files/".length) : null;
}

export const uploadAvatar = formAction(async (formData, ctx) => {
  const file = uploadedFile(formData, "file");
  if (!file) throw new AppError("Aucun fichier reçu.");

  const stored = await storeImage(ctx, file, "AVATAR", "avatar");
  await db.user.update({ where: { id: ctx.user.id }, data: { image: fileUrl(stored.id) } });

  const previous = avatarFileId(ctx.user.image);
  if (previous) await removeFile(ctx.organizationId, previous);
});

export const removeAvatar = action(z.object({}), async (_input, ctx) => {
  await db.user.update({ where: { id: ctx.user.id }, data: { image: null } });
  const previous = avatarFileId(ctx.user.image);
  if (previous) await removeFile(ctx.organizationId, previous);
});

/** Déconnecte un autre appareil. La session courante se ferme via « Se déconnecter ». */
export const revokeSession = action(idSchema, async ({ id }, ctx) => {
  await db.session.deleteMany({
    where: { id, userId: ctx.user.id, token: { not: ctx.sessionToken } },
  });
});

export const revokeOtherSessions = action(z.object({}), async (_input, ctx) => {
  await db.session.deleteMany({
    where: { userId: ctx.user.id, token: { not: ctx.sessionToken } },
  });
});
