/**
 * Erreur métier dont le message est destiné à l'utilisateur (affiché tel quel dans un toast).
 * Toute autre exception est journalisée et remplacée par un message générique.
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new AppError(message);
}
