import { NextRequest, NextResponse } from "next/server";
import { listClinicQueue, transitionClinicQueueCase } from "@/lib/clinic-mode/participant-service";
import type { ClinicQueueCase } from "@/lib/clinic-mode/types";
import { parseEventId } from "@/lib/clinic-mode/validation";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statuses: ClinicQueueCase["queueStatus"][] = ["started","in_progress","needs_information","attorney_review","packet_ready","referred","closed"];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try { const { eventId } = await params; return NextResponse.json({ success: true, cases: await listClinicQueue(parseEventId(eventId)) }); }
  catch (error) { return clinicErrorResponse(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const body = await request.json() as { caseId?: unknown; queueStatus?: unknown };
    if (typeof body.caseId !== "string" || typeof body.queueStatus !== "string" || !statuses.includes(body.queueStatus as ClinicQueueCase["queueStatus"])) throw new Error("invalid queue transition");
    const outcome = await transitionClinicQueueCase(parseEventId(eventId), parseEventId(body.caseId), body.queueStatus as ClinicQueueCase["queueStatus"]);
    return NextResponse.json({ success: true, outcome });
  } catch (error) { return clinicErrorResponse(error); }
}
