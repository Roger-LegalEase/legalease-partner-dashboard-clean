import assert from "node:assert/strict";
import fs from "node:fs";
import { caProp64RefusalDisposition } from "./lib/ca-prop64-form-ownership.mjs";
import { caProp64CompletionMetadataForReview, caProp64CompletionInstructionsForReview } from "./build-census-v1-az_marijuana_expungement_arrest_no_charges-set.mjs";

const base = "data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/";
const read = (name) => JSON.parse(fs.readFileSync(base + name, "utf8"));
const map = read("production-field-map.json");
const census = read("field-census.census-v1.json");
const instructions = fs.readFileSync(base + "participant-instructions.md", "utf8");
let assertions = 0;
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); assertions++; };
const fresh = caProp64CompletionMetadataForReview(census);
equal(fresh.fieldMap, map, "actual shared factory reproduces committed map without rendering");
equal(fresh.documents, census.documents, "actual shared factory reproduces all field dispositions and geometry");
equal(caProp64CompletionInstructionsForReview(map), instructions,
  "native instructions reproduce the saved output and actor duties");
equal([map.generationAllowed, map.runtimeSelectable, map.commercialRoutesOpened], [false, false, 0]);
equal(map.writes.length, 32, "all held caption facts reused across all three forms");
for (const form of ["CR-400", "CR-401", "CR-403"]) {
  for (const fact of ["matter.case_number", "matter.county", "participant.full_legal_name",
    "participant.street_address", "participant.city", "participant.state", "participant.zip",
    "participant.phone", "participant.email"]) {
    equal(map.writes.some(row => row.formNumber === form && row.factId === fact), true, `${form}: ${fact}`);
  }
}
equal(map.selections.length, 4);
// Source anchors: CR-400 (2024 court-hosted official bytes), caption and items
// 1, 3, 4, signature; CR-401 caption, items 1-3 and declarant signature;
// CR-403 caption versus the judicial order. These assertions concern actors,
// not legal eligibility or approval to deliver a packet.
const rows = map.refusals;
const forForm = (form) => rows.filter((row) => row.formNumber === form);
const primary = forForm("CR-400");
equal(primary.filter((row) => row.completionActor === "self_represented_party_or_attorney").length, 1);
equal(primary.filter((row) => row.completionActor === "attorney").length, 3);
equal(primary.filter((row) => row.completionStage === "record_section_selection").length, 5);
equal(primary.filter((row) => row.completionStage === "explicit_optional_election").length, 2);
for (const row of primary.filter((row) => row.completionStage === "explicit_optional_election")) {
  equal(row.requiredBeforeFiling, false, row.fieldName);
  equal(row.disposition, "REFUSE", "never infer optional consent");
}
for (const form of ["CR-400", "CR-401", "CR-403"]) {
  const courtUse = forForm(form).filter((row) => row.fieldName.includes(".CrtUse[0]."));
  equal(courtUse.length, 3);
  for (const row of courtUse) {
    equal(row.completionActor, "court");
    equal(row.requiredBeforeFiling, false, "court assignment is not a participant input gate");
  }
}
const proof = forForm("CR-401");
const service = proof.filter((row) => row.completionStage === "actual_service");
equal(service.length, 18, "source has ten service text fields and eight method/time controls");
for (const row of service) {
  equal(row.completionActor, "actual_nonparty_adult_server");
  equal(row.disposition, "REFUSE", "no invented future service event");
  equal(row.completionObligationId, "cr401-service");
  assert.match(row.reason, /over the age of 18 and not a party/); assertions++;
}
equal(proof.filter((row) => row.completionStage === "caption_preparation").length, 4);
equal(proof.filter((row) => row.completionStage === "represented_filing_only").length, 3);
for (const row of service.filter((row) => row.fieldName.includes(".li3b[0]."))) {
  assert.match(row.conditionDescription, /Only for actual mail service/); assertions++;
}
for (const row of forForm("CR-403").filter((row) => row.completionStage === "judicial_action")) {
  equal(row.completionActor, "court");
  equal(row.disposition, "REFUSE");
}
for (const id of ["cr400-signing", "cr401-service"]) {
  const obligation = map.completionObligations.find((row) => row.id === id);
  equal(obligation.required, true, "required executed-document acts retained");
  equal(obligation.manualNonWidgetAct, true, "printed non-widget signature line is not lost");
  equal(obligation.intakeOrPurchaseGate, false);
}
equal(map.requiredBeforeFilingCount, rows.filter((row) => row.requiredBeforeFiling).length);
equal(rows.filter((row) => row.requiredBeforeFiling).map((row) => row.completionActor).every((actor) => ["actual_nonparty_adult_server", "petitioner_applicant_or_attorney", "self_represented_party_or_attorney", "preparer_from_record", "preparer_from_confirmed_record"].includes(actor)), true);
for (const text of ["Every other box on every form", "Sign and date each form yourself", "none of them is optional", "The attorney block on the primary form"]) {
  equal(instructions.includes(text), false, text);
}
assert.match(instructions, /leave each unchecked unless you affirmatively choose/); assertions++;
assert.match(instructions, /Date of birth, unknown facts, service events, signatures and court decisions are not inferred/); assertions++;
equal(caProp64RefusalDisposition({ name: "unrelated" }, { familyId: "ca-1203-41-set", formNumber: "CR-180" }), null);
assert.throws(() => caProp64RefusalDisposition({ name: "CR-400[0].UnknownField[0]" }, { familyId: "ca-prop64-set", formNumber: "CR-400" }), /unclassified/); assertions++;
const changedSource = structuredClone(census);
changedSource.documents[0].pinnedOfficialSha256 = "unreviewed";
assert.throws(() => caProp64CompletionMetadataForReview(changedSource), /source pin changed/); assertions++;
console.log(JSON.stringify({ status: "PASS", assertions, sourceFields: map.coverage.terminalFields, noPdfRegeneration: true, legalAndLanguageApproval: "PENDING" }));
