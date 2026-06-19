import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, FileText, HelpCircle, Lock, MapPinned, ShieldCheck, XCircle } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import type { ExpungementAiEligibilityResult, ExpungementAiResultCode } from "@/lib/expungement-ai/types";

type BranchPresentation = {
  tag: string;
  title: string;
  body: string;
  primary: string;
  secondary?: string;
  tone: "teal" | "navy" | "cream" | "muted";
  icon: ComponentType<{ className?: string; "aria-hidden"?: true }>;
};

const branchPresentation: Record<ExpungementAiResultCode, BranchPresentation> = {
  packet_ready: {
    tag: "Packet ready",
    title: "You may be eligible.",
    body: "Based on your answers, the engine returned a packet-ready self-help path. The court makes the final decision.",
    primary: "Generate my packet - $50",
    secondary: "Review what this packet includes",
    tone: "teal",
    icon: CheckCircle2
  },
  packet_ready_with_caution: {
    tag: "Possible path",
    title: "You may have a path.",
    body: "Your answers suggest a possible self-help path with cautions. Review everything carefully before filing.",
    primary: "Generate my packet - $50",
    secondary: "Review the cautions",
    tone: "cream",
    icon: ShieldCheck
  },
  needs_more_info: {
    tag: "Almost there",
    title: "We need a few more details.",
    body: "A few missing answers are all that is left. Add details and run the check again when you are ready.",
    primary: "Add missing details",
    secondary: "Save and come back",
    tone: "navy",
    icon: HelpCircle
  },
  not_yet: {
    tag: "Not yet",
    title: "You may need to wait.",
    body: "This may become available later. Save the result and set a reminder to check again.",
    primary: "Send me a reminder",
    secondary: "See what needs to happen first",
    tone: "navy",
    icon: Bell
  },
  guidance_only: {
    tag: "Guidance saved",
    title: "We can give you next steps for your state.",
    body: "We saved state-specific guidance to your Briefcase. This path does not show a paid packet action.",
    primary: "Open guidance in Briefcase",
    secondary: "Email me my next steps",
    tone: "teal",
    icon: MapPinned
  },
  not_covered_yet: {
    tag: "Not covered yet",
    title: "We do not support this record type yet.",
    body: "We are adding more record types and pathways. Save this result and request an update.",
    primary: "Join the update list",
    secondary: "See general next steps",
    tone: "navy",
    icon: MapPinned
  },
  likely_not_eligible: {
    tag: "May not match",
    title: "This record may not match a self-help filing path.",
    body: "This is not a final legal decision. It means the answers do not match a packet we can support right now.",
    primary: "See why",
    secondary: "Save my result",
    tone: "muted",
    icon: XCircle
  },
  needs_review: {
    tag: "Review needed",
    title: "This situation needs review before a packet is generated.",
    body: "We do not want to generate the wrong packet. Save your answers and consider legal aid or attorney review.",
    primary: "Save my answers",
    secondary: "Join review list",
    tone: "navy",
    icon: HelpCircle
  },
  hard_stop: {
    tag: "Out of scope",
    title: "We cannot help with this type of record.",
    body: "This tool prepares self-help packets for supported state record types. This situation falls outside what it can generate.",
    primary: "Find legal help",
    tone: "muted",
    icon: AlertTriangle
  }
};

const nonPaymentCodes: ExpungementAiResultCode[] = [
  "needs_more_info",
  "not_yet",
  "guidance_only",
  "not_covered_yet",
  "likely_not_eligible",
  "needs_review",
  "hard_stop"
];

// Behavioral source: design-handoff/expungement-ai-frontend/files-6/Expungement-Flow-Prototype.html
export function shouldShowConsumerPayGate(result: ExpungementAiEligibilityResult) {
  return result.paymentAllowed === true && (result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution");
}

export function nonPaymentBranchesNeverShowPayGate(resultCode: ExpungementAiResultCode) {
  return nonPaymentCodes.includes(resultCode);
}

export function ResultPanel({ result }: { result: ExpungementAiEligibilityResult }) {
  const showPayGate = shouldShowConsumerPayGate(result);
  const presentation = branchPresentation[result.resultCode];
  const Icon = presentation.icon;

  return (
    <section className="rounded-[24px] border border-[#E4E8EF] bg-white p-5 font-sans shadow-sm md:p-8" data-payment-allowed={String(result.paymentAllowed)}>
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#E7F7F4] text-[#00A99D]">
        <Icon className="h-8 w-8" aria-hidden />
      </div>
      <div className="mt-5 text-center">
        <span className={tagClass(presentation.tone)}>{presentation.tag}</span>
        <h1 className="mx-auto mt-4 max-w-2xl text-[30px] font-extrabold leading-tight text-[#0B1320] md:text-[42px]">{presentation.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-[15.5px] leading-7 text-[#5A6275]">{presentation.body}</p>
        {result.pathwayLabel ? <p className="mx-auto mt-4 w-fit rounded-full bg-[#F7F3EC] px-4 py-2 text-xs font-extrabold text-[#0B1320]">{result.pathwayLabel}</p> : null}
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <ResultList title="Why" icon={<CheckCircle2 className="h-5 w-5 text-[#00A99D]" aria-hidden />} items={result.reasons} />
        <ResultList title="Next steps" icon={<FileText className="h-5 w-5 text-[#00A99D]" aria-hidden />} items={result.nextSteps} />
      </div>

      {result.missingInfo?.length ? (
        <div className="mt-4 rounded-xl border border-[#E0A93B]/30 bg-[#E0A93B]/10 p-4 text-sm text-[#0B1320]">
          <b>Still needed:</b> {result.missingInfo.join(", ")}
        </div>
      ) : null}

      <div className="mt-7 grid gap-3">
        {showPayGate ? (
          <div className="rounded-2xl border border-[#FF3B00]/30 bg-[#FF3B00]/10 p-5" data-consumer-pay-gate="visible">
            <p className="flex items-center gap-2 text-sm font-extrabold text-[#0B1320]">
              <Lock className="h-5 w-5 text-[#FF3B00]" aria-hidden />
              Generate your packet for $50
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5A6275]">One-time payment. Your generated packet saves to Briefcase after checkout.</p>
            <Link className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[13px] bg-[#FF3B00] px-5 text-sm font-extrabold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)] md:w-fit" href={`/expungement-ai/pay?briefcaseItemId=${encodeURIComponent(result.briefcaseItemId ?? "")}`}>
              {presentation.primary}
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#ECEFF4] bg-[#FBFCFE] p-5" data-consumer-pay-gate="hidden">
            <p className="flex items-center gap-2 text-sm font-extrabold text-[#0B1320]">
              <ShieldCheck className="h-5 w-5 text-[#00A99D]" aria-hidden />
              Saved to Briefcase. No payment is available for this result.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[13px] bg-[#0B1320] px-5 text-sm font-extrabold text-white" href={result.resultCode === "needs_more_info" ? "/expungement-ai/check" : "/briefcase"}>
                {presentation.primary}
              </Link>
              {presentation.secondary ? (
                <Link className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[13px] border border-[#D9DEE8] px-5 text-sm font-extrabold text-[#0B1320]" href="/expungement-ai/support">
                  {presentation.secondary}
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <p className="mt-5 text-xs leading-5 text-[#5A6275]">{result.disclaimer}</p>
      <p className="mt-2 text-xs font-bold text-[#00A99D]">Saved to your Briefcase.</p>
    </section>
  );
}

function ResultList({ title, icon, items }: { title: string; icon: ReactNode; items: string[] }) {
  return (
    <div className="rounded-xl bg-[#FBFCFE] p-4">
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-[#0B1320]">
        {icon}
        {title}
      </h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-[#5A6275]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function tagClass(tone: BranchPresentation["tone"]) {
  if (tone === "teal") return "inline-flex rounded-full bg-[#E7F7F4] px-3 py-1 text-xs font-extrabold text-[#0E7A6E]";
  if (tone === "cream") return "inline-flex rounded-full bg-[#F7F3EC] px-3 py-1 text-xs font-extrabold text-[#9A6B00]";
  if (tone === "muted") return "inline-flex rounded-full bg-[#F0F1F4] px-3 py-1 text-xs font-extrabold text-[#5A6275]";
  return "inline-flex rounded-full bg-[#EDF1F6] px-3 py-1 text-xs font-extrabold text-[#475A6E]";
}
