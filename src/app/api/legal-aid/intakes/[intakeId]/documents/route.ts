import type { NextRequest } from "next/server";
import { ClinicValidationError } from "@/lib/clinic-mode/validation";
import { anyActor, legalAidErrorResponse, legalAidJson, uuidOrThrow } from "@/lib/legal-aid/api";
import { LEGAL_AID_DOCUMENT_CATEGORIES, LEGAL_AID_MAX_UPLOAD_BYTES, storeIntakeDocument, validateUpload } from "@/lib/legal-aid/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Uploads one document to the private legal-aid bucket. The participant may
// add their own supporting documents; assigned staff (including the notary)
// add executed copies. The database RPC decides who may add which category.
export async function POST(request: NextRequest, { params }: { params: Promise<{ intakeId: string }> }) {
  try {
    const actor = await anyActor(request, { mutation: true });
    if ("response" in actor) return actor.response;
    const { intakeId: raw } = await params;
    const intakeId = uuidOrThrow(raw, "Application");
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declared) && declared > LEGAL_AID_MAX_UPLOAD_BYTES + 64 * 1024) throw new ClinicValidationError("The file is larger than 20 MB.");
    const form = await request.formData();
    const category = String(form.get("category") ?? "");
    if (!(LEGAL_AID_DOCUMENT_CATEGORIES as readonly string[]).includes(category)) throw new ClinicValidationError("Choose a document type.");
    const file = form.get("file");
    if (!(file instanceof File)) throw new ClinicValidationError("Choose a file to upload.");
    if (file.size > LEGAL_AID_MAX_UPLOAD_BYTES) throw new ClinicValidationError("The file is larger than 20 MB.");
    const upload = validateUpload(new Uint8Array(await file.arrayBuffer()), file.type, file.name);
    const documentId = await storeIntakeDocument({ intakeId, actorUserId: actor.userId, category: category as (typeof LEGAL_AID_DOCUMENT_CATEGORIES)[number], upload });
    return legalAidJson({ success: true, documentId }, 201);
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
