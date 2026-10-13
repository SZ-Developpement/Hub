import { CompanyForm } from "@/components/settings/company-form";
import { toISOOrNull } from "@/lib/dates";
import { fileUrl } from "@/lib/server/files";
import { getAppContext } from "@/lib/session";

export default async function CompanySettingsPage() {
  const { settings } = await getAppContext();

  return (
    <CompanyForm
      signatureUrl={fileUrl(settings.signatureFileId)}
      defaultValues={{
        companyName: settings.companyName,
        legalForm: settings.legalForm,
        addressLine1: settings.addressLine1,
        addressLine2: settings.addressLine2,
        postalCode: settings.postalCode,
        city: settings.city,
        country: settings.country,
        siret: settings.siret,
        apeCode: settings.apeCode,
        vatNumber: settings.vatNumber,
        email: settings.email,
        phone: settings.phone,
        website: settings.website,
        ownerFirstName: settings.ownerFirstName,
        ownerLastName: settings.ownerLastName,
        ownerTitle: settings.ownerTitle,
        iban: settings.iban,
        bic: settings.bic,
        bankName: settings.bankName,
        activityStartDate: toISOOrNull(settings.activityStartDate),
      }}
    />
  );
}
