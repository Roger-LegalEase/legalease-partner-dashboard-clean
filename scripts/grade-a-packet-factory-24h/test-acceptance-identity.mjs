#!/usr/bin/env node
/**
 * The byte binding, exercised on a corpus this test builds and owns.
 *
 * Nothing here reads or writes a real family. The five cases the gate has to
 * discriminate are constructed from scratch in a temporary directory, so the
 * test proves the RULE rather than the state of the queue on any given day --
 * and so that proving "a changed canonical is rejected" never requires changing
 * a canonical any participant receives.
 *
 * The integration half lives in verify-lane-contracts --mutations, which
 * reconstructs the same five states on the real queue and asserts L4 refuses.
 *
 *   node scripts/grade-a-packet-factory-24h/test-acceptance-identity.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  IDENTITY, ACCEPTANCE, identityOf, evaluateAcceptance,
  acceptedRasterFor, candidateRowsByFamily, inventoryIsInspectable
} from "./acceptance-identity.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "acceptance-identity-"));
const CUSTODY = "data/rcap-all50/overlays/census-v1";
const FAM = `${CUSTODY}/zz/zz-test-family--official-pdf-fill/fixtures`;
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

const write = (rel, body) => {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
  return sha(Buffer.from(body));
};

const canonicalSha = write(`${FAM}/canonical.pdf`, "%PDF canonical bytes\n");
const boundarySha = write(`${FAM}/boundary.pdf`, "%PDF boundary bytes\n");
const companionSha = write(`${FAM}/companion.pdf`, "%PDF companion bytes\n");

/* A row in the shape the raster queue writes, with everything valid. */
const goodRow = () => JSON.parse(JSON.stringify({
  familyId: "zz-test-family",
  canonicalPdfPath: `${FAM}/canonical.pdf`,
  canonicalPdfSha256: canonicalSha,
  boundaryPdfPath: `${FAM}/boundary.pdf`,
  boundaryPdfSha256: boundarySha,
  documents: [
    { role: "canonical", name: "canonical.pdf", path: `${FAM}/canonical.pdf`, sha256: canonicalSha },
    { role: "canonical", name: "companion.pdf", path: `${FAM}/companion.pdf`, sha256: companionSha },
    { role: "boundary", name: "boundary.pdf", path: `${FAM}/boundary.pdf`, sha256: boundarySha }
  ],
  coverage: { documents: ["canonical.pdf", "companion.pdf"], rastered: ["canonical.pdf", "companion.pdf"], notRastered: [], complete: true },
  currentRasterState: "RASTER_PASS",
  rasterReceipt: {
    verdict: "RASTER_PASS",
    workflowRunId: "33923497915",
    workflow: ".github/workflows/rcap-packet-raster-acceptance-batch.yml",
    jobConclusion: "success",
    boundToCanonicalSha256: canonicalSha,
    boundToBoundarySha256: boundarySha,
    documentsCovered: ["canonical.pdf", "companion.pdf"],
    documentsNotCovered: [],
    coversTheWholeFamily: true
  }
}));

const ev = (row, opts) => evaluateAcceptance(root, row, opts);
const results = [];
const it = (name, fn) => { fn(); results.push(name); };

/* ---- 1. unchanged valid artifacts pass ---------------------------------- */
it("unchanged valid artifacts pass", () => {
  const r = ev(goodRow());
  assert.equal(r.status, ACCEPTANCE.PROVEN_ON_CURRENT_BYTES);
  assert.equal(r.proven, true);
  assert.equal(r.conclusive, true);
  /* every required document was actually opened, not assumed: canonical,
   * boundary and the covered companion, each once. */
  assert.equal(r.documents.length, 3);
  assert.deepEqual(r.documents.map((d) => d.name).sort(), ["boundary.pdf", "canonical.pdf", "companion.pdf"]);
  assert.ok(r.documents.every((d) => d.identity === IDENTITY.MATCH));
  assert.ok(r.documents.some((d) => d.name === "companion.pdf"),
    "a covered companion document is part of what the receipt is answerable for");
});

/* ---- 2. a changed canonical is rejected --------------------------------- */
it("a changed canonical is rejected", () => {
  const row = goodRow();
  fs.writeFileSync(path.join(root, `${FAM}/canonical.pdf`), "%PDF canonical bytes, rebuilt\n");
  const r = ev(row);
  assert.equal(r.status, ACCEPTANCE.ARTIFACT_IDENTITY_MISMATCH);
  assert.equal(r.proven, false);
  assert.equal(r.conclusive, true, "a file that is present and wrong is a CONFIRMED failure");
  assert.match(r.reasons.join(" "), /canonical\.pdf was accepted as/);
  fs.writeFileSync(path.join(root, `${FAM}/canonical.pdf`), "%PDF canonical bytes\n");
  assert.equal(ev(goodRow()).proven, true, "and the corpus is back to proving");
});

/* ---- 3. a changed boundary is rejected ---------------------------------- */
it("a changed boundary is rejected", () => {
  fs.writeFileSync(path.join(root, `${FAM}/boundary.pdf`), "%PDF boundary bytes, rebuilt\n");
  const r = ev(goodRow());
  assert.equal(r.status, ACCEPTANCE.ARTIFACT_IDENTITY_MISMATCH);
  assert.equal(r.conclusive, true);
  assert.match(r.reasons.join(" "), /boundary\.pdf was accepted as/);
  fs.writeFileSync(path.join(root, `${FAM}/boundary.pdf`), "%PDF boundary bytes\n");
});

/* ---- 4. a missing required document is not counted verified ------------- */
it("a missing required document is not counted as verified, and is not called corruption", () => {
  const row = goodRow();
  row.documents.find((d) => d.name === "companion.pdf").path = `${FAM}/companion-that-is-not-here.pdf`;
  const r = ev(row);
  assert.equal(r.proven, false, "an unverifiable document may never be counted verified");
  assert.equal(r.status, ACCEPTANCE.IDENTITY_UNVERIFIABLE_HERE);
  assert.equal(r.conclusive, false, "absence is not proof the bytes are wrong");
  assert.equal(r.documents.find((d) => d.name === "companion.pdf").identity, IDENTITY.ABSENT);
  assert.match(r.reasons.join(" "), /not present here/);
});

it("an unmounted custody is distinguished from a file missing out of a mounted one", () => {
  const unmounted = "private/Nationwide Record Clearing/forms/zz/official.pdf";
  const off = identityOf(root, unmounted, canonicalSha);
  assert.equal(off.identity, IDENTITY.CUSTODY_NOT_MOUNTED);
  assert.equal(off.custodyRoot, "private/Nationwide Record Clearing");
  /* the same shape of path, once the custody IS mounted, reads as ABSENT */
  fs.mkdirSync(path.join(root, "private/Nationwide Record Clearing"), { recursive: true });
  const on = identityOf(root, unmounted, canonicalSha);
  assert.equal(on.identity, IDENTITY.ABSENT);
  fs.rmSync(path.join(root, "private/Nationwide Record Clearing"), { recursive: true });

  const row = goodRow();
  row.canonicalPdfPath = unmounted;
  row.documents = [{ role: "canonical", name: "official.pdf", path: unmounted, sha256: canonicalSha }];
  row.coverage = { documents: ["official.pdf"], rastered: ["official.pdf"], notRastered: [], complete: true };
  row.rasterReceipt.documentsCovered = ["official.pdf"];
  delete row.rasterReceipt.boundToBoundarySha256;
  const r = ev(row);
  assert.equal(r.proven, false);
  assert.equal(r.conclusive, false);
  assert.match(r.reasons.join(" "), /custody private\/Nationwide Record Clearing is not mounted/);
});

/* ---- 5. a receipt covering a different document, or covering partially --- */
it("a receipt covering a document the row does not declare is rejected", () => {
  const row = goodRow();
  row.rasterReceipt.documentsCovered = ["a-document-from-another-family.pdf"];
  const r = ev(row);
  assert.equal(r.status, ACCEPTANCE.RECEIPT_COVERS_A_DIFFERENT_DOCUMENT);
  assert.equal(r.conclusive, true);
});

it("a receipt with incomplete coverage is rejected, from either side", () => {
  const fromReceiptFlag = goodRow();
  fromReceiptFlag.rasterReceipt.coversTheWholeFamily = false;
  assert.equal(ev(fromReceiptFlag).status, ACCEPTANCE.COVERAGE_INCOMPLETE);

  const fromReceiptList = goodRow();
  fromReceiptList.rasterReceipt.documentsCovered = ["canonical.pdf"];
  assert.equal(ev(fromReceiptList).status, ACCEPTANCE.COVERAGE_INCOMPLETE,
    "a receipt that covered one of two declared documents did not cover the family");

  const fromReceiptNotCovered = goodRow();
  fromReceiptNotCovered.rasterReceipt.documentsNotCovered = ["companion.pdf"];
  assert.equal(ev(fromReceiptNotCovered).status, ACCEPTANCE.COVERAGE_INCOMPLETE);

  const fromRow = goodRow();
  fromRow.coverage.complete = false;
  assert.equal(ev(fromRow).status, ACCEPTANCE.COVERAGE_INCOMPLETE);

  const rowLies = goodRow();
  rowLies.coverage.rastered = ["canonical.pdf"];
  assert.equal(ev(rowLies).status, ACCEPTANCE.COVERAGE_INCOMPLETE,
    "a row claiming completeness over an unrendered document is not complete");
});

/* ---- the receipt and the row must pin the same bytes -------------------- */
it("a row re-pinned to bytes its receipt was never bound to is rejected", () => {
  const row = goodRow();
  row.canonicalPdfSha256 = "1".repeat(64);
  const r = ev(row);
  assert.equal(r.status, ACCEPTANCE.RECEIPT_PINS_OTHER_BYTES_THAN_THE_ROW);
  assert.equal(r.conclusive, true);
});

/* ---- the legacy receipt shape, and why the two callers differ ------------ */
it("a receipt that never declared its coverage is refused for a binding and allowed for the lane contract", () => {
  const row = goodRow();
  delete row.rasterReceipt.coversTheWholeFamily;
  delete row.rasterReceipt.documentsCovered;
  delete row.rasterReceipt.documentsNotCovered;
  assert.equal(ev(row).status, ACCEPTANCE.PROVEN_ON_CURRENT_BYTES,
    "coverage falls back to the row, which is where L7 measures it");
  assert.equal(ev(row, { requireReceiptDeclaredCoverage: true }).status, ACCEPTANCE.RECEIPT_DECLARES_NO_COVERAGE,
    "a binding a route installs from will not take a receipt that never said what it covered");
  /* the fallback is not a waiver: the bytes are still re-hashed */
  const moved = goodRow();
  delete moved.rasterReceipt.coversTheWholeFamily;
  delete moved.rasterReceipt.documentsCovered;
  moved.rasterReceipt.boundToCanonicalSha256 = "2".repeat(64);
  moved.canonicalPdfSha256 = "2".repeat(64);
  moved.documents.find((d) => d.name === "canonical.pdf").sha256 = "2".repeat(64);
  assert.equal(ev(moved).status, ACCEPTANCE.ARTIFACT_IDENTITY_MISMATCH);
});

/* ---- no receipt at all --------------------------------------------------- */
it("a row asserting RASTER_PASS with no receipt proves nothing", () => {
  const row = goodRow();
  delete row.rasterReceipt;
  const r = ev(row);
  assert.equal(r.status, ACCEPTANCE.NO_ACCEPTED_RECEIPT);
});

/* ---- candidate selection ------------------------------------------------- */
it("a superseded row answers for a binding and not for a promotion gate", () => {
  const current = goodRow();
  current.currentRasterState = "RASTER_PENDING";
  delete current.rasterReceipt;
  const queue = { rows: [current], historicalRasterRows: [goodRow()] };

  const forBinding = candidateRowsByFamily(queue);
  assert.equal(acceptedRasterFor(root, forBinding.get("zz-test-family")).proven, true);

  const forGate = candidateRowsByFamily(queue, { includeSuperseded: false });
  assert.equal(acceptedRasterFor(root, forGate.get("zz-test-family")).proven, false);
});

it("the most informative refusal is the one reported", () => {
  const broken = goodRow();
  broken.rasterReceipt.boundToCanonicalSha256 = "3".repeat(64);
  broken.canonicalPdfSha256 = "3".repeat(64);
  broken.documents.find((d) => d.name === "canonical.pdf").sha256 = "3".repeat(64);
  const noReceipt = goodRow();
  delete noReceipt.rasterReceipt;
  const r = acceptedRasterFor(root, [broken, noReceipt]);
  assert.equal(r.status, ACCEPTANCE.ARTIFACT_IDENTITY_MISMATCH,
    "a demonstrably moved canonical outranks a row that simply carries nothing");
});

/* ---- coverage of the corpus is not the defect count ---------------------- */
it("an unreadable or unexpectedly empty inventory does not pass, and a clean one does", () => {
  assert.equal(inventoryIsInspectable(null).ok, false);
  assert.equal(inventoryIsInspectable({}).ok, false);
  assert.equal(inventoryIsInspectable({ rows: [] }).ok, false);
  assert.equal(inventoryIsInspectable({ rows: [goodRow()] }).ok, true,
    "a corpus that WAS inspected and held no defect must be able to pass");
  assert.equal(inventoryIsInspectable({ rows: [goodRow()] }, { minimumRows: 2 }).ok, false);
});

fs.rmSync(root, { recursive: true, force: true });
for (const r of results) console.log(`  ok   ${r}`);
console.log(`\nOK acceptance identity — ${results.length} case(s).`);
