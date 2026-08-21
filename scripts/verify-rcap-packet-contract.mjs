#!/usr/bin/env node
// The hosted payment run must render THIS run's real document packet.
//
//   node scripts/verify-rcap-packet-contract.mjs
//   node scripts/verify-rcap-packet-contract.mjs --mutations
//
// Run 32416556886 paid a real Stripe Sandbox Checkout, enqueued a durable job,
// reached the target on cycle 4, and died on:
//
//   render_failed — packet fb3fb0df-6fef-4abe-a1f1-6462543c06a4 not found
//
// The packet was NOT missing. The application's own canonical writer,
// resolveConsumerPacketId, had already inserted that row and read it back — a
// 202 is unreachable otherwise, because a null packet id returns
// identity_unresolved rather than a queued job.
//
// The row existed and the worker refused to look for it. getRcapDocumentPacket
// consults sourcePacketPersistenceMode() first; that asks
// getPartnerRepositoryMode(), which returns "local_seeded" whenever
// ENABLE_SUPABASE_PARTNER_DATA !== "true"; and in that mode the reader returns
// null WITHOUT EVER QUERYING the table. A perfectly good packet reads as absent.
//
// The Vercel deployment sets that flag, and so does the golden-journey worker —
// which is exactly why that worker drained its queue while this one could not
// render a single packet. The payment harness's container was the only place it
// was missing.
//
// So this verifier holds two things at once: the flag reaches the worker, and
// the harness never papers over a missing packet by inventing one.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
const HARNESS = "scripts/rcap-hosted-acceptance-payment.mjs";
const RENDER_REQUEST = "src/lib/expungement-ai/consumer-render-request.ts";
const REPOSITORY = "src/lib/rcap/documents/source-repository.ts";

const read = (p) => {
  const full = path.join(rootDir, p);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
};

/** Comments may name a defect; only code may satisfy a check. */
const codeOf = (text) => text
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

function failures(harness, renderRequest, repository) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };
  const code = codeOf(harness);

  // --- the fix itself ------------------------------------------------------
  //
  // Both docker invocations: the one that actually runs the worker, and the
  // sanitized copy written into the evidence as "the command". A flag on only
  // one of them either does nothing or misreports what ran.
  // Three docker invocations carry the flag: the sanitized command written into
  // the evidence, the run that actually claims and renders, and the pre-charge
  // probe that measures the packet read. Anchored on the `-e` argument rather
  // than on the name appearing anywhere — the gate's own observation text quotes
  // the flag, and counting prose would let a real site go missing while the
  // count stayed plausible.
  const dockerEnvLines = code.split("\n").filter((line) => /"-e",\s*`ENABLE_SUPABASE_PARTNER_DATA=/.test(line));
  fail(dockerEnvLines.length === 3,
    `ENABLE_SUPABASE_PARTNER_DATA reaches ${dockerEnvLines.length} of the 3 docker invocations (reported command, worker run, pre-charge probe); without it getRcapDocumentPacket returns null without querying rcap_document_packets and every packet reads as missing`);
  fail(/const WORKER_PARTNER_DATA_FLAG = "true";/.test(code),
    "WORKER_PARTNER_DATA_FLAG is not pinned to \"true\"; the worker would fall back to local_seeded and see no packets");
  fail(!/ENABLE_SUPABASE_PARTNER_DATA=\$\{process\.env/.test(code),
    "the flag is inherited from the runner environment rather than pinned, so the worker's behaviour would depend on how CI happened to be configured");

  // The premise of the fix, held against the real modules. If either of these
  // stops being true, the flag is no longer the explanation and this whole
  // verifier's reasoning must be revisited rather than quietly kept.
  fail(/ENABLE_SUPABASE_PARTNER_DATA/.test(read("src/lib/partners/partner-repository.ts")),
    "partner-repository no longer reads ENABLE_SUPABASE_PARTNER_DATA; the premise of this fix has changed");
  fail(/if \(mode\.kind !== "supabase"\) return null;/.test(repository),
    "getRcapDocumentPacket no longer short-circuits on persistence mode; re-derive why the packet read failed before trusting this verifier");

  // --- the harness may not invent a packet ---------------------------------
  fail(!/insert into public\.rcap_document_packets/i.test(code),
    "the harness inserts a document packet directly; the canonical writer is the application's resolveConsumerPacketId and a hand-written row would not carry the real contract");
  fail(!/insert into public\.packet_render_jobs/i.test(code),
    "the harness inserts a render job directly, bypassing the enqueue contract");
  fail(/const expectedPacketId = \(\(\) => \{/.test(code),
    "the harness no longer derives the packet id it expects, so it cannot tell the real packet from any other row");
  fail(/rcap:consumer-packet:v1:\$\{itemId\}/.test(code),
    "the derived packet id is not seeded from this run's briefcase item under the application's namespace");
  fail(/CONSUMER_PACKET_NAMESPACE = "rcap:consumer-packet:v1"/.test(renderRequest),
    "the application's consumer packet namespace changed; the harness's derived id would no longer match the one the render uses");

  // --- proven before the charge -------------------------------------------
  const gate = harness.match(/record\(\s*"packet_contract_is_provable_before_checkout"[\s\S]*?\n  \);/)?.[0] ?? "";
  fail(Boolean(gate), "the pre-Checkout packet-contract gate is missing");
  fail(/if \(!contractHolds\) finish\(\);/.test(code),
    "a failed packet contract does not stop the run before Stripe");
  const gateAt = code.indexOf("packet_contract_is_provable_before_checkout");
  const checkoutAt = code.indexOf('callApp("/api/expungement-ai/checkout"');
  fail(gateAt !== -1 && checkoutAt !== -1 && gateAt < checkoutAt,
    "the packet-contract gate does not run before the Checkout call, so a broken packet contract could still spend a Sandbox Checkout");
  // Bound to the DECISION, not to the name. `const priorIsForeign = ...` keeps
  // the identifier alive even when contractHolds stops consulting it.
  fail(/const contractHolds = priorUsable && !priorIsForeign && workerSeesPackets;/.test(code),
    "the gate does not reject a packet row at this id that belongs to another user or briefcase item");
  fail(/priorIsForeign = Boolean\(prior\)[\s\S]{0,200}?!==\s*String\(A\.id\)/.test(code),
    "foreignness is no longer decided by comparing the existing row's owner against this run's user");

  // --- proven after the 202 ------------------------------------------------
  const binding = harness.match(/record\(\s*"render_job_carries_the_persisted_document_packet"[\s\S]*?\n  \);/)?.[0] ?? "";
  fail(Boolean(binding), "the packet/job identity case is missing");
  fail(/String\(jobPacketId\) === expectedPacketId/.test(code),
    "the run does not require the render job's packet_id to be the id it computed before paying");
  fail(/select packet_id from public\.packet_render_jobs where id = '\$\{sqlText\(targetJobId\)\}'/.test(code),
    "the job's packet_id is not read from the target job row itself");
  fail(/from public\.rcap_document_packets where id = '\$\{sqlText\(expectedPacketId\)\}'/.test(code),
    "the packet row is not read back from rcap_document_packets");
  fail(/const boundToThisRun = String\(row\?\.packet_user \?\? ""\) === String\(A\.id\)\s*\n\s*&& String\(row\?\.packet_item \?\? ""\) === String\(itemId\);/.test(code),
    "the packet row is not required to belong to this run's user and briefcase item");
  fail(/const stateMatches = String\(row\?\.packet_state \?\? ""\) === String\(evidence\.route\?\.state \?\? ""\);/.test(code),
    "the packet's state is not compared against the route this run resolved, so a packet for another jurisdiction would satisfy the case");
  fail(/const inputsPersisted = Number\(row\?\.packet_input_rows \?\? 0\) === 1;/.test(code),
    "the reviewed answer snapshot is not required to be persisted with the packet");
  fail(/const proven = usable && packetExists && idsMatch && boundToThisRun && inputsPersisted && stateMatches;/.test(code),
    "the packet/job verdict is not the conjunction of every condition it derives; one of them is computed and then ignored");
  fail(/if \(!proven\) finish\(\);/.test(code),
    "a job pointing at the wrong packet does not stop the run");

  // --- the packet read is MEASURED inside the image, before the charge -----
  fail(/import\("\/app\/src\/lib\/rcap\/documents\/source-repository\.ts"\)/.test(code),
    "the pre-charge probe no longer exercises the image's own packet reader, so the flag fix is argued rather than measured");
  fail(/const imageResolvesPacket = Boolean\(probe\)\s*\n\s*&& probe\.packetRead\?\.attempted === true\s*\n\s*&& probe\.packetRead\.resolved === true;/.test(code),
    "a packet read that was never attempted, or that resolved nothing, would still pass the pre-charge gate");
  fail(/&& imageResolvesPacket\s*\n\s*&& backlog\.readOutcome === "read";/.test(code),
    "the pre-charge verdict does not require the image to resolve a real packet, so the run could still spend a Checkout with a blind worker");

  // --- another packet's artifact may not satisfy the target ----------------
  fail(/exact_bytes_re_read/.test(code) && /immutable_hash_agrees/.test(code),
    "the artifact conditions no longer tie the stored bytes to the target job's own finalized hashes");

  return out;
}

const harness = read(HARNESS);
const renderRequest = read(RENDER_REQUEST);
const repository = read(REPOSITORY);
const base = failures(harness, renderRequest, repository);

if (MUTATIONS) {
  if (base.length > 0) {
    console.error("baseline is not green; mutations would prove nothing:\n");
    for (const p of base) console.error(` - ${p}`);
    process.exit(1);
  }
  const M = [
    ["the packet id is a random UUID with no row", (h) =>
      h.replace("const expectedPacketId = (() => {", "const expectedPacketId = crypto.randomUUID(); const _unused = (() => {")],
    ["the derived id stops being seeded from this run's briefcase item", (h) =>
      h.replace("`rcap:consumer-packet:v1:${itemId}`", "`rcap:consumer-packet:v1:${crypto.randomUUID()}`")],
    ["a packet belonging to another briefcase item is accepted", (h) =>
      h.replace("const boundToThisRun = String(row?.packet_user ?? \"\") === String(A.id)\n    && String(row?.packet_item ?? \"\") === String(itemId);", "const boundToThisRun = true;")],
    ["a foreign packet row at this id no longer blocks Checkout", (h) =>
      h.replace("const contractHolds = priorUsable && !priorIsForeign && workerSeesPackets;", "const contractHolds = priorUsable && workerSeesPackets;")],
    ["the packet's state may differ from the resolved route", (h) =>
      h.replace('const stateMatches = String(row?.packet_state ?? "") === String(evidence.route?.state ?? "");', "const stateMatches = true;")],
    ["the render job may carry a different packet id", (h) =>
      h.replace("const idsMatch = jobPacketId !== null && String(jobPacketId) === expectedPacketId;", "const idsMatch = true;")],
    ["the packet-contract gate is skipped before Checkout", (h) =>
      h.replace("  if (!contractHolds) finish();", "")],
    ["a wrong packet no longer stops the run after the 202", (h) =>
      h.replace("  if (!proven) finish();", "")],
    ["the worker loses the flag on the invocation that actually runs", (h) =>
      h.replace('      "-e", `ENABLE_SUPABASE_PARTNER_DATA=${WORKER_PARTNER_DATA_FLAG}`,\n', "")],
    ["the worker loses the flag on the reported command", (h) =>
      h.replace('    "-e", `ENABLE_SUPABASE_PARTNER_DATA=${WORKER_PARTNER_DATA_FLAG}`,\n', "")],
    ["the flag is set to something other than true", (h) =>
      h.replace('const WORKER_PARTNER_DATA_FLAG = "true";', 'const WORKER_PARTNER_DATA_FLAG = "false";')],
    ["the harness writes its own packet row", (h) =>
      h.replace("  const priorRows = await sql(`", "  await sql(`insert into public.rcap_document_packets (id) values ('x')`);\n  const priorRows = await sql(`")],
    ["the packet inputs row is no longer required", (h) =>
      h.replace("const inputsPersisted = Number(row?.packet_input_rows ?? 0) === 1;", "const inputsPersisted = true;")],
    ["a packet read that was never attempted counts as working", (h) =>
      h.replace("  const imageResolvesPacket = Boolean(probe)\n    && probe.packetRead?.attempted === true\n    && probe.packetRead.resolved === true;", "  const imageResolvesPacket = true;")],
    ["the pre-charge verdict stops requiring the image to resolve a packet", (h) =>
      h.replace("    && imageResolvesPacket\n", "")],
    ["the pre-charge probe runs without the flag the worker will use", (h) =>
      h.replace("    \"-e\", `ENABLE_SUPABASE_PARTNER_DATA=${WORKER_PARTNER_DATA_FLAG}`,\n    WORKER_DIGEST_REF, \"--input-type=module\"", "    WORKER_DIGEST_REF, \"--input-type=module\"")],
    ["the probe stops importing the image's packet reader", (h) =>
      h.replace("const { getRcapDocumentPacket } = await import(\"/app/src/lib/rcap/documents/source-repository.ts\");", "")]
  ];

  let undetected = 0;
  for (const [label, mutate] of M) {
    const mutated = mutate(harness);
    if (mutated === harness) { console.log(`MISSED   ${label} (anchor did not match)`); undetected += 1; continue; }
    let caught;
    try { caught = failures(mutated, renderRequest, repository).length > base.length; } catch { caught = true; }
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-packet-contract FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nThe run renders this run's own persisted packet, and the worker can see it (${M.length}/${M.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-packet-contract FAILED — ${base.length} problem(s):\n`);
  for (const p of base) console.error(` - ${p}`);
  process.exit(1);
}

console.log("verify-rcap-packet-contract passed.");
console.log("  The worker container carries ENABLE_SUPABASE_PARTNER_DATA=true, so getRcapDocumentPacket queries the table instead of returning null.");
console.log("  The packet id is derived from this run's briefcase item under the application's own namespace, before any charge.");
console.log("  The render job must carry that exact packet, persisted, bound to this run's user and item.");
console.log("  The harness never inserts a document packet or a render job of its own.");
