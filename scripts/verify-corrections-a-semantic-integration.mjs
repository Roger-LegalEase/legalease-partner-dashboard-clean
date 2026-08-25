#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { evaluateScreening } = await import("@/lib/rcap-engine/evaluator");
const { getProfileByJurisdiction } = await import("@/lib/rcap-engine/profile-registry");
const { projectPublicProfile } = await import("@/lib/rcap-engine/public-profile-projection");
const { LEGAL_AUTHORITY, routePaymentAuthority } = await import("@/lib/legal-authority/index");

const closure = JSON.parse(fs.readFileSync(path.join(root, "data/expungement-ai/corrections-a/closure.json"), "utf8"));
const metadata = JSON.parse(fs.readFileSync(path.join(root, "data/expungement-ai/route-product-metadata.json"), "utf8"));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, "data/expungement-ai/corrections-a/runtime-fixtures.json"), "utf8"));
const evaluatorSource = fs.readFileSync(path.join(root, "src/lib/rcap-engine/evaluator.ts"), "utf8");

const PACKET = new Set([
  "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40",
  "LA:first-offense-marijuana-expungement-after-90-days-art-998",
  "MS:first-offense-dui-expungement",
  "MS:minor-in-possession-underage-alcohol-expungement"
]);
const AUTOMATIC = new Set([
  "CT:automatic-clean-slate-erasure-for-eligible-post-2000-convictions",
  "DC:dc_auto_expungement_16_802",
  "DC:dc_auto_sealing_16_805",
  "MD:automatic-expungement-under-crim-proc-10-105-1"
]);
const GUIDANCE = new Set([
  "CT:absolute-pardon-resulting-in-erasure",
  "DC:dc_juvenile_sealing_16_2335",
  "DE:pardon-based-discretionary-expungement-under-11-del-c-4375"
]);
const ATTORNEY_REVIEW = new Set([
  "MS:additional-justice-or-municipal-court-misdemeanor-relief"
]);
const INTENTIONAL_UNSUPPORTED = new Set(fixtures.routes.map((row) => row.routeKey).filter((key) =>
  !PACKET.has(key) && !AUTOMATIC.has(key) && !GUIDANCE.has(key) && !ATTORNEY_REVIEW.has(key)
));

assert.equal(closure.schemaVersion, "expai-corrections-a-closure/v2");
assert.equal(closure.routes.length, 36);
assert.deepEqual(
  Object.fromEntries(Object.entries(Object.groupBy(closure.routes, (row) => row.serviceBehavior)).map(([key, rows]) => [key, rows.length])),
  { packet: 4, intentional_unsupported: 24, guidance: 3, automatic: 4, attorney_review: 1 }
);
for (const row of closure.routes) {
  assert.ok(!/hold|reconfirm/i.test(row.serviceBehavior), `${row.routeKey}: service behavior is a renamed hold`);
  const expected = PACKET.has(row.routeKey) ? "packet"
    : AUTOMATIC.has(row.routeKey) ? "automatic"
      : GUIDANCE.has(row.routeKey) ? "guidance"
        : ATTORNEY_REVIEW.has(row.routeKey) ? "attorney_review"
          : "intentional_unsupported";
  assert.equal(row.serviceBehavior, expected, `${row.routeKey}: final service behavior`);
  assert.equal(row.checkoutExpected, PACKET.has(row.routeKey), `${row.routeKey}: checkout follows final service behavior`);
  assert.equal(metadata.routes[row.routeKey]?.serviceBehavior, expected, `${row.routeKey}: generated metadata carries final service behavior`);
}

const parseSet = (name) => new Set(
  [...(evaluatorSource.match(new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`))?.[1] ?? "").matchAll(/"([A-Z]{2}:[^"]+)"/g)]
    .map((match) => match[1])
);
const ratified = parseSet("RATIFIED_DEPLOYABLE_ROUTES");
const corrected = parseSet("CORRECTED_AWAITING_RECONFIRM_ROUTES");
const hardGate = parseSet("HARD_GATE_PENDING_ROUTES");
const held = parseSet("HELD_GUIDANCE_ROUTES");
const unsupported = parseSet("INTENTIONAL_UNSUPPORTED_ROUTES");
assert.deepEqual(unsupported, INTENTIONAL_UNSUPPORTED, "intentional unsupported set is exact");
for (const key of INTENTIONAL_UNSUPPORTED) {
  assert.ok(!ratified.has(key), `${key}: unsupported route remains ratified`);
  assert.ok(!corrected.has(key), `${key}: unsupported route remains awaiting reconfirmation`);
  assert.ok(!hardGate.has(key), `${key}: unsupported route remains a pending hard gate`);
  assert.ok(!held.has(key), `${key}: unsupported route remains a renamed hold`);
}
for (const key of PACKET) assert.ok(ratified.has(key), `${key}: approved packet route is not ratified`);

const msProfile = getProfileByJurisdiction("MS");
const msPublicIds = new Set(projectPublicProfile(msProfile).questions.map((question) => question.id));
for (const id of [
  "ms_last_conviction_date_any_court",
  "ms_successful_sentence_completion_date",
  "ms_mip_dismissal_or_discharge_date",
  "ms_mip_sentence_completion_date",
  "ms_mip_fine_imposed",
  "ms_mip_fine_payment_date"
]) assert.ok(msPublicIds.has(id), `MS exact public question missing: ${id}`);

const byRoute = new Map(fixtures.routes.map((row) => [row.routeKey, row]));
function evaluate(routeKey, patch) {
  const row = byRoute.get(routeKey);
  return evaluateScreening({
    jurisdiction: row.jurisdiction,
    profileVersion: row.profileVersion,
    matterId: `semantic-a-${routeKey}`,
    answers: { ...row.answers, ...patch }
  });
}
function expect(routeKey, patch, code, payment, reasonSuffix) {
  const result = evaluate(routeKey, patch);
  assert.equal(result.pathwayId, routeKey.split(/:(.+)/)[1], `${routeKey}: pathway`);
  assert.equal(result.resultCode, code, `${routeKey}: result`);
  assert.equal(result.paymentAllowed, payment, `${routeKey}: payment`);
  if (reasonSuffix) assert.ok(result.reasons.some((reason) => reason.code.endsWith(reasonSuffix)), `${routeKey}: reason ${reasonSuffix}`);
}

const msAdditional = "MS:additional-justice-or-municipal-court-misdemeanor-relief";
expect(msAdditional, { ms_last_conviction_date_any_court: null }, "needs_more_info", false, "waiting_anchor_missing");
expect(msAdditional, { ms_last_conviction_date_any_court: "2025-01-01" }, "not_yet", false, "waiting_period_not_satisfied");
expect(msAdditional, { ms_last_conviction_date_any_court: "2024-08-25" }, "needs_review", false, "legal_authority_referral_required");

const msDui = "MS:first-offense-dui-expungement";
expect(msDui, { ms_successful_sentence_completion_date: null }, "needs_more_info", false, "waiting_anchor_missing");
expect(msDui, { ms_successful_sentence_completion_date: "2022-01-01" }, "not_yet", false, "waiting_period_not_satisfied");
expect(msDui, { ms_successful_sentence_completion_date: "2021-08-25" }, "packet_ready_with_caution", true);

const msMip = "MS:minor-in-possession-underage-alcohol-expungement";
expect(msMip, { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: "Yes", ms_mip_sentence_completion_date: "2025-08-24", ms_mip_fine_payment_date: "2025-08-25" }, "packet_ready_with_caution", true);
expect(msMip, { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: "Yes", ms_mip_sentence_completion_date: "2024-01-01", ms_mip_fine_payment_date: "2025-09-01" }, "not_yet", false);
expect(msMip, { case_outcome: "Misdemeanor conviction", ms_mip_fine_imposed: "Yes", ms_mip_sentence_completion_date: null, ms_mip_fine_payment_date: "2025-08-25" }, "needs_more_info", false);

for (const key of INTENTIONAL_UNSUPPORTED) {
  const result = evaluate(key, {});
  assert.equal(result.resultCode, "not_covered_yet", `${key}: intentional unsupported result`);
  assert.equal(result.paymentAllowed, false, `${key}: unsupported checkout closed`);
  assert.ok(result.reasons.some((reason) => reason.code.endsWith("intentional_unsupported_route")), `${key}: unsupported reason is explicit`);
}

const sevenApprovedClosures = [
  "MS:dui-nonadjudication",
  "MS:intervention-court-completion-expungement",
  "MS:human-trafficking-survivor-vacatur-and-expungement",
  "MS:additional-justice-or-municipal-court-misdemeanor-relief",
  "NJ:marijuana-hashish-expungement-under-n-j-s-a-2c-52-5-1-5-2-and-6-1",
  "RI:path-f-marijuana-possession-expungement",
  "MT:deferred-sentence-dismissal-or-confidentiality-route"
];
for (const key of sevenApprovedClosures) {
  const contract = LEGAL_AUTHORITY.routes.find((route) => route.routeKey === key);
  assert.ok(contract, `${key}: approved legal contract missing`);
  assert.notEqual(routePaymentAuthority(contract), "packet_checkout", `${key}: approved checkout closure drifted`);
}

console.log("verify-corrections-a-semantic-integration: GREEN (36 final services; exact clocks; seven legal checkout closures)");
