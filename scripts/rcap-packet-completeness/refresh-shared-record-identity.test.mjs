/*
 * The regression this file exists for: FIX157 changed 2 of 497 entries in a
 * shared national record and nine families that bind none of them lost
 * COMPLETE_PACKET_PROVEN, taking terminal from 210 to 202. The refresher that
 * closes that gap is one line away from being the opposite defect -- a tool
 * that re-anchors a pin THROUGH a real change would launder it into a passing
 * digest. So every test here is about the refusal, and each drives the real
 * path over a real git repository rather than modelling it.
 */
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const MODULE = path.join(HERE, "refresh-shared-record-identity.mjs");
const RECORD = "data/record-clearing/shared-record.json";
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

const entry = (id, extra = {}) => ({ packetSetId: id, components: [{ componentId: `${id}-1` }], ...extra });
const recordWith = (sets, globals = {}) => ({ schemaVersion: "test/v1", ...globals, packetSets: sets });

/* A repository with a real two-commit drift on the shared record, and a
 * receipt pinned to the FIRST version. */
function repoWithDrift({ before, after, pinFamily = "keep-me" }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "refresh-"));
  const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@t"); git("config", "user.name", "t");
  fs.mkdirSync(path.join(root, path.dirname(RECORD)), { recursive: true });
  const write = (o) => fs.writeFileSync(path.join(root, RECORD), `${JSON.stringify(o, null, 2)}\n`);
  write(before);
  git("add", RECORD); git("commit", "-qm", "before");
  const pinned = sha256(fs.readFileSync(path.join(root, RECORD)));
  write(after);
  git("add", RECORD); git("commit", "-qm", "after");

  const dir = "data/overlays/fam";
  fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, dir, "source-receipt.json"), `${JSON.stringify({
    familyId: pinFamily,
    groundingRecords: [{ record: "unrelated", wholeFileSha256: "x" }],
    committedRecords: [{ pathInRepository: RECORD, sha256: pinned, byteLength: 1, role: "the record" }]
  }, null, 2)}\n`);
  return { root, dir, pinned };
}

const load = async (root) => {
  process.env.RCAP_REFRESH_ROOT = root;
  return import(`${MODULE}?t=${Math.random()}`);
};
const receiptOf = (root, dir) => JSON.parse(fs.readFileSync(path.join(root, dir, "source-receipt.json"), "utf8"));
const pinOf = (r) => r.committedRecords[0];

test("refreshes when only another family's entry moved, and records the comparison", async () => {
  const { root, dir, pinned } = repoWithDrift({
    before: recordWith([entry("keep-me"), entry("someone-else")]),
    after: recordWith([entry("keep-me"), entry("someone-else", { components: [{ componentId: "new" }] })])
  });
  const m = await load(root);
  const out = m.refreshFamilyPin({ receiptPath: `${dir}/source-receipt.json`, packetSetId: "keep-me", recordPath: RECORD, today: "2026-09-10" });
  assert.equal(out.status, "REFRESHED");
  const pin = pinOf(receiptOf(root, dir));
  assert.equal(pin.sha256, sha256(fs.readFileSync(path.join(root, RECORD))));
  assert.equal(pin.identityRefresh.was.sha256, pinned);
  /* The generator's exemption only honours a refresh that RECORDED identical
   * anchors, so these two fields are load-bearing, not decoration. */
  assert.equal(pin.identityRefresh.anchorsCompared, 2);
  assert.equal(pin.identityRefresh.anchorsIdentical, 2);
  fs.rmSync(root, { recursive: true, force: true });
});

test("REFUSES when the family's own entry moved, and writes nothing", async () => {
  const { root, dir, pinned } = repoWithDrift({
    before: recordWith([entry("keep-me"), entry("other")]),
    after: recordWith([entry("keep-me", { components: [{ componentId: "changed" }] }), entry("other")])
  });
  const m = await load(root);
  const before = fs.readFileSync(path.join(root, dir, "source-receipt.json"), "utf8");
  const out = m.refreshFamilyPin({ receiptPath: `${dir}/source-receipt.json`, packetSetId: "keep-me", recordPath: RECORD, today: "2026-09-10" });
  assert.equal(out.status, "REFUSED_MATERIAL_CHANGE");
  assert.equal(out.anchorsIdentical, 1);
  assert.equal(out.anchorsCompared, 2);
  assert.equal(fs.readFileSync(path.join(root, dir, "source-receipt.json"), "utf8"), before);
  assert.equal(pinOf(receiptOf(root, dir)).sha256, pinned);
  fs.rmSync(root, { recursive: true, force: true });
});

test("REFUSES when a global authority field moved, even though the entry is identical", async () => {
  const { root, dir } = repoWithDrift({
    before: recordWith([entry("keep-me")], { authority: "A" }),
    after: recordWith([entry("keep-me")], { authority: "B" })
  });
  const m = await load(root);
  const out = m.refreshFamilyPin({ receiptPath: `${dir}/source-receipt.json`, packetSetId: "keep-me", recordPath: RECORD, today: "2026-09-10" });
  assert.equal(out.status, "REFUSED_MATERIAL_CHANGE");
  assert.ok(out.detail.some((d) => d.startsWith("recordGlobalMetadata: MOVED")));
  fs.rmSync(root, { recursive: true, force: true });
});

test("REFUSES when the family is absent from the record entirely", async () => {
  const { root, dir } = repoWithDrift({
    before: recordWith([entry("other")]),
    after: recordWith([entry("other"), entry("late-arrival")])
  });
  const m = await load(root);
  const out = m.refreshFamilyPin({ receiptPath: `${dir}/source-receipt.json`, packetSetId: "keep-me", recordPath: RECORD, today: "2026-09-10" });
  assert.equal(out.status, "REFUSED_FAMILY_ABSENT_FROM_RECORD");
  fs.rmSync(root, { recursive: true, force: true });
});

test("REFUSES when the pinned bytes are not recoverable from history", async () => {
  const { root, dir } = repoWithDrift({ before: recordWith([entry("keep-me")]), after: recordWith([entry("keep-me"), entry("x")]) });
  const r = receiptOf(root, dir);
  r.committedRecords[0].sha256 = "0".repeat(64);
  fs.writeFileSync(path.join(root, dir, "source-receipt.json"), `${JSON.stringify(r, null, 2)}\n`);
  const m = await load(root);
  const out = m.refreshFamilyPin({ receiptPath: `${dir}/source-receipt.json`, packetSetId: "keep-me", recordPath: RECORD, today: "2026-09-10" });
  assert.equal(out.status, "REFUSED_PINNED_BYTES_NOT_RECOVERABLE");
  fs.rmSync(root, { recursive: true, force: true });
});

test("is idempotent: a pin already matching the bytes writes nothing", async () => {
  const { root, dir } = repoWithDrift({ before: recordWith([entry("keep-me")]), after: recordWith([entry("keep-me"), entry("x")]) });
  const m = await load(root);
  assert.equal(m.refreshFamilyPin({ receiptPath: `${dir}/source-receipt.json`, packetSetId: "keep-me", recordPath: RECORD, today: "2026-09-10" }).status, "REFRESHED");
  const once = fs.readFileSync(path.join(root, dir, "source-receipt.json"), "utf8");
  assert.equal(m.refreshFamilyPin({ receiptPath: `${dir}/source-receipt.json`, packetSetId: "keep-me", recordPath: RECORD, today: "2026-09-11" }).status, "ALREADY_CURRENT");
  assert.equal(fs.readFileSync(path.join(root, dir, "source-receipt.json"), "utf8"), once);
  fs.rmSync(root, { recursive: true, force: true });
});

test("key order is not content: a reordered record refreshes, a reordered VALUE array does not hide a change", async () => {
  const { root, dir } = repoWithDrift({
    before: recordWith([{ packetSetId: "keep-me", a: 1, b: 2 }]),
    after: recordWith([{ b: 2, packetSetId: "keep-me", a: 1 }, entry("x")])
  });
  const m = await load(root);
  assert.equal(m.refreshFamilyPin({ receiptPath: `${dir}/source-receipt.json`, packetSetId: "keep-me", recordPath: RECORD, today: "2026-09-10" }).status, "REFRESHED");
  const two = repoWithDrift({
    before: recordWith([{ packetSetId: "keep-me", list: ["a", "b"] }]),
    after: recordWith([{ packetSetId: "keep-me", list: ["b", "a"] }])
  });
  const m2 = await load(two.root);
  assert.equal(m2.refreshFamilyPin({ receiptPath: `${two.dir}/source-receipt.json`, packetSetId: "keep-me", recordPath: RECORD, today: "2026-09-10" }).status, "REFUSED_MATERIAL_CHANGE");
  fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(two.root, { recursive: true, force: true });
});
