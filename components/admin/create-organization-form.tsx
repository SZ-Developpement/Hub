"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createOrganization,
  searchUsers,
} from "@/server/actions/organizations";

type SearchedUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export function CreateOrganizationForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [founderMode, setFounderMode] = useState<"existing" | "new">("new");
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [result, setResult] = useState<{ tempPassword: string | null } | null>(
    null,
  );

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const users = await searchUsers(query);
    setSearchResults(users);
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);

    const orgData = {
      name: formData.get("name") as string,
      legalName: formData.get("legalName") as string,
      siret: formData.get("siret") as string,
      address: formData.get("address") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      vatApplicable: formData.get("vatApplicable") === "on",
      vatRate: formData.get("vatRate")
        ? Number(formData.get("vatRate"))
        : undefined,
    };

    const founder =
      founderMode === "existing" && selectedUser
        ? { mode: "existing" as const, userId: selectedUser.id }
        : {
            mode: "new" as const,
            firstName: formData.get("firstName") as string,
            lastName: formData.get("lastName") as string,
            email: formData.get("founderEmail") as string,
          };

    const res = await createOrganization(orgData, founder);
    setResult({ tempPassword: res.tempPassword });
    setPending(false);
  }

  // Écran de confirmation après création (affiche le mot de passe une seule fois)
  if (result) {
    return (
      <div className="space-y-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-emerald-600 mb-2">
            Organisation créée avec succès
          </h2>
          {result.tempPassword ? (
            <>
              <p className="text-sm mb-2">
                Transmettez ce mot de passe temporaire au nouveau fondateur :
              </p>
              <code className="block bg-card border border-border rounded-lg px-4 py-2 text-sm font-mono">
                {result.tempPassword}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Ce mot de passe ne sera plus affiché après avoir quitté cette
                page.
              </p>
            </>
          ) : (
            <p className="text-sm">
              L&apos;utilisateur existant a été rattaché comme fondateur.
            </p>
          )}
        </div>
        <Button onClick={() => router.push("/admin/organizations")}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      {/* Infos organisation */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">
          Informations de l&apos;organisation
        </h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Nom *</FieldLabel>
            <Input id="name" name="name" placeholder="SZ Dev" required />
          </Field>

          <Field>
            <FieldLabel htmlFor="legalName">Raison sociale</FieldLabel>
            <Input id="legalName" name="legalName" placeholder="SZ Dev" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="siret">SIRET</FieldLabel>
              <Input id="siret" name="siret" placeholder="123 456 789 00000" />
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="sz-dev@contact.com"
              />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="address">Adresse</FieldLabel>
            <Input
              id="address"
              name="address"
              placeholder="123 Rue de la Paix"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="phone">Téléphone</FieldLabel>
            <Input id="phone" name="phone" placeholder="01 23 45 67 89" />
          </Field>

          <div className="flex items-center justify-between border border-border rounded-lg p-4">
            <div>
              <FieldLabel htmlFor="vatApplicable">TVA applicable</FieldLabel>
              <FieldDescription>
                Désactivé par défaut (franchise en base de TVA)
              </FieldDescription>
            </div>
            <Switch id="vatApplicable" name="vatApplicable" />
          </div>

          <Field>
            <FieldLabel htmlFor="vatRate">Taux de TVA (%)</FieldLabel>
            <Input
              id="vatRate"
              name="vatRate"
              type="number"
              placeholder="20"
              step="0.1"
            />
          </Field>
        </FieldGroup>
      </div>

      {/* Désignation du fondateur */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">
          Fondateur de l&apos;organisation
        </h2>

        <Tabs
          value={founderMode}
          onValueChange={(v) => setFounderMode(v as "existing" | "new")}
        >
          <TabsList>
            <TabsTrigger value="new">Créer un nouveau compte</TabsTrigger>
            <TabsTrigger value="existing">Membre existant</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="flex flex-col gap-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="firstName">Prénom *</FieldLabel>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="John"
                  required={founderMode === "new"}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="lastName">Nom *</FieldLabel>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  required={founderMode === "new"}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="founderEmail">Email *</FieldLabel>
              <Input
                id="founderEmail"
                name="founderEmail"
                placeholder="john.doe@example.com"
                type="email"
                required={founderMode === "new"}
              />
            </Field>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 pt-4">
            <Field>
              <FieldLabel htmlFor="search">
                Rechercher un utilisateur
              </FieldLabel>
              <Input
                id="search"
                placeholder="Nom ou email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </Field>

            {searchResults.length > 0 && (
              <div className="border border-border rounded-lg divide-y divide-border">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(user);
                      setSearchQuery(user.name);
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors"
                  >
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="bg-muted rounded-lg p-3 text-sm">
                Sélectionné : <strong>{selectedUser.name}</strong> (
                {selectedUser.email})
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={pending || (founderMode === "existing" && !selectedUser)}
      >
        {pending ? "Création..." : "Créer l'organisation"}
      </Button>
    </form>
  );
}
