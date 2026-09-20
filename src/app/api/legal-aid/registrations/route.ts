import type { NextRequest } from "next/server";
import { legalAidErrorResponse, legalAidJson, participantActor, readJson } from "@/lib/legal-aid/api";
import { parseRegistrationInput, registerForClinic } from "@/lib/legal-aid/registration-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Registers the signed-in participant for one legal-aid clinic. Capacity,
// the registration window and duplicates are decided atomically in the
// database; the idempotency key makes a retried submit return the same row.
export async function POST(request: NextRequest) {
  try {
    const actor = await participantActor(request);
    if (!actor.ok) return actor.response;
    const input = parseRegistrationInput(await readJson(request));
    const result = await registerForClinic({ ...input, userId: actor.userId, source: "public_web" });
    if (result.outcome === "event_unavailable") return legalAidJson({ success: false, error: "This clinic is not open for registration." }, 404);
    if (result.outcome === "registration_closed") return legalAidJson({ success: false, error: "Registration for this clinic has closed." }, 409);
    return legalAidJson({ success: true, outcome: result.outcome, registrationId: result.registrationId, status: result.status });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
