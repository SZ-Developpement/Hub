// Recupere le numéro de téléphone du client si disponible enleve le 0 du debut et ajoute l'indicatif international +33 pour la France
// et met des espaces entre les chiffres pour un format lisible. Si le numéro de téléphone n'est pas disponible, retourne null.
// exemple : 0612345678 => +33 6 12 34 56 78
export const formatPhoneNumber = (phone: string | null) => {
  if (!phone) return null;

  // 1. On nettoie pour ne garder que les chiffres
  const cleaned = phone.replace(/\D/g, "");

  // 2. On retire le 0 du début s'il existe
  const noZero = cleaned.replace(/^0/, "");

  // 3. On vérifie qu'on a bien les 9 chiffres attendus pour un numéro FR
  if (noZero.length === 9) {
    // On découpe : 1 chiffre, puis 4 blocs de 2 chiffres
    return noZero.replace(
      /(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/,
      "+33 $1 $2 $3 $4 $5",
    );
  }

  // Si le format initial ne correspond pas à un numéro standard,
  // on retourne le numéro nettoyé avec le +33 par défaut
  return `+33 ${noZero}`;
};
