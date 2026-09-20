#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  AZ_REQUIRED_PARTICIPANT_INPUTS, classifyAzParticipantInputBundle,
  FAMILY_ID, INPUT_EVIDENCE, OUT
} from "./build-census-v1-az_set_aside-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
let assertions = 0;
const ok = (value, why) => { assertions += 1; assert.ok(value, why); };
const eq = (actual, expected, why) => { assertions += 1; assert.deepEqual(actual, expected, why); };

eq(AZ_REQUIRED_PARTICIPANT_INPUTS.map((row) => row.key),
  ["sentenceImposed", "offenseClasses", "conditionsFulfilled", "certificateRequested"],
  "all four frozen findings have intake definitions");
ok(AZ_REQUIRED_PARTICIPANT_INPUTS.every((row) => row.formDestination.includes("Form 31(a)")), "every answer has an exact Form 31(a) destination");
ok(AZ_REQUIRED_PARTICIPANT_INPUTS.every((row) => !row.formDestination.includes("Form 31(b)") || row.formDestination.includes("Do not mark any Form 31(b)")), "no answer is directed into the proposed order");

const missing = classifyAzParticipantInputBundle({}, 2);
eq(missing.map((row) => row.collectionStatus), ["not_provided", "not_provided", "not_provided", "not_provided"], "missing inputs stay missing");
ok(missing.every((row) => row.validationCode === "awaiting_participant_answer"), "missing inputs require participant answers");
assert.throws(() => classifyAzParticipantInputBundle({}, undefined), /countTotal must be/, "collection cannot run without the application's actual conviction count");
assertions += 1;

const invalid = classifyAzParticipantInputBundle({
  sentenceImposed: "", offenseClasses: ["Class 6 felony"],
  conditionsFulfilled: { conditionsFulfilled: true, discharged: true, dischargeDate: "2025-02-30" },
  certificateRequested: "yes"
}, 2);
eq(invalid.map((row) => row.collectionStatus), ["invalid", "invalid", "invalid", "invalid"], "malformed inputs are rejected");

const providedValues = {
  sentenceImposed: "Two years supervised probation and the monetary obligations in the judgment",
  offenseClasses: ["Class 6 felony", "Class 1 misdemeanor"],
  conditionsFulfilled: { conditionsFulfilled: true, discharged: true, dischargeDate: "2025-04-18" },
  certificateRequested: true
};
const provided = classifyAzParticipantInputBundle(providedValues, 2);
eq(provided.map((row) => row.collectionStatus), ["provided", "provided", "provided", "provided"], "complete participant answers are accepted for transfer and review");
ok(provided.every((row) => row.validationCode === "provided_pending_participant_transfer_and_review"), "provided metadata is not treated as filed ink");
eq(classifyAzParticipantInputBundle({ ...providedValues, certificateRequested: false }, 2)[3].collectionStatus, "provided", "No is a valid participant certificate-intent answer");
const notDischarged = classifyAzParticipantInputBundle({ ...providedValues, conditionsFulfilled: { conditionsFulfilled: false, discharged: false } }, 2)[2];
eq(notDischarged.collectionStatus, "provided", "an adverse participant answer is recorded truthfully");
ok(notDischarged.selfHelpTreatment?.includes("Stop"), "adverse completion/discharge answer triggers handoff");

const map = read(`${OUT}/production-field-map.json`);
eq(map.participantInputRequirements.length, 4, "field map exposes four required input contracts");
ok(map.participantInputRequirements.every((row) => row.required && row.participantAuthored && row.builderMayInfer === false), "all four remain participant-authored and non-inferable");
const virtualRequired = map.refusals.filter((row) => row.field?.startsWith("31a.required."));
eq(virtualRequired.map((row) => row.inputKey), ["sentenceImposed", "offenseClasses", "conditionsFulfilled", "certificateRequested"], "all four missing inputs have Form 31(a) field-map handbacks");
ok(virtualRequired.every((row) => row.virtualParticipantInput && row.notAnAcroFormField && row.printedLabel === null), "input handbacks do not masquerade as printed form controls");
ok(virtualRequired.slice(0, 3).every((row) => row.requiredBeforeFiling && row.participantAuthored && row.builderMayInfer === false), "three missing case facts are required and never inferred");
const certificateRequirement = map.participantInputRequirements.find((row) => row.key === "certificateRequested");
ok(certificateRequirement.required && certificateRequirement.participantAuthored && certificateRequirement.builderMayInfer === false, "certificate intent is a required intake answer");
const certificateElection = virtualRequired.find((row) => row.inputKey === "certificateRequested");
ok(certificateElection.refusalClass === "participant_sworn_narrative_or_legal_election" && certificateElection.collectionRequiredBeforePacketReady, "certificate intent remains an unmade but required participant election");
const orderRefusals = map.refusals.filter((row) => row.document === "R-26-0001-Form-31(b)");
eq(orderRefusals.length, 14, "all proposed-order controls retained");
ok(orderRefusals.every((row) => row.refusalClass === "court_prosecutor_clerk_or_agency_owned"), "all proposed-order controls remain court-owned");
ok(!map.writes.some((row) => /certificate_(?:grant|deny)|requirements_met|serious_offense|ineligible/.test(row.field)), "no certificate or merits decision is written");

const guide = fs.readFileSync(path.join(ROOT, OUT, "participant-instructions.md"), "utf8");
for (const requirement of AZ_REQUIRED_PARTICIPANT_INPUTS) {
  ok(guide.includes(requirement.question), `${requirement.key}: exact participant question disclosed`);
  ok(guide.includes(requirement.formDestination), `${requirement.key}: exact transfer destination disclosed`);
}
ok(guide.includes("judgment date is not a substitute"), "completion date distinguished from judgment date");
ok(guide.includes("do not infer it from the offense name or statute"), "offense class inference forbidden");
ok(guide.includes("never selects the court's certificate grant or denial"), "participant intent separated from judicial decision");
ok(guide.includes("tick the Section V attachment box"), "attached-continuation handback includes the source form control");

const statuses = read(`${OUT}/reports/participant-input-status.json`);
eq(statuses.fixtures.map((row) => [row.fixture, row.convictionCount]), [["canonical", 4], ["boundary", 5]], "status generation is bound to each fixture's actual conviction rows");
ok(statuses.fixtures.every((fixture) => fixture.inputs.length === 4 && fixture.inputs.every((row) => row.collectionStatus === "not_provided")), "neither current fixture silently marks an answer provided");
eq(statuses.rules.supportedCollectionStates, ["not_provided", "provided", "invalid"], "production status contract declares every supported collection state without publishing synthetic participant values");
eq(statuses.rules.certificateEligibilityAndGrantDenyRemainCourtOwned, true, "status contract retains court decision");

const pdfs = {
  canonical: path.join(ROOT, OUT, "fixtures/canonical.pdf"),
  boundary: path.join(ROOT, OUT, "fixtures/boundary.pdf")
};
eq(sha(pdfs.canonical), "61d79cf9576fa0245a2b854c63ad7fc69cdfba3d14863e3e60d2985ea1ad16f4", "canonical PDF unchanged");
eq(sha(pdfs.boundary), "79e3774130de798df8161eabbc9555a7d9a5c6bc4bbdeb3cb8b775783a71e114", "boundary PDF unchanged");
const completeness = execFileSync(process.execPath, ["scripts/rcap-packet-completeness/verify-packet-completeness.mjs", "--family", FAMILY_ID], { cwd: ROOT }).toString();
ok(completeness.includes("PASS_COMPLETE"), "native completeness passes");
ok(/requiredFactsNotCollected 0 .* requiredOptionsMissing 0/.test(completeness), "native input and route-option counters are zero");

const evidence = {
  schemaVersion: "rcap-az-input-handling-proof/v1", familyId: FAMILY_ID,
  result: "PASS", assertions, packetPdfsChanged: false,
  packetHashes: { canonical: sha(pdfs.canonical), boundary: sha(pdfs.boundary) },
  frozenInitialFail: "data/rcap-grade-a/packet-factory-24h/vf01/rows-vf01-az-current-form-initial-input-fail-20260912.json",
  inputs: AZ_REQUIRED_PARTICIPANT_INPUTS,
  validationScenarioConvictionCount: 2,
  missingStatus: missing, invalidStatus: invalid, providedStatus: provided,
  currentFixtureStatus: statuses.fixtures,
  proposedOrderControlsProtected: orderRefusals.length,
  completenessResult: "PASS_COMPLETE",
  rasterReuse: { runId: "34663873573", basis: "Both PDF hashes remain exact; this repair changes only input/status/map/guidance artifacts." }
};
fs.mkdirSync(path.join(ROOT, INPUT_EVIDENCE), { recursive: true });
fs.writeFileSync(path.join(ROOT, INPUT_EVIDENCE, "current-input-handling-proof.json"), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`AZ input follow-up PASS (${assertions} assertions; PDFs unchanged; missing/provided/invalid paths checked)`);
