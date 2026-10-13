import "server-only";

import { createHash } from "node:crypto";

import type { FileKind } from "@/generated/prisma/enums";
import { db, type Tx } from "@/lib/db";
import { deleteObject, getObject, putObject } from "@/lib/storage";

const FOLDERS: Record<FileKind, string> = {
  APP_LOGO: "branding",
  FAVICON: "branding",
  DOCUMENT_LOGO: "documents",
  SIGNATURE: "documents",
  AVATAR: "avatars",
  RECEIPT: "justificatifs",
  INVOICE_PDF: "factures",
  EINVOICE: "factures-electroniques",
};

function safeName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "fichier"
  );
}

export type SaveFileInput = {
  organizationId: string;
  kind: FileKind;
  buffer: Buffer;
  contentType: string;
  fileName: string;
  uploadedById?: string | null;
};

/** Envoie le fichier dans le store puis l'enregistre en base (dans la transaction si fournie). */
export async function saveFile(input: SaveFileInput, tx: Tx | typeof db = db) {
  const pathname = `${input.organizationId}/${FOLDERS[input.kind]}/${safeName(input.fileName)}`;
  const stored = await putObject(pathname, input.buffer, input.contentType);
  return tx.storedFile.create({
    data: {
      organizationId: input.organizationId,
      kind: input.kind,
      pathname: stored.pathname,
      url: stored.url,
      contentType: input.contentType,
      size: input.buffer.byteLength,
      sha256: createHash("sha256").update(input.buffer).digest("hex"),
      originalName: input.fileName,
      uploadedById: input.uploadedById ?? null,
    },
  });
}

export async function readFile(file: { url: string; pathname: string }): Promise<Buffer | null> {
  return getObject(file);
}

export async function readFileById(
  organizationId: string,
  fileId: string | null | undefined,
): Promise<Buffer | null> {
  if (!fileId) return null;
  const file = await db.storedFile.findFirst({ where: { id: fileId, organizationId } });
  return file ? getObject(file) : null;
}

/** Supprime la ligne puis le blob. Sans effet si le fichier n'existe pas. */
export async function removeFile(organizationId: string, fileId: string): Promise<void> {
  const file = await db.storedFile.findFirst({ where: { id: fileId, organizationId } });
  if (!file) return;
  await db.storedFile.delete({ where: { id: file.id } });
  await deleteObject(file).catch((error) => {
    console.error("Suppression du blob impossible", error);
  });
}

export function fileUrl(fileId: string | null | undefined): string | null {
  return fileId ? `/api/files/${fileId}` : null;
}
