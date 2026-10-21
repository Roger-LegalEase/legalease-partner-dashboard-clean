import { NextRequest, NextResponse } from "next/server";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";
import { getClinicEventReport } from "@/lib/clinic-mode/reporting-service";
import { parseEventId } from "@/lib/clinic-mode/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params;
    const report = await getClinicEventReport(parseEventId(eventId));
    return NextResponse.json({ success: true, report }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}
