#!/usr/bin/env node
/*
 * REFRESH ONE WHOLE-FILE PIN, ON PROOF THAT THIS FAMILY'S OWN INPUT DID NOT MOVE.
 *
 * co_petition_seal_arrest-set holds a fifteen-of-fifteen PASS_COMPLETE_INDEPENDENT
 * from VF01 and a RASTER_PASS bound to the bytes on disk, and it is held at
 * VERIFY_PENDING by one thing: its source receipt pins
 * legal-design-track-registry.json by WHOLE-FILE sha256, and that national record
 * has since been edited. The edit was to a different family.
 *
 * This does not rebuild the packet. Not one delivered byte changes. It refreshes
 * the pin and records why, which is what the identityRefresh mechanism exists for
 * and what the NC precedent at scripts/rcap-packet-recovery/chat1/ established.
 *
 * IT REFUSES UNLESS THE EQUIVALENCE IS PROVEN, and the proof is not "the file
 * changed a little". It is: the bound track object is byte-identical under a
 * canonical serialisation, the track count is unchanged, and every byte of the
 * record OUTSIDE the track arrays is identical. If the bound track moved at all,
 * this exits non-zero and writes nothing -- a material change must still fail.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);

const REGISTRY = "data/record-clearing/legal-design-track-registry.json";
const DIRECTORY = "data/rcap-all50/overlays/census-v1/co/co-petition-seal-arrest-set--official-pdf-fill";
const RECEIPT = path.join(DIRECTORY, "source-receipt.json");
const TRACK = "co_petition_seal_arrest";
const PINNED_SHA = "555e5700c049608b0766cc7f5f65adfa748bbd32fae790d2220652bf08b958dc";
const OLD_BLOB = "6c02c7b6fdbd4a5e40870fef07d96e5d7e0c2d34";
const OLD_COMMIT = "d4984cbc58923c10b3bfa71b684611980b5ae7d7";

const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const canon = (value) => JSON.stringify(value, Object.keys(value ?? {}).length ? undefined : undefined);
/* A stable serialisation: sorted keys, no whitespace. */
const stable = (value) => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
};
const indexTracks = (doc) => {
  const out = new Map();
  const walk = (node) => {
    if (Array.isArray(node)) { for (const v of node) walk(v); return; }
    if (node && typeof node === "object") {
      if (typeof node.trackId === "string") out.set(node.trackId, node);
      for (const v of Object.values(node)) walk(v);
    }
  };
  walk(doc);
  return out;
};
const withoutTracks = (doc) => {
  const copy = JSON.parse(JSON.stringify(doc));
  const walk = (node) => {
    if (Array.isArray(node)) { for (const v of node) walk(v); return; }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object" && typeof v[0].trackId === "string") node[k] = ["<tracks>"];
        else walk(v);
      }
    }
  };
  walk(copy);
  return copy;
};

const oldBytes = execFileSync("git", ["cat-file", "blob", OLD_BLOB], { maxBuffer: 1 << 28 });
assert.equal(sha(oldBytes), PINNED_SHA, "the recovered blob is not the blob the receipt pins");
const currentBytes = fs.readFileSync(path.join(ROOT, REGISTRY));
const CURRENT_SHA = sha(currentBytes);

const oldDoc = JSON.parse(oldBytes.toString("utf8"));
const newDoc = JSON.parse(currentBytes.toString("utf8"));
const oldTracks = indexTracks(oldDoc);
const newTracks = indexTracks(newDoc);

export function equivalenceProof({ oldTracks: a = oldTracks, newTracks: b = newTracks, track = TRACK } = {}) {
  assert.ok(a.has(track) && b.has(track), `the bound track ${track} is missing from one side`);
  assert.equal(a.size, b.size, "the registry gained or lost a track; that is not an identity refresh");
  const boundOld = stable(a.get(track));
  const boundNew = stable(b.get(track));
  assert.equal(boundOld, boundNew, `the bound track ${track} CHANGED; a material change must fail rather than refresh`);
  const changed = [...new Set([...a.keys(), ...b.keys()])].filter((id) => stable(a.get(id)) !== stable(b.get(id)));
  assert.ok(!changed.includes(track), "the bound track is among the changed tracks");
  return { changedTracks: changed.sort(), boundTrackObjectSha256: sha(Buffer.from(boundNew)), trackCount: a.size };
}

const proof = equivalenceProof();
assert.equal(stable(withoutTracks(oldDoc)), stable(withoutTracks(newDoc)),
  "the record changed OUTSIDE its track arrays; refuse rather than refresh");

/*
 * RUN THE WRITE ONLY WHEN THIS FILE IS THE PROGRAM.
 *
 * Its test imports equivalenceProof to drive the real refusals rather than a
 * model of them -- and on the first run that import executed this module's
 * write path and refreshed the receipt as a side effect of running the tests.
 * The content was correct and the guards had all passed, which is exactly why
 * it was easy to miss. A test must not write to the repository, so the CLI is
 * now behind the same guard claim.mjs carries.
 */
const INVOKED_DIRECTLY = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (INVOKED_DIRECTLY && process.argv.includes("--prove-only")) {
  console.log(JSON.stringify({ ...proof, pinnedSha: PINNED_SHA, currentSha: CURRENT_SHA }, null, 1));
  process.exit(0);
}

if (INVOKED_DIRECTLY) {
const receipt = JSON.parse(fs.readFileSync(path.join(ROOT, RECEIPT), "utf8"));
const before = JSON.stringify(receipt);
const pins = (receipt.committedRecords ?? []).filter((r) => r.pathInRepository === REGISTRY && r.sha256 === PINNED_SHA);
assert.equal(pins.length, 1, `expected exactly one pin at the old digest, found ${pins.length}`);
const pin = pins[0];
pin.sha256 = CURRENT_SHA;
pin.byteLength = currentBytes.length;
pin.identityRefresh = {
  refreshedOn: new Date().toISOString().slice(0, 10),
  was: { sha256: PINNED_SHA, byteLength: oldBytes.length },
  recoveredFromCommit: OLD_COMMIT,
  recoveredFromBlob: OLD_BLOB,
  refreshedAgainstCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  previousIdentityRefresh: null,
  trackIds: [TRACK],
  trackCountBothSides: proof.trackCount,
  changedTracks: proof.changedTracks,
  identicalTrackSha256: { [TRACK]: proof.boundTrackObjectSha256 },
  canonicalisation: "keys sorted recursively, no whitespace, JSON.stringify of scalars",
  why: "The whole-file digest moved because one unrelated track was edited. Exactly one track differs between the pinned registry and the current one -- co_motion_seal_conviction, a different family -- while this family's own bound track object is byte-identical under the canonicalisation above and every byte outside the track arrays is identical. No packet byte, source selection, legal treatment or review disposition changes.",
  whatThisDoesNotDo: "It does not rebuild the family, does not touch its fixtures, and does not refresh any other pin. A change to the bound track itself makes this script exit non-zero and write nothing."
};

/* Nothing but that pin's digest, length and annotation may move. */
const normalized = JSON.parse(JSON.stringify(receipt));
const check = (normalized.committedRecords ?? []).find((r) => r.pathInRepository === REGISTRY && r.sha256 === CURRENT_SHA);
check.sha256 = PINNED_SHA;
check.byteLength = oldBytes.length;
delete check.identityRefresh;
assert.equal(JSON.stringify(normalized), before, "something other than the pin, its length and its annotation changed");

fs.writeFileSync(path.join(ROOT, RECEIPT), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`identityRefresh written: ${PINNED_SHA.slice(0, 12)} -> ${CURRENT_SHA.slice(0, 12)}`);
console.log(`  tracks both sides: ${proof.trackCount}; changed: ${proof.changedTracks.join(", ") || "none"}`);
console.log(`  bound track ${TRACK} identical, object sha256 ${proof.boundTrackObjectSha256.slice(0, 16)}`);
}
