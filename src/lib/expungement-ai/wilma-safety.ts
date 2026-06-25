import "server-only";

import type { WilmaContext } from "@/lib/expungement-ai/wilma-context";

export type WilmaGuardCategory =
  | "eligibility_verdict"
  | "legal_advice_strategy"
  | "outcome_prediction"
  | "guarantee"
  | "unsupported_legal_fact"
  | "attorney_role_confusion"
  | "hard_stop_topic"
  | "unsafe_filing_instruction";

export type WilmaGuardFlag = {
  category: WilmaGuardCategory;
  phrase: string;
  severity: "block" | "flag";
};

export type WilmaGuardResult = {
  blocked: boolean;
  flags: WilmaGuardFlag[];
  response: string;
  redirectOccurred: boolean;
  redirectTarget: "screening_tool" | "human_help" | "none";
};

const safeScreeningRedirect = "That's exactly what the screening tool is built to figure out — it checks your details against your state's rules instead of my gut read. I can walk you through the process and what each question means, but I don't decide eligibility or outcomes. Let's use the screening tool for that part.";
const safeHumanRedirect = "This is really a lawyer question, and I don't want to guess on something that matters this much. Someone qualified — a legal helper or legal aid — should take a look. I can still explain the general process steps in plain English while you line that up.";

const responseGuards: Array<{ category: WilmaGuardCategory; pattern: RegExp; target?: WilmaGuardResult["redirectTarget"] }> = [
  { category: "eligibility_verdict", pattern: /\b(you qualify|you are eligible|you're eligible|you are not eligible|you're not eligible|you don't qualify|you do not qualify)\b/i, target: "screening_tool" },
  { category: "outcome_prediction", pattern: /\b(you will be approved|the judge will|the court will|you'll get this|good chance|your odds)\b/i, target: "screening_tool" },
  { category: "guarantee", pattern: /\b(this guarantees|guaranteed|definitely will|for sure)\b/i, target: "screening_tool" },
  { category: "legal_advice_strategy", pattern: /\b(i recommend you file|you should plead|you should file|your best move is|i'd argue|file under)\b/i, target: "human_help" },
  { category: "attorney_role_confusion", pattern: /\b(i'?m your lawyer|i am your lawyer|as your attorney|my legal advice)\b/i, target: "human_help" },
  { category: "unsafe_filing_instruction", pattern: /\b(file today|skip the lawyer|do not tell the court|leave that off the form)\b/i, target: "human_help" }
];

const hardStopPromptPattern = /\b(immigration|green card|citizenship|pending charge|active case|federal case|sex offense|violent offense|court date|deadline|hearing tomorrow)\b/i;
const humanRoutePattern = /\b(lawyer|attorney|legal aid|legal helper|qualified help|human help)\b/i;
const legalFactPattern = /\b(\d+\s*(day|days|month|months|year|years)|§|statute|deadline|waiting period|file within)\b/i;

export function guardWilmaResponse({
  userMessage,
  draftResponse,
  context
}: {
  userMessage: string;
  draftResponse: string;
  context: WilmaContext;
}): WilmaGuardResult {
  const flags: WilmaGuardFlag[] = [];

  for (const guard of responseGuards) {
    const match = draftResponse.match(guard.pattern);
    if (match?.[0]) {
      flags.push({ category: guard.category, phrase: match[0], severity: "block" });
    }
  }

  if (hardStopPromptPattern.test(userMessage) && !humanRoutePattern.test(draftResponse)) {
    flags.push({ category: "hard_stop_topic", phrase: "hard-stop prompt without human route", severity: "block" });
  }

  if (legalFactPattern.test(draftResponse) && !hasVerifiedLegalFactSupport(context)) {
    flags.push({ category: "unsupported_legal_fact", phrase: "specific legal fact outside injected content", severity: "block" });
  }

  if (flags.length === 0) {
    return {
      blocked: false,
      flags,
      response: draftResponse,
      redirectOccurred: /screening tool|legal helper|lawyer|legal aid/i.test(draftResponse),
      redirectTarget: redirectTargetFor(draftResponse)
    };
  }

  const redirectTarget = flags.some((flag) => flag.category === "hard_stop_topic" || flag.category === "legal_advice_strategy" || flag.category === "attorney_role_confusion")
    ? "human_help"
    : "screening_tool";

  return {
    blocked: true,
    flags,
    response: redirectTarget === "human_help" ? safeHumanRedirect : safeScreeningRedirect,
    redirectOccurred: true,
    redirectTarget
  };
}

export function safeWilmaUnavailableMessage() {
  return "Wilma is temporarily unavailable while we check something. Your Briefcase and packet tools still work.";
}

function redirectTargetFor(response: string): WilmaGuardResult["redirectTarget"] {
  if (/lawyer|attorney|legal aid|legal helper|human help/i.test(response)) return "human_help";
  if (/screening tool/i.test(response)) return "screening_tool";
  return "none";
}

function hasVerifiedLegalFactSupport(context: WilmaContext) {
  return context.injectedStateContentIds.length > 0
    && context.stateContent.source === "rcap_all51_state_pack"
    && context.stateContent.contentId !== "rcap-all51:unsupported";
}
