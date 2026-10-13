import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/setup"]);

/**
 * Contrôle optimiste : sans cookie de session, on renvoie tout de suite vers /login.
 *
 * Ce n'est qu'un raccourci d'ergonomie — la présence du cookie ne prouve rien. La
 * vérification réelle de la session a lieu côté serveur, dans `getAppContext()`,
 * pour chaque page, action et route d'API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  if (!getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("from", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Les routes d'API font leur propre contrôle et répondent 401 plutôt qu'une redirection.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|txt)$).*)"],
};
