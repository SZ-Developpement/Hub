"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileTextIcon,
  LayoutDashboardIcon,
  ReceiptTextIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useForm, useWatch } from "react-hook-form";

import { saveAppearance } from "@/app/(app)/parametres/actions";
import { BrandMark } from "@/components/layout/brand-mark";
import { ColorField } from "@/components/shared/color-field";
import { SelectField, TextField } from "@/components/shared/form-fields";
import { IMAGE_ACCEPT } from "@/components/settings/image-upload";
import { SaveBar, SettingsSection } from "@/components/settings/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { contrastRatio, isHexColor, readableOn } from "@/lib/color";
import { THEME_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { appearanceSchema, type AppearanceValues } from "@/lib/validation/settings";

/** Image en attente d'enregistrement : fichier choisi, ou demande de suppression. */
type PendingImage = { file: File; url: string } | "remove" | null;

function usePrefersDark(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-color-scheme: dark)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => true,
  );
}

function ImagePicker({
  label,
  description,
  currentUrl,
  fallbackUrl = null,
  pending,
  onChange,
}: {
  label: string;
  description: string;
  /** Image personnalisée enregistrée, s'il y en a une. */
  currentUrl: string | null;
  /** Image affichée par défaut quand aucune n'est personnalisée (favicon généré). */
  fallbackUrl?: string | null;
  pending: PendingImage;
  onChange: (next: PendingImage) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const customUrl = pending === "remove" ? null : (pending?.url ?? currentUrl);
  const shownUrl = customUrl ?? fallbackUrl;

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local ou route /api
          <img src={shownUrl} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Aucun</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <input
        ref={input}
        type="file"
        accept={IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onChange({ file, url: URL.createObjectURL(file) });
        }}
      />
      <div className="flex shrink-0 gap-1">
        <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()}>
          {customUrl ? "Remplacer" : "Importer"}
        </Button>
        {customUrl ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("remove")}>
            Retirer
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const PREVIEW_NAV = [
  { label: "Tableau de bord", icon: LayoutDashboardIcon, active: true },
  { label: "Clients", icon: UsersIcon, active: false },
  { label: "Devis", icon: FileTextIcon, active: false },
  { label: "Factures", icon: ReceiptTextIcon, active: false },
];

function AppearancePreview({
  appName,
  accentColor,
  dark,
  logoUrl,
}: {
  appName: string;
  accentColor: string;
  dark: boolean;
  logoUrl: string | null;
}) {
  const accent = isHexColor(accentColor) ? accentColor : "#dc2626";
  const surface = dark ? "#0a0a0a" : "#ffffff";
  const lowContrast = contrastRatio(accent, surface) < 3;

  return (
    <div className="space-y-3">
      <div
        // « dark » ou « theme-light » recalculent toutes les variables dérivées de
        // --brand à l'intérieur de l'aperçu, sans toucher au reste de la page.
        className={cn(
          "overflow-hidden rounded-xl border bg-background text-foreground shadow-sm",
          dark ? "dark" : "theme-light",
        )}
        style={{ "--brand": accent, "--brand-foreground": readableOn(accent) } as CSSProperties}
      >
        <div className="flex min-h-72">
          <div className="hidden w-40 shrink-0 flex-col gap-3 border-r bg-sidebar p-3 text-sidebar-foreground sm:flex">
            <div className="flex items-center gap-2">
              <BrandMark appName={appName || "•"} logoFileId={null} previewUrl={logoUrl} className="size-7" />
              <span className="truncate text-sm font-semibold">{appName || "Nom de l'app"}</span>
            </div>
            <div className="space-y-0.5">
              {PREVIEW_NAV.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                    item.active && "bg-sidebar-accent font-medium",
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-4 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Tableau de bord</p>
              <Button size="sm" type="button" tabIndex={-1}>
                Nouvelle facture
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">CA encaissé</p>
                <p className="text-base font-semibold tabular-nums">12 480 €</p>
                <p className="text-xs text-primary">+ 8,2 %</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">En attente</p>
                <p className="text-base font-semibold tabular-nums">3 250 €</p>
                <Badge className="mt-0.5">2 factures</Badge>
              </div>
            </div>
            <div className="flex h-20 items-end gap-1.5 rounded-lg border bg-card p-3">
              {[38, 55, 46, 72, 64, 88, 79, 100].map((height, index) => (
                <div
                  key={index}
                  className={cn("flex-1 rounded-sm", index === 7 ? "bg-chart-1" : "bg-chart-2")}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly tabIndex={-1} value="Champ sélectionné" className="ring-3 ring-ring/50 border-ring" />
              <Button size="sm" variant="outline" type="button" tabIndex={-1}>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      </div>
      {lowContrast ? (
        <p className="flex items-start gap-2 text-sm text-warning">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          Cette couleur ressort peu sur un fond {dark ? "sombre" : "clair"} : les liens et
          indicateurs risquent d&apos;être difficiles à lire.
        </p>
      ) : null}
    </div>
  );
}

export function AppearanceForm({
  defaultValues,
  logoUrl,
  faviconUrl,
  defaultFaviconUrl,
}: {
  defaultValues: AppearanceValues;
  logoUrl: string | null;
  /** Favicon personnalisé, ou `null` si c'est le monogramme généré qui est servi. */
  faviconUrl: string | null;
  defaultFaviconUrl: string;
}) {
  const { pending, run } = useAction();
  const form = useForm<AppearanceValues>({
    resolver: zodResolver(appearanceSchema),
    defaultValues,
  });
  const [logo, setLogo] = useState<PendingImage>(null);
  const [favicon, setFavicon] = useState<PendingImage>(null);
  const prefersDark = usePrefersDark();
  const values = useWatch({ control: form.control });

  // Libère les aperçus locaux quand ils sont remplacés.
  const previewUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = [logo, favicon].flatMap((image) =>
      image && image !== "remove" ? [image.url] : [],
    );
    for (const url of previewUrls.current) {
      if (!urls.includes(url)) URL.revokeObjectURL(url);
    }
    previewUrls.current = urls;
  }, [logo, favicon]);

  const dirty = form.formState.isDirty || logo !== null || favicon !== null;
  const dark = values.theme === "DARK" || (values.theme === "SYSTEM" && prefersDark);
  const previewLogoUrl = logo === "remove" ? null : (logo?.url ?? logoUrl);

  function reset() {
    form.reset();
    setLogo(null);
    setFavicon(null);
  }

  function onSubmit(submitted: AppearanceValues) {
    const data = new FormData();
    data.set("appName", submitted.appName);
    data.set("accentColor", submitted.accentColor.toLowerCase());
    data.set("theme", submitted.theme);
    if (logo === "remove") data.set("removeLogo", "1");
    else if (logo) data.set("logo", logo.file);
    if (favicon === "remove") data.set("removeFavicon", "1");
    else if (favicon) data.set("favicon", favicon.file);

    run(() => saveAppearance(data), {
      success: "Apparence enregistrée",
      onSuccess: () => {
        form.reset(submitted);
        setLogo(null);
        setFavicon(null);
      },
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start"
    >
      <div className="space-y-6">
        <SettingsSection title="Identité de l'application">
          <FieldGroup>
            <TextField
              control={form.control}
              name="appName"
              label="Nom affiché"
              description="Dans la barre latérale, l'onglet du navigateur et la page de connexion."
            />
            <ImagePicker
              label="Logo"
              description="Barre latérale et page de connexion. PNG, JPG ou SVG."
              currentUrl={logoUrl}
              pending={logo}
              onChange={setLogo}
            />
            <ImagePicker
              label="Favicon"
              description="Icône de l'onglet. Par défaut, un monogramme à la couleur d'accent."
              currentUrl={faviconUrl}
              fallbackUrl={defaultFaviconUrl}
              pending={favicon}
              onChange={setFavicon}
            />
          </FieldGroup>
        </SettingsSection>

        <SettingsSection title="Couleurs et thème">
          <FieldGroup>
            <ColorField
              control={form.control}
              name="accentColor"
              label="Couleur d'accent"
              description="Appliquée aux boutons, liens, indicateurs et graphiques."
            />
            <SelectField
              control={form.control}
              name="theme"
              label="Thème"
              options={(["DARK", "LIGHT", "SYSTEM"] as const).map((value) => ({
                value,
                label: THEME_LABELS[value],
              }))}
              className="max-w-56"
            />
          </FieldGroup>
        </SettingsSection>

        <SaveBar pending={pending} dirty={dirty} onReset={reset} />
      </div>

      <div className="space-y-2 lg:sticky lg:top-16">
        <p className="text-sm font-medium">Aperçu en direct</p>
        <AppearancePreview
          appName={values.appName ?? ""}
          accentColor={values.accentColor ?? ""}
          dark={dark}
          logoUrl={previewLogoUrl}
        />
        <p className="text-sm text-muted-foreground">
          Rien n&apos;est appliqué tant que vous n&apos;avez pas enregistré.
        </p>
      </div>
    </form>
  );
}
