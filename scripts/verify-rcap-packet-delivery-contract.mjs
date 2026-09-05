await import("./verify-rcap-il-delivery-binding.mjs");
// In-process contract regression for the unified delivery layer (phase 49 +
// phase 50): typed claim rejection, output validation on real bytes, unit-hash
// derivation, and the SQL invariants of the hardening migration.
//
// The deployed generate step used to be a status flip that produced no artifact,
// while downloadPath was set unconditionally. That is the shape of bug this
// guards: a job may not claim validation without proof, and no credit may move
// from a job that has not validated.
//
// The contract's state machine and the phase-48 trigger are kept identical here,
// because a divergence between them would let the server accept a transition the
// database refuses, or worse, the reverse.
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

import { readFileSync } from "node:fs";
import path from "node:path";

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}
function read(rel) {
  return readFileSync(path.join(process.cwd(), rel), "utf8");
}

const contract = await import("../src/lib/rcap/render/job-contract.ts");
const {
  RENDER_JOB_STATUSES,
  CREDIT_ELIGIBLE_STATUSES,
  canTransition,
  allowedTransitionsFrom,
  isCreditConsumable,
  consumptionUnitHash,
  computeInputHash,
  buildRenderJobSpec,
  assertClaimAcceptable,
  validateRenderOutput,
  computeNormalizedFingerprint,
  sha256,
  RenderContractError
} = contract;

const { renderRcapPacketPdf } = await import("../src/lib/rcap/documents/packet-document-renderer.ts");

const sql = read("supabase/phase-50-rcap-packet-delivery-hardening.sql");

// 1) The state machine. Every legal transition is legal, and the ones that
// would let a job skip validation are not.
const LEGAL = [
  ["queued", "claimed"],
  ["claimed", "rendering"],
  ["rendering", "validating"],
  ["validating", "artifact_validated"],
  ["artifact_validated", "delivered"],
  ["failed", "queued"],
  ["claimed", "queued"]
];
for (const [from, to] of LEGAL) {
  assert(canTransition(from, to), `${from} -> ${to} should be legal.`);
}

const ILLEGAL = [
  ["queued", "artifact_validated"],
  ["queued", "delivered"],
  ["claimed", "artifact_validated"],
  ["rendering", "artifact_validated"],
  ["rendering", "delivered"],
  ["validating", "delivered"],
  ["delivered", "queued"],
  ["delivered", "artifact_validated"],
  ["artifact_validated", "queued"],
  ["artifact_validated", "failed"]
];
for (const [from, to] of ILLEGAL) {
  assert(!canTransition(from, to), `${from} -> ${to} must not be legal.`);
}

// No status may reach artifact_validated except validating. This is the rule the
// old status-flip bug broke.
for (const status of RENDER_JOB_STATUSES) {
  if (status === "validating" || status === "artifact_validated") continue;
  assert(!allowedTransitionsFrom(status).includes("artifact_validated"), `${status} must not reach artifact_validated directly.`);
}

// 2) The contract's machine and the database trigger agree.
for (const [from, to] of LEGAL) {
  const clause = `old.status = '${from}' and new.status in (`;
  const single = `old.status = '${from}' and new.status = '${to}'`;
  const hasClause = sql.includes(clause) || sql.includes(single);
  assert(hasClause, `phase-48 trigger has no rule for ${from}.`);
}
for (const [from, to] of ILLEGAL) {
  const guard = new RegExp(`old\\.status = '${from}' and new\\.status (?:in \\(([^)]*)\\)|= '([^']*)')`);
  const match = sql.match(guard);
  const listed = match ? `${match[1] ?? ""}${match[2] ?? ""}` : "";
  assert(!listed.includes(`'${to}'`), `phase-48 trigger allows the illegal transition ${from} -> ${to}.`);
}

// 3) Credit consumption.
assert(isCreditConsumable({ status: "artifact_validated", consumedCredit: false }), "A validated artifact should be consumable once.");
assert(isCreditConsumable({ status: "delivered", consumedCredit: false }), "A delivered artifact should be consumable once.");
assert(!isCreditConsumable({ status: "artifact_validated", consumedCredit: true }), "A consumed credit must not be consumable twice.");
for (const status of ["queued", "claimed", "rendering", "validating", "failed"]) {
  assert(!isCreditConsumable({ status, consumedCredit: false }), `${status} must never consume a credit.`);
}
assert(
  CREDIT_ELIGIBLE_STATUSES.length === 2 && CREDIT_ELIGIBLE_STATUSES.every((s) => s === "artifact_validated" || s === "delivered"),
  "Only artifact_validated and delivered may consume."
);

// One unit per distinct matter, keyed on immutable IDs only: the same matter
// derives the same hash however many times it is rendered, different matters
// for one participant do not, and a mutable slug is never part of the key.
const matterA = { partnerId: "p-uuid-1", entitlementId: "ent-uuid-1", personId: "person-1", matterId: "matter-1" };
const matterB = { ...matterA, matterId: "matter-2" };
assert(consumptionUnitHash(matterA) === consumptionUnitHash({ ...matterA }), "The same matter must derive the same unit hash.");
assert(consumptionUnitHash(matterA) !== consumptionUnitHash(matterB), "Two matters for one participant must derive different unit hashes.");
assert(/^[0-9a-f]{64}$/.test(consumptionUnitHash(matterA)), "The unit hash is a sha256 hex digest.");

// 4) Input hashing is deterministic and order-independent, so an identical
// retry finds the existing job instead of queueing a duplicate.
const base = {
  packetId: "packet-1",
  routeId: "MS:misdemeanor_conviction",
  rendererKind: "packet_document_v1",
  rendererVersion: "1.0.0",
  profileId: "MS",
  profileVersion: "1.3.0",
  sourceSha256: null,
  packetFields: { charge: "x", county: "Hinds", nested: { b: 2, a: 1 } }
};
const reordered = { ...base, packetFields: { nested: { a: 1, b: 2 }, county: "Hinds", charge: "x" } };
assert(computeInputHash(base) === computeInputHash(reordered), "Input hashing must not depend on key order.");
assert(computeInputHash(base) !== computeInputHash({ ...base, packetFields: { ...base.packetFields, charge: "y" } }), "A changed field must change the input hash.");
assert(computeInputHash(base) !== computeInputHash({ ...base, profileVersion: "1.4.0" }), "A changed profile version must change the input hash.");
assert(computeInputHash(base) !== computeInputHash({ ...base, rendererVersion: "1.0.1" }), "A changed renderer version must change the input hash.");
assert(/^[0-9a-f]{64}$/.test(computeInputHash(base)), "The input hash must be a sha256 hex digest.");

// 5) Job building fails closed on a route that cannot render.
const retired = buildRenderJobSpec({ packetId: "retired-packet", state: "MS", pathway: "misdemeanor_conviction", packetFields: {} });
assert(retired.spec === null, "The retired Mississippi route must not authorize a new job.");
const supported = buildRenderJobSpec({
  packetId: "packet-1",
  state: "IL",
  pathway: "felony-prostitution-relief",
  trackId: "il-prostitution-j-vacate",
  packetFields: { charge: "x" }
});
assert(supported.spec !== null, "A supported jurisdiction must produce a job spec.");
assert(supported.spec.rendererKind === "packet_document_v1", "The spec must name the renderer.");
assert(supported.spec.routeId === "IL:felony-prostitution-relief", `Unexpected routeId ${supported.spec?.routeId}.`);

for (const state of ["CA", "WY", "ZZ", ""]) {
  const built = buildRenderJobSpec({
    packetId: "packet-1",
    state,
    pathway: "anything",
    profileId: state || "none",
    profileVersion: "1.3.0",
    packetFields: {}
  });
  assert(built.spec === null, `${state || "(empty)"} must not produce a render job.`);
}

// 6) The worker may only act on server-issued work.
const claim = {
  id: "job-1",
  packetId: "packet-1",
  routeId: "MS:misdemeanor_conviction",
  rendererKind: "packet_document_v1",
  rendererVersion: "1.0.0",
  sourceSha256: null,
  profileId: "MS",
  profileVersion: "1.3.0",
  inputHash: "a".repeat(64),
  attemptCount: 1
};
const allowlists = {
  knownJobIds: new Set(["job-1"]),
  allowedSourceShas: new Set(["b".repeat(64)]),
  knownProfileVersions: new Set(["1.3.0"])
};
assert(assertClaimAcceptable(claim, allowlists) === true, "A well-formed claim should be accepted.");

function rejects(mutation, expectedCode, message) {
  try {
    assertClaimAcceptable({ ...claim, ...mutation }, allowlists);
    failures.push(message);
  } catch (error) {
    assert(error instanceof RenderContractError, `${message} (threw the wrong error type)`);
    assert(error.errorCode === expectedCode, `${message} (expected ${expectedCode}, got ${error.errorCode})`);
  }
}
rejects({ id: "job-unknown" }, "unknown_job", "A job the server never issued must be rejected.");
rejects({ rendererKind: "arbitrary_renderer" }, "renderer_kind_unknown", "An unknown renderer kind must be rejected.");
rejects({ sourceSha256: "c".repeat(64) }, "source_sha_not_allowed", "An unadmitted source SHA must be rejected.");
rejects({ profileVersion: "9.9.9" }, "profile_version_unknown", "An unknown profile version must be rejected.");

// 7) Output validation runs on real bytes.
const packet = {
  id: "packet-1",
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
};
const bytes = await renderRcapPacketPdf(packet, "full");

const valid = await validateRenderOutput({ jobId: "job-1", bytes, containerDigest: "sha256:deadbeef" }, { expectedPageSize: { width: 612, height: 792 } });
assert(valid.ok === true, `Real packet bytes should validate, got ${valid.ok ? "ok" : valid.errorCode}.`);
assert(/^[0-9a-f]{64}$/.test(valid.outputSha256 ?? ""), "Validation must record a sha256 of the output.");
assert(/^[0-9a-f]{64}$/.test(valid.normalizedOutputSha256 ?? ""), "Validation must record a normalized fingerprint.");
assert(valid.pageCount > 0 && valid.byteCount === bytes.length, "Validation must record the real page and byte counts.");

const rejected = [
  [{ bytes: Buffer.alloc(0), containerDigest: "sha256:x" }, "output_empty"],
  [{ bytes: Buffer.from("not a pdf at all"), containerDigest: "sha256:x" }, "output_not_pdf"],
  [{ bytes: Buffer.from("%PDF-1.7 but truncated"), containerDigest: "sha256:x" }, "output_unparseable"],
  [{ bytes, containerDigest: "" }, "container_digest_missing"]
];
for (const [report, expected] of rejected) {
  const result = await validateRenderOutput({ jobId: "job-1", ...report });
  assert(result.ok === false && result.errorCode === expected, `Expected ${expected}, got ${result.ok ? "ok" : result.errorCode}.`);
}

const wrongGeometry = await validateRenderOutput(
  { jobId: "job-1", bytes, containerDigest: "sha256:x" },
  { expectedPageSize: { width: 595, height: 842 } }
);
assert(wrongGeometry.ok === false && wrongGeometry.errorCode === "output_geometry_unexpected", "A geometry mismatch must fail validation.");

// The normalized fingerprint ignores metadata variance but not content. Two
// renders of the same packet differ in raw bytes only by their timestamps, so
// the raw hashes may differ while the fingerprints match; a different packet
// must change the fingerprint.
const again = await renderRcapPacketPdf(packet, "full");
assert(
  (await computeNormalizedFingerprint(bytes)) === (await computeNormalizedFingerprint(again)),
  "Two renders of the same packet must share a normalized fingerprint."
);
const different = await renderRcapPacketPdf({ ...packet, county: "Madison" }, "full");
assert(
  (await computeNormalizedFingerprint(bytes)) !== (await computeNormalizedFingerprint(different)),
  "A different packet must not share a normalized fingerprint."
);
assert(sha256(bytes) !== sha256(Buffer.from("other")), "sha256 must distinguish different bytes.");

// 8) The migration's own invariants.
assert(sql.includes("enable row level security"), "The job table must have RLS enabled.");
assert(/revoke all on table %s from anon/.test(sql) && sql.includes("'public.packet_render_jobs',"), "anon must have no access to render jobs.");
assert(/revoke all on table %s from authenticated/.test(sql), "authenticated must have no access to render jobs.");
assert(!/create policy [a-z_]* on public\.packet_render_jobs/i.test(sql), "Render jobs are service-role only and must have no participant-facing policy.");
assert(sql.includes("for update skip locked"), "The claim must be atomic.");
assert(sql.includes("packet_render_jobs_eligible_requires_accounting_check"), "Delivery eligibility must require a validated artifact and an authorized accounting result.");
assert(sql.includes("packet_render_jobs_validated_requires_output"), "A validated job must be required to carry its artifact proof.");
assert(/create unique index[^;]*packet_credit_ledger_consumption_unit_idx[^;]*where event_type in \('consumed', 'overage_consumed'\)/s.test(sql), "One consuming ledger entry per matter must be enforced by a unique index.");
// The live-input unique index is created by phase 49 and inherited unchanged.
assert(/append-only; % is never permitted/.test(sql), "The credit ledger and delivery events must be append-only, so a consumed entry can never be released.");
assert(sql.includes("Migration file only; do not run against any shared database"), "The migration must carry the do-not-run header.");
assert(/status in \('artifact_validated', 'delivered'\)/.test(sql), "Eligibility must be gated on validated statuses in SQL, not only in code.");
assert(sql.includes("fencing_token"), "Claims must issue fencing tokens.");
assert(sql.includes("assert_packet_render_job_fencing"), "Worker-owned mutations must verify the fencing token.");
assert(sql.includes("record_packet_delivery_event") && !/record_packet_delivery_event\([^)]*fencing/s.test(sql), "Delivery events are their own authorization domain and never take a worker token.");
assert(/transmission_completed.*and v_job\.status = .artifact_validated./s.test(sql), "Only transmission_completed advances a job to delivered.");

// 9) The queue adapter mutates only through the canonical functions.
const queue = read("src/lib/rcap/render/job-queue.ts");
for (const rpc of ["enqueue_packet_render_job", "claim_packet_render_job", "finalize_packet_render_job", "record_packet_delivery_event", "fail_packet_render_job"]) {
  assert(queue.includes(rpc), `The adapter must route through ${rpc}.`);
}
assert(!/\.from\("packet_render_jobs"\)\s*\.(insert|update|upsert|delete)/s.test(queue), "The adapter must never write the job table directly.");
assert(!/\.from\("packet_credit_ledger"\)/s.test(queue), "The adapter must never touch the credit ledger directly.");
assert(!/\.from\("packet_delivery_events"\)/s.test(queue), "The adapter must never touch delivery events directly.");

if (failures.length > 0) {
  console.error("verify-rcap-packet-delivery-contract FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log("verify-rcap-packet-delivery-contract passed");
