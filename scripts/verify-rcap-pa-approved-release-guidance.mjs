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
const profile = JSON.parse(fs.readFileSync(
  path.join(root, "src/lib/rcap-engine/compiled/profiles/PA-pennsylvania.json"),
  "utf8"
));
const metadata = JSON.parse(fs.readFileSync(
  path.join(root, "data/expungement-ai/route-product-metadata.json"),
  "utf8"
));
const reclassifications = JSON.parse(fs.readFileSync(
  path.join(root, "data/rcap-ledger/sellable-pathway-reclassifications.json"),
  "utf8"
));
const authorityManifest = JSON.parse(fs.readFileSync(
  path.join(
    root,
    "data/expungement-ai/qa/authority/714f4d51f93461855b24c8644b6ea6ddad6d15f2/flow-manifest.json"
  ),
  "utf8"
));

const APPROVED_GUIDANCE = new Map([
  ["EXPAI-PA-3ef757d16d", "path-b-complete-acquittal-not-guilty-expungement"],
  ["EXPAI-PA-b248648fdc", "path-c-summary-conviction-expungement"],
  ["EXPAI-PA-d8306a7fc5", "path-d-ard-expungement"],
  ["EXPAI-PA-28d0faee89", "path-e-age-70-expungement"],
  ["EXPAI-PA-4d793b6257", "path-f-deceased-person-expungement"],
  ["EXPAI-PA-ce27cf7c39", "path-g-underage-drinking-conviction-expungement"],
  ["EXPAI-PA-a3a8b78d07", "path-h-pardon-based-expungement"],
  ["EXPAI-PA-64154031c7", "path-i-petition-for-limited-access"],
  ["EXPAI-PA-4390010741", "path-k-human-trafficking-vacatur-expungement"]
]);

const profileById = new Map(profile.pathways.map((pathway) => [pathway.id, pathway]));
const manifestById = new Map(authorityManifest.flows.map((flow) => [flow.flowId, flow]));
const reclassificationByKey = new Map(
  reclassifications.reclassifications.map((record) => [record.pathwayKey, record])
);

for (const [flowId, pathwayId] of APPROVED_GUIDANCE) {
  const flow = manifestById.get(flowId);
  assert.ok(flow, `${flowId}: canonical authority flow exists`);
  const evaluation = evaluateScreening({
    jurisdiction: "PA",
    profileVersion: profile.profileVersion,
    matterId: `pa-approved-guidance-${flowId}`,
    answers: flow.fixture.answers
  });
  assert.equal(evaluation.pathwayId, pathwayId, `${flowId}: exact pathway`);
  assert.equal(evaluation.resultCode, "guidance_only", `${flowId}: approved guidance terminal`);
  assert.equal(evaluation.paymentAllowed, false, `${flowId}: checkout remains closed`);
  assert.ok(
    evaluation.reasons.some((reason) => reason.code === "pa.approved_release_guidance_only"),
    `${flowId}: approved guidance reason`
  );
  assert.ok(
    evaluation.reasons.every((reason) => !/hold|lawrence/i.test(`${reason.code} ${reason.text}`)),
    `${flowId}: runtime reason contains no stale hold language`
  );

  const pathway = profileById.get(pathwayId);
  assert.equal(
    pathway?.lawrenceRatification?.lawrence_review,
    "approved_release_guidance_only",
    `${flowId}: compiled approval state`
  );
  assert.equal(pathway?.lawrenceRatification?.status, "approved_release_behavior");
  assert.equal(pathway?.lawrenceRatification?.packet_capable, false);
  assert.equal(pathway?.lawrenceRatification?.payment_allowed_when_engine_confirms, false);
  assert.match(
    pathway?.lawrenceRatification?.legal_basis ?? "",
    /Roger Roman and the LegalEase legal team/
  );

  const route = metadata.routes[`PA:${pathwayId}`];
  assert.equal(route?.serviceBehavior, "guidance", `${flowId}: metadata service behavior`);
  assert.equal(route?.evaluatorTier, "APPROVED_RELEASE_GUIDANCE_ROUTES");
  assert.equal(route?.legalSignoffStatus, "approved_guidance");
  assert.equal(route?.paidRouteBlocker, "not_paid_product");
  assert.deepEqual(route?.openLegalActionRequiredItems, []);
  assert.equal(route?.checkoutEligibility, "not_eligible");
  assert.equal(route?.filingReadiness, "guidance_only");

  const reclassification = reclassificationByKey.get(`PA:${pathwayId}`);
  assert.equal(reclassification?.previousClassification, "paid_packet_intended");
  assert.equal(reclassification?.newClassification, "product_scope_exclusion");
  assert.equal(reclassification?.reason, "product_scope_decision");
  assert.match(reclassification?.authority ?? "", /Roger Roman/);
  assert.match(reclassification?.authority ?? "", /LegalEase legal team/);
}

const pathA = profileById.get("path-a-non-conviction-expungement");
assert.equal(pathA?.lawrenceRatification?.lawrence_review, "approved_release_packet");
assert.equal(pathA?.lawrenceRatification?.status, "ratified_deployable");
assert.equal(pathA?.lawrenceRatification?.packet_capable, true);
assert.equal(pathA?.lawrenceRatification?.payment_allowed_when_engine_confirms, true);

const pathJ = profileById.get("path-j-clean-slate-automatic-limited-access");
assert.equal(pathJ?.lawrenceRatification?.lawrence_review, "approved_automatic_no_filing");
assert.equal(pathJ?.lawrenceRatification?.status, "approved_release_behavior");
assert.equal(pathJ?.lawrenceRatification?.packet_capable, false);
assert.equal(pathJ?.lawrenceRatification?.payment_allowed_when_engine_confirms, false);

console.log("verify-rcap-pa-approved-release-guidance: GREEN (9 guidance; A packet/review fallback; J automatic)");
