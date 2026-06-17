"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient, updateClient } from "@/server/actions/clients";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "../ui/field";

type ClientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
  };
};

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
}: ClientFormDialogProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const isEditing = Boolean(client);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setErrors({});

    const values = {
      name: formData.get("name") as string,
      company: formData.get("company") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      notes: formData.get("notes") as string,
    };

    const result = isEditing
      ? await updateClient(client!.id, values)
      : await createClient(values);

    if (result.error) {
      setErrors(result.error);
      setPending(false);
      return;
    }

    setPending(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le client" : "Nouveau client"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations du client, en modifiant le formulaire ci-dessous."
              : "Ajoutez un nouveau client, en remplissant le formulaire ci-dessous."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Nom *</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Nom du client"
                defaultValue={client?.name}
                required
              />
              {errors.name && (
                <FieldDescription>{errors.name[0]}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="company">Entreprise</FieldLabel>
              <Input
                id="company"
                name="company"
                type="text"
                placeholder="Nom de l'entreprise"
                defaultValue={client?.company ?? ""}
              />
              {errors.company && (
                <FieldDescription>{errors.company[0]}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Adresse email"
                defaultValue={client?.email ?? ""}
                required
              />
              {errors.email && (
                <FieldDescription>{errors.email[0]}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Numéro de téléphone"
                defaultValue={client?.phone ?? ""}
                required
              />
              {errors.phone && (
                <FieldDescription>{errors.phone[0]}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Notes sur le client"
                defaultValue={client?.notes ?? ""}
                className="resize-none"
              />
              {errors.notes && (
                <FieldDescription>{errors.notes[0]}</FieldDescription>
              )}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>

            <Button type="submit" disabled={pending}>
              {pending
                ? isEditing
                  ? "Modification..."
                  : "Création..."
                : isEditing
                  ? "Modifier"
                  : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
