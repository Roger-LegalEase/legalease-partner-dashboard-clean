import { NextResponse, type NextRequest } from "next/server";
import { anyActor, legalAidErrorResponse, legalAidJson, privateFileHeaders, uuidOrThrow } from "@/lib/legal-aid/api";
import { openIntakeDocument, removeIntakeDocument } from "@/lib/legal-aid/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Streams one stored document to its participant or an assigned reviewer.
// There is no public or signed URL; every read is authorised and audited.
export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const actor = await anyActor(request);
    if ("response" in actor) return actor.response;
    const { documentId } = await params;
    const { document, bytes } = await openIntakeDocument(uuidOrThrow(documentId, "Document"), actor.userId);
    return new NextResponse(Buffer.from(bytes), { status: 200, headers: privateFileHeaders(document.originalFilename, document.contentType, bytes.byteLength) });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  try {
    const actor = await anyActor(request, { mutation: true });
    if ("response" in actor) return actor.response;
    const { documentId } = await params;
    const outcome = await removeIntakeDocument(uuidOrThrow(documentId, "Document"), actor.userId);
    return legalAidJson({ success: true, outcome });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
