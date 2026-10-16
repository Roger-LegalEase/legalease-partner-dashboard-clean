import { MD_JUVENILE_CAPTION_ROUTE, MD_JUVENILE_CAPTION_SOURCE, MD_JUVENILE_CAPTION_IDENTITY_INPUTS, mdJuvenileCaptionQuestion } from "@/lib/expungement-ai/md-juvenile-county-source-purpose";
import { MN_PETITION_ROUTE, MN_PROSECUTOR_ROUTE, MN_TARGET_ORIGIN_ID, MN_TARGET_ORIGIN_SOURCE, MN_TARGET_ORIGIN_IDENTITY_INPUTS, mnTargetOriginQuestion } from "@/lib/expungement-ai/mn-two-county-source-facts";
import { MS_FIRST_OFFENDER_ROUTE, MS_FIRST_OFFENDER_IDS, MS_FIRST_OFFENDER_SOURCE, msFirstOffenderSourceContract } from "@/lib/rcap-engine/mississippi-first-offender-source-facts";
import { msFirstOffenderSourceQuestions } from "@/lib/expungement-ai/ms-first-offender-source-questions";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import "server-only";
import type { ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import { questionAnswerState, scalarAnswerText, uncertaintyState, answerValueIsKnown } from "@/lib/expungement-ai/question-answer-state";
import type { ProfileQuestion, AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { GA_PARDON_CAPTION_ROUTE, GA_PARDON_CAPTION_INPUTS, GA_PARDON_CAPTION_QUESTIONS } from "@/lib/expungement-ai/ga-pardon-caption";

import { NY_16059_ROUTE, NY_16059_SOURCE, NY_16059_CUSTODY_CONFIRMATION_ID, NY_16059_RELEASE_CONFIRMATION_ID, ny16059QuestionApplies } from "@/lib/rcap-engine/new-york-16059-facts";
import { NY_16059_QUESTIONS } from "@/lib/rcap-engine/new-york-16059-questions";
import { NY_CLOCK_CONFIRMATION_INPUT_IDS } from "@/lib/expungement-ai/ny-16059-clock-confirmation";
const NY_ROUTE = `NY:${NY_16059_ROUTE}`;
const NY_CONFIRMATION_IDS = [NY_16059_CUSTODY_CONFIRMATION_ID, NY_16059_RELEASE_CONFIRMATION_ID];

const NY_INPUTS = Object.fromEntries(NY_CONFIRMATION_IDS.map(id => [id, NY_CLOCK_CONFIRMATION_INPUT_IDS]));

const MS_FIRST_ROUTE = `MS:${MS_FIRST_OFFENDER_ROUTE}`;
// History excludes this particular conviction; changing the conviction's
// identity needs a fresh answer about which convictions are the OTHER ones.
// Residence/signing county and unrelated contact fields are not dependencies.
const MS_FIRST_INPUTS = {
  ms_misd1_conviction_finality: ["charge", "charge_legal_citation", "ms_conviction_court", "cause_number"],
  ms_misd1_complete_conviction_history: ["charge", "charge_legal_citation", "ms_conviction_court", "cause_number"],
  ms_misd1_traffic_record_classification: ["charge", "charge_legal_citation"],
  ms_misd1_official_duty_nexus: ["charge", "charge_legal_citation", "ms_conviction_court", "cause_number"]
} as const;
const MN_ORIGIN_ROUTES = new Set([`MN:${MN_PETITION_ROUTE}`, `MN:${MN_PROSECUTOR_ROUTE}`]);
const MN_ORIGIN_INPUTS = { [MN_TARGET_ORIGIN_ID]: MN_TARGET_ORIGIN_IDENTITY_INPUTS };
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
  return routeKey === MD_JUVENILE_CAPTION_ROUTE ? { county: MD_JUVENILE_CAPTION_IDENTITY_INPUTS } : MN_ORIGIN_ROUTES.has(routeKey) ? MN_ORIGIN_INPUTS : routeKey === MS_FIRST_ROUTE ? MS_FIRST_INPUTS : routeKey === NY_ROUTE ? NY_INPUTS : routeKey === GA_PARDON_CAPTION_ROUTE ? GA_PARDON_CAPTION_INPUTS : routeKey === ROUTE ? RECORD_FACT_INPUTS : {};
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
  if (routeKey === MD_JUVENILE_CAPTION_ROUTE) return new Set(mdJuvenileCaptionQuestion(getProfileByJurisdiction("MD"), "juvenile-expungement", packetSpecificationFor(routeKey)) ? ["county"] : []);
  if (MN_ORIGIN_ROUTES.has(routeKey)) return new Set([MN_TARGET_ORIGIN_ID]);
  if (routeKey === MS_FIRST_ROUTE) return new Set(MS_FIRST_OFFENDER_IDS);
  if (routeKey === NY_ROUTE) return new Set(NY_CONFIRMATION_IDS.filter(id => ny16059QuestionApplies(answers as Record<string, ScreeningAnswerValue>, id)));
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

/** A later return to old target answers cannot revive an earlier MN confirmation.
 * Compare the existing normalized meanings, preserving metadata/history. Explicit
 * confirmation later in the same save may issue a fresh marker. */
export function mnTargetOriginConfirmationsAfterChange(routeKey: string,
  before: Readonly<Record<string, unknown>>, after: Readonly<Record<string, unknown>>,
  recorded: RecordFactConfirmations | undefined): RecordFactConfirmations | undefined {
  const prior = recorded?.[MN_TARGET_ORIGIN_ID];
  if (!MN_ORIGIN_ROUTES.has(routeKey) || !prior || prior.status !== "confirmed") return recorded;
  const changed = [MN_TARGET_ORIGIN_ID, ...MN_TARGET_ORIGIN_IDENTITY_INPUTS]
    .some(id => hash(answerMeaning(before[id])) !== hash(answerMeaning(after[id])));
  return changed ? { ...recorded, [MN_TARGET_ORIGIN_ID]: { ...prior, status: "unconfirmed" } } : recorded;
}

function semanticContract(routeKey: string, factId: string): string | null {
  const inputs = recordFactInputs(routeKey);
  if (!(factId in inputs)) return null;
  const specification = packetSpecificationFor(routeKey);
  if (routeKey === MD_JUVENILE_CAPTION_ROUTE) {
    const question = mdJuvenileCaptionQuestion(getProfileByJurisdiction("MD"), "juvenile-expungement", specification);
    return question && factId === "county" ? hash({ version: 1, routeKey, factId,
      source: MD_JUVENILE_CAPTION_SOURCE, questionContract: question,
      inputFactIds: MD_JUVENILE_CAPTION_IDENTITY_INPUTS, specification }) : null;
  }
  if (MN_ORIGIN_ROUTES.has(routeKey)) {
    const question = mnTargetOriginQuestion(getProfileByJurisdiction("MN"), routeKey.slice(3), packetSpecificationFor(routeKey));
    return question ? hash({ version: 1, routeKey, factId, source: MN_TARGET_ORIGIN_SOURCE,
      questionContract: question, inputFactIds: inputs[factId], specification }) : null;
  }
  if (routeKey === MS_FIRST_ROUTE) return msFirstOffenderSourceContract(getProfileByJurisdiction("MS"), MS_FIRST_OFFENDER_ROUTE, specification)
    ? hash({ version: 1, routeKey, factId, source: MS_FIRST_OFFENDER_SOURCE,
      questionContract: msFirstOffenderSourceQuestions().find(question => question.id === factId), inputFactIds: inputs[factId], specification }) : null;
  if (routeKey === NY_ROUTE) return hash({ version: 1, routeKey, factId, source: NY_16059_SOURCE,
    meaning: "NY02 adopted section 3 inclusive physical days / sentence release relationship / 120 calendar months",
    questionContract: NY_16059_QUESTIONS.find(question => question.id === factId), inputFactIds: inputs[factId], specification });
  const fact = specification?.requiredFacts?.find((entry) => entry.factId === factId);
  // offense_category is the established scoped public packet question, not a specification alias.
  if (!fact && factId !== "offense_category") return null;
  return hash({ version: 1, routeKey, factId, inputFactIds: inputs[factId],
    ...(routeKey === GA_PARDON_CAPTION_ROUTE ? { questionContract: GA_PARDON_CAPTION_QUESTIONS.find(question => question.id === factId) } : {}),
    meaning: fact ? { factId: fact.factId, use: fact.use, ownership: fact.ownership, questionType: fact.questionType, options: fact.options } : { factId: "offense_category", meaning: "MS baseline charge category; independently differing record answer requires review" } });
}
export function recordFactConfirmationFor(routeKey: string, factId: string, answers: Readonly<Record<string, unknown>>, question: ProfileQuestion | undefined): RecordFactConfirmation | null {
  const contractSha256 = semanticContract(routeKey, factId);
  if (routeKey === MD_JUVENILE_CAPTION_ROUTE) {
    const expected = mdJuvenileCaptionQuestion(getProfileByJurisdiction("MD"), "juvenile-expungement", packetSpecificationFor(routeKey));
    const meaning = (candidate: ProfileQuestion) => ({ id: candidate.id, stage: candidate.stage,
      type: candidate.type, prompt: candidate.prompt, helperText: candidate.helperText,
      required: candidate.required, contextOnly: candidate.contextOnly,
      lifecyclePhase: candidate.lifecyclePhase, options: candidate.options, optionDisplay: candidate.optionDisplay, translations: candidate.translations });
    if (!expected || !question || factId !== "county" || hash(meaning(question)) !== hash(meaning(expected))) return null;
  }
  if (MN_ORIGIN_ROUTES.has(routeKey)) {
    const expected = mnTargetOriginQuestion(getProfileByJurisdiction("MN"), routeKey.slice(3), packetSpecificationFor(routeKey));
    const contract = (candidate: ProfileQuestion) => ({ id: candidate.id, type: candidate.type,
      stage: candidate.stage, prompt: candidate.prompt, helperText: candidate.helperText,
      required: candidate.required, contextOnly: candidate.contextOnly,
      lifecyclePhase: candidate.lifecyclePhase, options: candidate.options, translations: candidate.translations });
    if (!expected || !question || factId !== MN_TARGET_ORIGIN_ID || hash(contract(question)) !== hash(contract(expected))) return null;
  }
  if (routeKey === MS_FIRST_ROUTE) {
    const expected = msFirstOffenderSourceQuestions().find(candidate => candidate.id === factId);
    if (!expected || !question || question.id !== factId || question.type !== expected.type
      || question.prompt !== expected.prompt || question.helperText !== expected.helperText
      || question.translations?.es?.prompt !== expected.translations?.es?.prompt
      || question.translations?.es?.helperText !== expected.translations?.es?.helperText
      || hash(question.options) !== hash(expected.options)) return null;
  }
  if (routeKey === NY_ROUTE) {
    const expected = NY_16059_QUESTIONS.find(candidate => candidate.id === factId);
    if (!expected || !question || question.id !== factId || question.type !== expected.type
      || question.prompt !== expected.prompt || question.helperText !== expected.helperText
      || question.translations?.es?.prompt !== expected.translations?.es?.prompt
      || question.translations?.es?.helperText !== expected.translations?.es?.helperText) return null;
  }
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


/** An away-and-back edit cannot revive an old juvenile filing-court meaning. */
export function mdJuvenileCaptionConfirmationsAfterChange(routeKey: string,
  before: Readonly<Record<string, unknown>>, after: Readonly<Record<string, unknown>>,
  recorded?: RecordFactConfirmations): RecordFactConfirmations | undefined {
  const prior = recorded?.county;
  if (routeKey !== MD_JUVENILE_CAPTION_ROUTE || !prior || prior.status !== "confirmed") return recorded;
  const changed = ["county", ...MD_JUVENILE_CAPTION_IDENTITY_INPUTS]
    .some(id => hash(answerMeaning(before[id])) !== hash(answerMeaning(after[id])));
  return changed ? { ...recorded, county: { ...prior, status: "unconfirmed" } } : recorded;
}
