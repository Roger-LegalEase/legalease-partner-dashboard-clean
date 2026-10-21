import type { NextRequest } from "next/server";
import { legalAidErrorResponse, legalAidJson, participantActor, uuidOrThrow } from "@/lib/legal-aid/api";
import { getParticipantIntakeById } from "@/lib/legal-aid/intake-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The participant's own view of their application (answers, signatures,
// documents, requests, next steps). Never includes the protected value.
export async function GET(request: NextRequest, { params }: { params: Promise<{ intakeId: string }> }) {
  try {
    const actor = await participantActor(request, { mutation: false });
    if (!actor.ok) return actor.response;
    const { intakeId } = await params;
    const intake = await getParticipantIntakeById(uuidOrThrow(intakeId, "Application"), actor.userId);
    if (!intake) return legalAidJson({ success: false, error: "Application was not found." }, 404);
    return legalAidJson({ success: true, intake });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
