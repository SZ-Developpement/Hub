import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { del, get, put } from "@vercel/blob";

// Stockage des fichiers sur Vercel Blob.
//
// Les blobs sont privés : rien n'est servi directement depuis le store, tout passe par
// les routes de l'application (/api/files, /api/branding), qui contrôlent l'accès.
//
// En développement, sans store configuré, les fichiers sont écrits dans ./.storage
// pour pouvoir travailler hors ligne. Ce repli est refusé en production.

const LOCAL_PREFIX = "local://";

type BlobAccess = "private" | "public";

/** Jeton du store, quand Vercel en fournit un. Sinon le SDK s'authentifie seul (OIDC). */
function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

/**
 * Vrai si un store Blob est branché au projet. Selon le store, Vercel fournit un jeton
 * (BLOB_READ_WRITE_TOKEN) ou seulement son identifiant (BLOB_STORE_ID), auquel cas le
 * SDK utilise le jeton OIDC du déploiement.
 */
function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function blobAccess(): BlobAccess {
  return process.env.BLOB_ACCESS === "public" ? "public" : "private";
}

function localRoot(): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".storage");
}

function localPath(pathname: string): string {
  const root = localRoot();
  const resolved = path.resolve(root, pathname);
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error("Chemin de fichier invalide.");
  }
  return resolved;
}

export type StoredObject = { url: string; pathname: string };

export async function putObject(
  pathname: string,
  body: Buffer,
  contentType: string,
): Promise<StoredObject> {
  if (blobConfigured()) {
    const blob = await put(pathname, body, {
      access: blobAccess(),
      contentType,
      addRandomSuffix: true,
      token: blobToken(),
    });
    return { url: blob.url, pathname: blob.pathname };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Aucun store Vercel Blob n'est configuré (BLOB_READ_WRITE_TOKEN ou BLOB_STORE_ID) : impossible d'enregistrer le fichier.",
    );
  }

  const directory = path.posix.dirname(pathname);
  const unique = `${directory}/${randomUUID()}-${path.posix.basename(pathname)}`;
  const target = localPath(unique);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, body);
  return { url: `${LOCAL_PREFIX}${unique}`, pathname: unique };
}

export async function getObject(object: StoredObject): Promise<Buffer | null> {
  if (object.url.startsWith(LOCAL_PREFIX)) {
    try {
      return await fs.readFile(localPath(object.pathname));
    } catch {
      return null;
    }
  }

  const result = await get(object.url, { access: blobAccess(), token: blobToken() });
  if (!result || result.statusCode !== 200) return null;
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

export async function deleteObject(object: StoredObject): Promise<void> {
  if (object.url.startsWith(LOCAL_PREFIX)) {
    await fs.rm(localPath(object.pathname), { force: true });
    return;
  }
  await del(object.url, { token: blobToken() });
}
