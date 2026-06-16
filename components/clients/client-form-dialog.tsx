"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createClient } from "@/server/actions/clients";

type ClientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ClientFormDialog({
  open,
  onOpenChange,
}: ClientFormDialogProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

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

    const result = await createClient(values);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nom *</Label>
            <Input id="name" name="name" required />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="company">Entreprise</Label>
            <Input id="company" name="company" />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
            {errors.email && (
              <p className="text-sm text-destructive mt-1">{errors.email[0]}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
