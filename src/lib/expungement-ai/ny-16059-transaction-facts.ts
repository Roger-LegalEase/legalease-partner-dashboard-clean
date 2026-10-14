import { nyClassificationComplete } from "@/lib/expungement-ai/ny-16059-case-classification";
import { parseNyCourtCaseRecords, type NyCourtCaseRecord, type NyConvictionRecord } from "@/lib/expungement-ai/ny-16059-case-records";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
// Browser-safe equality only. Hash-bound protected provenance stays server-side.
const stable = (value: unknown): string => JSON.stringify(value, (_key, nested) => nested && typeof nested === "object" && !Array.isArray(nested)
  ? Object.fromEntries(Object.keys(nested).sort().map(key => [key, nested[key]])) : nested);
/** NY-03, adopted 2026-10-13: CPL 160.59(1)(a), CPL 40.10(2), and the
 * 08/2026 statewide packet. Cases are not transactions. This prospective
 * protected-fact contract does not change the evaluator or any existing answer.
 * It evaluates explicit associations; it never constructs them from a docket,
 * court, conviction date, victim count, or a participant's generic conclusion. */
export const NY_TRANSACTION_ASSOCIATIONS_ID = "ny_16059_transaction_associations";
export const NY_TRANSACTION_ASSOCIATIONS_VERSION = "ny_16059_transaction_associations_v1" as const;
export const NY_TRANSACTION_SOURCE = {
  decision: "NY-03", adopted: "2026-10-13", formRevision: "08/2026",
  statutes: ["https://www.nysenate.gov/legislation/laws/CPL/160.59", "https://www.nysenate.gov/legislation/laws/CPL/40.10"],
  scope: "covered_conviction_associations_only"
} as const;
type Choice = "" | "yes" | "no" | "unknown";
type Binding = {
  caseNumbers: string; courtName: string; courtCounty: string;
  charge: string; section: string; grade: string; convictionDate: string;
};
export type NyTransactionMember = {
  caseId: string; convictionId: string; record: Binding;
  conductStart: string; conductEnd: string; conductDescription: string;
  chargingRecordReference: string; dispositionRecordReference: string;
};
export type NyTransactionGroup = {
  id: string; members: NyTransactionMember[];
  timeCircumstance: "" | "one_incident" | "separate_incidents" | "unknown";
  purposeRelation: "" | "integral_parts" | "common_purpose_only" | "unrelated" | "unknown";
  relationshipDescription: string; interveningConduct: string; interveningRecordReference: string; sharedProceedingOnly: Choice;
  victims: "" | "none" | "one" | "multiple" | "unknown"; victimRelationship: string;
  recordSupport: "" | "record_describes_acts" | "recollection_only" | "unavailable" | "unknown";
  disputed: Choice;
};
export type NyTransactionAssociations = { version: typeof NY_TRANSACTION_ASSOCIATIONS_VERSION; groups: NyTransactionGroup[] };
export const nyTransactionBinding = (c: NyCourtCaseRecord, v: NyConvictionRecord): Binding => ({
  caseNumbers: c.caseNumbers, courtName: c.courtName, courtCounty: c.courtCounty,
  charge: v.charge, section: v.section, grade: v.grade, convictionDate: v.convictionDate
});
/** Call only after the owner explicitly selects this member. Copying a binding
 * records that selection; it does not infer an incident or supply conduct facts. */
export function nyTransactionMemberFor(c: NyCourtCaseRecord, v: NyConvictionRecord): NyTransactionMember {
  if (!c.convictions.some(current => current.id === v.id && stable(current) === stable(v))) throw new Error("Conviction is not in the selected case");
  return { caseId: c.id, convictionId: v.id, record: nyTransactionBinding(c, v), conductStart: "", conductEnd: "", conductDescription: "", chargingRecordReference: "", dispositionRecordReference: "" };
}
export const emptyNyTransactionGroup = (id: string): NyTransactionGroup => ({ id, members: [], timeCircumstance: "", purposeRelation: "", relationshipDescription: "", interveningConduct: "", interveningRecordReference: "", sharedProceedingOnly: "", victims: "", victimRelationship: "", recordSupport: "", disputed: "" });
export const emptyNyTransactionAssociations = (): NyTransactionAssociations => ({ version: NY_TRANSACTION_ASSOCIATIONS_VERSION, groups: [] });
export const encodeNyTransactionAssociations = (v: NyTransactionAssociations): string[] => [JSON.stringify(v)];
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v)) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k)));
const text = (v: unknown): v is string => typeof v === "string" && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v);
const line = (v: unknown): v is string => text(v) && !/[\r\n\t]/.test(v);
const id = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(v);
const oneOf = (v: unknown, values: readonly string[]) => typeof v === "string" && values.includes(v);
const known = (v: string) => Boolean(v.trim()) && !["unknown", "unsure", "not sure", "i am not sure", "no sé", "no se", "no estoy seguro", "no estoy segura", "prefer not to say"].includes(v.trim().toLowerCase());
const calendar = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !v.startsWith("0000") && Number.isFinite(Date.parse(v + "T00:00:00Z")) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
const bindingKeys = ["caseNumbers", "courtName", "courtCounty", "charge", "section", "grade", "convictionDate"];
const memberKeys = ["caseId", "convictionId", "record", "conductStart", "conductEnd", "conductDescription", "chargingRecordReference", "dispositionRecordReference"];
const groupKeys = ["id", "members", "timeCircumstance", "purposeRelation", "relationshipDescription", "interveningConduct", "interveningRecordReference", "sharedProceedingOnly", "victims", "victimRelationship", "recordSupport", "disputed"];
/** Same canonical string[] transport as the existing protected case editors.
 * Partial/unknown facts remain saveable; no unknown residual text becomes known. */
export function parseNyTransactionAssociations(raw: unknown): NyTransactionAssociations | null {
  if (!Array.isArray(raw) || raw.length !== 1 || typeof raw[0] !== "string") return null;
  let value: unknown; try { value = JSON.parse(raw[0]); } catch { return null; }
  if (!exact(value, ["version", "groups"]) || value.version !== NY_TRANSACTION_ASSOCIATIONS_VERSION || !Array.isArray(value.groups) || JSON.stringify(value) !== raw[0]) return null;
  const ids = new Set<string>();
  for (const g of value.groups) {
    if (!exact(g, groupKeys) || !id(g.id) || ids.has(g.id) || !Array.isArray(g.members)
      || !oneOf(g.timeCircumstance, ["", "one_incident", "separate_incidents", "unknown"])
      || !oneOf(g.purposeRelation, ["", "integral_parts", "common_purpose_only", "unrelated", "unknown"])
      || !oneOf(g.sharedProceedingOnly, ["", "yes", "no", "unknown"]) || !oneOf(g.disputed, ["", "yes", "no", "unknown"])
      || !oneOf(g.victims, ["", "none", "one", "multiple", "unknown"])
      || !oneOf(g.recordSupport, ["", "record_describes_acts", "recollection_only", "unavailable", "unknown"])
      || !text(g.relationshipDescription) || !text(g.interveningConduct) || !text(g.interveningRecordReference) || !text(g.victimRelationship)) return null;
    ids.add(g.id);
    for (const m of g.members) if (!exact(m, memberKeys) || !id(m.caseId) || !id(m.convictionId) || !exact(m.record, bindingKeys)
      || !Object.values(m.record).every(line) || !line(m.conductStart) || !line(m.conductEnd) || !text(m.conductDescription)
      || !text(m.chargingRecordReference) || !text(m.dispositionRecordReference)) return null;
  }
  return value as unknown as NyTransactionAssociations;
}

function conductDateGap(members: readonly NyTransactionMember[]) {
  if (members.some(m => !calendar(m.conductStart) || !calendar(m.conductEnd) || m.conductStart > m.conductEnd)) return false;
  const periods = members.map(m => [Date.parse(m.conductStart), Date.parse(m.conductEnd)]).sort((a, b) => a[0] - b[0]);
  let through = -Infinity, gap = false;
  for (const [start, end] of periods) { if (through !== -Infinity && start > through + 86400000) gap = true; through = Math.max(through, end); }
  return gap;
}

export type NyTransactionIssue = { code: string; groupId: string | null; caseId?: string; convictionId?: string };
export function nyTransactionGroupFacts(cases: readonly NyCourtCaseRecord[], associations: NyTransactionAssociations | null, today = new Date().toISOString().slice(0, 10)) {
  const issues: NyTransactionIssue[] = [];
  const add = (code: string, groupId: string | null, member?: Pick<NyTransactionMember, "caseId" | "convictionId">) => issues.push({ code, groupId, ...(member ? { caseId: member.caseId, convictionId: member.convictionId } : {}) });
  const seen = new Map<string, string[]>();
  for (const g of associations?.groups ?? []) for (const m of g.members) { const key = `${m.caseId}/${m.convictionId}`; seen.set(key, [...seen.get(key) ?? [], g.id]); }
  for (const c of cases) for (const v of c.convictions) if (!seen.has(`${c.id}/${v.id}`)) add("current_conviction_not_associated", null, { caseId: c.id, convictionId: v.id });
  const groups = (associations?.groups ?? []).map(g => {
    const start = issues.length;
    if (!g.members.length) add("group_members_missing", g.id);
    let felony = false;
    for (const m of g.members) {
      const c = cases.find(c => c.id === m.caseId), v = c?.convictions.find(v => v.id === m.convictionId);
      if (!c || !v) { add("member_not_in_current_covered_cases", g.id, m); continue; }
      if ((seen.get(`${m.caseId}/${m.convictionId}`)?.length ?? 0) !== 1) add("conviction_in_multiple_group_positions", g.id, m);
      if (stable(m.record) !== stable(nyTransactionBinding(c, v))) add("member_record_changed", g.id, m);
      if (!Object.values(nyTransactionBinding(c, v)).every(known) || !calendar(v.convictionDate)) add("member_record_incomplete", g.id, m);
      else if (v.convictionDate > today) add("member_conviction_date_in_future", g.id, m);
      if (!nyClassificationComplete(v)) add("member_classification_unresolved", g.id, m);
      else {
        if (v.classification!.excluded.value.some(x => x !== "none")) add("excluded_offense_retained_for_review", g.id, m);
        if (v.classification!.recordClass.value === "violation") add("noncriminal_disposition_requires_separate_review", g.id, m);
        felony ||= v.classification!.recordClass.value === "felony";
      }
      if (g.members.length > 1) {
        if (!calendar(m.conductStart) || !calendar(m.conductEnd)) add("conduct_dates_unresolved", g.id, m);
        else if (m.conductStart > m.conductEnd || m.conductEnd > v.convictionDate) add("conduct_dates_conflict", g.id, m);
        if (![m.conductDescription, m.chargingRecordReference, m.dispositionRecordReference].every(known)) add("member_conduct_or_record_reference_missing", g.id, m);
      }
    }
    // This is a request for missing connection facts, not a same-day legal
    // rule. Adjacent dates can describe a midnight-spanning incident. A whole
    // unaccounted calendar date needs its actual continuing-conduct record;
    // the independent integral-venture alternative does not require continuity.
    const gap = conductDateGap(g.members);
    const incidentSupported = g.timeCircumstance === "one_incident" && (!gap || [g.interveningConduct, g.interveningRecordReference].every(known));
    // One member does not need a same-transaction allegation. Inactive details
    // remain in rawAssociations; they neither manufacture nor obstruct a union.
    if (g.members.length > 1) {
      if (g.disputed !== "no") add(g.disputed === "yes" ? "contested_transaction" : "transaction_dispute_unknown", g.id);
      if (g.sharedProceedingOnly !== "no") add(g.sharedProceedingOnly === "yes" ? "shared_proceeding_is_not_transaction" : "shared_proceeding_basis_unknown", g.id);
      if (g.recordSupport !== "record_describes_acts") add("transaction_not_supported_by_record_facts", g.id);
      if (!known(g.relationshipDescription)) add("relationship_facts_missing", g.id);
      if (!["none", "one", "multiple"].includes(g.victims) || g.victims !== "none" && !known(g.victimRelationship)) add("victim_context_missing", g.id);
      if (!incidentSupported && g.purposeRelation !== "integral_parts") add(g.timeCircumstance === "one_incident" && gap ? "intervening_conduct_record_connection_missing" : "no_supported_transaction_alternative", g.id);
    }
    const ownIssues = issues.slice(start);
    return { id: g.id, members: structuredClone(g.members), caseIds: [...new Set(g.members.map(m => m.caseId))],
      status: ownIssues.length ? "needs_targeted_review" as const : "ordinary_association_supported" as const,
      basis: g.members.length === 1 ? "individual_conviction" : incidentSupported ? "time_and_circumstance" : g.purposeRelation === "integral_parts" ? "integral_criminal_venture" : null,
      felony, issues: ownIssues };
  });
  return { groups, issues };
}

/** Exact supplied record facts for the existing history rule. This is not a
 * replacement eligibility engine and grants no record/source certification. */
export function nyTransactionFactsFromAnswers(answers: Readonly<Record<string, unknown>>, today = new Date().toISOString().slice(0, 10)) {
  const cases = parseNyCourtCaseRecords(answers.ny_16059_covered_case_records);
  const associations = parseNyTransactionAssociations(answers[NY_TRANSACTION_ASSOCIATIONS_ID]);
  const result = nyTransactionGroupFacts(cases ?? [], associations, today), issues = [...result.issues];
  if (!cases?.length) issues.push({ code: "covered_cases_missing", groupId: null });
  if (!associations?.groups.length) issues.push({ code: "transaction_associations_missing_or_invalid", groupId: null });
  const count = (raw: unknown) => typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0 ? raw
    : typeof raw === "string" && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
  const convictions = cases?.flatMap(c => c.convictions) ?? [];
  if (count(answers.ny_16059_requested_total) !== convictions.length) issues.push({ code: "requested_count_and_current_members_need_reconciliation", groupId: null });
  if (convictions.every(v => nyClassificationComplete(v)) && count(answers.ny_16059_requested_felonies) !== convictions.filter(v => v.classification!.recordClass.value === "felony").length) issues.push({ code: "requested_felony_count_and_members_need_reconciliation", groupId: null });
  if (answers.ny_16059_grouping === "separate" && associations?.groups.some(g => g.members.length > 1)
    || answers.ny_16059_grouping === "single_act" && associations && associations.groups.length > 1) issues.push({ code: "earlier_grouping_and_current_associations_disagree", groupId: null });
  if (typeof answers.ny_16059_grouping !== "string" || !["separate", "single_act", "connected", "other_groups"].includes(answers.ny_16059_grouping)) issues.push({ code: "grouping_declaration_unresolved", groupId: null });
  const complete = Boolean(result.groups.length && !issues.length && result.groups.every(g => g.status === "ordinary_association_supported"));
  return { ...result, issues, complete, coveredTransactionCount: complete ? result.groups.length : null,
    coveredFelonyTransactionCount: complete ? result.groups.filter(g => g.felony).length : null };
}

/** Source-bound descriptors for the current repeatable editor. Factual choices
 * are canonical in both languages. No legal-eligibility or approval checkbox. */
export const NY_TRANSACTION_QUESTIONS = {
  members: { en: "Which exact convictions belong to this group? Keep every conviction with its own court case.", es: "¿Qué condenas exactas pertenecen a este grupo? Conserve cada condena con su propio caso judicial." },
  conductStart: { en: "When did the conduct for this conviction begin? Use the charging record; do not substitute the conviction or sentencing date.", es: "¿Cuándo comenzó la conducta correspondiente a esta condena? Use el documento de acusación; no sustituya la fecha de condena o sentencia." },
  conductEnd: { en: "When did that conduct end? For conduct on one day, use that same date.", es: "¿Cuándo terminó esa conducta? Si ocurrió en un solo día, use la misma fecha." },
  conductDescription: { en: "Describe the acts for this conviction and identify where the record describes them.", es: "Describa los actos correspondientes a esta condena e indique dónde los describe el expediente." },
  chargingRecordReference: { en: "Identify the charging document and page or part describing these acts. If unavailable, say so; do not guess.", es: "Identifique el documento de acusación y la página o sección que describe estos actos. Si no está disponible, indíquelo; no adivine." },
  dispositionRecordReference: { en: "Identify the judgment or disposition record connecting these acts to this conviction.", es: "Identifique la sentencia o el registro de resolución que vincula estos actos con esta condena." },
  timeCircumstance: { en: "Did these acts occur together as one incident, or in separate incidents? Describe their timing and circumstances below.", es: "¿Ocurrieron estos actos juntos como un solo incidente o en incidentes separados? Describa a continuación el momento y las circunstancias." },
  purposeRelation: { en: "Were the acts integral parts of one criminal venture, merely similar in purpose, or unrelated? Explain how the acts were connected below.", es: "¿Fueron los actos partes integrantes de una sola empresa delictiva, simplemente similares en propósito o sin relación? Explique a continuación cómo se conectaron los actos." },
  relationshipDescription: { en: "Describe the connection between the acts and how the identified records support it. A shared docket, court, judge or sentencing date alone is not enough.", es: "Describa la conexión entre los actos y cómo la respaldan los registros identificados. Compartir expediente, tribunal, juez o fecha de sentencia no basta por sí solo." },
  interveningConduct: { en: "The recorded acts leave an intervening date gap. If this was one continuing incident, describe what occurred during that gap; otherwise leave this unresolved.", es: "Los actos registrados dejan un intervalo de fechas. Si fue un solo incidente continuo, describa qué ocurrió durante ese intervalo; de lo contrario, déjelo sin resolver." },
  interveningRecordReference: { en: "Identify the record and part describing that continuing conduct between the listed acts.", es: "Identifique el registro y la sección que describe esa conducta continua entre los actos enumerados." },
  sharedProceedingOnly: { en: "Is the only connection a shared case number, court, judge or sentencing date?", es: "¿La única conexión es compartir número de caso, tribunal, juez o fecha de sentencia?" },
  victims: { en: "Did these acts involve no victim, one victim or multiple victims? Multiple victims alone neither establishes nor rules out a transaction.", es: "¿Estos actos involucraron a ninguna víctima, una víctima o varias víctimas? La existencia de varias víctimas por sí sola no establece ni descarta una transacción." },
  victimRelationship: { en: "Describe how the acts involving the victim or victims were related, without adding unnecessary identifying information.", es: "Describa cómo se relacionaron los actos que involucraron a la víctima o las víctimas, sin añadir datos de identificación innecesarios." },
  recordSupport: { en: "Do the identified records describe the acts and their connection, or is this based only on recollection? This does not certify or approve a record.", es: "¿Los registros identificados describen los actos y su conexión, o se basa esto solo en recuerdos? Esto no certifica ni aprueba un registro." },
  disputed: { en: "Do the records or any party dispute that the acts belonged to the same incident or criminal venture?", es: "¿Los registros o alguna parte cuestionan que los actos pertenecieran al mismo incidente o empresa delictiva?" }
} as const;

export const NY_TRANSACTION_OPTIONS = {
  timeCircumstance: { "": ["Choose an answer", "Seleccione una respuesta"], one_incident: ["The acts occurred together as one incident", "Los actos ocurrieron juntos como un solo incidente"], separate_incidents: ["The acts occurred in separate incidents", "Los actos ocurrieron en incidentes separados"], unknown: ["I am not sure", "No estoy seguro"] },
  purposeRelation: { "": ["Choose an answer", "Seleccione una respuesta"], integral_parts: ["The acts were connected parts of one criminal venture", "Los actos fueron partes conectadas de una sola empresa delictiva"], common_purpose_only: ["Only a similar general purpose is known", "Solo se conoce un propósito general similar"], unrelated: ["The acts were unrelated in purpose", "Los actos no estaban relacionados en su propósito"], unknown: ["I am not sure", "No estoy seguro"] },
  yesNoUnknown: { "": ["Choose an answer", "Seleccione una respuesta"], yes: ["Yes", "Sí"], no: ["No", "No"], unknown: ["I am not sure", "No estoy seguro"] },
  victims: { "": ["Choose an answer", "Seleccione una respuesta"], none: ["No victim", "Ninguna víctima"], one: ["One victim", "Una víctima"], multiple: ["Multiple victims", "Varias víctimas"], unknown: ["I am not sure", "No estoy seguro"] },
  recordSupport: { "": ["Choose an answer", "Seleccione una respuesta"], record_describes_acts: ["The identified records describe the acts and their connection", "Los registros identificados describen los actos y su conexión"], recollection_only: ["This is based only on recollection", "Esto se basa solo en recuerdos"], unavailable: ["The records are unavailable", "Los registros no están disponibles"], unknown: ["I am not sure", "No estoy seguro"] }
} satisfies Record<string, Record<string, [string, string]>>;

/** Conditional display only; parsing/storage never removes inactive answers. */
export function nyTransactionQuestionApplies(group: NyTransactionGroup, field: keyof typeof NY_TRANSACTION_QUESTIONS) {
  if (field === "members") return true;
  if (group.members.length < 2) return false;
  if (field === "interveningConduct" || field === "interveningRecordReference") return group.timeCircumstance === "one_incident" && group.purposeRelation !== "integral_parts" && conductDateGap(group.members);
  return true;
}

export function nyTransactionAssociationsQuestion(caseRecords?: unknown): ProfileQuestion {
  return { id: NY_TRANSACTION_ASSOCIATIONS_ID, type: "transaction_associations", answerContract: NY_TRANSACTION_ASSOCIATIONS_VERSION,
    stage: "packet_information", required: true, contextOnly: false, lifecyclePhase: "postpay_official_form_field", options: null,
    prompt: "Connect each requested conviction to its actual incident or criminal venture",
    helperText: "Keep each conviction linked to its own court case. Select the actual members of each group, then describe the acts and the supporting records. Separate incidents stay separate. Unknown or disputed connections stay unresolved; no record is deleted or certified by this step.",
    translations: { es: { prompt: "Vincule cada condena solicitada con su incidente o actividad delictiva real", helperText: "Mantenga cada condena vinculada a su propio caso judicial. Seleccione los miembros reales de cada grupo y describa los actos y los registros que los respaldan. Los incidentes separados permanecen separados. Las conexiones desconocidas o controvertidas quedan sin resolver; este paso no elimina ni certifica ningún registro." } },
    transactionCaseRecords: parseNyCourtCaseRecords(caseRecords) ? structuredClone(caseRecords as string[]) : [] };
}

export function nyTransactionAnswerState(raw: unknown): "unanswered" | "invalid" | "known_valid" {
  if (raw === undefined || raw === null || raw === "" || Array.isArray(raw) && raw.length === 0) return "unanswered";
  const parsed = parseNyTransactionAssociations(raw);
  // Saveable structural facts are distinct from a supported legal association.
  return !parsed ? "invalid" : parsed.groups.length ? "known_valid" : "unanswered";
}
export function formatNyTransactionAssociations(raw: unknown, locale: "en" | "es") {
  const parsed = parseNyTransactionAssociations(raw), es = locale === "es";
  if (!parsed) return es ? "Asociaciones sin resolver; revise los registros guardados." : "Associations unresolved; review the saved records.";
  if (!parsed.groups.length) return es ? "No se ha registrado ningún grupo." : "No groups recorded.";
  return parsed.groups.map((group, index) => [
    `${es ? "Grupo" : "Group"} ${index + 1}`,
    ...group.members.map(member => `${member.record.caseNumbers} — ${member.record.courtName}: ${member.record.charge} (${member.record.section}); ${es ? "condena" : "conviction"} ${member.record.convictionDate}`),
    ...(group.members.length > 1 ? [NY_TRANSACTION_OPTIONS.timeCircumstance[group.timeCircumstance][es ? 1 : 0], NY_TRANSACTION_OPTIONS.purposeRelation[group.purposeRelation][es ? 1 : 0], group.relationshipDescription] : [])
  ].filter(Boolean).join("\n")).join("\n\n");
}
