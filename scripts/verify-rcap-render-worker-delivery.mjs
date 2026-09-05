import { exerciseIllinoisDelivery } from "./test-rcap-il-delivery-ephemeral.mjs";
// End-to-end verification of the render worker and the delivery layer against
// a real ephemeral database and a real (filesystem-backed) storage adapter.
//
// The worker under test is the production runWorkerCycle with its real
// dependency shapes: the queue port shells into the actual phase-48 functions,
// storage honors the same write-once/read contract as the Supabase adapter,
// and the renderer is the real pdf-lib packet renderer (or a deterministic
// stub where convergence needs identical bytes).
//
// Covered here:
//   worker happy path: claim -> render -> upload -> re-read -> finalize
//   crash injection after claim, during render, after upload, after re-read,
//     after committed finalization — every retry converges with no duplicate
//     consumption
//   storage failure matrix: missing object, corrupted object, replaced-with-
//     another-job's-valid-PDF, unparseable stored PDF — all fail closed
//   authorized delivery: ownership, eligibility, integrity re-read, streaming
//     with delivery_started / delivery_completed / delivery_aborted, repeat
//     downloads free, cross-person and unauthenticated denials
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { runWorkerCycle } = await import("../src/lib/rcap/render/render-worker.ts");
const { authorizePacketDownload, streamAuthorizedPacket } = await import("../src/lib/rcap/render/packet-delivery.ts");
const { renderRcapPacketPdf } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");

if (!ephemeralPgAvailable()) {
  console.error("verify-rcap-render-worker-delivery: PostgreSQL 16 is not available in this environment.");
  process.exit(1);
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const db = startEphemeralPg();
const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-artifacts-"));
const P1 = "11111111-1111-1111-1111-111111111111";
const PERSON_A = "aaaaaaaa-1111-1111-1111-111111111111";
const USER_OWNER = "0e0e0e0e-1111-1111-1111-111111111111";
const USER_OTHER = "0f0f0f0f-1111-1111-1111-111111111111";
const BRIEFCASE_ITEM = "b1b1b1b1-1111-1111-1111-111111111111";

// --- adapters over the real database ---------------------------------------

function claimPort(worker) {
  const row = db.json(
    `select row_to_json(t) from (select * from claim_packet_render_job('${worker}', null, 60)) t`
  );
  if (!row) return null;
  return {
    id: row.id,
    packetId: row.packet_id,
    routeId: row.route_id,
    rendererKind: row.renderer_kind,
    rendererVersion: row.renderer_version,
    sourceSha256: row.source_sha256,
    profileId: row.profile_id,
    profileVersion: row.profile_version,
    inputHash: row.input_hash,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    partnerId: row.partner_id,
    personId: row.person_id,
    matterId: row.matter_id,
    fencingToken: row.fencing_token,
    claimExpiresAt: row.claim_expires_at
  };
}

const queuePort = {
  claim: async (worker) => claimPort(worker),
  startRender: async (jobId, token) => db.scalar(`select start_packet_render('${jobId}', '${token}')`) === "t",
  startValidation: async (jobId, token) => db.scalar(`select start_packet_validation('${jobId}', '${token}')`) === "t",
  fail: async (jobId, token, code, detail, retryable) =>
    db.scalar(
      `select fail_packet_render_job('${jobId}', '${token}', '${code}', '${String(detail).replaceAll("'", "''").slice(0, 500)}', ${retryable})`
    ),
  finalize: async (input) => {
    const row = db.json(
      `select row_to_json(t) from (select * from finalize_packet_render_job('${input.jobId}', '${input.fencingToken}', '${input.outputStoragePath}', '${input.localSha256}', '${input.localNormalizedSha256}', '${input.storedSha256}', '${input.storedNormalizedSha256}', ${input.outputByteCount}, ${input.outputPageCount}, '${input.containerDigest}')) t`
    );
    if (!row) return null;
    return {
      accountingResult: row.accounting_result,
      deliveryEligibility: row.delivery_eligibility,
      consumptionUnitHash: row.consumption_unit_hash,
      creditLedgerId: row.credit_ledger_id
    };
  },
  releaseExpired: async () => Number(db.scalar(`select release_expired_packet_render_claims()`)),
  requeueRetryable: async () => Number(db.scalar(`select requeue_retryable_packet_render_jobs()`))
};

// Filesystem storage honoring the production contract: write-once, exact read.
const storage = {
  async upload(objectPath, bytes) {
    const abs = path.join(storageRoot, objectPath);
    if (fs.existsSync(abs)) return { ok: false, reason: "object already exists (409)" };
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, bytes);
    return { ok: true };
  },
  async read(objectPath) {
    const abs = path.join(storageRoot, objectPath);
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs);
  }
};

const packetFor = (packetId) => ({
  id: packetId,
  state: "MS",
  pathway: "misdemeanor_conviction",
  petitionerFirstName: "Test",
  petitionerLastName: "Participant",
  county: "Hinds",
  // The packet id is folded into RENDERED content on purpose.
  //
  // SF-DEFECT-001: this fixture used to give every packet identical visible
  // text, and `id` is never drawn into the document. pdf-lib stamps a
  // creation/modification timestamp with one-second granularity, so two
  // different jobs rendered inside the same second produced BYTE-IDENTICAL
  // artifacts. The substitution case below then substituted jobA's own bytes
  // for jobA's, they hash-matched, delivery correctly served them, and the
  // "fails closed" assert failed — a flake whose frequency depended on where a
  // second boundary happened to land.
  //
  // With the id in the text, two jobs can never render the same bytes, so the
  // case tests what it claims to: a genuinely different artifact is refused.
  generatedPlainText: `Petitioner requests expungement. Packet ${packetId}.`,
  filingNextStepsPacket: {
    title: "t",
    plainText: "1. File.",
    filingLocation: "clerk",
    filingMethod: "in person",
    requiredDocuments: ["ID"],
    serviceAndCopies: [],
    feeSummary: ["fee"],
    courtContactOrLocationGuidance: [],
    afterFiling: [],
    trackingChecklist: [],
    workflowGaps: [],
    safetyDisclaimer: "Not legal advice."
  }
});

const realRenderer = { render: async (claim) => renderRcapPacketPdf(packetFor(claim.packetId), "full") };

const baseDeps = (renderer = realRenderer) => ({
  queue: queuePort,
  storage,
  renderer,
  allowlists: {
    allowedSourceShas: new Set(),
    knownProfileVersions: new Set(["1.3.0"]),
    supportedRendererKinds: new Set(["packet_document_v1"])
  },
  workerId: "verify-worker",
  containerDigest: "sha256:verify-container"
});

let jobSeq = 0;
function enqueue({ briefcase = null, partner = null, person = null, matter = null }) {
  jobSeq += 1;
  const hash = createHash("sha256").update(`wd-input-${jobSeq}`).digest("hex");
  const packetRow = db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);
  return db
    .scalar(
      `select id from enqueue_packet_render_job('${packetRow}', 'MS:misdemeanor_conviction', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${hash}', ${briefcase ? `'${briefcase}'` : "null"}, ${partner ? `'${partner}'` : "null"}, ${person ? `'${person}'` : "null"}, ${matter ? `'${matter}'` : "null"}, 5, null, null)`
    )
    .trim();
}

function jobRow(jobId) {
  return db.json(
    `select row_to_json(t) from (select id, status, delivery_eligibility, accounting_result, briefcase_item_id, route_id, output_storage_path, output_sha256, normalized_output_sha256, attempt_count, partner_id, person_id, matter_id, renderer_kind, renderer_version, max_attempts, failure_disposition, error_code as last_error_code from packet_render_jobs where id = '${jobId}') t`
  );
}

function deliveryRow(jobId) {
  const row = jobRow(jobId);
  return {
    id: row.id,
    packetId: "x",
    routeId: row.route_id,
    briefcaseItemId: row.briefcase_item_id,
    partnerId: row.partner_id,
    personId: row.person_id,
    matterId: row.matter_id,
    rendererKind: row.renderer_kind,
    rendererVersion: row.renderer_version,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    failureDisposition: row.failure_disposition,
    lastErrorCode: row.last_error_code,
    outputStoragePath: row.output_storage_path,
    outputSha256: row.output_sha256,
    normalizedOutputSha256: row.normalized_output_sha256,
    deliveryEligibility: row.delivery_eligibility,
    accountingResult: row.accounting_result
  };
}

const deliveryPorts = {
  getJob: async (jobId) => (jobRow(jobId) ? deliveryRow(jobId) : null),
  userOwnsBriefcaseItem: async (userId, briefcaseItemId) => userId === USER_OWNER && briefcaseItemId === BRIEFCASE_ITEM,
  storage,
  recordEvent: async (input) => {
    try {
      return db.scalar(
        `select record_packet_delivery_event('${input.jobId}', '${input.eventType}', ${input.actorUserId ? `'${input.actorUserId}'` : "null"}, '${JSON.stringify(input.requestContext ?? {}).replaceAll("'", "''")}'::jsonb)`
      );
    } catch {
      return null;
    }
  }
};

function eventCounts(jobId) {
  return db.json(
    `select coalesce(json_object_agg(event_type, n), '{}'::json) from (select event_type, count(*) n from packet_delivery_events where render_job_id = '${jobId}' group by event_type) s`
  );
}

async function readAll(response) {
  const chunks = [];
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

const consumedCount = () => db.scalar(`select count(*) from packet_credit_ledger where event_type in ('consumed','overage_consumed')`);

try {
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`alter default privileges in schema public grant all on tables to service_role`);
  db.sql(`create table public.partner_records (id uuid primary key, partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  // Local identity fixtures and the existing consumer schema; no hosted auth.
  db.sql(`create role anon nologin`);
  db.sql(`create role authenticated nologin`);
  db.sql(`create schema auth`);
  db.sql(`create table auth.users (id uuid primary key)`);
  db.sql(`create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$`);
  db.sql(`insert into auth.users values ('${USER_OWNER}')`);
  for (const migration of ["phase-26-consumer-briefcase-items.sql", "phase-27-consumer-checkout-metadata.sql", "phase-28-consumer-packet-generation-status.sql"]) {
    db.applyFile(path.join(rootDir, "supabase", migration));
  }
  db.applyFile(path.join(rootDir, "supabase/phase-49-rcap-packet-render-jobs.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-50-rcap-packet-delivery-hardening.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-51-rcap-consumer-payment-gate.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-52-rcap-consumer-payment-authority.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-53-rcap-consumer-job-binding.sql"));
  db.sql(`insert into partner_records values ('${P1}','we-must-vote')`);
  db.sql(`insert into rcap_persons values ('${PERSON_A}','we-must-vote','a')`);
  db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap) values ('${P1}', 10, false, 0)`);

  // --- worker happy path -----------------------------------------------------
  const m1 = "9aaaaaaa-2222-1111-1111-111111111111";
  const jobA = enqueue({ briefcase: BRIEFCASE_ITEM, partner: P1, person: PERSON_A, matter: m1 });
  const happy = await runWorkerCycle(baseDeps());
  assert(happy.outcome === "finalized" && happy.jobId === jobA, `worker: happy path finalizes (${JSON.stringify(happy)})`);
  assert(happy.accountingResult === "consumed" && happy.deliveryEligibility === "eligible", "worker: happy path consumes and is eligible");
  const rowA = jobRow(jobA);
  assert(rowA.status === "artifact_validated" && rowA.output_storage_path.includes(jobA), "worker: evidence recorded with a bound path");
  const storedA = await storage.read(rowA.output_storage_path);
  assert(storedA !== null && createHash("sha256").update(storedA).digest("hex") === rowA.output_sha256, "worker: stored bytes hash to the recorded evidence");

  // --- crash injection -------------------------------------------------------
  // 1. Crash after claim: the claim leases out, the worker dies, the lease
  //    expires, the job returns to the queue, a later cycle completes it.
  const m2 = "9bbbbbbb-2222-1111-1111-111111111111";
  const jobB = enqueue({ briefcase: BRIEFCASE_ITEM, partner: P1, person: PERSON_A, matter: m2 });
  const crashedClaim = await queuePort.claim("crash-after-claim");
  assert(crashedClaim?.id === jobB, "crash1: claim taken then abandoned");
  db.sql(`update packet_render_jobs set claim_expires_at = now() - interval '1 minute' where id = '${jobB}'`);
  const afterCrash1 = await runWorkerCycle(baseDeps());
  assert(afterCrash1.outcome === "finalized" && afterCrash1.jobId === jobB, `crash1: retry converges (${JSON.stringify(afterCrash1)})`);
  assert(afterCrash1.accountingResult === "consumed", "crash1: exactly one consumption after crash");

  // 2. Crash during render: the renderer throws; the job fails retryably and a
  //    later cycle converges. Same matter as a consumed one? No — new matter.
  const m3 = "9ccccccc-2222-1111-1111-111111111111";
  const jobC = enqueue({ briefcase: BRIEFCASE_ITEM, partner: P1, person: PERSON_A, matter: m3 });
  let renderCalls = 0;
  const flakyRenderer = {
    render: async (claim) => {
      renderCalls += 1;
      if (renderCalls === 1) throw new Error("injected render crash");
      return realRenderer.render(claim);
    }
  };
  const crash2a = await runWorkerCycle(baseDeps(flakyRenderer));
  assert(crash2a.outcome === "failed" && crash2a.disposition === "retryable", `crash2: render crash fails retryably (${JSON.stringify(crash2a)})`);
  db.sql(`update packet_render_jobs set next_attempt_at = now() - interval '1 second' where id = '${jobC}'`);
  const crash2b = await runWorkerCycle(baseDeps(flakyRenderer));
  assert(crash2b.outcome === "finalized" && crash2b.jobId === jobC, `crash2: retry converges (${JSON.stringify(crash2b)})`);

  // 3. Crash after upload, before re-read: deterministic bytes so the retry
  //    lands on the same content-addressed path and re-uses the object.
  const m4 = "9ddddddd-2222-1111-1111-111111111111";
  const jobD = enqueue({ briefcase: BRIEFCASE_ITEM, partner: P1, person: PERSON_A, matter: m4 });
  const fixedBytes = await realRenderer.render({ packetId: "wd-4" });
  const fixedRenderer = { render: async () => fixedBytes };
  let readCalls = 0;
  const crashingStorage = {
    upload: storage.upload,
    read: async (objectPath) => {
      readCalls += 1;
      if (readCalls === 1) throw new Error("injected crash after upload, before re-read");
      return storage.read(objectPath);
    }
  };
  const crash3a = await runWorkerCycle({ ...baseDeps(fixedRenderer), storage: crashingStorage });
  assert(crash3a.outcome === "failed", `crash3: crash after upload fails the attempt (${JSON.stringify(crash3a)})`);
  db.sql(`update packet_render_jobs set next_attempt_at = now() - interval '1 second' where id = '${jobD}'`);
  const beforeLedger3 = consumedCount();
  const crash3b = await runWorkerCycle({ ...baseDeps(fixedRenderer), storage: crashingStorage });
  assert(crash3b.outcome === "finalized" && crash3b.jobId === jobD, `crash3: retry after upload-crash converges on the existing object (${JSON.stringify(crash3b)})`);
  assert(Number(consumedCount()) === Number(beforeLedger3) + 1, "crash3: exactly one consumption despite the duplicate upload attempt");

  // 4. Crash after committed finalization, before acknowledgement: calling the
  //    cycle again finds nothing to do; calling finalize again converges.
  const finRepeat = await queuePort.finalize({
    jobId: jobD,
    fencingToken: "00000000-0000-0000-0000-000000000000",
    outputStoragePath: jobRow(jobD).output_storage_path,
    localSha256: jobRow(jobD).output_sha256,
    localNormalizedSha256: jobRow(jobD).normalized_output_sha256,
    storedSha256: jobRow(jobD).output_sha256,
    storedNormalizedSha256: jobRow(jobD).normalized_output_sha256,
    outputByteCount: 1,
    outputPageCount: 1,
    containerDigest: "x"
  });
  assert(finRepeat?.accountingResult === "consumed", "crash4: post-commit finalize retry returns the recorded outcome");
  assert(Number(consumedCount()) === Number(beforeLedger3) + 1, "crash4: and consumes nothing further");

  // --- authorized delivery ---------------------------------------------------
  const okDecision = await authorizePacketDownload(deliveryPorts, { jobId: jobA, userId: USER_OWNER });
  assert(okDecision.ok === true, `delivery: owner is authorized (${JSON.stringify(okDecision)})`);
  const response = await streamAuthorizedPacket(deliveryPorts, okDecision, { userId: USER_OWNER });
  assert(response.headers.get("content-type") === "application/pdf", "delivery: content-type is application/pdf");
  assert(/attachment; filename=".+\.pdf"/.test(response.headers.get("content-disposition") ?? ""), "delivery: attachment disposition");
  const delivered = await readAll(response);
  assert(delivered.length === okDecision.bytes.length && delivered.subarray(0, 5).toString("latin1") === "%PDF-", "delivery: the streamed bytes are the artifact");
  await new Promise((resolve) => setTimeout(resolve, 50));
  let counts = eventCounts(jobA);
  assert(counts.delivery_authorized === 1 && counts.transmission_completed === 1, `delivery: started+completed recorded (${JSON.stringify(counts)})`);
  assert(jobRow(jobA).status === "delivered", "delivery: completion advances the job");

  // Repeat download: free.
  const again = await authorizePacketDownload(deliveryPorts, { jobId: jobA, userId: USER_OWNER });
  assert(again.ok === true, "delivery: repeat authorization");
  await readAll(await streamAuthorizedPacket(deliveryPorts, again, { userId: USER_OWNER }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  counts = eventCounts(jobA);
  assert(counts.transmission_completed === 2, "delivery: repeat download recorded");
  assert(Number(consumedCount()) === Number(beforeLedger3) + 1, "delivery: repeat downloads consume nothing");

  // Abort mid-stream.
  // A small chunk size forces a multi-chunk stream so the cancel arrives while
  // the source still has bytes to produce.
  const abortDecision = await authorizePacketDownload(deliveryPorts, { jobId: jobA, userId: USER_OWNER });
  const abortResponse = await streamAuthorizedPacket(deliveryPorts, abortDecision, { userId: USER_OWNER, chunkSize: 256 });
  const reader = abortResponse.body.getReader();
  await reader.read();
  await reader.cancel();
  await new Promise((resolve) => setTimeout(resolve, 50));
  counts = eventCounts(jobA);
  assert(counts.transmission_aborted === 1, `delivery: client abort recorded as transmission_aborted (${JSON.stringify(counts)})`);

  // Denials: unauthenticated, cross-person.
  const noAuth = await authorizePacketDownload(deliveryPorts, { jobId: jobA, userId: null });
  assert(noAuth.ok === false && noAuth.status === 401, "delivery: unauthenticated is denied");
  const crossPerson = await authorizePacketDownload(deliveryPorts, { jobId: jobA, userId: USER_OTHER });
  assert(crossPerson.ok === false && crossPerson.status === 403, "delivery: another user is denied without detail");
  const unknownJob = await authorizePacketDownload(deliveryPorts, { jobId: "3d3d3d3d-1111-1111-1111-111111111111", userId: USER_OWNER });
  assert(unknownJob.ok === false && unknownJob.status === 404, "delivery: unknown job is not found");

  // A valid artifact that is accounting-blocked is refused before storage.
  db.sql(`update partner_packet_entitlement set packet_cap = 0 where partner_id = '${P1}'`);
  const mBlocked = "9eeeeeee-2222-1111-1111-111111111111";
  const jobBlocked = enqueue({ briefcase: BRIEFCASE_ITEM, partner: P1, person: PERSON_A, matter: mBlocked });
  const blockedCycle = await runWorkerCycle(baseDeps());
  assert(blockedCycle.outcome === "finalized" && blockedCycle.deliveryEligibility === "accounting_blocked", `delivery: cap-lost artifact is accounting_blocked (${JSON.stringify(blockedCycle)})`);
  const blockedDecision = await authorizePacketDownload(deliveryPorts, { jobId: jobBlocked, userId: USER_OWNER });
  assert(blockedDecision.ok === false && blockedDecision.status === 409 && blockedDecision.code === "not_deliverable", "delivery: the download route refuses an accounting-blocked artifact");
  db.sql(`update partner_packet_entitlement set packet_cap = 10 where partner_id = '${P1}'`);

  // --- storage failure matrix ------------------------------------------------
  const evidencePath = jobRow(jobA).output_storage_path;
  const evidenceAbs = path.join(storageRoot, evidencePath);
  const originalBytes = fs.readFileSync(evidenceAbs);

  // Missing object.
  fs.rmSync(evidenceAbs);
  const missing = await authorizePacketDownload(deliveryPorts, { jobId: jobA, userId: USER_OWNER });
  assert(missing.ok === false && missing.code === "artifact_unavailable", "storage: a missing object fails closed");

  // Corrupted object.
  fs.writeFileSync(evidenceAbs, Buffer.concat([originalBytes.subarray(0, 100), Buffer.from("corruption")]));
  const corrupted = await authorizePacketDownload(deliveryPorts, { jobId: jobA, userId: USER_OWNER });
  assert(corrupted.ok === false && corrupted.code === "artifact_corrupt", "storage: a corrupted object fails closed");

  // Replaced with another job's perfectly valid PDF.
  //
  // SF-DEFECT-001 precondition, asserted rather than assumed. The case below is
  // only meaningful if jobD's artifact is genuinely a DIFFERENT artifact. When
  // the fixture rendered content-identical packets, two jobs landing in the same
  // one-second pdf-lib timestamp window produced the same bytes, the
  // substitution substituted jobA's own artifact for itself, and the "fails
  // closed" assert failed for a reason that had nothing to do with delivery.
  // Asserting the precondition turns that timing-dependent flake into a
  // deterministic, self-explaining failure the moment the fixture stops
  // distinguishing packets.
  const otherValid = fs.readFileSync(path.join(storageRoot, jobRow(jobD).output_storage_path));
  assert(
    !otherValid.equals(originalBytes),
    "SF-DEFECT-001: jobD's artifact is byte-identical to jobA's, so the substitution case " +
      "would be vacuous. The packet fixture must render distinguishing content per packet id."
  );
  fs.writeFileSync(evidenceAbs, otherValid);
  const replaced = await authorizePacketDownload(deliveryPorts, { jobId: jobA, userId: USER_OWNER });
  assert(replaced.ok === false && replaced.code === "artifact_corrupt", "storage: another job's valid PDF at this path fails closed");

  // Unparseable stored PDF (valid header, garbage body).
  fs.writeFileSync(evidenceAbs, Buffer.from("%PDF-1.7 garbage"));
  const unparseable = await authorizePacketDownload(deliveryPorts, { jobId: jobA, userId: USER_OWNER });
  assert(unparseable.ok === false && unparseable.code === "artifact_corrupt", "storage: unparseable stored bytes fail closed");

  // Restore and prove recovery.
  fs.writeFileSync(evidenceAbs, originalBytes);
  const recovered = await authorizePacketDownload(deliveryPorts, { jobId: jobA, userId: USER_OWNER });
  assert(recovered.ok === true, "storage: the intact object serves again");

  // Failure events were recorded for the integrity failures.
  counts = eventCounts(jobA);
  assert((counts.transmission_failed ?? 0) >= 3, `storage: integrity failures recorded as transmission_failed (${JSON.stringify(counts)})`);

  // Write-once: uploading over an existing object is refused by the adapter.
  const overwrite = await storage.upload(evidencePath, Buffer.from("evil"));
  assert(overwrite.ok === false, "storage: overwriting a validated object is refused");
  await exerciseIllinoisDelivery({ db, deps: baseDeps(), deliveryPorts, userId: USER_OWNER, partnerId: P1, personId: PERSON_A });
} finally {
  db.stop();
  fs.rmSync(storageRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("verify-rcap-render-worker-delivery FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("verify-rcap-render-worker-delivery passed: worker, storage and delivery hold end to end, including crash and corruption injection.");
