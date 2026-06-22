"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function changePassword(
  currentPassword: string,
  newPassword: string,
) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { mustChangePassword: false },
    });

    return { success: true };
  } catch {
    return { error: "Mot de passe actuel incorrect ou erreur inattendue." };
  }
}
