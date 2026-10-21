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
//   rcap-or-official-pdf-fill 4 court packets, 7 pages each, plus 4 separately
//                             delivered OSP handoffs, 2 pages each: 8 outputs,
//                             36 pages
//   pa_pardon_expungement-set 2 complete packets,  5 pages each, 10 pages
//
// Oregon is the reason a declaration is read for what it EXCLUDES as well as what
// it names, and for what it delivers SEPARATELY. It declares a `motionFile`
// beside each `file`, and the motion-and-declaration PDF is one component of the
// seven-page court packet, not the packet: enrolling it would call a component a
// complete packet. Since 75ab7a622 ("repair Oregon court packets and separate
// OSP handoffs") it also declares, beside each court packet, an `agencyHandoff`
// with deliveryRole "separate_agency_handoff": the Oregon State Police
// criminal-history request, which the governed configuration sends to OSP
// outside the court packet (OR-disposition-configurations.v1.json,
// OR-OSP-SET-ASIDE-CCH). That handoff is a complete output of its own delivery
// role -- the participant receives it and sends it -- so it is enrolled and
// measured, but never counted as a court packet. Pennsylvania is the reason the
// count is two and not six: its four --PA-RCRIM-P-790-* PDFs are retained
// per-component byte proof, and its own report pushes only canonical.pdf and
// boundary.pdf into `artifacts`.
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
const declaredOutputs = (dir, role) => declaredOutputsOf(readDeclaration(dir), role);
const readDeclaration = (dir) => {
  const report = path.join(dir, "reports", "rendered-artifacts.json");
  return fs.existsSync(report) ? readJson(report) : null;
};
/*
 * Three sets, all from the declaration and none from a filename:
 *   complete   the files the builder calls a complete output of this role (the
 *              court packet, or the assembled packet where there is one);
 *   handoffs   the files it declares beside a complete output as a separately
 *              delivered agency handoff -- a complete output of a different
 *              delivery role, carrying the same fixture role;
 *   everyPdfNamed  every PDF the declaration mentions anywhere.
 * A file in everyPdfNamed and in neither of the first two is a component the
 * builder classified as something other than a deliverable -- Oregon's motionFile.
 */
const declaredOutputsOf = (doc, role) => {
  if (!doc) return null;
  const complete = [];
  const handoffs = [];
  const everyPdfNamed = new Set();
  const walk = (node) => {
    if (typeof node === "string") { if (node.toLowerCase().endsWith(".pdf")) everyPdfNamed.add(node); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") Object.values(node).forEach(walk);
  };
  walk(doc);
  const carriesRole = (label) => label === role || (typeof label === "string" && label.startsWith(`${role}--`));
  for (const key of ["artifacts", "pdfs", "packets"]) {
    for (const row of Array.isArray(doc[key]) ? doc[key] : []) {
      if (typeof row?.file !== "string") continue;
      if (!carriesRole(row.fixtureClass ?? row.fixture)) continue;
      if (!complete.includes(row.file)) complete.push(row.file);
      const handoff = row.agencyHandoff;
      if (handoff?.deliveryRole === "separate_agency_handoff" && typeof handoff.file === "string"
        && !handoffs.includes(handoff.file)) handoffs.push(handoff.file);
    }
  }
  return { complete, handoffs, everyPdfNamed };
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
  { familyId: "rcap-or-official-pdf-fill", documents: 4, pagesEach: 7, handoffs: 4, handoffPagesEach: 2, pages: 36,
    note: "two routes, canonical and boundary each; the motionFile beside each is a component of the seven-page court packet, not the packet, and the agencyHandoff beside each is the OSP criminal-history request, delivered separately" },
];

for (const fam of FOUR) {
  const outputs = fam.documents + (fam.handoffs ?? 0);
  test(`${fam.familyId} is enrolled for its declared complete outputs (${outputs} documents, ${fam.pages} pages)`, () => {
    const row = rowOf(fam.familyId);
    assert.ok(row, `${fam.familyId} is not in the raster matrix at all — it declares ${outputs} complete outputs and the queue enrols none of them`);
    const dir = dirOf(fam.familyId);
    assert.ok(dir && fs.existsSync(dir), `no overlay directory for ${fam.familyId}`);
    const relative = (file) => path.relative(path.join(dir, "fixtures"), path.resolve(ROOT, file));
    const packetNames = [];
    const handoffNames = [];

    for (const role of ["canonical", "boundary"]) {
      const declared = declaredOutputs(dir, role);
      assert.ok(declared?.complete.length, `${fam.familyId} declares no ${role} complete output`);
      const expectedPackets = declared.complete.map(relative).sort();
      const expectedHandoffs = declared.handoffs.map(relative).sort();
      assert.equal(expectedHandoffs.length, fam.handoffs ? fam.handoffs / 2 : 0,
        `${fam.familyId} ${role}: the declaration names ${expectedHandoffs.length} separate agency handoff(s); the test expects ${fam.handoffs ? fam.handoffs / 2 : 0}`);
      const enrolled = (row.documents ?? []).filter((d) => d.role === role).map((d) => d.name).sort();
      assert.deepEqual(enrolled, [...expectedPackets, ...expectedHandoffs].sort(),
        `${fam.familyId} ${role}: the queue must enrol exactly what the family declares as a complete ${role} output, court packet and separately delivered handoff alike, and nothing it classifies as a component — ${fam.note}`);
      packetNames.push(...expectedPackets);
      handoffNames.push(...expectedHandoffs);
    }

    assert.equal(packetNames.length, fam.documents, `${fam.familyId} court packet count`);
    assert.equal(handoffNames.length, fam.handoffs ?? 0, `${fam.familyId} separate agency handoff count`);
    assert.equal((row.documents ?? []).length, outputs, `${fam.familyId} enrolled document count`);
    for (const d of row.documents ?? []) {
      const isHandoff = handoffNames.includes(d.name);
      assert.equal(d.pageCount, isHandoff ? fam.handoffPagesEach : fam.pagesEach,
        `${fam.familyId} ${d.name} page count (${isHandoff ? "separate agency handoff" : "court packet"})`);
    }
    assert.equal((row.documents ?? []).reduce((s, d) => s + (d.pageCount ?? 0), 0), fam.pages,
      `${fam.familyId} total enrolled pages`);
    assert.equal(row.coverage?.complete, true, `${fam.familyId} coverage must be complete over the declared set`);
    assert.deepEqual(row.coverage?.notRastered ?? [], [],
      `${fam.familyId}: a component the declaration classifies as something other than the packet must not be reported as a canonical document the gate skipped`);
  });
}

test("no declared complete output is left out and no component is enrolled as one", () => {
  // Oregon states this as a difference: twelve PDFs carry a role in the fixtures
  // directory; four are court packets, four are the OSP handoffs delivered
  // beside them, and four are motion components of the court packets. If the
  // gate ever enrols a component motion PDF it binds a receipt to five pages of
  // a seven-page packet, which reads as a verdict on the packet and is not one.
  // If it ever drops a handoff it stops measuring a document the participant
  // receives. If it ever counts a handoff as a court packet it restates what the
  // governed configuration says is sent to a different recipient.
  const or = rowOf("rcap-or-official-pdf-fill");
  assert.ok(or, "rcap-or-official-pdf-fill is not in the matrix");
  const names = (or.documents ?? []).map((d) => d.name);
  assert.equal(names.filter((n) => n.includes("motion-and-declaration")).length, 0,
    "the motion-and-declaration PDF is a component of the Oregon packet and must never be queued as the packet");
  const dir = dirOf("rcap-or-official-pdf-fill");
  const doc = readDeclaration(dir);
  assert.deepEqual(doc.deliveryTopology?.separateAgencyHandoff, "criminal_history_request",
    "the declaration names the criminal-history request as the separately delivered agency handoff");
  assert.deepEqual(doc.deliveryTopology?.courtPacket, ["motion_and_declaration", "filing_instructions"],
    "the declaration keeps the court packet to the motion and the filing instructions");
  const onDisk = fs.readdirSync(path.join(dir, "fixtures")).filter((n) => n.endsWith(".pdf"));
  assert.equal(onDisk.length, 12, "Oregon ships twelve fixture PDFs; four court packets, four OSP handoffs and four motion components");
  const relative = (file) => path.relative(path.join(dir, "fixtures"), path.resolve(ROOT, file));
  const packets = ["canonical", "boundary"].flatMap((role) => declaredOutputs(dir, role).complete.map(relative));
  const handoffs = ["canonical", "boundary"].flatMap((role) => declaredOutputs(dir, role).handoffs.map(relative));
  assert.equal(packets.length, 4, "four court packets are declared");
  assert.equal(handoffs.length, 4, "four separate agency handoffs are declared");
  assert.deepEqual([...names].sort(), [...packets, ...handoffs].sort(),
    "the queue enrols the four court packets and the four handoffs, and nothing else");
  for (const name of handoffs) {
    const enrolled = (or.documents ?? []).find((d) => d.name === name);
    assert.ok(enrolled, `${name}: the handoff is enrolled`);
    assert.ok(name.includes("criminal-history-request"), `${name}: the handoff is the OSP criminal-history request`);
    assert.equal(enrolled.pageCount, 2, `${name}: the handoff is the two-page OSP request, not a court packet`);
  }
  for (const name of packets) {
    const enrolled = (or.documents ?? []).find((d) => d.name === name);
    assert.ok(enrolled, `${name}: the court packet is enrolled`);
    assert.equal(enrolled.pageCount, 7, `${name}: the court packet is seven pages, the OSP request having left it`);
  }
  assert.deepEqual(or.coverage?.notRastered ?? [], [], "no declared output is left unmeasured");
  assert.deepEqual([...(or.coverage?.notRenderedByThisGate ?? [])].sort(),
    onDisk.filter((n) => n.includes("motion-and-declaration")).sort(),
    "exactly the four motion components are outside the gate, and nothing else is");
});

/*
 * REGRESSION COVERAGE FOR THE READER ITSELF, on synthetic declarations, so that
 * the three ways Oregon can be misread each fail on their own:
 *   positive  a court packet with an agencyHandoff beside it yields one complete
 *             output and one handoff, and the motionFile is a component;
 *   negative  a handoff whose deliveryRole is anything but
 *             separate_agency_handoff is not a handoff;
 *   negative  an enrolment that lists a component, or omits a handoff, or counts
 *             a handoff among the court packets, disagrees with the declaration.
 */
const syntheticOregon = () => ({
  deliveryTopology: { courtPacket: ["motion_and_declaration", "filing_instructions"], separateAgencyHandoff: "criminal_history_request" },
  artifacts: [{
    fixture: "canonical--arrest-no-charges", file: "fixtures/canonical--arrest-no-charges.pdf",
    motionFile: "fixtures/canonical--arrest-no-charges--motion-and-declaration.pdf",
    agencyHandoff: { component: "criminal_history_request", deliveryRole: "separate_agency_handoff",
      file: "fixtures/canonical--arrest-no-charges--criminal-history-request.pdf", pageCount: 2 }
  }]
});

test("reader: a declared agency handoff is a separate complete output, and the motion file is a component", () => {
  const read = declaredOutputsOf(syntheticOregon(), "canonical");
  assert.deepEqual(read.complete, ["fixtures/canonical--arrest-no-charges.pdf"]);
  assert.deepEqual(read.handoffs, ["fixtures/canonical--arrest-no-charges--criminal-history-request.pdf"]);
  assert.ok(read.everyPdfNamed.has("fixtures/canonical--arrest-no-charges--motion-and-declaration.pdf"));
  assert.ok(!read.complete.includes("fixtures/canonical--arrest-no-charges--motion-and-declaration.pdf")
    && !read.handoffs.includes("fixtures/canonical--arrest-no-charges--motion-and-declaration.pdf"),
    "the motion file is named and classified as neither packet nor handoff");
  assert.deepEqual(declaredOutputsOf(syntheticOregon(), "boundary"), { complete: [], handoffs: [], everyPdfNamed: read.everyPdfNamed },
    "a role the declaration does not carry yields no outputs");
});

test("reader: a nested file that is not declared a separate agency handoff is not one", () => {
  for (const deliveryRole of [undefined, null, "court_packet_component", "separate_agency_component"]) {
    const doc = syntheticOregon();
    doc.artifacts[0].agencyHandoff.deliveryRole = deliveryRole;
    const read = declaredOutputsOf(doc, "canonical");
    assert.deepEqual(read.handoffs, [], `deliveryRole ${String(deliveryRole)} is not a separate agency handoff`);
    assert.deepEqual(read.complete, ["fixtures/canonical--arrest-no-charges.pdf"]);
  }
  const bare = syntheticOregon();
  delete bare.artifacts[0].agencyHandoff;
  assert.deepEqual(declaredOutputsOf(bare, "canonical").handoffs, [], "no agencyHandoff, no handoff");
});

test("reader: an enrolment is judged against the declaration, not against the fixtures listing", () => {
  const read = declaredOutputsOf(syntheticOregon(), "canonical");
  const declared = [...read.complete, ...read.handoffs].sort();
  const judge = (enrolled) => { try { assert.deepEqual([...enrolled].sort(), declared); return true; } catch { return false; } };
  assert.equal(judge(["fixtures/canonical--arrest-no-charges.pdf", "fixtures/canonical--arrest-no-charges--criminal-history-request.pdf"]), true,
    "packet plus handoff is exactly the declared set");
  assert.equal(judge(["fixtures/canonical--arrest-no-charges.pdf"]), false,
    "dropping the handoff drops a document the participant receives");
  assert.equal(judge(["fixtures/canonical--arrest-no-charges.pdf", "fixtures/canonical--arrest-no-charges--criminal-history-request.pdf",
    "fixtures/canonical--arrest-no-charges--motion-and-declaration.pdf"]), false,
    "enrolling the motion component calls a component a complete output");
  assert.equal(read.complete.includes("fixtures/canonical--arrest-no-charges--criminal-history-request.pdf"), false,
    "the handoff is never counted among the court packets");
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
