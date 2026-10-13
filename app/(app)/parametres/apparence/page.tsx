import { AppearanceForm } from "@/components/settings/appearance-form";
import { getAppContext } from "@/lib/session";

export default async function AppearanceSettingsPage() {
  const { settings } = await getAppContext();

  return (
    <AppearanceForm
      // Remonte le formulaire après enregistrement d'un nouveau logo.
      key={`${settings.appLogoFileId}-${settings.faviconFileId}`}
      logoUrl={settings.appLogoFileId ? `/api/branding/logo?v=${settings.appLogoFileId}` : null}
      faviconUrl={
        settings.faviconFileId ? `/api/branding/favicon?v=${settings.faviconFileId}` : null
      }
      defaultFaviconUrl={`/api/branding/favicon?v=${settings.accentColor.slice(1)}`}
      defaultValues={{
        appName: settings.appName,
        accentColor: settings.accentColor,
        theme: settings.theme,
      }}
    />
  );
}
