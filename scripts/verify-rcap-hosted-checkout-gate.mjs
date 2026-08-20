#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const gatePath = path.join(root, "scripts/rcap-hosted-checkout-gate.mjs");
const entryPath = path.join(root, ".github/workflows/rcap-f1-ephemeral-staging.yml");
const hostedPath = path.join(root, ".github/workflows/rcap-hosted-acceptance-staging.yml");
const gate = fs.readFileSync(gatePath, "utf8");
const entry = fs.readFileSync(entryPath, "utf8");
const hosted = fs.readFileSync(hostedPath, "utf8");

let checks = 0;
const failures = [];
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function includesEvery(text, values, label) {
  for (const value of values) check(text.includes(value), `${label} is missing ${JSON.stringify(value)}`);
}

// The accepted release. This verifier previously asserted the superseded pair
// (264d2a24 / sha256:1d30530b), so it did not merely fail to catch the gate
// going stale — it REQUIRED the stale value. A pin asserted in two places drifts
// as one fact, so both move together or neither does.
const ACCEPTED_APPLICATION_SHA = "f7ed0ad3a8f37a0c1446b62760b1a36fb163c926";
const ACCEPTED_WORKER_DIGEST = "sha256:4e5b58e4492289446bcbdd100bb39dcd13dd4512916679fa2a252e4532ab9530";

includesEvery(gate, [
  ACCEPTED_APPLICATION_SHA,
  "hyflxnlhpmiqxvvcoiia",
  ACCEPTED_WORKER_DIGEST,
  "HOSTED_PREVIEW_DEPLOYMENT_ID",
  "vercel_project_identity_resolved",
  "/v13/deployments/",
  'deployment?.target === null',
  'deployment?.meta?.rcapStripeConfigured === "true"',
  'deployment?.meta?.rcapRouteState === "staging_scoped"',
  "worker_pulled_by_immutable_digest",
  "/v1/webhook_endpoints",
  "single_existing_canonical_webhook_destination",
  "webhook_event_set_and_mode_preserved",
  "stripe_webhook_url_update_required",
  "header_only_bypass_reaches_application_json",
  "query_only_bypass_reaches_application_json",
  "canonical_webhook_reaches_application",
  "consumer_a_admitted_to_staging_scope",
  "consumer_b_outside_staging_scope",
  "anonymous_access_denied",
  "Path A — Non-conviction expungement",
  "consumer_caller_profile_and_eligibility_mapping_exact",
  "getProfileByJurisdiction",
  "isConsumerPaymentAllowed",
  'routeKind === "legacy_verified"',
  'rendererKind === "packet_document_v1"',
  'rendererVersion === "1.0.0"',
  'profileVersion === "1.3.0"',
  "briefcase_insert_returning_proves_row",
  "stored_row_matches_authoritative_resolver",
  "unpaid_render_returns_402",
  "checkoutSessionId",
  "exactly_one_real_stripe_session_for_item",
  "stripe_session_amount_mode_metadata_and_product_exact",
  "metadata_transitively_binds_user_person_item_matter_and_product",
  "checkout_return_page_shape_exact",
  "beginning_checkout_does_not_mark_paid_or_queue_work",
  "RCAP TEST CHECKOUT READY — ROGER ACTION REQUIRED",
  "fixtureRetainedForRoger = true"
], "gate");

// A partial rebind is the dangerous shape: one constant moved, the other left
// behind, and the gate then pins a pair that was never published together.
for (const superseded of [
  "264d2a240e5c857f55ee645f2683830e94f67c19",
  "sha256:1d30530b726554b458a347fd9a00619e38e19d380f058c42504f56631de0f101"
]) check(!gate.includes(superseded), `gate still pins the superseded identity ${superseded}`);

for (const eventType of [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.voided"
]) check(gate.includes(`"${eventType}"`), `gate does not pin ${eventType}`);

check((gate.match(/callApp\(previewUrl, "\/api\/expungement-ai\/checkout"/g) ?? []).length === 1,
  "gate must make exactly one application Checkout call");
check(!gate.includes("x-vercel-set-bypass-cookie"), "gate must never request a Vercel bypass cookie");
check(!/spawnSync\(["']docker["'],\s*\[["']run["']/.test(gate), "gate must not run the worker");
check(!/\bvercel@[^\n]*\bdeploy\b/.test(gate), "gate must not run Vercel deploy");
check(!/delete\s+from\s+/i.test(gate), "gate must retain the acceptance fixture");
check(!/payment_status\s*:\s*["']paid["']/.test(gate), "gate must not fabricate a paid Session");
check(!/evt_hosted_acceptance|signedBody\(|constructEvent/.test(gate), "gate must not synthesize a Stripe completion event");
check(!/fetch\([^\n]*api\.stripe\.com\/v1\/checkout\/sessions[^\n]*\{[^}]*method:\s*["']POST["']/s.test(gate),
  "gate must not create a Stripe Session directly");
check(gate.includes("queryEntries.length === 1"), "gate must reject duplicate bypass query parameters");
check(gate.includes("stripeGet(`/v1/checkout/sessions/${encodeURIComponent(checkoutSessionId)}`)"),
  "gate must retrieve the application-created Session from Stripe");

includesEvery(entry, [
  "hosted_checkout_gate",
  "preview_deployment_id",
  "phase: ${{ inputs.mode == 'hosted_full'",
  "preview_deployment_id: ${{ inputs.preview_deployment_id }}"
], "entry workflow");

includesEvery(hosted, [
  "checkout_gate",
  "preview_deployment_id",
  // The resolver reads the CANDIDATE from the inputs; the gate reads the
  // RESOLVED identity from the one resolution boundary.
  "HOSTED_PREVIEW_DEPLOYMENT_ID: ${{ inputs.preview_deployment_id }}",
  "node scripts/rcap-hosted-checkout-gate.mjs",
  "node scripts/verify-rcap-hosted-checkout-gate.mjs",
  "checkout_gate requires one exact Vercel deployment id"
], "hosted workflow");

// The gate and its verifier are driven by the normalized contract, not by
// hand-written phase lists. Eight independently-written `inputs.phase ==`
// conditions is exactly how `full` went missing from the matrix.
const gateStep = hosted.match(/- name: Prepare one real Pennsylvania Sandbox Checkout and stop unpaid[\s\S]*?\n\s+env:/)?.[0] ?? "";
check(Boolean(gateStep), "could not locate the Checkout gate step");
check(/steps\.contract\.outputs\.(gate|matrix)/.test(gateStep),
  "the Checkout gate step is not driven by the normalized phase contract");

// The verifier must run in EVERY phase that runs the gate. It previously ran
// only on `checkout_gate`, so a `full` run executed the gate while nothing
// checked that the gate still pinned the accepted release — which is precisely
// how a superseded pin reached a hosted acceptance run.
const verifyStep = hosted.match(/- name: Verify the reuse-only human Checkout gate[\s\S]*?run: node scripts\/verify-rcap-hosted-checkout-gate\.mjs/)?.[0] ?? "";
check(Boolean(verifyStep), "could not locate the Checkout gate verification step");
check(/steps\.contract\.outputs\.(gate|matrix)/.test(verifyStep),
  "the Checkout gate verifier is gated on a phase list rather than the contract, so a phase can run the gate without verifying it");
check(!/if:\s*inputs\.phase == 'checkout_gate'\s*$/m.test(verifyStep),
  "the Checkout gate verifier still runs only on the checkout_gate phase");

// `checkout_gate` must remain a gate-only phase: it may not run the matrix.
check(/checkout_gate\)\s*DEPLOY=false;\s*MATRIX=false;\s*GATE=true/.test(hosted),
  "the contract no longer confines checkout_gate to the gate alone");
// Resolver first, deploy step as the only permitted fallback for the create
// path; never a raw input on a consumer step.
check(/HOSTED_PREVIEW_DEPLOYMENT_ID: \$\{\{ steps\.resolve_preview\.outputs\.deployment_id( \|\| steps\.deploy_preview\.outputs\.deployment_id)? \}\}/.test(hosted),
  "the gate does not receive the deployment id from the resolution boundary");
check(hosted.includes("PREVIEW_DEPLOYMENT_ID_INPUT: ${{ inputs.preview_deployment_id }}"),
  "workflow must transport the deployment id through the environment");
check(!hosted.includes('"${{ inputs.preview_deployment_id }}"'),
  "workflow must not interpolate the untrusted deployment-id input into shell source");

for (const [label, workflow] of [["entry", entry], ["hosted", hosted]]) {
  const inputGuard = workflow.match(/- name: Refuse any input that is not the authorized pinned value[\s\S]*?\n\s+- name:/)?.[0] ?? "";
  check(Boolean(inputGuard), `${label} workflow input guard is missing`);
  for (const field of ["application_sha", "worker_source_sha", "worker_digest", "tools_sha"]) {
    check(!inputGuard.includes('"${{ inputs.' + field + ' }}"'),
      `${label} workflow interpolates untrusted ${field} into shell source`);
  }
}

const deployStep = hosted.match(/- name: Deploy the frozen application SHA to Vercel Preview[\s\S]*?\n\s+env:/)?.[0] ?? "";
check(Boolean(deployStep), "could not locate the Vercel deployment step");
check(!deployStep.includes("checkout_gate"), "checkout_gate must never satisfy the Vercel deployment step condition");
const migrateStep = hosted.match(/- name: Apply the authorized sequence to the acceptance project[\s\S]*?\n\s+env:/)?.[0] ?? "";
check(Boolean(migrateStep), "could not locate the migration step");
check(!migrateStep.includes("checkout_gate"), "checkout_gate must never satisfy the migration step condition");
const paymentStep = hosted.match(/- name: Run the hosted Stripe payment and packet-delivery journey[\s\S]*?\n\s+env:/)?.[0] ?? "";
check(Boolean(paymentStep), "could not locate the legacy payment step");
check(!paymentStep.includes("checkout_gate"), "checkout_gate must never run the legacy simulated payment journey");

function gitDiffQuiet(paths) {
  const run = spawnSync("git", [
    "diff", "--quiet",
    ACCEPTED_APPLICATION_SHA,
    "--",
    ...paths
  ], { cwd: root, encoding: "utf8" });
  // `git diff --quiet` exits 1 for "differs" but 128 for "bad revision" — and
  // treating 128 as merely-differs would report a missing object as a content
  // change. Anything other than a clean 0 or a genuine 1 is a broken check.
  if (run.status !== 0 && run.status !== 1) {
    failures.push(`git diff against ${ACCEPTED_APPLICATION_SHA} could not run (exit ${run.status}): ${String(run.stderr ?? "").trim()}`);
    return false;
  }
  return run.status === 0;
}

check(gitDiffQuiet([
  "src", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "public",
  "docs/record-clearing/field-map-drafts"
]),
  "checkout-gate branch changes frozen application inputs");
check(gitDiffQuiet([
  "package.json", "package-lock.json", "tsconfig.json", "scripts/rcap-render-worker.mjs",
  "deploy/rcap-render-worker/Dockerfile", "scripts/lib", "src"
]), "checkout-gate branch changes frozen worker inputs");

if (failures.length > 0) {
  console.error(`FAIL verify-rcap-hosted-checkout-gate — ${failures.length}/${checks} checks failed`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`OK verify-rcap-hosted-checkout-gate — ${checks} checks; reuse-only, one Session, unpaid stop, frozen inputs unchanged`);
