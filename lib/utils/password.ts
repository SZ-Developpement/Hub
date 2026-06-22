// Normalise un texte : minuscules, accents retirés, espaces/caractères spéciaux retirés
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .replace(/[^a-z0-9]/g, ""); // retire tout sauf lettres/chiffres
}

// Génère un mot de passe temporaire pour un utilisateur à partir de son prénom et nom
export function generateTempPassword(
  firstName: string,
  lastName: string,
): string {
  const year = new Date().getFullYear();
  return `${normalize(firstName)}.${normalize(lastName)}.${year}`;
}
