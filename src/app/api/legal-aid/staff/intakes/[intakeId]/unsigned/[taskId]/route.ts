import { NextResponse, type NextRequest } from "next/server";
import { legalAidErrorResponse, privateFileHeaders, staffActor, uuidOrThrow } from "@/lib/legal-aid/api";
import { openUnsignedArtifact } from "@/lib/legal-aid/intake-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Streams the unsigned execution copy of one court document to the assigned
// attorney, coordinator or notary, for review and printing. Audited.
export async function GET(request: NextRequest, { params }: { params: Promise<{ intakeId: string; taskId: string }> }) {
  try {
    const actor = await staffActor(request, { mutation: false });
    const { taskId } = await params;
    const file = await openUnsignedArtifact(uuidOrThrow(taskId, "Document task"), actor.authUserId);
    return new NextResponse(Buffer.from(file.bytes), { status: 200, headers: privateFileHeaders(file.filename, "application/pdf", file.bytes.byteLength) });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
