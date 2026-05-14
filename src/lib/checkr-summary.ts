import type { CheckrReport } from "@/lib/checkr";

export type ProviderReportSummary = {
  provider: "checkr";
  reportId: string;
  status: string;
  result?: string;
  requiresReview: boolean;
};

export function summarizeCheckrReport(report: CheckrReport): ProviderReportSummary {
  return {
    provider: "checkr",
    reportId: report.id,
    status: report.status ?? "unknown",
    result: report.result,
    requiresReview: report.result ? report.result !== "clear" : report.status !== "complete"
  };
}
