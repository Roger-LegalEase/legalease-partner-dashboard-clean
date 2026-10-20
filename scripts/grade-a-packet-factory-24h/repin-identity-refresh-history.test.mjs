// Ruling B' (2026-10-20): a rebuild re-pins from disk and carries a superseded
// identityRefresh block as history on the pin. The planner then treats that pin
// as drifted from the entry's writtenAgainst (the last proven digest) to disk,
// compares through the adapter, and writes the live block with the entry as its
// predecessor; the history stays on the pin. The doctrine normalises the history
// key only on a refreshed path (a live block recording identical anchors), so a
// history-only pin, or a live block with non-identical anchors, still reads as
// moved with its sha256 and history visible.
//
//   node --test scripts/grade-a-packet-factory-24h/repin-identity-refresh-history.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { carryForwardIdentityRefresh, eachPin } from "../rcap-packet-completeness/identity-refresh.mjs";
import {
  driftedPinsOf, historyPredecessorOf, planReceipt, composeRefreshedReceipt, readsAsUnmoved,
  doctrineRefreshedPaths, doctrineNormalise, sha256
} from "./repin-lapsed-source-identities.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
/* NM dna-sample-profile-expungement: the family whose 2026-10-19 census block a rebuild dropped (ruling B). */
const FAM = "agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement";
const DIR = "data/rcap-all50/overlays/census-v1/nm/agency-application-treatment:obligation:runtime-only:nm:dna-sample-profile-expungement--official-pdf-fill";
const RECEIPT = `${DIR}/source-receipt.json`;
const CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json";
const committedText = fs.readFileSync(path.join(ROOT, RECEIPT), "utf8");
const committed = JSON.parse(committedText);
const censusPin = (doc) => { let found = null; eachPin(doc, (pin, at) => { if (at === CENSUS) found = pin; }); return found; };
const onDisk = sha256(fs.readFileSync(path.join(ROOT, CENSUS)));
assert.ok(censusPin(committed).identityRefresh, "control: the committed NM receipt carries a live block on its census pin");
assert.notEqual(censusPin(committed).sha256, onDisk, "control: the census moved since the committed pin (f6fc0814 -> the census-landing successor)");

/* What a rebuild writes: every pin re-measured from disk, no blocks; then the helper. */
const rebuilt = () => {
  const next = structuredClone(committed);
  eachPin(next, (pin) => { delete pin.identityRefresh; });
  const pin = censusPin(next);
  pin.sha256 = onDisk; pin.byteLength = fs.statSync(path.join(ROOT, CENSUS)).size;
  return carryForwardIdentityRefresh(committed, next, { on: "2026-10-20T04:30:00Z" }).document;
};

test("the rebuilt pin carries history, no live block, and equals the bytes on disk", () => {
  const pin = censusPin(rebuilt());
  assert.equal(pin.identityRefresh, undefined);
  assert.equal(pin.sha256, onDisk);
  assert.equal(pin.identityRefreshHistory.length, 1);
  assert.equal(pin.identityRefreshHistory[0].writtenAgainst, censusPin(committed).sha256);
  assert.equal(historyPredecessorOf(pin).writtenAgainst, censusPin(committed).sha256);
});

test("driftedPinsOf reports the rebuilt pin as drifted from the last proven digest to disk", () => {
  const doc = rebuilt();
  const drift = driftedPinsOf(doc).filter((d) => d.at === CENSUS);
  assert.equal(drift.length, 1);
  assert.equal(drift[0].pin.sha256, censusPin(committed).sha256, "the planned 'pinned' digest is the history entry's writtenAgainst");
  assert.equal(drift[0].pin.byteLength, censusPin(committed).byteLength, "and its byte length rides from the entry");
  assert.equal(drift[0].now, onDisk);
  assert.equal(drift[0].fromHistory.writtenAgainst, censusPin(committed).sha256);
  assert.equal(drift[0].pin.recordId, censusPin(committed).recordId ?? undefined);
});

test("the plan is REFRESHABLE through the census adapter and the composed receipt nests the entry, keeps the history, and reads as unmoved against the committed receipt", () => {
  const doc = rebuilt();
  const beforeText = `${JSON.stringify(doc, null, 2)}\n`;
  const plan = planReceipt({ familyId: FAM, directory: DIR, receiptPath: RECEIPT, beforeText, on: new Date("2026-10-20T04:40:00Z") });
  assert.equal(plan.outcome, "REFRESHABLE", JSON.stringify(plan).slice(0, 600));
  const record = plan.records.find((r) => r.path === CENSUS);
  assert.equal(record.fromHistory.writtenAgainst, censusPin(committed).sha256);
  assert.equal(record.was.sha256, censusPin(committed).sha256);
  assert.equal(record.becomes.sha256, onDisk);
  const { text, applied } = composeRefreshedReceipt(plan);
  assert.equal(applied.length, plan.records.length);
  const after = censusPin(JSON.parse(text));
  assert.equal(after.sha256, onDisk);
  assert.ok(after.identityRefresh.anchorsCompared > 0);
  assert.equal(after.identityRefresh.anchorsCompared, after.identityRefresh.anchorsIdentical);
  assert.deepEqual(after.identityRefresh.previousIdentityRefresh, censusPin(doc).identityRefreshHistory[0], "the superseded block is the new block's predecessor");
  assert.deepEqual(after.identityRefreshHistory, censusPin(doc).identityRefreshHistory, "the history array stays on the pin, untouched");
  assert.deepEqual(readsAsUnmoved(beforeText, text), { ok: true }, "rebuilt receipt -> re-pinned receipt");
  assert.deepEqual(readsAsUnmoved(committedText, text), { ok: true }, "committed (verdict-base) receipt -> re-pinned receipt: the family is not moved by the rebuild once the pin is proven again");
});

test("mutant: a history-only pin without a live block still reads as moved, sha256 and history visible", () => {
  const doc = rebuilt();
  const beforeText = `${JSON.stringify(doc, null, 2)}\n`;
  assert.equal(doctrineRefreshedPaths(doc).has(CENSUS), false, "a history-only pin is not a refreshed path");
  const verdict = readsAsUnmoved(committedText, beforeText);
  assert.equal(verdict.ok, false);
  const normalised = JSON.parse(doctrineNormalise(beforeText, doctrineRefreshedPaths(doc)));
  const pin = censusPin(normalised);
  assert.equal(pin.sha256, onDisk, "the moved digest is still visible to the comparison");
  assert.equal(pin.identityRefreshHistory.length, 1, "and so is the history");
});

test("mutant: a live block with non-identical anchors keeps history and sha256 visible and the doctrine refuses the receipt", () => {
  const doc = rebuilt();
  const pin = censusPin(doc);
  pin.identityRefresh = { was: { sha256: pin.identityRefreshHistory[0].writtenAgainst }, anchorsCompared: 2, anchorsIdentical: 1, why: "mutant" };
  const text = `${JSON.stringify(doc, null, 2)}\n`;
  assert.equal(doctrineRefreshedPaths(doc), null, "the doctrine refuses a block whose anchors are not all identical");
  assert.equal(readsAsUnmoved(committedText, text).ok, false);
  const normalised = JSON.parse(doctrineNormalise(text, new Set()));
  assert.equal(censusPin(normalised).sha256, onDisk);
  assert.equal(censusPin(normalised).identityRefreshHistory.length, 1);
});

test("a pin with a live block and no history, and a pin that matches disk with no history, are unchanged by the history rules", () => {
  assert.equal(historyPredecessorOf(censusPin(committed)), null);
  const doc = rebuilt();
  delete censusPin(doc).identityRefreshHistory;
  assert.equal(driftedPinsOf(doc).filter((d) => d.at === CENSUS).length, 0, "no history, no live block, equals disk: nothing to plan");
});

/*
 * Two entries (Acceptance mutant p2, 2026-10-20): with one entry the oldest and
 * the newest are the same, so a planner that read identityRefreshHistory[0] went
 * unnoticed. Here the committed pin already carries an older entry, written
 * against the digest the census had before the 2026-10-19 refresh, and the
 * helper appends the superseded live block after it. The planner must plan from
 * that newest entry; the older one names a digest this receipt has not been
 * proven at since.
 */
test("two history entries: the helper appends the newest last and the planner plans from it, not from the oldest", () => {
  const live = censusPin(committed).identityRefresh;
  const older = { ...structuredClone(live), writtenAgainst: live.was.sha256, writtenAgainstByteLength: live.was.byteLength,
    supersededBy: { measuredNow: censusPin(committed).sha256, on: "2026-10-19", by: "rebuild", why: "fixture: an earlier move" } };
  assert.notEqual(older.writtenAgainst, censusPin(committed).sha256, "control: the two entries name different digests");
  const previous = structuredClone(committed);
  censusPin(previous).identityRefreshHistory = [older];
  const next = structuredClone(committed);
  eachPin(next, (pin) => { delete pin.identityRefresh; delete pin.identityRefreshHistory; });
  censusPin(next).sha256 = onDisk; censusPin(next).byteLength = fs.statSync(path.join(ROOT, CENSUS)).size;
  const doc = carryForwardIdentityRefresh(previous, next, { on: "2026-10-20T04:30:00Z" }).document;

  const history = censusPin(doc).identityRefreshHistory;
  assert.equal(history.length, 2);
  assert.deepEqual(history[0], older, "the older entry rides first, verbatim");
  assert.equal(history[1].writtenAgainst, censusPin(committed).sha256, "the superseded live block is appended last");
  assert.equal(historyPredecessorOf(censusPin(doc)).writtenAgainst, censusPin(committed).sha256);

  const drift = driftedPinsOf(doc).filter((d) => d.at === CENSUS);
  assert.equal(drift.length, 1);
  assert.equal(drift[0].pin.sha256, censusPin(committed).sha256, "planned from the newest entry's writtenAgainst");
  assert.notEqual(drift[0].pin.sha256, older.writtenAgainst, "never from the oldest");

  const beforeText = `${JSON.stringify(doc, null, 2)}\n`;
  const plan = planReceipt({ familyId: FAM, directory: DIR, receiptPath: RECEIPT, beforeText, on: new Date("2026-10-20T04:40:00Z") });
  assert.equal(plan.outcome, "REFRESHABLE", JSON.stringify(plan).slice(0, 600));
  const record = plan.records.find((r) => r.path === CENSUS);
  assert.equal(record.was.sha256, censusPin(committed).sha256);
  const after = censusPin(JSON.parse(composeRefreshedReceipt(plan).text));
  assert.deepEqual(after.identityRefresh.previousIdentityRefresh, history[1], "the predecessor is the newest entry");
  assert.deepEqual(after.identityRefreshHistory, history, "both entries stay on the pin, in order");
});
