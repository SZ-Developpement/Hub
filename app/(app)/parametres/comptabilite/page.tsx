import { AccountingForm } from "@/components/settings/accounting-form";
import { ContributionRates } from "@/components/settings/contribution-rates";
import { toISO, todayISO } from "@/lib/dates";
import { db } from "@/lib/db";
import { getAppContext } from "@/lib/session";

export default async function AccountingSettingsPage() {
  const { settings, organizationId } = await getAppContext();
  const rates = await db.contributionRate.findMany({
    where: { organizationId },
    orderBy: { effectiveFrom: "desc" },
  });

  return (
    <div className="space-y-6">
      <ContributionRates
        today={todayISO()}
        rates={rates.map((rate) => ({
          id: rate.id,
          effectiveFrom: toISO(rate.effectiveFrom),
          socialRateBp: rate.socialRateBp,
          cfpRateBp: rate.cfpRateBp,
          incomeTaxRateBp: rate.incomeTaxRateBp,
          note: rate.note,
        }))}
      />
      <AccountingForm
        defaultValues={{
          urssafPeriodicity: settings.urssafPeriodicity,
          urssafReminderDays: settings.urssafReminderDays,
          revenueCeilingCents: settings.revenueCeilingCents,
          ceilingWarningPct: settings.ceilingWarningPct,
          ceilingCriticalPct: settings.ceilingCriticalPct,
          vatThresholdCents: settings.vatThresholdCents,
          vatUpperThresholdCents: settings.vatUpperThresholdCents,
          quoteExpiryAlertDays: settings.quoteExpiryAlertDays,
        }}
      />
    </div>
  );
}
