import { NextRequest } from "next/server";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";
import { assertClinicMutationRequest } from "@/lib/clinic-mode/request-security";
import { exportClinicEventReport } from "@/lib/clinic-mode/reporting-service";
import { parseEventId } from "@/lib/clinic-mode/validation";
import type { ClinicEventReport } from "@/lib/clinic-mode/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    assertClinicMutationRequest(request);
    const { eventId } = await params;
    const report = await exportClinicEventReport(parseEventId(eventId));
    return new Response(reportCsv(report), {
      headers: {
        "Cache-Control": "no-store, private, max-age=0",
        "Content-Disposition": `attachment; filename="clinic-${report.eventId}-aggregate.csv"`,
        "Content-Type": "text/csv; charset=utf-8"
      }
    });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}

function reportCsv(report: ClinicEventReport) {
  const rows: Array<[string, string | number | null]> = [
    ["event_id", report.eventId],
    ["event_name", report.eventName],
    ["event_status", report.eventStatus],
    ["capacity", report.capacity],
    ["entries", report.entries],
    ["participants", report.participants],
    ["sponsorship_allocation", report.sponsorship.allocation],
    ["sponsorship_reserved", report.sponsorship.reserved],
    ["sponsorship_consumed", report.sponsorship.consumed],
    ["sponsorship_released", report.sponsorship.released],
    ...countRows("queue", report.queueCounts),
    ...countRows("route", report.routeCounts),
    ...countRows("follow_up", report.followUpCounts)
  ];
  return `metric,value\n${rows.map(([metric, value]) => `${csv(metric)},${csv(value ?? "")}`).join("\n")}\n`;
}

function countRows(prefix: string, values: Record<string, number>): Array<[string, number]> {
  return Object.entries(values).sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [`${prefix}_${key}`, value]);
}

function csv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
