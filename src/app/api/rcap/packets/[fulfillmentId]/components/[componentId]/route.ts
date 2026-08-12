import { NextResponse } from "next/server";
import { resolvePacketActor } from "@/lib/rcap/packets/actor";
import { getFulfillment, readStoredComponent } from "@/lib/rcap/packets/lifecycle";

// Serves one stored packet component.
//
// Reads only what was durably stored; it never renders on demand. Ownership is
// required, and a non-owner receives the same response as a missing packet so
// the status cannot be used to discover which fulfillments exist.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fulfillmentId: string; componentId: string }> }
) {
  const { fulfillmentId, componentId } = await params;

  const actor = await resolvePacketActor(request);
  if (!actor) {
    return problem(401, "unauthenticated", "Sign in to download this document.");
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

  let found;
  try {
    found = await readStoredComponent({ fulfillmentId, componentId });
  } catch {
    return problem(503, "storage_unavailable", "The stored document could not be read.");
  }

  if (!found) {
    return problem(404, "component_not_found", "That document is not part of this packet.");
  }

  return new Response(new Uint8Array(found.bytes), {
    status: 200,
    headers: {
      "content-type": found.record.mimeType,
      "content-length": String(found.bytes.byteLength),
      "content-disposition": `attachment; filename="${safeFilename(found.record.fileName)}"`,
      "cache-control": "no-store",
      // Lets a client and the acceptance gate confirm which source produced it.
      "x-rcap-source-identity": encodeURIComponent(found.record.sourceIdentity),
      "x-rcap-renderer-strategy": found.record.rendererStrategy
    }
  });
}

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

function safeFilename(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80);
  return cleaned || "packet.pdf";
}
