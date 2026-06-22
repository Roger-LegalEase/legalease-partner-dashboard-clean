import { NextResponse } from "next/server";
import { z } from "zod";
import { generateFinalImpactReportNarrative } from "@/lib/reports/generate-final-impact-report-narrative";
import { buildPartnerFinalImpactReportData } from "@/lib/reports/partner-final-impact-report-data";
import { renderFinalImpactReportHtml } from "@/lib/reports/render-final-impact-report-html";
import { renderFinalImpactReportPdf } from "@/lib/reports/render-final-impact-report-pdf";
import { getPartnerDocumentActivitySummary } from "@/lib/rcap/documents/source-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const finalReportSchema = z.object({
  partnerId: z.string().min(1),
  partnerName: z.string().min(1).default("Current Partner"),
  dateRange: z.string().optional(),
  state: z.string().optional()
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid final impact report request." }, { status: 400 });
  }

  const parsed = finalReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid final impact report request." }, { status: 400 });
  }

  try {
    const documentActivity = await getPartnerDocumentActivitySummary(parsed.data.partnerId);
    const reportData = buildPartnerFinalImpactReportData({
      ...parsed.data,
      actualReliefDeliveredPackets: documentActivity.actualReliefDeliveredPackets,
      reliefOutcomeBreakdown: documentActivity.reliefOutcomeBreakdown
    });
    const narrative = await generateFinalImpactReportNarrative(reportData);
    const html = await renderFinalImpactReportHtml(reportData, narrative);
    const pdf = await renderFinalImpactReportPdf(html);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${safeFilename(reportData.partnerName)}-final-impact-report.pdf"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    console.error("Final impact report generation failed:", error);
    return NextResponse.json({ error: "Could not generate final impact report." }, { status: 500 });
  }
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "legalease-partner";
}
