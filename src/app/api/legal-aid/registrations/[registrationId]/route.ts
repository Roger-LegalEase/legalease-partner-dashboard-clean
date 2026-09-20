import type { NextRequest } from "next/server";
import { ClinicValidationError } from "@/lib/clinic-mode/validation";
import { anyActor, legalAidErrorResponse, legalAidJson, readJson, uuidOrThrow } from "@/lib/legal-aid/api";
import { setRegistrationStatus } from "@/lib/legal-aid/registration-service";
import type { RegistrationStatus } from "@/lib/legal-aid/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: RegistrationStatus[] = ["received", "confirmed", "waitlisted", "cancelled", "declined"];

// A participant may cancel their own registration; assigned staff may set any
// status. The RPC decides which of the two the caller is.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ registrationId: string }> }) {
  try {
    const actor = await anyActor(request, { mutation: true });
    if ("response" in actor) return actor.response;
    const { registrationId } = await params;
    const body = await readJson(request);
    const status = body.status;
    if (typeof status !== "string" || !STATUSES.includes(status as RegistrationStatus)) throw new ClinicValidationError("A valid registration status is required.");
    if (actor.kind === "participant" && status !== "cancelled") throw new ClinicValidationError("You can cancel your registration here; MVLP confirms it.");
    const outcome = await setRegistrationStatus(uuidOrThrow(registrationId, "Registration"), actor.userId, status as RegistrationStatus);
    return legalAidJson({ success: true, outcome });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
