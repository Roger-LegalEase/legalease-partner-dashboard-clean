/**
 * WHY THIS EXISTS.
 *
 * FIX157 added two components to two Colorado entries in
 * data/record-clearing/legal-design-packet-set-manifests.json. That record is
 * pinned by WHOLE-FILE sha256 by families all over the corpus, so its digest
 * moved for all of them, and nine families that FIX157 never touched --
 * Arkansas, Arizona, Maine, Minnesota, four North Carolina routes and West
 * Virginia -- were withdrawn from COMPLETE_PACKET_PROVEN to VERIFY_PENDING in
 * the next integration. Terminal fell from 210 to 202 for an edit that changed
 * 2 of 497 entries and no global field.
 *
 * A whole-file pin cannot tell "the part I bind changed" from "some other
 * part of this file changed". This closes that gap the way the contract
 * requires: PROVE the family's own bound content is unchanged across the
 * drift, then re-anchor the pin and record the comparison that justified it.
 *
 * WHAT IT REFUSES TO DO. It never refreshes through a material change. If the
 * family's own entry moved by one byte, or a global field of the record moved,
 * the pin is left exactly as committed and the family keeps owing a fresh
 * read. A refresh is a statement that nothing this receipt binds moved; making
 * that statement without checking would launder a real change into a passing
 * digest, which is worse than the withdrawal it would avoid.
 *
 * It is also idempotent: a pin already matching the bytes on disk is left
 * alone, so re-running it writes nothing.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { eachPin, pathKeyOf } from "./identity-refresh.mjs";

/* Overridable so the regression suite can build a real git repository with a
 * real drift and drive the whole path, rather than modelling it. */
const ROOT = process.env.RCAP_REFRESH_ROOT
  ? path.resolve(process.env.RCAP_REFRESH_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

/* Canonical form for comparing one entry across the drift. Key order is not
 * content, so it is sorted away; everything else is compared exactly. */
export const canonical = (value) => JSON.stringify(sortDeep(value));
function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep(v[k])]));
  }
  return v;
}

/** Every commit that touched the record, newest first. */
const commitsTouching = (rel) =>
  execFileSync("git", ["log", "--format=%H", "--", rel], { cwd: ROOT, encoding: "utf8" })
    .split("\n").map((s) => s.trim()).filter(Boolean);

/**
 * Recover the exact bytes a pin was written against, by hashing the record at
 * each commit that touched it until one matches. Reconstructing them any other
 * way would be inventing the evidence the comparison rests on.
 */
export function blobMatchingDigest(rel, digest) {
  for (const commit of commitsTouching(rel)) {
    let bytes;
    try { bytes = execFileSync("git", ["show", `${commit}:${rel}`], { cwd: ROOT, maxBuffer: 1 << 28 }); }
    catch { continue; }
    if (sha256(bytes) === digest) return { commit, bytes };
  }
  return null;
}

/**
 * The anchors a packet-set family binds in this record: its own entry, and the
 * record's global (non-entry) fields, which carry authority the entry relies on.
 */
export function anchorsFor(document, packetSetId, entriesKey = "packetSets") {
  const sets = document?.[entriesKey];
  if (!Array.isArray(sets)) throw new Error(`${entriesKey} is not an array in the pinned record`);
  const entry = sets.find((s) => s?.packetSetId === packetSetId);
  const globals = Object.fromEntries(Object.entries(document).filter(([k]) => k !== entriesKey));
  return { [`recordGlobalMetadata`]: globals, [`packetSet:${packetSetId}`]: entry ?? null };
}

/**
 * Refresh one family's pin on one shared record. Returns what it did and why.
 * Writes nothing unless every anchor compared identical.
 */
export function refreshFamilyPin({ receiptPath, packetSetId, recordPath, entriesKey = "packetSets", today }) {
  const abs = path.join(ROOT, receiptPath);
  const receipt = JSON.parse(fs.readFileSync(abs, "utf8"));
  const onDisk = sha256(fs.readFileSync(path.join(ROOT, recordPath)));

  const pins = [];
  eachPin(receipt, (node) => { if (pathKeyOf(node) && node[pathKeyOf(node)] === recordPath) pins.push(node); });
  if (!pins.length) return { status: "NO_PIN_ON_THIS_RECORD", packetSetId };
  if (pins.every((p) => p.sha256 === onDisk)) return { status: "ALREADY_CURRENT", packetSetId };

  const results = [];
  for (const pin of pins) {
    if (pin.sha256 === onDisk) { results.push({ status: "ALREADY_CURRENT" }); continue; }
    const was = blobMatchingDigest(recordPath, pin.sha256);
    if (!was) return { status: "REFUSED_PINNED_BYTES_NOT_RECOVERABLE", packetSetId, pinned: pin.sha256 };

    const before = anchorsFor(JSON.parse(was.bytes.toString("utf8")), packetSetId, entriesKey);
    const after = anchorsFor(JSON.parse(fs.readFileSync(path.join(ROOT, recordPath), "utf8")), packetSetId, entriesKey);

    const detail = []; const identicalSha = {}; let identical = 0;
    for (const key of Object.keys(after)) {
      const same = canonical(before[key]) === canonical(after[key]);
      detail.push(`${key}: ${same ? "identical" : "MOVED"}`);
      if (same) { identical += 1; identicalSha[key] = sha256(Buffer.from(canonical(after[key]), "utf8")); }
    }
    const compared = Object.keys(after).length;
    if (identical !== compared) {
      return { status: "REFUSED_MATERIAL_CHANGE", packetSetId, anchorsCompared: compared, anchorsIdentical: identical, detail };
    }
    if (after[`packetSet:${packetSetId}`] === null) {
      return { status: "REFUSED_FAMILY_ABSENT_FROM_RECORD", packetSetId };
    }

    pin.identityRefresh = {
      refreshedOn: today,
      was: { sha256: pin.sha256, byteLength: pin.byteLength ?? null },
      why: `${recordPath} was rewritten around this receipt's anchors. This receipt binds no part of it that moved: `
        + `the entry for ${packetSetId} and the record's global authority fields were recovered from the blob carrying `
        + `the previous pin (${was.commit}) and compared object-for-object, order-independent, against the current `
        + `record, and all ${compared} were identical.`,
      recoveredFromCommit: was.commit,
      anchorsCompared: compared,
      anchorDetail: detail,
      anchorsIdentical: identical,
      identicalAnchorSha256: identicalSha,
      canonicalisation: "keys sorted recursively, JSON.stringify with no spacing, UTF-8",
      whatThisDoesNotEstablish: "It re-anchors a whole-file pin whose bound content did not move. It renews no "
        + "independent verification, no raster acceptance and no approval, and it opens no route."
    };
    pin.sha256 = onDisk;
    pin.byteLength = fs.statSync(path.join(ROOT, recordPath)).size;
    results.push({ status: "REFRESHED", anchorsCompared: compared, anchorsIdentical: identical });
  }

  fs.writeFileSync(abs, `${JSON.stringify(receipt, null, 2)}\n`);
  return { status: "REFRESHED", packetSetId, pins: results.length, results };
}

const INVOKED_DIRECTLY = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (INVOKED_DIRECTLY) {
  const recordPath = process.argv[2];
  const today = new Date().toISOString().slice(0, 10);
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"), "utf8"));
  const families = process.argv.slice(3);
  let refreshed = 0, refused = 0, untouched = 0;
  for (const familyId of families) {
    const row = queue.families.find((f) => f.familyId === familyId);
    if (!row) { console.log(`SKIP ${familyId}: not in the queue`); continue; }
    const out = refreshFamilyPin({
      receiptPath: `${row.directory}/source-receipt.json`, packetSetId: familyId, recordPath, today
    });
    if (out.status === "REFRESHED") refreshed += 1;
    else if (out.status.startsWith("REFUSED")) refused += 1;
    else untouched += 1;
    console.log(`${out.status} ${familyId}${out.anchorsCompared !== undefined ? ` (${out.anchorsIdentical}/${out.anchorsCompared} anchors identical)` : ""}`);
    if (out.detail) for (const d of out.detail) console.log(`    ${d}`);
  }
  console.log(`\n${refreshed} refreshed · ${refused} refused · ${untouched} already current or unpinned`);
  console.log("A refresh re-anchors a pin whose bound content did not move. It renews no verification and opens no route.");
  if (refused) process.exit(1);
}
