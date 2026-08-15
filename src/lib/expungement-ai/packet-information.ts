import "server-only";

import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import type { AnswerValue, PacketPlan, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import type { PublicQuestion } from "@/lib/rcap-engine/contracts";

export type PacketInformationStage = "not_started" | "in_progress" | "ready_to_generate";

export type PacketInformationModel = {
  stateCode: string;
  stateName: string;
  pathwayId: string | null;
  pathwayLabel: string;
  packetPlan: PacketPlan | null;
  questions: ProfileQuestion[];
  initialAnswers: Record<string, AnswerValue>;
  requiredInputIds: string[];
  missingInputIds: string[];
  stage: PacketInformationStage;
  updatedAt: string | null;
  reviewedAt: string | null;
};

type CommercialFlow = {
  screening?: {
    profileVersion?: unknown;
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
  const initialAnswers: Record<string, AnswerValue> = {
    ...Object.fromEntries(requiredInputIds.filter((id) => id in screeningAnswers).map((id) => [id, screeningAnswers[id]])),
    ...prefilledAnswers,
    ...savedAnswers
  };

  const questionById = new Map<string, ProfileQuestion>();
  for (const question of allPublicQuestions(publicProfile)) {
    questionById.set(question.id, toProfileQuestion(question));
  }

  const questions = requiredInputIds
    .filter((id) => !(id in serverFacts))
    .map((id) => questionById.get(id) ?? fallbackPacketQuestion(id))
    .map((question) => ({ ...question, required: true, contextOnly: false }));
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
    initialAnswers,
    requiredInputIds,
    missingInputIds,
    stage: packetInformationStage(progress.stage),
    updatedAt: typeof progress.updatedAt === "string" ? progress.updatedAt : null,
    reviewedAt: typeof progress.reviewedAt === "string" ? progress.reviewedAt : null
  };
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
  const allowedIds = new Set(current.questions.map((question) => question.id));
  const acceptedAnswers = Object.fromEntries(
    Object.entries(input.answers).filter(([id, answer]) => allowedIds.has(id) && isAnswerValue(answer))
  );
  const mergedAnswers = { ...current.initialAnswers, ...acceptedAnswers };
  const missingInputIds = missingRequiredInputs(current.requiredInputIds, serverFacts, mergedAnswers);
  const now = new Date().toISOString();

  return {
    patch: {
      commercialFlow: {
        // A legacy accepted matter may predate commercialFlow metadata. Its
        // exact server-stored pathway is reconciled once into the same shape;
        // subsequent saves use the ordinary nested merge path.
        ...(persistedFlow ? {} : flow),
        packetInformation: {
          stage: input.reviewed && missingInputIds.length === 0 ? "ready_to_generate" : "in_progress",
          requiredInputIds: current.requiredInputIds,
          serverFacts,
          prefilledAnswers,
          answers: acceptedAnswers,
          missingInputIds,
          updatedAt: now,
          reviewedAt: input.reviewed ? now : null
        }
      }
    },
    missingInputIds,
    readyToGenerate: input.reviewed && missingInputIds.length === 0
  };
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
  trafficking_status: packetQuestion("trafficking_status", "Was this matter connected to force, fraud, coercion, or human trafficking?", "yes_no_prefer_not_to_say")
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
