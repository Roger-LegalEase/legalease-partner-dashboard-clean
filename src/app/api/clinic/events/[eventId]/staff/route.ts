import { NextRequest, NextResponse } from "next/server";
import { setClinicEventStaff } from "@/lib/clinic-mode/service";
import { parseEventId, parseSetClinicStaff } from "@/lib/clinic-mode/validation";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";
import { assertClinicMutationRequest } from "@/lib/clinic-mode/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    assertClinicMutationRequest(request);
    const { eventId } = await params;
    const staffId = await setClinicEventStaff(parseEventId(eventId), parseSetClinicStaff(await request.json()));
    return NextResponse.json({ success: true, staffId });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}
