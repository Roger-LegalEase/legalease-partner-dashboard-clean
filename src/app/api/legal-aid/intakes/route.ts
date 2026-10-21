import type { NextRequest } from "next/server";
import { legalAidErrorResponse, legalAidJson, nullableStr, participantActor, readJson, uuidOrThrow } from "@/lib/legal-aid/api";
import { saveIntakeDraft } from "@/lib/legal-aid/intake-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Saves (or creates) the participant's confidential intake draft. The answers
// are sanitised to the field map, the SSN is never accepted here, and the
// version check makes two open tabs fail safely instead of overwriting.
export async function POST(request: NextRequest) {
  try {
    const actor = await participantActor(request);
    if (!actor.ok) return actor.response;
    const body = await readJson(request, 96 * 1024);
    const eventId = uuidOrThrow(body.eventId, "Clinic");
    const expectedVersion = body.expectedVersion === null || body.expectedVersion === undefined ? null : Number(body.expectedVersion);
    const result = await saveIntakeDraft({
      eventId, userId: actor.userId, answers: body.answers,
      expectedVersion: expectedVersion !== null && Number.isInteger(expectedVersion) ? expectedVersion : null,
      legalMatter: nullableStr(body, "legalMatter", 60)
    });
    if (result.outcome === "registration_required") return legalAidJson({ success: false, outcome: result.outcome, error: "Register for the clinic before starting your application." }, 409);
    if (result.outcome === "event_unavailable") return legalAidJson({ success: false, outcome: result.outcome, error: "This clinic is not accepting applications." }, 404);
    if (result.outcome === "version_conflict") return legalAidJson({ success: false, outcome: result.outcome, error: "Your application was updated somewhere else. Reload to see the latest answers." }, 409);
    if (result.outcome === "not_editable") return legalAidJson({ success: false, outcome: result.outcome, error: "This application has been submitted and can no longer be edited." }, 409);
    return legalAidJson({ success: true, outcome: result.outcome, intakeId: result.intakeId, version: result.version, validation: result.validation });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
