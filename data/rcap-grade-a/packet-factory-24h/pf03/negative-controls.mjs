#!/usr/bin/env node
/**
 * PF03 negative controls.
 *
 *   node data/rcap-grade-a/packet-factory-24h/pf03/negative-controls.mjs
 *
 * A safeguard nobody has seen fail is a safeguard nobody has tested. Each
 * control below removes exactly one of this lane's protections and asserts the
 * defect it was standing in front of ACTUALLY APPEARS. A control that passes
 * without the repair proves nothing and is itself reported as a failure.
 *
 * Nothing here writes into a packet directory. Control 2 mutates a shared
 * central record in place for one call and restores it byte-for-byte, verifying
 * the restore by SHA-256 before it returns.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
process.chdir(ROOT);
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName } = require("pdf-lib");

const { finalizeOfficialForm } = await import(`${ROOT}/scripts/rcap-official-forms/rcap-official-form-finalize.mjs`);
const { PASS_COUNTERS, classifyBlank } = await import(`${ROOT}/scripts/rcap-packet-completeness/completeness-contract.mjs`);

const SOURCE = "private/source-imports/Nationwide_Recovery_Pool_2026-09-02/LegalEase massachusetts/fillable-jud-mps-Petition-to-Seal.pdf";
const ROUTE_CENSUS = "data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json";

const FACTS = {
  "participant.full_legal_name": "Jordan Avery Reyes",
  "participant.date_of_birth": "1991-04-17",
  "participant.street_address": "42 Maple Street, Apartment 3",
  "participant.city": "Dorchester",
  "participant.state": "MA",
  "participant.zip": "02124"
};

/* The four boxes the shared registry resolves to the participant's own name. */
const THIRD_PARTY_NAME_BOXES = ["AliasMaidenPrevious Name", "Fathers Name", "Mothers Maiden Name", "HusbandWifes Name"];

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const inflate = (buf) => { try { return zlib.inflateSync(buf); } catch { return buf; } };

async function censusFor(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getForm().getFields().map((f) => ({
    name: f.getName(),
    type: f.constructor.name.replace(/^PDF/, "").toLowerCase().replace("textfield", "text"),
    effectiveLabel: f.getName(),
    regionHeading: "Petitioner identity",
    widgets: f.acroField.getWidgets().map((w) => {
      const r = w.getRectangle();
      return { page: 1, rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
    }),
    multiline: false, maxLength: null
  }));
}

const results = [];
const record = (id, fired, detail) => {
  results.push({ control: id, defectReproduced: fired, ...detail });
  console.log(`${fired ? "FIRED  " : "DID NOT FIRE"}  ${id}`);
  if (detail.evidence) console.log(`          ${detail.evidence}`);
};

const sourceBytes = fs.readFileSync(path.join(ROOT, SOURCE));
const sourceSha = sha(sourceBytes);
const census = await censusFor(sourceBytes);

/* ------------------------------------------------------------------------ *
 * CONTROL 1 — remove the role gate on the four third-party name boxes.
 *
 * The repair: every field this build does not write is passed to the finalizer
 * as unwritable BY ROLE, which is the one gate the field-name channel cannot
 * reverse. Without it the shared registry's catch-all \bname\b pattern resolves
 * all four boxes to participant.full_legal_name.
 * ------------------------------------------------------------------------ */
{
  const writeFields = new Set(["Date of Birth", "Mailing address", "City", "State", "Zip"]);
  const { report } = await finalizeOfficialForm({
    sourceBytes, expectedSha256: sourceSha, census, facts: FACTS,
    explicitMappings: {},
    // PRE-REPAIR: the four third-party name boxes are NOT declared unwritable.
    unwritableFields: census
      .filter((c) => !writeFields.has(c.name) && !THIRD_PARTY_NAME_BOXES.includes(c.name))
      .map((c) => ({ field: c.name })),
    documentTextLines: [], title: "negative control"
  });
  const wrongly = report.written.filter((w) => THIRD_PARTY_NAME_BOXES.includes(w.field));
  record("role-gate-removed-writes-participants-own-name-into-third-party-boxes", wrongly.length > 0, {
    boxesWritten: wrongly.map((w) => ({ field: w.field, factId: w.factId })),
    evidence: wrongly.length > 0
      ? `${wrongly.length} of 4 third-party name boxes received ${JSON.stringify([...new Set(wrongly.map((w) => w.factId))])}`
      : "no third-party box was written even without the role gate",
    whatTheRepairIs: "every non-written field is passed in unwritableFields, so role refusal precedes the name channel"
  });
  assert.equal(wrongly.length, 4,
    "the role gate is meant to be load-bearing on exactly these four boxes; the control did not reproduce the defect on all of them");
}

/* ------------------------------------------------------------------------ *
 * CONTROL 2 — the route record stops naming Part A box 4.
 *
 * The repair: the decrim builder reads the route-obligation census at build
 * time and refuses to tick a box nothing declares. Without that dependency the
 * tick would be a constant in the builder and would survive the record changing
 * underneath it.
 * ------------------------------------------------------------------------ */
{
  const file = path.join(ROOT, ROUTE_CENSUS);
  const original = fs.readFileSync(file);
  const before = sha(original);
  let refused = false;
  let message = null;
  try {
    const doc = JSON.parse(original.toString("utf8"));
    const fam = doc.packetFamilies.find((f) => f.worklistGroupId === "ma-seal-decrim-set");
    const cell = fam.routes[0].deliverable.filingDestination;
    cell.entries = cell.entries.map((e) => e.replace(/using Part A box 4/i, "using the ordinary agency filing"));
    fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
    const mod = await import(`${ROOT}/scripts/build-census-v1-ma-seal-decrim-set.mjs?nc=${Date.now()}`);
    try {
      await mod.runFamily(["--check"]);
    } catch (e) { refused = true; message = e.message.split("\n")[0]; }
  } finally {
    fs.writeFileSync(file, original);
    const after = sha(fs.readFileSync(file));
    assert.equal(after, before, `the negative control did not restore ${ROUTE_CENSUS} byte-for-byte`);
  }
  record("route-record-stops-naming-part-a-box-4-so-the-build-refuses", refused, {
    evidence: refused ? `build refused: ${String(message).slice(0, 160)}` : "the build proceeded without the record naming box 4",
    whatTheRepairIs: "routeRecord() asserts the census still records Part A box 4 before any tick is made",
    sharedRecordRestoredByteForByte: true
  });
  assert.ok(refused, "the build must refuse when the controlling record stops declaring what the packet prints");
}

/* ------------------------------------------------------------------------ *
 * CONTROL 3 — the route election is not made.
 *
 * Two things are proved at once: that the two-channel selection reading can
 * tell an unticked box from a ticked one on this form, and that an unmade
 * election raises requiredOptionsMissing rather than passing silently.
 * ------------------------------------------------------------------------ */
{
  const unwritable = census.filter((c) => !["Date of Birth", "Mailing address", "City", "State", "Zip"].includes(c.name))
    .map((c) => ({ field: c.name }));
  const noTick = await finalizeOfficialForm({
    sourceBytes, expectedSha256: sourceSha, census, facts: FACTS, explicitMappings: {},
    unwritableFields: unwritable,
    // PRE-REPAIR: no selectionsFromHeldFacts, so Part A states no route at all.
    documentTextLines: [], title: "negative control"
  });
  /*
   * The ticked side must NOT declare Check Box4 unwritable-by-role: the
   * finalizer refuses a settled selection on a role-refused field, which is the
   * gate working. The builder excludes its route-tick rows from unwritableFields
   * for exactly this reason, and an earlier draft of this control did not —
   * producing a false "the reading cannot see a made election".
   */
  const withTick = await finalizeOfficialForm({
    sourceBytes, expectedSha256: sourceSha, census, facts: FACTS, explicitMappings: {},
    unwritableFields: unwritable.filter((u) => u.field !== "Check Box4"),
    selectionsFromHeldFacts: { "Check Box4": { checked: true, basis: "negative control" } },
    documentTextLines: [], title: "negative control"
  });

  const readBox4 = async (bytes) => {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const ctx = doc.context;
    const page = doc.getPages()[0];
    const res = ctx.lookup(page.node.get(PDFName.of("Resources")));
    const xo = ctx.lookup(res.get(PDFName.of("XObject")));
    let marked = false;
    for (const k of xo.keys()) {
      const o = ctx.lookup(xo.get(k));
      if (!o?.contents) continue;
      const body = inflate(Buffer.from(o.contents)).toString("latin1");
      if (body.includes("ZaDb") && body.includes("(4) Tj")) marked = true;
    }
    return marked;
  };

  const untickedReadsMarked = await readBox4(noTick.bytes);
  const tickedReadsMarked = await readBox4(withTick.bytes);

  /* And the counter the contract raises for an election declared and unmade. */
  const verdict = classifyBlank(
    { label: "Part A box 4 — Section 100A, Chapter 276: a recorded offense which is no longer a crime (selection)", isSelectionControl: true },
    "declared route-determined and left unmade", null,
    { disposition: null, routeDetermined: true }
  );
  const raises = verdict.disposition === "ROUTE_OPTION_NOT_SELECTED";

  record("unmade-route-election-is-readable-as-unmade-and-raises-requiredOptionsMissing",
    untickedReadsMarked === false && tickedReadsMarked === true && raises, {
      evidence:
        `box 4 reads marked=${untickedReadsMarked} without the election and marked=${tickedReadsMarked} with it; `
        + `an election declared route-determined and left unmade classifies ${verdict.disposition}`,
      whatTheRepairIs: "the tick is made from the controlling record and read back from the output bytes on two channels"
    });
  assert.equal(untickedReadsMarked, false, "the reading cannot distinguish an unmade election");
  assert.equal(tickedReadsMarked, true, "the reading cannot see a made election");
  assert.ok(raises, "an unmade route-determined election must raise requiredOptionsMissing");
}

/* ------------------------------------------------------------------------ *
 * CONTROL 4 — a value that will not fit is never shortened.
 *
 * The repair: a value the form's geometry cannot hold is REFUSED and named to
 * the participant. The defect it stands in front of is a silently truncated
 * value, which reads on the paper as a complete one.
 * ------------------------------------------------------------------------ */
{
  const longCity = "Unincorporated Township of Long Hollow Crossing";
  const { report } = await finalizeOfficialForm({
    sourceBytes, expectedSha256: sourceSha, census,
    facts: { ...FACTS, "participant.city": longCity },
    explicitMappings: {},
    unwritableFields: census.filter((c) => c.name !== "City").map((c) => ({ field: c.name })),
    documentTextLines: [], title: "negative control"
  });
  const wrote = report.written.find((w) => w.field === "City");
  const refusedForWidth = (report.unfittable ?? []).some((u) => u.field === "City");
  const anyTruncatedValue = (report.expectedValues ?? []).some((v) => String(v).length < longCity.length && longCity.startsWith(String(v).slice(0, 8)));
  record("oversized-value-is-refused-rather-than-shortened", refusedForWidth && !wrote && !anyTruncatedValue, {
    evidence: refusedForWidth
      ? `a ${longCity.length}-character city was refused for width and no shortened form of it was written`
      : "the oversized value was not refused",
    whatTheRepairIs: "the refusal is recorded with its measurement and the blank is named to the participant"
  });
  assert.ok(refusedForWidth && !wrote, "an unfittable value must be refused, never shortened");
}

/* ------------------------------------------------------------------------ *
 * CONTROL 5 — the route record stops recording the felony/misdemeanour
 * characterisation as a later-completion field for ma-seal-admin-set.
 *
 * The repair: ma-seal-admin-set leaves the Part A election to the participant
 * and declares it determined by the CASE rather than by the route. That
 * declaration is only honest because the controlling record itself treats the
 * characterisation as completed later. Without that record the family would be
 * shipping an unmade statutory election on nothing, so the build must refuse.
 * ------------------------------------------------------------------------ */
{
  const file = path.join(ROOT, ROUTE_CENSUS);
  const original = fs.readFileSync(file);
  const before = sha(original);
  let refused = false;
  let message = null;
  try {
    const doc = JSON.parse(original.toString("utf8"));
    const fam = doc.packetFamilies.find((f) => f.worklistGroupId === "ma-seal-admin-set");
    for (const r of fam.routes) {
      const cell = r.deliverable.laterCompletionFields;
      cell.entries = cell.entries.filter((e) => !/felony or misdemeanour characterisation/i.test(e));
    }
    fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
    const mod = await import(`${ROOT}/scripts/build-census-v1-ma-seal-admin-set.mjs?nc=${Date.now()}`);
    try {
      await mod.runFamily(["--check"]);
    } catch (e) { refused = true; message = e.message.split("\n")[0]; }
  } finally {
    fs.writeFileSync(file, original);
    const after = sha(fs.readFileSync(file));
    assert.equal(after, before, `the negative control did not restore ${ROUTE_CENSUS} byte-for-byte`);
  }
  record("route-record-stops-recording-the-characterisation-so-the-admin-build-refuses", refused, {
    evidence: refused ? `build refused: ${String(message).slice(0, 170)}` : "the build proceeded without the record that justifies leaving Part A to the participant",
    whatTheRepairIs:
      "routeRecord() asserts the census still records the felony/misdemeanour characterisation as a later-completion "
      + "field before the family may leave the Part A election unmade",
    sharedRecordRestoredByteForByte: true
  });
  assert.ok(refused, "the build must refuse when the record justifying an unmade election disappears");
}

const out = {
  schemaVersion: "rcap-pf03-negative-controls/v1",
  lane: "PF03",
  whatThisIs:
    "Each control removes one of this lane's protections and asserts the defect it stands in front of actually "
    + "appears. Every control here FIRED on the pre-repair configuration.",
  whatThisIsNot: "A verdict on any packet. This lane builds and does not verify its own bytes.",
  source: { path: SOURCE, sha256: sourceSha },
  passCounters: PASS_COUNTERS,
  allControlsReproducedTheirDefect: results.every((r) => r.defectReproduced),
  controls: results
};
fs.writeFileSync(
  path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/pf03/negative-controls-pf03-20260909.json"),
  `${JSON.stringify(out, null, 2)}\n`
);
console.log(`\n${results.length} control(s); every one reproduced its defect: ${out.allControlsReproducedTheirDefect}`);
