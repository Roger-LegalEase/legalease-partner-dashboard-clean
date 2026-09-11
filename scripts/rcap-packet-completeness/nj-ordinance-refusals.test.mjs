import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  NJ_PARTICIPANT_LATER_COMPLETION_FIELDS,
  NJ_PARTICIPANT_LATER_COMPLETION_REGISTRY,
  njParticipantLaterCompletionSourceStage,
} from "./nj-participant-later-completion.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FAMILY = path.join(ROOT,
  "data/rcap-all50/overlays/census-v1/nj/nj-ordinance-set--official-pdf-fill");
const SOURCE = path.join(ROOT,
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/NJ/02_PACKET_FORMS/"
  + "NJ__FORM__CN-10557__cn-10557-new-jersey-expungement-kit__REV-2020-06__EN.pdf");
const SOURCE_SHA256 = "c1dd37b5e27bd76ea2330b07f51847c420d359db8f10c0576682e6558d09c5f7";

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(FAMILY, name), "utf8"));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const fieldRows = () => new Map(readJson("production-field-map.json").documents[0].fields
  .map((row) => [row.field, row]));

const HISTORY = [
  "dismissDt", "dismissOff1", "dismissOff2", "dismissPlea", "acquitDt", "acquitOff1",
  "acquitOff2", "acquitCrt", "dismissPtiDt", "dismissPtiOff1", "dismissPtiOff2",
  "dismissCrt", "contDismissDt", "contDismissOff1", "contDismissCrt",
  "contDismissPlea", "contAcquitDt", "contAcquitOff1", "contAcquitOff2", "contAcquitCrt",
  "contDismissPtiDt", "contDismissPtiOff1", "contDismissPtiOff2", "contDismissPtiCrt",
  "contGuiltyDt", "contGuiltyOff1", "contGuiltyOff2", "contGuiltyStatute",
  "contGuiltyFinal1", "contGuiltyFinal2", "contGuiltyCrt", "contGuiltyTimeType",
  "contGuiltyDocCmpltDt", "contGuiltyProbDt", "contGuiltyFineDt",
];
const LATER_COURT_COPY = ["ExpungeDocketNum", "expungDocketNum", "CoverLtrEHearDt", "CoverLtrEHearTime"];
const RECIPIENTS = [
  "prosCntys", "PoliceLoc", "WardenLoc", "SuperintendentLoc", "deputyClerkSCCOCnty",
  "SheriffLoc", "SheriffAddrStr", "SheriffAddr2", "ProsCntyName", "ProsAddrStr",
  "PoliceAddrStr", "PoliceAddr2", "SuperintendentAddrStr", "SuperintendentAddr2",
  "WardenAddrStr", "WardenAddr2",
];
const INITIAL_RECIPIENTS = new Set([
  "prosCntys", "PoliceLoc", "WardenLoc", "SuperintendentLoc", "deputyClerkSCCOCnty",
]);
const MAILING = ["CoverLtrEDt", "mailPetition", "CoverLtrGDt"];
const LATER = [...LATER_COURT_COPY, ...RECIPIENTS.filter((field) => !INITIAL_RECIPIENTS.has(field)),
  ...MAILING];
const SPECIAL_ELECTIONS = ["gradDC", "marijuana", "cleanSlate"];
const REVIEWED_FIELDS = new Set([...HISTORY, ...LATER_COURT_COPY, ...RECIPIENTS,
  ...MAILING, ...SPECIAL_ELECTIONS, "guilty"]);

test("all 62 VF62 semantic fields are covered and complete history is conditional, never route-wide N/A", () => {
  assert.equal(REVIEWED_FIELDS.size, 62);
  const rows = fieldRows();
  const guide = fs.readFileSync(path.join(FAMILY, "participant-instructions.md"), "utf8");
  assert.match(guide, /all arrests, charges and prosecutions, including matters for which relief is not sought/i);
  assert.match(guide, /Treat a conditional branch as N\/A only when the complete source record establishes/i);
  for (const field of HISTORY) {
    const row = rows.get(field);
    assert.ok(row, `${field}: missing from field map`);
    assert.equal(row.decision, "refuse");
    assert.equal(row.refusalClass, null, `${field}: ordinary fact/election hidden behind generic class`);
    assert.equal(row.completenessDisposition, "REQUIRED_BEFORE_FILING");
    assert.equal(row.requiredBeforeFiling, true);
    assert.equal(row.requiredBeforeInitialFiling, true);
    assert.equal(row.conditionalCaseHistory, true);
    assert.equal(row.caseApplicability, "UNKNOWN_REQUIRES_PARTICIPANT_VERIFICATION");
    assert.ok(!/NOT_APPLICABLE_ON_THIS_ROUTE/.test(JSON.stringify(row)));
    assert.ok(guide.includes(row.effectiveLabel), `${field}: source label absent from guide`);
  }
  for (const field of ["dismissPlea", "contDismissPlea"]) {
    assert.equal(rows.get(field).participantElection, true);
    assert.equal(rows.get(field).determinedByTheCaseNotTheRoute, true);
  }
});

test("court-assigned facts, recipient details and mailing facts have participant ownership at the source stage", () => {
  const rows = fieldRows();
  const guide = fs.readFileSync(path.join(FAMILY, "participant-instructions.md"), "utf8");
  const initial = guide.split("## Exact facts to verify before the initial filing\n")[1]
    ?.split("\n## Participant tasks after the initial filing")[0] ?? "";
  const later = guide.split("## Participant tasks after the initial filing\n")[1]
    ?.split("\n## ")[0] ?? "";

  for (const field of LATER_COURT_COPY) {
    const row = rows.get(field);
    assert.equal(row.participantOwnedCompletion, true, `${field}: participant copy task lost`);
    assert.equal(row.blankTreatment, "PARTICIPANT_LATER_COMPLETION");
    assert.equal(row.completenessDisposition, "PARTICIPANT_LATER_COMPLETION");
    assert.equal(row.requiredBeforeFiling, false, `${field}: still described as required before filing`);
    assert.equal(row.requiredBeforeInitialFiling, false, `${field}: still blocks initial filing`);
    assert.match(row.factOrigin, /participant_copied/);
    assert.equal(row.refusalClass, null);
    assert.ok(later.includes(`source field: \`${field}\``), `${field}: absent from later tasks`);
    assert.equal(initial.includes(`source field: \`${field}\``), false);
  }
  assert.equal(rows.get("expungDocketNum").completesAfterService, true);
  assert.equal(rows.get("CoverLtrEHearDt").completesAfterService, false);
  assert.equal(rows.get("CoverLtrEHearTime").completesAfterService, false);

  for (const field of RECIPIENTS) {
    const row = rows.get(field);
    assert.equal(row.participantOwnedCompletion, true, `${field}: recipient mistaken for writer`);
    assert.equal(row.conditionalRecipient, true);
    assert.equal(row.refusalClass, null);
    assert.equal(row.requiredBeforeInitialFiling, INITIAL_RECIPIENTS.has(field));
    assert.equal(row.requiredBeforeFiling, INITIAL_RECIPIENTS.has(field));
    assert.equal(row.completenessDisposition, INITIAL_RECIPIENTS.has(field)
      ? "REQUIRED_BEFORE_FILING" : "PARTICIPANT_LATER_COMPLETION");
    const section = INITIAL_RECIPIENTS.has(field) ? initial : later;
    assert.ok(section.includes(`source field: \`${field}\``), `${field}: absent from correct stage`);
  }

  for (const field of MAILING) {
    const row = rows.get(field);
    assert.equal(row.blankTreatment, "PARTICIPANT_LATER_COMPLETION");
    assert.equal(row.completenessDisposition, "PARTICIPANT_LATER_COMPLETION");
    assert.equal(row.requiredBeforeFiling, false, `${field}: still described as required before filing`);
    assert.equal(row.requiredBeforeInitialFiling, false, `${field}: still blocks initial filing`);
    assert.equal(row.completesAfterService, true, `${field}: mailing/proof timing is false`);
    assert.ok(later.includes(`source field: \`${field}\``));
    assert.equal(initial.includes(`source field: \`${field}\``), false);
  }
  assert.match(guide, /Copy the assigned docket number; leave the judge's signature alone/i);
  assert.doesNotMatch(guide, /Leave the docket number and the signature to their owners/i);

  assert.deepEqual([...NJ_PARTICIPANT_LATER_COMPLETION_FIELDS].sort(), [...LATER].sort());
  for (const field of LATER) {
    const row = rows.get(field);
    const expected = NJ_PARTICIPANT_LATER_COMPLETION_REGISTRY[field];
    assert.deepEqual(row.sourceStage, njParticipantLaterCompletionSourceStage(field),
      `${field}: source-stage claim drift`);
    assert.equal(row.routeDetermined, false);
    assert.equal(row.completionStage, expected.trigger);
    assert.equal(row.completesAfterService, expected.completesAfterService);
    assert.ok(later.split(/\r?\n/).some((line) => line.includes(`source field: \`${field}\``)
      && line.includes(`<!-- source-stage: ${expected.trigger} -->`)),
    `${field}: exact source field and machine stage are not disclosed together`);
  }
});

test("special-relief and guilty controls remain unmarked participant decisions without fake held answers", () => {
  const rows = fieldRows();
  const guide = fs.readFileSync(path.join(FAMILY, "participant-instructions.md"), "utf8");
  for (const field of SPECIAL_ELECTIONS) {
    const row = rows.get(field);
    assert.equal(row.participantElection, true);
    assert.equal(row.refusalClass, "participant_sworn_narrative_or_legal_election");
    assert.notEqual(row.refusalClass, "court_prosecutor_clerk_or_agency_owned");
    assert.match(row.reason, /CN-10557 tells the participant to check this only/i);
    assert.ok(guide.includes(`source field: \`${field}\``));
  }
  const guilty = rows.get("guilty");
  assert.equal(guilty.requiredBeforeFiling, true);
  assert.equal(guilty.determinedByTheCaseNotTheRoute, true);
  assert.match(guilty.whyTheRouteCannotDetermineIt, /municipal-ordinance route/i);
  assert.match(guide, /This is unresolved, not a held answer/i);

  const actual = readJson("reports/actual-writes.json");
  for (const artifact of actual.artifacts) {
    assert.deepEqual(artifact.selections, []);
    assert.equal(artifact.heldButNotPrinted.some((row) => row.field === "guilty"), false);
    assert.deepEqual(artifact.unresolvedParticipantElections.map((row) => row.field), ["guilty"]);
    assert.equal(artifact.unresolvedParticipantElections[0].valueHeld, null);
    assert.equal(artifact.unresolvedParticipantElections[0].reason,
      "conditional_participant_election_unresolved");
  }
});

test("saved refusals state the field-map or actual row/mapping/fit reason", () => {
  const rows = fieldRows();
  const actual = readJson("reports/actual-writes.json");
  for (const artifact of actual.artifacts) {
    assert.equal(artifact.refused.some((row) => row.reason === "classified_unwritable_by_role"), false);
    const actualCause = new Map([...artifact.heldButNotPrinted,
      ...artifact.unresolvedParticipantElections].map((row) => [row.field, row.reason]));
    for (const refusal of artifact.refused) {
      if (actualCause.has(refusal.field)) {
        assert.equal(refusal.reason, actualCause.get(refusal.field),
          `${artifact.fixture}/${refusal.field}: competing actual cause`);
      } else if (rows.get(refusal.field)?.decision === "refuse") {
        assert.equal(refusal.reason, rows.get(refusal.field).reason,
          `${artifact.fixture}/${refusal.field}: refusal disagrees with effective map`);
      }
    }
    const refusedByField = new Map(artifact.refused.map((row) => [row.field, row]));
    for (const field of LATER) {
      assert.equal(refusedByField.get(field)?.category, "participant_later_completion",
        `${artifact.fixture}/${field}: saved refusal lost later participant category`);
      assert.equal(refusedByField.get(field)?.semanticDisposition, "PARTICIPANT_LATER_COMPLETION",
        `${artifact.fixture}/${field}: saved refusal disagrees with effective map disposition`);
    }
    const held = new Map(artifact.heldButNotPrinted.map((row) => [row.field, row]));
    assert.equal(held.get("ExpungeCntyName").reason, "exact_mapping_requires_text_field");
    if (artifact.fixture === "boundary") {
      assert.equal(held.get("arrest1CaseNum").reason,
        "value_exceeds_widget_width_at_minimum_font");
    } else {
      assert.equal(held.get("arrest1CaseNum").reason, "withheld_for_row_integrity");
    }
  }
});

test("the exact source and accepted PDF/raster identities remain unchanged", () => {
  assert.equal(sha256(SOURCE), SOURCE_SHA256);
  const receipt = readJson("source-receipt.json");
  assert.equal(receipt.documents[0].sha256, SOURCE_SHA256);
  const expectedPdfs = new Map([
    ["canonical", "03f6169d042fc1d5ed30df008dfc966ef3d03b382731f5956d0e8786ca8a234f"],
    ["boundary", "23a571af72985717963001120ba60116ae43054aaa1c2fddbeece944dac24494"],
  ]);
  const rendered = readJson("reports/rendered-artifacts.json");
  for (const pdf of rendered.pdfs) assert.equal(pdf.sha256, expectedPdfs.get(pdf.fixture));
  assert.equal(rendered.rasters.reduce((count, raster) => count + raster.pages.length, 0), 86);
  assert.ok(rendered.rasters.every((raster) => raster.engine === "bundled_poppler_pdftoppm"));
  const wiring = readJson("product-wiring.json");
  assert.equal(wiring.binding.acceptanceReceipt.verdict, "RASTER_PASS");
  assert.equal(wiring.binding.acceptanceReceipt.boundToCanonicalSha256, expectedPdfs.get("canonical"));
  const actual = readJson("reports/actual-writes.json");
  for (const artifact of actual.artifacts) {
    assert.deepEqual(artifact.proof.protectedInk, []);
    assert.deepEqual(artifact.proof.protectedVectorInk, []);
    const written = new Set(artifact.written.map((row) => row.field));
    for (const refusal of artifact.refused) {
      assert.equal(written.has(refusal.field), false, `${artifact.fixture}/${refusal.field}: refused field was written`);
    }
  }
});
