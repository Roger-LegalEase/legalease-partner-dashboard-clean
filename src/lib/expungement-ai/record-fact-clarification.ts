import "server-only";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import { questionAnswerState, scalarAnswerText, uncertaintyState, answerValueIsKnown } from "@/lib/expungement-ai/question-answer-state";
import type { ProfileQuestion, AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { GA_PARDON_CAPTION_ROUTE, GA_PARDON_CAPTION_INPUTS, GA_PARDON_CAPTION_QUESTIONS } from "@/lib/expungement-ai/ga-pardon-caption";

const ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
export const RECORD_FACT_INPUTS: Readonly<Record<string, readonly string[]>> = {
  court_name: ["court"],
  court_type: ["court", "court_name"],
  filing_location: ["court", "court_name", "court_type", "county"],
  offense_category: ["offense_level", "charge", "charge_legal_citation"],
  charge_classification: ["offense_level", "charge", "charge_legal_citation"]
};
export type RecordFactConfirmation = {
  version: 1; routeKey: string; status: "confirmed" | "unconfirmed"; contractSha256?: string; inputSha256?: string; valueSha256?: string;
  legacyValues?: Array<{ source: "screeningAnswers" | "prefilledAnswers" | "packetAnswers"; value: unknown;
    meaning: "unconfirmed_record_fact"; profileVersion: string; routeKey: string }>;
};
export type RecordFactConfirmations = Record<string, RecordFactConfirmation>;

function recordFactInputs(routeKey: string): Readonly<Record<string, readonly string[]>> {
  return routeKey === GA_PARDON_CAPTION_ROUTE ? GA_PARDON_CAPTION_INPUTS : routeKey === ROUTE ? RECORD_FACT_INPUTS : {};
}

function knownText(value: unknown): string | null {
  if (value && typeof value === "object" && !Array.isArray(value) && (value as { unknown?: boolean }).unknown === true) return null;
  const text = scalarAnswerText(value)?.trim();
  return text && !uncertaintyState(text) ? text : null;
}
export function unambiguousMsCourtType(value: unknown): string | null {
  const text = knownText(value);
  if (!text || /\b(?:transfer(?:red)?|moved?|different courts?|another court)\b/i.test(text)) return null;
  const matches = [...text.matchAll(/\b(justice|municipal|county|circuit|youth|district|superior|magistrate)\s+court\b/gi)];
  if (matches.length !== 1 || !/^(justice|municipal|county|circuit)$/i.test(matches[0][1])) return null;
  return `${matches[0][1][0].toUpperCase()}${matches[0][1].slice(1).toLowerCase()} Court`;
}

/** These original controls retain distinct record meanings; no broad charge/county/name substitution. */
export function recordFactOwnQuestionIds(routeKey: string, answers: Readonly<Record<string, unknown>>, recorded?: RecordFactConfirmations): Set<string> {
  if (routeKey === GA_PARDON_CAPTION_ROUTE) return new Set(Object.keys(GA_PARDON_CAPTION_INPUTS));
  if (routeKey !== ROUTE) return new Set();
  const own = new Set(["court_name", "filing_location", "charge_classification"]);
  const courtType = unambiguousMsCourtType(answers.court), captionType = unambiguousMsCourtType(answers.court_name);
  const targetType = knownText(answers.court_type);
  if (!courtType || knownText(answers.court_name) && !captionType || captionType && captionType !== courtType || "court_type" in answers && targetType !== courtType) own.add("court_type");
  const level = knownText(answers.offense_level), category = knownText(answers.offense_category);
  if ("offense_category" in answers && (!category || category !== level)) own.add("offense_category");
  for (const id of Object.keys(recorded ?? {})) if (id in RECORD_FACT_INPUTS) own.add(id);
  return own;
}

/** Scalar wrappers and surrounding whitespace do not change meaning. Unknown and declined stay distinct. */
function answerMeaning(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return { state: "unanswered" };
  if (value && typeof value === "object" && !Array.isArray(value) && (value as { unknown?: boolean }).unknown === true) return { state: "uncertain" };
  const text = scalarAnswerText(value)?.trim();
  if (text !== undefined && text !== null) return { state: uncertaintyState(text) ?? (text ? "known" : "unanswered"), value: text };
  return { state: "unrecognized", value };
}

function semanticContract(routeKey: string, factId: string): string | null {
  const inputs = recordFactInputs(routeKey);
  if (!(factId in inputs)) return null;
  const specification = packetSpecificationFor(routeKey);
  const fact = specification?.requiredFacts?.find((entry) => entry.factId === factId);
  // offense_category is the established scoped public packet question, not a specification alias.
  if (!fact && factId !== "offense_category") return null;
  return hash({ version: 1, routeKey, factId, inputFactIds: inputs[factId],
    ...(routeKey === GA_PARDON_CAPTION_ROUTE ? { questionContract: GA_PARDON_CAPTION_QUESTIONS.find(question => question.id === factId) } : {}),
    meaning: fact ? { factId: fact.factId, use: fact.use, ownership: fact.ownership, questionType: fact.questionType, options: fact.options } : { factId: "offense_category", meaning: "MS baseline charge category; independently differing record answer requires review" } });
}
export function recordFactConfirmationFor(routeKey: string, factId: string, answers: Readonly<Record<string, unknown>>, question: ProfileQuestion | undefined): RecordFactConfirmation | null {
  const contractSha256 = semanticContract(routeKey, factId);
  if (routeKey === GA_PARDON_CAPTION_ROUTE) {
    const expected = GA_PARDON_CAPTION_QUESTIONS.find(candidate => candidate.id === factId);
    if (!expected || !question || question.id !== factId || question.type !== expected.type
      || question.prompt !== expected.prompt || question.helperText !== expected.helperText
      || question.stage !== expected.stage || question.lifecyclePhase !== expected.lifecyclePhase
      || question.translations?.es?.prompt !== expected.translations?.es?.prompt
      || question.translations?.es?.helperText !== expected.translations?.es?.helperText
      || question.required !== expected.required || question.contextOnly !== expected.contextOnly
      || question.options !== null) return null;
    const raw = answers[factId];
    const value = raw && typeof raw === "object" && !Array.isArray(raw) && (raw as { unknown?: unknown }).unknown === false
      ? (raw as { value?: unknown }).value : raw;
    if (typeof value !== "string" || !value.trim()) return null;
  }
  if (!contractSha256 || !question || !answerValueIsKnown(answers[factId]) || questionAnswerState(question, answers[factId] as AnswerValue) !== "known_valid") return null;
  return { version: 1, routeKey, status: "confirmed", contractSha256,
    inputSha256: hash(recordFactInputs(routeKey)[factId].map((id) => [id, answerMeaning(answers[id])])), valueSha256: hash(answerMeaning(answers[factId])) };
}
export function unresolvedRecordFactConfirmations(routeKey: string, answers: Readonly<Record<string, unknown>>, questions: ReadonlyMap<string, ProfileQuestion>, recorded?: RecordFactConfirmations): string[] {
  const unresolved: string[] = [];
  for (const id of recordFactOwnQuestionIds(routeKey, answers, recorded)) {
    // A held Georgia result has no packet plan. Do not collect caption facts
    // before a document preparation surface actually requires these fields.
    if (routeKey === GA_PARDON_CAPTION_ROUTE && questions.get(id)?.stage !== "packet_information") continue;
    const current = recordFactConfirmationFor(routeKey, id, answers, questions.get(id));
    if (!current) { unresolved.push(id); continue; } // One requirement per original fact, including an unknown/invalid draft.
    const prior = recorded?.[id];
    if (!prior || prior.status !== "confirmed" || prior.version !== current.version || prior.routeKey !== current.routeKey || prior.contractSha256 !== current.contractSha256
      || prior.inputSha256 !== current.inputSha256 || prior.valueSha256 !== current.valueSha256) unresolved.push(id);
  }
  return unresolved;
}

/** A confirmation is not permission to disregard an explicit court-record conflict. */
export function recordFactCourtConflict(routeKey: string, answers: Readonly<Record<string, unknown>>): boolean {
  if (routeKey !== ROUTE) return false;
  const court = knownText(answers.court), caption = knownText(answers.court_name), selected = knownText(answers.court_type);
  const ambiguous = (text: string | null) => Boolean(text && (/\b(?:transfer(?:red)?|moved?|different courts?|another court)\b/i.test(text)
    || [...text.matchAll(/\b(justice|municipal|county|circuit|youth|district|superior|magistrate)\s+court\b/gi)].length > 1));
  if (ambiguous(court) || ambiguous(caption)) return true;
  const types = [unambiguousMsCourtType(court), unambiguousMsCourtType(caption), selected].filter(Boolean);
  return new Set(types).size > 1;
}
