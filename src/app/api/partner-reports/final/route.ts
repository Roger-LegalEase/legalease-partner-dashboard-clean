import { unavailablePartnerReport } from "@/lib/reports/partner-report-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return unavailablePartnerReport(request, "final");
}
