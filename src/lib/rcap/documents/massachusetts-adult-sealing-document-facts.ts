import { evaluateMassachusettsAdultSealing, massachusettsAdultSealingQuestions, MASSACHUSETTS_ADULT_SEALING_ROUTE } from "@/lib/rcap-engine/massachusetts-adult-sealing-facts";
import type { MassachusettsAdultMatter } from "@/lib/rcap/documents/massachusetts-adult-sealing-packet";

type Answers = Readonly<Record<string, unknown>>;
export type MassachusettsAdultSealingFactSnapshot = {
  jurisdiction: string; pathwayId: string | null; verifiedAt: string;
  screeningAnswers: Answers; prefilledAnswers: Answers; packetAnswers: Answers; serverFacts: Answers;
};
const DOCUMENT_FIELDS = [
  ["ma_100a_first_name", "firstName", true, "What is your first or given name, exactly as it should appear on the official request? Do not split or guess it from an account name.", "¿Cuál es su nombre de pila, exactamente como debe aparecer en la solicitud oficial? No lo deduzca ni lo separe de un nombre de cuenta."],
  ["ma_100a_middle_name", "middleName", false, "What middle name should appear, if any? Leave blank if none. Do not invent a name or initial.", "¿Qué segundo nombre debe aparecer, si lo tiene? Déjelo en blanco si no tiene. No invente un nombre ni una inicial."],
  ["ma_100a_last_name", "lastName", true, "What is your last or family name, exactly as it should appear? Include all parts of a compound family name.", "¿Cuál es su apellido, exactamente como debe aparecer? Incluya todas las partes de un apellido compuesto."],
  ["ma_100a_date_of_birth", "dateOfBirth", true, "What is your date of birth? Use YYYY-MM-DD; do not substitute an approximate date.", "¿Cuál es su fecha de nacimiento? Use AAAA-MM-DD; no sustituya una fecha aproximada."],
  ["ma_100a_street_address", "streetAddress", true, "What street or mailing-address line should appear on this request? Use an address safe to disclose to Probation, separate from account contact details.", "¿Qué calle o línea de dirección postal debe aparecer en esta solicitud? Use una dirección que pueda revelar de forma segura a la Oficina de Libertad Condicional, distinta de los datos de contacto de su cuenta."],
  ["ma_100a_city", "city", true, "What city belongs to that mailing address? Do not substitute a court location.", "¿Qué ciudad corresponde a esa dirección postal? No sustituya la ubicación de un tribunal."],
  ["ma_100a_mailing_state", "state", true, "What state or province belongs to that mailing address? Enter the actual postal abbreviation; it need not be Massachusetts.", "¿Qué estado o provincia corresponde a esa dirección postal? Ingrese la abreviatura postal real; no tiene que ser Massachusetts."],
  ["ma_100a_postal_code", "zip", true, "What ZIP or postal code belongs to that mailing address? Keep any leading zeroes.", "¿Qué código postal corresponde a esa dirección postal? Conserve los ceros iniciales."],
  ["ma_100a_alias", "alias", false, "What alias, maiden or previous name should appear, if any? Leave blank if none. Do not enter another participant's name.", "¿Qué alias, apellido de soltera o nombre anterior debe aparecer, si lo tiene? Déjelo en blanco si no tiene. No ingrese el nombre de otra persona participante."]
] as const;
export const MASSACHUSETTS_ADULT_DOCUMENT_FACT_IDS = DOCUMENT_FIELDS.map(([id]) => id);
export const MASSACHUSETTS_ADULT_REQUIRED_DOCUMENT_FACT_IDS = DOCUMENT_FIELDS.filter(([, , required]) => required).map(([id]) => id);

/** Document completion only. These fields grant no eligibility, verification, entitlement or release authority. */
export function massachusettsAdultSealingDocumentQuestions(routeKey: string) {
  if (routeKey !== MASSACHUSETTS_ADULT_SEALING_ROUTE) return [];
  return DOCUMENT_FIELDS.map(([id, , required, prompt, promptEs]) => ({
    id, type: id === "ma_100a_date_of_birth" ? "date_or_unknown" as const : "text_or_unknown" as const,
    required, prompt, promptEs
  }));
}
export class MassachusettsAdultDocumentFactsError extends Error {
  constructor(readonly code: "route_mismatch" | "unknown_document_fact" | "conflicting_fact" | "invalid_snapshot" | "case_not_qualifying" | "invalid_chronology", readonly factIds: string[]) {
    super(`Massachusetts100A document facts: ${code}${factIds.length ? ` (${factIds.join(", ")})` : ""}`);
    this.name = "MassachusettsAdultDocumentFactsError";
  }
}
function unknownText(value: string): boolean {
  const token = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "'").replace(/_/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return ["unknown", "unsure", "not sure", "i am not sure", "i'm not sure", "i do not know", "i don't know", "do not know", "don't know", "no se", "no estoy seguro", "no estoy segura", "prefer not to say", "none", "n/a", "not applicable"].includes(token);
}
function valueOf(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (Object.keys(raw).some(key => key !== "value" && key !== "unknown") || ![undefined, false, true].includes((raw as { unknown?: boolean }).unknown)) return undefined;
    return (raw as { unknown?: boolean }).unknown === true ? undefined : (raw as { value?: unknown }).value;
  }
  return raw;
}
function knownText(raw: unknown): string | null {
  const value = valueOf(raw);
  return typeof value === "string" && value.trim() && !unknownText(value)
    && !/[\x00-\x1f\x7f]|\{\{|\}\}|Morgan Sample|Acceptance Consumer|placeholder/i.test(value) ? value.trim() : null;
}
function exactDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith("0000") && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Required completion controls share the mapper's known/unknown semantics; optional blanks stay optional. */
export function massachusettsAdultSealingDocumentAnswerKnown(routeKey: string, factId: string, raw: unknown, asOf: string): boolean {
  if (routeKey !== MASSACHUSETTS_ADULT_SEALING_ROUTE || !exactDate(asOf)
    || factId !== "participant_full_legal_name" && !MASSACHUSETTS_ADULT_DOCUMENT_FACT_IDS.some(id => id === factId)) return false;
  const value = knownText(raw);
  return value !== null && (factId !== "ma_100a_date_of_birth" || exactDate(value) && value <= asOf);
}

/** Maps only explicit owner facts. The caller must independently authenticate, verify and admit the render. */
export function massachusettsAdultSealingMatterFromSnapshot(snapshot: MassachusettsAdultSealingFactSnapshot, matterId: string): MassachusettsAdultMatter {
  if (`${snapshot.jurisdiction}:${snapshot.pathwayId}` !== MASSACHUSETTS_ADULT_SEALING_ROUTE) throw new MassachusettsAdultDocumentFactsError("route_mismatch", []);
  if (typeof snapshot.verifiedAt !== "string" || typeof matterId !== "string" || [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers, snapshot.serverFacts].some(map => !map || typeof map !== "object" || Array.isArray(map))) throw new MassachusettsAdultDocumentFactsError("invalid_snapshot", []);
  const asOf = snapshot.verifiedAt.slice(0, 10), verified = new Date(snapshot.verifiedAt);
  if (!matterId?.trim() || !/^\d{4}-\d{2}-\d{2}T/.test(snapshot.verifiedAt) || !Number.isFinite(verified.getTime()) || !exactDate(asOf) || verified.toISOString().slice(0, 10) !== asOf) throw new MassachusettsAdultDocumentFactsError("invalid_snapshot", []);
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  const caseQuestions = massachusettsAdultSealingQuestions(MASSACHUSETTS_ADULT_SEALING_ROUTE, undefined, true);
  const protectedIds = [...MASSACHUSETTS_ADULT_DOCUMENT_FACT_IDS, ...caseQuestions.map(q => q.id), "participant_full_legal_name"];
  const injected = protectedIds.filter(id => Object.hasOwn(snapshot.serverFacts, id));
  if (injected.length) throw new MassachusettsAdultDocumentFactsError("conflicting_fact", injected);
  function documentText(id: string, required: boolean): string | undefined {
    const raw = maps.filter(map => Object.hasOwn(map, id)).map(map => map[id]);
    const values = raw.map(knownText);
    if (values.some(value => value === null) || !values.length) {
      if (required) throw new MassachusettsAdultDocumentFactsError("unknown_document_fact", [id]);
      return undefined;
    }
    if (new Set(values).size !== 1) throw new MassachusettsAdultDocumentFactsError("conflicting_fact", [id]);
    return values[0]!;
  }
  const participant: Record<string, string> = {};
  for (const [id, destination, required] of DOCUMENT_FIELDS) {
    const value = documentText(id, required);
    if (value !== undefined) participant[destination] = value;
  }
  // Compare two explicit declarations. Never parse the aggregate name to invent its components.
  const fullName = documentText("participant_full_legal_name", true)!;
  if (fullName.normalize("NFC").replace(/\s+/g, " ") !== [participant.firstName, participant.middleName, participant.lastName].filter(Boolean).join(" ").normalize("NFC").replace(/\s+/g, " ")) {
    throw new MassachusettsAdultDocumentFactsError("conflicting_fact", ["participant_full_legal_name", "ma_100a_first_name", "ma_100a_middle_name", "ma_100a_last_name"]);
  }
  const facts: Record<string, unknown> = {};
  for (const question of caseQuestions) {
    const raw = maps.filter(map => Object.hasOwn(map, question.id)).map(map => map[question.id]);
    if (!raw.length) continue;
    const values = raw.map(valueOf);
    const unknown = values.some(value => value === undefined || value === null || Array.isArray(value) || typeof value === "object" || typeof value === "string" && (!value.trim() || unknownText(value) && !["none", "no se aplicó", "nunca"].includes(value.trim().toLowerCase())));
    if (unknown) { facts[question.id] = { unknown: true }; continue; }
    const meaning = (value: unknown) => question.type === "yes_no_unsure" ? value === true || value === "Yes" || value === "yes" ? "yes" : value === false || value === "No" || value === "no" ? "no" : JSON.stringify(value)
      : typeof value === "string" && ["none", "no se aplicó", "nunca"].includes(value.trim().toLowerCase()) ? "none" : typeof value === "string" ? value.trim() : JSON.stringify(value);
    if (new Set(values.map(meaning)).size !== 1) throw new MassachusettsAdultDocumentFactsError("conflicting_fact", [question.id]);
    facts[question.id] = structuredClone(raw[raw.length - 1]);
  }
  const eligibility = evaluateMassachusettsAdultSealing(MASSACHUSETTS_ADULT_SEALING_ROUTE, facts, asOf);
  if (eligibility?.status !== "qualifying") throw new MassachusettsAdultDocumentFactsError("case_not_qualifying", eligibility?.missingFactIds ?? []);
  if (!exactDate(participant.dateOfBirth) || participant.dateOfBirth > asOf || ["ma_100a_latest_misdemeanor_event", "ma_100a_latest_felony_event", "ma_100a_latest_sex_offense_completion"].some(id => {
    const value = knownText(facts[id]); return value && exactDate(value) && value < participant.dateOfBirth;
  })) throw new MassachusettsAdultDocumentFactsError("invalid_chronology", ["ma_100a_date_of_birth"]);
  return { matterId, verifiedAt: snapshot.verifiedAt, participant: participant as MassachusettsAdultMatter["participant"], facts };
}
