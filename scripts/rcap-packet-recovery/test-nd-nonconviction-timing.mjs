import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  computeNdNonconvictionDeadline,
  evaluateNdNonconvictionFailureBranch,
} from "./nd-nonconviction-timing.mjs";
import {
  prepareNdNonconvictionPacketFacts,
  runFamily,
} from "../build-census-v1-composed-treatment:nd-nonconviction-auto-close-verify.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT,
  "data/rcap-all50/overlays/census-v1/nd/composed-treatment:nd-nonconviction-auto-close-verify--custom-pleading");

const calendar = (start, end, legalHolidays = []) => ({
  jurisdiction: "ND",
  start,
  end,
  legalHolidays,
  confirmedComplete: true,
  verificationSource: `verified test calendar ${start} through ${end}`,
});

const eligible = (extra = {}) => ({
  orderEntryDate: "2025-08-01",
  asOfDate: "2025-10-02",
  dispositionDate: "2025-07-15",
  wholeCaseDisposition: "ALL_CHARGES_DISMISSED",
  caseWasEverAppealed: false,
  dismissalInPleaAgreementInvolvingConviction: false,
  unfitToProceedDisposition: false,
  lackCriminalResponsibilityAcquittal: false,
  calendarCoverage: calendar("2025-10-01", "2025-10-03"),
  publicAccessCheckedOn: "2025-10-02",
  recordStillPublicAfterPeriod: true,
  publicAccessEvidence: "dated public-index result",
  ...extra,
});

test("the cutoff and 61-day clock use order entry, excluding that date and ignoring a generic disposition date", () => {
  const result = evaluateNdNonconvictionFailureBranch(eligible());
  assert.equal(result.eligible, true);
  assert.equal(result.orderEntryDate, "2025-08-01");
  assert.equal(result.rawDay61, "2025-10-01");
  assert.equal(result.adjustedExpiration, "2025-10-01");
  assert.equal(result.firstAdministrativeCheckDate, "2025-10-02");
  assert.equal(result.entryDateExcluded, true);
  assert.equal(result.daysCounted, 61);
  assert.equal(result.mailServiceDaysAdded, 0);
  assert.equal(result.firstCheckIsProductStep, true);
});

test("pre-effective orders, unknown or mixed whole-case dispositions, and any appeal fail closed", () => {
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({ orderEntryDate: "2025-07-31" })).code,
    "PRE_EFFECTIVE_ORDER");
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({ wholeCaseDisposition: null })).code,
    "UNKNOWN_WHOLE_CASE_DISPOSITION");
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({ wholeCaseDisposition: "MIXED_OR_PARTIAL" })).code,
    "WHOLE_CASE_NOT_QUALIFYING");
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({ caseWasEverAppealed: null })).code,
    "UNKNOWN_APPEAL_HISTORY");
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({ caseWasEverAppealed: true })).code,
    "ANY_APPEAL_HISTORY_EXCLUDED");
});

test("each statutory-exception predicate must be known and false", () => {
  for (const field of ["dismissalInPleaAgreementInvolvingConviction", "unfitToProceedDisposition",
    "lackCriminalResponsibilityAcquittal"]) {
    assert.match(evaluateNdNonconvictionFailureBranch(eligible({ [field]: null })).code, /^UNKNOWN_/);
    assert.match(evaluateNdNonconvictionFailureBranch(eligible({ [field]: true })).code, /EXCEPTION$/);
  }
});

test("weekend and explicitly supplied legal-holiday last days extend under the supplied calendar", () => {
  const weekend = computeNdNonconvictionDeadline({
    orderEntryDate: "2025-08-04",
    calendarCoverage: calendar("2025-10-04", "2025-10-08"),
  });
  assert.deepEqual([weekend.rawDay61, weekend.adjustedExpiration, weekend.firstAdministrativeCheckDate],
    ["2025-10-04", "2025-10-06", "2025-10-07"]);

  const holiday = computeNdNonconvictionDeadline({
    orderEntryDate: "2025-08-06",
    calendarCoverage: calendar("2025-10-06", "2025-10-09", ["2025-10-06"]),
  });
  assert.deepEqual([holiday.rawDay61, holiday.adjustedExpiration, holiday.firstAdministrativeCheckDate],
    ["2025-10-06", "2025-10-07", "2025-10-08"]);
});

test("missing calendar data fails automatic calculation; explicitly verified dates are the closed alternative", () => {
  const missing = computeNdNonconvictionDeadline({ orderEntryDate: "2025-08-01" });
  assert.equal(missing.eligible, false);
  assert.equal(missing.code, "MISSING_VERIFIED_CALENDAR_OR_DEADLINES");
  assert.match(missing.participantInstruction, /complete verified North Dakota court-calendar window/i);
  const unconfirmed = computeNdNonconvictionDeadline({
    orderEntryDate: "2025-08-01",
    calendarCoverage: { ...calendar("2025-10-01", "2025-10-03"), confirmedComplete: false },
  });
  assert.equal(unconfirmed.code, "MISSING_VERIFIED_CALENDAR_OR_DEADLINES");
  const tooShort = computeNdNonconvictionDeadline({
    orderEntryDate: "2025-08-04",
    calendarCoverage: calendar("2025-10-04", "2025-10-06"),
  });
  assert.equal(tooShort.code, "CALENDAR_COVERAGE_ENDS_BEFORE_FIRST_CHECK");
  const explicit = computeNdNonconvictionDeadline({
    orderEntryDate: "2025-08-01",
    verifiedAdjustedExpiration: "2025-10-01",
    verifiedFirstCheckDate: "2025-10-02",
    deadlineVerificationSource: "participant-verified court calendar and clerk record",
  });
  assert.equal(explicit.eligible, true);
  assert.equal(explicit.computationMethod, "EXPLICITLY_COLLECTED_VERIFIED_DATES");

  const weekendExpiration = computeNdNonconvictionDeadline({
    orderEntryDate: "2025-08-01",
    verifiedAdjustedExpiration: "2025-10-04",
    verifiedFirstCheckDate: "2025-10-06",
    deadlineVerificationSource: "participant-verified court calendar and clerk record",
  });
  assert.equal(weekendExpiration.code, "VERIFIED_ADJUSTED_EXPIRATION_IS_WEEKEND");

  const weekendFirstCheck = computeNdNonconvictionDeadline({
    orderEntryDate: "2025-08-01",
    verifiedAdjustedExpiration: "2025-10-03",
    verifiedFirstCheckDate: "2025-10-04",
    deadlineVerificationSource: "participant-verified court calendar and clerk record",
  });
  assert.equal(weekendFirstCheck.code, "VERIFIED_FIRST_CHECK_IS_WEEKEND");
});

test("evaluation date is valid and future order or observation facts fail closed", () => {
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({ asOfDate: "not-a-date" })).code,
    "INVALID_AS_OF_DATE");
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({
    orderEntryDate: "2025-10-03",
  })).code, "FUTURE_ORDER_ENTRY_DATE");
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({
    publicAccessCheckedOn: "2025-10-03",
  })).code, "FUTURE_PUBLIC_ACCESS_CHECK");
});

test("premature, unknown and non-public post-period attempts do not enter the failure branch", () => {
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({ publicAccessCheckedOn: "2025-10-01" })).code,
    "PREMATURE_PUBLIC_ACCESS_CHECK");
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({ recordStillPublicAfterPeriod: null })).code,
    "UNKNOWN_PUBLIC_ACCESS_STATUS");
  assert.equal(evaluateNdNonconvictionFailureBranch(eligible({ recordStillPublicAfterPeriod: false })).code,
    "RECORD_NOT_PUBLIC_AFTER_PERIOD");
});

test("the packet-fact adapter refuses unknown gates and carries derived entry-date facts without inference", () => {
  assert.throws(() => prepareNdNonconvictionPacketFacts({}), /fail closed at INVALID_ORDER_ENTRY_DATE/);
  const facts = {
    "participant.full_legal_name": "Test Person", "participant.street_address": "1 Test Street",
    "participant.phone": "701-555-0100", "participant.email": "test@example.org",
    "case.court_name": "District Court", "case.court_location": "Test County, North Dakota",
    "case.number": "00-2025-CR-1", "case.order_entry_date": "2025-08-01",
    "case.as_of_date": "2025-10-02",
    "case.whole_case_disposition": "ALL_CHARGES_DISMISSED", "case.was_ever_appealed": false,
    "case.dismissal_in_plea_involving_conviction": false, "case.unfit_to_proceed_disposition": false,
    "case.lack_criminal_responsibility_acquittal": false,
    "case.calendar_coverage": calendar("2025-10-01", "2025-10-03"),
    "case.public_access_checked_on": "2025-10-02", "case.record_still_public": true,
    "case.public_access_evidence": "dated evidence", "case.clerk_response": "judicial action required",
  };
  const prepared = prepareNdNonconvictionPacketFacts(facts);
  assert.equal(prepared["derived.raw_day_61"], "2025-10-01");
  assert.equal(prepared["derived.adjusted_expiration"], "2025-10-01");
  assert.equal(prepared["derived.first_check_date"], "2025-10-02");
  assert.throws(() => prepareNdNonconvictionPacketFacts({
    ...facts, "case.as_of_date": "invalid",
  }), /fail closed at INVALID_AS_OF_DATE/);
  assert.throws(() => prepareNdNonconvictionPacketFacts({
    ...facts, "case.order_entry_date": "2025-10-03",
  }), /fail closed at FUTURE_ORDER_ENTRY_DATE/);
  assert.throws(() => prepareNdNonconvictionPacketFacts({
    ...facts, "case.public_access_checked_on": "2025-10-03",
  }), /fail closed at FUTURE_PUBLIC_ACCESS_CHECK/);
  const currentDateDefault = { ...facts };
  delete currentDateDefault["case.as_of_date"];
  assert.equal(prepareNdNonconvictionPacketFacts(currentDateDefault)["derived.first_check_date"], "2025-10-02");
});

function snapshotTree(directory) {
  const entries = [];
  const walk = (dir) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (item.isDirectory()) walk(file);
      else {
        const stat = fs.statSync(file);
        entries.push([path.relative(directory, file), {
          sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
          byteLength: stat.size,
          modifiedMs: stat.mtimeMs,
          changedMs: stat.ctimeMs,
        }]);
      }
    }
  };
  walk(directory);
  return entries.sort(([a], [b]) => a.localeCompare(b));
}

test("the production --check entrypoint validates both gates and is byte-for-byte read-only", async () => {
  const before = snapshotTree(OUT);
  const result = await runFamily(["--check"]);
  const after = snapshotTree(OUT);
  assert.equal(result.status, "CHECK_ONLY");
  assert.equal(result.eligibilityGatesValidated, 2);
  assert.equal(result.overlayDirectoryTouched, false);
  assert.deepEqual(after, before);
});

test("generated four-component maps carry collected case facts and preserve court-owned acts", () => {
  const map = JSON.parse(fs.readFileSync(path.join(OUT, "production-field-map.json"), "utf8"));
  assert.deepEqual(map.componentSet,
    ["clerk_correction_request", "enforcement_motion", "proposed_order", "filing_instructions"]);
  assert.equal(map.eligibilityGate.controllingDecision, "ND-NONCONVICTION-61-DAY-AUTO-CLOSE");
  const byComponent = new Map(map.maps.map((row) => [row.formNumber, row]));
  for (const component of ["clerk_correction_request", "enforcement_motion"]) {
    const factIds = new Set(byComponent.get(component).canonicalWrites.map((row) => row.factId));
    for (const factId of ["case.court_name", "case.court_location", "case.number",
      "derived.whole_case_statement", "case.order_entry_date", "derived.raw_day_61",
      "derived.adjusted_expiration", "derived.first_check_date", "derived.deadline_method",
      "derived.calendar_verification_source", "derived.appeal_history_statement",
      "derived.statutory_exceptions_statement", "case.public_access_checked_on", "case.public_access_evidence"]) {
      assert.ok(factIds.has(factId), `${component}: ${factId} was not carried`);
    }
    assert.equal([...factIds].some((field) => /disposition_date/i.test(field)), false);
  }
  const order = byComponent.get("proposed_order");
  assert.deepEqual(order.canonicalRefusals.map((row) => row.field).sort(), [
    "proposed_order.order_date", "proposed_order.order_decision", "proposed_order.order_signature",
  ]);
  assert.ok(order.canonicalRefusals.every((row) => row.category === "court_prosecutor_clerk_or_agency_owned"));

  const receipt = JSON.parse(fs.readFileSync(path.join(OUT, "source-receipt.json"), "utf8"));
  assert.ok(receipt.committedRecords.some((row) =>
    row.recordId === "legal-clear:2026-09-11:ND-NONCONVICTION-61-DAY-AUTO-CLOSE"
    && row.sha256 === "5e3b6fb6bdeff849949d1d2c44d9b4e7badfdf6e7ba38be6135c388df176b1f2"));
  const approval = JSON.parse(fs.readFileSync(path.join(OUT, "approval-request.json"), "utf8"));
  assert.deepEqual(approval.counselQuestionsRaised, []);
  const wiring = JSON.parse(fs.readFileSync(path.join(OUT, "product-wiring.json"), "utf8"));
  const canonical = JSON.parse(fs.readFileSync(path.join(OUT, "reports/rendered-artifacts.json"), "utf8"))
    .artifacts.find((row) => row.fixture === "canonical");
  assert.equal(wiring.binding.acceptanceReceipt.verdict, "RASTER_PASS");
  assert.equal(wiring.binding.acceptanceReceipt.workflowRunId, "34628970364");
  assert.equal(wiring.binding.acceptanceReceipt.boundToCanonicalSha256, canonical.sha256);
  assert.equal(wiring.binding.acceptanceReceipt.coversTheWholeFamily, true);
  const selected = JSON.parse(fs.readFileSync(path.join(ROOT,
    "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"), "utf8")).families
    .find((row) => row.familyId === "composed-treatment:nd-nonconviction-auto-close-verify")
    .selectedIndependentVerdict;
  assert.deepEqual(wiring.binding.lastIndependentVerification, selected
    ? { verdict: selected.verdict, lane: selected.lane, verifiedAtBase: selected.verifiedAtBase ?? null }
    : null);
  assert.notDeepEqual(wiring.binding.lastIndependentVerification, {
    verdict: "PASS_COMPLETE_INDEPENDENT", lane: "vf09",
    verifiedAtBase: "7fcfb7d40aafe7bd7350fc735ea09d16524cb757",
  });
  assert.equal(wiring.binding.supersededIndependentVerification.lane, "vf09");
  assert.match(wiring.binding.supersededAcceptanceReceipt.supersededBecause, /changed both fixture PDFs/);
  assert.deepEqual(wiring.binding.packetComponents.map((row) => row.componentId), map.componentSet);
  assert.equal(wiring.proposedRepresentation.components[0].sha256, canonical.sha256);
  const instructions = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");
  assert.match(instructions, /entry of the order/i);
  assert.match(instructions, /next-business-day public-index check is a LegalEase product step/i);
  assert.match(instructions, /mixed, partial, appealed, excluded or unknown case/i);
  assert.doesNotMatch(instructions, /confirm the composed instruments|reconfirm/i);
});
