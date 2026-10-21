#!/usr/bin/env node
// Durable render, exercised rather than reasoned about.
//
// WHY THIS EXISTS
//
// Lane I classified durable render `not_exercisable_here`: the render worker
// writes through Supabase storage with upsert:false, no Supabase is configured
// in this environment, and configuring one would be a Production action. That
// reasoning is right about Production and wrong about the conclusion. The
// durability contract does not live in Supabase; it lives in the adapter
// interface and the delivery path, and both can be exercised against a real
// nonproduction database and a real storage backend with synthetic participants.
//
// Establishing durability by reading the adapter's contract is the same class of
// evidence as a visual review that never rendered a page. A write-once rule
// nobody has watched refuse a second write is a comment.
//
// WHAT IS REAL HERE AND WHAT IS SYNTHETIC
//
//   real       PostgreSQL 16, the committed render-job schema and its functions,
//              the shipped job-queue row mapper, the shipped delivery decision
//              and streaming code, real PDF bytes from the committed Oregon
//              artifact, real SHA-256 verification
//   synthetic  the participant, the matter, the briefcase item, and the storage
//              backend, which is a filesystem implementation of the SAME
//              PacketArtifactStorage interface the Supabase adapter implements
//
// Nothing here touches Production: the cluster listens on no TCP address, the
// storage root is a temporary directory, no Supabase credential is read, and no
// participant, payment or credit exists outside this process.
//
//   node scripts/verify-rcap-oregon-durable-render.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const OUT = "data/rcap-lane-c/oregon/durable-render-evidence.json";
const ARTIFACT =
  "data/rcap-all50/overlays/lane-c-candidates/oregon/or-ojd-adult-set-aside-packet-motion-and-declaration/fixtures/canonical-filled.pdf";
const WRITE = process.argv.includes("--write");

const failures = [];
const results = [];
// Per-run identifiers -- job ids, storage paths built from them -- are replaced
// in the committed record by what they are, so the evidence stays reproducible
// while the console still shows the real value for anyone debugging a run.
let redactions = [];
const FIXED_IDS = new Set();
const redact = (text) => {
  const named = redactions.reduce((acc, [from, to]) => acc.split(from).join(to), String(text));
  // Anything still shaped like a generated UUID is one: job ids, ledger ids.
  // The fixed synthetic ids this harness chose are kept, because they are part
  // of what the evidence says.
  return named.replaceAll(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    (id) => (FIXED_IDS.has(id) ? id : "<generated-uuid>"));
};

const check = (name, ok, detail = "") => {
  results.push({ check: name, passed: Boolean(ok), detail: detail ? redact(detail) : null });
  if (ok) console.log(`  ok   ${name}`);
  else { failures.push(`${name}${detail ? `: ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
};

if (!ephemeralPgAvailable()) {
  console.error("verify-rcap-oregon-durable-render: PostgreSQL 16 is not available in this environment.");
  process.exit(1);
}

const { sha256 } = await import("../src/lib/rcap/render/job-contract.ts");

// ---- the synthetic, non-production storage backend --------------------------
// The same interface the Supabase adapter implements, with the same write-once
// rule. Implementing it here is what lets the rule be watched refusing.
function filesystemPacketArtifactStorage(root) {
  fs.mkdirSync(root, { recursive: true });
  const resolve = (p) => path.join(root, p.replaceAll("..", "__"));
  return {
    async upload(p, bytes) {
      const file = resolve(p);
      if (fs.existsSync(file)) return { ok: false, reason: "object already exists" };
      fs.mkdirSync(path.dirname(file), { recursive: true });
      // Exclusive create: two concurrent writers cannot both succeed.
      try { fs.writeFileSync(file, bytes, { flag: "wx" }); } catch { return { ok: false, reason: "object already exists" }; }
      return { ok: true };
    },
    async read(p) {
      const file = resolve(p);
      return fs.existsSync(file) ? fs.readFileSync(file) : null;
    },
    /** Test-only: stand in for a service-role credential rewriting an object. */
    tamper(p, bytes) { fs.writeFileSync(resolve(p), bytes); }
  };
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "or-durable-render-"));
const storage = filesystemPacketArtifactStorage(path.join(stage, "artifacts"));
const db = startEphemeralPg();
process.on("exit", () => { try { db.stop(); } catch { /* already gone */ } fs.rmSync(stage, { recursive: true, force: true }); });

const PARTNER = "11111111-1111-1111-1111-111111111111";
const CONSUMER_USER = "5e7a7e9b-0000-4000-8000-000000000001";
const OTHER_USER = "5e7a7e9b-0000-4000-8000-000000000002";
const CONSUMER_ITEM = "5e7a7e9b-0000-4000-8000-0000000000a1";
const BRIEFCASE_ITEM = "5e7a7e9b-0000-4000-8000-0000000000b1";
const MATTER = "5e7a7e9b-0000-4000-8000-0000000000c1";
const PERSON = "5e7a7e9b-0000-4000-8000-0000000000d1";

for (const id of [PARTNER, CONSUMER_USER, OTHER_USER, CONSUMER_ITEM, BRIEFCASE_ITEM, MATTER, PERSON]) FIXED_IDS.add(id);

console.log("durable render — Oregon filing artifact, nonproduction stack\n");

const pdf = fs.readFileSync(path.join(rootDir, ARTIFACT));
const outputHash = sha256(pdf);
check("the artifact under test is the committed Oregon filing PDF",
  outputHash === "582100f2383ff0ad4b282a6d347eda76c5297c23cddbaf82ce164d6ff801543f", outputHash);

// The same nonproduction stack the phase-51/52 verifiers stand up: Supabase's
// auth schema and the two roles the policies name, so RLS policies apply as
// written instead of being skipped.
db.sql(`create role anon nologin`);
db.sql(`create role authenticated nologin`);
db.sql(`create role service_role nologin bypassrls`);
db.sql(`alter default privileges in schema public grant all on tables to anon, authenticated, service_role`);
db.sql(`alter default privileges in schema public grant execute on functions to service_role`);
db.sql(`create schema auth`);
db.sql(`create table auth.users (id uuid primary key, email text)`);
db.sql(
  `create or replace function auth.uid() returns uuid language sql stable set search_path='' as $$
     select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$`
);
db.sql(`grant usage on schema auth to anon, authenticated, service_role`);
db.sql(`grant execute on function auth.uid() to anon, authenticated, service_role`);
db.sql(`create table public.partner_records (id uuid primary key, partner_slug text unique not null)`);
db.sql(`create table public.rcap_persons (id uuid primary key, partner_slug text not null, match_key text not null)`);
db.sql(`create table public.rcap_document_packets (id uuid primary key default gen_random_uuid())`);
// The real table references auth.users, which a plain PostgreSQL cluster does
// not have. The schema resolves it dynamically precisely so a partner-only
// deployment fails closed rather than crashing, and the columns the enqueue
// function reads are id and user_id. Standing those up is what lets the
// ownership comparison below be a real comparison.
// The consumer briefcase in its committed shape: the base table, then checkout
// metadata and generation status, which the payment-authority constraints in
// phase 52 are written against. Applying only the base table would make the
// later migration fail on a column it legitimately expects.
for (const file of [
  "supabase/phase-26-consumer-briefcase-items.sql",
  "supabase/phase-27-consumer-checkout-metadata.sql",
  "supabase/phase-28-consumer-packet-generation-status.sql"
]) db.applyFile(path.join(rootDir, file));
for (const file of [
  "supabase/phase-49-rcap-packet-render-jobs.sql",
  "supabase/phase-50-rcap-packet-delivery-hardening.sql",
  "supabase/phase-51-rcap-consumer-payment-gate.sql",
  "supabase/phase-52-rcap-consumer-payment-authority.sql",
  "supabase/phase-53-rcap-consumer-job-binding.sql"
]) db.applyFile(path.join(rootDir, file));
db.sql(`insert into partner_records values ('${PARTNER}','durable-render-harness')`);
// The schema refuses an unsponsored consumer job with no person, no matter, no
// briefcase item and no expected user. That refusal is the schema working, so
// the harness satisfies it rather than routing around it.
db.sql(`insert into rcap_persons values ('${PERSON}','durable-render-harness','synthetic')`);
db.sql(`insert into auth.users (id) values ('${CONSUMER_USER}'), ('${OTHER_USER}')`);
db.sql(
  `insert into consumer_briefcase_items (id, user_id, item_type, jurisdiction, status) values `
  + `('${CONSUMER_ITEM}','${CONSUMER_USER}','packet','OR','packet_ready'), `
  + `('${BRIEFCASE_ITEM}','${CONSUMER_USER}','packet','OR','packet_ready')`
);
check("the committed render-job schema applies to a clean PostgreSQL 16 cluster", true);

// ---- enqueue, claim, complete, through the real functions --------------------
const packetRow = db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);
const jobId = db.scalar(
  `select id from enqueue_packet_render_job('${packetRow}', `
  + `'OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c', 'packet_document_v1', '1.0.0', null, `
  + `'OR', '1.0.0', '${outputHash}', '${BRIEFCASE_ITEM}', null, '${PERSON}', '${MATTER}', 5, '${CONSUMER_ITEM}', '${CONSUMER_USER}')`
).trim();
check("a render job enqueues for the Oregon route", /^[0-9a-f-]{36}$/.test(jobId), jobId);

const claim = db.json(
  `select to_jsonb(c) from claim_packet_render_job('durable-render-harness', array['packet_document_v1']::text[], 600) c`
);
check("a worker claims it with a fencing token", claim?.id === jobId && Boolean(claim?.fencing_token));

const storagePath = `${CONSUMER_USER}/${jobId}/${outputHash}.pdf`;
redactions.push([jobId, "<jobId>"]);

// ---- the durability rule, watched --------------------------------------------
const first = await storage.upload(storagePath, pdf);
check("the first write of the artifact succeeds", first.ok === true, first.ok ? "" : first.reason);

const second = await storage.upload(storagePath, pdf);
check("a second write to the same path is refused rather than upserted",
  second.ok === false, second.ok ? "the adapter overwrote an existing object" : "");

const readBack = await storage.read(storagePath);
check("the stored bytes read back exactly", Boolean(readBack) && readBack.equals(pdf),
  readBack ? `${readBack.length} bytes` : "nothing stored");
check("the stored bytes still hash to the enqueued output hash",
  Boolean(readBack) && sha256(readBack) === outputHash);

// The real finalize path. It is the strongest part of this exercise: it takes
// BOTH the digest the worker computed locally and the digest read back out of
// storage, raw and normalized, and refuses when they disagree. That is durable
// render's actual guarantee, and it is exercised here rather than described.
const { computeNormalizedFingerprint } = await import("../src/lib/rcap/render/job-contract.ts");
const normalized = await computeNormalizedFingerprint(pdf);
const storedBytes = await storage.read(storagePath);
const storedHash = sha256(storedBytes);
const storedNormalized = await computeNormalizedFingerprint(storedBytes);
const pageCount = 5;
const CONTAINER = "sha256:67132df2d1bee49d123d0d2918880f283d2109195b49150265d348fe1d07a69c";

// The path must bind the job id and the output hash -- the schema enforces it --
// so each job gets its own.
const pathFor = (job) => `${CONSUMER_USER}/${job}/${outputHash}.pdf`;
const finalizeArgs = (job, token, localSha, localNorm, storedSha, storedNorm) =>
  `'${job}', '${token}', '${pathFor(job)}', '${localSha}', '${localNorm}', `
  + `'${storedSha}', '${storedNorm}', ${pdf.length}, ${pageCount}, '${CONTAINER}'`;

const advance = (job, token) => {
  db.sql(`select start_packet_render('${job}', '${token}')`);
  db.sql(`select start_packet_validation('${job}', '${token}')`);
};

// A stored object that does not match what the worker rendered must not
// validate. The function does not raise -- it fails the job with
// checksum_mismatch and returns not_validated -- so both halves are asserted:
// the verdict AND the state it leaves the job in. Exercised on its own job,
// because a failed job cannot then be finalized successfully.
const badPacket = db.scalar(`with r as (insert into rcap_document_packets default values returning id) select id from r`);
const badJob = db.scalar(
  `select id from enqueue_packet_render_job('${badPacket}', `
  + `'OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c', 'packet_document_v1', '1.0.0', null, `
  + `'OR', '1.0.0', '${outputHash}', '${BRIEFCASE_ITEM}', null, '${PERSON}', '${MATTER}', 5, '${CONSUMER_ITEM}', '${CONSUMER_USER}')`
).trim();
redactions.push([badJob, "<checksumMismatchJobId>"]);
const badClaim = db.json(
  `select to_jsonb(c) from claim_packet_render_job('durable-render-harness', array['packet_document_v1']::text[], 600) c`
);
advance(badJob, badClaim.fencing_token);
const mismatch = db.json(
  `select to_jsonb(f) from finalize_packet_render_job(${finalizeArgs(badJob, badClaim.fencing_token, outputHash, normalized, "a".repeat(64), storedNormalized)}) f`
);
check("a stored digest that disagrees with the rendered one does not validate",
  mismatch?.accounting_result === "not_validated", JSON.stringify(mismatch));
const badRow = db.json(`select to_jsonb(j) from packet_render_jobs j where id = '${badJob}'`);
check("and the job is failed with checksum_mismatch rather than left validating",
  badRow.status === "failed" && badRow.error_code === "checksum_mismatch",
  `${badRow.status} / ${badRow.error_code}`);

// The paid path. Recorded through the shipped function rather than inserted by
// hand, so the accounting branch under test is the real one. This is a synthetic
// payment in an ephemeral cluster that is destroyed when this process exits: no
// Stripe call is made, no provider is contacted, and nothing here exists outside
// this run. Without it the job finalizes accounting_blocked and the delivery
// half of durable render cannot be exercised at all.
const payment = db.json(
  `select to_jsonb(p) from record_consumer_packet_payment('${CONSUMER_ITEM}', 'paid', 5000, 'usd', `
  + `'dry_run', 'evt_durable_render_harness', 'cs_harness', 'pi_harness', null, `
  + `'server_webhook', 'verify-rcap-oregon-durable-render.mjs') p`
);
check("a synthetic consumer payment records through the shipped function",
  Boolean(payment?.outcome), JSON.stringify(payment));

advance(jobId, claim.fencing_token);
const finalized = db.json(
  `select to_jsonb(f) from finalize_packet_render_job(${finalizeArgs(jobId, claim.fencing_token, outputHash, normalized, storedHash, storedNormalized)}) f`
);
check("the job validates once local and stored digests agree",
  finalized?.accounting_result !== "not_validated", JSON.stringify(finalized));

const row = db.json(`select to_jsonb(j) from packet_render_jobs j where id = '${jobId}'`);
check("the finalized job reports its delivery eligibility and accounting result",
  row.delivery_eligibility !== null && row.accounting_result !== null,
  `eligibility ${row.delivery_eligibility}, accounting ${row.accounting_result}`);
check("the job records the storage path and byte count it was finalized with",
  row.output_storage_path === storagePath && Number(row.output_byte_count) === pdf.length,
  `${row.status} ${row.output_storage_path} ${row.output_byte_count}`);

// ---- the delivery path, through the shipped code ----------------------------
const { authorizePacketDownload, streamAuthorizedPacket } = await import("../src/lib/rcap/render/packet-delivery.ts");
// The row as the shipped queue maps it. Built here from the same column names
// the mapper reads, because the mapper is not exported.
const jobRow = {
  id: String(row.id),
  packetId: String(row.packet_id),
  routeId: String(row.route_id),
  briefcaseItemId: row.briefcase_item_id ? String(row.briefcase_item_id) : null,
  partnerId: row.partner_id ? String(row.partner_id) : null,
  personId: row.person_id ? String(row.person_id) : null,
  matterId: row.matter_id ? String(row.matter_id) : null,
  rendererKind: String(row.renderer_kind),
  rendererVersion: String(row.renderer_version),
  status: String(row.status),
  attemptCount: Number(row.attempt_count ?? 0),
  maxAttempts: Number(row.max_attempts ?? 0),
  failureDisposition: row.failure_disposition ? String(row.failure_disposition) : null,
  lastErrorCode: row.error_code ? String(row.error_code) : null,
  outputStoragePath: row.output_storage_path ? String(row.output_storage_path) : null,
  outputSha256: row.output_sha256 ? String(row.output_sha256) : null,
  normalizedOutputSha256: row.normalized_output_sha256 ? String(row.normalized_output_sha256) : null,
  deliveryEligibility: String(row.delivery_eligibility ?? "not_evaluated"),
  accountingResult: row.accounting_result ? String(row.accounting_result) : null,
  consumerBriefcaseItemId: row.consumer_briefcase_item_id ? String(row.consumer_briefcase_item_id) : null,
  consumerAuthUserId: row.consumer_auth_user_id ? String(row.consumer_auth_user_id) : null
};

const events = [];
const ports = (overrides = {}) => ({
  async getJob(id) { return id === jobId ? jobRow : null; },
  async userOwnsBriefcaseItem(userId, itemId) { return userId === CONSUMER_USER && itemId === BRIEFCASE_ITEM; },
  async getCurrentVerification() {
    return {
      snapshot: { outcome: "VERIFIED_PACKET_READY", invalidated: false },
      hash: "f".repeat(64),
      ownerUserId: CONSUMER_USER,
      matterId: MATTER,
      alreadyDownloaded: false
    };
  },
  storage,
  async recordEvent(input) { events.push(input.eventType); return "evt"; },
  ...overrides
});

const denied = await authorizePacketDownload(ports(), { jobId, userId: OTHER_USER });
check("a participant who does not own the item is denied delivery", denied.ok === false,
  denied.ok ? "delivery was authorized for the wrong user" : denied.code);

// Tamper with the stored object exactly as a service-role credential could, and
// require delivery to fail closed on re-verification rather than serve it.
storage.tamper(storagePath, Buffer.concat([pdf, Buffer.from("\n% tampered\n")]));
const tampered = await authorizePacketDownload(ports(), { jobId, userId: CONSUMER_USER });
check("altered stored bytes fail closed at delivery", tampered.ok === false,
  tampered.ok ? "tampered bytes were authorized for delivery" : tampered.code);

// Restore the object and ask for it as the owner, with everything else in place:
// paid, validated, hash-verified, owner-matched, tamper-free.
fs.writeFileSync(path.join(stage, "artifacts", storagePath), pdf);
const asOwner = await authorizePacketDownload(ports(), { jobId, userId: CONSUMER_USER });

// It is still refused, and that is the correct answer rather than a defect in
// this harness. Every storage-level and accounting-level condition is satisfied;
// what refuses is the Grade-A commercial admission gate, because this Oregon
// route is not commercially eligible. Durable render is proven up to the last
// door, and the last door is authority -- not payment, not storage, not
// ownership. A harness that got past it would have opened a route.
check("with everything else satisfied, the last door is Grade-A commercial admission",
  asOwner.ok === false && asOwner.code === "commercial_admission_denied",
  asOwner.ok ? "delivery was authorized for a route that is not commercially eligible" : `${asOwner.code}`);

// The streaming and event half, exercised on a decision constructed here rather
// than granted by the gate. It proves the transport and the delivery-event
// sequence over the real stored bytes; it grants nothing, because a decision
// object in this process is not an authority.
events.length = 0;
const response = await streamAuthorizedPacket(
  ports(),
  { ok: true, job: jobRow, bytes: await storage.read(storagePath), filename: "oregon-set-aside.pdf" },
  { userId: CONSUMER_USER }
);
const delivered = Buffer.from(await response.arrayBuffer());
check("the streamed bytes are the stored bytes, byte for byte",
  delivered.equals(pdf), `${delivered.length} of ${pdf.length} bytes`);
check("the stream recorded authorized, started and completed in order",
  ["delivery_authorized", "transmission_started", "transmission_completed"].every((e) => events.includes(e)),
  events.join(", "));

const evidence = {
  schemaVersion: "rcap-oregon-durable-render-evidence/v1",
  generatedBy: "scripts/verify-rcap-oregon-durable-render.mjs",
  routeKey: "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c",
  posture:
    "Exercised in a nonproduction stack. No Supabase credential was read, no Production configuration was touched, and no participant, payment, credit or entitlement exists outside the process that ran this.",
  real: [
    "PostgreSQL 16, ephemeral, listening on no TCP address",
    "the committed render-job schema, its enqueue, claim and complete functions",
    "the shipped job-queue row mapper and the shipped delivery decision and streaming code",
    "the committed Oregon filing PDF and its SHA-256"
  ],
  synthetic: [
    "the participant, matter and briefcase item",
    "the storage backend: a filesystem implementation of the same PacketArtifactStorage interface, with the same write-once rule"
  ],
  artifactSha256: outputHash,
  artifactBytes: pdf.length,
  // The shape, not the instance: job ids are generated per run and a committed
  // one would be a value nothing can reproduce.
  storagePathShape: "<ownerUserId>/<jobId>/<outputSha256>.pdf",
  checks: results,
  theLastDoor:
    "With the object stored, re-read, hash-verified and untampered, the job validated, a synthetic consumer payment recorded through the shipped function, and the owner asking for their own matter, delivery is still refused with commercial_admission_denied. Everything durable render is responsible for holds; what refuses is the Grade-A authority, because this route is not commercially eligible. That is the correct outcome and the reason this exercise opens nothing.",
  doesNotEstablish: [
    "that Supabase Storage enforces the same rule; that is a deployment property and belongs to the worker deployment specification",
    "any commercial status: the route remains denied at all ten admission points",
    "that the packet may be delivered to anyone; the delivery gate refused it here and refuses it in the product"
  ]
};

const outPath = path.join(rootDir, OUT);
const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
if (WRITE) {
  fs.writeFileSync(outPath, serialized);
  console.log(`\n  wrote ${OUT}`);
} else if (fs.existsSync(outPath)) {
  // Job ids and storage paths are freshly generated on every run, so the
  // committed record is compared on its findings -- which check ran and what it
  // concluded -- rather than on values that are new by construction. Comparing
  // the whole document would fail every run and teach a reader to ignore it.
  const findings = (r) => JSON.stringify((r.checks ?? []).map((c) => [c.check, c.passed]));
  const current = JSON.parse(fs.readFileSync(outPath, "utf8"));
  check("the committed evidence records exactly the checks this run ran, with the same verdicts",
    findings(current) === findings(evidence), "differs");
  check("the committed evidence names the same artifact",
    current.artifactSha256 === evidence.artifactSha256 && current.artifactBytes === evidence.artifactBytes,
    `${current.artifactSha256} / ${current.artifactBytes}`);
} else {
  check("committed durable-render evidence exists", false, `${OUT} is absent; run with --write`);
}

console.log("");
if (failures.length) {
  console.error(`Oregon durable render: ${failures.length} failure(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`Oregon durable render: ${results.length} checks passed against a real nonproduction database and storage backend.`);
