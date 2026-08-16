#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const gatePath = path.join(root, "scripts/rcap-hosted-checkout-gate.mjs");
const paymentPath = path.join(root, "scripts/rcap-hosted-acceptance-payment.mjs");
const deployPath = path.join(root, "scripts/rcap-hosted-acceptance-deploy.mjs");
const galleryPath = path.join(root, "scripts/rcap-hosted-acceptance-gallery.mjs");
const terminalizationPath = path.join(root, "data/rcap-ledger/track-terminalization.json");
const problematicPdfPath = path.join(root, "data/rcap-all50/problematic-pdf-register.json");
const authPath = path.join(root, "scripts/rcap-hosted-acceptance-auth-config.mjs");
const entryPath = path.join(root, ".github/workflows/rcap-f1-ephemeral-staging.yml");
const hostedPath = path.join(root, ".github/workflows/rcap-hosted-acceptance-staging.yml");
const gate = fs.readFileSync(gatePath, "utf8");
const payment = fs.readFileSync(paymentPath, "utf8");
const deploy = fs.readFileSync(deployPath, "utf8");
const gallery = fs.readFileSync(galleryPath, "utf8");
const terminalization = JSON.parse(fs.readFileSync(terminalizationPath, "utf8"));
const problematicPdf = JSON.parse(fs.readFileSync(problematicPdfPath, "utf8"));
const auth = fs.readFileSync(authPath, "utf8");
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

includesEvery(gate, [
  "664b8ddd374642bf2bd1820f7e05224f3dd081bc",
  "hyflxnlhpmiqxvvcoiia",
  "sha256:e958cb057abaa1c22902d01ffe0e42aec0feb09118ba9f2bc44210cbdeb244c7",
  "HOSTED_PREVIEW_DEPLOYMENT_ID",
  "vercel_project_identity_resolved",
  "/v13/deployments/",
  'deployment?.target === null',
  'deployment?.meta?.rcapStripeConfigured === "true"',
  'deployment?.meta?.rcapRouteState === "staging_scoped"',
  'deployment?.meta?.rcapPublicOrigin === EXPECTED_ACCEPTANCE_ORIGIN',
  "rcap-acceptance-${EXPECTED_PROJECT_REF}.vercel.app",
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
  "/api/expungement-ai/evaluate",
  "hosted_dtc_free_check_authoritative_pa_path_a",
  'hostedEvaluation?.resultCode === "packet_ready_with_caution"',
  'hostedEvaluation?.paymentAllowed === true',
  "/api/expungement-ai/screening/pending",
  'product: "expungement_ai_dtc"',
  "anonymous_pending_result_created_from_screening_inputs",
  "/api/expungement-ai/screening/pending/claim",
  "authenticated_pending_claim_created_authoritative_briefcase_item",
  "pending_claim_persisted_authoritative_unpaid_item",
  "claimed?.source_session_id === pendingId",
  "/api/expungement-ai/briefcase/${encodeURIComponent(itemId)}/packet-information",
  "packet_information_review_saved_through_hosted_application",
  'body: { answers: packetAnswers, reviewed: true }',
  "packet_information_review_is_complete_and_route_safe",
  "packetInformationReviewSafety",
  "reviewedPacketInputHash",
  "ready_to_generate",
  "artifact_refs_json",
  "stored_row_matches_authoritative_resolver",
  "application_checkout_resolved_unique_consumer_person",
  "unpaid_render_returns_402",
  "checkoutSessionId",
  "exactly_one_real_stripe_session_for_item",
  "stripe_session_amount_mode_metadata_and_product_exact",
  "metadata_transitively_binds_user_person_item_matter_and_product",
  'product_id: "expungement_packet"',
  "person_id: personRow.id",
  "matter_id: matterId",
  "source_session_id: pendingId",
  "reviewed_input_hash: reviewedInputHash",
  "checkout_return_page_shape_exact",
  "successUrl.pathname === `/briefcase/${itemId}`",
  'successUrl.searchParams.get("payment") === "return"',
  'cancelUrl.searchParams.get("checkout") === "canceled"',
  "beginning_checkout_does_not_mark_paid_or_queue_work",
  "RCAP TEST CHECKOUT READY — ROGER ACTION REQUIRED",
  "fixtureRetainedForRoger = true"
], "gate");

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
check((gate.match(/callApp\(previewUrl, "\/api\/expungement-ai\/evaluate"/g) ?? []).length === 1,
  "gate must make exactly one hosted free-check evaluation call");
check((gate.match(/callApp\(previewUrl, "\/api\/expungement-ai\/screening\/pending"/g) ?? []).length === 1,
  "gate must make exactly one anonymous pending-result call");
check((gate.match(/callApp\(previewUrl, "\/api\/expungement-ai\/screening\/pending\/claim"/g) ?? []).length === 1,
  "gate must make exactly one authenticated pending-claim call");
check((gate.match(/`\/api\/expungement-ai\/briefcase\/\$\{encodeURIComponent\(itemId\)\}\/packet-information`/g) ?? []).length === 1,
  "gate must make exactly one owner packet-information review call");
check(!gate.includes("x-vercel-set-bypass-cookie"), "gate must never request a Vercel bypass cookie");
check(!/spawnSync\(["']docker["'],\s*\[["']run["']/.test(gate), "gate must not run the worker");
check(!/\bvercel@[^\n]*\bdeploy\b/.test(gate), "gate must not run Vercel deploy");
check(!/delete\s+from\s+/i.test(gate), "gate must retain the acceptance fixture");
check(!/insert\s+into\s+public\.consumer_briefcase_items/i.test(gate),
  "gate must not SQL-seed a Briefcase item instead of claiming the hosted pending result");
check(!/insert\s+into\s+public\.rcap_persons/i.test(gate),
  "gate must let the application Checkout boundary resolve the consumer person");
check(!/payment_status\s*:\s*["']paid["']/.test(gate), "gate must not fabricate a paid Session");
check(!/evt_hosted_acceptance|signedBody\(|constructEvent/.test(gate), "gate must not synthesize a Stripe completion event");
check(!/fetch\([^\n]*api\.stripe\.com\/v1\/checkout\/sessions[^\n]*\{[^}]*method:\s*["']POST["']/s.test(gate),
  "gate must not create a Stripe Session directly");
check(gate.includes("queryEntries.length === 1"), "gate must reject duplicate bypass query parameters");
check(gate.includes("stripeGet(`/v1/checkout/sessions/${encodeURIComponent(checkoutSessionId)}`)"),
  "gate must retrieve the application-created Session from Stripe");
check(!gate.includes('successUrl.pathname === "/expungement-ai/packet-ready"'), "gate still expects the obsolete packet-ready return route");
check(!gate.includes('cancelUrl.pathname === "/expungement-ai/pay"'), "gate still expects the obsolete pay cancellation route");

const journeyMarkers = [
  'const evaluateResponse = await callApp(previewUrl, "/api/expungement-ai/evaluate"',
  'const pendingResponse = await callApp(previewUrl, "/api/expungement-ai/screening/pending"',
  'const claimResponse = await callApp(previewUrl, "/api/expungement-ai/screening/pending/claim"',
  "const packetInformationResponse = await callApp(",
  'const checkoutResponse = await callApp(previewUrl, "/api/expungement-ai/checkout"'
];
const journeyIndexes = journeyMarkers.map((marker) => gate.indexOf(marker));
check(journeyIndexes.every((index) => index >= 0)
  && journeyIndexes.every((index, position) => position === 0 || journeyIndexes[position - 1] < index),
"hosted DTC journey must execute evaluate -> pending -> authenticated claim -> packet-information review -> Checkout");

const evaluateCall = gate.slice(
  gate.indexOf("const evaluateResponse = await callApp"),
  gate.indexOf("const hostedEvaluation = evaluateResponse.json")
);
const pendingCall = gate.slice(
  gate.indexOf("const pendingResponse = await callApp"),
  gate.indexOf("const pendingId = pendingResponse.json")
);
for (const forbidden of ["pathwayId:", "pathwayLabel:", "resultCode:", "paymentAllowed:", "packetType:", "selectedTrackId:"]) {
  check(!evaluateCall.includes(forbidden), `hosted free-check request asserts server-owned field ${forbidden}`);
  check(!pendingCall.includes(forbidden), `pending-result request asserts server-owned field ${forbidden}`);
}
check(gate.includes('cookie: A.cookie,\n    body: { pendingId, next: "/briefcase" }'),
  "pending-result claim must use consumer A's authenticated hosted session");
check(gate.includes('{ method: "POST", cookie: A.cookie, body: { answers: packetAnswers, reviewed: true } }'),
  "packet-information review must use consumer A's authenticated hosted session and reviewed=true");

includesEvery(payment, [
  "packet_information_review_is_complete_and_route_safe",
  "checkout_session_identity_and_return_binding_exact",
  "packetInformationReviewSafety",
  "reviewedPacketInputHash",
  "artifact_refs_json",
  "res.json?.checkoutSessionId",
  '`/v13/deployments/${encodeURIComponent(aliasHost)}`',
  '`/v9/projects/${encodeURIComponent(VERCEL_PROJECT_ID)}`',
  "deploymentProjectId === canonicalProjectId",
  'deployment?.readyState === "READY"',
  'deployment?.target !== "production"',
  "aliases.includes(aliasHost)",
  "meta.rcapAcceptanceProjectRef === PROJECT_REF",
  'meta.rcapStripeConfigured === "true"',
  'meta.rcapRouteState === "staging_scoped"',
  "meta.rcapPublicOrigin === ACCEPTANCE_ORIGIN",
  'session.metadata?.product_id === "expungement_packet"',
  "session.metadata?.person_id === binding?.payment_person_id",
  "session.metadata?.matter_id === matterId",
  "session.metadata?.reviewed_input_hash === reviewedInputHash",
  "successUrl.pathname === `/briefcase/${itemId}`",
  "cancelUrl.pathname === `/briefcase/${itemId}`",
  "const bypassWorks = probeB.isApplicationJson",
  "|| !VERCEL_TOKEN || !BYPASS",
  "VERCEL_AUTOMATION_BYPASS_SECRET are required",
  "queryOnlyBypass: true",
  "sandbox_webhook_destination_preconditions_exact",
  "sandbox_webhook_destination_updated_in_place_and_read_back_exact",
  "EXPECTED_WEBHOOK_EVENTS",
  'listStripeCollection("/v1/webhook_endpoints")',
  '`/v1/webhook_endpoints/${encodeURIComponent(endpoint.id)}`',
  "form: { url: requiredUrl.toString() }",
  'requiredUrl.searchParams.set("x-vercel-protection-bypass", BYPASS)',
  "canonicalAfter.length === 1",
  "observed?.id === before.id",
  "observed?.created === before.created",
  "sameStringSet(observed?.enabled_events, before.enabledEvents)",
  "bypassValueRecorded: false",
  "worker_queue_contains_only_the_target_job",
  "count(*)::int as claimable_after_housekeeping_jobs",
  "status = 'claimed' and claim_expires_at is not null and claim_expires_at < now()",
  "status = 'failed' and failure_disposition = 'retryable'",
  "Number(queueState?.claimable_after_housekeeping_jobs) === 1",
  "Number(queueState?.target_jobs) === 1",
  '"--hostname", workerHost',
  "select id, status, attempt_count, claimed_by",
  'workerResult?.outcome === "finalized"',
  "workerResult?.jobId === evidence.render?.jobId",
  'workerResult?.deliveryEligibility === "eligible"',
  'workerResult?.accountingResult === "zero_charge"',
  "new RegExp(`^${workerHost}-\\\\d+$`).test(job?.claimed_by",
  "RCAP_WORKER_CONTAINER_DIGEST=${WORKER_DIGEST}",
  'job?.status === "artifact_validated"',
  'job?.container_digest === WORKER_DIGEST',
  'job?.delivery_eligibility === "eligible"',
  'job?.accounting_result === "zero_charge"',
  "j.id as job_id",
  "j.output_byte_count",
  "j.container_digest",
  "row?.first_render_job_id === row?.job_id",
  "owner.status === 200",
  "owner.contentType.toLowerCase().startsWith(\"application/pdf\")",
  "owner.bytes.length > 0",
  "owner.bytes.subarray(0, 5).toString(\"latin1\") === \"%PDF-\"",
  "crypto.createHash(\"sha256\").update(owner.bytes).digest(\"hex\")",
  "ownerSha256 === evidence.worker?.outputSha256",
  "ownerSha256 === evidence.storage?.authorized?.sha256",
  "owner.bytes.length === evidence.worker?.outputByteCount",
  'const download = `/api/rcap/packets/${encodeURIComponent(jobId ?? "missing-job-id")}/download`',
  "select id, public from storage.buckets",
  "bucketRows[0]?.public === false",
  "serviceRead.contentType.toLowerCase().startsWith(\"application/pdf\")",
  "serviceRead.sha256 === evidence.worker?.outputSha256",
  "serviceRead.bytes === evidence.worker?.outputByteCount",
  "const strangerRefused = stranger.status === 403",
  'stranger.json?.code === "unauthorized"',
  "const anonRefused = anonymous.status === 401",
  'anonymous.json?.code === "unauthenticated"',
  "synthetic_checkout_session_expired_after_automated_journey",
  '`/v1/checkout/sessions/${encodeURIComponent(session.id)}/expire`',
  'readback.json?.status === "expired"',
  'readback.json?.payment_status === "unpaid"',
  "synthetic_acceptance_chain_retained_and_hash_valid_after_replay",
  'artifactPath.includes(jobId ?? "missing-job-id")',
  'artifactPath.includes(outputSha256 ?? "missing-output-sha")',
  "consumer_briefcase_item_id = '${itemId}'",
  "consumer_auth_user_id = '${A.id}'",
  "status in ('artifact_validated', 'delivered')",
  "first_render_job_id = '${jobId}'",
  "stripe_event_id = '${sqlText(completionEvent.id)}'",
  "related_object_id = '${sqlText(session.id)}'",
  "Number(counts?.items) === 1",
  "Number(counts?.entitlements) === 1",
  "Number(counts?.jobs) === 1",
  "Number(counts?.processed_events) === 1",
  "retainedObject.status === 200",
  "retainedObject.sha256 === outputSha256",
  "databaseRowsRetained: true",
  "privateObjectRetained: true"
], "hosted payment journey");
check(!payment.includes("res.json?.sessionId ?? res.json?.id"), "hosted payment still reads the obsolete Checkout response shape");
check(!payment.includes("/api/expungement-ai/packet/download?briefcaseItemId="),
  "hosted payment still calls the legacy Briefcase-text download instead of the worker-backed packet route");
check(!payment.includes("/v6/deployments?"),
  "hosted payment must resolve the pinned acceptance alias, not select an old metadata-matching list entry");
check((payment.match(/\/api\/rcap\/packets\/\$\{encodeURIComponent\(jobId/g) ?? []).length === 1,
  "hosted payment must make its authenticated download against exactly one worker job id");
check((payment.match(/queryOnlyBypass: true/g) ?? []).length === 3,
  "forged, genuine, and replayed Stripe webhook posts must all use query-only protection bypass");
check(!/delete\s+from\s+public\.(?:processed_stripe_events|consumer_packet_payment_consumption|consumer_briefcase_items|packet_render_jobs)/i.test(payment),
  "hosted payment must retain its append-only database evidence chain");
check(!/storage\/v1\/object[^\n]*\{[\s\S]{0,180}method:\s*["']DELETE["']/m.test(payment),
  "hosted payment must retain its hash-valid private artifact");
check(payment.includes("...(queryOnlyBypass ? {} : bypassHeaders)"),
  "query-only webhook mode must not also attach the Vercel bypass header");
check(!/stripeRequest\(["'`]\/v1\/webhook_endpoints["'`],\s*\{[\s\S]{0,120}method:\s*["']POST["']/m.test(payment),
  "hosted payment must never create a Stripe webhook endpoint");
check(!/\/v1\/webhook_endpoints[^\n]{0,180}method:\s*["']DELETE["']/m.test(payment),
  "hosted payment must never delete a Stripe webhook endpoint");
const webhookUpdateIndex = payment.lastIndexOf("sandbox_webhook_destination_updated_in_place_and_read_back_exact");
const paymentFixtureWriteIndex = payment.indexOf("insert into public.consumer_briefcase_items");
check(webhookUpdateIndex >= 0 && paymentFixtureWriteIndex > webhookUpdateIndex,
  "sandbox webhook must be exact at the pinned alias before the automated payment fixture is written");
const replayIndex = payment.lastIndexOf("event_replay_creates_no_second_entitlement_or_render_job");
const sessionExpiryIndex = payment.lastIndexOf("synthetic_checkout_session_expired_after_automated_journey");
const durableReadbackIndex = payment.lastIndexOf("synthetic_acceptance_chain_retained_and_hash_valid_after_replay");
check(replayIndex >= 0 && sessionExpiryIndex > replayIndex && durableReadbackIndex > sessionExpiryIndex,
  "automated Session expiry and durable-chain readback must run only after replay and in dependency order");

includesEvery(deploy, [
  "HOSTED_ACCEPTANCE_ALIAS",
  "NEXT_PUBLIC_EXPUNGEMENT_AI_URL: ACCEPTANCE_ORIGIN",
  "rcapPublicOrigin",
  "acceptance_alias_points_only_to_the_preview_deployment",
  '"vercel@latest", "alias", "set"',
  "neverAssignedProductionAlias: true",
  "production_aliases_unchanged",
  "deploymentRouteMetadataExact",
  'const reusable = ROUTE_STATE === "staging_scoped" ? null : await findReusableDeployment()',
  "meta.rcapAcceptanceProjectRef === PROJECT_REF",
  "meta.rcapRouteState === ROUTE_STATE_TAG",
  "healthIsApplication",
  'render.status === 401',
  'render.json?.error === "Authentication is required."'
], "hosted deployment");
includesEvery(gallery, [
  "exactInternalAdminRedirect",
  "response.status === 307",
  'location.pathname === "/sign-in"',
  'location.searchParams.get("next") === requestedPath',
  "gallery_content_exists_for_every_priority_state",
  "getAll50StatePreviews",
  "terminal_treatment_gallery_has_51_unique_jurisdictions",
  "terminal_treatment_gallery_has_497_of_497_terminal_tracks",
  "terminal_treatment_gallery_has_no_nonterminal_unknown_or_unowned_entries",
  "terminal-treatment-gallery.json",
  "problematic_pdf_master_list_is_complete",
  "problematic_pdf_routes_are_neither_sellable_nor_public",
  "problematic-pdf-master-list.json",
  "createHash(\"sha256\")"
], "hosted gallery");
check(!gallery.includes("typeof index.status === \"number\""), "gallery must not accept an arbitrary numeric status as a successful route response");
check(terminalization.tracks?.length === 497, "terminalization ledger must contain exactly 497 track rows");
check(terminalization.aggregates?.registryTracks === 497, "terminalization registry total must be 497");
check(terminalization.aggregates?.tracksTerminal === 497, "terminalization ledger must report 497 terminal tracks");
check(terminalization.aggregates?.tracksNonterminal === 0, "terminalization ledger must report zero nonterminal tracks");
check(terminalization.aggregates?.unknownTrackDispositions === 0, "terminalization ledger must report zero unknown dispositions");
check(terminalization.aggregates?.unownedBlockers === 0, "terminalization ledger must report zero unowned blockers");
check(new Set(terminalization.tracks?.map((track) => track.jurisdiction)).size === 51,
  "terminalization ledger must cover 51 unique jurisdictions");
check(terminalization.tracks?.every((track) => track.terminal === true),
  "every terminalization ledger track must be explicitly terminal");
check(problematicPdf.records?.length === problematicPdf.totals?.problematicPdfsTotal,
  "problematic-PDF master list row count must match its aggregate total");
check(problematicPdf.totals?.problemPdfRoutesStillSellable === 0,
  "problematic-PDF register must report zero sellable routes");
check(problematicPdf.totals?.problemPdfRoutesStillPublic === 0,
  "problematic-PDF register must report zero public routes");
check(Array.isArray(problematicPdf.routesStillSellable) && problematicPdf.routesStillSellable.length === 0,
  "problematic-PDF sellable-route master list must be empty");
check(Array.isArray(problematicPdf.routesStillPublic) && problematicPdf.routesStillPublic.length === 0,
  "problematic-PDF public-route master list must be empty");
includesEvery(auth, ["rcapPublicOrigin", "ACCEPTANCE_ORIGIN", "match.meta.rcapPublicOrigin"], "hosted auth configuration");

includesEvery(entry, [
  "hosted_checkout_gate",
  "preview_deployment_id",
  "phase: ${{ inputs.mode == 'hosted_full'",
  "preview_deployment_id: ${{ inputs.preview_deployment_id }}"
], "entry workflow");

includesEvery(hosted, [
  "checkout_gate",
  "preview_deployment_id",
  "HOSTED_PREVIEW_DEPLOYMENT_ID: ${{ inputs.preview_deployment_id }}",
  "node scripts/rcap-hosted-checkout-gate.mjs",
  "node scripts/verify-rcap-hosted-checkout-gate.mjs",
  "checkout_gate requires one exact Vercel deployment id",
  "rcap-acceptance-hyflxnlhpmiqxvvcoiia.vercel.app",
  "if: inputs.phase == 'checkout_gate'",
  "inputs.phase == 'payment' || inputs.phase == 'checkout_gate'"
], "hosted workflow");
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
    "664b8ddd374642bf2bd1820f7e05224f3dd081bc",
    "--",
    ...paths
  ], { cwd: root, encoding: "utf8" });
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
