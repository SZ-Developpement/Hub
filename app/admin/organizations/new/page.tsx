import { requireSuperAdmin } from "@/lib/auth/session";
import { CreateOrganizationForm } from "@/components/admin/create-organization-form";

export default async function NewOrganizationPage() {
  await requireSuperAdmin();

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-2xl font-bold">Créer une organisation</h1>
        <p className="text-sm text-muted-foreground">
          Créez une nouvelle branche SZ Core et désignez son fondateur.
        </p>
      </div>
      <CreateOrganizationForm />
    </div>
  );
}
