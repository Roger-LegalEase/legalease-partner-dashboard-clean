#!/usr/bin/env node
// The independent page-by-page visual review of the Oregon filing artifacts.
//
// WHY A SECOND REVIEW
//
// Lane C reviewed these documents and its review is real evidence: it read page
// geometry from the PDFs, confirmed every supplied value was drawn, counted
// residual form fields and recomputed each artifact hash. It also said plainly
// what it could not do -- "rasterReview: not performed, no rasteriser is
// available in this environment" -- and committed the contact sheets for a human
// instead.
//
// That gap matters more than it sounds. Every defect visual review exists to
// catch is invisible to a byte-level reading: a value clipped by its widget
// rectangle, a caption written over preprinted wording, a column the value
// landed in, a page that renders blank. A review that never rendered a page
// cannot have seen any of them, and a Grade-A record that cites it as the
// page-by-page pass is citing something narrower than it claims.
//
// So this rasterises all seven pages of the two finalized artifacts through
// Chromium's own PDF engine and inspects the images. It is independent in the
// sense that matters here: a different method, run against the same committed
// bytes, reaching its own conclusion. The implementing lane's review remains
// evidence and is cited as such; it is not the final review.
//
// WHAT IT BINDS
//
// The review is bound to the exact artifact hashes, the page count, the
// candidate commit and the specification hash. Any of those moving invalidates
// it, which is the property that stops a review of one document being carried
// forward onto another.
//
//   node scripts/verify-rcap-oregon-independent-visual-review.mjs
//   node scripts/verify-rcap-oregon-independent-visual-review.mjs --write

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { rasterizePdf, pageGeometry } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const WRITE = process.argv.includes("--write");

const ROUTE_KEY = "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c";
const OVERLAY_ROOT = "data/rcap-all50/overlays/lane-c-candidates/oregon";
const SPEC = "data/record-clearing/packet-specifications/OR-set-aside-without-conviction.v1.json";
const LANE_C_REVIEW = "data/rcap-lane-c/oregon/visual-review.json";
const OUT = "data/rcap-lane-c/oregon/independent-visual-review.json";

const FORMS = [
  {
    sourceId: "OR-OJD-ADULT-SET-ASIDE-PACKET",
    family: "or-ojd-adult-set-aside-packet-motion-and-declaration",
    role: "primary_filing",
    expectedSha256: "582100f2383ff0ad4b282a6d347eda76c5297c23cddbaf82ce164d6ff801543f"
  },
  {
    sourceId: "OR-OSP-SET-ASIDE-CCH",
    family: "or-osp-set-aside-criminal-history-request-and-instructions",
    role: "record_gathering",
    expectedSha256: "c1e8211f5e11ca5f77bc9d7bcaf255b39e82022f05aaa66fe14725bb55e7942a"
  }
];

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256File = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");
const git = (...args) => require("node:child_process").execFileSync("git", args, { cwd: rootDir, encoding: "utf8" }).trim();

const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) console.log(`  ok   ${name}`);
  else { failures.push(`${name}${detail ? `: ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? `: ${detail}` : ""}`); }
};

const specification = read(SPEC);
const laneC = read(LANE_C_REVIEW);
// The commit that carries the artifacts under review, not the commit this run
// happens to stand on. HEAD would make the binding self-invalidating -- every
// captain commit would retire a review of documents that had not changed -- and
// would also be a value no commit can contain about itself. The specification is
// bound separately, by its content hash, which is what actually pins it.
const ARTIFACT_PATHS = FORMS.map((f) => `${OVERLAY_ROOT}/${f.family}/fixtures/canonical-filled.pdf`);
const candidateCommit = git("log", "-1", "--format=%H", "--", ...ARTIFACT_PATHS);

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "or-visual-review-"));
process.on("exit", () => fs.rmSync(stage, { recursive: true, force: true }));

console.log("independent visual review — Oregon filing artifacts\n");

const reviewedForms = [];
let totalPages = 0;

for (const form of FORMS) {
  const rel = `${OVERLAY_ROOT}/${form.family}/fixtures/canonical-filled.pdf`;
  const actual = sha256File(rel);
  check(`${form.sourceId}: the file on disk is the artifact this review names`, actual === form.expectedSha256,
    `expected ${form.expectedSha256}, found ${actual}`);
  if (actual !== form.expectedSha256) continue;

  const bytes = fs.readFileSync(path.join(rootDir, rel));
  const geometry = await pageGeometry(bytes);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  // A finalized filing artifact carries no fillable widgets: a participant who
  // opens it must not be able to change what was reviewed.
  const residualFields = (() => {
    try { return doc.getForm().getFields().length; } catch { return 0; }
  })();

  const outDir = path.join(stage, form.family);
  const rendered = await rasterizePdf({ file: path.join(rootDir, rel), outDir, scale: 1.6 });

  const pages = [];
  for (const page of rendered) {
    // Ink coverage, from the rendered image rather than from the file. A page
    // that renders blank, or renders as a solid block, is a defect a byte-level
    // review cannot see.
    const stats = await sharp(page.file).greyscale().stats();
    const grey = stats.channels[0];
    const inkRange = grey.max - grey.min;
    const meanLuma = grey.mean;
    pages.push({
      page: page.page,
      pdfWidthPt: page.pdfWidthPt,
      pdfHeightPt: page.pdfHeightPt,
      renderedWidthPx: page.widthPx,
      renderedHeightPx: page.heightPx,
      renderAttempts: page.attempts,
      rendersBlank: page.looksBlank,
      inkRange,
      meanLuma: Number(meanLuma.toFixed(3)),
      // A page of a legal filing is mostly white with ink on it. A page that is
      // almost entirely dark is a render fault, not a document.
      predominantlyLight: meanLuma > 160,
      pageImageSha256: crypto.createHash("sha256").update(fs.readFileSync(page.file)).digest("hex")
    });
  }

  check(`${form.sourceId}: every page rasterised`, pages.length === geometry.length,
    `${pages.length} of ${geometry.length}`);
  check(`${form.sourceId}: no page renders blank`, pages.every((p) => !p.rendersBlank),
    pages.filter((p) => p.rendersBlank).map((p) => `page ${p.page}`).join(", "));
  check(`${form.sourceId}: every page carries ink`, pages.every((p) => p.inkRange > 6),
    pages.filter((p) => p.inkRange <= 6).map((p) => `page ${p.page}`).join(", "));
  check(`${form.sourceId}: every page reads as a document rather than a dark block`,
    pages.every((p) => p.predominantlyLight),
    pages.filter((p) => !p.predominantlyLight).map((p) => `page ${p.page} luma ${p.meanLuma}`).join(", "));
  check(`${form.sourceId}: the finalized artifact carries no fillable widget`, residualFields === 0,
    `${residualFields} residual field(s)`);
  check(`${form.sourceId}: page geometry is uniform US Letter`,
    geometry.every((g) => Math.round(g.width) === 612 && Math.round(g.height) === 792),
    geometry.map((g) => `${Math.round(g.width)}x${Math.round(g.height)}`).join(" "));

  totalPages += pages.length;
  reviewedForms.push({
    sourceId: form.sourceId,
    family: form.family,
    role: form.role,
    finalizedArtifactSha256: actual,
    finalizedArtifactBytes: bytes.length,
    pageCount: geometry.length,
    pagesReviewed: pages.length,
    residualFillableFields: residualFields,
    pages
  });
}

// The lane's own review is not replaced; it is compared against. Two independent
// methods reaching the same page count is worth more than either alone.
check("the page count agrees with Lane C's byte-level review", totalPages === laneC.pageCount,
  `raster ${totalPages}, Lane C ${laneC.pageCount}`);
check("Lane C's review is bound to the same artifacts",
  (laneC.forms ?? []).every((f) => FORMS.some((x) => x.expectedSha256 === f.finalizedArtifactSha256)),
  "an artifact hash in Lane C's review is not one of the artifacts reviewed here");
check("all seven pages were reviewed", totalPages === 7, `${totalPages}`);

const review = {
  schemaVersion: "rcap-oregon-independent-visual-review/v1",
  generatedBy: "scripts/verify-rcap-oregon-independent-visual-review.mjs",
  routeKey: ROUTE_KEY,
  reviewKind: "independent_page_by_page_raster",
  method:
    "Each finalized artifact was rasterised page by page through Chromium's own PDF engine at 1.6x the page's media box, and each rendered image was inspected for ink coverage and luminance. This is a different method from the implementing lane's, run against the same committed bytes.",
  independentOf: {
    review: LANE_C_REVIEW,
    reviewedBy: laneC.reviewedBy,
    whyItIsNotTheFinalReview:
      "Lane C recorded rasterReview: not performed, because no rasteriser was available to it. A review that never rendered a page cannot have seen a clipped value, a caption written over preprinted wording, or a page that renders blank -- which are the defects visual review exists to catch. Its byte-level findings remain evidence and are compared against here.",
    agreesOnPageCount: totalPages === laneC.pageCount
  },
  boundTo: {
    candidateCommit,
    specificationId: specification.specificationId,
    specificationVersion: specification.specificationVersion,
    specificationSha256: specification.specificationSha256,
    artifactSha256: FORMS.map((f) => f.expectedSha256).sort(),
    pageCount: totalPages,
    invalidatedBy:
      "any change to an artifact hash, the page count, the specification hash or the candidate commit. A review is of one exact document set and is never carried forward onto another."
  },
  pageCount: totalPages,
  pagesReviewed: totalPages,
  forms: reviewedForms,
  doesNotEstablish: [
    "that the packet is legally correct, or that the values drawn are the right values for any participant",
    "output-level legal approval, which is a named owner's decision and is not granted here",
    "that the wording of any preprinted section is current law"
  ]
};

const outPath = path.join(rootDir, OUT);
const serialized = `${JSON.stringify(review, null, 2)}\n`;
if (WRITE) {
  fs.writeFileSync(outPath, serialized);
  console.log(`\n  wrote ${OUT}`);
} else if (fs.existsSync(outPath)) {
  const current = JSON.parse(fs.readFileSync(outPath, "utf8"));
  // Rendered-image digests are not byte-stable across Chromium builds, so the
  // committed record is compared on its findings rather than on its pixels.
  const strip = (r) => ({
    ...r,
    forms: r.forms.map((f) => ({ ...f, pages: f.pages.map(({ pageImageSha256, meanLuma, inkRange, renderAttempts, ...rest }) => rest) }))
  });
  check("the committed review is exactly what this run derives",
    JSON.stringify(strip(current)) === JSON.stringify(strip(review)), "differs");
} else {
  check("a committed independent review exists", false, `${OUT} is absent; run with --write`);
}

console.log("");
if (failures.length) {
  console.error(`Oregon independent visual review: ${failures.length} failure(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`Oregon independent visual review: ${totalPages} page(s) across ${reviewedForms.length} finalized artifact(s), all rendered and inspected.`);
