import { resolveSourceDocumentAccess } from "@/lib/rcap/documents/source-repository";
import { NextResponse } from "next/server";
import { getSourceIntakeDocumentPacketForSession } from "@/lib/rcap/documents/source-repository";
import { renderRcapPacketPdf, rcapPacketPdfFilename, type RcapPacketPdfType } from "@/lib/rcap/documents/packet-document-renderer";
import { packetRouteCanRender, resolvePacketRoute } from "@/lib/rcap/documents/packet-route-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  {
    params
  }: {
    params: Promise<{ packetId: string; pdfType: string }>;
  }
) {
  const session = await resolveSourceDocumentAccess({ clinicCaseId: new URL(request.url).searchParams.get("clinicCaseId") });
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } });
  const { packetId, pdfType } = await params;
  if (pdfType !== "full" && pdfType !== "court") {
    return NextResponse.json({ error: "Unsupported PDF packet type." }, { status: 400 });
  }
  const packet = await getSourceIntakeDocumentPacketForSession(packetId, session.access);
  if (!packet) {
    return NextResponse.json({ error: "Document packet not found." }, { status: 404 });
  }

  // Fail closed. A jurisdiction without a certified renderer is never served
  // another state's packet, which is what the old Mississippi default did.
  const route = resolvePacketRoute({ state: packet.state, pathway: packet.pathway });
  if (!packetRouteCanRender(route)) {
    return NextResponse.json(
      { error: "This jurisdiction does not have a downloadable packet yet.", routeKind: route.routeKind },
      { status: 409 }
    );
  }

  const typedPdfType = pdfType as RcapPacketPdfType;
  const pdf = await renderRcapPacketPdf(packet, typedPdfType);
  const current = await getSourceIntakeDocumentPacketForSession(packetId, session.access);
  if (!current || current.updatedAt !== packet.updatedAt) return NextResponse.json({ error: "Document access changed during rendering." }, { status: 409, headers: { "Cache-Control": "private, no-store" } });

  // Validate before serving: bytes that are not a parseable PDF are a failure,
  // not a download.
  if (pdf.length === 0 || pdf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return NextResponse.json({ error: "We couldn’t finish preparing this PDF. The saved information is still available. Try again or contact support." }, { status: 500 });
  }

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${rcapPacketPdfFilename(packet, typedPdfType)}"`,
      "cache-control": "no-store"
    }
  });
}
