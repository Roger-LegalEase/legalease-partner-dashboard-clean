import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, Lock } from "lucide-react";
import type { ExpungementAiEligibilityResult } from "@/lib/expungement-ai/types";

export function shouldShowConsumerPayGate(result: ExpungementAiEligibilityResult) {
  return result.paymentAllowed === true && (result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution");
}

export function ResultPanel({ result }: { result: ExpungementAiEligibilityResult }) {
  const showPayGate = shouldShowConsumerPayGate(result);

  return (
    <section className="rounded-2xl border border-[#ECEFF4] bg-white p-6 shadow-sm" data-result-code={result.resultCode} data-payment-allowed={String(result.paymentAllowed)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00A99D]">{result.state} result</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-[#0B1320] md:text-4xl">{result.userLabel}</h1>
          <p className="mt-3 text-sm font-semibold text-[#5A6275]">{result.pathwayLabel}</p>
        </div>
        <div className="rounded-xl bg-[#F7F3EC] px-4 py-3 text-sm font-bold text-[#0B1320]">Confidence: {result.confidence}</div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-[#FBFCFE] p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#0B1320]">
            <CheckCircle2 className="h-5 w-5 text-[#00A99D]" aria-hidden="true" />
            Why
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5A6275]">
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-[#FBFCFE] p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#0B1320]">
            <FileText className="h-5 w-5 text-[#00A99D]" aria-hidden="true" />
            Next steps
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5A6275]">
            {result.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      </div>

      {result.missingInfo?.length ? (
        <div className="mt-4 rounded-xl border border-[#E0A93B]/30 bg-[#E0A93B]/10 p-4 text-sm text-[#0B1320]">
          Missing: {result.missingInfo.join(", ")}
        </div>
      ) : null}

      {showPayGate ? (
        <div className="mt-6 rounded-2xl border border-[#FF3B00]/30 bg-[#FF3B00]/10 p-5" data-consumer-pay-gate="visible">
          <p className="flex items-center gap-2 text-sm font-bold text-[#0B1320]">
            <Lock className="h-5 w-5 text-[#FF3B00]" aria-hidden="true" />
            Generate your packet for $50
          </p>
          <p className="mt-2 text-sm leading-6 text-[#5A6275]">One-time payment. Your generated packet saves to Briefcase instantly after checkout.</p>
          <Link className="mt-4 inline-flex min-h-11 items-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white" href={`/expungement-ai/pay?briefcaseItemId=${encodeURIComponent(result.briefcaseItemId ?? "")}`}>
            Continue to $50 payment
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-[#ECEFF4] bg-[#FBFCFE] p-5" data-consumer-pay-gate="hidden">
          <p className="flex items-center gap-2 text-sm font-bold text-[#0B1320]">
            <AlertTriangle className="h-5 w-5 text-[#00A99D]" aria-hidden="true" />
            Saved to Briefcase. No payment is available for this result.
          </p>
        </div>
      )}

      <p className="mt-5 text-xs leading-5 text-[#5A6275]">{result.disclaimer}</p>
      <p className="mt-2 text-xs font-semibold text-[#00A99D]">Briefcase item: {result.briefcaseItemId}</p>
    </section>
  );
}
