import type { NextRequest } from "next/server";
import { ClinicValidationError, parseEventId } from "@/lib/clinic-mode/validation";
import { configureLegalAidEvent, requireLegalAidAdministrator } from "@/lib/legal-aid/admin-service";
import { legalAidErrorResponse, legalAidJson, nullableIso, nullableStr, readJson, str, uuidOrThrow } from "@/lib/legal-aid/api";
import { assertSameOrigin } from "@/lib/expungement-ai/privacy/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Turns an existing clinic event into a legal-aid event (or updates its
// legal-aid settings). A published event must point at an approved policy
// profile; the database trigger refuses anything else.
export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireLegalAidAdministrator();
    const { eventId } = await params;
    const body = await readJson(request);
    const appointmentPolicy = str(body, "appointmentPolicy", 20);
    if (appointmentPolicy !== "walk_in" && appointmentPolicy !== "appointment" && appointmentPolicy !== "mixed") throw new ClinicValidationError("Choose how participants are scheduled.");
    const registrationOpensAt = nullableIso(body.registrationOpensAt, "Registration opens");
    const registrationClosesAt = nullableIso(body.registrationClosesAt, "Registration closes");
    if (registrationOpensAt && registrationClosesAt && Date.parse(registrationClosesAt) <= Date.parse(registrationOpensAt)) throw new ClinicValidationError("Registration must close after it opens.");
    const outcome = await configureLegalAidEvent(parseEventId(eventId), actor.authUserId, {
      policyProfileId: uuidOrThrow(body.policyProfileId, "Policy profile"),
      registrationOpensAt, registrationClosesAt, appointmentPolicy,
      participantCostNote: nullableStr(body, "participantCostNote", 300),
      publicDescription: nullableStr(body, "publicDescription", 1500)
    });
    return legalAidJson({ success: true, outcome });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
