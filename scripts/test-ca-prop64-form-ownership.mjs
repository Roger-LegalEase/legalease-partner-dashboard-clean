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
// The retained instructions belong to the accepted three-write fixture. The
// structured-contact successor changes exactly these two explanatory passages;
// preserve that artifact and require every other actor/source instruction verbatim.
const instructionSuccessors = [
  [
    "The current field map writes exactly 3 fields: `matter.county` on CR-400, `matter.case_number` on CR-400, `participant.full_legal_name` on CR-400. It does not fill date of birth, other contact details or every recorded offense fact. Remaining known facts must be bound through a reviewed successor; this guide does not claim they were printed.",
    "This source-bound field map writes 3 fields: `matter.county` on CR-400, `matter.case_number` on CR-400, `participant.full_legal_name` on CR-400. Only the facts mapped above are filled. Known filer and court contacts may be supplied by the structured-contact successor; inspect the exact accompanying map and printed forms. Date of birth, unknown facts, service events, signatures and court decisions are not inferred.",
  ],
  [
    "The current fixtures leave this form unchanged.",
    "The structured-contact successor fills only its known neutral caption; the court-owned body remains blank.",
  ],
];
let expectedCurrentInstructions = instructions;
for (const [retained, current] of instructionSuccessors) {
  equal(expectedCurrentInstructions.split(retained).length, 2, "exact retained passage occurs once");
  expectedCurrentInstructions = expectedCurrentInstructions.replace(retained, current);
}
const currentInstructions = caProp64CompletionInstructionsForReview(map);
equal(currentInstructions, expectedCurrentInstructions, "current source-bound instructions preserve all other accepted actor duties");
equal([map.generationAllowed, map.runtimeSelectable, map.commercialRoutesOpened], [false, false, 0]);
equal(map.writes.map((row) => row.factId).sort(), ["matter.case_number", "matter.county", "participant.full_legal_name"]);
equal(map.selections.length, 4);
// Source anchors: CR-400 (2024 court-hosted official bytes), caption and items
// 1, 3, 4, signature; CR-401 caption, items 1-3 and declarant signature;
// CR-403 caption versus the judicial order. These assertions concern actors,
// not legal eligibility or approval to deliver a packet.
const rows = map.refusals;
const forForm = (form) => rows.filter((row) => row.formNumber === form);
const primary = forForm("CR-400");
equal(primary.filter((row) => row.completionActor === "self_represented_party_or_attorney").length, 8);
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
equal(proof.filter((row) => row.completionStage === "caption_preparation").length, 14);
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
equal(rows.filter((row) => row.requiredBeforeFiling).map((row) => row.completionActor).every((actor) => ["actual_nonparty_adult_server", "petitioner_applicant_or_attorney"].includes(actor)), true);
for (const text of ["Every other box on every form", "Sign and date each form yourself", "none of them is optional", "The attorney block on the primary form"]) {
  equal(instructions.includes(text), false, text);
}
assert.match(instructions, /leave each unchecked unless you affirmatively choose/); assertions++;
assert.match(instructions, /does not fill date of birth, other contact details/); assertions++;
equal(caProp64RefusalDisposition({ name: "unrelated" }, { familyId: "ca-1203-41-set", formNumber: "CR-180" }), null);
assert.throws(() => caProp64RefusalDisposition({ name: "CR-400[0].UnknownField[0]" }, { familyId: "ca-prop64-set", formNumber: "CR-400" }), /unclassified/); assertions++;
const changedSource = structuredClone(census);
changedSource.documents[0].pinnedOfficialSha256 = "unreviewed";
assert.throws(() => caProp64CompletionMetadataForReview(changedSource), /source pin changed/); assertions++;
console.log(JSON.stringify({ status: "PASS", assertions, sourceFields: map.coverage.terminalFields, noPdfRegeneration: true, legalAndLanguageApproval: "PENDING" }));
