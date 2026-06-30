import { NextResponse } from "next/server";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { attachMississippiLegacyPacketArtifact } from "@/lib/expungement-ai/packet-generation";
import { generateSavedDcDocumentPacket } from "@/lib/rcap/documents/source-repository";
import { generateSavedMississippiDocumentPacket, getRcapDocumentPacket } from "@/lib/rcap/documents/source-repository";

export async function POST(
  request: Request,
  {
    params
  }: {
    params: Promise<{ packetId: string }>;
  }
) {
  const { packetId } = await params;
  const body = await safeJson(request);
  const packet = await getRcapDocumentPacket(packetId);
  const result = packet?.state === "DC" ? await generateSavedDcDocumentPacket(packetId) : await generateSavedMississippiDocumentPacket(packetId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const consumerBriefcaseItemId = typeof body.consumerBriefcaseItemId === "string" ? body.consumerBriefcaseItemId.trim() : undefined;
  if (packet?.state === "MS" && consumerBriefcaseItemId) {
    const auth = await getRcapBriefcaseAuthState();
    if (auth.isAuthenticated && auth.userId) {
      await attachMississippiLegacyPacketArtifact({
        userId: auth.userId,
        briefcaseItemId: consumerBriefcaseItemId,
        rcapPacketId: result.packet.id
      });
    }
  }
  return NextResponse.json({ packet: result.packet, persisted: result.persisted });
}

async function safeJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
