import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Middleware qui vérifie si l'utilisateur est connecté avant d'accéder aux routes protégées
export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

// Configuration du middleware pour qu'il s'applique uniquement aux routes protégées
export const config = {
  // matcher: ["/dashboard/:path*"] est utilisé pour protéger toutes les routes sous /dashboard
  matcher: ["/dashboard/:path*"],
};
