#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const entry = fs.readFileSync(path.join(root, ".github/workflows/rcap-f1-ephemeral-staging.yml"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/rcap-github-hosted-acceptance.yml"), "utf8");
const bootstrap = fs.readFileSync(path.join(root, "scripts/rcap-github-acceptance-bootstrap.mjs"), "utf8");
const gate = fs.readFileSync(path.join(root, "scripts/rcap-github-acceptance-gate.mjs"), "utf8");
const postPayment = fs.readFileSync(path.join(root, "scripts/rcap-github-post-payment-acceptance.mjs"), "utf8");

let checks = 0;
const failures = [];
function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}
function includesEvery(text, values, label) {
  for (const value of values) check(text.includes(value), `${label} is missing ${JSON.stringify(value)}`);
}

includesEvery(entry, [
  "github_acceptance",
  "./.github/workflows/rcap-github-hosted-acceptance.yml",
  "SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}",
  "HOSTED_STRIPE_TEST_SECRET: ${{ secrets.HOSTED_STRIPE_TEST_SECRET }}",
  "HOSTED_STRIPE_TEST_WEBHOOK_SECRET: ${{ secrets.HOSTED_STRIPE_TEST_WEBHOOK_SECRET }}"
], "dispatcher");

includesEvery(workflow, [
  "264d2a240e5c857f55ee645f2683830e94f67c19",
  "sha256:1d30530b726554b458a347fd9a00619e38e19d380f058c42504f56631de0f101",
  "hyflxnlhpmiqxvvcoiia",
  "CLOUDFLARED_VERSION: 2026.8.2",
  "fcfb02b575a52ca1af2e3267af4e1517bcdeb30ac48c834c69abaed3c0576ad2",
  "sha256sum --check --strict",
  "docs/record-clearing/field-map-drafts",
  "cloudflared tunnel --url http://127.0.0.1:3000",
  "HOSTED_PUBLIC_URL",
  "env -i",
  "./node_modules/.bin/next dev",
  "NODE_ENV=development",
  "RCAP_CONSUMER_DELIVERY_ROUTE_STATE=staging_scoped",
  "RCAP_CONSUMER_DELIVERY_STAGING_SCOPE=\"$RCAP_ACCEPTANCE_CONSUMER_A_ID\"",
  "NEXT_PUBLIC_EXPUNGEMENT_AI_URL=\"$HOSTED_PUBLIC_URL\"",
  "continue-on-error: true",
  "Publish the sanitized host and webhook handoff immediately",
  "Keep the same tunnel alive while Roger edits the existing destination",
  "Run the Pennsylvania pre-Checkout gate and create one unpaid Session",
  "Poll for Roger's real payment while preserving the same temporary host",
  "Run post-payment replay, immutable worker, private PDF, and delivery acceptance",
  "node scripts/rcap-github-post-payment-acceptance.mjs",
  "HOSTED_STRIPE_TEST_WEBHOOK_SECRET: ${{ secrets.HOSTED_STRIPE_TEST_WEBHOOK_SECRET }}",
  "Keep the verified same-host return surface available briefly",
  "source /tmp/rcap-acceptance-runtime.env",
  "rm -f /tmp/rcap-acceptance-runtime.env",
  "unset RCAP_ACCEPTANCE_ANON_KEY RCAP_ACCEPTANCE_SERVICE_ROLE_KEY"
], "fallback workflow");

check(!/\bVERCEL_(TOKEN|ORG_ID|PROJECT_ID|ENV|TARGET_ENV)\b/.test(workflow), "fallback workflow must not use Vercel credentials or classification variables");
check(!/(?:npm\s+exec\s+|npx\s+|\b)vercel(?:@[^\s]+)?\s+(?:deploy|pull|env|curl)|api\.vercel\.com/i.test(workflow), "fallback workflow must not invoke Vercel");
check(!workflow.includes("--prod"), "fallback workflow must not contain a production deploy flag");
check(!/supabase\s+db\s+(push|reset)|rcap-hosted-acceptance-migrate/.test(workflow), "fallback workflow must not run migrations");
check(!/docker\s+run/.test(workflow), "fallback workflow must not run the worker container");
check(!workflow.includes("x-vercel-protection-bypass"), "GitHub-hosted endpoint must not carry a Vercel bypass parameter");

function workflowRunBodies(text) {
  const lines = text.split("\n");
  const bodies = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)run:\s*(.*)$/);
    if (!match) continue;
    const indent = match[1].length;
    const body = [match[2]];
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index];
      const nextIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
      if (line.trim() && nextIndent <= indent) {
        index -= 1;
        break;
      }
      body.push(line);
    }
    bodies.push(body.join("\n"));
  }
  return bodies;
}
for (const body of workflowRunBodies(workflow)) {
  check(!body.includes("${{"), "run shell must receive GitHub inputs and secrets through env, not direct expression interpolation");
}

const appLaunch = workflow.match(/- name: Start the frozen application in an acceptance-only environment[\s\S]*?\n\s+- name:/)?.[0] ?? "";
check(Boolean(appLaunch), "could not locate isolated application launch step");
for (const forbidden of ["SUPABASE_ACCESS_TOKEN", "GITHUB_TOKEN", "VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"]) {
  check(!appLaunch.includes(forbidden), `application process environment includes ${forbidden}`);
}

includesEvery(bootstrap, [
  "legalease-rcap-acceptance",
  "ACTIVE_HEALTHY",
  "rcap_acceptance_environment_marker",
  "acceptance_not_production_proof",
  "acceptance-consumer-a@rcap-acceptance.test",
  "acceptance-consumer-b@rcap-acceptance.test",
  "RCAP_ACCEPTANCE_CONSUMER_A_ID",
  "/tmp/rcap-acceptance-runtime.env",
  "acceptance_runtime_file_private",
  "mode: 0o600",
  "readOnly: true"
], "bootstrap");
check(!/method:\s*["'](?:PATCH|PUT|DELETE)["']/.test(bootstrap), "bootstrap must not issue a mutating HTTP method");
check(!/\b(?:insert|update|delete)\s+(?:into|from|public\.)/i.test(bootstrap), "bootstrap must not issue mutating SQL");
check(!/process\.env\.GITHUB_ENV|appendFileSync\([^\n]*GITHUB_ENV/.test(bootstrap), "bootstrap must not export acceptance keys through GITHUB_ENV");

includesEvery(gate, [
  "rcap-github-acceptance-checkout-gate/v1",
  "HOSTED_PUBLIC_URL",
  ".trycloudflare.com",
  "/v1/webhook_endpoints",
  "single_existing_canonical_webhook_destination",
  "webhook_event_set_and_mode_preserved",
  "queryNames.length === 0",
  "stripe_webhook_url_update_required",
  "temporary_https_host_reaches_application_json",
  "canonical_webhook_reaches_application",
  "acceptance_auth_callbacks_bound_to_temporary_host",
  "consumer_a_admitted_to_staging_scope",
  "consumer_b_outside_staging_scope",
  "anonymous_access_denied",
  "Path A — Non-conviction expungement",
  "consumer_caller_profile_and_eligibility_mapping_exact",
  "consumer-render-request.ts",
  "eligibility-adapter.ts",
  "isConsumerPaymentAllowed",
  'routeKind === "legacy_verified"',
  'rendererKind === "packet_document_v1"',
  'rendererVersion === "1.0.0"',
  'profileVersion === "1.3.0"',
  "briefcase_insert_returning_proves_row",
  "stored_row_matches_authoritative_resolver",
  "unpaid_render_returns_402",
  "exactly_one_real_stripe_session_for_item",
  "stripe_session_amount_mode_metadata_and_product_exact",
  "metadata_transitively_binds_user_person_item_matter_and_product",
  "checkout_return_page_shape_exact",
  "beginning_checkout_does_not_mark_paid_or_queue_work",
  "RCAP TEST CHECKOUT READY — ROGER ACTION REQUIRED",
  "fixtureRetainedForRoger = true",
  "real_stripe_payment_and_canonical_webhook_observed",
  "same_host_continuation_url_exact",
  "workerRunByThisWorkflow: false"
], "checkout gate");

for (const eventType of [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "invoice.finalized",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.voided"
]) check(gate.includes(`"${eventType}"`), `gate does not pin ${eventType}`);

const webhookIndex = gate.indexOf("const endpoints = await listStripeCollection");
const healthIndex = gate.indexOf("temporary_https_host_reaches_application_json");
const mismatchIndex = gate.indexOf("if (!webhookUrlExact)");
const earlyReturnIndex = gate.indexOf('if (GATE_PHASE === "webhook")');
const authWriteIndex = gate.indexOf('method: "PATCH"');
const fixtureWriteIndex = gate.indexOf("insert into public.consumer_briefcase_items");
const realPaymentProofIndex = gate.indexOf('"real_stripe_payment_and_canonical_webhook_observed"');
const postPaymentRenderIndex = gate.indexOf('renderRequest = await callApp(previewUrl, "/api/expungement-ai/packet/render"');
check(webhookIndex >= 0 && earlyReturnIndex > webhookIndex, "webhook-only phase is not after the canonical comparison");
check(healthIndex > webhookIndex && mismatchIndex > healthIndex, "host/application proof must precede the webhook-host mismatch stop");
check(authWriteIndex > earlyReturnIndex, "acceptance Auth write can occur before the webhook-only stop");
check(fixtureWriteIndex > authWriteIndex, "Briefcase write can occur before canonical webhook and Auth checks");
check(realPaymentProofIndex >= 0 && postPaymentRenderIndex > realPaymentProofIndex, "render-job request can occur before real Stripe payment and webhook proof");
const returnEvidenceIndex = gate.indexOf("evidence.checkoutReturn =");
const unpaidRereadIndex = gate.indexOf("const afterItemResponse = await sql");
const returnFailureIndex = gate.indexOf('"checkout_return_page_shape_exact"');
check(returnEvidenceIndex >= 0 && unpaidRereadIndex > returnEvidenceIndex && returnFailureIndex > unpaidRereadIndex, "return URL evidence/order must preserve the unpaid DB reread before any return URL failure");
check((gate.match(/callApp\(previewUrl, "\/api\/expungement-ai\/checkout"/g) ?? []).length === 1, "gate must make exactly one application Checkout call");
check(!/api\.stripe\.com[^\n]*checkout\/sessions[\s\S]{0,300}method:\s*["']POST["']/.test(gate), "gate must not create a Stripe Session directly");
check(!/docker\s*["'],\s*\[["']run/.test(gate), "gate must not run a worker");
check(!/payment_status\s*:\s*["']paid["']/.test(gate), "gate must not fabricate paid state");
check(!/constructEvent|signedBody|evt_hosted_acceptance/.test(gate), "gate must not synthesize a webhook event");
check(!/delete\s+from/i.test(gate), "gate must retain the fixture");
check(!/x-vercel|VERCEL_/i.test(gate), "provider-neutral gate must not use Vercel concepts");

includesEvery(postPayment, [
  "rcap-github-post-payment-acceptance/v1",
  "real_checkout_session_is_paid",
  "canonical_webhook_applied_server_authoritative_payment",
  "one_real_checkout_completed_event_matches_database",
  "/v1/events/",
  "exactHttpStatusAvailableViaStripeEventApi: false",
  "manualEvidenceRequired: true",
  "real_event_byte_equivalent_replay_accepted",
  "realEventObjectMutated: false",
  "bodySerializedOnce: true",
  "real_event_replay_creates_no_second_authority_consumption_or_job",
  "one_payment_authority_one_job_zero_preworker_consumption",
  "target_is_only_claimable_worker_job",
  '"run", "--rm", "--env-file"',
  "RCAP_WORKER_CONTAINER_DIGEST",
  "immutable_worker_claims_and_finalizes_exact_job",
  "one_consumption_and_one_finalized_pennsylvania_job_exact",
  "rcap-packet-artifacts-private",
  "private_storage_bytes_reread_hash_and_pdf_validate",
  "consumer_a_briefcase_shows_ready",
  "consumer_a_downloads_exact_worker_pdf",
  "consumer_b_and_anonymous_cannot_download_worker_pdf",
  "owner_pdf_stream_records_completed_delivery",
  "fixturePreserved: true",
  "paidStateWrittenByScript: false",
  "workerStartedBeforeRealPaymentProof: false"
], "post-payment acceptance");
check(!/delete\s+from/i.test(postPayment), "post-payment acceptance must preserve the fixture");
check(!/update\s+public\.consumer_briefcase_items[\s\S]{0,300}payment_status/i.test(postPayment), "post-payment acceptance must not write paid state");
check(!/payment_status\s*:\s*["']paid["']/.test(postPayment), "post-payment acceptance must not fabricate a paid Stripe event");
check(!/evt_(?:hosted|synthetic|acceptance)_/i.test(postPayment), "post-payment acceptance must not invent a Stripe event id");
check(!postPayment.includes("--prod"), "post-payment acceptance must not use a production flag");
check(!/x-vercel|VERCEL_/i.test(postPayment), "post-payment acceptance must remain provider-neutral");
const realPaymentIndex = postPayment.indexOf('"real_checkout_session_is_paid"');
const webhookAppliedIndex = postPayment.indexOf('"canonical_webhook_applied_server_authoritative_payment"');
const replayIndex = postPayment.indexOf('const replayResponse = await callApp("/api/stripe/webhook"');
const replayIdempotencyIndex = postPayment.indexOf('"real_event_replay_creates_no_second_authority_consumption_or_job"');
const workerRunIndex = postPayment.indexOf('workerRun = spawnSync("docker"');
check(realPaymentIndex >= 0 && webhookAppliedIndex > realPaymentIndex && replayIndex > webhookAppliedIndex, "real event replay can occur before paid Session and canonical webhook proof");
check(replayIdempotencyIndex > replayIndex && workerRunIndex > replayIdempotencyIndex, "immutable worker can start before replay idempotency is proved");
check((postPayment.match(/spawnSync\("docker", \[\s*"run"/g) ?? []).length === 1, "post-payment acceptance must run the worker exactly once");
check(postPayment.indexOf("private_storage_bytes_reread_hash_and_pdf_validate") > workerRunIndex, "storage validation can occur before the immutable worker finishes");
check(postPayment.indexOf("consumer_a_downloads_exact_worker_pdf") > workerRunIndex, "owner PDF download can occur before the immutable worker finishes");

function gitDiffQuiet(paths) {
  return spawnSync("git", [
    "diff", "--quiet", "264d2a240e5c857f55ee645f2683830e94f67c19", "--", ...paths
  ], { cwd: root, encoding: "utf8" }).status === 0;
}
check(gitDiffQuiet(["src", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "public", "docs/record-clearing/field-map-drafts"]), "fallback branch changes frozen application inputs");
check(gitDiffQuiet(["package.json", "package-lock.json", "tsconfig.json", "scripts/rcap-render-worker.mjs", "deploy/rcap-render-worker/Dockerfile", "scripts/lib", "src"]), "fallback branch changes frozen worker inputs");

if (failures.length > 0) {
  console.error(`FAIL verify-rcap-github-hosted-acceptance — ${failures.length}/${checks} checks failed`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`OK verify-rcap-github-hosted-acceptance — ${checks} checks; temporary host, webhook-first stop, one unpaid Session, frozen inputs unchanged`);
