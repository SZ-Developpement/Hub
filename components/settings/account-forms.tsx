"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LaptopIcon, SmartphoneIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import {
  changePassword,
  removeAvatar,
  revokeOtherSessions,
  revokeSession,
  updateProfile,
  uploadAvatar,
} from "@/app/(app)/parametres/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SwitchField, TextField } from "@/components/shared/form-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { ImageUpload } from "@/components/settings/image-upload";
import { SettingsSection } from "@/components/settings/section";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { formatDateTime } from "@/lib/format";
import {
  changePasswordSchema,
  MIN_PASSWORD_LENGTH,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/lib/validation/auth";

export function ProfileForm({
  defaultValues,
  avatarUrl,
}: {
  defaultValues: ProfileValues;
  avatarUrl: string | null;
}) {
  const { pending, run } = useAction();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  function onSubmit(values: ProfileValues) {
    run(() => updateProfile(values), {
      success: "Profil mis à jour",
      onSuccess: () => form.reset(values),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <SettingsSection title="Profil" description="Votre identité de connexion à l'application.">
      <FieldGroup>
        <ImageUpload
          label="Photo de profil"
          description="PNG ou JPG — 4 Mo max. Recadrée en carré."
          imageUrl={avatarUrl}
          rounded
          uploadedMessage="Photo de profil enregistrée"
          onUpload={(file) => {
            const data = new FormData();
            data.set("file", file);
            return uploadAvatar(data);
          }}
          onRemove={() => removeAvatar({})}
        />
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="name" label="Nom complet" autoComplete="name" />
              <TextField
                control={form.control}
                name="email"
                label="E-mail de connexion"
                type="email"
                autoComplete="email"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!form.formState.isDirty || pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Enregistrer
              </Button>
            </div>
          </FieldGroup>
        </form>
      </FieldGroup>
    </SettingsSection>
  );
}

export function PasswordForm() {
  const { pending, run } = useAction();
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
      revokeOtherSessions: true,
    },
  });

  function onSubmit(values: ChangePasswordValues) {
    run(() => changePassword(values), {
      success: "Mot de passe modifié",
      onSuccess: () => form.reset(),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <SettingsSection title="Mot de passe">
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <TextField
            control={form.control}
            name="currentPassword"
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            className="max-w-sm"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={form.control}
              name="newPassword"
              label="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              description={`${MIN_PASSWORD_LENGTH} caractères minimum.`}
            />
            <TextField
              control={form.control}
              name="newPasswordConfirm"
              label="Confirmer le nouveau mot de passe"
              type="password"
              autoComplete="new-password"
            />
          </div>
          <SwitchField
            control={form.control}
            name="revokeOtherSessions"
            label="Déconnecter les autres appareils"
            description="Recommandé si vous pensez que votre mot de passe a été compromis."
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Modifier le mot de passe
            </Button>
          </div>
        </FieldGroup>
      </form>
    </SettingsSection>
  );
}

export type SessionRow = {
  id: string;
  device: string;
  mobile: boolean;
  ipAddress: string | null;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
};

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const { pending, run } = useAction();
  const others = sessions.filter((session) => !session.current);

  return (
    <SettingsSection
      title="Sessions actives"
      description="Appareils actuellement connectés à votre compte."
    >
      <div className="space-y-4">
        <ul className="divide-y rounded-lg border">
          {sessions.map((session) => {
            const Icon = session.mobile ? SmartphoneIcon : LaptopIcon;
            return (
              <li key={session.id} className="flex items-center gap-3 p-3">
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {session.device}
                    {session.current ? <StatusBadge tone="success">Cet appareil</StatusBadge> : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {session.ipAddress ? `${session.ipAddress} · ` : ""}
                    Connecté le {formatDateTime(session.createdAt)} · actif le{" "}
                    {formatDateTime(session.lastActiveAt)}
                  </p>
                </div>
                {!session.current ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() => revokeSession({ id: session.id }), { success: "Appareil déconnecté" })
                    }
                  >
                    Déconnecter
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {others.length > 0 ? (
          <div className="flex justify-end">
            <ConfirmDialog
              trigger={
                <Button type="button" variant="outline" disabled={pending}>
                  Déconnecter tous les autres appareils
                </Button>
              }
              title="Déconnecter les autres appareils ?"
              description={`${others.length} session${others.length > 1 ? "s seront fermées" : " sera fermée"}. Vous resterez connecté sur cet appareil.`}
              confirmLabel="Déconnecter"
              onConfirm={() =>
                run(() => revokeOtherSessions({}), { success: "Autres appareils déconnectés" })
              }
            />
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}
