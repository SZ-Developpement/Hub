import "dotenv/config";
import { defineConfig } from "prisma/config";

// La CLI Prisma (migrations, introspection) doit utiliser une connexion directe :
// avec Neon, c'est l'URL « unpooled ». L'application, elle, lit DATABASE_URL (poolée).
// `||` et non `??` : une variable laissée vide dans .env doit passer la main à la suivante.
const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
});
