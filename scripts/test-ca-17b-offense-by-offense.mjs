#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CA17_DECISION_ID,
  CA17_OFFENSE_FIELD_MAPPINGS,
  CA17_VARIANT_ID,
  assertCa17BindingDecision,
  ca17FixtureFacts,
  ca17ParticipantInputStatus,
  evaluateCa17OffenseInputs,
} from "./lib/ca-17b-offense-by-offense.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root,
  "data/rcap-all50/overlays/census-v1/ca/ca-17b-reduction-set--official-pdf-fill");
let checks = 0;
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks += 1; };
const ok = (value, message) => { assert.ok(value, message); checks += 1; };

const decision = assertCa17BindingDecision(root);
equal(decision.decisionId, CA17_DECISION_ID);
equal(decision.disposition, "LEGAL_CLEAR");
equal(Object.keys(CA17_OFFENSE_FIELD_MAPPINGS).length, 25);
equal(new Set(Object.values(CA17_OFFENSE_FIELD_MAPPINGS)).size, 25);
equal(CA17_VARIANT_ID, "pc-17b-17d2-offense-by-offense");

for (const fixture of ["canonical", "boundary"]) {
  const { rows, facts, evaluation } = ca17FixtureFacts(fixture);
  equal(rows.length, 5);
  equal(Object.keys(facts).length, 25);
  equal(evaluation.status, "READY");
  ok(rows.some((row) => row.eligible17b && !row.eligible17d2));
  ok(rows.some((row) => !row.eligible17b && row.eligible17d2));
}

equal(evaluateCa17OffenseInputs([]).status, "NEEDS_PARTICIPANT_INPUT_OR_HANDOFF");
equal(evaluateCa17OffenseInputs([{ code: "Penal" }]).status,
  "NEEDS_PARTICIPANT_INPUT_OR_HANDOFF");
ok(evaluateCa17OffenseInputs([
  { code: "Penal", section: "TEST", offenseType: "felony", eligible17b: false, eligible17d2: false },
]).issues.some((issue) => issue.code === "NO_APPLICABLE_REDUCTION_REQUEST"));
ok(evaluateCa17OffenseInputs(Array.from({ length: 6 }, () => ({
  code: "Penal", section: "TEST", offenseType: "felony", eligible17b: true, eligible17d2: false,
}))).issues.some((issue) => issue.code === "OFFENSE_ROW_CAPACITY_EXCEEDED"));
ok(evaluateCa17OffenseInputs([
  { code: "Penal", section: "TEST", offenseType: "banana", eligible17b: true, eligible17d2: false },
]).issues.some((issue) => issue.code === "OFFENSE_TYPE_INVALID"));
const sparse = [];
sparse[2] = { code: "Penal", section: "TEST", offenseType: "felony", eligible17b: true, eligible17d2: false };
ok(evaluateCa17OffenseInputs(sparse).issues.some((issue) => issue.code === "OFFENSE_ROW_MISSING"));
equal(evaluateCa17OffenseInputs(sparse).status, "NEEDS_PARTICIPANT_INPUT_OR_HANDOFF");
ok(ca17ParticipantInputStatus().productionRule.missingInputTreatment.includes("do not infer"));

if (fs.existsSync(path.join(out, "production-field-map.json"))) {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(out, name), "utf8"));
  const map = read("production-field-map.json");
  const actual = read("reports/actual-writes.json");
  const rendered = read("reports/rendered-artifacts.json");
  const status = read("reports/participant-input-status.json");
  const guide = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  const receipt = read("source-receipt.json");
  equal(Object.keys(map.explicitMappingsByVariant).join("|"), CA17_VARIANT_ID);
  equal(map.writes.filter((row) => row.factId?.startsWith("matter.offenses.")).length, 25);
  equal(map.writes.filter((row) => !row.factId?.startsWith("matter.offenses.")).length, 33);
  equal(map.refusals.filter((row) => /ConvTable/.test(row.fieldName)).length, 0);
  equal(status.familyId, "ca-17b-reduction-set");
  equal(rendered.artifacts.length, 6);
  equal(rendered.centralRasterRequired, true);
  equal(rendered.everyPageRastered, false);
  equal(rendered.rasters.length, 0);
  const primary = actual.artifacts.filter((row) => row.formNumber === "CR-180");
  equal(primary.length, 2);
  for (const artifact of primary) {
    equal(artifact.finalizerWritten.length, 41);
    equal(artifact.writtenProof.length, 41);
    equal(artifact.fieldObservations.filter((row) => row.factId?.startsWith("matter.offenses.")).length, 25);
    equal(artifact.exactBindingProof.protectedFieldsWithFixtureValues.length, 0);
  }
  ok(guide.includes("There is no single either-or choice between those sections."));
  ok(!guide.includes("obligation:track-only:CA:ca-17b-reduction"));
  ok(!guide.includes("pc-17b-felony-to-misdemeanor"));
  ok(!guide.includes("Values this packet holds and did not print"));
  ok(!guide.includes("Page1[0]"));
  ok(!guide.includes("production-field-map.json"));
  ok(!guide.includes("deterministic review fixture"));
  ok(guide.includes("adult server"));
  ok(guide.includes("15 days' notice"));
  ok(guide.includes("do not identify the event from which those 15 days are counted"));
  ok(!guide.includes("must be at least 18 and not a party"));
  ok(guide.includes("requesting participant may serve in most cases"));
  ok(guide.includes("some courts instead require service first"));
  ok(!guide.includes("File CR-180 with CR-181 and the completed proof"));
  ok(!guide.includes("In production") && !guide.includes("used for this review fixture"));
  ok(guide.includes("Synthetic sample:") && guide.includes("Do not file the sample forms"));
  ok(guide.includes("Fill in court name and street address:") && guide.includes("For either service method"));
  ok(guide.includes("must provide evidence") && guide.includes("attached letter or other relevant documents"));
  const fieldMap = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json")));
  const courtAddresses = fieldMap.refusals.filter((r) => r.formNumber === "CR-181"
    && /\.(?:CrtStreet|CrtMailingAdd|CrtCityZip)\[0\]$/.test(r.fieldName));
  equal(courtAddresses.length, 3);
  ok(courtAddresses.every((r) => r.requiredBeforeFiling === true && !r.refusalClass));
  const compound = fieldMap.writes.find((r) => r.fieldName === "CR-106[0].Page1[0].RightCaption[0].CourtInfo[0]");
  equal(compound.factId, "matter.county");
  equal(compound.participantCompletion.status, "PARTIAL_KNOWN_VALUE_REQUIRES_COMPLETION");
  equal(compound.participantCompletion.requiredBeforeFiling, true);
  equal(compound.participantCompletion.requiredFactIds.join(","), "filing.court_name,filing.court_street_address");
  assert.deepEqual(compound.participantCompletion, ca17ParticipantInputStatus().productionRule.courtCaptionCompletion);
  checks += 1;
  const trafficking = fieldMap.refusals.find((r) => r.fieldName === "CR-180[0].Page2[0].LI4[0].li4[0].TextField6[0]");
  equal(trafficking.requiredBeforeFiling, true);
  ok(trafficking.conditionDescription.includes("Only if") && trafficking.conditionDescription.includes("attachments"));
  const optionalNarratives = fieldMap.refusals.filter((r) => r.formNumber === "CR-180"
    && /\.(?:TextField6|T66)\[0\]$/.test(r.fieldName) && r !== trafficking);
  equal(optionalNarratives.length, 4);
  ok(optionalNarratives.every((r) => r.requiredBeforeFiling === false && r.blankTreatment === "OPTIONAL_PARTICIPANT_CONTENT"));
  ok(guide.includes("Complete only that method's section"));
  const companion = actual.artifacts.filter((row) => row.formNumber !== "CR-180");
  equal(companion.length, 4);
  equal(companion.filter((row) => row.formNumber === "CR-181")
    .every((row) => row.finalizerWritten.length === 12), true);
  equal(companion.filter((row) => row.formNumber === "CR-106")
    .every((row) => row.finalizerWritten.length === 5), true);
  ok(receipt.sources.length === 3 && receipt.sources.every((row) => row.sha256Exact && row.byteLengthExact));
}

console.log(`CA17_OFFENSE_BY_OFFENSE_TEST_OK assertions=${checks}`);
