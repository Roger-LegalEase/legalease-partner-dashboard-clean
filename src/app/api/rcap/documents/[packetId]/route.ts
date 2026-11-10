import { resolveSourceDocumentAccess } from "@/lib/rcap/documents/source-repository";
import { NextResponse } from "next/server";
import { getSourceIntakeDocumentPacketForSession } from "@/lib/rcap/documents/source-repository";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  {
    params
  }: {
    params: Promise<{ packetId: string }>;
  }
) {
  const session = await resolveSourceDocumentAccess({ clinicCaseId: new URL(request.url).searchParams.get("clinicCaseId") });
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
  const { packetId } = await params;
  const packet = await getSourceIntakeDocumentPacketForSession(packetId, session.access);
  if (!packet) {
    return NextResponse.json({ error: "Document packet not found." }, { status: 404 });
  }
  return NextResponse.json({ packet }, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}
