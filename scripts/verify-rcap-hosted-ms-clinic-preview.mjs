#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import ts from "typescript";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "yaml";

const entry = fs.readFileSync(".github/workflows/rcap-f1-ephemeral-staging.yml", "utf8");
const hosted = fs.readFileSync(".github/workflows/rcap-hosted-acceptance-staging.yml", "utf8");
const clinicFollowUp = fs.readFileSync("src/lib/clinic-mode/result-follow-up.ts", "utf8");
const resolver = fs.readFileSync("scripts/rcap-hosted-resolve-preview.mjs", "utf8");
const browser = fs.readFileSync("scripts/verify-rcap-commercial-browser.mjs", "utf8");
const authConfig = fs.readFileSync("scripts/rcap-hosted-acceptance-auth-config.mjs", "utf8");
const clinicSeed = fs.readFileSync("scripts/rcap-hosted-ms-clinic-preview-seed.mjs", "utf8");

const checks = [];
function check(label, condition) {
  assert.equal(Boolean(condition), true, label);
  checks.push(label);
  console.log(`ok ${checks.length} - ${label}`);
}

check("dispatch exposes one dedicated Clinic Preview mode", entry.includes("hosted_clinic_preview"));
check("dispatch maps Clinic Preview to its dedicated reusable phase", /inputs\.mode == 'hosted_clinic_preview'\s*&&\s*'clinic_preview'/.test(entry));
check("reusable workflow documents the Clinic Preview phase", hosted.includes("clinic_preview"));
check("hosted run executes this Clinic Preview verifier", /id: verify_clinic_preview[\s\S]{0,220}verify-rcap-hosted-ms-clinic-preview\.mjs/.test(hosted));
check("Clinic Preview has its own execution-contract flag", /clinic_preview\)\s+DEPLOY=true;\s+MATRIX=false;\s+GATE=false;\s+RETARGET=false;\s+BROWSER=false;\s+CLINIC=true/.test(hosted));
check("all non-Clinic phases explicitly clear the Clinic flag", /CLINIC=false/.test(hosted));
check("Clinic Preview requires the identity-scoped route", /\[ "\$CLINIC" = "true" \][\s\S]{0,180}require_staging_scoped=true/.test(hosted));
check("Preview resolution runs for Clinic Preview", /outputs\.clinic == 'true'/.test(hosted));
check("Clinic deploy receives Mississippi mode", /HOSTED_CLINIC_DEMO_MODE:\s*\$\{\{ steps\.contract\.outputs\.clinic == 'true' && 'mississippi_preview' \|\| '' \}\}/.test(hosted));
check("Clinic deploy receives the private demo password", /HOSTED_CLINIC_DEMO_PASSWORD:\s*\$\{\{ secrets\.HOSTED_CLINIC_DEMO_PASSWORD \}\}/.test(hosted));
check("Clinic Auth runs and receives Mississippi mode", /if: steps\.contract\.outputs\.matrix == 'true' \|\| steps\.contract\.outputs\.clinic == 'true'[\s\S]{0,700}HOSTED_CLINIC_DEMO_MODE:\s*\$\{\{ steps\.contract\.outputs\.clinic == 'true' && 'mississippi_preview' \|\| '' \}\}/.test(hosted));
check("Clinic seed is a dedicated step", /id: clinic_seed[\s\S]{0,500}if: steps\.contract\.outputs\.clinic == 'true'[\s\S]{0,700}HOSTED_CLINIC_DEMO_ACCESS_CODE:\s*\$\{\{ secrets\.HOSTED_CLINIC_DEMO_ACCESS_CODE \}\}/.test(hosted));
check("Clinic journey is a dedicated step", /id: clinic_journey[\s\S]{0,500}if: steps\.contract\.outputs\.clinic == 'true'/.test(hosted));
check("Clinic deploy receives no Stripe secret", /HOSTED_STRIPE_TEST_SECRET:\s*\$\{\{ steps\.contract\.outputs\.clinic != 'true'/.test(hosted) && /HOSTED_STRIPE_TEST_WEBHOOK_SECRET:\s*\$\{\{ steps\.contract\.outputs\.clinic != 'true'/.test(hosted));
check("Clinic journey receives no Stripe secret", !/id: clinic_journey[\s\S]{0,1200}HOSTED_STRIPE/.test(hosted));
check("Clinic phase installs browser dependencies without scheduling the legacy matrix", /steps\.contract\.outputs\.clinic == 'true'/.test(hosted) && /id: gate_deps/.test(hosted));
check("anti-skip records Clinic seed and journey outcomes", /O_CLINIC_SEED:\s*\$\{\{ steps\.clinic_seed\.outcome \}\}/.test(hosted) && /O_CLINIC_JOURNEY:\s*\$\{\{ steps\.clinic_journey\.outcome \}\}/.test(hosted));
check("anti-skip requires every Clinic Preview boundary", /\[ "\$RUNS_CLINIC" = "true" \][\s\S]*require "Clinic synthetic seed"[\s\S]*require "Clinic screening-to-packet journey"/.test(hosted));
check("workflow declares private Clinic credentials", /HOSTED_CLINIC_DEMO_PASSWORD:[\s\S]{0,80}required: true/.test(hosted) && /HOSTED_CLINIC_DEMO_ACCESS_CODE:[\s\S]{0,80}required: true/.test(hosted));
check("dedicated Clinic seed script exists", fs.existsSync("scripts/rcap-hosted-ms-clinic-preview-seed.mjs"));
check("sponsored browser supports Clinic entry", browser.includes("RCAP_BROWSER_CLINIC_EVENT_SLUG"));
check("successful packet claims bind the saved matter to the Clinic case", clinicFollowUp.includes("clinicCaseTreatmentFor") && /packet_ready[\s\S]{0,180}routeDisposition:\s*"packet"/.test(clinicFollowUp));
check("worker equivalence excludes only the measured server-only Clinic binding repair", hosted.includes("':(exclude)src/lib/clinic-mode/result-follow-up.ts'") && !fs.readFileSync("scripts/rcap-render-worker.mjs", "utf8").includes("result-follow-up"));
check("Preview resolver requires exact Clinic mode, scope, and no-Stripe metadata", resolver.includes("EXPECTED_CLINIC_DEMO_MODE") && resolver.includes("EXPECTED_STRIPE_CONFIGURED") && resolver.includes("EXPECTED_CLINIC_SCOPE_SHA256"));
check("Clinic resolver receives its exact mode", /id: resolve_preview[\s\S]{0,1800}HOSTED_CLINIC_DEMO_MODE:\s*\$\{\{ steps\.contract\.outputs\.clinic/.test(hosted));
check("browser verifies the exact Vercel Preview identity", browser.includes("RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID") && browser.includes("verifyExactHostedPreview"));
check("approved event staff use the event-scoped queue", browser.includes("/clinic/staff/${clinicEventId}/queue") && !browser.includes("/partner/clinic/${clinicEventId}/follow-up"));
check("staff proof asserts the created packet-ready case", browser.includes("participantSuffix") && browser.includes("Packet prepared"));
check("Auth and seed verify the SHA alias resolves to the exact deployment", authConfig.includes("aliasDeploymentId") && clinicSeed.includes("aliasDeploymentId"));
check("reset proof checks all browser storage and navigation boundaries", ["localStorage", "sessionStorage", "indexedDB", "caches.keys", "serviceWorker.getRegistrations", "goBack", "goForward"].every((marker) => browser.includes(marker)) && !/goBack\([^)]*\)[^;]*\.catch\(\(\) => null\)/.test(browser));
check("reset proof performs Participant B handoff in the same browser context", browser.includes("sameDeviceParticipantBDenial"));
check("browser evidence records the screening session and server generation response", browser.includes("screeningSessionId") && browser.includes("generationResponseBody"));
check("post-journey audit binds server-side Clinic, artifact, credit, and reset evidence", fs.existsSync("scripts/rcap-hosted-ms-clinic-preview-audit.mjs") && /id: clinic_audit[\s\S]{0,700}rcap-hosted-ms-clinic-preview-audit\.mjs/.test(hosted));
check("anti-skip requires the post-journey server audit", /O_CLINIC_AUDIT:\s*\$\{\{ steps\.clinic_audit\.outcome \}\}/.test(hosted) && /require "Clinic server-side audit" "\$O_CLINIC_AUDIT"/.test(hosted));

check("Clinic reuse is pinned and cannot create another Preview", /if \[ "\$PHASE" = "clinic_preview" \]; then[\s\S]*?dpl_9TNBAkg6Au9PLeNUto7PNiDshj9i[\s\S]*?DEPLOY=false/.test(hosted)
  && hosted.includes("if: inputs.phase != 'clinic_preview' && steps.contract.outputs.deploy"));
check("Clinic worker requires registry access and current database readback", hosted.includes('require "Clinic immutable worker registry access"') && hosted.includes('require "Clinic current database"'));

// Execute the actual browser controllers, without starting a browser, worker,
// or remote write. Faults must stop the real orchestration before its next
// state-changing operation, rather than merely satisfy source-string checks.
function controllers(source) {
  const ast = ts.createSourceFile("browser.mjs", source, ts.ScriptTarget.Latest, true);
  const names = ["pdfSha", "runClinicTargetCycle", "proveClinicFirstDelivery"];
  const declarations = names.map(name => {
    const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1, `one actual browser controller: ${name}`);
    return nodes[0].getText(ast);
  });
  return new Function("assert", "crypto", `${declarations.join("\n")}\nreturn {runClinicTargetCycle,proveClinicFirstDelivery};`)(assert, crypto);
}

function fixture() {
  const bytes = Buffer.from("%PDF-1.7\nClinic synthetic verification\n%%EOF\n");
  const hash = crypto.createHash("sha256").update(bytes).digest("hex");
  const identity = { packetItemId: "fixture-item", generatedItemId: "fixture-item", participantUserId: "fixture-owner", screeningSessionId: "fixture-session", clinicEventId: "fixture-event" };
  const job = { id: "fixture-job", briefcase_item_id: identity.packetItemId,
    sponsored_consumer_briefcase_item_id: identity.packetItemId, sponsored_consumer_auth_user_id: identity.participantUserId,
    sponsored_session_id: identity.screeningSessionId, sponsored_clinic_event_id: identity.clinicEventId,
    route_id: "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
    sponsored_route_key: "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
    sponsored_verification_hash: "a".repeat(64), current_verification_hash: "a".repeat(64),
    matter_id: "fixture-matter", partner_id: "fixture-partner", renderer_kind: "packet_document_v1", status: "queued", attempt_count: 0 };
  const workerDigest = "sha256:4704199f2f683b9169702f0d2b5038cb7724569091d88c347867ab6a95aa1b7b";
  const ready = { ...job, status: "artifact_validated", output_sha256: hash, output_storage_path: `fixture-job/${hash}.pdf`,
    output_byte_count: bytes.length, container_digest: workerDigest, delivery_eligibility: "eligible", delivered_at: null };
  const events = ["delivery_authorized", "transmission_started", "transmission_completed"].map((event_type, i) => ({ id: `${i}`, event_type, created_at: `2026-09-24T12:00:0${i}.000Z` }));
  const finalState = { job: { ...ready, status: "delivered", delivered_at: events[2].created_at }, events };
  const trace = [];
  let cycles = 0, downloads = 0, reads = 0;
  const ports = {
    workerDigest, preview: { deploymentId: "dpl_3RALTWqn3WbEsYFSk3Muh6qw2yhT" },
    targetJobs: async () => [cycles ? ready : job], accounting: async () => ({ consumed: 1, jobs: [job.id] }),
    readClaimOrder: async () => {
      trace.push("claim-order");
      return { readOutcome: "read", targetIsClaimable: true, predictedFirstClaim: job.id, targetClaimRank: 1, claimablePredecessors: 0 };
    },
    requireNoHistoricalHousekeeping: async () => { trace.push("history-check"); },
    receipt: async name => { trace.push(`receipt:${name}`); },
    runOneCycle: async id => {
      assert.ok(trace.includes("claim-order") && trace.includes("history-check") && trace.includes("receipt:before-worker"), "worker cannot precede target-first proof and receipt");
      assert.equal(id, job.id); assert.equal(cycles++, 0); trace.push("worker");
      return { exitCode: 0, cycleResult: { jobId: job.id, outcome: "finalized" }, rowsThatMoved: [job.id] };
    },
    deliveryState: async () => {
      trace.push("delivery-read"); reads += 1;
      // First post-response read is deliberately incomplete.
      return reads < 3 ? { job: ready, events: [] } : structuredClone(finalState);
    },
    downloadOnce: async () => {
      downloads += 1;
      if (downloads === 2) assert.ok(trace.includes("real-reader") && trace.includes("receipt:completion-before-repeat"), "repeat cannot cause first-request completion");
      assert.ok(downloads <= 2); trace.push(`download:${downloads}`);
      return { status: 200, contentType: "application/pdf", bytes };
    },
    getRenderJob: async id => { assert.equal(id, job.id); trace.push("real-reader"); return { id, status: "delivered", outputSha256: hash, outputStoragePath: ready.output_storage_path }; },
    generationCount: () => 1, sleep: async () => { trace.push("read-only-wait"); }
  };
  return { identity, job, ready, finalState, ports, trace, counts: () => ({ cycles, downloads }) };
}

const actual = controllers(browser);
const positive = fixture();
const proof = await actual.runClinicTargetCycle(positive.ports, positive.identity);
await actual.proveClinicFirstDelivery(positive.ports, proof.target, proof.evidence);
check("actual Clinic controllers retain delayed first-request completion before repeat", proof.evidence.completionObservedBeforeRepeatDownload === true
  && proof.evidence.receiptRepairPerformed === false && positive.trace.includes("read-only-wait")
  && positive.counts().cycles === 1 && positive.counts().downloads === 2);

for (const [label, change] of [
  ["claimable predecessor", f => { f.ports.readClaimOrder = async () => ({ readOutcome: "read", targetIsClaimable: true, predictedFirstClaim: "historical-job", targetClaimRank: 2, claimablePredecessors: 1 }); }],
  ["unreadable claim order", f => { f.ports.readClaimOrder = async () => ({ readOutcome: "query_error" }); }],
  ["another item's job", f => { f.job.sponsored_consumer_briefcase_item_id = "other-item"; }],
  ["another owner", f => { f.job.sponsored_consumer_auth_user_id = "other-owner"; }],
  ["changed verification", f => { f.job.current_verification_hash = "b".repeat(64); }],
  ["unsupported renderer", f => { f.job.renderer_kind = "unsupported"; }],
  ["duplicate targets", f => { f.ports.targetJobs = async () => [f.job, f.job]; }],
  ["historical housekeeping", f => { f.ports.requireNoHistoricalHousekeeping = async () => { throw Error("historical job would move"); }; }],
  ["failed pre-worker receipt", f => { f.ports.receipt = async () => { throw Error("disk receipt failed"); }; }]
]) {
  const f = fixture(); change(f);
  await assert.rejects(actual.runClinicTargetCycle(f.ports, f.identity));
  check(`${label} blocks the worker entirely`, f.counts().cycles === 0 && f.counts().downloads === 0);
}
for (const [label, change] of [
  ["worker reports another job", cycle => { cycle.cycleResult.jobId = "other-job"; }],
  ["target is retryable", cycle => { cycle.cycleResult = { jobId: "fixture-job", outcome: "failed", disposition: "retryable", errorCode: "storage_failure" }; }],
  ["worker changes historical state", cycle => { cycle.rowsThatMoved.push("historical-job"); }]
]) {
  const f = fixture(), run = f.ports.runOneCycle;
  f.ports.runOneCycle = async id => { const cycle = await run(id); change(cycle); return cycle; };
  await assert.rejects(actual.runClinicTargetCycle(f.ports, f.identity));
  check(`${label} stops without a retry or download`, f.counts().cycles === 1 && f.counts().downloads === 0);
}
for (const [label, change] of [
  ["missing completion", f => { f.ports.deliveryState = async () => ({ job: f.ready, events: [] }); }],
  ["aborted transmission", f => { f.finalState.events[2].event_type = "transmission_aborted"; }],
  ["failed transmission", f => { f.finalState.events[2].event_type = "transmission_failed"; }],
  ["unordered events", f => { f.finalState.events.reverse(); }],
  ["missing delivered timestamp", f => { f.finalState.job.delivered_at = null; }],
  ["null real reader", f => { f.ports.getRenderJob = async () => null; }],
  ["wrong real reader identity", f => { f.ports.getRenderJob = async () => ({ id: "other-job", status: "delivered" }); }],
  ["incorrect finalized hash", f => { f.ready.output_sha256 = "b".repeat(64); }],
  ["incorrect finalized byte count", f => { f.ready.output_byte_count += 1; }],
  ["failed completion evidence write", f => { const receipt = f.ports.receipt; f.ports.receipt = async name => { if (name === "completion-before-repeat") throw Error("receipt failed"); await receipt(name); }; }]
]) {
  const f = fixture(); change(f);
  await assert.rejects(actual.proveClinicFirstDelivery(f.ports, f.ready, {}));
  check(`${label} cannot be repaired by a repeat request`, f.counts().downloads === 1);
}

function assertBrowserWiring(source) {
  assert.match(source, /await runClinicTargetCycle\(ports,/);
  assert.match(source, /await proveClinicFirstDelivery\(/);
  assert.match(source, /bytes: await response\.body\(\)/);
  assert.match(source, /const \{ getRenderJob \} = await import\("\.\.\/src\/lib\/rcap\/render\/job-queue\.ts"\)/);
  assert.match(source, /workerDigest, preview: environmentClassification, targetJobs, accounting, getRenderJob,/);
  assert.match(source, /assert\.ok\(\[401, 404\]\.includes\(anonymous\.status\(\)\)/);
  assert.match(source, /anonymousContext\.request\.get\(downloadUrl\.href/);
  assert.match(source, /assert\.equal\(firstHash, target\.output_sha256/);
  assert.doesNotMatch(source, /record_packet_delivery_event|recordDeliveryEvent\s*\(|\bupdate\s+(?:public\.)?packet_render_jobs\b|\.update\(\s*\{\s*(?:status|delivered_at)/i);
}
assertBrowserWiring(browser);
check("actual browser wires full-body download, real reader, exact hash and anonymous denial without receipt writes", true);
for (const [label, from, to] of [
  ["direct event write", "// These two controllers", "await sql('select record_packet_delivery_event()');\n// These two controllers"],
  ["direct status update", "// These two controllers", "await sql(\"update public.packet_render_jobs set status='delivered'\");\n// These two controllers"],
  ["missing anonymous denial", "assert.ok([401, 404].includes(anonymous.status())", "assert.ok(true"],
  ["missing real reader", 'const { getRenderJob } = await import("../src/lib/rcap/render/job-queue.ts")', 'const getRenderJob = async () => ({status:"delivered"})'],
  ["missing artifact hash comparison", "assert.equal(firstHash, target.output_sha256", "assert.equal(firstHash, firstHash"]
]) {
  assert.ok(browser.includes(from));
  assert.throws(() => assertBrowserWiring(browser.replace(from, to)));
  check(`proof verifier rejects ${label}`, true);
}
const premature = browser.replace('const claimOrder = await ports.readClaimOrder(target.id, target.renderer_kind);', 'await ports.runOneCycle(target.id);\n  const claimOrder = await ports.readClaimOrder(target.id, target.renderer_kind);');
const f = fixture();
await assert.rejects(controllers(premature).runClinicTargetCycle(f.ports, f.identity), /worker cannot precede/);
check("proof verifier rejects a worker before target-first claim order", f.counts().cycles === 0);
const earlyRepeat = browser.replace('let state;\n  // Same bounded', 'await ports.downloadOnce();\n  let state;\n  // Same bounded');
assert.notEqual(earlyRepeat, browser);
const repeated = fixture();
await assert.rejects(controllers(earlyRepeat).proveClinicFirstDelivery(repeated.ports, repeated.ready, {}), /repeat cannot cause/);
check("proof verifier rejects repeat before first completion is observed", true);

// Execute the real normalized phase and anti-skip shell. A deployment-only
// verdict cannot be mistaken for participant-journey acceptance.
const workflow = parse(hosted);
const workflowSteps = workflow.jobs.preflight.steps;
const contractStep = workflowSteps.find(s => s.id === "contract");
const antiskipStep = workflowSteps.find(s => s.id === "antiskip");
const executionDir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-clinic-deploy-contract-"));
try {
  const inputs = { phase: "clinic_deploy", application_sha: "a0d0b933f7241a209379775754540fc22775f174",
    preview_hostname: "", preview_deployment_id: "", promotion_code: "", journey_state: "", contradiction_job_id: "" };
  const output = path.join(executionDir, "outputs");
  const shell = contractStep.run.replace(/\$\{\{ inputs\.(\w+) \}\}/g, (_, key) => inputs[key] ?? "");
  const run = spawnSync("bash", ["-c", shell], { encoding: "utf8", env: { PATH: process.env.PATH, GITHUB_OUTPUT: output }, cwd: executionDir });
  check("deployment-only phase normalizes successfully", run.status === 0);
  const outputs = Object.fromEntries(fs.readFileSync(output, "utf8").trim().split("\n").map(line => line.split("=")));
  check("deployment-only phase enables deployment and scope without a journey", outputs.deploy === "true" && outputs.require_staging_scoped === "true"
    && ["matrix", "gate", "retarget", "browser", "clinic", "legal_aid", "diagnose"].every(k => outputs[k] === "false"));
  const steps = Object.fromEntries(workflowSteps.filter(s => s.id).map(s => [s.id, { outputs: {}, outcome: "skipped" }]));
  steps.contract = { outputs, outcome: "success" };
  const evaluate = expression => new Function("inputs", "steps", "always", "success", `return (${expression.replace(/^\$\{\{|\}\}$/g, "")});`)(inputs, steps, () => true, () => true);
  for (const step of workflowSteps.filter(s => s.id)) if (!step.if || evaluate(step.if)) steps[step.id].outcome = "success";
  check("deployment-only phase schedules verifier, dependencies and isolated deployer", ["gate_deps", "verify_clinic_preview", "deploy_preview"].every(id => steps[id].outcome === "success"));
  const forbidden = ["auth_identities", "clinic_seed", "clinic_journey", "clinic_audit", "clinic_database_readback", "registry_login", "checkout_browser", "matrix_build", "checkout_gate", "payment_journey", "golden_journey", "stripe_fixtures", "stripe_retarget", "clinic_migrate", "legal_aid_migrate"];
  check("deployment-only phase skips every participant, worker, payment, Auth and migration operation", forbidden.every(id => steps[id].outcome === "skipped"));
  const deployStep = workflowSteps.find(s => s.id === "deploy_preview");
  check("deployment-only phase passes isolated purpose and no Stripe credentials", evaluate(deployStep.env.HOSTED_ISOLATED_CLINIC_PREVIEW) === "true"
    && evaluate(deployStep.env.HOSTED_CLINIC_DEMO_MODE) === "mississippi_preview"
    && evaluate(deployStep.env.HOSTED_STRIPE_TEST_SECRET) === "" && evaluate(deployStep.env.HOSTED_STRIPE_TEST_WEBHOOK_SECRET) === "");
  const env = Object.fromEntries(Object.entries(antiskipStep.env).map(([key, value]) => [key, String(evaluate(value) ?? "")]));
  const anti = patch => spawnSync("bash", ["-c", antiskipStep.run], { encoding: "utf8", env: { PATH: process.env.PATH, ...env, ...patch }, cwd: executionDir });
  check("actual anti-skip accepts deployment-only success", anti({}).status === 0);
  for (const key of ["O_DEPLOY", "O_VERIFY_CLINIC_PREVIEW", "O_DEPS"]) check(`deployment-only anti-skip rejects skipped ${key}`, anti({ [key]: "skipped" }).status !== 0);
  for (const key of ["O_AUTH", "O_CLINIC_JOURNEY", "O_CLINIC_SEED", "O_REGISTRY", "O_STRIPE_FIXTURES", "O_STRIPE_RETARGET", "O_CLINIC_MIGRATE"]) check(`deployment-only anti-skip rejects executed ${key}`, anti({ [key]: "success" }).status !== 0);
} finally {
  fs.rmSync(executionDir, { recursive: true });
}


// Execute the real identity verifier at a mocked Vercel HTTP boundary. The
// successor is supplied by the caller; no transient release literal is authority.
{
  const ast=ts.createSourceFile('browser.mjs',browser,ts.ScriptTarget.Latest,true);
  const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='verifyExactHostedPreview').getText(ast);
  const env={RCAP_BROWSER_VERCEL_TOKEN:'test-token',RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID:'dpl_SyntheticSuccessor',RCAP_BROWSER_APPLICATION_SHA:'a'.repeat(40),RCAP_BROWSER_WORKER_SOURCE_SHA:'b'.repeat(40),RCAP_BROWSER_WORKER_DIGEST:'sha256:'+'c'.repeat(64),RCAP_BROWSER_ACCEPTANCE_PROJECT_REF:'hyflxnlhpmiqxvvcoiia',RCAP_BROWSER_EXPECTED_SCOPE_SHA256:'d'.repeat(64)};
  const host='successor-clinic.vercel.app';
  const fixture={id:env.RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID,readyState:'READY',target:null,projectId:'prj_Test',gitSource:{sha:env.RCAP_BROWSER_APPLICATION_SHA},meta:{rcapApplicationSha:env.RCAP_BROWSER_APPLICATION_SHA,rcapWorkerSourceSha:env.RCAP_BROWSER_WORKER_SOURCE_SHA,rcapWorkerDigest:env.RCAP_BROWSER_WORKER_DIGEST,rcapAcceptanceProjectRef:env.RCAP_BROWSER_ACCEPTANCE_PROJECT_REF,rcapRouteState:'staging_scoped',rcapClinicDemoMode:'mississippi_preview',rcapStagingScopeSha256:env.RCAP_BROWSER_EXPECTED_SCOPE_SHA256,rcapStripeConfigured:'false'}};
  const required=k=>{assert.ok(env[k],k);return env[k];};
  const verify=async(d=fixture,aliasId=fixture.id)=>new Function('required','clinicMode','resolveHostedVercelIdentity','hostedVercelScopedUrl','fetch','fail',fn+';return verifyExactHostedPreview;')(
    required,true,async()=>({projectId:'prj_Test'}),route=>'https://api.vercel.test'+route,
    async url=>({ok:true,json:async()=>url.endsWith('/aliases')?{aliases:[]}:url.endsWith(host)?{id:aliasId}:d}),message=>{throw Error(message);})(`https://${host}`,'test-bypass');
  const verified=await verify();assert.equal(verified.workerSourceSha,env.RCAP_BROWSER_WORKER_SOURCE_SHA);assert.equal(verified.workerDigest,env.RCAP_BROWSER_WORKER_DIGEST);
  check('provider identity returns the exact supplied verified worker tuple',true);
  for (const field of ['rcapApplicationSha','rcapWorkerSourceSha','rcapWorkerDigest','rcapAcceptanceProjectRef','rcapRouteState','rcapClinicDemoMode','rcapStagingScopeSha256','rcapStripeConfigured']) {
    await assert.rejects(verify({...fixture,meta:{...fixture.meta,[field]:'wrong'}}));
    check(`provider identity refuses mismatched ${field}`,true);
  }
  for (const patch of [{id:'dpl_Other'},{gitSource:{sha:'e'.repeat(40)}},{projectId:'prj_Other'},{target:'production'},{readyState:'ERROR'}]) await assert.rejects(verify({...fixture,...patch}));
  await assert.rejects(verify(fixture,'dpl_Other'));
  check('provider identity refuses wrong deployment/source/project/target/state/alias',true);
  const ports=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='clinicDeliveryPorts').getText(ast);
  const start=ports.indexOf('  assert.equal(environmentClassification.previewVerified');
  const prefix=ports.slice(start,ports.indexOf('  const image ='));
  const validate=value=>new Function('assert','environmentClassification','required','baseUrl','packetItemId','participantUserId','screeningSessionId','clinicEventId','validUuid',prefix)(assert,value,required,`https://${host}`,'id','id','id','id',()=>true);
  validate(verified);
  for(const field of ['previewVerified','deploymentId','hostname','applicationSha','workerSourceSha','workerDigest','acceptanceProjectRef','clinicDemoMode','routeState','stripeConfigured'])assert.throws(()=>validate({...verified,[field]:'wrong'}));
  check('Clinic delivery consumes verified identity and refuses any tuple divergence before credential access',true);
  check('Clinic delivery carries no historical release literals',!/(dpl_3RALTW|a0d0b933|615b4021|4704199f)/.test(ports));
}
console.log(`Hosted Mississippi Clinic Preview workflow: PASS — ${checks.length}/${checks.length} contract and behavioral checks.`);
