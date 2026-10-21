import { NextRequest, NextResponse } from "next/server";
import { getClinicEventWorkspace, setClinicEventStatus } from "@/lib/clinic-mode/service";
import { parseClinicEventStatus, parseEventId } from "@/lib/clinic-mode/validation";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_request: NextRequest, context: Context) {
  try {
    const { eventId } = await context.params;
    return NextResponse.json({ success: true, workspace: await getClinicEventWorkspace(parseEventId(eventId)) });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { eventId } = await context.params;
    const body = await request.json() as Record<string, unknown>;
    const outcome = await setClinicEventStatus(parseEventId(eventId), parseClinicEventStatus(body.status));
    return NextResponse.json({ success: true, outcome });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}
