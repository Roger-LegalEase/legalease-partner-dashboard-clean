import { NextResponse } from "next/server";
import { getRcapDocumentPacket } from "@/lib/rcap/documents/mississippi/repository";
import { renderRcapPacketPdf, rcapPacketPdfFilename, type RcapPacketPdfType } from "@/lib/rcap/documents/packet-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ packetId: string; pdfType: string }>;
  }
) {
  const { packetId, pdfType } = await params;
  if (pdfType !== "full" && pdfType !== "court") {
    return NextResponse.json({ error: "Unsupported PDF packet type." }, { status: 400 });
  }
  const packet = await getRcapDocumentPacket(packetId);
  if (!packet) {
    return NextResponse.json({ error: "Document packet not found." }, { status: 404 });
  }
  const typedPdfType = pdfType as RcapPacketPdfType;
  const pdf = await renderRcapPacketPdf(packet, typedPdfType);
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${rcapPacketPdfFilename(packet, typedPdfType)}"`,
      "cache-control": "no-store"
    }
  });
}
