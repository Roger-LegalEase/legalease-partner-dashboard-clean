// Runtime verification of the containerized render worker's operational
// contract — the pieces the delivery verifier does not own:
//
//   graceful drain: SIGTERM during an idle sleep stops promptly; SIGTERM
//     mid-cycle lets the in-flight cycle finish and starts no other
//   claim lease configuration: RCAP_WORKER_CLAIM_SECONDS parsing (default
//     600, garbage refused) so lease/termination-grace coordination is real
//   observability: the JSON cycle line the loop writes to the log drain
//     exposes terminal and accounting-blocked jobs, and the deployment
//     spec's monitoring queries (terminal backlog, failed_render_jobs_24h,
//     delivery_eligibility, oldest-claimable-age) return them from the job
//     table
//   temp hygiene: a full render/finalize cycle leaves nothing behind in the
//     OS temp directory
//
// Crash injection at the claim/render/upload/re-read/finalize boundaries is
// owned by verify-rcap-render-worker-delivery.mjs and is not repeated here.
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { createHash } from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";
import { resolveClaimSeconds, runRenderWorkerLoop } from "./lib/rcap-render-worker-loop.mjs";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { runWorkerCycle } = await import("../src/lib/rcap/render/render-worker.ts");
const { renderRcapPacketPdf } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

// --- claim lease configuration ----------------------------------------------

assert(resolveClaimSeconds({}) === 600, "lease: default claim lease is 600s");
assert(resolveClaimSeconds({ RCAP_WORKER_CLAIM_SECONDS: "120" }) === 120, "lease: env override honored");
for (const bad of ["0", "-5", "soon", "NaN"]) {
  let threw = false;
  try {
    resolveClaimSeconds({ RCAP_WORKER_CLAIM_SECONDS: bad });
  } catch {
    threw = true;
  }
  assert(threw, `lease: "${bad}" is refused`);
}

// --- graceful drain ---------------------------------------------------------

{
  // SIGTERM during the idle sleep: the loop must wake and stop promptly.
  const logged = [];
  let cycles = 0;
  const started = Date.now();
  const loop = runRenderWorkerLoop({
    runCycle: async () => {
      cycles += 1;
      return { outcome: "idle" };
    },
    log: (line) => logged.push(line),
    idleDelayMs: 30000
  });
  setTimeout(() => process.kill(process.pid, "SIGTERM"), 150);
  const signal = await loop;
  const elapsed = Date.now() - started;
  assert(signal === "SIGTERM", "drain: idle loop resolves with the signal name");
  assert(cycles === 1, `drain: no new cycle starts after the signal (ran ${cycles})`);
  assert(elapsed < 5000, `drain: the 30s idle sleep is interrupted immediately (${elapsed}ms)`);
  assert(logged.some((line) => line.includes("worker_stop_requested")), "drain: stop request is logged");
  assert(logged.some((line) => line.includes("worker_stopped")), "drain: stop completion is logged");
}

{
  // SIGTERM mid-cycle: the in-flight cycle finishes; no second cycle runs.
  const logged = [];
  let cycles = 0;
  let inFlightFinished = false;
  const loop = runRenderWorkerLoop({
    runCycle: async () => {
      cycles += 1;
      await new Promise((resolve) => setTimeout(resolve, 400));
      inFlightFinished = true;
      return { outcome: "finalized", jobId: "drain-test", accountingResult: "consumed", deliveryEligibility: "eligible" };
    },
    log: (line) => logged.push(line),
    idleDelayMs: 30000
  });
  setTimeout(() => process.kill(process.pid, "SIGTERM"), 100);
  await loop;
  assert(inFlightFinished, "drain: the in-flight cycle completes before shutdown");
  assert(cycles === 1, `drain: exactly one cycle despite the pending queue (ran ${cycles})`);
  assert(
    logged.some((line) => line.includes('"outcome":"finalized"') && line.includes("drain-test")),
    "drain: the finished cycle's result still reaches the log"
  );
}

// --- observability and temp hygiene against a real database ----------------

if (!ephemeralPgAvailable()) {
  console.error("verify-rcap-render-worker-runtime: PostgreSQL 16 is not available in this environment.");
  process.exit(1);
}

const db = startEphemeralPg();
const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-runtime-artifacts-"));
const P1 = "11111111-1111-1111-1111-111111111111";
const PERSON_A = "aaaaaaaa-1111-1111-1111-111111111111";
const BRIEFCASE_ITEM = "b1b1b1b1-1111-1111-1111-111111111111";

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
  generatedPlainText: "Petitioner requests expungement.",
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

const workerDeps = (renderer) => ({
  queue: queuePort,
  storage,
  renderer,
  allowlists: {
    allowedSourceShas: new Set(),
    knownProfileVersions: new Set(["1.3.0"]),
    supportedRendererKinds: new Set(["packet_document_v1"])
  },
  workerId: "runtime-verify-worker",
  containerDigest: "sha256:runtime-verify-container"
});

let jobSeq = 0;
function enqueue({ matter, maxAttempts = 5 }) {
  jobSeq += 1;
  const hash = createHash("sha256").update(`runtime-input-${jobSeq}`).digest("hex");
  const packetRow = db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);
  return db
    .scalar(
      `select id from enqueue_packet_render_job('${packetRow}', 'MS:misdemeanor_conviction', 'packet_document_v1', '1.0.0', null, 'MS', '1.3.0', '${hash}', '${BRIEFCASE_ITEM}', '${P1}', '${PERSON_A}', '${matter}', ${maxAttempts})`
    )
    .trim();
}

// The deployment spec's monitoring queries, verbatim in intent.
const terminalBacklog = () =>
  Number(db.scalar(`select count(*) from packet_render_jobs where status='failed' and failure_disposition='terminal'`));
const failedJobs = () => Number(db.scalar(`select count(*) from packet_render_jobs where status='failed'`));
const accountingBlockedCount = () =>
  Number(db.scalar(`select count(*) from packet_render_jobs where delivery_eligibility='accounting_blocked'`));
const staleClaimableCount = () =>
  Number(
    db.scalar(
      `select count(*) from packet_render_jobs where status='queued' and next_attempt_at < now() - interval '10 minutes'`
    )
  );

try {
  db.sql(`create role service_role nologin bypassrls`);
  db.sql(`alter default privileges in schema public grant all on tables to service_role`);
  db.sql(`create table public.partner_records (id uuid primary key, partner_slug text unique not null)`);
  db.sql(`create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)`);
  db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
  db.applyFile(path.join(rootDir, "supabase/phase-49-rcap-packet-render-jobs.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-50-rcap-packet-delivery-hardening.sql"));
  db.applyFile(path.join(rootDir, "supabase/phase-51-rcap-consumer-payment-gate.sql"));
  db.sql(`insert into partner_records values ('${P1}','we-must-vote')`);
  db.sql(`insert into rcap_persons values ('${PERSON_A}','we-must-vote','a')`);
  db.sql(`insert into partner_packet_entitlement (partner_id, packet_cap, overage_enabled, overage_cap) values ('${P1}', 10, false, 0)`);

  // Harness roots exist now; anything new in tmp from here on is worker litter.
  const tmpBefore = new Set(fs.readdirSync(os.tmpdir()));

  // --- terminal jobs are visible in the log line and the job table ----------
  const jobTerminal = enqueue({ matter: "9aaaaaaa-3333-1111-1111-111111111111", maxAttempts: 1 });
  const brokenRenderer = { render: async () => { throw new Error("injected permanent render failure"); } };
  const terminalCycle = await runWorkerCycle(workerDeps(brokenRenderer));
  assert(
    terminalCycle.outcome === "failed" && terminalCycle.jobId === jobTerminal,
    `observability: exhausted job fails in the cycle result (${JSON.stringify(terminalCycle)})`
  );
  assert(terminalCycle.disposition === "terminal", "observability: the cycle result carries the terminal disposition");
  const terminalLogLine = JSON.stringify(terminalCycle);
  assert(
    terminalLogLine.includes('"disposition":"terminal"') && terminalLogLine.includes(jobTerminal),
    "observability: the log-drain line names the job and its terminal disposition"
  );
  assert(terminalBacklog() === 1, "observability: the terminal-backlog monitoring query counts the job");
  assert(failedJobs() === 1, "observability: failed_render_jobs monitoring query counts the job");
  assert(
    Number(db.scalar(`select requeue_retryable_packet_render_jobs()`)) === 0,
    "observability: the terminal job is invisible to automatic requeue"
  );

  // --- accounting-blocked jobs are visible the same way ---------------------
  db.sql(`update partner_packet_entitlement set packet_cap = 0 where partner_id = '${P1}'`);
  const jobBlocked = enqueue({ matter: "9bbbbbbb-3333-1111-1111-111111111111" });
  const realRenderer = { render: async (claim) => renderRcapPacketPdf(packetFor(claim.packetId), "full") };
  const blockedCycle = await runWorkerCycle(workerDeps(realRenderer));
  assert(
    blockedCycle.outcome === "finalized" && blockedCycle.jobId === jobBlocked && blockedCycle.deliveryEligibility === "accounting_blocked",
    `observability: cap-lost artifact finalizes as accounting_blocked (${JSON.stringify(blockedCycle)})`
  );
  assert(
    JSON.stringify(blockedCycle).includes('"deliveryEligibility":"accounting_blocked"'),
    "observability: the log-drain line exposes the accounting block"
  );
  assert(accountingBlockedCount() === 1, "observability: the delivery_eligibility monitoring query counts the blocked job");
  db.sql(`update partner_packet_entitlement set packet_cap = 10 where partner_id = '${P1}'`);

  // --- oldest-claimable-age operational health check ------------------------
  const jobStale = enqueue({ matter: "9ccccccc-3333-1111-1111-111111111111" });
  db.sql(`update packet_render_jobs set next_attempt_at = now() - interval '11 minutes' where id = '${jobStale}'`);
  assert(staleClaimableCount() === 1, "operational: an unworked queued job trips the queue-age alert query");
  const staleCycle = await runWorkerCycle(workerDeps(realRenderer));
  assert(staleCycle.outcome === "finalized" && staleCycle.jobId === jobStale, "operational: a healthy worker clears the stale job");
  assert(staleClaimableCount() === 0, "operational: the queue-age alert query goes quiet once the worker runs");

  // --- temp hygiene ---------------------------------------------------------
  const tmpAfter = new Set(fs.readdirSync(os.tmpdir()));
  const litter = [...tmpAfter].filter((entry) => !tmpBefore.has(entry));
  assert(litter.length === 0, `hygiene: render/finalize cycles leave nothing in the temp dir (found ${litter.join(", ")})`);
} finally {
  db.stop();
  fs.rmSync(storageRoot, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error("verify-rcap-render-worker-runtime FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(
  "verify-rcap-render-worker-runtime passed: graceful drain, claim-lease configuration, terminal/accounting-blocked observability and temp hygiene hold."
);
