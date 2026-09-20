#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";
import { extractTextItems } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { FAMILY_ID, SOURCE_PATH, SOURCE_SHA, OUT, EVIDENCE, OPERATIVE, SERVICE_RECORD } from "./build-census-v1-az_set_aside-set.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
let assertions = 0;
const eq = (a, b, why) => { assertions++; assert.deepEqual(a, b, why); };
const ok = (v, why) => { assertions++; assert.ok(v, why); };

const source = fs.readFileSync(path.join(ROOT, SOURCE_PATH));
eq(hash(source), SOURCE_SHA, "authoritative attachment hash");
const receipt = read(`${OUT}/source-receipt.json`);
eq(receipt.allSourcesExact, true, "all sources exact");
eq(receipt.procedureResolutionRecord, SERVICE_RECORD, "Rule 29.2(c) record bound");
eq(receipt.documents.slice(0, 2).map((d) => d.sourcePageRange), [[3,4,5,6],[7,8,9]], "source page ranges");
ok(receipt.supersededAndNotUsed.some((x) => /Yuma/.test(x)), "Yuma source rejected");

const transformation = read(`${EVIDENCE}/amendment-transformation-proof.json`);
eq(transformation.source.sha256, SOURCE_SHA, "transformation source hash");
eq(transformation.transformations.length, 6, "six bounded adopted edits");
eq(transformation.courtDecisionFieldsWritten, 0, "no court decision write");
eq(transformation.transformations[2].deleteEntirely, true, "struck grant-firearm option removed");
eq(transformation.transformations[3].operativeText, OPERATIVE.firearmDenial, "operative serious-offense denial exact");
eq(transformation.transformations[4].operativeText, OPERATIVE.firearmNotice, "operative firearm warning exact");

const fieldMap = read(`${OUT}/production-field-map.json`);
eq(fieldMap.familyId, FAMILY_ID, "field-map family");
eq(fieldMap.renderStrategy, "source_page_copy_with_bounded_operational_amendment_patches", "declared rendering strategy");
const orderRefusals = fieldMap.refusals.filter((r) => r.document === "R-26-0001-Form-31(b)");
eq(orderRefusals.length, 14, "all order decisions protected");
ok(orderRefusals.every((r) => r.refusalClass === "court_prosecutor_clerk_or_agency_owned"), "every order decision is court-owned");
eq(fieldMap.writes.filter((w) => w.document === "R-26-0001-Form-31(b)").map((w) => w.field), ["31b.court","31b.county","31b.case","31b.defendant","31b.dob"], "order writes limited to caption");

const instructions = fs.readFileSync(path.join(ROOT, OUT, "participant-instructions.md"), "utf8");
ok(instructions.includes("the court sends a copy of the filed application"), "court transmittal disclosed");
ok(instructions.includes("Do not claim that notice has already occurred"), "no fabricated notice");
ok(!instructions.includes("deliver a copy of the application to the prosecutor"), "stale participant service removed");
ok(instructions.includes("The packet makes no firearm-right eligibility determination"), "firearm determination refused");

const rendered = read(`${OUT}/reports/rendered-artifacts.json`);
eq(rendered.packets.map((p) => p.pageCount), [7,8], "canonical/boundary page counts");
eq(rendered.packets[0].documents, ["R-26-0001-Form-31(a)","R-26-0001-Form-31(b)"], "canonical component order");
eq(rendered.packets[1].documents, ["R-26-0001-Form-31(a)","R-26-0001-Form-31(a)-CONT","R-26-0001-Form-31(b)"], "boundary component order");
const rasterManifest = read(`${EVIDENCE}/raster-manifest.json`);
const rasterDocuments = rasterManifest.rows[0].documents;
eq(rasterManifest.rows[0].documentsDigest, hash(Buffer.from(JSON.stringify(rasterDocuments.map((d) => [d.role, d.path, d.sha256])))), "native ordered document-set digest");

const actual = read(`${OUT}/reports/actual-writes.json`);
eq(actual.derivedFromArtifactBytes, true, "byte-derived proof");
const proofRows = actual.documents.flatMap((d) => d.actualWrites);
ok(proofRows.length > 40, "both fixtures carry positioned write proof");
ok(proofRows.every((w) => w.savedBytePositionMatches?.length > 0 && w.savedBytePositionMatches.every((m) => m.metricsExact === true)), "every write has exact positioned glyph proof");
ok(proofRows.every((w) => !Object.hasOwn(w, "savedByteTextMatch")), "no boolean stand-in for byte proof");
ok(actual.artifacts.every((a) => a.refusedFieldsWithInk.length === 0), "no protected-field ink reported");

for (const fixture of ["canonical", "boundary"]) {
  const bytes = fs.readFileSync(path.join(ROOT, OUT, `fixtures/${fixture}.pdf`));
  const pdf = await PDFDocument.load(bytes);
  eq(pdf.getPageCount(), fixture === "canonical" ? 7 : 8, `${fixture} parsed pages`);
  eq(hash(bytes), rendered.packets.find((p) => p.fixture === fixture).sha256, `${fixture} rendered hash`);
  const page1 = extractTextItems(pdf.getPage(0));
  ok(page1.some((i) => i.text === (fixture === "canonical" ? "18" : "30") && Math.abs(i.x - 158) < .02 && Math.abs(i.y - 304) < .02), `${fixture} judgment day has its own source slot`);
  ok(page1.some((i) => i.text === (fixture === "canonical" ? "October" : "September") && Math.abs(i.x - 253) < .02 && Math.abs(i.y - 304) < .02), `${fixture} judgment month has its own source slot`);
  ok(page1.some((i) => i.text === (fixture === "canonical" ? "2024" : "2021") && Math.abs(i.x - 402) < .02 && Math.abs(i.y - 304) < .02), `${fixture} judgment year has its own source slot`);
}

/*
 * Whole-page visual fidelity: render the authoritative pages and both packets
 * with the same Poppler process, erase only the declared amendment/apparatus
 * and participant-write regions from the difference image, and require no
 * remaining changed pixel. This catches a paraphrase, moved source control, or
 * broad white rectangle outside the narrowly declared regions.
 */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "az-r260001-fidelity-"));
try {
  execFileSync("pdftoppm", ["-f","3","-l","9","-png","-r","100",path.join(ROOT,SOURCE_PATH),path.join(tmp,"source")]);
  for (const fixture of ["canonical","boundary"]) execFileSync("pdftoppm", ["-png","-r","100",path.join(ROOT,OUT,`fixtures/${fixture}.pdf`),path.join(tmp,fixture)]);
  const py = String.raw`
from PIL import Image, ImageChops, ImageDraw
import json, os, sys
d=sys.argv[1]; scale=100/72
masks={
  3:[[65,725,500,43],[65,617,500,109],[65,74,500,52],[140,570,190,25],[195,540,175,25],[400,508,150,25],[68,455,245,25],[130,410,155,25],[258,315,180,25],[150,294,54,18],[245,294,190,18],[398,294,36,18],[138,220,340,90],[65,207,25,30]],
  4:[[65,725,500,43]],
  5:[[65,725,500,43],[65,440,500,80],[68,292,220,25],[68,240,500,28]],
  6:[[65,725,500,43]],
  7:[[65,725,500,43],[65,670,500,55],[140,655,190,25],[195,635,175,25],[400,590,150,25],[68,545,245,25],[130,508,155,25]],
  8:[[65,725,500,43],[65,375,500,60],[65,288,500,95],[65,215,500,80]],
  9:[[65,725,500,43],[175,592,50,30]],
}
out=[]
for fixture in ('canonical','boundary'):
  mapping=[3,4,5,6,7,8,9] if fixture=='canonical' else [3,4,5,6,None,7,8,9]
  for oi,sp in enumerate(mapping,1):
    if sp is None: continue
    src=Image.open(os.path.join(d,f'source-{sp}.png')).convert('RGB')
    got=Image.open(os.path.join(d,f'{fixture}-{oi}.png')).convert('RGB')
    diff=ImageChops.difference(src,got)
    keep=Image.new('1',src.size,1); draw=ImageDraw.Draw(keep)
    for x,y,w,h in masks[sp]:
      draw.rectangle((int(x*scale)-3,int((792-y-h)*scale)-3,int((x+w)*scale)+3,int((792-y)*scale)+3),fill=0)
    diff.paste((0,0,0),mask=Image.eval(keep,lambda p:0 if p else 255))
    out.append({'fixture':fixture,'outputPage':oi,'sourcePage':sp,'outsideMaskDifference':diff.getbbox()})
print(json.dumps(out))
`;
  const comparisons = JSON.parse(execFileSync("python3", ["-c", py, tmp]).toString());
  eq(comparisons.length, 14, "all copied pages compared in both fixtures");
  ok(comparisons.every((c) => c.outsideMaskDifference === null), "every source-derived page is pixel-identical outside bounded patches and write boxes");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(JSON.stringify({ status: "PASS", familyId: FAMILY_ID, assertions, positionedWriteRows: proofRows.length, sourceDerivedPagesCompared: 14 }, null, 2));
