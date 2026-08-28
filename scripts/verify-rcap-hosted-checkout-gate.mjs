#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const gatePath = path.join(root, "scripts/rcap-hosted-checkout-gate.mjs");
const entryPath = path.join(root, ".github/workflows/rcap-f1-ephemeral-staging.yml");
const hostedPath = path.join(root, ".github/workflows/rcap-hosted-acceptance-staging.yml");
const deployPath = path.join(root, "scripts/rcap-hosted-acceptance-deploy.mjs");
const resolverPath = path.join(root, "scripts/rcap-hosted-resolve-preview.mjs");
const gate = fs.readFileSync(gatePath, "utf8");
const entry = fs.readFileSync(entryPath, "utf8");
const hosted = fs.readFileSync(hostedPath, "utf8");
const deploy = fs.readFileSync(deployPath, "utf8");
const resolver = fs.readFileSync(resolverPath, "utf8");

let checks = 0;
const failures = [];
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function includesEvery(text, values, label) {
  for (const value of values) check(text.includes(value), `${label} is missing ${JSON.stringify(value)}`);
}

// Lane A supplies the exact final application SHA at dispatch time. The only
// reusable publication pin is the accepted worker source/digest pair, and the
// workflow's canonical-input diff decides whether that pair is still valid.
const RELEASE_CONTROL_BASE_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";
const ACCEPTED_WORKER_SOURCE_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";
const ACCEPTED_WORKER_DIGEST = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c";

includesEvery(gate, [
  "applicationShaExact",
  "hyflxnlhpmiqxvvcoiia",
  ACCEPTED_WORKER_DIGEST,
  "HOSTED_PREVIEW_DEPLOYMENT_ID",
  "vercel_project_identity_resolved",
  "/v13/deployments/",
  'deployment?.target === null || deployment?.target === "preview"',
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
  'routeKind === "legacy_retired"',
  'rendererKind === "packet_document_v1"',
  'rendererVersion === "1.0.0"',
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

check(
  gate.includes("routeIdentity.profileVersion === String(compiledProfile?.profileVersion)")
    && !/routeIdentity\.profileVersion\s*===\s*["'][^"']+["']/.test(gate),
  "Pennsylvania route gate must bind profileVersion to compiledProfile instead of a stale literal"
);
check(
  gate.includes("seeded_item_carries_reviewed_packet_information")
    && gate.includes("packetInformationReviewSafety")
    && gate.includes("briefcase_insert_returning_proves_row")
    && gate.includes("artifact_refs_json")
    && gate.includes('stored.packet_information_stage === "ready_to_generate"')
    && gate.includes("stored.packet_information_reviewed === true"),
  "Checkout fixture must carry an authoritative reviewed packet-information flow before the unpaid render probe"
);
check(
  gate.includes("convergeSellableScreening")
    && gate.includes('[routeIdentity.jurisdiction, ...["MS", "IL", "PA"].filter')
    && gate.includes("checkout_fixture_route_derived_from_authorities")
    && gate.includes("stored_row_matches_authoritative_resolver")
    && gate.includes("jurisdiction: checkoutRouteIdentity.jurisdiction")
    && gate.includes("pathway_label: checkoutRouteIdentity.pathwayLabel"),
  "Checkout fixture must fall back to an evaluator-proven sellable route and derive its metadata dynamically"
);

// A partial rebind is the dangerous shape: one constant moved, the other left
// behind, and the gate then pins a pair that was never published together.
check(![
  "264d2a240e5c857f55ee645f2683830e94f67c19",
  "f7ed0ad3a8f37a0c1446b62760b1a36fb163c926"
].some((superseded) => gate.includes(superseded)), "gate still pins a superseded application identity");
check(![
  "sha256:1d30530b726554b458a347fd9a00619e38e19d380f058c42504f56631de0f101",
  "sha256:4e5b58e4492289446bcbdd100bb39dcd13dd4512916679fa2a252e4532ab9530"
].some((superseded) => gate.includes(superseded)), "gate still pins a superseded worker identity");

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
  // The resolver reads the CANDIDATE from the inputs; the gate reads the
  // RESOLVED identity from the one resolution boundary.
  "HOSTED_PREVIEW_DEPLOYMENT_ID: ${{ inputs.preview_deployment_id }}",
  "node scripts/rcap-hosted-checkout-gate.mjs",
  "node scripts/verify-rcap-hosted-checkout-gate.mjs"
], "hosted workflow");
check(
  hosted.includes("preview_deployment_id")
    && entry.includes("hosted_replace_preview")
    && hosted.includes("replace_preview)")
    && deploy.includes("NEXT_PUBLIC_EXPUNGEMENT_AI_URL: RETURN_ORIGIN")
    && deploy.includes("rcapReturnOrigin=${RETURN_ORIGIN}")
    && deploy.includes("deterministic_nonproduction_return_alias_bound")
    && resolver.includes("rcapReturnOrigin")
    && resolver.includes("expectedHostedReturnOrigin")
    && gate.includes("expectedHostedReturnOrigin")
    && gate.includes("deployment?.meta?.rcapReturnOrigin === EXPECTED_RETURN_ORIGIN")
    && gate.includes('successUrl.searchParams.get("payment") === "return"')
    && gate.includes('cancelUrl.searchParams.get("checkout") === "canceled"')
    && gate.includes("successUrl.origin === previewUrl")
    && gate.includes("cancelUrl.origin === previewUrl"),
  "hosted deployment must build against and verify a deterministic SHA-scoped nonproduction return origin"
);
check(
  ["checkout_gate", "stripe_retarget"].every((phase) =>
    hosted.includes(`${phase} requires one exact Vercel deployment id`)
  ),
  "checkout_gate and stripe_retarget must each require one exact Vercel deployment id"
);

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
  const releaseIdentityContract = workflow.includes(ACCEPTED_WORKER_SOURCE_SHA)
    && workflow.includes(ACCEPTED_WORKER_DIGEST)
    && !workflow.includes("AUTHORIZED_APPLICATION_SHA")
    && !workflow.includes("VERCEL_ORG_ID")
    && !workflow.includes("VERCEL_PROJECT_ID")
    && workflow.includes('TOOLS_SHA_INPUT: ${{ inputs.tools_sha }}')
    && workflow.includes('WORKFLOW_SHA_INPUT: ${{ github.sha }}')
    && workflow.includes('[ "$TOOLS_SHA_INPUT" = "$WORKFLOW_SHA_INPUT" ]')
    && workflow.includes("git merge-base --is-ancestor")
    && workflow.includes("postcss.config.mjs")
    && workflow.includes("tailwind.config.ts")
    && workflow.includes('"${{ inputs.worker_source_sha }}" "${{ inputs.application_sha }}"')
    && workflow.includes('"${{ inputs.application_sha }}" "${{ inputs.tools_sha }}"');
  check(Boolean(inputGuard) && releaseIdentityContract, `${label} workflow release identity contract is incomplete`);
  for (const field of ["application_sha", "worker_source_sha", "worker_digest", "tools_sha"]) {
    const candidateDriven = field !== "application_sha"
      || inputGuard.includes("application_sha must be a full commit SHA");
    check(!inputGuard.includes('"${{ inputs.' + field + ' }}"') && candidateDriven,
      `${label} workflow does not safely transport candidate-driven ${field}`);
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
    RELEASE_CONTROL_BASE_SHA,
    "--",
    ...paths
  ], { cwd: root, encoding: "utf8" });
  // `git diff --quiet` exits 1 for "differs" but 128 for "bad revision" — and
  // treating 128 as merely-differs would report a missing object as a content
  // change. Anything other than a clean 0 or a genuine 1 is a broken check.
  if (run.status !== 0 && run.status !== 1) {
    failures.push(`git diff against ${RELEASE_CONTROL_BASE_SHA} could not run (exit ${run.status}): ${String(run.stderr ?? "").trim()}`);
    return false;
  }
  return run.status === 0;
}

check(gitDiffQuiet([
  "src", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts",
  "postcss.config.mjs", "tailwind.config.ts", "public",
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
