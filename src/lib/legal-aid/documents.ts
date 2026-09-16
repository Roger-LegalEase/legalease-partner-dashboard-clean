import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { intakePermissionsFor, hasReviewPermission, mapDocument } from "./intake-service";
import { requireLegalAidDatabase } from "./registration-service";
import type { IntakeDocument } from "./types";

// Applicant documents, executed copies and case-file exports live in one
// private bucket. Objects are keyed by intake and category, uploaded once
// (never overwritten), and served only through an authenticated, audited
// server route that streams bytes with no-store headers. No public URL, no
// signed URL in the browser.

export const LEGAL_AID_BUCKET = "rcap-legal-aid-private";
export const LEGAL_AID_MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const LEGAL_AID_DOCUMENT_CATEGORIES = ["identification", "court_record", "income", "executed_document", "other"] as const;

const SIGNATURES: { type: string; ext: string; check: (bytes: Uint8Array) => boolean }[] = [
  { type: "application/pdf", ext: "pdf", check: (b) => b.length > 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d },
  { type: "image/jpeg", ext: "jpg", check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", check: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a },
  { type: "image/webp", ext: "webp", check: (b) => b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 }
];

export type ValidatedUpload = { bytes: Uint8Array; contentType: string; extension: string; sha256: string; originalFilename: string };

export function validateUpload(bytes: Uint8Array, declaredType: string, originalFilename: string): ValidatedUpload {
  if (bytes.length === 0) throw new ClinicServiceError("conflict", "The file is empty.");
  if (bytes.length > LEGAL_AID_MAX_UPLOAD_BYTES) throw new ClinicServiceError("conflict", "The file is larger than 20 MB.");
  const detected = SIGNATURES.find((signature) => signature.check(bytes));
  if (!detected) throw new ClinicServiceError("conflict", "Upload a PDF, JPEG, PNG, or WebP file.");
  if (declaredType && declaredType.toLowerCase() !== detected.type && !(declaredType === "image/jpg" && detected.type === "image/jpeg")) {
    throw new ClinicServiceError("conflict", "The file's type does not match its contents.");
  }
  const safeName = originalFilename.replace(/[^\w. -]/g, "_").slice(0, 120) || `document.${detected.ext}`;
  return { bytes, contentType: detected.type, extension: detected.ext, sha256: createHash("sha256").update(bytes).digest("hex"), originalFilename: safeName };
}

function requireStorage() {
  const client = getSupabaseAdminClient();
  if (!client) throw new ClinicServiceError("unavailable", "Document storage requires configured Supabase services.");
  return client.storage.from(LEGAL_AID_BUCKET);
}

export function buildLegalAidObjectPath(intakeId: string, category: string, extension: string): string {
  return `legal-aid/${intakeId}/${category}/${randomUUID()}.${extension}`;
}

export async function storeIntakeDocument(input: { intakeId: string; actorUserId: string; category: (typeof LEGAL_AID_DOCUMENT_CATEGORIES)[number]; upload: ValidatedUpload }): Promise<string> {
  if (!LEGAL_AID_DOCUMENT_CATEGORIES.includes(input.category)) throw new ClinicServiceError("conflict", "Choose a document type.");
  const objectPath = buildLegalAidObjectPath(input.intakeId, input.category, input.upload.extension);
  const storage = requireStorage();
  const uploaded = await storage.upload(objectPath, input.upload.bytes, { contentType: input.upload.contentType, cacheControl: "0", upsert: false });
  if (uploaded.error) throw new ClinicServiceError("unavailable", "The document could not be stored.");
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_record_document", {
    p_intake_id: input.intakeId, p_actor_user_id: input.actorUserId, p_category: input.category, p_storage_path: objectPath,
    p_original_filename: input.upload.originalFilename, p_content_type: input.upload.contentType, p_size_bytes: input.upload.bytes.length, p_sha256: input.upload.sha256
  });
  if (result.error) {
    await storage.remove([objectPath]).catch(() => null);
    if (result.error.message?.includes("document_forbidden")) throw new ClinicServiceError("forbidden", "You cannot add this document.");
    throw new ClinicServiceError("unavailable", "The document could not be recorded.");
  }
  return String(result.data);
}

export async function removeIntakeDocument(documentId: string, actorUserId: string): Promise<string> {
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_remove_document", { p_document_id: documentId, p_actor_user_id: actorUserId });
  if (result.error) throw new ClinicServiceError("unavailable", "The document could not be removed.");
  const outcome = String(result.data);
  if (outcome === "forbidden") throw new ClinicServiceError("forbidden", "You cannot remove this document.");
  if (outcome === "not_found") throw new ClinicServiceError("not_found", "Document was not found.");
  return outcome;
}

/** Authorizes and streams one document. The caller is the participant who owns the intake or an assigned reviewer/notary; every download is audited. */
export async function openIntakeDocument(documentId: string, actorUserId: string): Promise<{ document: IntakeDocument; bytes: Uint8Array }> {
  const db = requireLegalAidDatabase();
  const row = await db.from("legal_aid_documents").select("*").eq("id", documentId).maybeSingle();
  if (row.error) throw new ClinicServiceError("unavailable", "The document is temporarily unavailable.");
  if (!row.data || row.data.removed_at) throw new ClinicServiceError("not_found", "Document was not found.");
  const intakeId = String(row.data.intake_id);
  const [participant, permissions] = await Promise.all([
    db.rpc("legal_aid_is_intake_participant", { p_intake_id: intakeId, p_actor_user_id: actorUserId }),
    intakePermissionsFor(intakeId, actorUserId)
  ]);
  const isParticipant = participant.data === true;
  const isStaff = hasReviewPermission(permissions) || permissions.includes("notary");
  if (!isParticipant && !isStaff) throw new ClinicServiceError("forbidden", "You cannot open this document.");
  const storage = requireStorage();
  const downloaded = await storage.download(String(row.data.storage_path));
  if (downloaded.error || !downloaded.data) throw new ClinicServiceError("unavailable", "The document could not be read.");
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== String(row.data.sha256)) throw new ClinicServiceError("unavailable", "The stored document failed its integrity check.");
  const audit = await db.rpc("legal_aid_record_access", { p_intake_id: intakeId, p_actor_user_id: actorUserId, p_action: "document_downloaded", p_metadata: { document_id: documentId, role: isParticipant ? "participant" : "staff" } });
  if (audit.error) throw new ClinicServiceError("unavailable", "The access log could not be written, so the document was not opened.");
  return { document: mapDocument(row.data as Record<string, unknown>), bytes };
}
