#!/usr/bin/env node
/**
 * The reconciliation, exercised on a corpus this test builds and owns.
 *
 * "141 of 141 held, zero demotions" is only worth reading if the same run would
 * have demoted a family whose bytes had moved. So the demotion path is proved
 * here, on three synthetic families in a temporary root: one valid, one whose
 * canonical moved, and one this filesystem cannot see. Nothing real is written.
 *
 *   node scripts/grade-a-packet-factory-24h/test-reconcile-proven-family-bytes.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "reconcile-proven-family-bytes.mjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "reconcile-proven-"));
const DIR = "data/rcap-grade-a/packet-factory-24h";
const CENSUS = "data/rcap-all50/overlays/census-v1";
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const write = (rel, body) => {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
  return sha(Buffer.from(body));
};
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

const fam = (id) => `${CENSUS}/zz/${id}--official-pdf-fill`;
const familyRow = (id, canonicalSha, boundarySha, canonicalPath) => ({
  familyId: id,
  canonicalPdfPath: canonicalPath ?? `${fam(id)}/fixtures/canonical.pdf`,
  canonicalPdfSha256: canonicalSha,
  boundaryPdfPath: `${fam(id)}/fixtures/boundary.pdf`,
  boundaryPdfSha256: boundarySha,
  documents: [
    { role: "canonical", name: "canonical.pdf", path: canonicalPath ?? `${fam(id)}/fixtures/canonical.pdf`, sha256: canonicalSha },
    { role: "boundary", name: "boundary.pdf", path: `${fam(id)}/fixtures/boundary.pdf`, sha256: boundarySha }
  ],
  coverage: { documents: ["canonical.pdf"], rastered: ["canonical.pdf"], notRastered: [], complete: true },
  currentRasterState: "RASTER_PASS",
  rasterReceipt: {
    verdict: "RASTER_PASS", workflowRunId: "1", workflow: ".github/workflows/rcap-packet-raster-acceptance-batch.yml",
    jobConclusion: "success", boundToCanonicalSha256: canonicalSha, boundToBoundarySha256: boundarySha,
    documentsCovered: ["canonical.pdf"], documentsNotCovered: [], coversTheWholeFamily: true
  }
});

/* zz-holds: valid. zz-moved: its canonical is rebuilt under the receipt.
 * zz-absent: its canonical was never checked out here. */
const holdsC = write(`${fam("zz-holds")}/fixtures/canonical.pdf`, "%PDF holds\n");
const holdsB = write(`${fam("zz-holds")}/fixtures/boundary.pdf`, "%PDF holds b\n");
const movedC = write(`${fam("zz-moved")}/fixtures/canonical.pdf`, "%PDF moved, as accepted\n");
const movedB = write(`${fam("zz-moved")}/fixtures/boundary.pdf`, "%PDF moved b\n");
const absentB = write(`${fam("zz-absent")}/fixtures/boundary.pdf`, "%PDF absent b\n");

write(`${fam("zz-holds")}/product-wiring.json`, `${JSON.stringify({ family: "zz-holds", binding: { acceptanceReceipt: { verdict: "RASTER_PASS" } } }, null, 2)}\n`);
write(`${fam("zz-moved")}/product-wiring.json`, `${JSON.stringify({ family: "zz-moved", binding: { acceptanceReceipt: { verdict: "RASTER_PASS" } } }, null, 2)}\n`);

write(`${DIR}/MASTER_QUEUE.json`, `${JSON.stringify({
  families: [
    { familyId: "zz-holds", state: "COMPLETE_PACKET_PROVEN", jurisdiction: "ZZ", directory: fam("zz-holds") },
    { familyId: "zz-moved", state: "COMPLETE_PACKET_PROVEN", jurisdiction: "ZZ", directory: fam("zz-moved") },
    { familyId: "zz-absent", state: "COMPLETE_PACKET_PROVEN", jurisdiction: "ZZ", directory: fam("zz-absent") }
  ]
}, null, 2)}\n`);
write(`${DIR}/RASTER_QUEUE.json`, `${JSON.stringify({
  rows: [
    familyRow("zz-holds", holdsC, holdsB),
    familyRow("zz-moved", movedC, movedB),
    familyRow("zz-absent", sha(Buffer.from("%PDF never checked out here\n")), absentB)
  ]
}, null, 2)}\n`);

/* The bytes move under the accepted receipt, exactly as a rebuild moves them. */
fs.writeFileSync(path.join(root, `${fam("zz-moved")}/fixtures/canonical.pdf`), "%PDF moved, rebuilt afterwards\n");
const nowSha = sha(fs.readFileSync(path.join(root, `${fam("zz-moved")}/fixtures/canonical.pdf`)));

/* Exit 1 is a real outcome here -- it is how the script says a family could not
 * be verified in this checkout -- so the status is inspected rather than thrown. */
const run = (args) => spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], { encoding: "utf8" });

const applied = run(["--apply"]);
assert.equal(applied.status, 1, "a corpus with an unverifiable family does not exit clean");
const out = applied.stdout;
const record = readJson(`${DIR}/PROVEN_FAMILY_BYTE_RECONCILIATION.json`);

assert.equal(record.provenFamiliesConsidered, 3);
assert.equal(record.verifiedOnCurrentBytes, 1, "only the untouched family holds its proof");
assert.equal(record.demoted, 1, "the family whose canonical moved is demoted");
assert.equal(record.notVerifiableInThisCheckout, 1, "the family nobody can see is neither held nor demoted");
assert.equal(record.demotions[0].familyId, "zz-moved");
assert.deepEqual(record.demotions[0].digestsThatNoLongerMatch[0],
  { role: "canonical", path: `${fam("zz-moved")}/fixtures/canonical.pdf`, acceptedAs: movedC, nowHashesTo: nowSha });
assert.equal(record.notVerifiableHere[0].familyId, "zz-absent");
assert.match(out, /zz-moved \(ARTIFACT_IDENTITY_MISMATCH\)/);

const master = readJson(`${DIR}/MASTER_QUEUE.json`);
const state = Object.fromEntries(master.families.map((f) => [f.familyId, f.state]));
assert.equal(state["zz-holds"], "COMPLETE_PACKET_PROVEN", "a valid proof is preserved untouched");
assert.equal(state["zz-moved"], "BUILT_RASTER_PENDING");
assert.equal(state["zz-absent"], "COMPLETE_PACKET_PROVEN", "absence never demotes");

const queue = readJson(`${DIR}/RASTER_QUEUE.json`);
const movedRow = queue.rows.find((r) => r.familyId === "zz-moved");
assert.equal(movedRow.currentRasterState, "RASTER_PENDING");
assert.equal(movedRow.rasterReceipt.superseded, true);
assert.equal(movedRow.rasterReceipt.boundToCanonicalSha256, movedC,
  "the superseded receipt still records the bytes it actually rendered; it is never re-pinned to the new ones");
assert.notEqual(movedRow.rasterReceipt.boundToCanonicalSha256, nowSha);
const holdsRow = queue.rows.find((r) => r.familyId === "zz-holds");
assert.equal(holdsRow.currentRasterState, "RASTER_PASS");
assert.equal(holdsRow.rasterReceipt.superseded, undefined, "a valid receipt is not touched");

assert.equal(readJson(`${fam("zz-moved")}/product-wiring.json`).binding.acceptanceReceipt, null,
  "route authority downstream of a withdrawn proof is withdrawn with it");
assert.ok(readJson(`${fam("zz-holds")}/product-wiring.json`).binding.acceptanceReceipt,
  "and the route authority of a family that held is left alone");

/* An inventory nobody could read must not report a clean corpus. */
fs.writeFileSync(path.join(root, `${DIR}/RASTER_QUEUE.json`), `${JSON.stringify({ rows: [] }, null, 2)}\n`);
const empty = run([]);
assert.equal(empty.status, 2, "an empty inventory is inconclusive, not clean");
assert.match(empty.stderr, /INCONCLUSIVE/);

fs.rmSync(root, { recursive: true, force: true });
console.log("  ok   a valid proof is preserved and its route authority untouched");
console.log("  ok   a family whose canonical moved is demoted, named, with the digest that no longer matches");
console.log("  ok   the superseded receipt keeps its own hashes and is marked superseded in place");
console.log("  ok   a family this filesystem cannot see is reported and not demoted");
console.log("  ok   an unreadable or empty inventory is inconclusive rather than clean");
console.log("\nOK proven-family byte reconciliation — 5 case(s).");
