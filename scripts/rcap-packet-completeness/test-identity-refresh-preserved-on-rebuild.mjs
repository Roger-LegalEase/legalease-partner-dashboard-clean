#!/usr/bin/env node
/**
 * Both directions of the identityRefresh rule, on the two receipts that
 * actually lost annotations.
 *
 * rcap-ok-custom-pleading and rcap-wa-custom-pleading-clean-tracks each carry
 * three hand-written blocks and each lost all three to a rebuild that changed
 * nothing about their sources. They are the subjects here because a rule proved
 * only on invented data is a rule proved against the author's imagination.
 *
 * The two directions are not symmetric in cost, and the test says so:
 *
 *   - a valid annotation SURVIVES a rebuild. Failing this way loses a repair
 *     silently and sends the next lane to redo it by hand.
 *   - genuinely stale evidence does NOT become current by being copied forward.
 *     Failing THIS way is worse: it makes a comparison nobody performed look
 *     performed, on bytes nobody read.
 *
 *   node scripts/rcap-packet-completeness/test-identity-refresh-preserved-on-rebuild.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  carryForwardIdentityRefresh, annotationIsSourceBound, eachPin, preserveIdentityRefresh
} from "./identity-refresh.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SUBJECTS = [
  "data/rcap-all50/overlays/census-v1/ok/rcap-ok-custom-pleading--custom-pleading/source-receipt.json",
  "data/rcap-all50/overlays/census-v1/wa/rcap-wa-custom-pleading-clean-tracks--custom-pleading/source-receipt.json"
];

const load = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const clone = (x) => structuredClone(x);
const annotationsIn = (doc) => {
  const found = [];
  eachPin(doc, (pin, at) => { if (pin.identityRefresh) found.push({ at, sha256: pin.sha256, annotation: pin.identityRefresh }); });
  return found;
};
/** What a plain rebuild emits: the same pins, no hand-written annotations. */
const asRebuilt = (doc) => {
  const next = clone(doc);
  eachPin(next, (pin) => { delete pin.identityRefresh; });
  return next;
};

const results = [];
const it = (name, fn) => { fn(); results.push(name); };

for (const rel of SUBJECTS) {
  const name = rel.split("/").slice(-2, -1)[0];
  const committed = load(rel);
  const held = annotationsIn(committed);
  assert.equal(held.length, 3, `${name} is the subject because it carries three annotations`);

  /* ---- direction one: a valid annotation survives a rebuild ------------- */
  it(`${name}: all three annotations survive a rebuild that changed no source`, () => {
    const rebuilt = asRebuilt(committed);
    assert.equal(annotationsIn(rebuilt).length, 0, "the rebuild really did drop them");
    const { document, carried, dropped } = carryForwardIdentityRefresh(committed, rebuilt);
    assert.equal(carried.length, 3);
    assert.equal(dropped.length, 0);
    /* Verbatim, nesting included: was.byteLength is one of the fields a lane
     * lost, and a shallow copy would look like a pass while dropping it. */
    assert.deepEqual(document, committed,
      "the rebuilt receipt is byte-for-byte the receipt a human wrote");
    for (const a of annotationsIn(document)) {
      assert.equal(typeof a.annotation.was.byteLength, "number", "nested was.byteLength survived");
      assert.ok(a.annotation.anchorsCompared > 0);
    }
  });

  /* ---- direction two: stale evidence is not laundered ------------------- */
  it(`${name}: an annotation whose source moved again is NOT carried forward`, () => {
    const rebuilt = asRebuilt(committed);
    const target = held[0].at;
    const movedTo = "f".repeat(64);
    let touched = 0;
    eachPin(rebuilt, (pin, at) => { if (at === target) { pin.sha256 = movedTo; touched += 1; } });
    assert.ok(touched > 0, "the source this rebuild measured differs from the one the annotation was written against");

    const { document, carried, dropped } = carryForwardIdentityRefresh(committed, rebuilt);
    const survived = annotationsIn(document).map((a) => a.at);
    assert.ok(!survived.includes(target), "a stale comparison does not become current by being copied forward");
    assert.equal(carried.length, 2, "and the two annotations that ARE still true are still preserved");
    assert.equal(dropped.length, 1);
    assert.equal(dropped[0].path, target);
    assert.equal(dropped[0].measuredNow, movedTo);
    assert.match(dropped[0].why, /moved again/);
  });

  it(`${name}: a source reverted to the pre-refresh identity is not annotated`, () => {
    const rebuilt = asRebuilt(committed);
    const target = held[0].at;
    const wasSha = held[0].annotation.was.sha256;
    eachPin(rebuilt, (pin, at) => { if (at === target) pin.sha256 = wasSha; });
    const { document, dropped } = carryForwardIdentityRefresh(committed, rebuilt);
    assert.ok(!annotationsIn(document).map((a) => a.at).includes(target));
    assert.equal(dropped.length, 1);
  });
}

/* ---- the artifact-bound direction, stated on its own ------------------- */
it("an approval or acceptance block is never carried across a rebuild", () => {
  assert.equal(annotationIsSourceBound({ was: { sha256: "a".repeat(64) }, anchorsCompared: 1, anchorsIdentical: 1 }).ok, true);
  for (const artifact of [
    { was: { sha256: "a".repeat(64) }, approvedBy: "a reviewer" },
    { was: { sha256: "a".repeat(64) }, acceptanceReceipt: { verdict: "RASTER_PASS" } },
    { was: { sha256: "a".repeat(64) }, boundToCanonicalSha256: "b".repeat(64) },
    { was: { sha256: "a".repeat(64) }, visualReview: "passed" }
  ]) {
    const shape = annotationIsSourceBound(artifact);
    assert.equal(shape.ok, false, `${Object.keys(artifact).join(",")} must not ride a rebuild`);
    assert.match(shape.why, /artifact-bound/);
  }
  /* and not merely classified -- actually refused by the carry-forward */
  const previous = { committedRecords: [{ pathInRepository: "p.json", sha256: "a".repeat(64), identityRefresh: { was: { sha256: "b".repeat(64) }, approvedBy: "a reviewer" } }] };
  const next = { committedRecords: [{ pathInRepository: "p.json", sha256: "a".repeat(64) }] };
  const { document, carried, dropped } = carryForwardIdentityRefresh(previous, next);
  assert.equal(carried.length, 0);
  assert.equal(dropped.length, 1);
  assert.equal(document.committedRecords[0].identityRefresh, undefined);
});

it("a block with no previous source identity is not a source-identity note", () => {
  assert.equal(annotationIsSourceBound({ why: "trust me" }).ok, false);
  assert.equal(annotationIsSourceBound(null).ok, false);
  assert.equal(annotationIsSourceBound({ was: { byteLength: 12 } }).ok, false);
});

it("an annotation the builder wrote itself is left alone", () => {
  const mine = { was: { sha256: "c".repeat(64) }, why: "written by this build" };
  const previous = { documents: [{ pathInArchive: "d.pdf", sha256: "a".repeat(64), identityRefresh: { was: { sha256: "b".repeat(64) } } }] };
  const next = { documents: [{ pathInArchive: "d.pdf", sha256: "a".repeat(64), identityRefresh: mine }] };
  const { document, carried } = carryForwardIdentityRefresh(previous, next);
  assert.equal(carried.length, 0);
  assert.deepEqual(document.documents[0].identityRefresh, mine);
});

it("a pin the rebuild no longer binds is reported rather than resurrected", () => {
  const previous = { records: [{ recordPath: "gone.json", sha256: "a".repeat(64), identityRefresh: { was: { sha256: "b".repeat(64) } } }] };
  const next = { records: [] };
  const { dropped } = carryForwardIdentityRefresh(previous, next);
  assert.equal(dropped.length, 1);
  assert.match(dropped[0].why, /nothing to sit on/);
});

it("a missing, unreadable or non-JSON previous receipt costs the build nothing", () => {
  const doc = { committedRecords: [{ pathInRepository: "p.json", sha256: "a".repeat(64) }] };
  assert.equal(preserveIdentityRefresh(fs, path.join(ROOT, "no/such/source-receipt.json"), doc), doc);
  assert.equal(preserveIdentityRefresh(fs, path.join(ROOT, "package.json"), doc), doc);
  assert.equal(preserveIdentityRefresh({ readFileSync: () => { throw new Error("boom"); } }, "x", doc), doc);
});

it("preserveIdentityRefresh restores from the receipt already on disk", () => {
  const rel = SUBJECTS[0];
  const committed = load(rel);
  const restored = preserveIdentityRefresh(fs, path.join(ROOT, rel), asRebuilt(committed));
  assert.deepEqual(restored, committed);
});

/* ---- the residual, kept from growing in silence -------------------------
 *
 * The preservation is wired into the write path of every builder that owns a
 * receipt carrying an annotation today -- 52 of them, either directly or
 * through the two shared hosts. It is NOT wired into the ~117 builders whose
 * receipts carry none, because none of them can lose one and the measured
 * defect does not reach them.
 *
 * That is only safe while it stays true. The moment a lane writes an
 * identityRefresh onto a receipt whose builder is unwired, the next rebuild
 * erases it and the tripwire reports it AFTER the loss. This case reports it
 * BEFORE: it fails, and names the build script to wire, the same one-line edit
 * the other 52 carry.
 */
it("every receipt carrying an annotation is built through the preservation", () => {
  const receipts = execFileSync("git", ["ls-files", "data/rcap-all50/overlays/census-v1/*/*/source-receipt.json"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }).trim().split("\n").filter(Boolean);
  assert.ok(receipts.length > 0, "git ls-files matched zero receipts; the denominator is broken, not the tree");

  const master = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"), "utf8"));
  const scriptByDirectory = new Map((master.families ?? []).map((f) => [f.directory, f.buildScript]));

  /* Wired directly, or through any module it imports. */
  const wired = (script, seen = new Set()) => {
    if (!script || seen.has(script)) return false;
    seen.add(script);
    const abs = path.join(ROOT, script);
    if (!fs.existsSync(abs)) return false;
    const text = fs.readFileSync(abs, "utf8");
    if (text.includes("preserveIdentityRefresh")) return true;
    for (const spec of text.match(/from\s+"(\.[^"]+\.mjs)"/g) ?? []) {
      const rel = spec.replace(/^from\s+"/, "").replace(/"$/, "");
      const next = path.posix.join(path.posix.dirname(script), rel);
      if (wired(next, seen)) return true;
    }
    return false;
  };

  let annotated = 0;
  const unwired = [];
  for (const rel of receipts) {
    let doc;
    try { doc = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")); } catch { continue; }
    if (annotationsIn(doc).length === 0) continue;
    annotated += 1;
    const script = scriptByDirectory.get(path.posix.dirname(rel));
    if (!wired(script)) unwired.push(`${rel} is built by ${script ?? "a build script the master queue does not name"}`);
  }
  assert.ok(annotated > 0, "no receipt carries an annotation, so this case measured nothing");
  assert.deepEqual(unwired, [],
    "each of these receipts carries an annotation a rebuild would erase; wire its builder's writeJson through preserveIdentityRefresh");
  console.log(`       (${annotated} annotated receipt(s), every one built through the preservation)`);
});

for (const r of results) console.log(`  ok   ${r}`);
console.log(`\nOK identityRefresh preservation — ${results.length} case(s).`);
