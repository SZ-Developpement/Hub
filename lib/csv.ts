// Export CSV au format attendu par Excel et LibreOffice en français :
// séparateur point-virgule, décimales à la virgule, dates JJ/MM/AAAA.

type Cell = string | number | null | undefined;

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Neutralise l'interprétation en formule par le tableur (=, +, -, @ en tête de cellule).
  if (/^[=+\-@\t\r]/.test(text) && Number.isNaN(Number(text.replace(",", ".")))) {
    text = `'${text}`;
  }
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n");
}

/** Montant en centimes → « 1234,56 » (sans séparateur de milliers ni symbole). */
export function csvMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, "0")}`;
}
