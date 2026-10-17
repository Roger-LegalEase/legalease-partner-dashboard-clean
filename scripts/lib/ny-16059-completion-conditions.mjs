import assert from "node:assert/strict";
import { NY_16059_HELD_SOURCES, NY_16059_ROUTE, ny16059GuidanceCondition } from "./ny-16059-participant-guidance.mjs";

export const NY_COMPLETION_FAMILY = "ny_160_59_petition-set";
const APP = "NY-CPL-160.59-APPLICATION", COD = "NY-CPL-160.59-COD-REQUEST", PRO = "NY-CPL-160.59-PRO-SE-PACKET";
const entries = new Map();
const key = (documentId, field) => `${documentId}/${field}`;
function add(documentId, fields, condition, actor, stage, event, sourceAnchor, obligation) {
  for (const field of fields) {
    const id = key(documentId, field);
    assert.ok(!entries.has(id), `Duplicate NY condition ${id}`);
    entries.set(id, Object.freeze({ schemaVersion: "ny-held-completion/v1", documentId, field,
      sourceSha256: NY_16059_HELD_SOURCES[documentId], condition, actor, stage, event, sourceAnchor, obligation,
      knownValuePolicy: "preserve_and_bind_applicable_owned_fact", intakeOrPurchaseGate: false,
      conditionDescription: ny16059GuidanceCondition(documentId, field)
        ?? (field === "AKA(s)" ? "Use an actual applicable alias of the defendant. This is a record fact, not a signature or signing date. Never invent an alias."
          : "The applicant or actual server performs service; the prosecutor is the recipient. Check this task only after actual service, never merely because papers were prepared."),
    }));
  }
}
const prep = "record_preparation", person = "participant_from_record", server = "actual_server";
add(APP, ["Applicant_AKA"], ["any_alias_exists"], person, prep, "applicant_alias", "held application p4 item2", "Actual aliases, including case-used names, remain distinct from a signature.");
add(APP, ["NYSID"], ["source_revision_review"], person, prep, "criminal_history_identifier", "held application p4 item3; differs from pro-se if-known wording", "Resolve source wording/currentness; do not borrow another revision's knownness rule.");
add(APP, ["Motorist_ID"], ["covered_vtl_conviction"], person, prep, "motorist_identifier", "held application p4 item4", "Actual applicable motorist identifier; no invented identifier for a non-VTL case.");
add(APP, ["Docket_Indictment_SCI_Number_2", "Court_Name_2", "Conviction_Charge_2", "Law_Section_Subsection_2", "Conviction_Date_2", "Sentence_Date_2", "Sentence_Term_2"], ["second_covered_case"], person, prep, "second_covered_case", "held application p4 item6", "Keep every actual covered case and its own case numbers; printed rows do not establish transaction grouping.");
add(APP, ["Law_Section_Subsection_1", "Sentence_Date_1", "Sentence_Term_1"], [], person, prep, "first_covered_case", "held application p4 case table; p5 sentence instructions", "First-case section and sentence facts remain owed even when no second case exists.");
add(APP, ["Release_Date_1"], ["first_case_postsentence_incarceration"], person, prep, "first_case_release", "held application p5 item13", "Actual first-case release, not probation/parole completion.");
add(APP, ["Release_Date_2"], ["second_covered_case", "second_case_postsentence_incarceration"], person, prep, "second_case_release", "held application p5 item13", "Actual second-case release, never copied from another case.");
for (let i = 4; i <= 10; i++) add(APP, [`Attachment_${i}`], [`application_attachment_${i}_included`], person, prep, `application_attachment_${i}`, "held application p5 attachments4-10", "Only actual supporting attachments; optional evidence does not replace the required statement.");
add(APP, ["Court_Name", "Conviction_Date", "Sentence_Date"], ["future_sealing_application_intended"], person, prep, "future_case", "held application p2 item19", "Future intent is separate from prior applications and current cases.");
add(APP, ["County_of"], ["service_affidavit_needed", "service_completed"], server, "actual_service_proof", "affidavit_execution_venue", "held application p3 affidavit COUNTY OF", "Actual affidavit venue; do not infer it from residence or prosecuting county.");
add(APP, ["Address_of_Person_Serving", "Date_of_Service", "Documents_in_Support", "Address_of_DA_1"], ["service_affidavit_needed", "service_completed"], server, "actual_service_proof", "actual_service", "held application p3 service affidavit; p6 service instructions", "Keep actual server, recipient, documents and event distinct; future service remains owed.");
add(APP, ["Address_of_DA_2"], ["service_affidavit_needed", "service_completed", "second_service_address_line_needed"], server, "actual_service_proof", "actual_recipient_address_continuation", "held application p3 second address line; p6 proof instructions", "Second printed address line does not establish a second prosecutor.");
add(COD, ["CourtAddress", "CourtCityStateZip"], ["new_certificate_request_needed"], "actual_requester", prep, "requested_court_destination", "held July2024 CoD p1 court heading", "If a new request is unnecessary, the certificate-or-explanation obligation still remains.");
for (const field of ["IDVNumber", "ArrestNumber", "OrderofProtectionNumber", "CertificateofDispositionNumber", "CriminalJusticeTrackingNumber(CJTN)", "ComplaintNumber", "TicketNumber", "NYSIDNumber", "PartialDocketNumber", "DMVIDNumber", "Other"]) add(COD, [field], [`known_applicable_identifier:${field}`], "actual_requester", prep, `case_identifier:${field}`, "held July2024 CoD p2 Case Identifiers: any if known", "Reuse this actual applicable identifier if known; never require every listed identifier.");
add(COD, ["ArrestDateRangeEnd"], ["arrest_date_is_range"], "actual_requester", prep, "arrest_date_range", "held July2024 CoD p2 Arrest Date OR Date Range", "An exact arrest date needs no range end; keep the incident event separate.");
add(COD, ["IncidentDateRangeEnd"], ["incident_date_is_range"], "actual_requester", prep, "incident_date_range", "held July2024 CoD p2 Incident Date OR Date Range", "An exact incident date needs no range end; do not substitute the arrest date.");
add(COD, ["AKA(s)"], ["defendant_alias_exists"], "actual_requester", prep, "defendant_alias", "held July2024 CoD p1 Defendant Information", "An alias is not a signature/date; an owned applicable alias remains a binding obligation.");
add(PRO, ["AKAs"], ["covered_case_alias_exists"], person, prep, "covered_case_alias", "held pro-se instructions item2", "Use only actual names used in a covered case; preserve source-specific alias scope.");
add(PRO, ["NYSID"], ["nysid_known"], person, prep, "criminal_history_identifier", "held pro-se instructions item3: if known", "An unknown NYSID must not be invented; six-page wording remains a separate source issue.");
add(PRO, ["Complete the affidavit of service"], ["service_affidavit_needed", "service_completed"], server, "actual_service_task", "actual_service_proof_task", "held pro-se checklist and proof instructions", "Stamped in-person proof may satisfy the stated alternative; do not claim an affidavit was completed.");
add(PRO, ["Keep copies for your records"], ["filing_completed", "copies_retained"], "participant", "postfiling_task", "actual_copy_retention", "held pro-se checklist", "Copy retention remains a later task, never an unknown personal fact or purchase gate.");
add(PRO, ["Serve the prosecutor"], ["service_completed"], "applicant_or_actual_server", "actual_service_task", "actual_service_task", "held pro-se checklist and service instructions", "Prosecutor is recipient, not service actor; actual service remains owed.");
add(PRO, ["Case Number 3", "Court Name 3"], ["future_sealing_application_intended"], person, prep, "future_case", "held pro-se p10 item11", "Future-application details do not reuse current-case values or prior-application answers.");
for (let i = 3; i <= 10; i++) add(PRO, [`Document ${i}`], [`prose_document_${i}_included`], person, prep, `prose_document_${i}`, "held pro-se additional-documents instruction", "Name only actual optional documents; the required applicant statement remains owed.");
add(PRO, ["Case Number 2", "Court Name 2"], ["second_covered_case"], person, prep, "second_covered_case", "held pro-se current-case table", "Preserve each actual additional case and all relevant numbers; do not infer transaction counts.");
add(PRO, ["Type of Service", "Server Name", "Server Address", "Service Date"], ["service_affidavit_needed", "service_completed"], server, "actual_service_proof", "actual_service", "held pro-se service affidavit and separate-proof instructions", "Actual method, server and date after service; separate source-era proof rules remain distinct.");
assert.equal(entries.size, 68);

export function nyCompletionDeclaration(documentId, field) {
  const entry = entries.get(key(documentId, field));
  return entry ? structuredClone(entry) : null;
}

/** Interpretation only, never proof of source custody, an owner fact or filing
 * readiness. Absence, uncertainty and malformed values are not explicit No. */
export function nyCompletionApplicability(declaration, facts = {}) {
  const expected = nyCompletionDeclaration(declaration?.documentId, declaration?.field);
  assert.deepEqual(declaration, expected, "Unregistered or changed NY declaration");
  assert.ok(expected, "Unregistered NY declaration");
  if (expected.condition.includes("source_revision_review")) return "unresolved_source_revision";
  const values = expected.condition.map(id => facts[id]);
  if (values.some(value => value === false)) return "inactive";
  return values.every(value => value === true) ? "active" : "unknown";
}

/** Preserve every field and all PDF-writing decisions. Only exact retained NY
 * field obligations opt in; this declaration never self-certifies source bytes. */
export function applyNyCompletionDeclarations(config, documents) {
  assert.deepEqual(config.routeKeys, [NY_16059_ROUTE]);
  assert.deepEqual(Object.fromEntries(config.documents.map(doc => [doc.documentId, doc.sha256])), NY_16059_HELD_SOURCES);
  const counts = { [APP]: 55, [COD]: 39, [PRO]: 54, "NY-CPL-160.59-SEAL-VERIFICATION": 0 };
  assert.deepEqual(documents.map(doc => doc.documentId).sort(), Object.keys(counts).sort());
  let declared = 0;
  const result = documents.map(doc => {
    assert.equal(doc.fields.length, counts[doc.documentId]);
    assert.equal(new Set(doc.fields.map(row => row.field)).size, doc.fields.length);
    return { ...doc, fields: doc.fields.map(row => {
      const declaration = nyCompletionDeclaration(doc.documentId, row.field);
      if (!declaration) return row;
      declared++;
      assert.equal(row.decision, "refuse", `${doc.documentId}/${row.field}: a real write needs separate binding review`);
      return { ...row, nyCompletion: declaration,
        effectiveLabel: row.effectiveLabel ?? row.field,
        refusalClass: "ny_source_conditional_completion",
        reason: declaration.conditionDescription,
        requiredBeforeFiling: declaration.condition.length === 0,
        blankTreatment: declaration.condition.length === 0 ? "REQUIRED_BEFORE_FILING" : null,
        routeDetermined: false,
      };
    }) };
  });
  assert.equal(declared, 68);
  return result;
}
