import { AK_IDENTITY_ROUTE, AK_IDENTITY_QUESTIONS, evaluateAlaskaIdentity } from "@/lib/rcap-engine/alaska-identity-research";

type Answers = Readonly<Record<string, unknown>>;
export type AlaskaIdentityFactSnapshot = {
  jurisdiction: string; pathwayId: string | null; verifiedAt: string;
  screeningAnswers: Answers; prefilledAnswers: Answers; packetAnswers: Answers; serverFacts: Answers;
};
const FIELDS = [
  ["ak_seal_first_name", null, true, "What is your first or given name for the DPS request? Do not guess it from an account name.", "¿Cuál es su nombre de pila para la solicitud a DPS? No lo deduzca de un nombre de cuenta."],
  ["ak_seal_middle_name", null, false, "What middle name should appear, if any? Leave blank if none.", "¿Qué segundo nombre debe aparecer, si lo tiene? Déjelo en blanco si no tiene."],
  ["ak_seal_last_name", null, true, "What is your last or family name? Include every part of a compound name.", "¿Cuál es su apellido? Incluya todas las partes de un apellido compuesto."],
  ["ak_seal_suffix", null, false, "What name suffix should appear, if any? Do not invent one.", "¿Qué sufijo de nombre debe aparecer, si lo tiene? No invente uno."],
  ["ak_seal_mailing_address", "participant.street_address", false, "What complete mailing address is safe to disclose to DPS? Include city, state and postal code; do not substitute account contact details.", "¿Qué dirección postal completa puede revelar de forma segura a DPS? Incluya ciudad, estado y código postal; no sustituya los datos de contacto de su cuenta."],
  ["ak_seal_phone", "participant.phone", false, "What telephone number should DPS use, if available? Leave unknown details for later completion.", "¿Qué número de teléfono debe usar DPS, si está disponible? Deje los datos desconocidos para completarlos después."],
  ["ak_seal_date_of_birth", "participant.date_of_birth", false, "What is your actual date of birth (YYYY-MM-DD), if known? Do not approximate it.", "¿Cuál es su fecha de nacimiento real (AAAA-MM-DD), si la conoce? No use una fecha aproximada."],
  ["ak_seal_arrest_date", "matter.arrest_date", false, "What was the actual arrest date, if you were arrested? Do not enter a citation date as an arrest date. Leave blank if unknown or not applicable.", "¿Cuál fue la fecha real del arresto, si fue arrestado? No ingrese la fecha de una citación como fecha de arresto. Déjela en blanco si no la conoce o no corresponde."],
  ["ak_seal_offense_date", "matter.offense_date", false, "What offense date appears in the actual record? Leave unknown details for later completion; do not infer it from the arrest date.", "¿Qué fecha del hecho aparece en el expediente real? Deje los datos desconocidos para completarlos después; no la deduzca de la fecha de arresto."]
] as const;
export const ALASKA_IDENTITY_DOCUMENT_FACT_IDS = FIELDS.map(([id]) => id);
export const ALASKA_IDENTITY_REQUIRED_DOCUMENT_FACT_IDS = FIELDS.filter(([, , required]) => required).map(([id]) => id);
export const ALASKA_IDENTITY_DOCUMENT_CONTEXT_FACT_IDS = ["participant_full_legal_name", "case_identifier", "charge"] as const;
export function alaskaIdentityDocumentQuestions(routeKey: string) {
  return routeKey !== AK_IDENTITY_ROUTE ? [] : [...FIELDS.map(([id, , required, prompt, promptEs]) => ({
    id, type: id.endsWith("_date") || id.endsWith("_birth") ? "date_or_unknown" as const : "text_or_unknown" as const,
    required, prompt, promptEs
  })), { id: "case_identifier", type: "text_or_unknown" as const, required: false,
    prompt: "What trial court case number belongs to this record, if known? Leave blank or unknown for manual completion. Do not enter a police, prosecutor or arrest tracking number in this court-case field.",
    promptEs: "¿Cuál es el número del caso del tribunal de primera instancia que corresponde a este expediente, si lo conoce? Déjelo en blanco o desconocido para completarlo después. No ingrese un número policial, de fiscalía o de seguimiento del arresto en este campo del caso judicial." }];
}
export class AlaskaIdentityDocumentFactsError extends Error {
  constructor(readonly code: "route_mismatch" | "invalid_snapshot" | "unknown_document_fact" | "conflicting_fact" | "case_not_qualifying" | "invalid_chronology", readonly factIds: string[]) {
    super(`Alaska DPS document facts: ${code}${factIds.length ? ` (${factIds.join(", ")})` : ""}`);
    this.name = "AlaskaIdentityDocumentFactsError";
  }
}
function valueOf(raw: unknown): unknown {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (Object.keys(raw).some(key => key !== "value" && key !== "unknown") || ![undefined, false, true].includes((raw as {unknown?: boolean}).unknown)) return undefined;
    return (raw as {unknown?: boolean}).unknown === true ? undefined : (raw as {value?: unknown}).value;
  }
  return raw;
}
function knownText(raw: unknown, narrative = false): string | null {
  const v = valueOf(raw);
  if (typeof v !== "string" || !v.trim() || (narrative ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]|\{\{|\}\}|Morgan Sample|Acceptance Consumer|placeholder/i : /[\x00-\x1f\x7f]|\{\{|\}\}|Morgan Sample|Acceptance Consumer|placeholder/i).test(v)) return null;
  const token = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "'").replace(/_/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return ["unknown", "unsure", "not sure", "i am not sure", "i'm not sure", "i do not know", "i don't know", "no se", "no estoy seguro", "no estoy segura", "none", "n/a", "not applicable"].includes(token) ? null : v.trim();
}
function booleanMeaning(value: unknown): "yes" | "no" | undefined {
  if (typeof value !== "boolean" && typeof value !== "string") return undefined;
  const token = typeof value === "string" ? value.trim().toLowerCase() : String(value);
  return ["true", "yes", "sí", "si"].includes(token) ? "yes" : ["false", "no"].includes(token) ? "no" : undefined;
}
function date(value: string): boolean {
  const at = new Date(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith("0000") && Number.isFinite(at.getTime()) && at.toISOString().slice(0, 10) === value;
}
export function alaskaIdentityDocumentAnswerKnown(routeKey: string, factId: string, raw: unknown, asOf: string): boolean {
  if (routeKey !== AK_IDENTITY_ROUTE || !date(asOf) || ![...ALASKA_IDENTITY_DOCUMENT_FACT_IDS, ...ALASKA_IDENTITY_DOCUMENT_CONTEXT_FACT_IDS].some(id => id === factId)) return false;
  const value = knownText(raw);
  return value !== null && (!factId.endsWith("_date") && !factId.endsWith("_birth") || date(value) && value <= asOf);
}
export type AlaskaIdentityDocumentInput = {
  matterId: string; verifiedAt: string; routeId: typeof AK_IDENTITY_ROUTE; asOf: string;
  facts: Record<string, string>; materialScreeningFacts: Record<string, unknown>;
  unfilledParticipantFactIds: string[];
};
/** Copies only declared participant facts. Authentication, admission and delivery remain the caller's responsibilities. */
export function alaskaIdentityDocumentFromSnapshot(snapshot: AlaskaIdentityFactSnapshot, matterId: string): AlaskaIdentityDocumentInput {
  if (`${snapshot.jurisdiction}:${snapshot.pathwayId}` !== AK_IDENTITY_ROUTE) throw new AlaskaIdentityDocumentFactsError("route_mismatch", []);
  if (typeof snapshot.verifiedAt !== "string" || typeof matterId !== "string" || !matterId.trim()
    || !/^\d{4}-\d{2}-\d{2}T/.test(snapshot.verifiedAt) || !Number.isFinite(new Date(snapshot.verifiedAt).getTime())
    || !date(snapshot.verifiedAt.slice(0, 10)) || new Date(snapshot.verifiedAt).toISOString().slice(0, 10) !== snapshot.verifiedAt.slice(0, 10)
    || [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers, snapshot.serverFacts].some(m => !m || typeof m !== "object" || Array.isArray(m))) throw new AlaskaIdentityDocumentFactsError("invalid_snapshot", []);
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  const protectedIds = [...ALASKA_IDENTITY_DOCUMENT_FACT_IDS, ...ALASKA_IDENTITY_DOCUMENT_CONTEXT_FACT_IDS, ...AK_IDENTITY_QUESTIONS.map(q => q.id)];
  const injected = protectedIds.filter(id => Object.hasOwn(snapshot.serverFacts, id));
  if (injected.length) throw new AlaskaIdentityDocumentFactsError("conflicting_fact", injected);
  const read = (id: string, required = false): string | undefined => {
    const values = maps.filter(m => Object.hasOwn(m, id)).map(m => knownText(m[id]));
    if (!values.length || values.some(v => v === null)) {
      if (required) throw new AlaskaIdentityDocumentFactsError("unknown_document_fact", [id]);
      return undefined;
    }
    if (new Set(values).size !== 1) throw new AlaskaIdentityDocumentFactsError("conflicting_fact", [id]);
    return values[0]!;
  };
  const docs = Object.fromEntries(FIELDS.map(([id, , required]) => [id, read(id, required)]));
  const fullName = [docs.ak_seal_first_name, docs.ak_seal_middle_name, docs.ak_seal_last_name, docs.ak_seal_suffix].filter(Boolean).join(" ");
  if (read("participant_full_legal_name", true)!.normalize("NFC").replace(/\s+/g, " ") !== fullName.normalize("NFC").replace(/\s+/g, " ")) throw new AlaskaIdentityDocumentFactsError("conflicting_fact", ["participant_full_legal_name", "ak_seal_first_name", "ak_seal_middle_name", "ak_seal_last_name", "ak_seal_suffix"]);
  const materialScreeningFacts: Record<string, unknown> = {};
  for (const q of AK_IDENTITY_QUESTIONS) {
    const raw = maps.filter(m => Object.hasOwn(m, q.id)).map(m => valueOf(m[q.id]));
    if (!raw.length || raw.some(v => v === undefined || v === null || Array.isArray(v) || typeof v === "object" || !(q.type === "yes_no_unknown" && typeof v === "boolean") && !knownText(v, q.id === "ak_seal_explanation"))) { materialScreeningFacts[q.id] = {unknown: true}; continue; }
    const meaning = (v: unknown) => q.type === "yes_no_unknown" ? booleanMeaning(v) ?? JSON.stringify(v) : typeof v === "string" ? v.trim() : JSON.stringify(v);
    if (new Set(raw.map(meaning)).size !== 1) throw new AlaskaIdentityDocumentFactsError("conflicting_fact", [q.id]);
    materialScreeningFacts[q.id] = raw[raw.length - 1];
  }
  const asOf = snapshot.verifiedAt.slice(0, 10), decision = evaluateAlaskaIdentity(materialScreeningFacts, asOf);
  if (decision.status !== "qualifying") throw new AlaskaIdentityDocumentFactsError("case_not_qualifying", decision.missingFactIds);
  const facts: Record<string, string> = {"participant.full_legal_name": `${docs.ak_seal_last_name}, ${[docs.ak_seal_first_name, docs.ak_seal_middle_name, docs.ak_seal_suffix].filter(Boolean).join(" ")}`};
  for (const [id, destination] of FIELDS) if (destination && docs[id] !== undefined) facts[destination] = docs[id];
  for (const [id, destination] of [["case_identifier", "matter.case_number"], ["charge", "matter.charge"]]) { const v = read(id); if (v !== undefined) facts[destination] = v; }
  const birth = facts["participant.date_of_birth"], offense = facts["matter.offense_date"], arrest = facts["matter.arrest_date"];
  for (const [id, value] of [["ak_seal_date_of_birth", birth], ["ak_seal_offense_date", offense], ["ak_seal_arrest_date", arrest]]) if (value && (!date(value) || value > asOf)) throw new AlaskaIdentityDocumentFactsError("invalid_chronology", [id]);
  if (birth && [offense, arrest].some(v => v && v < birth) || offense && arrest && offense > arrest) throw new AlaskaIdentityDocumentFactsError("invalid_chronology", ["ak_seal_date_of_birth", "ak_seal_offense_date", "ak_seal_arrest_date"]);
  if (arrest && booleanMeaning(materialScreeningFacts.ak_seal_arrest_or_citation) === "no") throw new AlaskaIdentityDocumentFactsError("conflicting_fact", ["ak_seal_arrest_date", "ak_seal_arrest_or_citation"]);
  return {matterId, verifiedAt: snapshot.verifiedAt, routeId: AK_IDENTITY_ROUTE, asOf, facts, materialScreeningFacts,
    unfilledParticipantFactIds: ["participant.street_address", "participant.phone", "participant.date_of_birth", "matter.case_number", "matter.arrest_date", "matter.offense_date", "matter.charge"].filter(id => !Object.hasOwn(facts, id))};
}
