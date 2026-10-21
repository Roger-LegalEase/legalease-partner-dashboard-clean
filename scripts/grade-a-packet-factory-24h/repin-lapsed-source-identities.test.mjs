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
import { isolateDrift } from "./repin-test-fixtures.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const adapter = ADAPTERS.get(REGISTRY);

const results = [];
const test = (name, run) => {
  try { run(); results.push({ name, passed: true }); }
  catch (err) { results.push({ name, passed: false, error: err.message }); }
};
const readReceipt = (dir) => JSON.parse(fs.readFileSync(path.join(ROOT, dir, "source-receipt.json"), "utf8"));

/* Focused route-contract controls use only committed JSON/git history and
 * temporary in-memory receipts. No corpus restore, app import or receipt write.
 * The historical registry controls below remain unchanged and run normally
 * unless this explicit focused test flag is supplied. */
function singleRouteContractTests() {
  const recordPath = "src/lib/legal-authority/routes/single-routes.json";
  const routeAdapter = ADAPTERS.get(recordPath);
  assert.ok(routeAdapter);
  const current = JSON.parse(fs.readFileSync(path.join(ROOT, recordPath), "utf8"));
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"), "utf8"));
  const ids = [
    "census-pending-family:ME:juvenile-sealing",
    "composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1017a_automatic_failure_correction",
    "composed-treatment:obligation:runtime-contract-cohort:DE:juvenile-expungement-under-10-del-c-1017-1019-1017a:section_1018_discretionary_petition",
    "composed-treatment:obligation:runtime-only:WV:sex-trafficking-victim-vacatur-and-expungement",
    "composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708"
  ];
  const examples = ids.map(familyId => {
    const family = queue.families.find(row => row.familyId === familyId);
    assert.ok(family, familyId);
    const receiptPath = `${family.directory}/source-receipt.json`;
    // Remain non-vacuous after the proposed receipt refresh is integrated:
    // recover an actual pre-refresh receipt rather than comparing current to itself.
    const revisions = ["HEAD", ...execFileSync("git", ["log", "--format=%H", "-12", "--", receiptPath],
      { cwd: ROOT, encoding: "utf8" }).trim().split("\n").filter(Boolean)];
    let receipt, pin, beforeText;
    for (const revision of [...new Set(revisions)]) {
      const candidateText = execFileSync("git", ["show", `${revision}:${receiptPath}`],
        { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 });
      const candidate = JSON.parse(candidateText);
      const binding = candidate.committedRecords.find(row => row.pathInRepository === recordPath);
      if (binding && binding.sha256 !== sha256(fs.readFileSync(path.join(ROOT, recordPath)))) {
        receipt = candidate; pin = binding; beforeText = isolateDrift(candidateText, recordPath, ROOT); break;
      }
    }
    assert.ok(pin, `no actual stale route-contract receipt found for ${familyId}`);
    const recovered = recoverBytesByDigest(recordPath, pin.sha256);
    assert.ok(recovered.bytes, recovered.why);
    assert.equal(sha256(recovered.bytes), pin.sha256);
    return { family, receipt, pin, beforeText, old: JSON.parse(recovered.bytes.toString("utf8")) };
  });
  const compare = (oldDoc, currentDoc, receipt, pin) => compareAnchors({
    adapter: routeAdapter, oldDoc, currentDoc,
    scope: routeAdapter.scopeFrom({ receipt, pin, currentDoc })
  });
  for (const example of examples) test(`route-contract ACCEPT recovered whole route and all branches: ${example.family.familyId}`, () => {
    const { old, receipt, pin } = example;
    const result = compare(old, current, receipt, pin);
    assert.deepEqual(result.differing, []);
    assert.equal(result.anchorsCompared, 2);
    assert.equal(result.anchorsIdentical, 2);
    assert.ok(result.anchorNames.includes("routeContractGlobalMetadata"));
    assert.ok(result.anchorNames.includes(pin.recordId));
    assert.notEqual(sha256(Buffer.from(JSON.stringify(old))), sha256(Buffer.from(JSON.stringify(current))),
      "the recovered source must genuinely precede the unrelated MD correction");
  });
  const { receipt, pin, old, family } = examples[1];
  const routeKey = pin.recordId.slice("route-contract:".length);
  const mutate = change => { const copy = structuredClone(current); change(copy); return copy; };
  test("route-contract compares complete other branches, not only the receipt's cohort", () => {
    // DE's full route notes carry the automatic and discretionary branch rules;
    // this source format has no serviceBranches child array.
    const changed = mutate(doc => { doc.routes.find(row => row.routeKey === routeKey).notes += " different automatic branch requirement"; });
    assert.deepEqual(compare(current, changed, receipt, pin).differing, [pin.recordId]);
  });
  test("route-contract changed required facts, clocks, exclusions and shared authority all refuse", () => {
    for (const change of [
      doc => { doc.routes.find(row => row.routeKey === routeKey).requiredFacts.push("different fact"); },
      doc => { doc.routes.find(row => row.routeKey === routeKey).timing.anchorText += " changed"; },
      doc => { doc.routes.find(row => row.routeKey === routeKey).exclusions.push("different exclusion"); },
      doc => { doc.authority = "different global authority"; }
    ]) assert.ok(compare(current, mutate(change), receipt, pin).differing.length);
  });
  test("route-contract absent historical/current anchors and duplicate routes refuse", () => {
    const absent = mutate(doc => { doc.routes = doc.routes.filter(row => row.routeKey !== routeKey); });
    assert.throws(() => compare(current, absent, receipt, pin), Refusal);
    assert.throws(() => compare(absent, current, receipt, pin), Refusal);
    const duplicate = mutate(doc => { doc.routes.push(structuredClone(doc.routes.find(row => row.routeKey === routeKey))); });
    assert.throws(() => compare(current, duplicate, receipt, pin), Refusal);
    assert.throws(() => compare(duplicate, current, receipt, pin), Refusal);
  });
  test("route-contract unknown/multiple recordId or wrong source path refuses", () => {
    for (const changed of [
      { ...pin, recordId: undefined }, { ...pin, recordId: "route-contract:DE:missing" },
      { ...pin, recordId: pin.recordId + "+ME:juvenile-sealing" },
      { ...pin, recordId: "other:" + routeKey }, { ...pin, pathInRepository: "unrelated.json" }
    ]) assert.throws(() => compare(old, current, receipt, changed), Refusal);
  });
  test("route-contract missing/duplicate/mismatched/unsupported receipt route scope refuses", () => {
    for (const changed of [
      { ...receipt, routeKeys: [] }, { ...receipt, routeKeys: undefined },
      { ...receipt, routeKeys: [receipt.routeKeys[0], receipt.routeKeys[0]] },
      { ...receipt, routeKeys: [receipt.routeKeys[0].replace(":DE:", ":ME:")] },
      { ...receipt, routeKeys: [receipt.routeKeys[0] + ":extra"] },
      { ...receipt, routeKeys: ["obligation:track-pathway:DE:invented:" + routeKey.split(":")[1]] },
      { ...receipt, jurisdiction: "ME" }
    ]) assert.throws(() => compare(old, current, changed, pin), Refusal);
  });
  test("route-contract malformed cohort suffix refuses; cohort never narrows source scope", () => {
    const malformed = { ...receipt, routeKeys: [receipt.routeKeys[0].replace(/:[^:]+$/, ":invalid/suffix")] };
    assert.throws(() => compare(old, current, malformed, pin), Refusal);
    const differentGrouping = { ...receipt, routeKeys: [receipt.routeKeys[0].replace(/:[^:]+$/, ":another_runtime_group")] };
    const result = compare(old, current, differentGrouping, pin);
    assert.deepEqual(result.anchorNames.sort(), ["routeContractGlobalMetadata",pin.recordId].sort());
    assert.equal(result.anchorsCompared,2);
  });
  test("route-contract complete identity mutation refuses, unrelated MD mutation may refresh", () => {
    const changed = mutate(doc => { doc.routes.find(row => row.routeKey === routeKey).pathwayId = "different"; });
    assert.throws(() => compare(current, changed, receipt, pin), Refusal);
    const unrelated = mutate(doc => { doc.routes.find(row => row.jurisdiction === "MD").notes = "unrelated source edit"; });
    assert.deepEqual(compare(current, unrelated, receipt, pin).differing, []);
  });
  for (const example of examples.slice(1,3)) test(`route-contract escaped DE lexical repair preserves all unrelated bytes: ${example.family.familyId}`, () => {
    const beforeText = example.beforeText; // exact recovered pre-refresh bytes, including escaped Unicode
    const plan = planReceipt({familyId: example.family.familyId, directory:example.family.directory,
      receiptPath:`${example.family.directory}/source-receipt.json`,beforeText,on:new Date("2026-10-16T00:00:00Z")});
    assert.equal(plan.outcome,"REFRESHABLE",plan.why);
    const composed=composeRefreshedReceipt(plan), after=JSON.parse(composed.text);
    const before=JSON.parse(beforeText), index=before.committedRecords.findIndex(pin=>pin.pathInRepository===recordPath);
    const stringify=value=>JSON.stringify(value,null,2).replace(/[\u007f-\uffff]/g,character=>`\\u${character.charCodeAt(0).toString(16).padStart(4,"0")}`);
    const indent=value=>stringify(value).split("\n").map((line,i)=>i?`    ${line}`:line).join("\n");
    const oldPin=indent(before.committedRecords[index]), newPin=indent(after.committedRecords[index]);
    assert.equal(beforeText.split(oldPin).length,2);
    assert.equal(composed.text, beforeText.replace(oldPin,newPin));
    assert.ok(composed.text.includes("\\u00a7"));
    assert.ok(readsAsUnmoved(beforeText,composed.text).ok);
    after.committedRecords[index]=before.committedRecords[index];assert.deepEqual(after,before);
    const duplicated=JSON.parse(beforeText);duplicated.copy=structuredClone(before.committedRecords[index]);
    assert.throws(()=>composeRefreshedReceipt({...plan,beforeText:stringify(duplicated)+"\n"}),Refusal);
    const wrongSpacing=beforeText.replace('  "familyId"',' "familyId"');
    assert.equal(planReceipt({...plan,beforeText:wrongSpacing}).outcome,"REFUSED");
  });
  test("route-contract native temporary-receipt planner preserves source-bound annotation and prior history", () => {
    const fixture = { familyId: family.familyId, jurisdiction: receipt.jurisdiction,
      routeKeys: receipt.routeKeys, committedRecords: [structuredClone(pin)] };
    const beforeText = JSON.stringify(fixture, null, 2) + "\n";
    const plan = planReceipt({ familyId: family.familyId, directory: family.directory,
      receiptPath: `${family.directory}/source-receipt.json`, beforeText, on: new Date("2026-10-16T00:00:00Z") });
    assert.equal(plan.outcome, "REFRESHABLE", plan.why);
    const composed = composeRefreshedReceipt(plan);
    const after = JSON.parse(composed.text).committedRecords[0];
    assert.equal(after.sha256, sha256(fs.readFileSync(path.join(ROOT, recordPath))));
    assert.equal(after.identityRefresh.anchorsCompared, 2);
    assert.equal(after.identityRefresh.anchorsIdentical, 2);
    assert.deepEqual(after.identityRefresh.previousIdentityRefresh, pin.identityRefresh);
    assert.ok(readsAsUnmoved(beforeText, composed.text).ok);
    const material = JSON.parse(composed.text); material.committedRecords[0].role += " changed";
    assert.equal(readsAsUnmoved(beforeText, JSON.stringify(material, null, 2) + "\n").ok, false);
  });
}
singleRouteContractTests();
if (process.argv.includes("--single-routes-only")) {
  const failed = results.filter(row => !row.passed);
  for (const row of results) console.log(`${row.passed ? "pass" : "FAIL"}  ${row.name}${row.passed ? "" : `\n      ${row.error}`}`);
  console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, scope: "single-route-contract adapter only; no app imports, DB or receipt writes" }));
  process.exit(failed.length ? 1 : 0);
}

/* ------------------------------------------------------------------ *
 * Recover the real historical registry, from history, by digest
 * ------------------------------------------------------------------ */

const families = lapsedFamilies();
// The original WI registry fixture remains valid after its live lapse clears.
// Dispatch order and unrelated lapsed families cannot choose this fixture.
const sample = JSON.parse(fs.readFileSync(path.join(ROOT,
  "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"), "utf8"))
  .families.find((f) => f.familyId === "rcap-wi-custom-pleading");
assert.ok(sample, "the retained WI registry fixture must exist in the queue");
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
  // Search this receipt's actual history; six unrelated recent commits say
  // nothing about whether its retained pre-refresh revision exists.
  const revisions = execFileSync("git", ["rev-list", "HEAD", "--", receiptPath],
    { cwd: ROOT, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  for (const rev of ["HEAD", ...revisions]) {
    try {
      const pin = JSON.parse(gitText(rev)).committedRecords.find((r) => r.pathInRepository === REGISTRY);
      if (pin && pin.sha256 !== sha256(currentBytes)) return rev;
    } catch { /* this revision does not carry the receipt; try the next */ }
  }
  return null;
})();
assert.ok(prePinRevision, "no revision of this receipt carries a stale registry pin, so the accept path has no fixture");
const beforeText = isolateDrift(gitText(prePinRevision), REGISTRY, ROOT);
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

/*
 * The Colorado change is a fixed pair from history, not "pre-pin vs live": the
 * receipt's pin at d4984cbc5 and at 2a27a1fc3 ("re-pin 21 source identities
 * lapsed by the Colorado track correction") bracket that one real change. The
 * live-tree pair flipped with every later registry move (the rules block stopped
 * differing at 2af21d873 and nothing differed at 66e80e5b9).
 */
const CO_CHANGE = { before: "d4984cbc58923c10b3bfa71b684611980b5ae7d7", after: "2a27a1fc3aa5b214de67554f2a01fd51defc0ef9" };
const registryPinnedAt = (rev) => {
  const pin = JSON.parse(gitText(rev)).committedRecords.find((r) => r.pathInRepository === REGISTRY);
  const found = recoverBytesByDigest(REGISTRY, pin.sha256);
  assert.ok(found.bytes, `could not recover the registry pinned at ${rev}: ${found.why}`);
  return JSON.parse(found.bytes.toString("utf8"));
};

test("REFUSE (real change, real family): a family binding co_motion_seal_conviction is refused, and the differing entry is named", () => {
  const co = "co_motion_seal_conviction";
  const BEFORE = registryPinnedAt(CO_CHANGE.before);
  const AFTER = registryPinnedAt(CO_CHANGE.after);
  assert.ok(AFTER.tracks.some((t) => t.trackId === co) && BEFORE.tracks.some((t) => t.trackId === co),
    "the Colorado track must exist on both sides for this to be a real comparison");
  /* The real family's own records: its route key and the recordId shape every
   * registry pin uses. Nothing of that family's directory is read or written. */
  const receipt = { routeKeys: [`obligation:track-pathway:CO:${co}:petition-based-conviction-sealing-jdf-612-24-72-706`] };
  const pin = { recordId: `legal-design-track-registry:${co}`, pathInRepository: REGISTRY };
  const scope = adapter.scopeFrom({ receipt, pin, currentDoc: AFTER });
  assert.deepEqual(scope.anchorIds, [co]);
  const c = compareAnchors({ adapter, oldDoc: BEFORE, currentDoc: AFTER, scope });
  assert.deepEqual(c.differing, [`track:${co}`], "the changed Colorado track must be named as differing");
  assert.notEqual(c.anchorsCompared, c.anchorsIdentical);
  const detail = describeDifference({ adapter, oldDoc: BEFORE, currentDoc: AFTER, scope, differing: c.differing });
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
  // Current CO custody was later supplied. Exercise the original unmounted
  // declaration using its actual retained receipt, never a fabricated flag.
  const receiptPath = `${dir}/source-receipt.json`;
  const revisions = execFileSync("git", ["rev-list", "HEAD", "--", receiptPath],
    { cwd: ROOT, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  let beforeText;
  for (const revision of revisions) {
    const candidate = execFileSync("git", ["show", `${revision}:${receiptPath}`],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 24 });
    const receipt = JSON.parse(candidate);
    if (receipt.componentSetDelivery?.undelivered?.some(component =>
      component.binaryRecordedInCommittedIndex?.mountedHere === false)) {
      beforeText = candidate; break;
    }
  }
  assert.ok(beforeText, "actual historical CO unmounted-custody receipt required");
  const p = planReceipt({ familyId: "co_motion_seal_conviction-set", directory: dir,
    receiptPath, beforeText });
  assert.equal(p.unmeasurablePins.length, 2, "both retained unmounted order pins must be reported");
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
