import "server-only";
import { isNy16059Packet } from "@/lib/expungement-ai/ny-16059-packet-facts";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { ny16059ProtectedDocumentPreparation } from "@/lib/expungement-ai/ny-16059-document-preparation";
import { nyClassificationComplete } from "@/lib/expungement-ai/ny-16059-case-classification";
import { parseNyCourtCaseRecords, type NyCourtCaseRecord } from "@/lib/expungement-ai/ny-16059-case-records";
import type { ProtectedPacketDraftSnapshot, ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";
import { NY_TRANSACTION_ASSOCIATIONS_ID, NY_TRANSACTION_ASSOCIATIONS_VERSION, NY_TRANSACTION_SOURCE,
  parseNyTransactionAssociations, encodeNyTransactionAssociations, nyTransactionMemberFor, emptyNyTransactionGroup,
  nyTransactionBinding as binding, nyTransactionGroupFacts, type NyTransactionMember, type NyTransactionIssue as Issue } from "@/lib/expungement-ai/ny-16059-transaction-facts";
export * from "@/lib/expungement-ai/ny-16059-transaction-facts";
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v)) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k)));

type TransactionSnapshot = Pick<ProtectedPacketDraftSnapshot, "jurisdiction" | "pathwayId" | "profileVersion" | "profileSourceFingerprint" | "profileAuthorityFingerprint" | "packetAnswers" | "prefilledAnswers" | "screeningAnswers" | "dependencies">;

/** Read-only source-copy and server provenance checks. This never calls a
 * protected model, writes history or turns a source conflict into precedence. */
function protectedTransactionInputState(snapshot: TransactionSnapshot, cases: readonly NyCourtCaseRecord[]) {
  const maps = [snapshot.packetAnswers, snapshot.prefilledAnswers, snapshot.screeningAnswers];
  const values = maps.filter(m => Object.hasOwn(m, NY_TRANSACTION_ASSOCIATIONS_ID)).map(m => m[NY_TRANSACTION_ASSOCIATIONS_ID]);
  const associations = parseNyTransactionAssociations(values[0]);
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
  if (carried !== undefined && (!carried || carried.supersededByAnswerSha256 !== hash(values[0] ?? null))) {
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
  return { maps, values, associations, issues, sourceConflict, caseConflict, grouping, declaration, declaredCount, universe };
}

export function nyProtectedTransactionInputIssues(snapshot: TransactionSnapshot): Issue[] {
  if (!isNy16059Packet(snapshot.jurisdiction, snapshot.pathwayId)) return [];
  const raw = { ...snapshot.screeningAnswers, ...snapshot.prefilledAnswers, ...snapshot.packetAnswers };
  if (!Object.hasOwn(raw, NY_TRANSACTION_ASSOCIATIONS_ID)) return [];
  return protectedTransactionInputState(snapshot, parseNyCourtCaseRecords(raw.ny_16059_covered_case_records) ?? []).issues;
}

/** No source, payment or delivery authority is conferred. Every current covered
 * conviction must remain visible, including excluded convictions; a partial
 * supported group cannot silently clear the whole criminal history. */
export function ny16059TransactionAssociationPreparation(record: ProtectedPacketVerificationRecord) {
  const prepared = ny16059ProtectedDocumentPreparation(record);
  if (!prepared) return null;
  const snapshot = record.status === "verified" ? record.snapshot : record.draftSnapshot;
  if (!snapshot) return null;
  const cases = structuredClone(prepared.casePreparation.records ?? []);
  const { maps, values, issues, sourceConflict, caseConflict, grouping, declaration, declaredCount, universe, associations: initialAssociations } = protectedTransactionInputState(snapshot, cases);
  let associations = initialAssociations;
  const add = (code: string, groupId: string | null) => issues.push({ code, groupId });
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
  const groupFacts = nyTransactionGroupFacts(cases, associations);
  issues.push(...groupFacts.issues);
  const groups = groupFacts.groups.map(group => ({ ...group, status: sourceConflict || caseConflict ? "needs_targeted_review" as const : group.status }));
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
