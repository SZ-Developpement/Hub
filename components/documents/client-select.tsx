"use client";

import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EMPTY_CLIENT } from "@/lib/validation/clients";

export type ClientChoice = { id: string; name: string; paymentTermDays?: number | null };

/** Liste déroulante de clients avec recherche et création rapide sans quitter le formulaire. */
export function ClientSelect({
  id,
  value,
  onChange,
  clients,
  defaultPaymentTermDays,
  invalid = false,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (clientId: string, client: ClientChoice) => void;
  clients: ClientChoice[];
  defaultPaymentTermDays: number;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  // Client créé à l'instant : affiché avant même que la liste du serveur soit rafraîchie.
  const [created, setCreated] = useState<ClientChoice | null>(null);

  const options =
    created && !clients.some((client) => client.id === created.id) ? [...clients, created] : clients;
  const selected = options.find((client) => client.id === value);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {selected ? (
              <span className="truncate">{selected.name}</span>
            ) : (
              <span className="text-muted-foreground">Sélectionner un client…</span>
            )}
            <ChevronsUpDownIcon className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un client…" />
            <CommandList>
              <CommandEmpty>Aucun client trouvé.</CommandEmpty>
              <CommandGroup>
                {options.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    keywords={[client.name]}
                    onSelect={() => {
                      onChange(client.id, client);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{client.name}</span>
                    <CheckIcon
                      className={cn("ml-auto", client.id === value ? "opacity-100" : "opacity-0")}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__nouveau-client__"
                  keywords={["nouveau", "créer", "ajouter"]}
                  onSelect={() => {
                    setOpen(false);
                    setCreating(true);
                  }}
                >
                  <PlusIcon />
                  Nouveau client
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>
              Il sera sélectionné automatiquement. Vous pourrez compléter sa fiche plus tard.
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            compact
            defaultValues={EMPTY_CLIENT}
            defaultPaymentTermDays={defaultPaymentTermDays}
            onCancel={() => setCreating(false)}
            onCreated={(client) => {
              const choice = { ...client, paymentTermDays: null };
              setCreated(choice);
              onChange(client.id, choice);
              setCreating(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
