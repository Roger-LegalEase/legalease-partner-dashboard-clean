import { NextResponse } from "next/server";
import { generateSavedDcDocumentPacket } from "@/lib/rcap/documents/dc/repository";
import { generateSavedMississippiDocumentPacket, getRcapDocumentPacket } from "@/lib/rcap/documents/mississippi/repository";

export async function POST(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ packetId: string }>;
  }
) {
  const { packetId } = await params;
  const packet = await getRcapDocumentPacket(packetId);
  const result = packet?.state === "DC" ? await generateSavedDcDocumentPacket(packetId) : await generateSavedMississippiDocumentPacket(packetId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ packet: result.packet, persisted: result.persisted });
}
