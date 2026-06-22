import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function ChangePasswordPage() {
  const session = await getSession();

  // Non connecté → login
  if (!session) {
    redirect("/login");
  }

  // Mot de passe déjà changé → dashboard
  if (!session.user.mustChangePassword) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            Changer votre mot de passe
          </h1>
          <p className="text-sm text-muted-foreground">
            Pour des raisons de sécurité, vous devez définir un nouveau mot de
            passe avant de continuer.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
