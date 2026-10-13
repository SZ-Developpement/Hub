"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, type ComponentProps } from "react";

export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props} />;
}

/**
 * Le thème est un paramètre de l'application, enregistré en base. next-themes le garde
 * aussi dans le navigateur (pour éviter tout flash au chargement) : ce composant réaligne
 * le navigateur sur la valeur enregistrée, par exemple après un changement depuis un autre appareil.
 */
export function ThemeSync({ theme }: { theme: string }) {
  const { theme: current, setTheme } = useTheme();

  useEffect(() => {
    if (current !== theme) setTheme(theme);
    // On ne réagit qu'au changement du paramètre enregistré.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return null;
}
