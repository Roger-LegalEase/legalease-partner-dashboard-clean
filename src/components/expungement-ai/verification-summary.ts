import { maskedSensitiveAnswer, requiresMcicIdentifierAuthority } from "@/lib/expungement-ai/sensitive-packet-facts";
import type { AnswerValue, ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { EXPUNGEMENT_COPY, resolveRuntimeText } from "@/lib/expungement-ai/localization";

type VerificationFactSource = "screeningAnswers" | "prefilledAnswers" | "packetAnswers" | "serverFacts";
type CanonicalVerificationFact = {
  key: string;
  id: string;
  label: string;
  value: unknown;
  source: VerificationFactSource;
  systemContext: boolean;
};

type CanonicalVerificationContextFact = {
  key: string;
  label: string;
  value: unknown;
  systemContext: true;
};

type CanonicalVerificationManifest = {
  schemaVersion: "expungement-ai/verification-review-manifest/v1";
  factKeys: string[];
  systemContextKeys: string[];
};

export type VerificationSummaryRow = {
  key: string;
  id: string;
  label: string;
  value: string;
  source: VerificationFactSource;
  editId: string | null;
  /** Display-only Spanish; canonical labels, values and manifest keys stay intact. */
  labelEs?: string;
  valueEs?: string;
};

export type VerificationContextRow = {
  key: string;
  label: string;
  value: string;
};

export type VerificationSummary = {
  complete: true;
  context: VerificationContextRow[];
  screeningAnswers: VerificationSummaryRow[];
  packetAnswers: VerificationSummaryRow[];
};

const SOURCES: VerificationFactSource[] = ["screeningAnswers", "prefilledAnswers", "packetAnswers", "serverFacts"];
const SYSTEM_FACT_KEYS = new Set(["serverFacts:jurisdiction", "serverFacts:pathway_id"]);
const SHARED_SYSTEM_CONTEXT_KEYS = [
  "deferralComponentIds",
  "dependencies",
  "jurisdiction",
  "packetFamilyIdentifiers",
  "packetPlan",
  "packetType",
  "pathwayId",
  "paymentAllowed",
  "profileAuthorityFingerprint",
  "profileSourceFingerprint",
  "profileVersion",
  "requiredInputIds",
  "resultCode",
  "schemaVersion",
  "selectedTrackId",
  "treatmentClassification"
] as const;
const VERIFIED_SYSTEM_CONTEXT_KEYS = [...SHARED_SYSTEM_CONTEXT_KEYS, "verifiedAt"] as const;
const DRAFT_SYSTEM_CONTEXT_KEYS = ["capturedAt", ...SHARED_SYSTEM_CONTEXT_KEYS] as const;

/**
 * Validate and project Lane B's canonical ordered fact surface. Returning null
 * keeps final attestation closed if that server surface is absent or drifts.
 */
export function verificationSummary(model: {
  stateCode: string;
  pathwayId: string | null;
  packetPlan: unknown;
  requiredInputIds: string[];
  screeningAnswers: Record<string, AnswerValue>;
  prefilledAnswers: Record<string, AnswerValue>;
  packetAnswers: Record<string, AnswerValue>;
  initialAnswers: Record<string, AnswerValue>;
  serverFacts: Record<string, AnswerValue>;
  builderQuestions: Array<{ id: string }>;
  questions?: Array<ReviewQuestion>;
  verificationSummary?: unknown;
  verificationContext?: unknown;
  verificationManifest?: unknown;
}): VerificationSummary | null {
  const facts = readCanonicalFacts(model.verificationSummary);
  const contextFacts = readCanonicalContext(model.verificationContext);
  const manifest = readCanonicalManifest(model.verificationManifest);
  if (!facts || !contextFacts || !manifest || !canonicalOrderIsValid(facts)) return null;

  const factKeys = facts.map((fact) => fact.key);
  const contextKeys = contextFacts.map((fact) => fact.key);
  const isVerifiedContext = sameStringArray(contextKeys, [...VERIFIED_SYSTEM_CONTEXT_KEYS]);
  const isDraftContext = sameStringArray(contextKeys, [...DRAFT_SYSTEM_CONTEXT_KEYS]);
  if (!sameStringArray(manifest.factKeys, factKeys)
    || !sameStringArray(manifest.systemContextKeys, contextKeys)
    || (!isVerifiedContext && !isDraftContext)) return null;

  const factsByKey = new Map(facts.map((fact) => [fact.key, fact]));
  const contextByKey = new Map(contextFacts.map((fact) => [fact.key, fact]));
  const manifestFactKeys = new Set(manifest.factKeys);
  const manifestContextKeys = new Set(manifest.systemContextKeys);
  if (factsByKey.size !== facts.length
    || new Set(facts.map((fact) => fact.id)).size !== facts.length
    || contextByKey.size !== contextFacts.length
    || manifestFactKeys.size !== manifest.factKeys.length
    || manifestContextKeys.size !== manifest.systemContextKeys.length
    || manifest.factKeys.some((key) => manifestContextKeys.has(key))) return null;

  const expectedSchema = isDraftContext
    ? "expungement-ai/protected-packet-draft/v1"
    : "expungement-ai/final-verification/v1";
  const timestampValue = contextByKey.get(isDraftContext ? "capturedAt" : "verifiedAt")?.value;
  if (!sameValue(contextByKey.get("schemaVersion")?.value, expectedSchema)
    || typeof timestampValue !== "string" || timestampValue.length === 0
    || !sameValue(contextByKey.get("jurisdiction")?.value, model.stateCode)
    || !sameValue(contextByKey.get("pathwayId")?.value, model.pathwayId)
    || !sameValue(contextByKey.get("packetPlan")?.value, model.packetPlan)
    || !sameValue(contextByKey.get("requiredInputIds")?.value, model.requiredInputIds)) return null;

  if (!sourceFactsMatch(facts, "screeningAnswers", model.screeningAnswers)
    || !sourceFactsMatch(facts, "prefilledAnswers", model.prefilledAnswers)
    || !sourceFactsMatch(facts, "packetAnswers", model.packetAnswers)
    || !sourceFactsMatch(facts, "serverFacts", model.serverFacts)) return null;

  const editableIds = new Set(model.builderQuestions.map((question) => question.id));
  const questionById = new Map(model.questions?.map((question) => [question.id, question]));
  const rows = facts.map((fact): VerificationSummaryRow => ({
    key: fact.key,
    id: fact.id,
    label: fact.label,
    value: fact.id === "social_security_number" ? maskedSensitiveAnswer(fact.value) : displayVerificationAnswer(fact.value,
      questionById.get(fact.id)?.prompt === fact.label ? questionById.get(fact.id) : undefined),
    ...reviewAnswerPresentation(fact, questionById.get(fact.id), model.stateCode),
    source: fact.source,
    editId: fact.id === "social_security_number_last_four" && requiresMcicIdentifierAuthority(model.stateCode, model.pathwayId) ? "social_security_number" : !fact.systemContext
      && (fact.source === "prefilledAnswers" || fact.source === "packetAnswers")
      && editableIds.has(fact.id)
      ? fact.id
      : null
  }));
  const contextRows: VerificationContextRow[] = [
    ...rows.filter((row) => SYSTEM_FACT_KEYS.has(row.key)).map(({ key, label, value }) => ({ key, label, value })),
    ...contextFacts.map((fact) => ({
      key: fact.key,
      label: fact.label,
      value: displayVerificationAnswer(fact.value)
    }))
  ];

  return {
    complete: true,
    context: contextRows,
    screeningAnswers: rows.filter((row) => row.source === "screeningAnswers" && !SYSTEM_FACT_KEYS.has(row.key)),
    packetAnswers: rows.filter((row) => row.source !== "screeningAnswers" && !SYSTEM_FACT_KEYS.has(row.key))
  };
}

function readCanonicalFacts(value: unknown): CanonicalVerificationFact[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const facts: CanonicalVerificationFact[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const fact = candidate as Record<string, unknown>;
    if (!hasExactKeys(fact, ["id", "key", "label", "source", "systemContext", "value"])
      || typeof fact.id !== "string" || fact.id.length === 0
      || typeof fact.label !== "string" || fact.label.length === 0
      || typeof fact.source !== "string" || !SOURCES.includes(fact.source as VerificationFactSource)
      || fact.key !== `${fact.source}:${fact.id}`
      || typeof fact.systemContext !== "boolean") return null;
    const expectedContext = SYSTEM_FACT_KEYS.has(fact.key as string);
    if (fact.systemContext !== expectedContext) return null;
    facts.push(fact as CanonicalVerificationFact);
  }
  return facts;
}

function readCanonicalContext(value: unknown): CanonicalVerificationContextFact[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const context: CanonicalVerificationContextFact[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const fact = candidate as Record<string, unknown>;
    if (!hasExactKeys(fact, ["key", "label", "systemContext", "value"])
      || typeof fact.key !== "string" || fact.key.length === 0
      || typeof fact.label !== "string" || fact.label.length === 0
      || fact.systemContext !== true) return null;
    context.push(fact as CanonicalVerificationContextFact);
  }
  return context;
}

function readCanonicalManifest(value: unknown): CanonicalVerificationManifest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const manifest = value as Record<string, unknown>;
  if (!hasExactKeys(manifest, ["factKeys", "schemaVersion", "systemContextKeys"])
    || manifest.schemaVersion !== "expungement-ai/verification-review-manifest/v1"
    || !isStringArray(manifest.factKeys)
    || !isStringArray(manifest.systemContextKeys)) return null;
  return manifest as CanonicalVerificationManifest;
}

function sourceFactsMatch(
  facts: CanonicalVerificationFact[],
  source: VerificationFactSource,
  expected: Record<string, AnswerValue>
) {
  const sourceFacts = facts.filter((fact) => fact.source === source);
  const expectedEntries = Object.entries(expected);
  if (sourceFacts.length !== expectedEntries.length) return false;
  return expectedEntries.every(([id, value]) => sameValue(
    sourceFacts.find((fact) => fact.id === id)?.value,
    value
  ));
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]) {
  return sameStringArray(Object.keys(value).sort(), [...expected].sort());
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length > 0);
}

function sameStringArray(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function canonicalOrderIsValid(facts: CanonicalVerificationFact[]) {
  for (let index = 1; index < facts.length; index += 1) {
    const previous = facts[index - 1];
    const current = facts[index];
    const sourceOrder = SOURCES.indexOf(previous.source) - SOURCES.indexOf(current.source);
    if (sourceOrder > 0 || (sourceOrder === 0 && previous.id > current.id)) return false;
  }
  return true;
}

function sameValue(left: unknown, right: unknown) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map((key) => [key, canonicalize(record[key])]));
}

export function displayVerificationAnswer(value: unknown, question?: ReviewQuestion) {
  if (value === undefined || value === null || value === "") return "Missing";
  if (value && typeof value === "object" && !Array.isArray(value) && "unknown" in value && value.unknown === true) return "I’m not sure";
  if (question && ["single_choice", "multi_select", "yes_no_unsure", "yes_no_prefer_not_to_say"].includes(question.type)) {
    const options = question.type === "yes_no_unsure" ? ["Yes", "No", "I am not sure"]
      : question.type === "yes_no_prefer_not_to_say" ? ["Yes", "No", "Prefer not to say"] : question.options ?? [];
    const scalar = typeof value === "boolean" ? value ? "Yes" : "No"
      : value && typeof value === "object" && !Array.isArray(value) && "value" in value ? value.value : value;
    const values = Array.isArray(value) && question.type === "multi_select" ? value : [scalar];
    if (values.length > 0 && values.every((entry) => typeof entry === "string" && options.includes(entry))) {
      return values.map((entry) => question.optionDisplay?.[entry as string]?.label ?? entry).join(", ");
    }
  }
  if (Array.isArray(value)) return value.length > 0
    ? value.map((entry) => typeof entry === "object" ? JSON.stringify(canonicalize(entry)) : String(entry)).join(", ")
    : "None";
  if (typeof value === "object") {
    const answer = value as { unknown?: unknown; value?: unknown };
    if ("unknown" in answer || "value" in answer) {
      return answer.unknown ? "I’m not sure" : String(answer.value ?? "Missing");
    }
    return JSON.stringify(canonicalize(value));
  }
  return String(value);
}

type ReviewQuestion = Pick<ProfileQuestion, "id" | "type" | "prompt" | "translations" | "optionDisplay" | "options">;

function exactProfileSpanish(english: string, state: string, id: string, part: string): string {
  const entry = EXPUNGEMENT_COPY[`profile.${state}.${id}.${part}`];
  return entry?.en === english ? entry.es ?? english : english;
}

/** Localize source-bound labels/choices, never names, narratives or quoted record text. */
export function reviewAnswerPresentation(fact: Pick<CanonicalVerificationFact, "id" | "label" | "value">, question: ReviewQuestion | undefined, state: string): { labelEs?: string; valueEs?: string } {
  // A same-ID prompt with changed meaning is insufficient translation authority.
  if (!question || question.id !== fact.id || question.prompt !== fact.label) return {};
  const labelEs = question.translations?.es?.prompt ?? exactProfileSpanish(question.prompt, state, question.id, "prompt");
  if (fact.id === "social_security_number") {
    const masked = maskedSensitiveAnswer(fact.value);
    return { labelEs, valueEs: masked === "Sensitive value hidden" ? resolveRuntimeText("es", masked) : masked };
  }
  const value = fact.value;
  if (value === null || value === undefined || value === "") return { labelEs, valueEs: resolveRuntimeText("es", "Missing") };
  if (value && typeof value === "object" && !Array.isArray(value) && "unknown" in value && value.unknown === true) {
    return { labelEs, valueEs: resolveRuntimeText("es", "I am not sure") };
  }
  if (!["single_choice", "multi_select", "yes_no_unsure", "yes_no_prefer_not_to_say"].includes(question.type)) return { labelEs };
  const options = question.type === "yes_no_unsure" ? ["Yes", "No", "I am not sure"]
    : question.type === "yes_no_prefer_not_to_say" ? ["Yes", "No", "Prefer not to say"] : question.options ?? [];
  const scalar = typeof value === "boolean" ? value ? "Yes" : "No"
    : value && typeof value === "object" && !Array.isArray(value) && "value" in value ? value.value : value;
  const values = Array.isArray(value) && question.type === "multi_select" ? value : [scalar];
  if (!values.length) return { labelEs, valueEs: resolveRuntimeText("es", "None") };
  if (!values.every((entry) => typeof entry === "string" && options.includes(entry))) return { labelEs };
  return { labelEs, valueEs: values.map((entry) => {
    const option = entry as string;
    const display = question.optionDisplay?.[option];
    return display?.translations?.es?.label ?? (display?.label
      ? exactProfileSpanish(display.label, state, question.id, `option.${option}.label`)
      : resolveRuntimeText("es", option));
  }).join(", ") };
}
