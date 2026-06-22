import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (session && !session.user.mustChangePassword) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
