import { BillingForm } from "@/components/settings/billing-form";
import { getAppContext } from "@/lib/session";

export default async function BillingSettingsPage() {
  const { settings } = await getAppContext();

  return (
    <BillingForm
      defaultValues={{
        vatMention: settings.vatMention,
        operationNature: settings.operationNature,
        paymentTermDays: settings.paymentTermDays,
        acceptedPaymentMethods: settings.acceptedPaymentMethods,
        latePenaltyText: settings.latePenaltyText,
        recoveryFeeEnabled: settings.recoveryFeeEnabled,
        recoveryFeeCents: settings.recoveryFeeCents,
        earlyPaymentDiscountText: settings.earlyPaymentDiscountText,
        legalMentions: settings.legalMentions,
      }}
    />
  );
}
