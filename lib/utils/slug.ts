import { prisma } from "@/lib/prisma";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // décompose les caractères accentués en caractères de base et diacritiques
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .replace(/[^a-z0-9\s-]/g, "") // retire les caractères non alphanumériques sauf les espaces et les tirets
    .trim() // retire les espaces au début et à la fin
    .replace(/\s+/g, "-") // remplace les espaces par des tirets
    .replace(/-+/g, "-"); // remplace les tirets multiples par un seul tiret
}

export async function generateUniqueClientSlug(name: string): Promise<string> {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.client.findUnique({ where: { slug } })) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
}
