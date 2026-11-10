import { resolveSourceDocumentAccess } from "@/lib/rcap/documents/source-repository";
import { NextResponse, type NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/partners/onboarding/request-security";
import { generateSavedDcDocumentPacket } from "@/lib/rcap/documents/source-repository";
import { generateSavedMississippiDocumentPacket, getSourceIntakeDocumentPacketForSession } from "@/lib/rcap/documents/source-repository";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  {
    params
  }: {
    params: Promise<{ packetId: string }>;
  }
) {
  const session = await resolveSourceDocumentAccess({ clinicCaseId: new URL(request.url).searchParams.get("clinicCaseId") });
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "This request could not be verified." }, { status: 403, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } }); }
  const { packetId } = await params;
  const body = await safeJson(request);
  // Same ownership does not establish that a legacy packet belongs to this matter.
  if ("consumerBriefcaseItemId" in body) return NextResponse.json({ error: "Legacy packet-to-matter binding could not be verified." }, { status: 409, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
  const packet = await getSourceIntakeDocumentPacketForSession(packetId, session.access);
  if (!packet) return NextResponse.json({ error: "Document packet not found." }, { status: 404 });
  const result = packet?.state === "DC" ? await generateSavedDcDocumentPacket(packetId, session.access) : await generateSavedMississippiDocumentPacket(packetId, session.access);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ packet: result.packet, persisted: result.persisted }, { headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
}

async function safeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
