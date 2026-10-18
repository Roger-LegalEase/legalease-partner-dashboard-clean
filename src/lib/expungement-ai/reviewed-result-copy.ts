import { OH_JUVENILE_RESULT_COPY } from "@/lib/expungement-ai/oh-juvenile-stage-questions";
import { CT_PETITION_COPY } from "@/lib/rcap-engine/connecticut-clean-slate-petition-facts";
import { GA_SB288_COPY } from "@/lib/rcap-engine/georgia-sb288-facts";
import { questionAnswerState, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import { msExactCalendarDate } from "@/lib/rcap-engine/mississippi-exact-timing";
import { georgiaPardonDisplay } from "@/lib/rcap-engine/georgia-pardon-facts";
import catalog from "@/lib/expungement-ai/frontend/reviewed-result-display-copy.json";

/** Display context only, derived from the answers used for this evaluation.
 * No field changes a rule, a saved answer, a route or commercial authority. */
export type MsTimingDisplayContext = Readonly<{
  kind: "ms_generated_timing_display";
  jurisdiction: "MS";
  pathwayId: string;
  reasons: readonly Readonly<{ code: string; text: string; sourceRef?: string }>[];
  missingQuestionIds: readonly string[];
  fineImposed: "yes" | "no" | null;
  convictionCourt: "justice" | "municipal" | null;
  sentenceDate: string | null;
  paymentDate: string | null;
}>;
export type MsTimingGeneratedSummary = Readonly<{ originalEnglish: string; context: MsTimingDisplayContext }>;
const MIP = "minor-in-possession-underage-alcohol-expungement";
const DUI = "first-offense-dui-expungement";
const LOWER = "additional-justice-or-municipal-court-misdemeanor-relief";
const JUSTICE = "additional-justice-court-misdemeanor-relief-9-11-15-3";
const MUNICIPAL = "additional-municipal-court-misdemeanor-relief-21-23-7-6";
const SENTENCE = "ms_mip_sentence_completion_date", PAYMENT = "ms_mip_fine_payment_date";

export function msTimingDisplayContext(input: {
  evaluation: { jurisdiction: string; pathwayId?: string | null; reasons: readonly { code: string; text: string; sourceRef?: string }[]; missingQuestionIds: readonly string[] };
  answers: Readonly<Record<string, unknown>>;
  unresolvedFactIds?: readonly string[];
}): MsTimingDisplayContext | null {
  const e = input.evaluation;
  if (e.jurisdiction !== "MS" || !e.pathwayId || ![MIP, DUI, LOWER, JUSTICE, MUNICIPAL].includes(e.pathwayId)) return null;
  const reasons = e.reasons.filter(r => ["ms.waiting_anchor_missing", "ms.waiting_period_not_satisfied"].includes(r.code));
  if (!reasons.length) return null;
  const unresolved = new Set(input.unresolvedFactIds);
  const scalar = (id: string, type: "yes_no_unsure" | "single_choice" | "date_or_unknown", options?: readonly string[]) => {
    const raw = input.answers[id];
    return !unresolved.has(id) && questionAnswerState({ id, type, options }, raw) === "known_valid" ? scalarAnswerText(raw) : null;
  };
  const fine = scalar("ms_mip_fine_imposed", "yes_no_unsure")?.trim().toLowerCase();
  const court = scalar("ms_conviction_court", "single_choice", ["justice", "municipal", "county", "circuit", "unknown"]);
  const date = (id: string) => {
    const value = scalar(id, "date_or_unknown");
    return !e.missingQuestionIds.includes(id) && msExactCalendarDate(value) ? value : null;
  };
  return {
    kind: "ms_generated_timing_display", jurisdiction: "MS", pathwayId: e.pathwayId,
    reasons: reasons.map(r => ({ ...r })), missingQuestionIds: [...e.missingQuestionIds],
    fineImposed: fine === "yes" || fine === "no" ? fine : null,
    convictionCourt: court === "justice" || court === "municipal" ? court : null,
    sentenceDate: date(SENTENCE), paymentDate: date(PAYMENT)
  };
}

type TimingEntry = { id: string; originalEnglish: string; en: string; es: string; msTimingVariants?: readonly { key: string; en: string; es: string }[] };
function msTimingCopy(entry: TimingEntry, english: string, context: MsTimingDisplayContext | null): { en: string; es: string } | null {
  if (!context || context.kind !== "ms_generated_timing_display" || context.jurisdiction !== "MS"
    || !context.reasons.some(r => r.text === english && r.code === (entry.id.includes("MISSING-") ? "ms.waiting_anchor_missing" : "ms.waiting_period_not_satisfied"))) return null;
  const lower = [LOWER, JUSTICE, MUNICIPAL].includes(context.pathwayId);
  if (/-(?:MISSING|WAIT)-01$/.test(entry.id) ? !lower : /-(?:MISSING|WAIT)-02$/.test(entry.id) ? context.pathwayId !== DUI : context.pathwayId !== MIP) return null;
  let variant: string | undefined;
  if (entry.id === "MS-EXACT-TIMING-WAIT-01") {
    const court = context.convictionCourt;
    if (!court || context.pathwayId === JUSTICE && court !== "justice" || context.pathwayId === MUNICIPAL && court !== "municipal") return null;
    variant = court;
  }
  const missing = context.missingQuestionIds.filter(id => id === SENTENCE || id === PAYMENT);
  if (entry.id === "MS-EXACT-TIMING-MISSING-04") {
    if (missing.length !== 1 || missing[0] !== SENTENCE) return null;
    if (context.fineImposed === "no") variant = "no_fine";
    else if (context.fineImposed === "yes" && context.paymentDate) variant = "imposed_fine_sentence_missing";
    else return null;
  }
  if (entry.id === "MS-EXACT-TIMING-MISSING-05" && (context.fineImposed !== "yes" || !context.sentenceDate || missing.length !== 1 || missing[0] !== PAYMENT)) return null;
  if (entry.id === "MS-EXACT-TIMING-MISSING-06" && (context.fineImposed !== "yes" || missing.length !== 2)) return null;
  if (entry.id === "MS-EXACT-TIMING-WAIT-04" && (context.fineImposed !== "no" || !context.sentenceDate || missing.length)) return null;
  if (entry.id === "MS-EXACT-TIMING-WAIT-05" && (context.fineImposed !== "yes" || !context.sentenceDate || !context.paymentDate || missing.length)) return null;
  if (!variant) return { en: entry.en, es: entry.es };
  const variants = entry.msTimingVariants?.filter(v => v.key === variant) ?? [];
  return variants.length === 1 ? { en: variants[0].en, es: variants[0].es } : null;
}

/** Identify only the retained MS generated-message vocabulary, never raw answers. */
export function isMsTimingDisplayText(english: string): boolean {
  const base = english.replace(/ The source-specific waiting period runs until \d{4}-\d{2}-\d{2}\.$/, "");
  return catalog.entries.some(entry => entry.id.startsWith("MS-EXACT-TIMING-") && entry.originalEnglish === base);
}

/** Exact display copy only. Contextual MS successors never rewrite literal text. */
export function reviewedResultText(english: string, msContext?: MsTimingDisplayContext | null): { en: string; es: string } | null {
  // Source-grounded supplemental copy; qualified translation review remains pending.
  const draft = [OH_JUVENILE_RESULT_COPY, ...Object.values(GA_SB288_COPY), ...Object.values(CT_PETITION_COPY)].find(([en]) => en === english);
  if (draft) return { en: draft[0], es: draft[1] };
  const matches = catalog.entries.filter((entry) => entry.kind !== "route_display_label" && entry.originalEnglish === english);
  if (matches.length === 1) {
    const entry = matches[0];
    if ("msTimingDisplayOnly" in entry) {
      // Preserve the existing context-free translation contract without applying
      // a new branch-specific English claim to arbitrary saved/literal text.
      return msContext === undefined ? typeof entry.msTimingLegacySpanish === "string" ? { en: english, es: entry.msTimingLegacySpanish } : null : msTimingCopy(entry, english, msContext);
    }
    return { en: entry.en, es: entry.es };
  }
  const dated = english.match(/^(.*) The source-specific waiting period runs until (\d{4}-\d{2}-\d{2})\.$/);
  if (!dated || !msExactCalendarDate(dated[2])) return null;
  const prefixes = catalog.entries.filter(entry => entry.id.startsWith("MS-EXACT-TIMING-WAIT-") && entry.originalEnglish === dated[1]);
  if (prefixes.length !== 1) return null;
  const prefix = prefixes[0];
  // A dated AND-v2 reason also needs its actual generated origin. Its adopted
  // prefix remains byte-for-byte unchanged; only the suffix is replaced.
  const selected = "msTimingDisplayOnly" in prefix ? msTimingCopy(prefix, english, msContext ?? null)
    : prefix.id === "MS-EXACT-TIMING-WAIT-03-AND-v2" && msContext?.jurisdiction === "MS" && msContext.pathwayId === MIP
      && msContext.reasons.some(r => r.text === english && r.code === "ms.waiting_period_not_satisfied") ? { en: prefix.en, es: prefix.es } : null;
  if (!selected) return msContext === undefined ? { en: english, es: `${"msTimingLegacySpanish" in prefix ? prefix.msTimingLegacySpanish : prefix.es} El período de espera específico de esta vía termina el ${dated[2]}.` } : null;
  return {
    en: `${selected.en} ${catalog.msTimingDatedSuffix.en.replace("[DATE]", dated[2])}`,
    es: `${selected.es} ${catalog.msTimingDatedSuffix.es.replace("[FECHA]", dated[2])}`
  };
}

export function reviewedResultRouteLabel(jurisdiction: string | null | undefined, pathwayId: string | null | undefined, english: string, reasonCodes: readonly string[] = []): { en: string; es: string } | null {
  const adopted = georgiaPardonDisplay(jurisdiction, pathwayId, english);
  if (adopted) return adopted;
  const matches = catalog.entries.filter((entry) => entry.kind === "route_display_label" && entry.jurisdiction === jurisdiction
    && entry.pathwayId === pathwayId && entry.originalEnglish === english);
  // Exact source-stage successors for the two separately bound NY mechanisms. Historical results keep their original
  // display; only the server's current factual-stage reason admits this pair.
  // A duplicate, missing predecessor or conflicting binding still fails closed.
  const successors = matches.filter(entry => entry.supersedesDisplayEntryId !== undefined || entry.requiredReasonCode !== undefined);
  if (successors.length === 1 && matches.length === 2) {
    const successor = successors[0];
    const predecessors = matches.filter(entry => entry.id === successor.supersedesDisplayEntryId
      && entry.supersedesDisplayEntryId === undefined && entry.requiredReasonCode === undefined);
    const partialSeal = jurisdiction === "NY" && pathwayId === "automatic-non-conviction-sealing-under-cpl-160-50-160-55"
      && english === "Automatic non-conviction sealing under CPL 160.50 / 160.55"
      && successor.id === "NY16055-CURRENT-ROUTE-DISPLAY"
      && successor.supersedesDisplayEntryId === "NY-RESULT-LABEL-automatic-non-conviction-sealing-under-cpl-160-50-160-55-v1"
      && successor.requiredReasonCode === "ny.partial_seal_guidance";
    const mrtaStage = jurisdiction === "NY" && pathwayId === "marijuana-record-destruction-under-the-mrta"
      && english === "Marijuana-record destruction under the MRTA"
      && successor.id === "NYMRTA-CURRENT-STAGE-DISPLAY"
      && successor.supersedesDisplayEntryId === "NY-RESULT-LABEL-marijuana-record-destruction-under-the-mrta-v1"
      && successor.requiredReasonCode === "ny.mrta_stage_guidance";
    if ((partialSeal || mrtaStage) && predecessors.length === 1) {
      const selected = reasonCodes.includes(successor.requiredReasonCode) ? successor : predecessors[0];
      return { en: selected.en, es: selected.es };
    }
  }
  if (successors.length) return null;
  return matches.length === 1 ? { en: matches[0].en, es: matches[0].es } : null;
}
