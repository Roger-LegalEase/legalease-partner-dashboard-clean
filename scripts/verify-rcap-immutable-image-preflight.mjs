#!/usr/bin/env node
// Nothing may be charged before the published image has said it will accept the
// work.
//
//   node scripts/verify-rcap-immutable-image-preflight.mjs
//   node scripts/verify-rcap-immutable-image-preflight.mjs --mutations
//
// Run 32393413747 created a real Stripe Sandbox Checkout Session, posted a
// signed webhook, wrote a server-authoritative payment and enqueued a durable
// render job — and only then discovered anything about whether the pinned
// worker would accept the tuple. It then blamed a profile version the image
// demonstrably admits. Everything it needed was knowable beforehand.
//
// The preflight is therefore positional as well as substantive: it must sit
// ABOVE the Checkout call in the file, because a check that runs after the
// charge is not a preflight no matter what it asserts.
//
// And it must execute the SHIPPED BYTES. `docker run <digest> node -e` with no
// bind mount and no host path runs the image's own modules through the image's
// own loader; running the same probe from the checkout would measure the
// checkout and call it an image result.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
const HARNESS = "scripts/rcap-hosted-acceptance-payment.mjs";

const read = (p) => {
  const full = path.join(rootDir, p);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
};

function failures(harness) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  const preflightAt = harness.indexOf("immutable_image_admits_the_tuple_before_any_charge");
  const checkoutAt = harness.indexOf('callApp("/api/expungement-ai/checkout"');
  fail(preflightAt !== -1, "the pre-charge image preflight case does not exist");
  fail(checkoutAt !== -1, "could not locate the Checkout call");
  // The whole point. A preflight below the charge is not a preflight.
  fail(preflightAt !== -1 && checkoutAt !== -1 && preflightAt < checkoutAt,
    "the image preflight runs AFTER the Checkout call, so a run can still spend real money before learning the image refuses the tuple");

  // It is a required case, so a run that skips it cannot report a pass.
  fail(/"immutable_image_admits_the_tuple_before_any_charge",/.test(harness.slice(0, harness.indexOf("];"))),
    "the preflight is not in REQUIRED_CASES, so a run that never reached it would still be able to pass");

  // The shipped bytes, by digest, with no host source.
  const probeRun = harness.match(/const probeRun = spawnSync\("docker", \[[\s\S]{0,400}?\]/)?.[0] ?? "";
  // `--entrypoint node` and the pinned digest, with `-e` environment arguments
  // permitted between them: the probe now carries the Supabase credentials and
  // the partner-data flag so it can exercise the image's real packet read. The
  // invariant is the entrypoint and the digest, not their adjacency, and an
  // anchor that demanded adjacency failed for a probe that had become stricter.
  fail(/"--entrypoint", "node",[\s\S]*?WORKER_DIGEST_REF/.test(probeRun),
    "the preflight probe does not run the pinned image by digest through node");
  fail(!/-v|--volume|--mount/.test(probeRun),
    "the preflight probe mounts host source over the image, so it would measure the checkout rather than the shipped bytes");
  fail(/register\("\.\/scripts\/lib\/ts-esm-loader\.mjs", "file:\/\/\/app\/"\)/.test(harness),
    "the preflight probe does not load the image's own modules through the image's own loader");

  // The verdict is a conjunction of things that are all knowable pre-charge.
  const verdict = harness.match(/const passed = preflightRoute\.routeKind[\s\S]*?;\n/)?.[0] ?? "";
  fail(Boolean(verdict), "could not locate the preflight verdict");
  for (const [fragment, message] of [
    ['preflightRoute.routeKind === "legacy_verified"', "the preflight does not require an authoritative pathway"],
    ["preflightRoute.sellable === true", "the preflight does not require a sellable pathway"],
    ["dependsOnHeldPdf === false", "the preflight does not require freedom from a problematic-PDF dependency"],
    ["digestPinned", "the preflight does not require the image to be addressed by immutable digest"],
    ["digestMatches", "the preflight does not require the digest actually present to match the pin"],
    ["imageAdmits", "the preflight does not require the image to admit the tuple"],
    ['backlog.readOutcome === "read"', "the preflight does not require the queue depth to be readable"]
  ]) fail(verdict.includes(fragment), message);

  // `imageAdmits` must be decided by the probe's own answer, not by its
  // presence — a probe that returned nothing must not read as admission.
  fail(/const imageAdmits = Boolean\(probe\) && probe\.claim\?\.attempted === true && probe\.claim\.accepted === true && probe\.admitsProfileVersion === true;/.test(harness),
    "image admission is not decided by the probe's own accepted verdict, so a probe that failed to answer could read as admission");

  // A failed preflight stops the run before the charge.
  fail(/if \(!passed\) finish\(\);/.test(harness),
    "a failed preflight does not stop the run, so the Checkout below it would still spend money");

  // The queue depth is measured with the real claim predicate.
  fail(/const backlog = await readClaimOrder\(null, preflightRoute\.rendererKind\);/.test(harness),
    "the preflight does not record the claimable queue depth the target will start behind");

  return out;
}

const harness = read(HARNESS);
const base = failures(harness);

if (MUTATIONS) {
  if (base.length > 0) {
    console.error("baseline is not green; mutations would prove nothing:\n");
    for (const p of base) console.error(` - ${p}`);
    process.exit(1);
  }
  const M = [
    ["a probe that returned no verdict reads as admission", (h) =>
      h.replace("const imageAdmits = Boolean(probe) && probe.claim?.attempted === true && probe.claim.accepted === true && probe.admitsProfileVersion === true;",
        "const imageAdmits = !probe || probe.claim?.accepted !== false;")],
    ["a failed preflight no longer stops the run before the charge", (h) =>
      // Anchored on the preflight's own stop, not on what follows it. The
      // original anchor spanned forward into the next block, so inserting the
      // packet-contract gate between them silently stopped the mutation from
      // applying — and a mutation that cannot apply proves nothing.
      h.replace("  if (!passed) finish();", "  ")],
    ["the probe mounts host source over the image", (h) =>
      // Anchored on the run flags alone. The probe's argument list grew when it
      // gained the credentials it needs to exercise the image's packet read, so
      // an anchor spanning the whole invocation stopped matching — and a
      // mutation that cannot apply is a test that silently stopped testing.
      h.replace('"run", "--rm", "--entrypoint", "node",',
        '"run", "--rm", "-v", `${rootDir}:/app`, "--entrypoint", "node",')]
  ];

  let undetected = 0;
  for (const [label, mutate] of M) {
    const mutated = mutate(harness);
    if (mutated === harness) { console.log(`MISSED   ${label} (anchor did not match)`); undetected += 1; continue; }
    let caught;
    try { caught = failures(mutated).length > base.length; } catch { caught = true; }
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-immutable-image-preflight FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nNo charge is made before the published image admits the tuple (${M.length}/${M.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-immutable-image-preflight FAILED — ${base.length} problem(s):\n`);
  for (const p of base) console.error(` - ${p}`);
  process.exit(1);
}

console.log("verify-rcap-immutable-image-preflight passed.");
console.log("  The preflight sits above the Checkout call, and a failure stops the run before anything is charged.");
console.log("  It runs the image's own shipped modules by digest — no bind mount, no host path.");
console.log("  Authoritative and sellable pathway, no problematic-PDF dependency, digest matches its pin, tuple admitted, queue depth recorded.");
