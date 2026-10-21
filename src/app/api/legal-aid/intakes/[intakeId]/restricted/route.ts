import type { NextRequest } from "next/server";
import { legalAidErrorResponse, legalAidJson, participantActor, readJson, uuidOrThrow } from "@/lib/legal-aid/api";
import { setIntakeSsn } from "@/lib/legal-aid/intake-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The one route that accepts the Social Security number. It is encrypted
// before it is stored, only the masked hint is returned, and the value is
// never placed in the answers document, a log line, or a URL.
export async function POST(request: NextRequest, { params }: { params: Promise<{ intakeId: string }> }) {
  try {
    const actor = await participantActor(request);
    if (!actor.ok) return actor.response;
    const { intakeId } = await params;
    const body = await readJson(request);
    const ssn = typeof body.ssn === "string" ? body.ssn : "";
    const result = await setIntakeSsn({ intakeId: uuidOrThrow(intakeId, "Application"), actorUserId: actor.userId, ssn });
    return legalAidJson({ success: true, hint: result.hint });
  } catch (error) {
    return legalAidErrorResponse(error);
  }
}
