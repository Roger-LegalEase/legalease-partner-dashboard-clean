import { NextResponse } from "next/server";
import { resolvePacketActor } from "@/lib/rcap/packets/actor";
import { PacketAssemblyError } from "@/lib/rcap/packets/assemble";
import { getFulfillment, readAssembledPacket } from "@/lib/rcap/packets/lifecycle";

// Serves the participant's complete packet as one assembled PDF.
//
// This is the primary Briefcase action — "Download my complete packet PDF" —
// and the per-component route beside it exists for debugging and for a future
// UI that lets someone reprint one form. There is no ZIP endpoint: a packet the
// participant has to unzip and reorder is a packet they can file wrongly.
//
// Like the component route it reads only what was durably stored. Ownership is
// required, and a non-owner receives the same response as a missing packet so
// the status cannot be used to discover which fulfillments exist.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ fulfillmentId: string }> }) {
  const { fulfillmentId } = await params;

  const actor = await resolvePacketActor(request);
  if (!actor) {
    return problem(401, "unauthenticated", "Sign in to download this packet.");
  }

  const fulfillment = await getFulfillment(fulfillmentId);
  if (!fulfillment || fulfillment.ownerId !== actor.ownerId) {
    return problem(404, "packet_not_found", "Packet not found.");
  }

  if (fulfillment.status === "failed") {
    return problem(409, "generation_failed", "This packet could not be prepared. You can request it again.");
  }
  if (fulfillment.status !== "ready") {
    return problem(409, "packet_not_ready", "This packet is still being prepared.");
  }

  let assembled;
  try {
    assembled = await readAssembledPacket({ fulfillmentId });
  } catch (error) {
    if (error instanceof PacketAssemblyError) {
      // Assembly refuses rather than producing a partial packet. A partial
      // filing packet is worse than no download.
      return problem(409, "packet_not_assemblable", "This packet could not be assembled for download.");
    }
    return problem(503, "storage_unavailable", "The stored packet could not be read.");
  }

  if (!assembled) {
    return problem(404, "packet_not_found", "Packet not found.");
  }

  return new Response(new Uint8Array(assembled.bytes), {
    status: 200,
    headers: {
      "content-type": assembled.mimeType,
      "content-length": String(assembled.byteSize),
      "content-disposition": `attachment; filename="${safeFilename(assembled.fileName)}"`,
      "cache-control": "no-store",
      "x-rcap-packet-pages": String(assembled.pageCount),
      "x-rcap-packet-sha256": assembled.sha256,
      "x-rcap-packet-components": String(assembled.componentRanges.length)
    }
  });
}

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

function safeFilename(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 120);
  return cleaned || "packet.pdf";
}
