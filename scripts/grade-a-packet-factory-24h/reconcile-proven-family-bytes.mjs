#!/usr/bin/env node
/**
 * Every family currently called proven, re-measured against the bytes on disk.
 *
 * L4 counted a family proven from two strings in a data file and never opened
 * the PDF the row pins. Now that it does, the families promoted while it did
 * not have to be re-asked the question once, deliberately, and the answer
 * recorded -- otherwise the fixed gate simply inherits whatever the broken one
 * let through.
 *
 * WHAT THIS DOES NOT DO. It rebuilds no PDF and orders no legal re-review. It
 * re-hashes what is already there and compares it to what the accepted receipt
 * says it accepted. A family whose bytes still match keeps its proof untouched;
 * that is most of the point, because a reconciliation that disturbed valid
 * proofs would cost more than the defect.
 *
 * HISTORICAL RECEIPTS ARE RETAINED. A receipt that no longer describes the
 * bytes is marked superseded where it sits. Its hashes are never rewritten to
 * make it appear to cover the new bytes -- that would launder the exact failure
 * this lane exists to catch, and it would destroy the only record of what was
 * actually rendered. The remedy for a superseded receipt is a fresh raster on
 * the new bytes, which is a different lane's work and is not started here.
 *
 *   node scripts/grade-a-packet-factory-24h/reconcile-proven-family-bytes.mjs
 *   node ... --apply         write the corrections as well as the record
 *   node ... --root <dir>    reconcile a corpus other than this worktree
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acceptedRasterFor, candidateRowsByFamily, inventoryIsInspectable, ACCEPTANCE } from "./acceptance-identity.mjs";

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ROOT = (() => { const i = argv.indexOf("--root"); return i === -1 ? HERE : path.resolve(argv[i + 1]); })();

const DIR = "data/rcap-grade-a/packet-factory-24h";
const MASTER = path.join(ROOT, DIR, "MASTER_QUEUE.json");
const QUEUE = path.join(ROOT, DIR, "RASTER_QUEUE.json");
const RECORD = path.join(ROOT, DIR, "PROVEN_FAMILY_BYTE_RECONCILIATION.json");
const PROVEN = "COMPLETE_PACKET_PROVEN";
/* Where a family goes when its proof stops describing its bytes. Not a failure
 * verdict: nothing about the packet has been judged wrong, the receipt has
 * simply stopped covering it, and what it needs is a raster it has not had. */
const DEMOTED_TO = "BUILT_RASTER_PENDING";

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, v) => fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);

const master = readJson(MASTER);
const queue = readJson(QUEUE);

/*
 * Coverage of the corpus is answered before any defect count is believed. Zero
 * findings has two causes and they are opposite -- nothing is wrong, or nothing
 * was read -- and a reconciliation that cannot tell them apart reports loudest
 * exactly when it is most broken.
 */
const inspectable = inventoryIsInspectable(queue);
const provenFamilies = (master.families ?? []).filter((f) => f.state === PROVEN);
if (!inspectable.ok) {
  console.error(`INCONCLUSIVE: ${inspectable.why}`);
  process.exit(2);
}
if (provenFamilies.length === 0) {
  console.error("INCONCLUSIVE: the master queue holds no family in a proven state; there is nothing to reconcile and this is not a clean result");
  process.exit(2);
}

const candidates = candidateRowsByFamily(queue, { includeSuperseded: false });
const held = [];
const demoted = [];
const unverifiable = [];

for (const f of provenFamilies) {
  const acceptance = acceptedRasterFor(ROOT, candidates.get(f.familyId) ?? []);
  const moved = (acceptance.documents ?? []).filter((d) => d.identity === "MISMATCH");
  const silent = (acceptance.documents ?? []).filter((d) => d.identity !== "MATCH" && d.identity !== "MISMATCH");
  const entry = {
    familyId: f.familyId,
    jurisdiction: f.jurisdiction ?? null,
    status: acceptance.status,
    reasons: acceptance.reasons,
    digestsThatNoLongerMatch: moved.map((d) => ({ role: d.role, path: d.path, acceptedAs: d.pinned, nowHashesTo: d.actual })),
    documentsNotVerifiableHere: silent.map((d) => ({ role: d.role, path: d.path, why: d.identity, custodyRoot: d.custodyRoot }))
  };
  if (acceptance.proven) { held.push(entry); continue; }
  /*
   * Unverifiable is not demotable. A worktree that has not checked a fixture
   * out, or has no operational Nationwide mount, cannot say the bytes are wrong
   * -- and demoting a family on that would be the same class of error as
   * promoting one on a string. It is reported, loudly, and left standing.
   */
  if (!acceptance.conclusive) { unverifiable.push(entry); continue; }
  demoted.push(entry);
}

const record = {
  schemaVersion: "rcap-proven-family-byte-reconciliation/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/reconcile-proven-family-bytes.mjs",
  question: "Does every family called COMPLETE_PACKET_PROVEN still hash to the bytes its accepted receipt was bound to?",
  measuredWith: "scripts/grade-a-packet-factory-24h/acceptance-identity.mjs, the same evaluation generate-product-wiring and verify-lane-contracts L4 both run",
  whatWasNotDone: [
    "No PDF was rebuilt and no fixture byte was written.",
    "No legal re-review was ordered; this measures identity, not treatment.",
    "No historical receipt's hash was rewritten. A receipt that stopped describing the bytes is recorded as superseded, never re-pinned to them.",
    "No family was promoted. This can only hold a proof or withdraw one."
  ],
  corpusInspected: inspectable.why,
  provenFamiliesConsidered: provenFamilies.length,
  verifiedOnCurrentBytes: held.length,
  demoted: demoted.length,
  notVerifiableInThisCheckout: unverifiable.length,
  demotedTo: DEMOTED_TO,
  demotions: demoted,
  notVerifiableHere: unverifiable,
  heldFamilies: held.map((h) => h.familyId),
  grantsNothing: "This record opens no commercial route, marks no packet proven and approves no output. Commercial authority comes from a Grade-A fulfillment record keyed to an exact route and packet family, and from nothing else."
};

if (APPLY) {
  const byId = new Map((master.families ?? []).map((f) => [f.familyId, f]));
  const supersededAt = new Date().toISOString();
  for (const d of demoted) {
    const family = byId.get(d.familyId);
    if (family) {
      family.state = DEMOTED_TO;
      family.stateChangedBy = record.generatedBy;
      family.stateChangedBecause = `the accepted raster receipt no longer describes the bytes on disk (${d.status})`;
    }
    for (const row of queue.rows ?? []) {
      if (row.familyId !== d.familyId || !row.rasterReceipt) continue;
      row.currentRasterState = "RASTER_PENDING";
      /* Marked where it sits. Hashes untouched -- the receipt's value is that
       * it records exactly which bytes were rendered and passed. */
      row.rasterReceipt.superseded = true;
      row.rasterReceipt.supersededAt = supersededAt;
      row.rasterReceipt.supersededBecause = d.reasons[0] ?? d.status;
      row.rasterReceipt.supersededBy = record.generatedBy;
    }
    /* Route authority downstream: the binding a route resolver would install
     * from must stop naming an acceptance receipt that no longer holds.
     * generate-product-wiring recomputes exactly this from the same evaluation,
     * so the correction here is only to make the record honest immediately. */
    const family2 = byId.get(d.familyId);
    const wiringPath = family2?.directory ? path.join(ROOT, family2.directory, "product-wiring.json") : null;
    if (wiringPath && fs.existsSync(wiringPath)) {
      const wiring = readJson(wiringPath);
      if (wiring?.binding && wiring.binding.acceptanceReceipt) {
        wiring.binding.acceptanceReceipt = null;
        wiring.binding.acceptanceReceiptWithdrawnBecause = `the accepted receipt no longer describes the bytes at the pinned paths (${d.status}); a fresh raster on the current bytes is owed`;
        writeJson(wiringPath, wiring);
      }
    }
  }
  if (demoted.length) { writeJson(MASTER, master); writeJson(QUEUE, queue); }
}

fs.mkdirSync(path.dirname(RECORD), { recursive: true });
writeJson(RECORD, record);

console.log(`proven families considered: ${provenFamilies.length}`);
console.log(`verified on current bytes:  ${held.length}`);
console.log(`demoted to ${DEMOTED_TO}: ${demoted.length}`);
for (const d of demoted) {
  console.log(`  ${d.familyId} (${d.status})`);
  for (const g of d.digestsThatNoLongerMatch) console.log(`    ${g.role} ${g.path}\n      accepted as ${g.acceptedAs}\n      now hashes to ${g.nowHashesTo}`);
  if (!d.digestsThatNoLongerMatch.length) for (const r of d.reasons) console.log(`    ${r}`);
}
if (unverifiable.length) {
  console.log(`\nNOT VERIFIABLE IN THIS CHECKOUT: ${unverifiable.length} famil(ies) kept their state because absence is not corruption.`);
  for (const u of unverifiable.slice(0, 10)) console.log(`  ${u.familyId}: ${u.reasons[0] ?? u.status}`);
  console.log("  Mount the custody or complete the checkout and re-run before treating this as a clean result.");
}
console.log(`\nrecord: ${path.relative(ROOT, RECORD)}${APPLY ? "" : "  (measurement only; pass --apply to write the corrections)"}`);
if (unverifiable.length) process.exitCode = 1;
