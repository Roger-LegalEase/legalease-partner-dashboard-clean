import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import yaml from "yaml";
import { spawnSync } from "node:child_process";
import { register } from "node:module";
import { captureCheckoutMetadataFixture } from "./test-expungement-checkout-guards.mjs";
import { expectedCheckoutMetadata, checkoutMetadataEvidence, checkoutMetadataExpectation } from "./rcap-checkout-metadata-contract.mjs";
import { checkoutMetadataContractFailures, CHECKOUT_METADATA_GATES } from "./verify-rcap-checkout-metadata-contract.mjs";
import { internalGalleryRefusal, deliveryRefusal, privateObjectRefusal, cardEntryEvidence } from "./rcap-hosted-response-contract.mjs";
import { syntax, initializer, evaluate, requiredHostedCases } from "./rcap-hosted-surface-inspection.mjs";
import { hostedEvidenceFailures } from "./verify-rcap-hosted-evidence-completion.mjs";

const evidenceDir = process.argv[2];
assert.ok(evidenceDir, "supply the captured #336/acceptance readback directory");
const read = file => JSON.parse(fs.readFileSync(path.join(evidenceDir, file), "utf8"));
const binding = JSON.parse(fs.readFileSync("data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json", "utf8"));
const results = [];
function positive(id, actual) { assert.equal(actual, true, id); results.push({ id, type: "positive", passed: true }); }
function negative(id, caught, reason) { assert.equal(caught, true, `${id}: expected refusal (${reason})`); results.push({ id, type: "mutation", passed: true, reason }); }
const captured = await captureCheckoutMetadataFixture();
const expected = expectedCheckoutMetadata(captured.authority);
positive("actual_application_adapter_metadata", checkoutMetadataEvidence(captured.actual, expected).passed);
positive("structural_contract", checkoutMetadataContractFailures().length === 0);
const mutations = [
  ["pathway_id_to_pathway_label", m => { m.pathway_label = m.pathway_id; delete m.pathway_id; }, "pathway_id"],
  ["source_session_actual_to_empty", m => { m.source_session_id = ""; }, "source_session_id"],
  ...["product_id", "person_id", "matter_id", "verification_hash", "render_input_hash"].map(key => [`remove_${key}`, m => { delete m[key]; }, key]),
  ["wrong_pathway_id", m => { m.pathway_id = "retired-route"; }, "pathway_id"],
  ["unexpected_metadata_key", m => { m.unowned_authority = "forged"; }, "unowned_authority"]
];
for (const [id, mutate, key] of mutations) {
  const actual = structuredClone(captured.actual); mutate(actual);
  const proof = checkoutMetadataEvidence(actual, expected);
  negative(id, !proof.passed && proof.failures.some(f => f.startsWith(`${key}:`)), key);
}
const helperFile = "scripts/rcap-checkout-metadata-contract.mjs";
const helper = fs.readFileSync(helperFile, "utf8");
for (const key of ["product_id", "person_id", "matter_id", "verification_hash", "render_input_hash"]) {
  const mutated = helper.replace(new RegExp(`^    ${key}:.*\\n`, "m"), "");
  assert.notEqual(mutated, helper);
  negative(`expectation_remove_${key}`, checkoutMetadataContractFailures({ sources: { [helperFile]: mutated } }).some(f => f.startsWith(`expectation.${key}:`)), key);
}
for (const [id, from, to, key] of [
  ["expectation_label", "pathway_id: verification.snapshot.pathwayId", "pathway_label: verification.snapshot.pathwayId", "pathway_id"],
  ["expectation_empty_source", 'source_session_id: stored.source_session_id ?? ""', 'source_session_id: ""', "source_session_id"],
  ["expectation_wrong_pathway", "pathway_id: verification.snapshot.pathwayId", 'pathway_id: "retired"', "pathway_id"]
]) {
  const mutated = helper.replace(from, to); assert.notEqual(mutated, helper);
  negative(id, checkoutMetadataContractFailures({ sources: { [helperFile]: mutated } }).some(f => f.startsWith(`expectation.${key}:`)), key);
}
for (const file of CHECKOUT_METADATA_GATES) {
  const source = fs.readFileSync(file, "utf8");
  const mutated = source.replace("const metadataExact = metadataProof.passed;", "const metadataExact = true;");
  negative(`${file}:bypass_metadata_verdict`, checkoutMetadataContractFailures({ sources: { [file]: mutated } }).some(f => f.includes("metadataExact must use")), "actual comparison bypassed");
}

register("./lib/ts-esm-loader.mjs", import.meta.url);
const authority = read("server-authority-readback.json");
const session = read("session-contract-readback.json");
const actualExpected = await checkoutMetadataExpectation({ userId: authority.item.user_id,
  stored: authority.item, personRow: authority.person, protectedVerification: authority.verification });
positive("captured_336_exact_13_metadata_bindings", checkoutMetadataEvidence(session.metadata, actualExpected).passed);
const catalog = read("run-336/stripe-fixtures.json").productId;
assert.ok(catalog?.startsWith("prod_"));
for (const file of CHECKOUT_METADATA_GATES) {
  const parsed = syntax(file);
  function sessionPass(value) {
    const lineItems = value.line_items.data;
    const context = { sessionResponse: { status: 200 }, lineItemsResponse: { status: 200 }, session: value,
      checkoutSessionId: session.id, checkoutUrl: session.url, itemId: authority.item.id,
      metadataExact: checkoutMetadataEvidence(value.metadata, actualExpected).passed,
      lineItems, lineItem: lineItems[0], expectedCatalogProductId: catalog,
      productId: typeof lineItems[0]?.price?.product === "object" ? lineItems[0].price.product.id : lineItems[0]?.price?.product,
      productName: lineItems[0]?.price?.product?.name };
    context.isThePacketProduct = evaluate(initializer(parsed, "isThePacketProduct"), context);
    return evaluate(initializer(parsed, "sessionExact"), context);
  }
  positive(`${file}:captured_session`, sessionPass(session));
  for (const [name, mutate] of [
    ["wrong_catalog_Product", s => { s.line_items.data[0].price.product.id = "prod_wrong"; }],
    ["wrong_amount", s => { s.amount_total = 4999; }],
    ["wrong_currency", s => { s.currency = "eur"; }],
    ["wrong_unit_amount", s => { s.line_items.data[0].price.unit_amount = 4999; }],
    ["wrong_subtotal", s => { s.amount_subtotal = 4999; }],
    ["wrong_line_currency", s => { s.line_items.data[0].price.currency = "eur"; }],
    ["wrong_mode", s => { s.mode = "subscription"; }],
    ...mutations.map(([id, mutate]) => [id, s => mutate(s.metadata)])
  ]) { const changed = structuredClone(session); mutate(changed); negative(`${file}:${name}`, sessionPass(changed) === false, name); }
  const origin = new URL(session.success_url).origin;
  const returnPass = value => evaluate(initializer(parsed, "returnShapeExact"), {
    session: value, itemId: authority.item.id, expectedReturnOrigin: origin, publicOrigin: origin,
    EXPECTED_RETURN_ORIGIN: origin, previewUrl: origin,
    successUrl: new URL(value.success_url), cancelUrl: new URL(value.cancel_url)
  });
  positive(`${file}:captured_return_urls`, returnPass(session));
  for (const [name, key, value] of [
    ["wrong_success_item", "success_url", session.success_url.replace(authority.item.id, "wrong-item")],
    ["wrong_cancel_origin", "cancel_url", session.cancel_url.replace(origin, "https://wrong.example")]
  ]) negative(`${file}:${name}`, returnPass({ ...session, [key]: value }) === false, key);
}

// The exact finite downstream probe set, evaluated by this application's
// authoritative engine. No server, database write or nationwide suite runs.
const matrix = syntax("scripts/rcap-hosted-acceptance-matrix.mjs");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");
const journeys = JSON.parse(fs.readFileSync("data/rcap-all50/hosted-acceptance-journeys.json", "utf8"));
const matrixPredicate = matrix.nodes.find(n => ts.isVariableDeclaration(n) && n.name.getText() === "pass"
  && n.initializer?.getText().includes("results.every")).initializer.getText();
const matrixPass = results => evaluate(matrixPredicate, {
  results, answered: results.filter(r => r.status === 200), anyPaid: results.some(r => r.paymentAllowed === true)
});
for (const [id, spec] of Object.entries(journeys.cases)) {
  const results = spec.probes.map(probe => {
    const result = evaluateAuthoritativeScreeningResult({ jurisdiction: probe.jurisdiction,
      profileVersion: probe.profileVersion, answers: probe.answers,
      matterId: "00000000-0000-4000-8000-000000000000" }).evaluation;
    const shape = { paymentAllowed: result.paymentAllowed, resultCode: result.resultCode, pathwayId: result.pathwayId ?? null };
    return { label: probe.label, status: 200, ...shape, expected: shape };
  });
  positive(`matrix:${id}:current_application`, matrixPass(results));
  for (const [field, value] of [["paymentAllowed", null], ["resultCode", "stale"], ["pathwayId", "wrong-route"], ["status", 500]]) {
    const changed = structuredClone(results); changed[0][field] = value;
    negative(`matrix:${id}:wrong_${field}`, !matrixPass(changed), field);
  }
}
negative("matrix:empty_probe_set", !matrixPass([]), "empty probes cannot pass");

const payment = syntax("scripts/rcap-hosted-acceptance-payment.mjs");
positive("packet_id_matches", evaluate(initializer(payment, "idsMatch"), { jobPacketId: "packet", expectedPacketId: "packet" }));
negative("wrong_packet_id", !evaluate(initializer(payment, "idsMatch"), { jobPacketId: "other", expectedPacketId: "packet" }), "idsMatch");
const conditions = payment.nodes.find(n => ts.isVariableDeclaration(n) && n.name.getText() === "conditions").initializer;
const condition = name => conditions.properties.find(n => n.name?.getText() === name).initializer.getText();
negative("wrong_job_id", !evaluate(condition("cycle_result_names_this_job"), { finalCycleResult: { jobId: "other" }, job: { id: "target" } }), "cycle_result_names_this_job");
negative("wrong_artifact_worker_digest", !evaluate(condition("artifact_produced_by_the_accepted_worker"), { job: { container_digest: "sha256:wrong" }, WORKER_DIGEST_REF: binding.workerDigestReference }), "artifact_produced_by_the_accepted_worker");
// Pure predicate fixtures: these do not claim an artifact was rendered here.
const workerContext = {
  WORKER_DIGEST_REF: binding.workerDigestReference, targetJobId: "target",
  journey: { unprovenCycles: 0, targetCycles: 1, failure: null },
  finalCycleResult: { jobId: "target", outcome: "finalized" },
  job: { id: "target", status: "finalized", container_digest: binding.workerDigest,
    claimed_at: "fixture", rendering_at: "fixture", validating_at: "fixture", artifact_validated_at: "fixture",
    page_count: 1, output_sha256: "fixture-hash", normalized_output_sha256: "normalized-fixture-hash" },
  TERMINAL_SUCCESS: new Set(["finalized"]), NON_TERMINAL: new Set(["queued", "rendering", "validating"]),
  storagePath: "fixture.pdf", declaredBytes: 4, stored: { status: 200, bytes: [1, 2, 3, 4] },
  validation: { ok: true, pageCount: 1, outputSha256: "fixture-hash", normalizedOutputSha256: "normalized-fixture-hash" }
};
for (const property of conditions.properties) positive(`worker_condition:${property.name.getText()}`, evaluate(property.initializer.getText(), workerContext));
for (const [name, change] of [
  ["target_job_id_from_the_paid_render_response", c => { c.targetJobId = ""; }],
  ["every_cycle_attributed_to_a_job", c => { c.journey.unprovenCycles = 1; }],
  ["target_cycle_observed", c => { c.journey.targetCycles = 0; }],
  ["backlog_converged", c => { c.journey.failure = "bounded-wait-failed"; }],
  ["cycle_result_emitted", c => { c.finalCycleResult = null; }],
  ["cycle_result_is_finalized", c => { c.finalCycleResult.outcome = "failed"; }],
  ["terminal_successful_state", c => { c.job.status = "failed"; }],
  ["not_in_flight", c => { c.job.status = "rendering"; }],
  ...[ ["target_admitted_and_claimed", "claimed_at"], ["target_rendering_started", "rendering_at"],
    ["target_validation_started", "validating_at"], ["target_finalized", "artifact_validated_at"]
  ].map(([name, key]) => [name, c => { c.job[key] = null; }]),
  ["artifact_path_present", c => { c.storagePath = ""; }],
  ["nonzero_stored_byte_count", c => { c.declaredBytes = 0; }],
  ["storage_object_exists", c => { c.stored.status = 500; }],
  ["exact_bytes_re_read", c => { c.stored.bytes = [1]; }],
  ["pdf_parses", c => { c.validation.ok = false; }],
  ["page_proof", c => { c.job.page_count = 2; }],
  ["immutable_hash_agrees", c => { c.job.output_sha256 = "another-artifact"; }]
]) {
  const changed = structuredClone(workerContext); change(changed);
  negative(`worker_condition:${name}`, !evaluate(condition(name), changed), name);
}
const tracked = evaluate(initializer(payment, "TRACKED"));
const beforeReplay = Object.fromEntries(tracked.map(key => [key, "unchanged-fixture"]));
for (const key of tracked) {
  const changed = { ...beforeReplay, [key]: "wrong-identity-or-count" };
  negative(`replay:${key}`, evaluate(initializer(payment, "moved"), { b: beforeReplay, a: changed, TRACKED: tracked }).includes(key), key);
}
const { assertClaimAcceptable } = await import("../src/lib/rcap/render/job-contract.ts");
const { getAllJurisdictionProfiles } = await import("../src/lib/rcap-engine/profile-registry.ts");
const versions = new Set(getAllJurisdictionProfiles().map(p => p.profileVersion));
const job = { id: "target", rendererKind: "packet_document_v1", sourceSha256: null,
  profileVersion: authority.verification.snapshot.profileVersion, fencingToken: "fixture" };
const admission = { knownJobIds: new Set(["target"]), allowedSourceShas: new Set(), knownProfileVersions: versions, supportedRendererKinds: new Set(["packet_document_v1"]) };
assertClaimAcceptable(job, admission); positive("worker_profile_version_admitted", true);
let error; try { assertClaimAcceptable({ ...job, profileVersion: "stale-1.3.0" }, admission); } catch (caught) { error = caught; }
negative("wrong_worker_profileVersion", error?.errorCode === "profile_version_unknown", error?.errorCode ?? "no refusal");

const checkout = syntax("scripts/rcap-hosted-checkout-gate.mjs");
const preview = read("run-336/preview-resolution.json");
const deployment = { id: preview.deploymentId, readyState: "READY", target: null, url: preview.hostname,
  meta: { rcapApplicationSha: binding.applicationSha, rcapAcceptanceProjectRef: binding.acceptanceProjectRef,
    rcapStripeConfigured: "true", rcapRouteState: "staging_scoped", rcapReturnOrigin: `https://${preview.hostname}` } };
const deploymentContext = { deploymentResponse: { status: 200 }, aliasResponse: { status: 200 }, deployment,
  resolvedDeploymentId: deployment.id, DEPLOYMENT_ID: deployment.id, aliasDeploymentId: deployment.id,
  deploymentProjectId: "bound-project", canonicalProjectId: "bound-project", APPLICATION_SHA: binding.applicationSha,
  PROJECT_REF: binding.acceptanceProjectRef, EXPECTED_RETURN_ORIGIN: `https://${preview.hostname}`,
  EXPECTED_RETURN_HOST: preview.hostname, PREVIEW_HOSTNAME: preview.hostname };
positive("preview_contract", evaluate(initializer(checkout, "deploymentOk"), deploymentContext));
for (const [id, key, value] of [["wrong_Preview_application_SHA", "rcapApplicationSha", "0".repeat(40)],
  ["wrong_Preview_route_state", "rcapRouteState", "enabled"], ["wrong_acceptance_project", "rcapAcceptanceProjectRef", binding.productionProjectRef]]) {
  const context = structuredClone(deploymentContext); context.deployment.meta[key] = value;
  negative(id, !evaluate(initializer(checkout, "deploymentOk"), context), key);
}
negative("wrong_worker_digest", evaluate(initializer(checkout, "inputMismatches"), { PROJECT_REF: binding.acceptanceProjectRef,
  EXPECTED_PROJECT_REF: binding.acceptanceProjectRef, WORKER_REF: "ghcr.io/example@sha256:" + "0".repeat(64), EXPECTED_WORKER_REF: binding.workerDigestReference }).some(f => f.startsWith("worker digest reference:")), "worker digest reference");

const schema = read("acceptance-schema.json");
const actualJobColumns = new Set(schema.columns.filter(c => c.table_name === "packet_render_jobs").map(c => c.column_name));
const sqlChecks = read("sql-schema-comparison.json");
positive("all_runtime_SQL_schema_bindings", sqlChecks.length > 0 && sqlChecks.every(q => !q.failures?.length && !q.unresolved?.length));
const jobSql = sqlChecks.find(q => q.query.includes("select id, status, attempt_count"));
assert.ok(jobSql);
function missingJobColumns(sql) {
  const fields = sql.match(/select([\s\S]+?)from public\.packet_render_jobs/i)?.[1] ?? "";
  return [...fields.matchAll(/\b[a-z_]+\b/g)].map(m => m[0]).filter(n => !["left", "coalesce", "as"].includes(n) && !actualJobColumns.has(n));
}
positive("readJob_selected_columns", missingJobColumns(jobSql.query).length === 0);
negative("stale_DB_column", missingJobColumns(jobSql.query.replace("page_count", "output_page_count")).includes("output_page_count"), "packet_render_jobs.output_page_count absent from live schema");

const origin = `https://${preview.hostname}`, next = "/internal/record-clearing/states/mississippi";
positive("gallery_sign_in_redirect", internalGalleryRefusal({ status: 307, location: `/sign-in?next=${encodeURIComponent(next)}` }, origin, next));
for (const status of ["unreachable", 500, 502, 404]) negative(`gallery_${status}`, !internalGalleryRefusal({ status, body: "", location: "" }, origin, next), "not an application access gate");
negative("gallery_wrong_redirect", !internalGalleryRefusal({ status: 307, location: `https://example.com/sign-in?next=${encodeURIComponent(next)}` }, origin, next), "foreign origin");
negative("delivery_500", !deliveryRefusal({ status: 500 }, origin), "server error is not refusal");
negative("storage_500", !privateObjectRefusal(500), "server error is not privacy proof");
negative("false_card_entry_claim", !cardEntryEvidence(["card number: no field found"]), "entry not observed");

const required = requiredHostedCases(".", catalog);
const docs = Object.fromEntries(Object.entries(required).map(([file, ids]) => [file, { passed: true, applicationSha: binding.applicationSha,
  acceptanceProjectRef: binding.acceptanceProjectRef, cases: Object.fromEntries(ids.map(id => [id, { passed: true, observed: "test fixture" }])),
  workerDigestRef: binding.workerDigestReference, workerDigest: binding.workerDigest,
  worker: { image: binding.workerDigestReference }, deployment: { id: preview.deploymentId }, previewDeploymentId: preview.deploymentId }]));
positive("complete_emitted_verdicts", hostedEvidenceFailures({ documents: docs, required, binding }).length === 0);
for (const [file, ids] of Object.entries(required)) for (const id of ids) {
  const changed = structuredClone(docs); changed[file].cases[id].passed = false;
  negative(`emitted_verdict:${file}:${id}`, hostedEvidenceFailures({ documents: changed, required, binding }).some(f => f.startsWith(`${file}:${id}:`)), "named emitted case fails even with top-level PASS");
}
const missing = structuredClone(docs); delete missing["payment.json"];
negative("missing_payment_evidence", hostedEvidenceFailures({ documents: missing, required, binding }).includes("payment.json: evidence missing"), "missing receipt");
const workflow = yaml.parse(fs.readFileSync(".github/workflows/rcap-hosted-acceptance-staging.yml", "utf8"));
const steps = Object.values(workflow.jobs).flatMap(j => j.steps ?? []);
function dependenciesBeforeMetadataVerifier(sequence) {
  const deps = sequence.findIndex(step => step.id === "gate_deps");
  const verifier = sequence.findIndex(step => step.id === "verify_checkout_gate");
  return deps >= 0 && verifier > deps && sequence[deps].run.trim() === "npm ci"
    && ["gate", "matrix"].every(key => sequence[deps].if.includes(`steps.contract.outputs.${key} == 'true'`));
}
positive("workflow_metadata_verifier_has_frozen_dependencies", dependenciesBeforeMetadataVerifier(steps));
const reordered = steps.filter(step => step.id !== "gate_deps");
reordered.push(steps.find(step => step.id === "gate_deps"));
negative("workflow_metadata_verifier_before_dependencies", !dependenciesBeforeMetadataVerifier(reordered), "TypeScript and adapter imports require frozen dependencies first");
const antiskip = steps.find(step => step.id === "antiskip");
const antiCode = antiskip.run.slice(0, antiskip.run.indexOf("# A failing case")) + '\nexit "$fail"';
const antiEnv = Object.fromEntries(Object.keys(antiskip.env).map(key => [key, key.startsWith("O_") ? "success" : "false"]));
Object.assign(antiEnv, { PATH: process.env.PATH, PHASE: "full", RUNS_MATRIX: "true", RUNS_GATE: "true", O_REUSED: "true", O_DEPLOY: "skipped" });
const antiRun = extra => spawnSync("bash", ["-c", antiCode], { env: { ...antiEnv, ...extra }, encoding: "utf8" });
positive("workflow_full_same_preview_complete", antiRun({}).status === 0);
for (const key of ["O_CONTRACT", "O_RESOLVE", "O_AUTH", "O_BUILD", "O_REGISTRY", "O_DEPS", "O_VERIFY_GATE", "O_GATE", "O_GOLDEN", "O_VERIFY_HARNESS", "O_PAYMENT", "O_GALLERY"]) {
  const result = antiRun({ [key]: "skipped" });
  negative(`workflow_missing_${key}`, result.status === 1 && /skipped/.test(result.stdout), key);
}
for (const key of ["RUNS_MATRIX", "RUNS_GATE"]) {
  const result = antiRun({ [key]: "false" });
  negative(`workflow_full_loses_${key}`, result.status === 1 && result.stdout.includes("full must execute"), key);
}
const realBaseline = { ...docs, "checkout-gate.json": read("run-336/checkout-gate.json") };
negative("336_failing_baseline_remains_RED", hostedEvidenceFailures({ documents: realBaseline, required, binding }).some(f => f.includes("stripe_session_amount_mode_metadata_and_product_exact")), "original failing receipt preserved");
const summary = { positives: results.filter(r => r.type === "positive").length, mutations: results.filter(r => r.type === "mutation").length,
  passed: true, results };
fs.writeFileSync(path.join(evidenceDir, "surface-contract-tests.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(`PASS: ${summary.positives} positives; ${summary.mutations}/${summary.mutations} mutations caught for their named reason`);
