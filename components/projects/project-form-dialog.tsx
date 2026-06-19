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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "../ui/field";
import { createProject, updateProject } from "@/server/actions/projects";
import { ProjectStatus } from "@/generated/prisma/client";

type ClientOption = { id: string; name: string };

type ProjectFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  project?: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    clientId: string | null;
    startDate: Date | null;
    endDate: Date | null;
    notes: string | null;
  };
};

const statusLabels: Record<ProjectStatus, string> = {
  PLANNING: "Planification",
  IN_PROGRESS: "En cours",
  ON_HOLD: "En pause",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  clients,
  project,
}: ProjectFormDialogProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? "PLANNING",
  );
  const [clientId, setClientId] = useState(project?.clientId ?? "");
  const isEditing = Boolean(project);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setErrors({});

    const values = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      status,
      clientId,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      notes: formData.get("notes") as string,
    };

    const result = isEditing
      ? await updateProject(project!.id, values)
      : await createProject(values);

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
            {isEditing ? "Modifier le projet" : "Nouveau projet"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations du projet, en modifiant le formulaire ci-dessous."
              : "Ajoutez un nouveau projet, en remplissant le formulaire ci-dessous."}
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
                placeholder="Nom du projet"
                defaultValue={project?.name}
                required
              />
              {errors.name && (
                <FieldDescription>{errors.name[0]}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                name="description"
                placeholder="Description du projet"
                defaultValue={project?.description ?? ""}
                className="resize-none"
              />
              {errors.description && (
                <FieldDescription>{errors.description[0]}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="status">Statut</FieldLabel>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ProjectStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="clientId">Client</FieldLabel>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun client (projet interne)" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="startDate">Date de début</FieldLabel>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={toDateInputValue(project?.startDate ?? null)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="endDate">Date de fin</FieldLabel>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={toDateInputValue(project?.endDate ?? null)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Notes sur le client"
                defaultValue={project?.notes ?? ""}
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
