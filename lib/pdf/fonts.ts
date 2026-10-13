import "server-only";

import path from "node:path";

import { Font } from "@react-pdf/renderer";

import type { DocFont } from "@/generated/prisma/enums";

// Polices embarquées dans le dépôt (assets/fonts, licence OFL) : le rendu ne dépend
// d'aucun service externe et reste identique d'un déploiement à l'autre.
const FAMILIES: Record<Exclude<DocFont, "HELVETICA">, { family: string; file: string }> = {
  INTER: { family: "Inter", file: "inter" },
  IBM_PLEX_SANS: { family: "IBM Plex Sans", file: "ibm-plex-sans" },
  MONTSERRAT: { family: "Montserrat", file: "montserrat" },
  LORA: { family: "Lora", file: "lora" },
};

let registered = false;

export function ensureFonts(): void {
  if (registered) return;
  const directory = path.join(/* turbopackIgnore: true */ process.cwd(), "assets", "fonts");

  for (const { family, file } of Object.values(FAMILIES)) {
    const src = (variant: string) => path.join(directory, `${file}-latin-${variant}.woff`);
    Font.register({
      family,
      fonts: [
        { src: src("400-normal"), fontWeight: 400 },
        { src: src("400-italic"), fontWeight: 400, fontStyle: "italic" },
        { src: src("600-normal"), fontWeight: 600 },
        { src: src("700-normal"), fontWeight: 700 },
      ],
    });
  }
  // Pas de césure automatique : elle est prévue pour l'anglais et coupe mal le français.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

export function fontFamily(font: DocFont): string {
  return font === "HELVETICA" ? "Helvetica" : FAMILIES[font].family;
}
