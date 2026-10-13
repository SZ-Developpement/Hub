/** Monogramme affiché quand aucun logo n'est configuré : « SZ Dev » → « SZ », « Atelier Nord » → « AN ». */
export function brandInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "•";
  if (words[0].length <= 3) return words[0].toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
