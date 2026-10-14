import "server-only";
import { contactRepresentationHash as hash } from "@/lib/expungement-ai/contact-representation";
import { ny16059TransactionAssociationPreparation, parseNyTransactionAssociations, nyTransactionQuestionApplies } from "@/lib/expungement-ai/ny-16059-transaction-associations";
import { ny16059ProtectedDocumentPreparation } from "@/lib/expungement-ai/ny-16059-document-preparation";
import { protectedPacketInformationModelFor } from "@/lib/expungement-ai/packet-information";
import { NY_SEALING_HISTORY_ID, parseNySealingHistory } from "@/lib/expungement-ai/ny-16059-sealing-history";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import type { ProtectedPacketVerificationRecord } from "@/lib/expungement-ai/verification-cas";

export const NY_CURRENT_REVIEW_SOURCE = {
  revision: "08/2026", pages: 14,
  sha256: "633f06e1481d9c1a4b3ec987770eff577ac1147afeb3de0661b15c3ce659bccf", bytes: 10689138,
  mappingSha256: "9bbb150e06d1bb71918e717040cfde48106f1dc213664020bef833c59e6fea81",
  path: "private/source-imports/court-source-handoff-20261013/source_files/cpl160.59sealingapplication-fillable.pdf",
  mappingPath: "data/rcap-grade-a/source-custody/court-source-handoff-20261013/ny-2026-08-fillable-mapping.json"
} as const;

type Write = { page: number; field: string; value: string; factIds: string[]; caseIds: string[] };
type Continuation = { id: string; title: string; text: string; caseIds: string[]; actor: "applicant_personally"; execution: "unsigned_undated_unaffirmed" };
/** Internal review only. Caller obtains the protected record through the existing
 * owner access chain. Recompute from that record, never trust a serialized map.
 * Cases are not transactions; an inventory cannot silently decide legal grouping. */
export function ny16059CurrentDocumentInputs(record: ProtectedPacketVerificationRecord) {
  const prepared = ny16059ProtectedDocumentPreparation(record), model = protectedPacketInformationModelFor(record);
  if (!prepared || !model) return null;
  const snapshot = record.status === "verified" ? record.snapshot : record.draftSnapshot;
  if (!snapshot) return null;
  const unresolvedSourceFacts = new Set<string>();
  function conflicted(id: string) {
    const values = (["packetAnswers", "prefilledAnswers", "screeningAnswers"] as const).filter(key => Object.hasOwn(snapshot![key], id)).map(key => snapshot![key][id]);
    if (values.length < 2) return false;
    const q = model!.questions.find(q => q.id === id);
    const canonical = (raw: unknown) => raw && typeof raw === "object" && !Array.isArray(raw) && Object.keys(raw).every(k => k === "value" || k === "unknown")
      ? (raw as { unknown?: unknown }).unknown === true ? raw : (raw as { value?: unknown }).value : raw;
    const differing = values.some(raw => hash(canonical(raw)) !== hash(canonical(values[0]))) || Boolean(q && values.some(raw => questionAnswerState(q, raw) !== "known_valid"));
    if (differing) unresolvedSourceFacts.add(id);
    return differing;
  }
  const writes: Write[] = [], continuations: Continuation[] = [], unresolved: string[] = [];
  const add = (page: number, field: string, value: unknown, factIds: string[], caseIds: string[] = []) => {
    if (typeof value === "string" && value.trim()) writes.push({ page, field, value, factIds, caseIds });
  };
  const continuation = (id: string, title: string, text: string, caseIds: string[] = []) => continuations.push({ id, title, text, caseIds, actor: "applicant_personally", execution: "unsigned_undated_unaffirmed" });
  // Only existing exact participant-owned keys. Aggregate contact prose is not
  // parsed into address/phone/email, and unknown residual wrapper text is not known.
  function participant(id: string) {
    const q = model!.questions.find(q => q.id === id);
    const source = (["packetAnswers", "prefilledAnswers", "screeningAnswers"] as const).find(key => Object.hasOwn(snapshot![key], id));
    if (conflicted(id) || !q || !source || questionAnswerState(q, snapshot![source][id]) !== "known_valid") return null;
    const raw = snapshot![source][id];
    if (raw && typeof raw === "object" && (Array.isArray(raw) || ![Object.prototype, null].includes(Object.getPrototypeOf(raw))
      || Object.keys(raw).some(k => k !== "value" && k !== "unknown") || ![undefined, false].includes((raw as { unknown?: boolean }).unknown))) return null;
    const value = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as { value?: unknown }).value : raw;
    return typeof value === "string" ? value : null;
  }
  const name = participant("participant_full_legal_name");
  for (const page of [10, 12, 13, 14]) add(page, "ApplicantName", name, ["participant_full_legal_name"]);
  if (!name) unresolved.push("participant_full_legal_name");
  add(10, "ApplicantDateOfBirth", participant("date_of_birth"), ["date_of_birth"]);
  for (const [field, id] of [["Appplicant Street Address", "street_address"], ["Applicant City State Zip", "city_state_zip"], ["ApplicantPhone", "phone_number"], ["ApplicantEmail", "email_address"]]) {
    for (const page of [10, 12]) add(page, field, participant(id), [id]);
  }
  const alias = prepared.availableFacts.ny_16059_case_alias_names;
  if (!conflicted("ny_16059_case_alias") && !conflicted("ny_16059_case_alias_names") && prepared.conditions.covered_case_alias_exists.value === true) add(10, "AKA", alias?.value, ["ny_16059_case_alias_names"]);
  const nysid = prepared.availableFacts.ny_16059_nysid_number;
  if (!conflicted("ny_16059_nysid_known") && !conflicted("ny_16059_nysid_number") && prepared.conditions.nysid_known.value === true) add(10, "NYSID", nysid?.value, ["ny_16059_nysid_number"]);
  // Unknown NYSID remains a completion instruction, never a negative legal result.
  const nysidDisposition = !conflicted("ny_16059_nysid_known") && !conflicted("ny_16059_nysid_number") && prepared.conditions.nysid_known.value === true && typeof nysid?.value === "string" ? "known_exact_identifier" : "not_supplied_follow_receiving_court_instructions";
  const caseConflict = conflicted("ny_16059_covered_case_records"), destinationConflict = conflicted("ny_16059_filing_case_id");
  const cases = caseConflict ? [] : prepared.casePreparation.records ?? [], caseIds = cases.map(c => c.id), destination = prepared.casePreparation.filingDestination;
  const transactions = caseConflict ? null : ny16059TransactionAssociationPreparation(record);
  const printedRowAssignments = transactions?.status === "covered_associations_supported" && transactions.groups.length <= 2
    ? transactions.groups.map((group, index) => ({ row: index + 1, groupId: group.id, basis: group.basis,
      caseIds: group.caseIds, members: group.members.map(member => ({ caseId: member.caseId, convictionId: member.convictionId })) })) : [];
  for (const page of [10, 13]) {
    add(page, "CriminalCourtName", caseConflict || destinationConflict ? null : destination.courtName, ["ny_16059_filing_case_id"], destination.caseId ? [destination.caseId] : []);
    add(page, "CourtCounty", caseConflict || destinationConflict ? null : destination.courtCounty, ["ny_16059_filing_case_id"], destination.caseId ? [destination.caseId] : []);
    if (printedRowAssignments.length && transactions) {
      for (const row of printedRowAssignments) {
        const group = transactions.groups.find(group => group.id === row.groupId)!;
        const ownCases = group.caseIds.map(caseId => cases.find(c => c.id === caseId)!);
        add(page, `5 Case Number Docket Indictment or SCI NumberRow${row.row}`, ownCases.map(c => c.caseNumbers).join("; "), ["ny_16059_covered_case_records", "ny_16059_transaction_associations"], row.caseIds);
        add(page, `6 Court NameRow${row.row}`, ownCases.map(c => c.courtName).join("; "), ["ny_16059_covered_case_records", "ny_16059_transaction_associations"], row.caseIds);
      }
    } else if (cases.length === 1 && cases[0].convictions.length === 1) {
      add(page, "5 Case Number Docket Indictment or SCI NumberRow1", cases[0].caseNumbers, ["ny_16059_covered_case_records"], caseIds);
      add(page, "6 Court NameRow1", cases[0].courtName, ["ny_16059_covered_case_records"], caseIds);
    } else if (cases.length) {
      add(page, "5 Case Number Docket Indictment or SCI NumberRow1", "See identified case inventory", ["ny_16059_covered_case_records"], caseIds);
      add(page, "6 Court NameRow1", "See each case's own court", ["ny_16059_covered_case_records"], caseIds);
      unresolved.push("transaction_grouping_and_printed_row_allocation");
    }
  }
  for (const row of printedRowAssignments) {
    const group = transactions!.groups.find(group => group.id === row.groupId)!;
    const savedGroup = parseNyTransactionAssociations(transactions!.rawAssociations[0])?.groups.find(g => g.id === group.id);
    continuation(`transaction:${group.id}`, `Conviction group ${row.row} — case and record associations`, [
      `Printed row: ${row.row}`, ...group.members.flatMap(member => [
        `Case: ${member.record.caseNumbers}; Court: ${member.record.courtName}; County: ${member.record.courtCounty}`,
        `Conviction: ${member.record.charge}; Section: ${member.record.section}; Date: ${member.record.convictionDate}`,
        ...(group.members.length > 1 ? [`Conduct: ${member.conductStart} through ${member.conductEnd}`, member.conductDescription,
          `Charging record: ${member.chargingRecordReference}`, `Disposition record: ${member.dispositionRecordReference}`] : [])
      ]), ...(group.members.length > 1 ? [
        `Connection described: ${group.basis === "time_and_circumstance" ? "Acts together in time and circumstances" : "Integral parts of one criminal venture"}`,
        ...(savedGroup ? [savedGroup.relationshipDescription,
          ...(nyTransactionQuestionApplies(savedGroup, "interveningConduct") ? [savedGroup.interveningConduct, `Intervening record: ${savedGroup.interveningRecordReference}`] : []),
          `Victim context: ${savedGroup.victims}`, ...(savedGroup.victims !== "none" ? [savedGroup.victimRelationship] : [])] : []),
        transactions!.rawAssociations.length ? "The saved association facts remain participant-supplied, not a certification of the underlying records." : "Separate incidents were explicitly declared for these unchanged records."
      ] : [])
    ].join("\n"), row.caseIds);
  }
  for (const c of cases) {
    const lines = [`Case number(s): ${c.caseNumbers}`, `Court: ${c.courtName}`, `County: ${c.courtCounty}`];
    for (const v of c.convictions) {
      lines.push(`Offense: ${v.charge}`, `Section: ${v.section}`, `Saved grade: ${v.grade}`, `Conviction date: ${v.convictionDate}`);
      for (const s of v.sentences) {
        lines.push(`Sentence date: ${s.sentenceDate}`, `Sentence terms: ${s.sentenceTerms}`, `Post-sentence custody: ${s.postSentenceCustody || "unanswered"}`);
        if (s.postSentenceCustody === "yes") for (const r of s.releases) lines.push(`Release date: ${r.releaseDate}`);
      }
    }
    lines.push(`Disposition document status: ${{ available: "Available; actual enclosure not established", request_needed: "Copy still needs to be obtained", unavailable: "Unavailable; explanation below", unknown: "Unknown", "": "Unanswered" }[c.certificateStatus]}`);
    if (c.certificateStatus === "unavailable") lines.push(`Explanation of unavailability: ${c.certificateExplanation}`);
    continuation(`case:${c.id}`, "Covered case inventory - not a legal transaction count", lines.join("\n"), [c.id]);
  }
  if (!cases.length) unresolved.push("covered_case_inventory");
  unresolved.push(...prepared.casePreparation.associationIssues.map(i => i.code));
  const statement = conflicted("ny_16059_applicant_statement") ? null : prepared.casePreparation.applicantStatement.text;
  if (typeof statement === "string" && statement.trim()) add(12, "StateReasons", statement, ["ny_16059_applicant_statement"]);
  else unresolved.push("required_applicant_statement");
  if (prepared.futureApplications.active && !conflicted("ny_16059_future_application") && !conflicted("ny_16059_future_sealing_records")) {
    if (!prepared.futureApplications.complete) unresolved.push("future_application_associations");
    for (const a of prepared.futureApplications.applications ?? []) {
      continuation(`future:${a.id}`, "Intended separate application - not filed", [`Application identifier: ${a.id}`, `Intended statute(s): ${a.laws.join(", ")}`,
        ...a.cases.flatMap(c => [`Case identifier: ${c.id}`, `Case number(s): ${c.resolvedCaseNumbers ?? "unresolved"}`, `Court: ${c.resolvedCourtName ?? "unresolved"}`])].join("\n"), a.cases.map(c => c.id));
    }
    add(11, "Case Number Docket Indictment or SCI NumberRow1", "See intended application inventory", ["ny_16059_future_sealing_records"]);
    add(11, "Court NameRow1", "See each intended case's court", ["ny_16059_future_sealing_records"]);
  }
  // Resolve each protected copy before emitting any historical detail. A disputed
  // entry does not erase another application's or order's unambiguous history.
  const prior59Conflict = conflicted("ny_16059_application_status");
  const priorHistoryConflict = conflicted(NY_SEALING_HISTORY_ID);
  const prior58Conflict = conflicted("ny_16059_16058_grants");
  const historyCopies = (["packetAnswers", "prefilledAnswers", "screeningAnswers"] as const)
    .filter(key => Object.hasOwn(snapshot[key], NY_SEALING_HISTORY_ID))
    .map(key => parseNySealingHistory(snapshot[key][NY_SEALING_HISTORY_ID]));
  function historyEntrySafe(kind: "applications" | "orders", entry: { id: string; law: string }) {
    const rawEntry = Object.fromEntries(Object.entries(entry).filter(([key]) => !["attachmentIncluded", "sourceAccepted", "legallyReviewed"].includes(key)));
    const disputed = (entry.law === "16059" && prior59Conflict) || (entry.law === "16058" && prior58Conflict)
      || !historyCopies.length || historyCopies.some(copy => !copy || hash(copy[kind].find(other => other.id === entry.id) ?? null) !== hash(rawEntry));
    if (disputed) unresolved.push(`conflicting_prior_history_entry:${kind}:${entry.id}`);
    return !disputed;
  }
  for (const a of (prepared.priorSealingRecords.applications ?? []).filter(a => historyEntrySafe("applications", a))) continuation(`prior:${a.id}`, "Earlier filed application - distinct from granted order", [`Application: ${a.id}`, `Law: CPL ${a.law}`, `Case number(s): ${a.caseNumbers}`, `Court: ${a.courtName}`, `Outcome: ${a.outcome}`, a.outcomeDetails, `Copy status: ${a.copyStatus}`, a.copyExplanation].filter(Boolean).join("\n"));
  for (const o of (prepared.priorSealingRecords.enteredOrders ?? []).filter(o => historyEntrySafe("orders", o))) continuation(`order:${o.id}`, "Earlier order - not proof of an applicant filing", [`Order: ${o.id}`, `Law: CPL ${o.law}`, `Court: ${o.courtName}`, `Reference: ${o.reference}`, `Entered date: ${o.enteredDate}`, `Current status: ${o.currentStatus}`, o.statusDetails, ...o.convictions.flatMap(c => [`Case ${c.id}: ${c.caseNumbers}; court: ${c.courtName}`, `Offense: ${c.charge}; section: ${c.section}; grade: ${c.grade}; role: ${c.role}`])].filter(Boolean).join("\n"));
  const priorConflict = prior59Conflict || priorHistoryConflict || prior58Conflict;
  const prior59 = priorConflict ? null : prepared.priorApplications.cpl16059.occurred, prior58 = priorConflict ? null : prepared.priorApplications.cpl16058.occurred;
  const selections = [
    ...(prior59 === true || prior58 === true ? [{ page: 11, field: "HaveOrNotAnother", state: "Have", factIds: ["ny_16059_prior_sealing_records", "ny_16059_application_status"] }]
      : prior59 === false && prior58 === false ? [{ page: 11, field: "HaveOrNotAnother", state: "HaveNot", factIds: ["ny_16059_prior_sealing_records", "ny_16059_application_status"] }] : []),
    ...(conflicted("ny_16059_future_application") || prepared.conditions.future_sealing_application_intended.value === null ? [] : [{ page: 11, field: "DoOrNotIntendFile", state: prepared.conditions.future_sealing_application_intended.value ? "Do" : "Do#20Not", factIds: ["ny_16059_future_application"] }])
  ];
  const serviceObligations = [...new Set(cases.map(c => c.courtCounty).filter(Boolean))].map(county => ({ county, caseIds: cases.filter(c => c.courtCounty === county).map(c => c.id), actualRecipient: null, actualServer: null, servicePerformed: null, receivedStamp: null, signature: null, affirmationDate: null, status: "recipient_and_actual_service_unresolved" as const }));
  return { schemaVersion: "ny-16059/current-document-review-inputs/v1" as const, source: structuredClone(NY_CURRENT_REVIEW_SOURCE),
    recordHash: prepared.recordHash, revision: prepared.revision, writes, selections, continuations, serviceObligations, caseIds,
    printedRowAssignments, nysidDisposition, missingFactIds: [...prepared.missingFactIds], unresolved: [...new Set([...unresolved, ...[...unresolvedSourceFacts].map(id => `conflicting_owned_fact:${id}`)])],
    conflictingOwnedFactIds: [...unresolvedSourceFacts],
    sourceFactHash: hash({ writes, selections, continuations, serviceObligations }), prepared,
    participantFieldAvailability: Object.fromEntries(["participant_full_legal_name", "date_of_birth", "street_address", "city_state_zip", "phone_number", "email_address"].map(id => [id, participant(id) === null ? "not_available_as_unambiguous_owned_fact" : "known_owned_fact"])),
    legalTransactionCount: null, eligibilityEstablished: false as const, sourceCurrentnessApproved: false as const,
    generationAllowed: false as const, admissionGranted: false as const, deliveryAllowed: false as const, reviewOnly: true as const };
}
