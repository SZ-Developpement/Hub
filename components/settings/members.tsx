"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CopyIcon,
  EllipsisIcon,
  KeyRoundIcon,
  PlusIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserRoundIcon,
} from "lucide-react";
import { useState } from "react";
import {
  useForm,
  useWatch,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { toast } from "sonner";

import {
  addMember,
  changeMemberRole,
  deleteMember,
  resetMemberAccess,
} from "@/app/(app)/parametres/actions";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  FormField,
  SelectField,
  TextField,
} from "@/components/shared/form-fields";
import { StatusBadge } from "@/components/shared/status-badge";
import { SettingsSection } from "@/components/settings/section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldGroup } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import type { MemberRole } from "@/generated/prisma/enums";
import { applyFieldErrors, useAction } from "@/hooks/use-action";
import { formatDate, formatDateTime } from "@/lib/format";
import { MEMBER_ROLE_LABELS } from "@/lib/labels";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";
import {
  ASSIGNABLE_ROLES,
  memberPasswordSchema,
  memberSchema,
  type AssignableRole,
  type MemberPasswordValues,
  type MemberValues,
} from "@/lib/validation/members";

export type MemberRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: MemberRole;
  createdAt: string;
  /** Dernière activité connue ; `null` si la personne ne s'est jamais connectée. */
  lastActiveAt: string | null;
  isCurrentUser: boolean;
};

const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  OWNER:
    "Accès complet. Seul à pouvoir ajouter, modifier ou retirer des membres.",
  ADMIN: "Accès complet, paramètres de l'entreprise compris.",
  MEMBER:
    "Clients, catalogue, devis, factures et comptabilité. Ne peut pas modifier les paramètres.",
};

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({
  value: role,
  label: MEMBER_ROLE_LABELS[role],
}));

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** Mot de passe provisoire, sans caractères qui se confondent à la lecture (0/O, 1/l/I). */
function generatePassword(length = 16): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join(
    "",
  );
}

type Credentials = { name: string; email: string; password: string };

/**
 * Mot de passe provisoire, affiché en clair : l'application n'envoie pas d'e-mail,
 * c'est le propriétaire qui le transmet.
 */
function TemporaryPasswordField<Values extends FieldValues>({
  control,
  name,
  onGenerate,
}: {
  control: Control<Values>;
  name: FieldPath<Values>;
  onGenerate: () => void;
}) {
  return (
    <FormField
      control={control}
      name={name}
      label="Mot de passe provisoire"
      description={`${MIN_PASSWORD_LENGTH} caractères minimum. La personne pourra le changer dans Paramètres › Compte.`}
    >
      {({ field, fieldState, id }) => (
        <InputGroup>
          <InputGroupInput
            {...field}
            id={id}
            value={field.value ?? ""}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            aria-invalid={fieldState.invalid}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton onClick={onGenerate}>Générer</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      )}
    </FormField>
  );
}

/** Identifiants à transmettre, affichés une seule fois après création ou réinitialisation. */
function CredentialsSummary({
  credentials,
  onDone,
}: {
  credentials: Credentials;
  onDone: () => void;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `E-mail : ${credentials.email}\nMot de passe provisoire : ${credentials.password}`,
      );
      toast.success("Identifiants copiés");
    } catch {
      toast.error("Copie impossible : sélectionnez le texte à la main.");
    }
  }

  return (
    <div className="space-y-4">
      <dl className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
        <div>
          <dt className="text-muted-foreground">E-mail</dt>
          <dd className="font-medium break-all">{credentials.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Mot de passe provisoire</dt>
          <dd className="font-mono font-medium break-all">
            {credentials.password}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        Transmettez ces identifiants à {credentials.name}. Le mot de passe ne
        sera plus affiché après la fermeture de cette fenêtre.
      </p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={copy}>
          <CopyIcon data-icon="inline-start" />
          Copier les identifiants
        </Button>
        <Button type="button" onClick={onDone}>
          Terminé
        </Button>
      </DialogFooter>
    </div>
  );
}

function AddMemberDialog({ onClose }: { onClose: () => void }) {
  const { pending, run } = useAction();
  const [created, setCreated] = useState<Credentials | null>(null);
  const form = useForm<MemberValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", email: "", password: "", role: "MEMBER" },
  });
  const role = useWatch({ control: form.control, name: "role" });

  function onSubmit(values: MemberValues) {
    run(() => addMember(values), {
      onSuccess: () =>
        setCreated({
          name: values.name,
          email: values.email.trim().toLowerCase(),
          password: values.password,
        }),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {created ? "Compte créé" : "Ajouter un membre"}
          </DialogTitle>
          <DialogDescription>
            {created
              ? `${created.name} peut maintenant se connecter.`
              : "Créez le compte de la personne, puis transmettez-lui ses identifiants."}
          </DialogDescription>
        </DialogHeader>
        {created ? (
          <CredentialsSummary credentials={created} onDone={onClose} />
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <TextField
                control={form.control}
                name="name"
                label="Nom complet"
                autoComplete="off"
                autoFocus
              />
              <TextField
                control={form.control}
                name="email"
                label="E-mail de connexion"
                type="email"
                autoComplete="off"
              />
              <SelectField
                control={form.control}
                name="role"
                label="Rôle"
                options={ROLE_OPTIONS}
                description={ROLE_DESCRIPTIONS[role]}
              />
              <TemporaryPasswordField
                control={form.control}
                name="password"
                onGenerate={() =>
                  form.setValue("password", generatePassword(), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Spinner data-icon="inline-start" /> : null}
                  Créer le compte
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  member,
  onClose,
}: {
  member: MemberRow;
  onClose: () => void;
}) {
  const { pending, run } = useAction();
  const [updated, setUpdated] = useState<Credentials | null>(null);
  const form = useForm<MemberPasswordValues>({
    resolver: zodResolver(memberPasswordSchema),
    defaultValues: { id: member.id, password: "" },
  });

  function onSubmit(values: MemberPasswordValues) {
    run(() => resetMemberAccess(values), {
      onSuccess: () =>
        setUpdated({
          name: member.name,
          email: member.email,
          password: values.password,
        }),
      onError: (result) => applyFieldErrors(form, result),
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {updated
              ? "Mot de passe réinitialisé"
              : "Réinitialiser le mot de passe"}
          </DialogTitle>
          <DialogDescription>
            {updated
              ? `${member.name} a été déconnecté de tous ses appareils.`
              : `Choisissez un nouveau mot de passe provisoire pour ${member.name}. Ses sessions en cours seront fermées.`}
          </DialogDescription>
        </DialogHeader>
        {updated ? (
          <CredentialsSummary credentials={updated} onDone={onClose} />
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <TemporaryPasswordField
                control={form.control}
                name="password"
                onGenerate={() =>
                  form.setValue("password", generatePassword(), {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Spinner data-icon="inline-start" /> : null}
                  Réinitialiser
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberMenu({ member }: { member: MemberRow }) {
  const { pending, run } = useAction();
  const [resetting, setResetting] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const otherRole: AssignableRole =
    member.role === "ADMIN" ? "MEMBER" : "ADMIN";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions pour ${member.name}`}
            disabled={pending}
          >
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () => changeMemberRole({ id: member.id, role: otherRole }),
                  {
                    success: `${member.name} est maintenant ${MEMBER_ROLE_LABELS[otherRole].toLowerCase()}`,
                  },
                )
              }
            >
              {otherRole === "ADMIN" ? <ShieldCheckIcon /> : <UserRoundIcon />}
              Passer {MEMBER_ROLE_LABELS[otherRole].toLowerCase()}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setResetting(true)}>
              <KeyRoundIcon />
              Réinitialiser le mot de passe
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmRemove(true)}
            >
              <Trash2Icon />
              Retirer
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {resetting ? (
        <ResetPasswordDialog
          member={member}
          onClose={() => setResetting(false)}
        />
      ) : null}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Retirer ${member.name} ?`}
        description="Son compte est supprimé et il est déconnecté immédiatement. Les documents qu'il a créés sont conservés."
        confirmLabel="Retirer"
        destructive
        onConfirm={() =>
          run(() => deleteMember({ id: member.id }), {
            success: "Membre retiré",
          })
        }
      />
    </>
  );
}

export function Members({
  members,
  canManage,
}: {
  members: MemberRow[];
  canManage: boolean;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Membres</CardTitle>
          <CardDescription>
            {canManage
              ? "Les personnes qui ont accès à l'application. Chacune se connecte avec son propre compte."
              : "Les personnes qui ont accès à l'application. Seul le propriétaire peut gérer les membres."}
          </CardDescription>
          {canManage ? (
            <CardAction>
              <Button type="button" size="sm" onClick={() => setAdding(true)}>
                <PlusIcon data-icon="inline-start" />
                Ajouter un membre
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-lg border">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 p-3">
                <Avatar>
                  {member.image ? (
                    <AvatarImage src={member.image} alt="" />
                  ) : null}
                  <AvatarFallback>{initials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="truncate">{member.name}</span>
                    <StatusBadge
                      tone={member.role === "MEMBER" ? "neutral" : "info"}
                    >
                      {MEMBER_ROLE_LABELS[member.role]}
                    </StatusBadge>
                    {member.isCurrentUser ? (
                      <StatusBadge tone="success">Vous</StatusBadge>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {member.email} · ajouté le {formatDate(member.createdAt)} ·{" "}
                    {member.lastActiveAt
                      ? `actif le ${formatDateTime(member.lastActiveAt)}`
                      : "jamais connecté"}
                  </p>
                </div>
                {canManage && member.role !== "OWNER" ? (
                  <MemberMenu member={member} />
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <SettingsSection
        title="Rôles"
        description="Ce que chaque rôle permet de faire."
      >
        <dl className="space-y-3 text-sm">
          {(["OWNER", "ADMIN", "MEMBER"] as const).map((role) => (
            <div key={role} className="grid gap-1 sm:grid-cols-[10rem_1fr]">
              <dt className="font-medium">{MEMBER_ROLE_LABELS[role]}</dt>
              <dd className="text-muted-foreground">
                {ROLE_DESCRIPTIONS[role]}
              </dd>
            </div>
          ))}
        </dl>
      </SettingsSection>

      {adding ? <AddMemberDialog onClose={() => setAdding(false)} /> : null}
    </>
  );
}
