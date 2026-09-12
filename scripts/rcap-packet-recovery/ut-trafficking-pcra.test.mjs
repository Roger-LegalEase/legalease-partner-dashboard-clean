import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems, groupIntoLines } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import {
  FAMILY_ID,
  fixtures,
  runFamily,
  validateUtTraffickingPcraFacts,
} from "../build-census-v1-census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "data/rcap-all50/overlays/census-v1/ut/census-pending-family:ut:path-l-vacatur-human-trafficking-related-expungement--official-pdf-fill");
const SOURCE = path.join(ROOT, "reference/utah/04_PCRA_Petition-2022-06-13.pdf");
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName } = require("pdf-lib");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const clone = (value) => structuredClone(value);

test("resolved eligibility gates accept verified true facts and refuse false or unknown facts", () => {
  assert.equal(validateUtTraffickingPcraFacts(fixtures.canonical).code, "ELIGIBLE_RULE_65C_TRAFFICKING_PCRA");
  const gates = [
    ["districtCourtOfConvictionConfirmed", "UNKNOWN_DISTRICT_COURT_GATE", "NOT_DISTRICT_COURT_OF_CONVICTION"],
    ["qualifyingOffenseConfirmed", "UNKNOWN_QUALIFYING_OFFENSE", "OFFENSE_NOT_CONFIRMED_QUALIFYING"],
    ["traffickingNexusConfirmed", "UNKNOWN_TRAFFICKING_NEXUS", "TRAFFICKING_NEXUS_NOT_CONFIRMED"],
    ["clearAndConvincingEvidenceReady", "UNKNOWN_EVIDENCE_BURDEN", "EVIDENCE_NOT_READY_FOR_CLEAR_AND_CONVINCING_STANDARD"],
  ];
  for (const [key, unknown, negative] of gates) {
    const absent = clone(fixtures.canonical); absent.eligibility[key] = null;
    assert.equal(validateUtTraffickingPcraFacts(absent).code, unknown);
    const falseFact = clone(fixtures.canonical); falseFact.eligibility[key] = false;
    assert.equal(validateUtTraffickingPcraFacts(falseFact).code, negative);
  }
});

test("record-derived nexus, evidence and attachment facts are mandatory and never inferred", () => {
  const noNexus = clone(fixtures.canonical); noNexus.ground.nexusFacts = [];
  assert.equal(validateUtTraffickingPcraFacts(noNexus).code, "MISSING_RECORD_DERIVED_NEXUS");
  const noSource = clone(fixtures.canonical); noSource.ground.nexusFacts[0].sourceRecord = "";
  assert.equal(validateUtTraffickingPcraFacts(noSource).code, "MISSING_RECORD_DERIVED_NEXUS");
  const noEvidence = clone(fixtures.canonical); noEvidence.evidence = [];
  assert.equal(validateUtTraffickingPcraFacts(noEvidence).code, "MISSING_SUPPORTING_EVIDENCE");
  const noJudgment = clone(fixtures.canonical); noJudgment.attachments.judgment = "";
  assert.equal(validateUtTraffickingPcraFacts(noJudgment).code, "MISSING_REQUIRED_FACT");
  const noAppealDecision = clone(fixtures.boundary); noAppealDecision.attachments.appellateDecision = "";
  assert.equal(validateUtTraffickingPcraFacts(noAppealDecision).code, "MISSING_APPELLATE_DECISION_ATTACHMENT");
  const noPriorMaterials = clone(fixtures.boundary); noPriorMaterials.attachments.priorPcraMaterials = "";
  assert.equal(validateUtTraffickingPcraFacts(noPriorMaterials).code, "MISSING_PRIOR_PCRA_ATTACHMENTS");
});

test("every yes branch requires its printed conditional history", () => {
  const appeal = clone(fixtures.canonical); appeal.history.directAppeal = {filed: true};
  assert.equal(validateUtTraffickingPcraFacts(appeal).code, "INCOMPLETE_CONDITIONAL_HISTORY");
  const prior = clone(fixtures.canonical); prior.history.priorProceeding1 = {filed: true};
  assert.equal(validateUtTraffickingPcraFacts(prior).code, "INCOMPLETE_CONDITIONAL_HISTORY");
  const pending = clone(fixtures.canonical); pending.history.pendingProceeding = {pending: true};
  assert.equal(validateUtTraffickingPcraFacts(pending).code, "INCOMPLETE_CONDITIONAL_HISTORY");
  const future = clone(fixtures.canonical); future.case.futureSentence = {exists: true};
  assert.equal(validateUtTraffickingPcraFacts(future).code, "INCOMPLETE_CONDITIONAL_HISTORY");
  const trial = clone(fixtures.canonical); trial.case.plea = "NOT_GUILTY";
  assert.equal(validateUtTraffickingPcraFacts(trial).code, "UNKNOWN_TRIAL_FINDER");
});

test("conditional fee-waiver and appointed-counsel elections require the source-printed attachments", () => {
  const waiver = clone(fixtures.canonical); waiver.options.requestFeeWaiver = true;
  assert.equal(validateUtTraffickingPcraFacts(waiver).code, "MISSING_FEE_WAIVER_CERTIFICATE");
  const lawyer = clone(fixtures.canonical); lawyer.options.requestCourtAppointedLawyer = true;
  assert.equal(validateUtTraffickingPcraFacts(lawyer).code, "MISSING_FINANCIAL_DECLARATION");
});

function snapshotTree(directory) {
  const rows = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else {
        const stat = fs.statSync(file);
        rows.push([path.relative(directory, file), hash(fs.readFileSync(file)), stat.size, stat.mtimeMs, stat.ctimeMs]);
      }
    }
  };
  walk(directory);
  return rows.sort(([a], [b]) => a.localeCompare(b));
}

test("real --check validates exact source and both fixtures without touching output", async () => {
  const before = snapshotTree(OUT);
  const result = await runFamily(["--check"]);
  const after = snapshotTree(OUT);
  assert.equal(result.status, "CHECK_ONLY");
  assert.equal(result.sourceSha256, "9c5bd552fab0ada747b6f680b61e48acf4eca89275e2c8ad86d7ee3d82e95a09");
  assert.equal(result.sourceFieldsMeasured, 111);
  assert.equal(result.fixturesValidated, 2);
  assert.equal(result.overlayDirectoryTouched, false);
  assert.deepEqual(after, before);
});

test("canonical and boundary PDFs preserve ten official pages and append the complete two-page treatment", async () => {
  const sourceBytes = fs.readFileSync(SOURCE);
  assert.equal(sourceBytes.length, 128059);
  assert.equal(hash(sourceBytes), "9c5bd552fab0ada747b6f680b61e48acf4eca89275e2c8ad86d7ee3d82e95a09");
  const source = await PDFDocument.load(sourceBytes);
  assert.equal(source.getPageCount(), 10);
  assert.equal(source.catalog.get(PDFName.of("AcroForm")), undefined);
  const sourcePageText = source.getPages().map((page) => groupIntoLines(extractTextItems(page)).map((line) => line.text).join(" "));
  const report = JSON.parse(fs.readFileSync(path.join(OUT, "reports/rendered-artifacts.json"), "utf8"));
  for (const artifact of report.artifacts) {
    const bytes = fs.readFileSync(path.join(ROOT, artifact.file));
    assert.equal(hash(bytes), artifact.sha256);
    assert.equal(bytes.length, artifact.byteLength);
    const pdf = await PDFDocument.load(bytes);
    assert.equal(pdf.getPageCount(), 12);
    assert.equal(pdf.catalog.get(PDFName.of("AcroForm")), undefined);
    for (let page = 0; page < 10; page += 1) {
      const outputText = groupIntoLines(extractTextItems(pdf.getPages()[page])).map((line) => line.text).join(" ");
      for (const marker of sourcePageText[page].split(" ").filter((word) => /^[A-Za-z]{9,}$/.test(word)).slice(0, 3)) {
        assert.ok(outputText.includes(marker), `${artifact.fixture}: official source marker ${marker} absent on page ${page + 1}`);
      }
    }
    const text = execFileSync("pdftotext", ["-layout", path.join(ROOT, artifact.file), "-"], {encoding: "utf8"})
      .replace(/\s+/g, " ");
    for (const phrase of ["ATTACHMENT A - GROUND ONE FACTUAL NEXUS AND EVIDENCE SCHEDULE",
      "clear and convincing evidence", "Vacate the conviction and sentence", "Attach the identified exhibits themselves"]) {
      assert.ok(text.includes(phrase), `${artifact.fixture}: missing ${phrase}`);
    }
  }
});

test("boundary production exercises conditional source sections while protected acts remain blank", () => {
  const map = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
  assert.equal(map.familyId, FAMILY_ID);
  const official = map.maps.find((row) => row.formNumber === "UT-RULE-65C-PCRA");
  const boundaryWrites = new Set(official.boundaryWrites.map((row) => row.field));
  for (const field of ["p1-respondent-county-name", "q10a-appellate-court", "q10g1-review-court",
    "q12-court", "q12-appeal-court", "q14b1-pending-court", "q18b1-future-court"]) assert.ok(boundaryWrites.has(field), field);
  for (const refusal of official.canonicalRefusals.filter((row) => ["signature-location", "signature-date", "signature",
    "attorney-cert-date", "attorney-cert-signature", "attorney-cert-name", "p1-new-case-number", "p1-judge"].includes(row.field))) {
    assert.ok(["PROTECTED_FIELD", "NOT_APPLICABLE_ON_THIS_ROUTE"].includes(refusal.completenessDisposition));
  }
  for (const field of ["q15-ground-two", "q15-ground-three", "q15-ground-four"]) {
    assert.equal(official.canonicalRefusals.find((row) => row.field === field).completenessDisposition,
      "OPTIONAL_PARTICIPANT_CONTENT");
  }
  assert.equal(official.canonicalRefusals.find((row) => row.field === "q20-appointed-lawyer").completenessDisposition,
    "PARTICIPANT_ELECTION_GENUINE");
  const instructions = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
  assert.match(instructions, /court-screened service/i);
  assert.match(instructions, /Do not invent recipients or serve the packet automatically/i);
  assert.match(instructions, /does not invent a filing fee, filing method, deadline, notary requirement, hearing date, or proposed order/i);
  const wiring = JSON.parse(fs.readFileSync(path.join(OUT, "product-wiring.json"), "utf8"));
  assert.equal(wiring.generationAllowed, false);
  assert.equal(wiring.runtimeSelectable, false);
  assert.equal(wiring.commercialRoutesOpened, 0);
  assert.equal(wiring.binding.acceptanceReceipt, null);
  assert.equal(wiring.binding.paymentEligible, false);
  assert.equal(wiring.binding.sponsorshipEligible, false);
  assert.match(wiring.binding.whyPaymentIsClosed, /Commercial authority comes from a Grade-A fulfillment record/);
  assert.deepEqual(wiring.binding.maintenanceRelationship, {
    rebuiltFrom: "scripts/build-census-v1-census-pending-family:UT:path-l-vacatur-human-trafficking-related-expungement.mjs",
    sharedBuildHost: null,
    reRasterRequiredWhen: "any fixture byte moves; the acceptance receipt binds exact hashes and refuses a packet nobody rendered",
    reVerificationRequiredWhen: "the packet bytes, its bound source, or its legal treatment changes",
  });
  assert.ok(Object.hasOwn(wiring.binding, "lastIndependentVerification"));
});
