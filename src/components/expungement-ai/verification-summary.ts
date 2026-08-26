import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

type VerificationFactSource = "screeningAnswers" | "prefilledAnswers" | "packetAnswers" | "serverFacts";
type CanonicalVerificationFact = {
  key: string;
  id: string;
  label: string;
  value: unknown;
  source: VerificationFactSource;
  systemContext: boolean;
};

export type VerificationSummaryRow = {
  key: string;
  id: string;
  label: string;
  value: string;
  source: VerificationFactSource;
  editId: string | null;
};

export type VerificationSummary = {
  complete: true;
  context: VerificationSummaryRow[];
  screeningAnswers: VerificationSummaryRow[];
  packetAnswers: VerificationSummaryRow[];
};

const SOURCES: VerificationFactSource[] = ["screeningAnswers", "prefilledAnswers", "packetAnswers", "serverFacts"];
const CONTEXT_KEYS = new Set(["serverFacts:jurisdiction", "serverFacts:pathway_id"]);

/**
 * Validate and project Lane B's canonical ordered fact surface. Returning null
 * keeps final attestation closed if that server surface is absent or drifts.
 */
export function verificationSummary(model: {
  screeningAnswers: Record<string, AnswerValue>;
  initialAnswers: Record<string, AnswerValue>;
  builderQuestions: Array<{ id: string }>;
  verificationSummary?: unknown;
}): VerificationSummary | null {
  const facts = readCanonicalFacts(model.verificationSummary);
  if (!facts || !canonicalOrderIsValid(facts)) return null;

  const factsByKey = new Map(facts.map((fact) => [fact.key, fact]));
  if (factsByKey.size !== facts.length) return null;
  if (![...CONTEXT_KEYS].every((key) => factsByKey.get(key)?.systemContext === true)) return null;

  for (const [id, value] of Object.entries(model.screeningAnswers)) {
    if (!sameValue(factsByKey.get(`screeningAnswers:${id}`)?.value, value)) return null;
  }
  for (const [id, value] of Object.entries(model.initialAnswers)) {
    const represented = facts.some((fact) => !fact.systemContext && fact.id === id && sameValue(fact.value, value));
    if (!represented) return null;
  }

  const editableIds = new Set(model.builderQuestions.map((question) => question.id));
  const rows = facts.map((fact): VerificationSummaryRow => ({
    key: fact.key,
    id: fact.id,
    label: fact.label,
    value: displayAnswer(fact.value),
    source: fact.source,
    editId: (fact.source === "prefilledAnswers" || fact.source === "packetAnswers") && editableIds.has(fact.id)
      ? fact.id
      : null
  }));

  return {
    complete: true,
    context: rows.filter((row) => CONTEXT_KEYS.has(row.key)),
    screeningAnswers: rows.filter((row) => row.source === "screeningAnswers" && !CONTEXT_KEYS.has(row.key)),
    packetAnswers: rows.filter((row) => row.source !== "screeningAnswers" && !CONTEXT_KEYS.has(row.key))
  };
}

function readCanonicalFacts(value: unknown): CanonicalVerificationFact[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const facts: CanonicalVerificationFact[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
    const fact = candidate as Record<string, unknown>;
    if (typeof fact.id !== "string" || fact.id.length === 0
      || typeof fact.label !== "string" || fact.label.length === 0
      || typeof fact.source !== "string" || !SOURCES.includes(fact.source as VerificationFactSource)
      || fact.key !== `${fact.source}:${fact.id}`
      || typeof fact.systemContext !== "boolean") return null;
    const expectedContext = CONTEXT_KEYS.has(fact.key as string);
    if (fact.systemContext !== expectedContext) return null;
    facts.push(fact as CanonicalVerificationFact);
  }
  return facts;
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

function displayAnswer(value: unknown) {
  if (value === undefined || value === null || value === "") return "Missing";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    const answer = value as { unknown?: unknown; value?: unknown };
    return answer.unknown ? "I’m not sure" : String(answer.value ?? "Missing");
  }
  const labels: Record<string, string> = {
    gt_10_years: "More than 10 years ago",
    yes: "Yes",
    no: "No"
  };
  return labels[String(value)] ?? String(value);
}
