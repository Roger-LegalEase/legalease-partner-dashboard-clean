#!/usr/bin/env node
/**
 * A RE-PIN TOOL THAT ONLY EVER ACCEPTS IS A RUBBER STAMP.
 *
 * These tests prove the tool in BOTH directions, and the refusal direction is
 * proved against a real, material change rather than a synthetic one: the
 * Colorado fee-waiver correction that caused this whole lapse. A family that
 * genuinely binds `co_motion_seal_conviction` -- and one exists,
 * co_motion_seal_conviction-set, route
 * obligation:track-pathway:CO:co_motion_seal_conviction:... -- must be refused
 * by the same code path that refreshes the twenty-one that do not bind it.
 *
 * Every byte compared here is recovered from git or read from the tree. No
 * digest, blob id or commit sha in this file is typed by hand: the historical
 * blob is found by hashing candidates until one matches the pin.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADAPTERS, Refusal, canonical, compareAnchors, describeDifference,
  doctrineRefreshedPaths, planFamily, planReceipt, composeRefreshedReceipt,
  readsAsUnmoved, recoverBytesByDigest, sha256, lapsedFamilies, currentBytesOf
} from "./repin-lapsed-source-identities.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const adapter = ADAPTERS.get(REGISTRY);

const results = [];
const test = (name, run) => {
  try { run(); results.push({ name, passed: true }); }
  catch (err) { results.push({ name, passed: false, error: err.message }); }
};
const readReceipt = (dir) => JSON.parse(fs.readFileSync(path.join(ROOT, dir, "source-receipt.json"), "utf8"));

/* ------------------------------------------------------------------ *
 * Recover the real historical registry, from history, by digest
 * ------------------------------------------------------------------ */

const families = lapsedFamilies();
assert.ok(families.length > 0, "the queue reports no lapsed family; these tests need at least one");
const sample = families.find((f) => f.familyId === "rcap-wi-custom-pleading") ?? families[0];
const receiptPath = `${sample.directory}/source-receipt.json`;
const currentBytes = currentBytesOf(REGISTRY).bytes;
const NOW = JSON.parse(currentBytes.toString("utf8"));

/*
 * THE FIXTURE IS THE RECEIPT AS IT STOOD BEFORE ITS PIN WAS REFRESHED,
 * recovered from git rather than reconstructed. Once the tree has been
 * re-pinned the live receipt pins the CURRENT registry, and a test that drove
 * itself from the live pin would recover the current blob, compare it against
 * itself and pass while proving nothing. So the pre-pin revision is found by
 * looking for the first revision of this receipt whose registry pin is not the
 * digest on disk now, and every accept/refuse test below runs against that.
 */
const gitText = (rev) => execFileSync("git", ["show", `${rev}:${receiptPath}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
const prePinRevision = (() => {
  for (const rev of ["HEAD", "HEAD~1", "HEAD~2", "HEAD~3", "HEAD~4", "HEAD~5"]) {
    try {
      const pin = JSON.parse(gitText(rev)).committedRecords.find((r) => r.pathInRepository === REGISTRY);
      if (pin && pin.sha256 !== sha256(currentBytes)) return rev;
    } catch { /* this revision does not carry the receipt; try the next */ }
  }
  return null;
})();
assert.ok(prePinRevision, "no revision of this receipt carries a stale registry pin, so the accept path has no fixture");
const beforeText = gitText(prePinRevision);
const sampleReceipt = JSON.parse(beforeText);
const samplePin = sampleReceipt.committedRecords.find((r) => r.pathInRepository === REGISTRY);
assert.ok(samplePin, "the sample family does not pin the registry");
assert.notEqual(samplePin.sha256, sha256(currentBytes), "the fixture pin must be the stale one");

const recovered = recoverBytesByDigest(REGISTRY, samplePin.sha256);
assert.ok(recovered.bytes, `could not recover the historical registry: ${recovered.why}`);
const OLD = JSON.parse(recovered.bytes.toString("utf8"));

test("the recovered blob hashes to the pin it was recovered for", () => {
  assert.equal(sha256(recovered.bytes), samplePin.sha256);
  assert.ok(/^[0-9a-f]{40}$/.test(recovered.recovery.blobId));
  assert.ok(/^[0-9a-f]{40}$/.test(recovered.recovery.commit));
});

test("a digest that is in no version of the record is not recovered, and says so", () => {
  const answer = recoverBytesByDigest(REGISTRY, "0".repeat(64));
  assert.equal(answer.bytes, null);
  assert.match(answer.why, /no version of .* hashes to/);
});

/* ------------------------------------------------------------------ *
 * IT MUST ACCEPT
 * ------------------------------------------------------------------ */

test("ACCEPT: a family whose own entries are identical compares clean, with anchorsCompared === anchorsIdentical > 0", () => {
  const scope = adapter.scopeFrom({ receipt: sampleReceipt, pin: samplePin, currentDoc: NOW });
  const c = compareAnchors({ adapter, oldDoc: OLD, currentDoc: NOW, scope });
  assert.ok(c.anchorsCompared > 0, "no anchor was compared");
  assert.equal(c.anchorsCompared, c.anchorsIdentical);
  assert.deepEqual(c.differing, []);
  assert.ok(c.anchorNames.includes("registryGlobalMetadata"));
  assert.ok(c.anchorNames.some((n) => n.startsWith("track:")));
});

test("ACCEPT: the scope is read from the family's own records, not from its id", () => {
  /* The Maine cohort family is the proof. Its id and route key say
   * "juvenile-sealing", which is no track at all; its pin says me-seal-gen. */
  const me = families.find((f) => f.familyId === "census-pending-family:ME:juvenile-sealing");
  if (!me) return;                                   // not in this checkout's queue
  const receipt = readReceipt(me.directory);
  const pin = receipt.committedRecords.find((r) => r.pathInRepository === REGISTRY);
  const scope = adapter.scopeFrom({ receipt, pin, currentDoc: NOW });
  assert.deepEqual(scope.anchorIds, ["me-seal-gen"]);
  assert.ok(scope.derivation.routeKeysNamingNoTrackDirectly.length > 0,
    "the Maine route key names a cohort, not a track; that must be recorded rather than silently dropped");
  assert.ok(!scope.anchorIds.some((id) => id.includes("juvenile-sealing")));
});

test("ACCEPT: comparison is order-independent", () => {
  const scope = adapter.scopeFrom({ receipt: sampleReceipt, pin: samplePin, currentDoc: NOW });
  const shuffled = { ...NOW, tracks: [...NOW.tracks].reverse() };
  const c = compareAnchors({ adapter, oldDoc: OLD, currentDoc: shuffled, scope });
  assert.equal(c.anchorsCompared, c.anchorsIdentical);
  assert.deepEqual(c.differing, []);
  /* and key order inside an anchor does not matter either */
  const t = NOW.tracks.find((x) => x.trackId === scope.anchorIds[0]);
  const reKeyed = Object.fromEntries(Object.keys(t).reverse().map((k) => [k, t[k]]));
  assert.equal(canonical(t), canonical(reKeyed));
});

/* ------------------------------------------------------------------ *
 * IT MUST REFUSE
 * ------------------------------------------------------------------ */

test("REFUSE (real change, real family): a family binding co_motion_seal_conviction is refused, and the differing entry is named", () => {
  const co = "co_motion_seal_conviction";
  assert.ok(NOW.tracks.some((t) => t.trackId === co) && OLD.tracks.some((t) => t.trackId === co),
    "the Colorado track must exist on both sides for this to be a real comparison");
  /* The real family's own records: its route key and the recordId shape every
   * registry pin uses. Nothing of that family's directory is read or written. */
  const receipt = { routeKeys: [`obligation:track-pathway:CO:${co}:petition-based-conviction-sealing-jdf-612-24-72-706`] };
  const pin = { recordId: `legal-design-track-registry:${co}`, pathInRepository: REGISTRY };
  const scope = adapter.scopeFrom({ receipt, pin, currentDoc: NOW });
  assert.deepEqual(scope.anchorIds, [co]);
  const c = compareAnchors({ adapter, oldDoc: OLD, currentDoc: NOW, scope });
  assert.deepEqual(c.differing, [`track:${co}`], "the changed Colorado track must be named as differing");
  assert.notEqual(c.anchorsCompared, c.anchorsIdentical);
  const detail = describeDifference({ adapter, oldDoc: OLD, currentDoc: NOW, scope, differing: c.differing });
  assert.ok(detail[0].changedFields.includes("rules"), `expected the changed rules block, got ${detail[0].changedFields}`);
  assert.match(detail[0].firstChangedFieldCurrent + detail[0].firstChangedFieldHistorical, /feeWaiver|packetSet/);
});

test("REFUSE: a change to an entry this family does bind, when everything else is untouched", () => {
  const scope = adapter.scopeFrom({ receipt: sampleReceipt, pin: samplePin, currentDoc: NOW });
  const target = scope.anchorIds[0];
  const mutated = { ...NOW, tracks: NOW.tracks.map((t) => t.trackId === target ? { ...t, selfHelpStopConditions: ["ALTERED"] } : t) };
  const c = compareAnchors({ adapter, oldDoc: OLD, currentDoc: mutated, scope });
  assert.deepEqual(c.differing, [`track:${target}`]);
  assert.equal(c.anchorsIdentical, c.anchorsCompared - 1);
});

test("REFUSE: a change to the record's global authority, even when every bound track matches", () => {
  const scope = adapter.scopeFrom({ receipt: sampleReceipt, pin: samplePin, currentDoc: NOW });
  const mutated = { ...NOW, readinessCeiling: { ...NOW.readinessCeiling, raisedWithoutReview: true } };
  const c = compareAnchors({ adapter, oldDoc: OLD, currentDoc: mutated, scope });
  assert.deepEqual(c.differing, ["registryGlobalMetadata"]);
});

test("REFUSE: an anchor that left the record altogether", () => {
  const scope = adapter.scopeFrom({ receipt: sampleReceipt, pin: samplePin, currentDoc: NOW });
  const target = scope.anchorIds[0];
  const gone = { ...NOW, tracks: NOW.tracks.filter((t) => t.trackId !== target) };
  assert.throws(() => compareAnchors({ adapter, oldDoc: OLD, currentDoc: gone, scope }),
    (e) => e instanceof Refusal && e.why.includes(target) && /absent from the current registry/.test(e.why));
});

test("REFUSE: an anchor that is not unique, so the comparison has no single object", () => {
  const scope = adapter.scopeFrom({ receipt: sampleReceipt, pin: samplePin, currentDoc: NOW });
  const dup = { ...NOW, tracks: [...NOW.tracks, NOW.tracks.find((t) => t.trackId === scope.anchorIds[0])] };
  assert.throws(() => compareAnchors({ adapter, oldDoc: OLD, currentDoc: dup, scope }),
    (e) => e instanceof Refusal && /duplicate track/.test(e.why));
});

test("REFUSE: a recordId naming an entry the record does not have", () => {
  assert.throws(() => adapter.scopeFrom({
    receipt: { routeKeys: [] },
    pin: { recordId: "legal-design-track-registry:not_a_track_anywhere", pathInRepository: REGISTRY },
    currentDoc: NOW
  }), (e) => e instanceof Refusal && /names \{?.*not_a_track_anywhere/.test(e.why));
});

test("REFUSE: a family whose own records name no entry at all -- anchorsCompared would be 0", () => {
  assert.throws(() => adapter.scopeFrom({
    receipt: { routeKeys: ["obligation:runtime-contract-cohort:ZZ:some-cohort:some-pathway"] },
    pin: { recordId: "committed-record", pathInRepository: REGISTRY },
    currentDoc: NOW
  }), (e) => e instanceof Refusal && /name no entry in this record/.test(e.why));
});

test("REFUSE: a drifted record with no adapter is never guessed at", () => {
  assert.equal(ADAPTERS.has("data/some/other/shared-record.json"), false);
});

/* ------------------------------------------------------------------ *
 * The block it writes, and the doctrine that reads it
 * ------------------------------------------------------------------ */

const plan = planReceipt({ familyId: sample.familyId, directory: sample.directory, receiptPath, beforeText });

test("the live tree is idempotent: a receipt already re-pinned has nothing to do", () => {
  const live = planFamily({ familyId: sample.familyId, directory: sample.directory });
  assert.ok(["NOTHING_TO_DO", "REFRESHABLE"].includes(live.outcome), `unexpected ${live.outcome}: ${live.why ?? ""}`);
});

test("the plan for a clean family is REFRESHABLE and recovers the old blob from history", () => {
  assert.equal(plan.outcome, "REFRESHABLE", plan.why ?? "");
  assert.equal(plan.records.length, 1);
  assert.equal(plan.records[0].path, REGISTRY);
  assert.ok(plan.records[0].recovery.blobId);
  assert.equal(plan.records[0].anchorsCompared, plan.records[0].anchorsIdentical);
  assert.ok(plan.records[0].anchorsCompared > 0);
});

const composed = composeRefreshedReceipt(plan);

test("the rewrite changes only sha256, byteLength and identityRefresh on the drifted pin", () => {
  const before = JSON.parse(plan.beforeText), after = JSON.parse(composed.text);
  const b = before.committedRecords.find((r) => r.pathInRepository === REGISTRY);
  const a = after.committedRecords.find((r) => r.pathInRepository === REGISTRY);
  for (const k of ["sha256", "byteLength", "identityRefresh"]) { if (k in b) a[k] = b[k]; else delete a[k]; }
  assert.deepEqual(after, before, "something other than the pin's identity changed");
});

test("the written block carries the old digest, the new digest, both counts and how the blob was recovered", () => {
  const a = JSON.parse(composed.text).committedRecords.find((r) => r.pathInRepository === REGISTRY);
  assert.equal(a.identityRefresh.was.sha256, samplePin.sha256);
  assert.equal(a.sha256, sha256(currentBytes));
  assert.equal(a.byteLength, currentBytes.length);
  assert.ok(a.identityRefresh.anchorsCompared > 0);
  assert.equal(a.identityRefresh.anchorsCompared, a.identityRefresh.anchorsIdentical);
  assert.ok(a.identityRefresh.recoveredFrom.blobId && a.identityRefresh.recoveredFrom.method);
  /* An earlier re-pin's comparison is preserved rather than overwritten. */
  assert.deepEqual(a.identityRefresh.previousIdentityRefresh, samplePin.identityRefresh ?? null);
});

test("the block claims no approval and no verdict", () => {
  const ir = JSON.parse(composed.text).committedRecords.find((r) => r.pathInRepository === REGISTRY).identityRefresh;
  const text = JSON.stringify(ir);
  for (const k of ["verdict", "approval", "approvedBy", "rasterReceipt", "acceptanceReceipt", "workflowRunId"]) {
    assert.equal(k in ir, false, `the block must not carry ${k}`);
  }
  assert.match(text, /opens no route and grants no approval/);
});

test("generate.mjs would read the rewrite as an unmoved family", () => {
  const v = readsAsUnmoved(plan.beforeText, composed.text);
  assert.equal(v.ok, true, v.why);
  assert.ok(doctrineRefreshedPaths(JSON.parse(composed.text)).has(REGISTRY));
});

test("generate.mjs would read ANY OTHER edit to the receipt as movement", () => {
  const doc = JSON.parse(composed.text);
  doc.committedRecords.find((r) => r.pathInRepository === REGISTRY).role = "an edited role";
  const v = readsAsUnmoved(plan.beforeText, `${JSON.stringify(doc, null, 2)}\n`);
  assert.equal(v.ok, false);
  assert.match(v.why, /re-binding, not a re-pin/);
});

test("generate.mjs would refuse a block whose anchorsCompared is 0", () => {
  const doc = JSON.parse(composed.text);
  doc.committedRecords.find((r) => r.pathInRepository === REGISTRY).identityRefresh.anchorsCompared = 0;
  assert.equal(doctrineRefreshedPaths(doc), null);
  assert.equal(readsAsUnmoved(plan.beforeText, `${JSON.stringify(doc, null, 2)}\n`).ok, false);
});

test("generate.mjs would refuse a block whose anchorsCompared !== anchorsIdentical", () => {
  const doc = JSON.parse(composed.text);
  doc.committedRecords.find((r) => r.pathInRepository === REGISTRY).identityRefresh.anchorsIdentical -= 1;
  assert.equal(doctrineRefreshedPaths(doc), null);
  assert.equal(readsAsUnmoved(plan.beforeText, `${JSON.stringify(doc, null, 2)}\n`).ok, false);
});

test("the pin stays a whole-file SHA-256 of the bytes on disk -- the obligation is not weakened", () => {
  const a = JSON.parse(composed.text).committedRecords.find((r) => r.pathInRepository === REGISTRY);
  assert.equal(a.sha256, sha256(fs.readFileSync(path.join(ROOT, REGISTRY))));
  assert.equal(a.sha256.length, 64);
});

test("a pin that is not repository-relative is resolved against the bases its receipt declares, not called missing", () => {
  /* The Colorado family pins forms by pathInArchive under
   * $MASTER_LIBRARY_SOURCE_DIR and binaries under a custody mount it names.
   * Read-only: this family is not in the lapsed set and nothing is written. */
  const dir = "data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill";
  if (!fs.existsSync(path.join(ROOT, dir, "source-receipt.json"))) return;
  const receipt = readReceipt(dir);
  assert.equal(receipt.corpusRootFromEnvironment, "MASTER_LIBRARY_SOURCE_DIR");
  const archivePin = receipt.documents.find((d) => typeof d.pathInArchive === "string");
  assert.ok(archivePin, "expected a pathInArchive pin");
  const found = currentBytesOf(archivePin.pathInArchive, { receipt, pin: archivePin });
  if (!process.env.MASTER_LIBRARY_SOURCE_DIR) return;   // the corpus is not mounted for this run
  assert.ok(found.bytes, `held bytes reported unresolved after trying ${found.triedBases.join(", ")}`);
  assert.equal(sha256(found.bytes), archivePin.sha256, "the corpus bytes must satisfy the pin they are bound by");
  assert.match(found.from, /MASTER_LIBRARY_SOURCE_DIR/);
});

test("a pin whose own receipt declares its custody unmounted is reported, not counted as drift", () => {
  const dir = "data/rcap-all50/overlays/census-v1/co/co-motion-seal-conviction-set--official-pdf-fill";
  if (!fs.existsSync(path.join(ROOT, dir, "source-receipt.json"))) return;
  const p = planFamily({ familyId: "co_motion_seal_conviction-set", directory: dir });
  assert.ok(Array.isArray(p.unmeasurablePins) && p.unmeasurablePins.length > 0, "expected unmounted-custody pins to be reported");
  for (const u of p.unmeasurablePins) {
    assert.ok(u.receiptSays, "each unmeasurable pin must carry the receipt's own words about why");
    assert.equal((p.records ?? []).some((r) => r.path === u.path), false, "an unmeasurable pin must not be reported as a drifted record");
  }
});

test("no packet byte is written: the plan touches only source-receipt.json", () => {
  for (const f of families) {
    const p = planFamily({ familyId: f.familyId, directory: f.directory });
    if (p.receiptPath) assert.match(p.receiptPath, /\/source-receipt\.json$/);
  }
});

const failed = results.filter((r) => !r.passed);
for (const r of results) console.log(`${r.passed ? "pass" : "FAIL"}  ${r.name}${r.passed ? "" : `\n      ${r.error}`}`);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length }));
process.exitCode = failed.length ? 1 : 0;
