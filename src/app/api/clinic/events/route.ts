import { NextRequest, NextResponse } from "next/server";
import { createClinicEvent, listClinicEvents } from "@/lib/clinic-mode/service";
import { parseCreateClinicEvent } from "@/lib/clinic-mode/validation";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ success: true, events: await listClinicEvents() });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const eventId = await createClinicEvent(parseCreateClinicEvent(await request.json()));
    return NextResponse.json({ success: true, eventId }, { status: 201 });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}
