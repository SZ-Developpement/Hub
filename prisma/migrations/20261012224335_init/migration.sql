-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('DARK', 'LIGHT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DocFont" AS ENUM ('HELVETICA', 'INTER', 'IBM_PLEX_SANS', 'MONTSERRAT', 'LORA');

-- CreateEnum
CREATE TYPE "UrssafPeriodicity" AS ENUM ('MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TRANSFER', 'CHECK', 'CARD', 'CASH', 'DIRECT_DEBIT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('PRE_QUOTE', 'QUOTE', 'INVOICE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "YearFormat" AS ENUM ('NONE', 'YY', 'YYYY');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('APP_LOGO', 'FAVICON', 'DOCUMENT_LOGO', 'SIGNATURE', 'AVATAR', 'RECEIPT', 'INVOICE_PDF', 'EINVOICE');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('COMPANY', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('FLAT', 'DAY', 'HOUR', 'MONTH', 'UNIT');

-- CreateEnum
CREATE TYPE "PreQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('NONE', 'PERCENT', 'AMOUNT');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('STANDARD', 'DEPOSIT', 'BALANCE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'PHONE', 'LETTER', 'OTHER');

-- CreateEnum
CREATE TYPE "UrssafStatus" AS ENUM ('TO_DECLARE', 'DECLARED', 'PAID');

-- CreateEnum
CREATE TYPE "ActivityEntity" AS ENUM ('CLIENT', 'SERVICE', 'PRE_QUOTE', 'QUOTE', 'INVOICE', 'PAYMENT', 'EXPENSE', 'URSSAF', 'SETTINGS');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastDailySyncOn" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "legalForm" TEXT NOT NULL DEFAULT 'Entrepreneur individuel (EI)',
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'France',
    "siret" TEXT NOT NULL DEFAULT '',
    "apeCode" TEXT NOT NULL DEFAULT '',
    "vatNumber" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "ownerFirstName" TEXT NOT NULL DEFAULT '',
    "ownerLastName" TEXT NOT NULL DEFAULT '',
    "ownerTitle" TEXT NOT NULL DEFAULT 'Fondateur',
    "signatureFileId" TEXT,
    "iban" TEXT NOT NULL DEFAULT '',
    "bic" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "activityStartDate" DATE,
    "appName" TEXT NOT NULL DEFAULT 'SZ Dev',
    "accentColor" TEXT NOT NULL DEFAULT '#dc2626',
    "theme" "ThemeMode" NOT NULL DEFAULT 'DARK',
    "appLogoFileId" TEXT,
    "faviconFileId" TEXT,
    "docLogoFileId" TEXT,
    "docPrimaryColor" TEXT NOT NULL DEFAULT '#dc2626',
    "docFont" "DocFont" NOT NULL DEFAULT 'INTER',
    "docShowLogo" BOOLEAN NOT NULL DEFAULT true,
    "docShowSignature" BOOLEAN NOT NULL DEFAULT true,
    "docShowOwnerName" BOOLEAN NOT NULL DEFAULT true,
    "docShowIban" BOOLEAN NOT NULL DEFAULT true,
    "docShowEmail" BOOLEAN NOT NULL DEFAULT true,
    "docShowPhone" BOOLEAN NOT NULL DEFAULT true,
    "docShowWebsite" BOOLEAN NOT NULL DEFAULT true,
    "docHeaderText" TEXT NOT NULL DEFAULT '',
    "docFooterText" TEXT NOT NULL DEFAULT '',
    "quoteDefaultNotes" TEXT NOT NULL DEFAULT '',
    "quoteDefaultTerms" TEXT NOT NULL DEFAULT '',
    "invoiceDefaultNotes" TEXT NOT NULL DEFAULT '',
    "invoiceDefaultTerms" TEXT NOT NULL DEFAULT '',
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 30,
    "quoteDefaultDepositRateBp" INTEGER NOT NULL DEFAULT 3000,
    "vatMention" TEXT NOT NULL DEFAULT 'TVA non applicable, art. 293 B du CGI',
    "operationNature" TEXT NOT NULL DEFAULT 'Prestation de services',
    "paymentTermDays" INTEGER NOT NULL DEFAULT 30,
    "acceptedPaymentMethods" "PaymentMethod"[] DEFAULT ARRAY['TRANSFER']::"PaymentMethod"[],
    "latePenaltyText" TEXT NOT NULL DEFAULT 'En cas de retard de paiement, une pénalité égale à trois fois le taux d''intérêt légal en vigueur sera exigible, calculée sur le montant restant dû à compter du lendemain de la date d''échéance.',
    "recoveryFeeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "recoveryFeeCents" INTEGER NOT NULL DEFAULT 4000,
    "earlyPaymentDiscountText" TEXT NOT NULL DEFAULT 'Pas d''escompte pour paiement anticipé.',
    "legalMentions" TEXT NOT NULL DEFAULT '',
    "urssafPeriodicity" "UrssafPeriodicity" NOT NULL DEFAULT 'QUARTERLY',
    "urssafReminderDays" INTEGER NOT NULL DEFAULT 10,
    "revenueCeilingCents" INTEGER NOT NULL DEFAULT 7770000,
    "ceilingWarningPct" INTEGER NOT NULL DEFAULT 80,
    "ceilingCriticalPct" INTEGER NOT NULL DEFAULT 95,
    "vatThresholdCents" INTEGER NOT NULL DEFAULT 3750000,
    "vatUpperThresholdCents" INTEGER NOT NULL DEFAULT 4125000,
    "quoteExpiryAlertDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_rate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "socialRateBp" INTEGER NOT NULL,
    "cfpRateBp" INTEGER NOT NULL DEFAULT 0,
    "incomeTaxRateBp" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "contribution_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "numbering_format" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "prefix" TEXT NOT NULL,
    "separator" TEXT NOT NULL DEFAULT '-',
    "yearFormat" "YearFormat" NOT NULL DEFAULT 'YYYY',
    "digits" INTEGER NOT NULL DEFAULT 4,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "numbering_format_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_counter" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "number_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_file" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "FileKind" NOT NULL,
    "pathname" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT,
    "originalName" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ClientType" NOT NULL DEFAULT 'COMPANY',
    "name" TEXT NOT NULL,
    "siret" TEXT NOT NULL DEFAULT '',
    "vatNumber" TEXT NOT NULL DEFAULT '',
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactRole" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "addressLine1" TEXT NOT NULL DEFAULT '',
    "addressLine2" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT 'France',
    "paymentTermDays" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "unit" "Unit" NOT NULL DEFAULT 'FLAT',
    "unitPriceCents" INTEGER NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PreQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" DATE NOT NULL,
    "need" TEXT NOT NULL DEFAULT '',
    "dailyRateCents" INTEGER,
    "totalDaysMilli" INTEGER NOT NULL DEFAULT 0,
    "priceMinCents" INTEGER NOT NULL DEFAULT 0,
    "priceMaxCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "sentOn" DATE,
    "respondedOn" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pre_quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_quote_item" (
    "id" TEXT NOT NULL,
    "preQuoteId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "daysMilli" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pre_quote_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "preQuoteId" TEXT,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" DATE NOT NULL,
    "validUntil" DATE NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
    "discountValue" INTEGER NOT NULL DEFAULT 0,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "depositRateBp" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "terms" TEXT NOT NULL DEFAULT '',
    "sentOn" DATE,
    "acceptedOn" DATE,
    "declinedOn" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_line" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "serviceId" TEXT,
    "categoryId" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantityMilli" INTEGER NOT NULL DEFAULT 1000,
    "unit" "Unit" NOT NULL DEFAULT 'FLAT',
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,

    CONSTRAINT "quote_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "quoteId" TEXT,
    "type" "InvoiceType" NOT NULL DEFAULT 'STANDARD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "number" TEXT,
    "sequenceYear" INTEGER,
    "sequenceValue" INTEGER,
    "title" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "serviceStart" DATE,
    "serviceEnd" DATE,
    "paymentTermDays" INTEGER NOT NULL DEFAULT 30,
    "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
    "discountValue" INTEGER NOT NULL DEFAULT 0,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "depositDeductionCents" INTEGER NOT NULL DEFAULT 0,
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "paidCents" INTEGER NOT NULL DEFAULT 0,
    "creditedCents" INTEGER NOT NULL DEFAULT 0,
    "paidOn" DATE,
    "depositRateBp" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "terms" TEXT NOT NULL DEFAULT '',
    "creditedInvoiceId" TEXT,
    "creditReason" TEXT NOT NULL DEFAULT '',
    "balanceInvoiceId" TEXT,
    "issuedAt" TIMESTAMPTZ(3),
    "snapshot" JSONB,
    "pdfFileId" TEXT,
    "eInvoiceFormat" TEXT,
    "eInvoiceFileId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "serviceId" TEXT,
    "categoryId" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantityMilli" INTEGER NOT NULL DEFAULT 1000,
    "unit" "Unit" NOT NULL DEFAULT 'FLAT',
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,

    CONSTRAINT "invoice_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paidOn" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'TRANSFER',
    "reference" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_reminder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sentOn" DATE NOT NULL,
    "level" INTEGER NOT NULL,
    "channel" "ReminderChannel" NOT NULL DEFAULT 'EMAIL',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "supplier" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CARD',
    "receiptFileId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urssaf_declaration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "UrssafStatus" NOT NULL DEFAULT 'TO_DECLARE',
    "declaredRevenueCents" INTEGER,
    "contributionsCents" INTEGER,
    "declaredOn" DATE,
    "paidOn" DATE,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "urssaf_declaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" "ActivityEntity" NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "amountCents" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_key_key" ON "rate_limit"("key");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_organizationId_key" ON "settings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_signatureFileId_key" ON "settings"("signatureFileId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_appLogoFileId_key" ON "settings"("appLogoFileId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_faviconFileId_key" ON "settings"("faviconFileId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_docLogoFileId_key" ON "settings"("docLogoFileId");

-- CreateIndex
CREATE UNIQUE INDEX "contribution_rate_organizationId_effectiveFrom_key" ON "contribution_rate"("organizationId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "numbering_format_organizationId_kind_key" ON "numbering_format"("organizationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "number_counter_organizationId_kind_year_key" ON "number_counter"("organizationId", "kind", "year");

-- CreateIndex
CREATE INDEX "stored_file_organizationId_kind_idx" ON "stored_file"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "client_organizationId_name_idx" ON "client"("organizationId", "name");

-- CreateIndex
CREATE INDEX "client_organizationId_archivedAt_idx" ON "client"("organizationId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "service_category_organizationId_name_key" ON "service_category"("organizationId", "name");

-- CreateIndex
CREATE INDEX "service_organizationId_archivedAt_idx" ON "service"("organizationId", "archivedAt");

-- CreateIndex
CREATE INDEX "pre_quote_organizationId_issueDate_idx" ON "pre_quote"("organizationId", "issueDate");

-- CreateIndex
CREATE INDEX "pre_quote_organizationId_status_idx" ON "pre_quote"("organizationId", "status");

-- CreateIndex
CREATE INDEX "pre_quote_clientId_idx" ON "pre_quote"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "pre_quote_organizationId_number_key" ON "pre_quote"("organizationId", "number");

-- CreateIndex
CREATE INDEX "pre_quote_item_preQuoteId_idx" ON "pre_quote_item"("preQuoteId");

-- CreateIndex
CREATE INDEX "quote_organizationId_issueDate_idx" ON "quote"("organizationId", "issueDate");

-- CreateIndex
CREATE INDEX "quote_organizationId_status_idx" ON "quote"("organizationId", "status");

-- CreateIndex
CREATE INDEX "quote_clientId_idx" ON "quote"("clientId");

-- CreateIndex
CREATE INDEX "quote_preQuoteId_idx" ON "quote"("preQuoteId");

-- CreateIndex
CREATE UNIQUE INDEX "quote_organizationId_number_key" ON "quote"("organizationId", "number");

-- CreateIndex
CREATE INDEX "quote_line_quoteId_idx" ON "quote_line"("quoteId");

-- CreateIndex
CREATE INDEX "quote_line_serviceId_idx" ON "quote_line"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_pdfFileId_key" ON "invoice"("pdfFileId");

-- CreateIndex
CREATE INDEX "invoice_organizationId_issueDate_idx" ON "invoice"("organizationId", "issueDate");

-- CreateIndex
CREATE INDEX "invoice_organizationId_status_idx" ON "invoice"("organizationId", "status");

-- CreateIndex
CREATE INDEX "invoice_organizationId_dueDate_idx" ON "invoice"("organizationId", "dueDate");

-- CreateIndex
CREATE INDEX "invoice_clientId_idx" ON "invoice"("clientId");

-- CreateIndex
CREATE INDEX "invoice_quoteId_idx" ON "invoice"("quoteId");

-- CreateIndex
CREATE INDEX "invoice_creditedInvoiceId_idx" ON "invoice"("creditedInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_organizationId_number_key" ON "invoice"("organizationId", "number");

-- CreateIndex
CREATE INDEX "invoice_line_invoiceId_idx" ON "invoice_line"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_line_serviceId_idx" ON "invoice_line"("serviceId");

-- CreateIndex
CREATE INDEX "invoice_line_categoryId_idx" ON "invoice_line"("categoryId");

-- CreateIndex
CREATE INDEX "payment_organizationId_paidOn_idx" ON "payment"("organizationId", "paidOn");

-- CreateIndex
CREATE INDEX "payment_invoiceId_idx" ON "payment"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_reminder_invoiceId_idx" ON "invoice_reminder"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_category_organizationId_name_key" ON "expense_category"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "expense_receiptFileId_key" ON "expense"("receiptFileId");

-- CreateIndex
CREATE INDEX "expense_organizationId_date_idx" ON "expense"("organizationId", "date");

-- CreateIndex
CREATE INDEX "expense_categoryId_idx" ON "expense"("categoryId");

-- CreateIndex
CREATE INDEX "urssaf_declaration_organizationId_dueDate_idx" ON "urssaf_declaration"("organizationId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "urssaf_declaration_organizationId_periodStart_key" ON "urssaf_declaration"("organizationId", "periodStart");

-- CreateIndex
CREATE INDEX "activity_log_organizationId_createdAt_idx" ON "activity_log"("organizationId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_signatureFileId_fkey" FOREIGN KEY ("signatureFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_appLogoFileId_fkey" FOREIGN KEY ("appLogoFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_faviconFileId_fkey" FOREIGN KEY ("faviconFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_docLogoFileId_fkey" FOREIGN KEY ("docLogoFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_rate" ADD CONSTRAINT "contribution_rate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "numbering_format" ADD CONSTRAINT "numbering_format_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "number_counter" ADD CONSTRAINT "number_counter_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_category" ADD CONSTRAINT "service_category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_quote" ADD CONSTRAINT "pre_quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_quote" ADD CONSTRAINT "pre_quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_quote_item" ADD CONSTRAINT "pre_quote_item_preQuoteId_fkey" FOREIGN KEY ("preQuoteId") REFERENCES "pre_quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote" ADD CONSTRAINT "quote_preQuoteId_fkey" FOREIGN KEY ("preQuoteId") REFERENCES "pre_quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line" ADD CONSTRAINT "quote_line_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line" ADD CONSTRAINT "quote_line_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_line" ADD CONSTRAINT "quote_line_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_creditedInvoiceId_fkey" FOREIGN KEY ("creditedInvoiceId") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_balanceInvoiceId_fkey" FOREIGN KEY ("balanceInvoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_pdfFileId_fkey" FOREIGN KEY ("pdfFileId") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line" ADD CONSTRAINT "invoice_line_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "service_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_reminder" ADD CONSTRAINT "invoice_reminder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_reminder" ADD CONSTRAINT "invoice_reminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_category" ADD CONSTRAINT "expense_category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_receiptFileId_fkey" FOREIGN KEY ("receiptFileId") REFERENCES "stored_file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urssaf_declaration" ADD CONSTRAINT "urssaf_declaration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
