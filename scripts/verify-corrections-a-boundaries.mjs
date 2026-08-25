import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTEGRATED_MODE = process.argv.includes("--integrated");
const EVALUATOR_PATH = path.join(ROOT, "src/lib/rcap-engine/evaluator.ts");
const PROJECTION_PATH = path.join(ROOT, "src/lib/rcap-engine/public-profile-projection.ts");
const FIXTURE_PATH = path.join(ROOT, "data/expungement-ai/corrections-a/runtime-fixtures.json");

if (!INTEGRATED_MODE) {
  const evaluatorSource = fs.readFileSync(EVALUATOR_PATH, "utf8");
  const projectionSource = fs.readFileSync(PROJECTION_PATH, "utf8");
  assert.match(
    evaluatorSource,
    /LA:first-offense-marijuana-expungement-after-90-days-art-998[\s\S]{0,200}timingFromAnchor\(profile, answers, rule, pathway, "disposition_date"/,
    "pre-integration proof no longer finds the incorrect Louisiana disposition-date anchor"
  );
  assert.doesNotMatch(
    evaluatorSource,
    /MS:additional-justice-or-municipal-court-misdemeanor-relief[\s\S]{0,200}timingFromExactAnchor/,
    "Mississippi exact runtime timing is already integrated; rerun with --integrated"
  );
  assert.doesNotMatch(
    projectionSource,
    /ms_last_conviction_date_any_court/,
    "Mississippi exact public facts are already integrated; rerun with --integrated"
  );
  console.log("verify-corrections-a-boundaries: GREEN (pre-integration defect reproduced)");
  console.log("Shared patch must be applied before running --integrated boundary proof.");
  process.exit(0);
}

process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register(
  pathToFileURL(path.join(ROOT, "scripts/corrections-a/native-ts-loader.mjs")).href,
  import.meta.url
);
const { evaluateScreening } = await import(pathToFileURL(EVALUATOR_PATH).href);
const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
const byRoute = new Map(fixture.routes.map((row) => [row.routeKey, row]));

function evaluate(routeKey, answerPatch) {
  const row = byRoute.get(routeKey);
  assert.ok(row, `${routeKey}: runtime fixture missing`);
  return evaluateScreening({
    jurisdiction: row.jurisdiction,
    profileVersion: row.profileVersion,
    matterId: `corrections-a-boundary-${routeKey}`,
    answers: { ...row.answers, ...answerPatch }
  });
}

function expect(routeKey, name, answerPatch, expected) {
  const result = evaluate(routeKey, answerPatch);
  assert.equal(result.pathwayId, routeKey.split(/:(.+)/)[1], `${routeKey}/${name}: pathway`);
  assert.equal(result.resultCode, expected.resultCode, `${routeKey}/${name}: result code`);
  assert.equal(result.paymentAllowed, expected.paymentAllowed, `${routeKey}/${name}: payment`);
  if (expected.missingQuestionId) {
    assert.ok(
      result.missingQuestionIds.includes(expected.missingQuestionId),
      `${routeKey}/${name}: missing exact anchor ${expected.missingQuestionId}`
    );
  }
  return result;
}

const ak = "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40";
expect(ak, "missing", { disposition_date: null }, { resultCode: "needs_more_info", paymentAllowed: false, missingQuestionId: "disposition_date" });
expect(ak, "early", { disposition_date: "2026-07-01" }, { resultCode: "not_yet", paymentAllowed: false });
expect(ak, "boundary", { disposition_date: "2026-06-26" }, { resultCode: "packet_ready_with_caution", paymentAllowed: true });
expect(ak, "late", { disposition_date: "2026-06-25" }, { resultCode: "packet_ready_with_caution", paymentAllowed: true });
expect(ak, "disqualifying", { case_outcome: "Misdemeanor conviction", disposition_date: "2020-01-01" }, { resultCode: "likely_not_eligible", paymentAllowed: false });

const la = "LA:first-offense-marijuana-expungement-after-90-days-art-998";
expect(la, "missing", { conviction_date: null }, { resultCode: "needs_more_info", paymentAllowed: false, missingQuestionId: "conviction_date" });
expect(la, "early", { conviction_date: "2026-06-01" }, { resultCode: "not_yet", paymentAllowed: false });
expect(la, "boundary", { conviction_date: "2026-05-27" }, { resultCode: "packet_ready_with_caution", paymentAllowed: true });
expect(la, "late", { conviction_date: "2026-05-26" }, { resultCode: "packet_ready_with_caution", paymentAllowed: true });
expect(la, "disqualifying", { conviction_date: "2020-01-01", special_preconditions_confirmed: "No" }, { resultCode: "needs_review", paymentAllowed: false });

const msAdditional = "MS:additional-justice-or-municipal-court-misdemeanor-relief";
expect(msAdditional, "missing", { ms_last_conviction_date_any_court: null }, { resultCode: "needs_more_info", paymentAllowed: false, missingQuestionId: "ms_last_conviction_date_any_court" });
expect(msAdditional, "early", { ms_last_conviction_date_any_court: "2025-01-01" }, { resultCode: "not_yet", paymentAllowed: false });
expect(msAdditional, "boundary", { ms_last_conviction_date_any_court: "2024-08-25" }, { resultCode: "needs_review", paymentAllowed: false });
expect(msAdditional, "late", { ms_last_conviction_date_any_court: "2024-08-24" }, { resultCode: "needs_review", paymentAllowed: false });

const msDui = "MS:first-offense-dui-expungement";
expect(msDui, "missing", { ms_successful_sentence_completion_date: null }, { resultCode: "needs_more_info", paymentAllowed: false, missingQuestionId: "ms_successful_sentence_completion_date" });
expect(msDui, "early", { ms_successful_sentence_completion_date: "2022-01-01" }, { resultCode: "not_yet", paymentAllowed: false });
expect(msDui, "boundary", { ms_successful_sentence_completion_date: "2021-08-25" }, { resultCode: "needs_review", paymentAllowed: false });
expect(msDui, "late", { ms_successful_sentence_completion_date: "2021-08-24" }, { resultCode: "needs_review", paymentAllowed: false });

const msMip = "MS:minor-in-possession-underage-alcohol-expungement";
expect(msMip, "dismissal missing", { case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted", ms_mip_dismissal_or_discharge_date: null }, { resultCode: "needs_more_info", paymentAllowed: false, missingQuestionId: "ms_mip_dismissal_or_discharge_date" });
expect(msMip, "dismissal early", { case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted", ms_mip_dismissal_or_discharge_date: "2025-09-01" }, { resultCode: "not_yet", paymentAllowed: false });
expect(msMip, "dismissal boundary", { case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted", ms_mip_dismissal_or_discharge_date: "2025-08-25" }, { resultCode: "needs_review", paymentAllowed: false });
expect(msMip, "conviction applicability missing", { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: null, ms_mip_sentence_completion_date: "2025-08-25", ms_mip_fine_payment_date: "2025-08-25" }, { resultCode: "needs_more_info", paymentAllowed: false, missingQuestionId: "ms_mip_fine_imposed" });
expect(msMip, "conviction no fine boundary", { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: "No", ms_mip_sentence_completion_date: "2025-08-25", ms_mip_fine_payment_date: null }, { resultCode: "needs_review", paymentAllowed: false });
expect(msMip, "conviction sentence missing", { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: "Yes", ms_mip_sentence_completion_date: null, ms_mip_fine_payment_date: "2025-08-25" }, { resultCode: "needs_more_info", paymentAllowed: false, missingQuestionId: "ms_mip_sentence_completion_date" });
expect(msMip, "conviction fine missing", { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: "Yes", ms_mip_sentence_completion_date: "2025-08-25", ms_mip_fine_payment_date: null }, { resultCode: "needs_more_info", paymentAllowed: false, missingQuestionId: "ms_mip_fine_payment_date" });
expect(msMip, "conviction both dates missing", { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: "Yes", ms_mip_sentence_completion_date: null, ms_mip_fine_payment_date: null }, { resultCode: "needs_more_info", paymentAllowed: false, missingQuestionId: "ms_mip_sentence_completion_date" });
expect(msMip, "conviction latest early", { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: "Yes", ms_mip_sentence_completion_date: "2024-01-01", ms_mip_fine_payment_date: "2025-09-01" }, { resultCode: "not_yet", paymentAllowed: false });
expect(msMip, "conviction boundary", { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: "Yes", ms_mip_sentence_completion_date: "2025-08-24", ms_mip_fine_payment_date: "2025-08-25" }, { resultCode: "needs_review", paymentAllowed: false });
expect(msMip, "conviction late", { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: "Yes", ms_mip_sentence_completion_date: "2025-08-24", ms_mip_fine_payment_date: "2025-08-23" }, { resultCode: "needs_review", paymentAllowed: false });

console.log("verify-corrections-a-boundaries: GREEN (integrated)");
console.log(JSON.stringify({ paidBoundaryCases: 10, mississippiBoundaryCases: 19 }, null, 2));
