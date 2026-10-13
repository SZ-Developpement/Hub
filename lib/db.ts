import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@/generated/prisma/client";

// Développement sur un Postgres local : le driver Neon passe par un proxy
// WebSocket → TCP (voir scripts/local-db-proxy.mjs). Sans effet en production.
const localProxy = process.env.NEON_LOCAL_WS_PROXY;
if (localProxy) {
  neonConfig.wsProxy = localProxy;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

/**
 * Adaptateur de remplacement quand DATABASE_URL est absent : il n'échoue qu'à la première
 * requête, avec un message clair. Charger l'application (build, typecheck) reste possible
 * sans base.
 */
const missingDatabase = {
  provider: "postgres",
  adapterName: "database-url-manquante",
  connect: () => Promise.reject(new Error("DATABASE_URL n'est pas défini.")),
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  return new PrismaClient({
    adapter: connectionString ? new PrismaNeon({ connectionString }) : (missingDatabase as never),
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/**
 * Client Prisma, instancié à la première utilisation : importer ce module ne
 * nécessite pas de base joignable (utile au build et au typecheck).
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** Client de transaction interactif, tel que reçu dans `db.$transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
