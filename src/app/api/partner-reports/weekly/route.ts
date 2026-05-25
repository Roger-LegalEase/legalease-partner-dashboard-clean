import { NextResponse } from "next/server";
import { z } from "zod";
import { generateWeeklyReportNarrative } from "@/lib/reports/generate-weekly-report-narrative";
import { buildPartnerWeeklyReportData } from "@/lib/reports/partner-weekly-report-data";
import { renderWeeklyReportHtml } from "@/lib/reports/render-weekly-report-html";
import { renderWeeklyReportPdf } from "@/lib/reports/render-weekly-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reportErrorMessage = "Could not generate weekly report.";

const weeklyReportSchema = z.object({
  partnerId: z.string().min(1),
  partnerName: z.string().min(1).default("Current Partner"),
  dateRange: z.string().optional(),
  state: z.string().optional(),
  weekNumber: z.number().int().min(1).max(12).optional()
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid weekly report request." }, { status: 400 });
  }

  const parsed = weeklyReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid weekly report request." }, { status: 400 });
  }

  try {
    const reportData = buildPartnerWeeklyReportData(parsed.data);
    const narrative = await generateWeeklyReportNarrative(reportData);
    const html = await renderWeeklyReportHtml(reportData, narrative);
    const pdf = await renderWeeklyReportPdf(html);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${safeFilename(reportData.partnerName)}-weekly-report.pdf"`,
        "cache-control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ error: reportErrorMessage }, { status: 500 });
  }
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "legalease-partner";
}
