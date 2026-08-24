import "server-only";

import { createHash } from "node:crypto";

import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import type { AnswerValue, PacketPlan, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import type { PublicQuestion } from "@/lib/rcap-engine/contracts";
import { evaluateAuthoritativeScreeningResult } from "@/lib/expungement-ai/authoritative-screening-result";
import { InvalidAnswerError } from "@/lib/rcap-engine/evaluator";
import { toScreeningAnswers } from "@/components/expungement-ai/screening/answers";
import { buildCanonicalFactStore, REVIEWED_CONTEXT_FACT_IDS, routeCriticalContextFactIds } from "@/lib/expungement-ai/canonical-facts";
import type { CanonicalFactOrigin } from "@/lib/expungement-ai/canonical-facts";

export type PacketInformationStage = "not_started" | "in_progress" | "ready_to_generate";

export type PacketInformationModel = {
  stateCode: string;
  stateName: string;
  pathwayId: string | null;
  pathwayLabel: string;
  packetPlan: PacketPlan | null;
  questions: ProfileQuestion[];
  builderQuestions: ProfileQuestion[];
  /**
   * UX-GLOBAL-004 — everything a participant may edit for this packet. A
   * superset of `questions`: it also carries the reviewed context facts, which
   * are editable everywhere but only blocking where a route declares them so.
   */
  editableQuestions: ProfileQuestion[];
  /** UX-GLOBAL-004 — questions the canonical store already answers. */
  carriedForwardQuestions: ProfileQuestion[];
  factOrigins: Record<string, CanonicalFactOrigin>;
  initialAnswers: Record<string, AnswerValue>;
  screeningAnswers: Record<string, AnswerValue>;
  requiredInputIds: string[];
  missingInputIds: string[];
  stage: PacketInformationStage;
  updatedAt: string | null;
  reviewedAt: string | null;
};

type CommercialFlow = {
  screening?: {
    profileVersion?: unknown;
    screeningMatterId?: unknown;
    pathwayId?: unknown;
    pathwayLabel?: unknown;
    packetPlan?: unknown;
    answers?: unknown;
  };
  packetInformation?: {
    stage?: unknown;
    requiredInputIds?: unknown;
    serverFacts?: unknown;
    prefilledAnswers?: unknown;
    answers?: unknown;
    missingInputIds?: unknown;
    updatedAt?: unknown;
    reviewedAt?: unknown;
  };
};

/** Build the exact state/pathway questionnaire from the server-saved packet plan. */
export function packetInformationModelFor(item: ConsumerBriefcaseItem): PacketInformationModel | null {
  const profile = getProfileByJurisdiction(item.state);
  if (!profile) return null;
  const flow = commercialFlowForItem(item, profile);
  if (!flow) return null;

  const publicProfile = projectPublicProfile(profile);
  const screening = isRecord(flow.screening) ? flow.screening : {};
  const progress = isRecord(flow.packetInformation) ? flow.packetInformation : {};
  const packetPlan = readPacketPlan(screening.packetPlan);
  const requiredInputIds = packetPlan?.requiredInputIds
    ?? stringArray(progress.requiredInputIds);
  const pathwayId = typeof screening.pathwayId === "string"
    ? screening.pathwayId
    : packetPlan?.pathwayId ?? null;
  const serverFacts: Record<string, AnswerValue> = {
    ...answerRecord(progress.serverFacts),
    jurisdiction: profile.jurisdiction.code,
    ...(pathwayId ? { pathway_id: pathwayId } : {})
  };
  const screeningAnswers = answerRecord(screening.answers);
  const prefilledAnswers = answerRecord(progress.prefilledAnswers);
  const savedAnswers = answerRecord(progress.answers);

  /**
   * UX-GLOBAL-004 — one canonical fact store, built once and used for both
   * "what do we already know" and "what still has to be asked".
   *
   * This replaced `requiredInputIds.filter((id) => id in screeningAnswers)`,
   * which carried a screening answer forward only when the packet plan happened
   * to name the same id. See canonical-facts.ts for why the generalisation is a
   * transcription rather than a legal judgement, and for the two Mississippi
   * cross-id derivations that stay declared and state-scoped.
   */
  const canonical = buildCanonicalFactStore({
    jurisdictionCode: profile.jurisdiction.code,
    pathwayId,
    screeningAnswers,
    prefilledAnswers,
    savedAnswers
  });
  const initialAnswers = canonical.answers;

  const questionById = new Map<string, ProfileQuestion>();
  for (const question of allPublicQuestions(publicProfile)) {
    questionById.set(question.id, toProfileQuestion(question));
  }
  const askableQuestion = (id: string): ProfileQuestion => ({
    ...(questionById.get(id) ?? fallbackPacketQuestion(id)),
    required: true,
    contextOnly: false
  });

  const questionIds = requiredInputIds.filter((id) => !(id in serverFacts));
  /**
   * A route may declare context facts as payment preconditions. Adding an id
   * here puts it in the packet's question set, which is what the pre-payment
   * re-check validates — so it is a route judgement, declared per route in
   * canonical-facts.ts rather than assumed for every state.
   */
  for (const id of routeCriticalContextFactIds(profile.jurisdiction.code, pathwayId)) {
    if (id in serverFacts || questionIds.includes(id)) continue;
    questionIds.push(id);
  }
  let questions = questionIds.map(askableQuestion);

  const mississippiNonConviction = profile.jurisdiction.code === "MS"
    && pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
  if (mississippiNonConviction) {
    // Route-specific wording only. The facts themselves are carried by the
    // canonical store above, the same way they are for every other state.
    const owner = answerTextRaw(screeningAnswers.ownership_scope).toLowerCase() === "yes";
    questions = questions.map((question) => question.id === "pending_cases"
      ? { ...question, prompt: owner ? "Do you currently have any pending criminal charges?" : "Does this person currently have any pending criminal charges?" }
      : question.id === "residency_or_location"
        ? { ...question, prompt: "What city do you currently live in?", helperText: "This is used for the petitioner city in the packet." }
        : question.id === "offense_category"
          ? { ...question, prompt: "How is the offense classified on the court record?", helperText: "Use the classification printed on the record; for this route it is carried forward from the charge level when they match." }
          : question);
  }

  /**
   * The accuracy review renders these facts for every state and links to
   * `?edit=<id>`. They are editable everywhere the participant actually gave
   * them, whether or not the route makes them blocking.
   */
  const editableQuestions = [...questions];
  for (const id of REVIEWED_CONTEXT_FACT_IDS) {
    if (id in serverFacts || editableQuestions.some((question) => question.id === id)) continue;
    if (!questionById.has(id) || !(id in initialAnswers)) continue;
    editableQuestions.push(askableQuestion(id));
  }

  /**
   * Ask only for facts the canonical store does not already hold. Everything
   * already known stays in the question set so the review page can render it and
   * offer a working edit link — it is simply not put to the participant a second
   * time.
   */
  const builderQuestions = questions.filter((question) => !answerIsKnown(initialAnswers[question.id]));
  const carriedForwardQuestions = editableQuestions.filter((question) => answerIsKnown(initialAnswers[question.id]));
  const missingInputIds = missingRequiredInputs(requiredInputIds, serverFacts, initialAnswers);

  return {
    stateCode: profile.jurisdiction.code,
    stateName: profile.jurisdiction.name,
    pathwayId,
    pathwayLabel: typeof screening.pathwayLabel === "string"
      ? screening.pathwayLabel
      : item.pathwayLabel ?? `${profile.jurisdiction.name} record-clearing`,
    packetPlan,
    questions,
    builderQuestions,
    editableQuestions,
    carriedForwardQuestions,
    factOrigins: canonical.origins,
    initialAnswers,
    screeningAnswers,
    requiredInputIds,
    missingInputIds,
    stage: packetInformationStage(progress.stage),
    updatedAt: typeof progress.updatedAt === "string" ? progress.updatedAt : null,
    reviewedAt: typeof progress.reviewedAt === "string" ? progress.reviewedAt : null
  };
}

const MATERIAL_REVIEW_FIELDS = [
  "age_at_offense", "case_outcome", "charge", "disposition_date", "financial_obligations",
  "offense_category", "offense_level", "pending_cases", "prior_relief", "record_type",
  "residency_or_location", "sentence_completion_date", "trafficking_status", "court_requirements_completed"
];

/**
 * UX-GLOBAL-001 — ONE predicate, used by the matter page's forward CTA and by
 * the packet-information page's own guard.
 *
 * They used to disagree. The matter page offered "Complete packet information"
 * whenever `packetInformationModelFor(item)` returned a model; the destination
 * additionally required `item.paymentAllowed || sponsored`. A saved matter whose
 * result was packet-ready but whose paymentAllowed was false therefore got a
 * forward CTA that landed on a page which refused and offered only "Open
 * matter" — straight back to the CTA. The second route in was a legacy matter
 * with no persisted commercialFlow whose stored pathwayLabel did not
 * string-match a packetGenerator label, which makes the model null on both
 * sides but only after the participant has clicked.
 *
 * Both pages now ask this. A caller that cannot proceed gets a reason, not a
 * link that bounces.
 */
export type PacketInformationUnavailableReason =
  | "not_a_packet_matter"
  | "payment_not_authorized"
  | "packet_plan_unavailable";

export type PacketInformationAvailability =
  | { available: true; model: PacketInformationModel }
  | { available: false; reason: PacketInformationUnavailableReason };

export function packetInformationAvailability(
  item: ConsumerBriefcaseItem | null,
  options: { sponsored: boolean }
): PacketInformationAvailability {
  if (!item) return { available: false, reason: "not_a_packet_matter" };
  const packetResult = item.resultCode === "packet_ready" || item.resultCode === "packet_ready_with_caution";
  if (!packetResult) return { available: false, reason: "not_a_packet_matter" };
  if (!item.paymentAllowed && !options.sponsored) return { available: false, reason: "payment_not_authorized" };
  const model = packetInformationModelFor(item);
  if (!model) return { available: false, reason: "packet_plan_unavailable" };
  return { available: true, model };
}

/** Participant-facing copy for each refusal. Never a dead end. */
export const PACKET_INFORMATION_UNAVAILABLE_COPY: Record<PacketInformationUnavailableReason, { title: string; body: string }> = {
  not_a_packet_matter: {
    title: "This matter does not have a packet to complete",
    body: "This saved result is guidance rather than a filing packet, so there is no packet information to collect. Your saved answers and next steps stay in your Briefcase."
  },
  payment_not_authorized: {
    title: "This packet is not available to purchase yet",
    body: "Your result is saved and your answers are kept. This route is not open for packet purchase at the moment — that is a limit on our side, not something missing from your answers. Wilma can explain what this route needs and what you can do next."
  },
  packet_plan_unavailable: {
    title: "We cannot rebuild this packet's question set",
    body: "This matter was saved before we recorded which packet it belongs to, so we cannot show its packet information form. Your saved result and answers are unchanged. Wilma can pick this up and route it to a specialist."
  }
};

export function reviewedPacketInputHash(item: ConsumerBriefcaseItem) {
  const model = packetInformationModelFor(item);
  if (!model) return null;
  const materialAnswers = Object.fromEntries(MATERIAL_REVIEW_FIELDS
    .filter((id) => id in model.initialAnswers)
    .sort()
    .map((id) => [id, model.initialAnswers[id]]));
  return createHash("sha256").update(JSON.stringify({
    state: model.stateCode,
    pathwayId: model.pathwayId,
    answers: materialAnswers
  })).digest("hex");
}

export function missingRequiredInputs(
  requiredInputIds: string[],
  serverFacts: Record<string, AnswerValue>,
  answers: Record<string, AnswerValue>
) {
  return requiredInputIds.filter((id) => !answerIsKnown(serverFacts[id]) && !answerIsKnown(answers[id]));
}

export function expectedPacketComponents(plan: PacketPlan | null): string[] {
  if (plan?.mode === "official_form_overlay_or_source_form_set") {
    return [
      "Completed self-help court forms for this matter",
      "A filing-preparation checklist",
      "Plain-language filing and next-step instructions"
    ];
  }
  return [
    "A personalized self-help court-filing packet for this matter",
    "A filing-preparation checklist",
    "Plain-language filing and next-step instructions"
  ];
}

export function packetInformationPatch(input: {
  existingItem: ConsumerBriefcaseItem;
  answers: Record<string, AnswerValue>;
  reviewed: boolean;
}) {
  const current = packetInformationModelFor(input.existingItem);
  if (!current) return null;
  const profile = getProfileByJurisdiction(input.existingItem.state);
  const persistedFlow = readCommercialFlow(input.existingItem.artifactRefs);
  const flow = profile ? commercialFlowForItem(input.existingItem, profile) : null;
  const progress = isRecord(flow?.packetInformation) ? flow?.packetInformation : {};
  const pathwayId = current.pathwayId ?? current.packetPlan?.pathwayId ?? null;
  const serverFacts: Record<string, AnswerValue> = {
    ...answerRecord(progress.serverFacts),
    jurisdiction: current.stateCode,
    ...(pathwayId ? { pathway_id: pathwayId } : {})
  };
  const prefilledAnswers = answerRecord(progress.prefilledAnswers);
  // UX-GLOBAL-004 — an edit reached from the accuracy review may target a
  // reviewed context fact, which is editable everywhere even where the route
  // does not make it a payment precondition.
  const allowedIds = new Set(current.editableQuestions.map((question) => question.id));
  const acceptedAnswers = Object.fromEntries(
    Object.entries(input.answers).filter(([id, answer]) => allowedIds.has(id) && isAnswerValue(answer))
  );
  const mergedAnswers = { ...current.initialAnswers, ...acceptedAnswers };
  const missingInputIds = missingRequiredInputs(current.requiredInputIds, serverFacts, mergedAnswers);
  const review = input.reviewed && missingInputIds.length === 0
    ? packetInformationReviewSafety(input.existingItem, mergedAnswers)
    : { safe: false, reason: "packet_information_incomplete" };
  const now = new Date().toISOString();

  return {
    patch: {
      commercialFlow: {
        // A legacy accepted matter may predate commercialFlow metadata. Its
        // exact server-stored pathway is reconciled once into the same shape;
        // subsequent saves use the ordinary nested merge path.
        ...(persistedFlow ? {} : flow),
        packetInformation: {
          stage: review.safe ? "ready_to_generate" : "in_progress",
          requiredInputIds: current.requiredInputIds,
          serverFacts,
          prefilledAnswers,
          answers: acceptedAnswers,
          missingInputIds,
          updatedAt: now,
          reviewedAt: review.safe ? now : null,
          reviewSafety: review
        }
      }
    },
    missingInputIds,
    readyToGenerate: review.safe,
    reviewReason: review.reason
  };
}

/**
 * Re-check packet-builder facts before payment. Screening owns the route; the
 * builder may complete it, but it may not quietly contradict it and continue
 * selling the old packet.
 */
export function packetInformationReviewSafety(
  item: ConsumerBriefcaseItem,
  answerOverride?: Record<string, AnswerValue>
): { safe: boolean; reason: string } {
  const model = packetInformationModelFor(item);
  const flow = readCommercialFlow(item.artifactRefs);
  const screening = isRecord(flow?.screening) ? flow.screening : {};
  if (!model || !flow || typeof screening.profileVersion !== "string") {
    return { safe: false, reason: "authoritative_screening_context_missing" };
  }

  const answers = { ...model.initialAnswers, ...answerOverride };
  for (const question of model.questions) {
    const validation = validatePacketAnswer(question, answers[question.id]);
    if (!validation.safe) return validation;
  }

  // These Mississippi facts are source-rule inputs. A contradictory answer
  // cannot remain attached to the ordinary non-conviction packet.
  if (model.stateCode === "MS" && model.pathwayId === "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal") {
    const requiredNeutralFacts: Array<[string, string]> = [
      ["pending_cases", "No"],
      ["trafficking_status", "No"],
      ["prior_relief", "No"],
      ["sentence_completion_date", "Yes"],
      ["financial_obligations", "Yes"]
    ];
    for (const [id, expected] of requiredNeutralFacts) {
      if (answerText(answers[id]) !== expected.toLowerCase()) {
        return { safe: false, reason: `route_changing_answer:${id}` };
      }
    }
  }

  const screeningAnswers = answerRecord(screening.answers);
  const evaluationAnswers = toScreeningAnswers({ ...screeningAnswers, ...answers });
  let evaluation;
  try {
    evaluation = evaluateAuthoritativeScreeningResult({
      jurisdiction: model.stateCode,
      profileVersion: screening.profileVersion,
      matterId: typeof screening.screeningMatterId === "string" ? screening.screeningMatterId : item.id,
      answers: evaluationAnswers
    }).evaluation;
  } catch (error) {
    // Some packet-only form fields intentionally are not evaluator questions.
    // Remove only the ids the authoritative evaluator explicitly identifies;
    // all recognized route facts remain and are re-evaluated.
    if (!(error instanceof InvalidAnswerError)) return { safe: false, reason: "authoritative_reevaluation_failed" };
    for (const id of error.invalidQuestionIds) delete evaluationAnswers[id];
    try {
      evaluation = evaluateAuthoritativeScreeningResult({
        jurisdiction: model.stateCode,
        profileVersion: screening.profileVersion,
        matterId: typeof screening.screeningMatterId === "string" ? screening.screeningMatterId : item.id,
        answers: evaluationAnswers
      }).evaluation;
    } catch {
      return { safe: false, reason: "authoritative_reevaluation_failed" };
    }
  }

  const packetReady = evaluation.resultCode === "packet_ready" || evaluation.resultCode === "packet_ready_with_caution";
  if (!packetReady || !evaluation.paymentAllowed || evaluation.pathwayId !== model.pathwayId) {
    return { safe: false, reason: "authoritative_route_changed" };
  }
  return { safe: true, reason: "authoritative_route_confirmed" };
}

function validatePacketAnswer(question: ProfileQuestion, value: AnswerValue | undefined) {
  if (!answerIsKnown(value)) return { safe: false, reason: `invalid_packet_answer:${question.id}` };
  const text = answerText(value);
  if (question.type === "date_or_unknown" && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return { safe: false, reason: `invalid_date:${question.id}` };
  }
  if (question.type === "number_or_range" && !/^\d+$/.test(text)) {
    return { safe: false, reason: `invalid_number:${question.id}` };
  }
  if (question.type === "single_choice" && question.options?.length && !question.options.includes(answerTextRaw(value))) {
    return { safe: false, reason: `invalid_choice:${question.id}` };
  }
  return { safe: true, reason: "valid" };
}

function answerTextRaw(value: AnswerValue | undefined) {
  if (isRecord(value)) return String(value.value ?? "").trim();
  return String(value ?? "").trim();
}

function answerText(value: AnswerValue | undefined) {
  return answerTextRaw(value).toLowerCase();
}

/**
 * UX-GLOBAL-008 — every value rendered to a participant passes through a human
 * formatter.
 *
 * The review page held a three-entry map — gt_10_years, yes, no — and returned
 * String(value) for everything else, so the other snake_case option values the
 * 51 public profiles serve reached the participant raw. These are the canonical
 * labels, taken from the same option displays the questionnaire renders, so the
 * review page and the question cannot disagree.
 */
export const DECLARED_ANSWER_VALUE_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  not_sure: "I'm not sure",
  not_applicable: "This does not apply to my case",
  still_open: "This case is still open",
  lt_1_year: "Less than 1 year ago",
  years_1_to_2: "1-2 years ago",
  years_2_to_3: "2-3 years ago",
  years_3_to_5: "3-5 years ago",
  years_5_to_7: "5-7 years ago",
  years_7_to_10: "7-10 years ago",
  gt_10_years: "More than 10 years ago",
  prefer_not_to_say: "Prefer not to say"
};

/** A machine-shaped token a participant should never be shown as-is. */
export function looksMachineShaped(value: string) {
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(value);
}

/**
 * The one formatter. A declared label wins; anything else machine-shaped is
 * humanized rather than printed raw. `verifyAnswerValueLabels` fails the build
 * when a profile serves a machine-shaped option this table does not declare, so
 * the humanizer is a floor and not a substitute for a real label.
 */
export function humanAnswerValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "Missing";
  if (Array.isArray(value)) return value.map((entry) => humanAnswerValue(entry)).join(", ");
  if (typeof value === "object") {
    const record = value as { unknown?: boolean; value?: unknown };
    return record.unknown ? "I'm not sure" : humanAnswerValue(record.value);
  }
  const raw = String(value);
  const declared = DECLARED_ANSWER_VALUE_LABELS[raw];
  if (declared) return declared;
  if (!looksMachineShaped(raw)) return raw;
  return raw.replaceAll("_", " ").replace(/^./, (first) => first.toUpperCase());
}

export function answerLabel(id: string) {
  return FALLBACK_PACKET_QUESTIONS[id]?.prompt ?? id
    .replaceAll("_", " ")
    .replace(/^./, (first) => first.toUpperCase());
}

function readCommercialFlow(refs: Record<string, unknown> | undefined): CommercialFlow | null {
  const value = refs?.commercialFlow;
  return isRecord(value) ? value as CommercialFlow : null;
}

function commercialFlowForItem(
  item: ConsumerBriefcaseItem,
  profile: NonNullable<ReturnType<typeof getProfileByJurisdiction>>
): CommercialFlow | null {
  const persisted = readCommercialFlow(item.artifactRefs);
  if (persisted) return persisted;
  if (item.resultCode !== "packet_ready" && item.resultCode !== "packet_ready_with_caution") return null;

  const pathway = profile.packetGenerator.pathways.find((candidate) => (
    candidate.pathwayLabel === item.pathwayLabel
    || `${profile.jurisdiction.code}:${candidate.pathwayLabel}` === item.pathwayLabel
  ));
  if (!pathway) return null;
  const packetPlan = packetPlanForPathway(profile, pathway.pathwayId);
  if (!packetPlan) return null;

  const serverFacts: Record<string, AnswerValue> = {
    jurisdiction: profile.jurisdiction.code,
    pathway_id: pathway.pathwayId
  };
  return {
    screening: {
      profileVersion: profile.profileVersion,
      pathwayId: pathway.pathwayId,
      pathwayLabel: pathway.pathwayLabel,
      packetPlan,
      answers: {}
    },
    packetInformation: {
      stage: "not_started",
      requiredInputIds: packetPlan.requiredInputIds,
      serverFacts,
      prefilledAnswers: {},
      answers: {},
      missingInputIds: packetPlan.requiredInputIds.filter((id) => !(id in serverFacts)),
      updatedAt: null,
      reviewedAt: null
    }
  };
}

function readPacketPlan(value: unknown): PacketPlan | null {
  if (!isRecord(value)
    || typeof value.pathwayId !== "string"
    || typeof value.mode !== "string"
    || typeof value.formMappingStatus !== "string") return null;
  return {
    pathwayId: value.pathwayId,
    mode: value.mode as PacketPlan["mode"],
    formMappingStatus: value.formMappingStatus as PacketPlan["formMappingStatus"],
    sourceFormIds: stringArray(value.sourceFormIds),
    requiredInputIds: stringArray(value.requiredInputIds),
    sourceRuleRefs: stringArray(value.sourceRuleRefs)
  };
}

function allPublicQuestions(profile: ReturnType<typeof projectPublicProfile>) {
  const groups = profile.postPaymentPacketCompletion;
  return [
    ...profile.questions,
    ...(groups?.requiredPacketCompletionFields ?? []),
    ...(groups?.officialFormFields ?? []),
    ...(groups?.customPleadingFields ?? []),
    ...(groups?.externalDocumentChecklist ?? []),
    ...(groups?.filingReadinessFields ?? []),
    ...(groups?.serviceOrMailingFields ?? []),
    ...(groups?.narrativeFields ?? []),
    ...(groups?.optionalFields ?? [])
  ];
}

function toProfileQuestion(question: PublicQuestion): ProfileQuestion {
  return {
    id: question.id,
    stage: question.stage,
    prompt: question.prompt,
    helperText: question.helperText,
    type: question.type,
    required: question.required,
    contextOnly: question.contextOnly === true,
    lifecyclePhase: question.lifecyclePhase,
    options: Array.isArray(question.options) && question.options.every((value) => typeof value === "string")
      ? question.options
      : null,
    optionDisplay: question.optionDisplay,
    translations: question.translations
  };
}

const FALLBACK_PACKET_QUESTIONS: Record<string, ProfileQuestion> = {
  participant_full_legal_name: packetQuestion("participant_full_legal_name", "What is your full legal name?", "text"),
  contact_information: packetQuestion("contact_information", "What contact information should appear with this matter?", "text", "Include the mailing address, phone number, or email the court form requests."),
  county: packetQuestion("county", "Which county handled this matter?", "text_or_unknown"),
  court: packetQuestion("court", "Which court handled this matter?", "text_or_unknown"),
  charge: packetQuestion("charge", "What charge or offense appears on the court record?", "text_or_unknown"),
  criminal_history: packetQuestion("criminal_history", "What does your criminal-history record show for this matter?", "text_or_unknown", "Use the record wording when you can. You can say that you need help finding it."),
  offense_category: packetQuestion("offense_category", "What category does the court record use for this offense?", "text_or_unknown"),
  record_type: packetQuestion("record_type", "What type of record is this?", "single_choice", undefined, ["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"]),
  residency_or_location: packetQuestion("residency_or_location", "What city or location belongs with this matter?", "text_or_unknown"),
  age_at_offense: packetQuestion("age_at_offense", "How old were you when this happened?", "number_or_range"),
  pardon_status: packetQuestion("pardon_status", "Have you received a pardon or similar official relief for this matter?", "yes_no_unsure"),
  trafficking_status: packetQuestion("trafficking_status", "Was this matter connected to force, fraud, coercion, or human trafficking?", "yes_no_prefer_not_to_say"),
  disposition_date: packetQuestion("disposition_date", "What date did the case end or get resolved?", "date_or_unknown", "Use the date shown on the dismissal, disposition, or court docket."),
  prior_relief: packetQuestion("prior_relief", "Have you previously received expungement, sealing, or similar relief for another record?", "yes_no_unsure")
};

function fallbackPacketQuestion(id: string): ProfileQuestion {
  return FALLBACK_PACKET_QUESTIONS[id]
    ?? packetQuestion(id, answerLabel(id), "text_or_unknown", "Enter the wording from your court or agency record when possible.");
}

function packetQuestion(
  id: string,
  prompt: string,
  type: ProfileQuestion["type"],
  helperText?: string,
  options: string[] | null = null
): ProfileQuestion {
  return {
    id,
    stage: "packet_information",
    prompt,
    helperText,
    type,
    required: true,
    contextOnly: false,
    lifecyclePhase: "postpay_packet_field",
    options
  };
}

function packetInformationStage(value: unknown): PacketInformationStage {
  if (value === "in_progress" || value === "ready_to_generate") return value;
  return "not_started";
}

function answerRecord(value: unknown): Record<string, AnswerValue> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, entry]) => {
    if (typeof entry === "boolean") return [[key, entry ? "Yes" : "No"]];
    return isAnswerValue(entry) ? [[key, entry]] : [];
  }));
}

function answerIsKnown(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0
      && normalized !== "i am not sure"
      && normalized !== "i'm not sure"
      && normalized !== "unknown"
      && normalized !== "prefer not to say";
  }
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0 && value.every((entry) => answerIsKnown(entry));
  if (isRecord(value)) return value.unknown !== true && answerIsKnown(value.value);
  return false;
}

function isAnswerValue(value: unknown): value is AnswerValue {
  if (value === null || typeof value === "string" || typeof value === "number") return true;
  if (Array.isArray(value)) return value.every((entry) => typeof entry === "string");
  if (isRecord(value)) {
    return (value.value === undefined || value.value === null || typeof value.value === "string" || typeof value.value === "number")
      && (value.unknown === undefined || typeof value.unknown === "boolean");
  }
  return false;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
