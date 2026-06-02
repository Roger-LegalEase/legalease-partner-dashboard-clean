import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ packetId: string }>;
  }
) {
  const { packetId } = await params;
  return NextResponse.json({
    packetId,
    error: "Packet updates are reserved for a later document-preparation workflow."
  }, { status: 501 });
}
