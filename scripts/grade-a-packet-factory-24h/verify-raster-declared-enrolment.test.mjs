#!/usr/bin/env node
// A family is enrolled in the visual gate for the outputs it DECLARES, and a
// reader change costs no family a receipt it already earned.
//
// generate-raster-queue.mjs asked every declaration one question --
// `a.fixture === "canonical"` over the artifacts and pdfs arrays -- and a builder
// that ships one packet per variant answers it with nothing, because it labels
// its rows "canonical--felony" or "canonical--acquitted". Three families were
// therefore recorded as ineligible for "the builder declares none" while each of
// them declares all of them, and a fourth had to be shown to be unaffected:
//
//   al-trafficking-set        4 complete packets, 11 pages each, 44 pages
//   ne-seal-pre2017-set       6 complete packets,  5 pages each, 30 pages
//   rcap-or-official-pdf-fill 4 complete packets,  9 pages each, 36 pages
//   pa_pardon_expungement-set 2 complete packets,  5 pages each, 10 pages
//
// Oregon is the reason a declaration is read for what it EXCLUDES as well as what
// it names: it declares a `motionFile` beside each `file`, and the
// motion-and-declaration PDF is one component of the nine-page packet, not the
// packet. Enrolling all eight Oregon PDFs would call four components complete
// packets. Pennsylvania is the reason the count is two and not six: its four
// --PA-RCRIM-P-790-* PDFs are retained per-component byte proof, and its own
// report pushes only canonical.pdf and boundary.pdf into `artifacts`.
//
// The second half of this file is the cost ledger. Two earlier attempts at this
// repair each cost nineteen standing RASTER_PASS receipts, for two reasons that
// have nothing to do with the four families:
//
//   ORDER. documentsDigest hashes the documents IN ORDER, so letting a
//   declaration decide the order restates seventeen sets that had not changed by
//   one file and invalidates every receipt over them.
//
//   NARROWING. dc_seal_conviction-set went from four documents to two because a
//   declaration was read as an exhaustive list. A declaration that omits a
//   delivered PDF is a gap in the declaration, not permission to stop measuring
//   the PDF.
//
// So raster-enrolment-baseline.json freezes every family that held a RASTER_PASS
// before the change, with its pinned bytes and its documentsDigest, and this test
// fails if any of them loses the receipt, leaves the matrix, or has its document
// set restated while its bytes stand still.
//
//   node --test scripts/grade-a-packet-factory-24h/verify-raster-declared-enrolment.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const QUEUE = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json");
const MASTER = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const BASELINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "raster-enrolment-baseline.json");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const queue = readJson(QUEUE);
const master = readJson(MASTER);
const baseline = readJson(BASELINE);
const rowOf = (id) => (queue.rows ?? []).find((r) => r.familyId === id) ?? null;
const dirOf = (id) => {
  const f = (master.families ?? []).find((x) => x.familyId === id);
  return f?.directory ? path.join(ROOT, f.directory) : null;
};

/*
 * An independent read of a family's declaration, deliberately not the generator's.
 *
 * It answers two questions from the report alone and never from a filename: which
 * files the builder calls a complete output of a role, and which files it names
 * anywhere at all. Anything in the second set and not the first is a component the
 * builder has classified as something other than the packet -- Oregon's motionFile.
 */
const declaredOutputs = (dir, role) => {
  const report = path.join(dir, "reports", "rendered-artifacts.json");
  if (!fs.existsSync(report)) return null;
  const doc = readJson(report);
  const complete = [];
  const everyPdfNamed = new Set();
  const walk = (node) => {
    if (typeof node === "string") { if (node.toLowerCase().endsWith(".pdf")) everyPdfNamed.add(node); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") Object.values(node).forEach(walk);
  };
  walk(doc);
  for (const key of ["artifacts", "pdfs", "packets"]) {
    for (const row of Array.isArray(doc[key]) ? doc[key] : []) {
      if (typeof row?.file !== "string") continue;
      const label = row.fixtureClass ?? row.fixture;
      if (label !== role && !(typeof label === "string" && label.startsWith(`${role}--`))) continue;
      if (!complete.includes(row.file)) complete.push(row.file);
    }
  }
  return { complete, everyPdfNamed };
};

/*
 * WHAT EACH OF THE FOUR FAMILIES DELIVERS.
 *
 * The page counts are the ones the queue reads out of the PDF bytes, and they are
 * written here as numbers so that a family quietly shipping a different packet is a
 * failure rather than a silently restated expectation. The document names are NOT
 * written here: they are derived from each family's own declaration below, because
 * the declaration is the evidence and a list copied into a test is only a second
 * assertion of the same thing.
 */
const FOUR = [
  { familyId: "pa_pardon_expungement-set", documents: 2, pagesEach: 5, pages: 10,
    note: "two assembled outputs; the four --PA-RCRIM-P-790-* PDFs are retained per-component byte proof and are not selections" },
  { familyId: "al-trafficking-set", documents: 4, pagesEach: 11, pages: 44,
    note: "canonical and boundary for both misdemeanor and felony, each carrying CR-65 and C-10" },
  { familyId: "ne-seal-pre2017-set", documents: 6, pagesEach: 5, pages: 30,
    note: "canonical and boundary for dismissed-prosecutor-motion, dismissed-problem-solving-court and acquitted" },
  { familyId: "rcap-or-official-pdf-fill", documents: 4, pagesEach: 9, pages: 36,
    note: "two routes, canonical and boundary each; the motionFile beside each is a component of the nine-page packet, not the packet" },
];

for (const fam of FOUR) {
  test(`${fam.familyId} is enrolled for its declared complete outputs (${fam.documents} documents, ${fam.pages} pages)`, () => {
    const row = rowOf(fam.familyId);
    assert.ok(row, `${fam.familyId} is not in the raster matrix at all — it declares ${fam.documents} complete outputs and the queue enrols none of them`);
    const dir = dirOf(fam.familyId);
    assert.ok(dir && fs.existsSync(dir), `no overlay directory for ${fam.familyId}`);

    for (const role of ["canonical", "boundary"]) {
      const declared = declaredOutputs(dir, role);
      assert.ok(declared?.complete.length, `${fam.familyId} declares no ${role} complete output`);
      const expected = declared.complete
        .map((file) => path.relative(path.join(dir, "fixtures"), path.resolve(ROOT, file)))
        .sort();
      const enrolled = (row.documents ?? []).filter((d) => d.role === role).map((d) => d.name).sort();
      assert.deepEqual(enrolled, expected,
        `${fam.familyId} ${role}: the queue must enrol exactly what the family declares as a complete ${role} output — ${fam.note}`);
    }

    assert.equal((row.documents ?? []).length, fam.documents, `${fam.familyId} document count`);
    for (const d of row.documents ?? []) {
      assert.equal(d.pageCount, fam.pagesEach, `${fam.familyId} ${d.name} page count`);
    }
    assert.equal((row.documents ?? []).reduce((s, d) => s + (d.pageCount ?? 0), 0), fam.pages,
      `${fam.familyId} total enrolled pages`);
    assert.equal(row.coverage?.complete, true, `${fam.familyId} coverage must be complete over the declared set`);
    assert.deepEqual(row.coverage?.notRastered ?? [], [],
      `${fam.familyId}: a component the declaration classifies as something other than the packet must not be reported as a canonical document the gate skipped`);
  });
}

test("no declared complete output is left out and no component is enrolled as one", () => {
  // Oregon states this as a difference: eight PDFs carry a role in the fixtures
  // directory and four of them are complete packets. If the gate ever enrols the
  // component motion PDFs it will bind a receipt to four pages of a nine-page
  // packet, which reads as a verdict on the packet and is not one.
  const or = rowOf("rcap-or-official-pdf-fill");
  assert.ok(or, "rcap-or-official-pdf-fill is not in the matrix");
  const names = (or.documents ?? []).map((d) => d.name);
  assert.equal(names.filter((n) => n.includes("motion-and-declaration")).length, 0,
    "the motion-and-declaration PDF is a component of the Oregon packet and must never be queued as the packet");
  const dir = dirOf("rcap-or-official-pdf-fill");
  const onDisk = fs.readdirSync(path.join(dir, "fixtures")).filter((n) => n.endsWith(".pdf"));
  assert.equal(onDisk.length, 8, "Oregon ships eight fixture PDFs; four are complete packets and four are their motion components");
  assert.equal(names.length, 4, "and the queue enrols the four complete packets");
});

/*
 * THE COST LEDGER.
 *
 * Every family that held a RASTER_PASS before this reader learned to read a
 * declaration. A reader change must cost none of them, and the two ways a reader
 * change silently does cost them are both caught here: a set that is REORDERED and
 * a set that is NARROWED both move documentsDigest while the pinned bytes stand
 * still, and a family that falls out of the matrix loses the receipt outright.
 *
 * A family whose canonical or boundary bytes have MOVED is exempt from the digest
 * comparison, because a rebuilt packet is different bytes and its old receipt
 * correctly stops describing the row. That is the packet changing, which this test
 * has nothing to say about; it is only the reader that is on trial here.
 */
test("no family loses a RASTER_PASS it had already earned", () => {
  const lost = [];
  for (const b of baseline.rows) {
    const row = rowOf(b.familyId);
    if (!row) { lost.push(`${b.familyId}: dropped out of the live raster matrix entirely`); continue; }
    if (row.currentRasterState !== "RASTER_PASS") {
      lost.push(`${b.familyId}: RASTER_PASS -> ${row.currentRasterState}`);
    }
  }
  assert.deepEqual(lost, [],
    `a reader change must cost no standing receipt; ${lost.length} of ${baseline.count} were lost`);
});

test("no family's document set is restated while its bytes stand still", () => {
  const restated = [];
  for (const b of baseline.rows) {
    const row = rowOf(b.familyId);
    if (!row) continue;
    const bytesMoved = row.canonicalPdfSha256 !== b.canonicalPdfSha256
      || row.boundaryPdfSha256 !== b.boundaryPdfSha256;
    if (bytesMoved) continue;
    if (row.documentsDigest !== b.documentsDigest) {
      restated.push(`${b.familyId}: ${b.documentCount} document(s) -> ${(row.documents ?? []).length}, digest ${b.documentsDigest.slice(0, 12)} -> ${String(row.documentsDigest).slice(0, 12)}`);
    }
  }
  assert.deepEqual(restated, [],
    "documentsDigest hashes the documents IN ORDER, so a reordered set and a narrowed set both read as a different set and invalidate every receipt over it");
});

test("dc_seal_conviction-set still measures both variants it delivers", () => {
  // The named narrowing case. Its report declares the misdemeanor and the felony
  // variant; if it ever declares only one, both are still on disk, both are still
  // delivered, and both must still be measured. Silence in a declaration is a gap
  // in the declaration.
  const row = rowOf("dc_seal_conviction-set");
  assert.ok(row, "dc_seal_conviction-set is not in the matrix");
  const names = (row.documents ?? []).map((d) => d.name).sort();
  const dir = dirOf("dc_seal_conviction-set");
  const onDisk = fs.readdirSync(path.join(dir, "fixtures")).filter((n) => n.endsWith(".pdf")).sort();
  assert.deepEqual(names, onDisk,
    "every delivered DC fixture is measured; a declaration that omits one does not stop the gate looking at it");
});

test("wa_vac_felony-set is enrolled for its assembled packet, not for its components", () => {
  // The inverse case, and the one that says why a declaration is not consulted
  // where an assembled packet exists: Washington declares its four per-form filled
  // COMPONENTS under the bare fixture labels "canonical" and "boundary" and keeps
  // the assembled canonical.pdf under a different key. Reading that declaration as
  // the enrolment set replaces a whole packet with two of its parts.
  const row = rowOf("wa_vac_felony-set");
  assert.ok(row, "wa_vac_felony-set is not in the matrix");
  assert.deepEqual((row.documents ?? []).map((d) => d.name), ["canonical.pdf", "boundary.pdf"],
    "the assembled packet is named exactly by the listing and needs no declaration to identify it");
});

test("the baseline is the pre-change measurement, not a restatement of the current queue", () => {
  assert.equal(baseline.schemaVersion, "rcap-raster-enrolment-baseline/v1");
  assert.ok(baseline.count >= 219, "the ledger must not shrink; a family removed from it is a receipt stopped being counted");
  assert.equal(baseline.rows.length, baseline.count);
  assert.ok(baseline.rows.every((r) => r.documentsDigest && r.canonicalPdfSha256 && r.boundaryPdfSha256),
    "every baseline row pins the bytes and the set it was measured over");
});
