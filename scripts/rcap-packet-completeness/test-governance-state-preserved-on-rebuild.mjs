#!/usr/bin/env node
/**
 * Both directions of the governance-preservation rule, and the check proved
 * capable of failing.
 *
 * The two directions are not symmetric in cost, and the test says so:
 *
 *   - governance state SURVIVES a rebuild. Failing this way deletes a hash-bound
 *     acceptance receipt and a commercial guard in silence: paymentEligible:
 *     false is the record that a route is CLOSED, and the absence of a record is
 *     supposed to be a refusal rather than a gap.
 *   - a receipt that has stopped describing the bytes does NOT become current by
 *     being copied forward. Failing THIS way relabels an old receipt as covering
 *     changed output, on bytes nobody rendered, which is the thing Roger's
 *     direction on the staged border remediation forbids by name.
 *
 * The committed subjects are read with `git show` rather than off disk, so this
 * runs unchanged in the sparse checkouts every lane works in.
 *
 *   node scripts/rcap-packet-completeness/test-governance-state-preserved-on-rebuild.mjs
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  GOVERNANCE_KEYS, WITHDRAWN_KEY, GovernancePreservationError,
  carryForwardGovernance, governanceLostBetween, assertGovernancePreserved
} from "./governance-preservation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HARNESS = path.join(ROOT, "scripts/rcap-packet-completeness/governance-rebuild-harness.mjs");
const show = (rel) => execFileSync("git", ["show", `HEAD:${rel}`], { cwd: ROOT, maxBuffer: 1 << 28 });
const showJson = (rel) => JSON.parse(show(rel).toString("utf8"));
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const rebuilt = (binding) => {
  /* What a builder that composes its wiring wholesale emits: the route identity
   * it authors, and none of the six it does not. */
  const next = structuredClone(binding);
  for (const key of GOVERNANCE_KEYS) delete next[key];
  delete next[WITHDRAWN_KEY];
  return next;
};

const results = [];
const it = (name, fn) => { fn(); results.push(name); };

/* ================================================================== *
 * ONE. A receipt that still describes the bytes is carried forward.
 *
 * pa-9122-1-limited-access-set is the subject for two reasons. Its committed
 * receipt (run 33526896195) is bound to a canonical this family still produces,
 * so it must survive; and the family renders FOUR PDFs, of which two are
 * canonical, so it is also the case that breaks a rule written as an equality
 * against "the" canonical file. Measured before this accepted a SET: comparing a
 * receipt against one canonical picked by filename reports four healthy
 * Pennsylvania and Ohio families as stale and withdraws four live receipts.
 * ================================================================== */
const PA = "data/rcap-all50/overlays/census-v1/pa/pa-9122-1-limited-access-set--official-pdf-fill";
const paWiring = showJson(`${PA}/product-wiring.json`);
const paArtifacts = showJson(`${PA}/reports/rendered-artifacts.json`);
const paCanonicals = [...new Set((paArtifacts.pdfs ?? paArtifacts.artifacts ?? [])
  .filter((a) => a.fixture === "canonical").map((a) => a.sha256))];

it("a receipt bound to a canonical this build still produces is carried forward verbatim", () => {
  assert.ok(paCanonicals.length >= 1, "the subject declares at least one canonical");
  assert.ok(paCanonicals.includes(paWiring.binding.acceptanceReceipt.boundToCanonicalSha256),
    "the committed receipt is bound to one of this family's canonicals; that is why it is the carried-forward subject");

  const next = rebuilt(paWiring.binding);
  const { binding, carried, withdrawn } = carryForwardGovernance(paWiring.binding, next, { canonicalSha256: paCanonicals });

  assert.deepEqual(binding.acceptanceReceipt, paWiring.binding.acceptanceReceipt, "carried verbatim, byte for byte");
  assert.equal(withdrawn.length, 0, "nothing is withdrawn when the receipt still describes the bytes");
  assert.equal(binding[WITHDRAWN_KEY], undefined, "and no withdrawal record is invented");
  for (const key of GOVERNANCE_KEYS) {
    assert.deepEqual(binding[key], paWiring.binding[key], `${key} survives the rebuild unchanged`);
  }
  assert.ok(carried.includes("acceptanceReceipt"), "the carry is reported rather than done silently");
  assert.deepEqual(governanceLostBetween(paWiring.binding, binding), [], "and the check agrees nothing was lost");
});

it("a receipt bound to a canonical this build no longer produces is WITHDRAWN, not carried", () => {
  const next = rebuilt(paWiring.binding);
  const moved = sha256(Buffer.from("the packet was rebuilt and its canonical bytes moved", "utf8"));
  const { binding, withdrawn } = carryForwardGovernance(paWiring.binding, next, { canonicalSha256: moved });

  assert.equal(binding.acceptanceReceipt, undefined, "a receipt that stopped describing the bytes is not carried as current");
  assert.equal(withdrawn.length, 1);
  assert.deepEqual(binding[WITHDRAWN_KEY][0].withdrawnReceipt, paWiring.binding.acceptanceReceipt,
    "the whole receipt is kept as history");
  assert.equal(binding[WITHDRAWN_KEY][0].boundToCanonicalSha256,
    paWiring.binding.acceptanceReceipt.boundToCanonicalSha256, "carrying the digest it was bound to");
  assert.equal(binding[WITHDRAWN_KEY][0].replacedByCanonicalSha256, moved, "and the digest that replaced it");
  assert.deepEqual(governanceLostBetween(paWiring.binding, binding), [],
    "a withdrawal is preservation: the check must not read it as a loss");
});

/* ================================================================== *
 * TWO. A receipt on the committed record that has ALREADY stopped describing
 * the bytes.
 *
 * de_mandatory_expungement-set is not a constructed case. Its binding carries
 * RASTER_PASS from workflow run 34078415178 bound to canonical f08e5968...,
 * its committed canonical.pdf hashes to fe611676..., and generate-product-wiring
 * --check reports the same move against the family's own component pin:
 *
 *   de_mandatory_expungement-set canonical.pdf f08e5968263d -> fe6116767ab2
 *
 * So the repository holds a live RASTER_PASS describing bytes that are not in
 * it, with nothing on the record saying so. This is the shape the withdrawal
 * rule exists for, on real committed evidence rather than the author's
 * imagination.
 * ================================================================== */
const DE = "data/rcap-all50/overlays/census-v1/de/de-mandatory-expungement-set--official-pdf-fill";
const deWiring = showJson(`${DE}/product-wiring.json`);
const deCanonicalNow = sha256(show(`${DE}/fixtures/canonical.pdf`));

it("de_mandatory_expungement-set: the committed receipt already names bytes the family does not hold", () => {
  assert.equal(deWiring.binding.acceptanceReceipt.verdict, "RASTER_PASS");
  assert.notEqual(deWiring.binding.acceptanceReceipt.boundToCanonicalSha256, deCanonicalNow,
    "this test is only meaningful while the committed receipt is bound to bytes the family no longer holds");
});

it("de_mandatory_expungement-set: a rebuild withdraws that receipt with both real digests", () => {
  const next = rebuilt(deWiring.binding);
  const { binding } = carryForwardGovernance(deWiring.binding, next, { canonicalSha256: deCanonicalNow });
  const note = binding[WITHDRAWN_KEY][0];

  assert.equal(binding.acceptanceReceipt, undefined);
  assert.equal(note.boundToCanonicalSha256, deWiring.binding.acceptanceReceipt.boundToCanonicalSha256);
  assert.equal(note.replacedByCanonicalSha256, deCanonicalNow);
  assert.equal(note.withdrawnReceipt.workflowRunId, deWiring.binding.acceptanceReceipt.workflowRunId,
    "the run id is kept so the withdrawal can be traced to the run that issued it");
  assert.equal(note.withdrawnReceipt.verdict, "RASTER_PASS",
    "the verdict is kept as history and is not restated anywhere as current");
});

/* ================================================================== *
 * THREE. Preserving a value is not deciding one.
 * ================================================================== */
it("nothing is invented when there is no committed record to preserve from", () => {
  const next = { family: "x", routeKeys: ["r"] };
  const { binding, carried, withdrawn } = carryForwardGovernance(null, next, { canonicalSha256: deCanonicalNow });
  assert.deepEqual(carried, []);
  assert.deepEqual(withdrawn, []);
  for (const key of GOVERNANCE_KEYS) assert.equal(binding[key], undefined, `${key} is not invented`);
  assert.equal(binding[WITHDRAWN_KEY], undefined);
});

it("a value this write authors is never overwritten by the committed one", () => {
  const previous = { paymentEligible: false, whyPaymentIsClosed: "committed reason" };
  const next = { paymentEligible: false, whyPaymentIsClosed: "the writer's own reason" };
  const { binding } = carryForwardGovernance(previous, next, { canonicalSha256: deCanonicalNow });
  assert.equal(binding.whyPaymentIsClosed, "the writer's own reason");
});

it("a caller that measured no canonical digest must say so in words, or be refused", () => {
  const previous = structuredClone(paWiring.binding);
  assert.throws(() => carryForwardGovernance(previous, rebuilt(previous), {}), GovernancePreservationError,
    "no digest and no reason is a refusal, not a silent carry-forward");

  const { binding, decisions } = carryForwardGovernance(previous, rebuilt(previous),
    { whyCanonicalIsNotMeasured: "this write rewrites the wiring record only and moves no packet byte" });
  assert.deepEqual(binding.acceptanceReceipt, paWiring.binding.acceptanceReceipt,
    "the committed receipt is left exactly as committed: neither renewed nor withdrawn");
  assert.ok(decisions.some((d) => d.includes("makes no statement about coverage")),
    "and the reason travels in the log rather than being written into the record as a finding");
});

it("a superseded receipt is kept when this write authors a different one", () => {
  const previous = structuredClone(paWiring.binding);
  const next = rebuilt(previous);
  next.acceptanceReceipt = { verdict: "RASTER_PASS", workflowRunId: "99999999999", boundToCanonicalSha256: deCanonicalNow };
  const { binding } = carryForwardGovernance(previous, next, { canonicalSha256: deCanonicalNow });
  assert.equal(binding.acceptanceReceipt.workflowRunId, "99999999999", "the authored receipt stands");
  assert.equal(binding[WITHDRAWN_KEY][0].withdrawnReceipt.workflowRunId,
    previous.acceptanceReceipt.workflowRunId, "and the one it replaced is kept, not overwritten out of existence");
});

/* ================================================================== *
 * FOUR. The check fails a build that drops a key, and passes one that does not.
 * A check that cannot fail is not a check.
 * ================================================================== */
it("the check names every key a wholesale rebuild would drop", () => {
  const lost = governanceLostBetween(paWiring.binding, rebuilt(paWiring.binding));
  assert.deepEqual(lost.map((l) => l.key).sort(), [...GOVERNANCE_KEYS].sort());
  assert.throws(() => assertGovernancePreserved(paWiring.binding, rebuilt(paWiring.binding)),
    (e) => e instanceof GovernancePreservationError && GOVERNANCE_KEYS.every((k) => e.message.includes(k)));
});

it("the check names the ONE key when a preservation carries five of six", () => {
  for (const dropped of GOVERNANCE_KEYS) {
    const next = structuredClone(paWiring.binding);
    delete next[dropped];
    const lost = governanceLostBetween(paWiring.binding, next);
    assert.deepEqual(lost.map((l) => l.key), [dropped], `dropping ${dropped} is reported as exactly that`);
    assert.throws(() => assertGovernancePreserved(paWiring.binding, next),
      (e) => e.message.includes(dropped), `and the message names ${dropped}`);
  }
});

it("nulling the receipt is a deletion, not a value, and the check says so", () => {
  /* The shape two builders and the central generator all have today: set
   * acceptanceReceipt to null when current evidence cannot be found. */
  const next = structuredClone(paWiring.binding);
  next.acceptanceReceipt = null;
  const lost = governanceLostBetween(paWiring.binding, next);
  assert.deepEqual(lost.map((l) => l.key), ["acceptanceReceipt"]);
  assert.ok(lost[0].why.includes(paWiring.binding.acceptanceReceipt.workflowRunId),
    "and it names the run whose receipt would be lost");
});

/* ================================================================== *
 * FIVE. End to end, through a real build that writes a real file.
 *
 * The harness is the subject rather than a census family because the two
 * families the defect is CONFIRMED on are held by live repair lanes in the claim
 * ledger and this lane holds no claim on any family. Everything below happens in
 * a temp directory; no packet byte moves.
 * ================================================================== */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "governance-preservation-"));
const run = (args) => {
  try {
    return { ok: true, out: execFileSync("node", [HARNESS, "--out", tmp, ...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (error) {
    return { ok: false, out: `${error.stdout ?? ""}${error.stderr ?? ""}` };
  }
};
const REV1 = "canonical bytes, revision one";
const REV2 = "canonical bytes, revision two -- the page changed";
const wiringAt = () => JSON.parse(fs.readFileSync(path.join(tmp, "product-wiring.json"), "utf8"));

it("end to end: the pre-fix builder is REFUSED, naming all six keys", () => {
  assert.ok(run(["--canonical", REV1, "--seed"]).ok, "seed the committed record");
  const result = run(["--canonical", REV1, "--preservation", "none"]);
  assert.equal(result.ok, false, "the build fails rather than writing");
  for (const key of GOVERNANCE_KEYS) assert.ok(result.out.includes(key), `the refusal names ${key}`);
  assert.ok(wiringAt().binding.acceptanceReceipt, "and the committed record is untouched");
});

it("end to end: a builder carrying five of six is REFUSED, naming the sixth", () => {
  assert.ok(run(["--canonical", REV1, "--preservation", "inline"]).ok, "all six carried: the build succeeds");
  const result = run(["--canonical", REV1, "--preservation", "inline", "--drop", "whyPaymentIsClosed"]);
  assert.equal(result.ok, false);
  assert.ok(result.out.includes("whyPaymentIsClosed"), "the refusal names the dropped key");
  assert.ok(!result.out.includes("— acceptanceReceipt, "), "and does not blame keys that were carried");
});

it("end to end: the shared module carries the receipt when the canonical does not move", () => {
  assert.ok(run(["--canonical", REV1, "--preservation", "module"]).ok);
  const binding = wiringAt().binding;
  assert.equal(binding.acceptanceReceipt.verdict, "RASTER_PASS");
  assert.equal(binding[WITHDRAWN_KEY], undefined);
});

it("end to end: the canonical moves, and the receipt is withdrawn with both digests", () => {
  const before = wiringAt().binding.acceptanceReceipt;
  assert.ok(run(["--canonical", REV2, "--preservation", "module"]).ok);
  const binding = wiringAt().binding;
  const note = binding[WITHDRAWN_KEY][0];
  assert.equal(binding.acceptanceReceipt, undefined, "not carried forward as though it still applied");
  assert.deepEqual(note.withdrawnReceipt, before, "not deleted");
  assert.equal(note.boundToCanonicalSha256, before.boundToCanonicalSha256);
  assert.equal(note.replacedByCanonicalSha256, sha256(Buffer.from(REV2, "utf8")));
  for (const key of ["lastIndependentVerification", "paymentEligible", "sponsorshipEligible", "whyPaymentIsClosed", "maintenanceRelationship"]) {
    assert.notEqual(binding[key], undefined, `${key} survived the withdrawal`);
  }
});

it("end to end: a second rebuild of unchanged inputs writes byte-identical wiring", () => {
  const before = fs.readFileSync(path.join(tmp, "product-wiring.json"));
  assert.ok(run(["--canonical", REV2, "--preservation", "module"]).ok);
  assert.ok(before.equals(fs.readFileSync(path.join(tmp, "product-wiring.json"))),
    "no timestamp, no run id, no marker of its own: a rebuild that changed nothing produces no diff");
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`GOVERNANCE_PRESERVATION_OK · ${results.length} checks`);
for (const r of results) console.log(`  ok  ${r}`);
