// Palette catégorielle des graphiques.
//
// La première couleur est toujours la couleur d'accent de l'application. Les suivantes
// viennent d'une palette de référence validée (bande de clarté, séparation daltonisme),
// dans un ordre fixe. Comme l'accent est libre, on écarte à l'exécution les teintes trop
// proches de lui ou de la précédente : deux parts voisines restent toujours distinctes.

import { hexToRgb, isHexColor } from "@/lib/color";

type Hue = { name: string; light: string; dark: string };

/** Teintes de référence, dans leur ordre d'attribution (ne jamais le changer ni le faire tourner). */
const REFERENCE_HUES: Hue[] = [
  { name: "blue", light: "#2a78d6", dark: "#3987e5" },
  { name: "orange", light: "#eb6834", dark: "#d95926" },
  { name: "aqua", light: "#1baf7a", dark: "#199e70" },
  { name: "yellow", light: "#eda100", dark: "#c98500" },
  { name: "magenta", light: "#e87ba4", dark: "#d55181" },
  { name: "green", light: "#008300", dark: "#008300" },
  { name: "violet", light: "#4a3aa7", dark: "#9085e9" },
  { name: "red", light: "#e34948", dark: "#e66767" },
];

/** Écart minimal (OKLab × 100) entre deux couleurs voisines, en vision normale. */
const MIN_DISTANCE = 15;
/** Écart minimal sous protanopie et deutéranopie simulées. */
const MIN_CVD_DISTANCE = 8;
/** Au-delà de six parts, un anneau ne se lit plus : le reste est regroupé dans « Autres ». */
export const MAX_CATEGORY_SLOTS = 6;

type Vision = "normal" | "protan" | "deutan";
type Triplet = [number, number, number];

// Simulation Machado, Oliveira & Fernandes (2009), sévérité 1.0, en RGB linéaire.
const CVD_MATRICES: Record<Exclude<Vision, "normal">, [Triplet, Triplet, Triplet]> = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};

function toLinear(hex: string): Triplet {
  const { r, g, b } = hexToRgb(hex);
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [linear(r), linear(g), linear(b)];
}

function simulate([r, g, b]: Triplet, vision: Vision): Triplet {
  if (vision === "normal") return [r, g, b];
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return CVD_MATRICES[vision].map((row) => clamp(row[0] * r + row[1] * g + row[2] * b)) as Triplet;
}

function toOklab([r, g, b]: Triplet): Triplet {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Distance perceptuelle entre deux couleurs (OKLab × 100), éventuellement sous daltonisme simulé. */
export function colorDistance(a: string, b: string, vision: Vision = "normal"): number {
  const [l1, a1, b1] = toOklab(simulate(toLinear(a), vision));
  const [l2, a2, b2] = toOklab(simulate(toLinear(b), vision));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100;
}

function distinctIn(a: string, b: string): boolean {
  return (
    colorDistance(a, b) >= MIN_DISTANCE &&
    colorDistance(a, b, "protan") >= MIN_CVD_DISTANCE &&
    colorDistance(a, b, "deutan") >= MIN_CVD_DISTANCE
  );
}

/** Vrai si les deux teintes se distinguent dans les deux thèmes, daltonisme compris. */
function distinct(a: Pick<Hue, "light" | "dark">, b: Pick<Hue, "light" | "dark">): boolean {
  return distinctIn(a.light, b.light) && distinctIn(a.dark, b.dark);
}

/**
 * Couleurs des séries catégorielles, sous forme d'expressions CSS : l'accent d'abord,
 * puis les teintes de référence compatibles. Les variables `--viz-*` portent la valeur
 * du thème courant (clair ou sombre), définie dans globals.css.
 */
export function categoricalColors(accent: string): string[] {
  const accentHue = isHexColor(accent) ? { light: accent, dark: accent } : null;
  const colors = ["var(--chart-1)"];
  let previous = accentHue;

  for (const hue of REFERENCE_HUES) {
    if (colors.length >= MAX_CATEGORY_SLOTS) break;
    if (accentHue && !distinct(hue, accentHue)) continue;
    if (previous && !distinct(hue, previous)) continue;
    colors.push(`var(--viz-${hue.name})`);
    previous = hue;
  }
  return colors;
}

/** Valeurs hexadécimales correspondantes, pour la validation de la palette. */
export function categoricalHexes(accent: string, mode: "light" | "dark"): string[] {
  return categoricalColors(accent).map((color, index) => {
    if (index === 0) return accent;
    const name = color.slice("var(--viz-".length, -1);
    return REFERENCE_HUES.find((hue) => hue.name === name)?.[mode] ?? accent;
  });
}
