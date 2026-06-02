import { NextResponse } from "next/server";
import { getRcapDocumentPacket } from "@/lib/rcap/documents/mississippi/repository";

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ packetId: string }>;
  }
) {
  const { packetId } = await params;
  const packet = await getRcapDocumentPacket(packetId);
  if (!packet) {
    return NextResponse.json({ error: "Document packet not found." }, { status: 404 });
  }
  return NextResponse.json({ packet });
}
