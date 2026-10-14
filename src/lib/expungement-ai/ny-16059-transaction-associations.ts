import "server-only";
import { isNy16059Packet } from "@/lib/expungement-ai/ny-16059-packet-facts";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { ny16059ProtectedDocumentPreparation } from "@/lib/expungement-ai/ny-16059-document-preparation";
import { nyClassificationComplete } from "@/lib/expungement-ai/ny-16059-case-classification";
import { parseNyCourtCaseRecords, type NyCourtCaseRecord, type NyConvictionRecord } from "@/lib/expungement-ai/ny-16059-case-records";
import type { ProtectedPacketDraftSnapshot, ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";

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
const binding = (c: NyCourtCaseRecord, v: NyConvictionRecord): Binding => ({
  caseNumbers: c.caseNumbers, courtName: c.courtName, courtCounty: c.courtCounty,
  charge: v.charge, section: v.section, grade: v.grade, convictionDate: v.convictionDate
});
/** Call only after the owner explicitly selects this member. Copying a binding
 * records that selection; it does not infer an incident or supply conduct facts. */
export function nyTransactionMemberFor(c: NyCourtCaseRecord, v: NyConvictionRecord): NyTransactionMember {
  if (!c.convictions.some(current => current.id === v.id && hash(current) === hash(v))) throw new Error("Conviction is not in the selected case");
  return { caseId: c.id, convictionId: v.id, record: binding(c, v), conductStart: "", conductEnd: "", conductDescription: "", chargingRecordReference: "", dispositionRecordReference: "" };
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

type Issue = { code: string; groupId: string | null; caseId?: string; convictionId?: string };
/** No source, payment or delivery authority is conferred. Every current covered
 * conviction must remain visible, including excluded convictions; a partial
 * supported group cannot silently clear the whole criminal history. */
export function ny16059TransactionAssociationPreparation(record: ProtectedPacketVerificationRecord) {
  const prepared = ny16059ProtectedDocumentPreparation(record);
  if (!prepared) return null;
  const snapshot = record.status === "verified" ? record.snapshot : record.draftSnapshot;
  if (!snapshot) return null;
  const maps = [snapshot.packetAnswers, snapshot.prefilledAnswers, snapshot.screeningAnswers];
  const values = maps.filter(m => Object.hasOwn(m, NY_TRANSACTION_ASSOCIATIONS_ID)).map(m => m[NY_TRANSACTION_ASSOCIATIONS_ID]);
  let associations = parseNyTransactionAssociations(values[0]);
  const cases = structuredClone(prepared.casePreparation.records ?? []);
  const issues: Issue[] = [];
  const add = (code: string, groupId: string | null, member?: Pick<NyTransactionMember, "caseId" | "convictionId">) => issues.push({ code, groupId, ...(member ? { caseId: member.caseId, convictionId: member.convictionId } : {}) });
  if (values.length && !associations) add("transaction_associations_invalid", null);
  const sourceConflict = values.some(v => hash(v ?? null) !== hash(values[0] ?? null));
  if (sourceConflict) add("transaction_associations_conflicting_protected_copies", null);
  // Case identity disagreement cannot be repaired by choosing another map's
  // proposed grouping. Keep every original source map intact for correction.
  const caseCopies = maps.filter(m => Object.hasOwn(m, "ny_16059_covered_case_records")).map(m => m.ny_16059_covered_case_records);
  const caseConflict = caseCopies.some(v => hash(v ?? null) !== hash(caseCopies[0] ?? null));
  if (caseConflict) add("covered_cases_conflicting_protected_copies", null);
  if (!cases.length) add("covered_cases_missing", null);
  const scalar = (raw: unknown): unknown => exact(raw, ["value", "unknown"]) && raw.unknown === false ? raw.value : raw;
  const declaration = (sourceMaps: typeof maps, key: string) => {
    const entries = sourceMaps.flatMap((m, index) => Object.hasOwn(m, key) ? [{ source: (["packetAnswers", "prefilledAnswers", "screeningAnswers"] as const)[index], raw: m[key], value: scalar(m[key]) }] : []);
    return { entries, value: entries.length && entries.every(e => hash(e.value ?? null) === hash(entries[0].value ?? null)) ? entries[0].value : null };
  };
  const grouping = declaration(maps, "ny_16059_grouping");
  if (grouping.entries.length > 1 && grouping.value === null) add("grouping_declaration_conflicting_protected_copies", null);
  const count = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : typeof v === "string" && /^\d+$/.test(v) && Number.isSafeInteger(Number(v)) ? Number(v) : null;
  const declaredCount = (sourceMaps: typeof maps, key: string) => {
    const values = declaration(sourceMaps, key).entries.map(e => count(e.value));
    return values.length && values[0] !== null && values.every(v => v === values[0]) ? values[0] : null;
  };
  const currentConvictions = cases.flatMap(c => c.convictions);
  if (declaredCount(maps, "ny_16059_requested_total") !== currentConvictions.length) add("requested_count_and_current_members_need_reconciliation", null);
  if (currentConvictions.every(v => nyClassificationComplete(v)) && declaredCount(maps, "ny_16059_requested_felonies") !== currentConvictions.filter(v => v.classification!.recordClass.value === "felony").length) add("requested_felony_count_and_members_need_reconciliation", null);
  const universe = (items: readonly NyCourtCaseRecord[]) => items.flatMap(c => c.convictions.map(v => ({ caseId: c.id, convictionId: v.id, record: binding(c, v) }))).sort((a, b) => `${a.caseId}/${a.convictionId}`.localeCompare(`${b.caseId}/${b.convictionId}`));
  const carried = snapshot.dependencies.ny16059SeparateDeclaration;
  if (carried !== undefined) {
    // A server-preserved declaration is not a new answer to a later changed
    // grouping question. Keep its raw associations for correction, but never
    // silently reuse them against changed members, counts or source context.
    if (!carried || carried.version !== 1 || carried.basis !== "explicit_separate_incidents_with_unchanged_covered_universe"
      || carried.routeKey !== `${snapshot.jurisdiction}:${snapshot.pathwayId}` || carried.profileVersion !== snapshot.profileVersion
      || carried.profileSourceFingerprint !== snapshot.profileSourceFingerprint || carried.profileAuthorityFingerprint !== snapshot.profileAuthorityFingerprint
      || typeof carried.priorSnapshotHash !== "string" || !/^[0-9a-f]{64}$/.test(carried.priorSnapshotHash)
      || carried.coveredUniverseHash !== hash(universe(cases)) || carried.answerSha256 !== hash(values[0] ?? null)
      || !Array.isArray(carried.rawAnswerCopies) || !carried.rawAnswerCopies.length
      || carried.rawAnswerCopies.some(copy => !exact(copy, ["source", "raw"]) || !["packetAnswers", "prefilledAnswers", "screeningAnswers"].includes(copy.source) || scalar(copy.raw) !== "separate")) {
      add("preserved_separate_declaration_provenance_needs_reconciliation", null);
    }
    if (grouping.value !== "separate") add("preserved_separate_declaration_grouping_changed", null);
  }
  let reusedSeparateDeclaration: null | { snapshotHash: string; currentUniverseHash: string; rawAnswerCopies: Array<{ source: "packetAnswers" | "prefilledAnswers" | "screeningAnswers"; raw: unknown }>; basis: "explicit_separate_incidents_with_unchanged_covered_universe" } = null;
  if (!values.length && grouping.value === "separate" && !caseConflict) {
    // Reuse an actual earlier protected declaration, not a new assumption based
    // on docket or date. Material member/court/offense changes require renewed
    // association facts even when the number of convictions stays the same.
    const prior = record.snapshot;
    const priorMaps = prior ? [prior.packetAnswers, prior.prefilledAnswers, prior.screeningAnswers] : [];
    const priorCaseCopies = priorMaps.filter(m => Object.hasOwn(m, "ny_16059_covered_case_records")).map(m => m.ny_16059_covered_case_records);
    const priorCases = parseNyCourtCaseRecords(priorCaseCopies[0]);
    const currentUniverse = universe(cases), priorUniverse = priorCases ? universe(priorCases) : null;
    const currentRequested = declaredCount(maps, "ny_16059_requested_total");
    const priorRequested = declaredCount(priorMaps, "ny_16059_requested_total");
    const priorCurrent = prior && record.hash === hash(prior)
      && ["jurisdiction", "pathwayId", "profileVersion", "profileSourceFingerprint", "profileAuthorityFingerprint"].every(key => prior[key as keyof typeof prior] === snapshot[key as keyof typeof snapshot]);
    if (priorCurrent && declaration(priorMaps, "ny_16059_grouping").value === "separate" && priorCases
      && priorCaseCopies.every(v => hash(v ?? null) === hash(priorCaseCopies[0] ?? null))
      && currentUniverse.length && currentRequested === currentUniverse.length && priorRequested === currentRequested
      && hash(priorUniverse) === hash(currentUniverse)) {
      associations = { version: NY_TRANSACTION_ASSOCIATIONS_VERSION, groups: cases.flatMap(c => c.convictions.map(v => ({
        ...emptyNyTransactionGroup(`separate-${hash({ caseId: c.id, convictionId: v.id }).slice(0, 20)}`), members: [nyTransactionMemberFor(c, v)]
      }))) };
      reusedSeparateDeclaration = { snapshotHash: record.hash!, currentUniverseHash: hash(currentUniverse), rawAnswerCopies: grouping.entries.map(e => ({ source: e.source, raw: structuredClone(e.raw) })), basis: "explicit_separate_incidents_with_unchanged_covered_universe" };
    } else add("separate_declaration_requires_current_member_reconciliation", null);
  }
  if (!values.length && !associations) add("transaction_associations_missing", null);
  if (values.length && associations && (grouping.value === "separate" && associations.groups.some(g => g.members.length > 1)
    || grouping.value === "single_act" && associations.groups.length > 1)) add("earlier_grouping_and_current_associations_disagree", null);
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
      if (hash(m.record) !== hash(binding(c, v))) add("member_record_changed", g.id, m);
      if (!Object.values(binding(c, v)).every(known) || !calendar(v.convictionDate)) add("member_record_incomplete", g.id, m);
      else if (v.convictionDate > new Date().toISOString().slice(0, 10)) add("member_conviction_date_in_future", g.id, m);
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
      status: ownIssues.length || sourceConflict || caseConflict ? "needs_targeted_review" as const : "ordinary_association_supported" as const,
      basis: g.members.length === 1 ? "individual_conviction" : incidentSupported ? "time_and_circumstance" : g.purposeRelation === "integral_parts" ? "integral_criminal_venture" : null,
      felony, issues: ownIssues };
  });
  const complete = Boolean(groups.length && !issues.length && groups.every(g => g.status === "ordinary_association_supported"));
  return { schemaVersion: NY_TRANSACTION_ASSOCIATIONS_VERSION, source: structuredClone(NY_TRANSACTION_SOURCE), recordHash: prepared.recordHash, revision: prepared.revision,
    status: complete ? "covered_associations_supported" as const : "needs_targeted_review" as const,
    groups, issues, coveredCases: cases, rawAssociations: structuredClone(values), reusedSeparateDeclaration,
    separateDeclarationProjection: reusedSeparateDeclaration && associations ? { factId: NY_TRANSACTION_ASSOCIATIONS_ID, answer: encodeNyTransactionAssociations(associations), provenance: structuredClone(reusedSeparateDeclaration), persisted: false as const } : null,
    coveredTransactionCount: complete ? groups.length : null, coveredFelonyTransactionCount: complete ? groups.filter(g => g.felony).length : null,
    fullHistoryReviewed: false as const, eligibilityEstablished: false as const, supportingRecordsCertified: false as const,
    generationAllowed: false as const, admissionGranted: false as const, deliveryAllowed: false as const, qualifiedSpanishReview: "pending" as const };
}

/** Preserve an already protected separate-incidents declaration on an ordinary
 * material save. No read/no-op writes, new grouping, or eligibility inference.
 * The existing protected consumer validates the old record; exact current case
 * bindings and all declaration/count copies must still agree in the new draft.
 */
export function preserveNySeparateDeclaration(record: ProtectedPacketVerificationRecord, next: ProtectedPacketDraftSnapshot): ProtectedPacketDraftSnapshot {
  if (!isNy16059Packet(next.jurisdiction, next.pathwayId)) return next;
  const prior = record.status === "verified" ? record.snapshot : record.draftSnapshot;
  if (!prior || !["jurisdiction", "pathwayId", "profileVersion", "profileSourceFingerprint", "profileAuthorityFingerprint"].every(key => prior[key as keyof typeof prior] === next[key as keyof typeof next])) return next;
  const maps = [next.packetAnswers, next.prefilledAnswers, next.screeningAnswers];
  if (maps.some(m => Object.hasOwn(m, NY_TRANSACTION_ASSOCIATIONS_ID))) return next;
  const prepared = ny16059TransactionAssociationPreparation(record), projection = prepared?.separateDeclarationProjection;
  if (!projection) return next;
  const candidate = { ...next, packetAnswers: { ...next.packetAnswers, [NY_TRANSACTION_ASSOCIATIONS_ID]: projection.answer } };
  // Reuse the same current consumer's conflict/membership validation. This is a
  // read-only model projection, not a recursive save or a review approval.
  const checked = ny16059TransactionAssociationPreparation({ status: "invalidated", reason: "separate_declaration_preservation_probe", revision: record.revision, draftSnapshot: candidate, draftHash: hash(candidate) });
  if (!checked || checked.issues.some(issue => ["covered_cases_conflicting_protected_copies", "grouping_declaration_conflicting_protected_copies", "requested_count_and_current_members_need_reconciliation", "requested_felony_count_and_members_need_reconciliation", "earlier_grouping_and_current_associations_disagree", "member_record_changed", "member_not_in_current_covered_cases", "current_conviction_not_associated"].includes(issue.code))) return next;
  const groupingCopies = maps.filter(m => Object.hasOwn(m, "ny_16059_grouping")).map(m => m.ny_16059_grouping);
  if (!groupingCopies.length || groupingCopies.some(raw => (exact(raw, ["value", "unknown"]) && raw.unknown === false ? raw.value : raw) !== "separate")) return next;
  return { ...candidate, dependencies: { ...candidate.dependencies, ny16059SeparateDeclaration: {
    version: 1, routeKey: `${next.jurisdiction}:${next.pathwayId}`, profileVersion: next.profileVersion,
    profileSourceFingerprint: next.profileSourceFingerprint, profileAuthorityFingerprint: next.profileAuthorityFingerprint,
    priorSnapshotHash: projection.provenance.snapshotHash, coveredUniverseHash: projection.provenance.currentUniverseHash,
    rawAnswerCopies: structuredClone(projection.provenance.rawAnswerCopies), answerSha256: hash(projection.answer),
    basis: projection.provenance.basis
  } } };
}

/** Draft question descriptors for the future repeatable editor. Factual choices
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
