"use client";

/**
 * Renders the engine's result. The frontend NEVER decides the outcome — it switches on the
 * validated `resultCode` and renders what the engine returned.
 *
 * Payment/packet clamp (safety constraint #2): the packet/checkout action is shown ONLY when the
 * validated evaluation has `paymentAllowed === true` AND `resultCode` is `packet_ready` or
 * `packet_ready_with_caution` (enforced by `isPaymentAllowed`). Every other result saves/stops
 * with no payment action. No forced-result control, hidden payment flag, or override exists here.
 */
import { AlertTriangle, CheckCircle2, Clock, FileText, HelpCircle, Info, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import {
  isPaymentAllowed,
  type PacketPlan,
  type ResultCode,
  type ScreeningEvaluation
} from "@/lib/expungement-ai/frontend/contracts";
import { friendlyMissingFieldLabel, safeUserFacingEngineText } from "@/lib/expungement-ai/missing-fields";

const UPL_DISCLAIMER =
  "Expungement.ai is not a law firm and this is not legal advice. We prepare self-help materials and information; court approval is not guaranteed. Review everything before filing.";

type Tone = "positive" | "caution" | "info" | "wait" | "blocked";

const RESULT_PRESENTATION: Record<ResultCode, { eyebrow: string; tone: Tone; icon: ReactNode }> = {
  packet_ready: { eyebrow: "A path may be available", tone: "positive", icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> },
  packet_ready_with_caution: { eyebrow: "A path may be available, with cautions", tone: "caution", icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> },
  needs_more_info: { eyebrow: "A few more details needed", tone: "info", icon: <HelpCircle className="h-5 w-5" aria-hidden="true" /> },
  not_yet: { eyebrow: "You may need to wait", tone: "wait", icon: <Clock className="h-5 w-5" aria-hidden="true" /> },
  guidance_only: { eyebrow: "Next steps for your state", tone: "info", icon: <Info className="h-5 w-5" aria-hidden="true" /> },
  not_covered_yet: { eyebrow: "Not supported yet", tone: "info", icon: <Info className="h-5 w-5" aria-hidden="true" /> },
  likely_not_eligible: { eyebrow: "This record may not qualify", tone: "blocked", icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" /> },
  needs_review: { eyebrow: "This needs review", tone: "info", icon: <HelpCircle className="h-5 w-5" aria-hidden="true" /> },
  hard_stop: { eyebrow: "We can't help with this record", tone: "blocked", icon: <ShieldAlert className="h-5 w-5" aria-hidden="true" /> }
};

const TONE_ACCENT: Record<Tone, { eyebrow: string; chip: string }> = {
  positive: { eyebrow: "text-[#00A99D]", chip: "bg-[#E7F7F4] text-[#0B5C54]" },
  caution: { eyebrow: "text-[#B45309]", chip: "bg-[#FDF1E8] text-[#9A3412]" },
  info: { eyebrow: "text-[#475A6E]", chip: "bg-[#EEF2F7] text-[#334155]" },
  wait: { eyebrow: "text-[#475A6E]", chip: "bg-[#EEF2F7] text-[#334155]" },
  blocked: { eyebrow: "text-[#475A6E]", chip: "bg-[#EEF2F7] text-[#334155]" }
};

// Consumer-facing copy for the two packet-ready outcomes. The engine still returns its own
// userLabel/reasons/nextSteps/pathwayId/sourceRefs on the evaluation (used internally and by the
// packet generator); this card just renders plain-English equivalents instead of engine language.
const PACKET_READY_RESULT_CODES: ReadonlySet<ResultCode> = new Set<ResultCode>(["packet_ready", "packet_ready_with_caution"]);

/** Plain, fixed next steps shown for any packet-ready outcome. */
const PACKET_READY_NEXT_STEPS = [
  "Review your answers.",
  "Generate your packet.",
  "Read the filing checklist before you file anything with the court."
];

/** Pathways whose record-clearing route covers cases that did not end in a conviction. */
const NON_CONVICTION_PATHWAY = /non-conviction|dismiss|no-disposition|acquit/i;

function isNonConvictionPathway(evaluation: ScreeningEvaluation) {
  return NON_CONVICTION_PATHWAY.test(evaluation.pathwayId ?? "");
}

function packetSubheading(stateName: string, evaluation: ScreeningEvaluation) {
  if (stateName === "Mississippi" && isNonConvictionPathway(evaluation)) {
    return "Based on your answers, Mississippi may have a record-clearing path for a case that was dismissed, had no final disposition, or ended in acquittal.";
  }
  return `Based on your answers, ${stateName} may have a record-clearing path for this case.`;
}

function packetWhyText(stateName: string, evaluation: ScreeningEvaluation) {
  if (isNonConvictionPathway(evaluation)) {
    return `Your answers match a ${stateName} expungement path for cases that did not end in a conviction.`;
  }
  return `Your answers match a ${stateName} expungement path based on the information you provided.`;
}

export function ScreeningResult({
  evaluation,
  stateName,
  questionPromptById,
  onEditAnswers,
  onPacketAction,
  hasScreeningSession = false
}: {
  evaluation: ScreeningEvaluation;
  stateName: string;
  questionPromptById: Record<string, string>;
  onEditAnswers: (focusQuestionId?: string) => void;
  onPacketAction: () => void;
  // Partner/session mode: the screening was started through a partner program (a screening
  // session already exists). In that mode the consumer pay-and-generate flow does not apply —
  // the packet action saves to Briefcase and no $50 charge is shown here.
  hasScreeningSession?: boolean;
}) {
  const presentation = RESULT_PRESENTATION[evaluation.resultCode];
  const accent = TONE_ACCENT[presentation.tone];
  const showPacketAction = isPaymentAllowed(evaluation);
  const missing = evaluation.missingQuestionIds ?? [];
  const isPacketReady = PACKET_READY_RESULT_CODES.has(evaluation.resultCode);
  const nextSteps = isPacketReady ? PACKET_READY_NEXT_STEPS : evaluation.nextSteps;

  return (
    <div className="rounded-[24px] border border-[#ECEFF4] bg-white p-6 shadow-sm md:p-8">
      <p className={`flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] ${accent.eyebrow}`}>
        {presentation.icon}
        {presentation.eyebrow}
      </p>
      <h1 className="mt-3 text-[26px] font-extrabold leading-tight text-[#0B1320] md:text-[32px]">
        {isPacketReady ? "You may be able to prepare an expungement packet." : evaluation.userLabel}
      </h1>
      <p className="mt-2 text-sm font-semibold text-[#8A93A6]">
        {isPacketReady ? packetSubheading(stateName, evaluation) : stateName}
      </p>

      {isPacketReady ? (
        <Section title="Why">
          <ul className="grid gap-2">
            <li className="flex items-start gap-2 text-sm leading-6 text-[#475A6E]">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CBD5E1]" />
              <span>{packetWhyText(stateName, evaluation)}</span>
            </li>
          </ul>
        </Section>
      ) : evaluation.reasons.length > 0 ? (
        <Section title="Why">
          <ul className="grid gap-2">
            {evaluation.reasons.map((reason, index) => (
              <li key={`${reason.code}-${index}`} className="flex items-start gap-2 text-sm leading-6 text-[#475A6E]">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CBD5E1]" />
                <span>{safeUserFacingEngineText(reason.text)}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {evaluation.cautions.length > 0 ? (
        <Section title="Please read these cautions">
          <ul className="grid gap-2">
            {evaluation.cautions.map((caution, index) => (
              <li key={index} className="flex items-start gap-2 rounded-xl bg-[#FDF1E8] px-3 py-2 text-sm leading-6 text-[#9A3412]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{safeUserFacingEngineText(caution)}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {missing.length > 0 ? (
        <Section title="What we still need">
          <ul className="grid gap-2">
            {missing.map((questionId) => (
              <li key={questionId} className="flex items-start gap-2 text-sm leading-6 text-[#475A6E]">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CBD5E1]" />
                <span>{questionPromptById[questionId] ?? friendlyMissingFieldLabel(questionId)}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {nextSteps.length > 0 ? (
        <Section title="Your next steps">
          <ol className="grid gap-2">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-sm leading-6 text-[#475A6E]">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#EEF2F7] text-[11px] font-bold text-[#334155]">
                  {index + 1}
                </span>
                <span>{safeUserFacingEngineText(step)}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {evaluation.packetPlan ? <PacketPlanSummary plan={evaluation.packetPlan} stateName={stateName} /> : null}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
        {showPacketAction ? (
          <button
            type="button"
            onClick={onPacketAction}
            className="min-h-[48px] flex-1 rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1320] focus-visible:ring-offset-2"
          >
            <FileText className="mr-2 inline h-4 w-4" aria-hidden="true" />
            {hasScreeningSession ? "Save this result to Briefcase" : "Generate my packet ($50)"}
          </button>
        ) : null}
        {missing.length > 0 ? (
          <button
            type="button"
            onClick={() => onEditAnswers(missing[0])}
            className="min-h-[48px] flex-1 rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1320] focus-visible:ring-offset-2"
          >
            Add these details
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onEditAnswers()}
          className="min-h-[48px] rounded-[14px] border border-[#E4E8EF] bg-white px-6 py-3 text-base font-bold text-[#0B1320] hover:border-[#CBD5E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D] focus-visible:ring-offset-2"
        >
          Edit my answers
        </button>
      </div>

      {showPacketAction && hasScreeningSession ? (
        <p className="mt-3 rounded-xl bg-[#EEF2F7] px-3 py-2 text-[13px] leading-5 text-[#334155]">
          This screening started through a partner program. You will not be asked to pay here.
        </p>
      ) : null}

      <p className="mt-5 border-t border-[#ECEFF4] pt-4 text-[12px] leading-5 text-[#8A93A6]">{UPL_DISCLAIMER}</p>
    </div>
  );
}

function packetBodyText(mode: PacketPlan["mode"], stateName: string) {
  if (mode === "automatic_relief_verification_and_guidance") {
    return "We’ll help you confirm automatic relief and what to do next.";
  }
  return `We’ll prepare a ${stateName} expungement packet for you to review, including the documents and filing steps that match the information you provided.`;
}

function PacketPlanSummary({ plan, stateName }: { plan: PacketPlan; stateName: string }) {
  return (
    <Section title="What your packet would include">
      <div className="rounded-xl border border-[#E7F7F4] bg-[#F4FBFA] px-4 py-3 text-sm leading-6 text-[#0B5C54]">
        <p>{packetBodyText(plan.mode, stateName)}</p>
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-[#0B1320]">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** Calm transition while the engine reviews the answers. No outcome is shown or implied. */
export function EvaluatingState() {
  return (
    <div className="rounded-[24px] border border-[#ECEFF4] bg-white p-8 shadow-sm" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#E4E8EF] border-t-[#00A99D] motion-reduce:animate-none" aria-hidden="true" />
        <p className="text-base font-bold text-[#0B1320]">Reviewing your answers…</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#5A6275]">
        This only takes a moment. We are checking what you told us. We do not guess, and nothing here
        is a decision yet.
      </p>
    </div>
  );
}

/**
 * API-error and malformed-response states. Both offer retry; neither can become a packet-ready or
 * payment-allowed state. A malformed response is shown as "we stopped on purpose" rather than a
 * confusing partial result.
 */
export function EvaluationErrorState({
  kind,
  onRetry,
  onEditAnswers
}: {
  kind: "api_error" | "malformed_response";
  onRetry: () => void;
  onEditAnswers: () => void;
}) {
  const malformed = kind === "malformed_response";
  return (
    <div className="rounded-[24px] border border-[#ECEFF4] bg-white p-8 shadow-sm" role="alert">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#B45309]">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        {malformed ? "We stopped to keep this safe" : "Something went wrong"}
      </p>
      <h1 className="mt-3 text-[24px] font-extrabold leading-tight text-[#0B1320]">
        {malformed ? "We couldn't read this result reliably." : "We couldn't check your record just now."}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#5A6275]">
        {malformed
          ? "The result came back in a form we did not expect, so we stopped rather than show you something that might be wrong. Your answers are not lost. Please try again."
          : "This was a connection problem, not a decision about your record. Please try again in a moment."}
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[48px] flex-1 rounded-[14px] bg-[#FF3B00] px-6 py-3 text-base font-extrabold text-white shadow-[0_10px_26px_rgba(255,59,0,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1320] focus-visible:ring-offset-2"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onEditAnswers}
          className="min-h-[48px] rounded-[14px] border border-[#E4E8EF] bg-white px-6 py-3 text-base font-bold text-[#0B1320] hover:border-[#CBD5E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A99D] focus-visible:ring-offset-2"
        >
          Back to my answers
        </button>
      </div>
    </div>
  );
}
