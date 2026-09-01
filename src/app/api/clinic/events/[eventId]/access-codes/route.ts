import { NextRequest, NextResponse } from "next/server";
import { createClinicAccessCode } from "@/lib/clinic-mode/service";
import { parseCreateClinicAccessCode, parseEventId } from "@/lib/clinic-mode/validation";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";
import { assertClinicMutationRequest } from "@/lib/clinic-mode/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    assertClinicMutationRequest(request);
    const { eventId } = await params;
    const accessCode = await createClinicAccessCode(parseEventId(eventId), parseCreateClinicAccessCode(await request.json()));
    return NextResponse.json({ success: true, accessCode }, { status: 201 });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}
