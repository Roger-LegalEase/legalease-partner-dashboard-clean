import { NextResponse } from "next/server";
import { resolvePacketActor } from "@/lib/rcap/packets/actor";
import { fulfillPacket, PacketFulfillmentError } from "@/lib/rcap/packets/lifecycle";
import { PacketResolutionError, technicalFixturesEnabled } from "@/lib/rcap/packets/resolve";

// Generates a packet for one relief track.
//
// Resolution, readiness and geography are all enforced before anything is
// rendered, and the response never reports ready until every component has been
// stored. Failures carry a typed code and no participant data.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const actor = await resolvePacketActor(request);
  if (!actor) {
    return problem(401, "unauthenticated", "Sign in to generate a packet.");
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return problem(400, "invalid_request", "A JSON request body is required.");
  }

  const allowTechnicalFixtures = body.allowTechnicalFixtures === true && technicalFixturesEnabled();

  try {
    const result = await fulfillPacket({
      ownerId: actor.ownerId,
      jurisdiction: asString(body.jurisdiction),
      trackId: asString(body.trackId),
      recordType: asString(body.recordType),
      disposition: asString(body.disposition),
      courtLevel: asString(body.courtLevel),
      geography: asString(body.geography),
      facts: (body.facts as Record<string, unknown>) ?? {},
      requestKey: asString(body.requestKey) ?? undefined,
      allowTechnicalFixtures
    });

    return NextResponse.json(
      {
        fulfillmentId: result.fulfillmentId,
        status: result.status,
        reused: result.reused,
        jurisdiction: result.jurisdiction,
        trackId: result.trackId,
        outputStrategy: result.outputStrategy,
        runtimeStatus: result.runtimeStatus,
        packetSetId: result.packetSetId,
        packetSetVersion: result.packetSetVersion,
        briefcaseItemId: result.briefcaseItemId,
        destination: result.destination,
        // Explicit, so a guidance outcome can never be counted as a filing.
        isFilingPacket: result.isFilingPacket,
        deliverable: result.customerDeliverableDescription,
        components: result.components
      },
      { status: result.reused ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof PacketResolutionError) {
      const status = error.reason === "unknown_jurisdiction" || error.reason === "unknown_relief_track" ? 404 : 409;
      return NextResponse.json(
        { error: error.reason, message: error.message, detail: error.detail },
        { status }
      );
    }
    if (error instanceof PacketFulfillmentError) {
      const status = error.code === "not_runtime_enabled" ? 409 : 502;
      return NextResponse.json({ error: error.code, message: error.message, detail: error.detail }, { status });
    }
    return problem(500, "generation_failed", "The packet could not be generated.");
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function problem(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}
