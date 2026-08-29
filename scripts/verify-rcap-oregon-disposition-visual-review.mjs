#!/usr/bin/env node
// An independent look at the three Oregon disposition artifacts.
//
//   node scripts/verify-rcap-oregon-disposition-visual-review.mjs
//   node scripts/verify-rcap-oregon-disposition-visual-review.mjs --write
//
// WHY A SECOND LOOK
//
// verify-rcap-oregon-disposition-artifacts reads the content streams and can
// prove that two diagonals were stroked inside the coordinates of Option 3. It
// cannot prove that a reader would SEE a marked box, because everything it
// reads is the same arithmetic the renderer used to write it. A mark drawn in
// white, one hidden under a clip, a page that renders blank, a value the
// document's own ink swallows -- none of those are visible to a coordinate
// check and all of them are visible in a picture.
//
// So every page of every artifact is rendered and inspected, and the three
// option boxes are then cropped out of the rendered page through a page-to-pixel
// mapping that is verified against stamped calibration marks before anything is
// cropped through it. The claim is stated the way a reviewer would state it:
// the box for this configuration's option has ink in it, and the boxes for the
// other two options do not.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { rasterizePdf } from "./rcap-official-forms/rcap-pdf-rasterize.mjs";
import { rasterizePageCalibrated, inspectRect } from "./lib/pdf-page-raster.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const WRITE = process.argv.includes("--write");

const RECORD = "data/rcap-all50/oregon-disposition-artifacts.json";
const GEOMETRY = "data/rcap-all50/candidate-evidence/oregon/or-option-selection-geometry.json";
const CONFIGURATIONS = "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json";
const OUT = "data/rcap-lane-c/oregon/disposition-visual-review.json";
const IMAGE_DIR = "docs/record-clearing/pdf-visual-evidence/oregon-disposition-configurations";
const SCALE = 1.6;

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const record = read(RECORD);
const geometry = read(GEOMETRY);
const configurations = Object.fromEntries(read(CONFIGURATIONS).configurations.map((c) => [c.specificationId, c]));
const optionBox = new Map();
for (const option of geometry.options ?? []) {
  if (option.page === 4 && option.box) optionBox.set(option.option, option.box);
}

const failures = [];
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

console.log("Oregon disposition artifacts — independent visual review\n");

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "or-disposition-visual-"));
const reviewed = [];
try {
  for (const row of record.configurations) {
    const configuration = configurations[row.configurationId];
    for (const kind of ["canonical", "boundary"]) {
      const rel = row.fixtures[kind].artifact;
      const id = `${row.configurationId}/${kind}`;
      const abs = path.join(rootDir, rel);
      if (!fs.existsSync(abs)) { check(`${id}: the artifact exists`, false, rel); continue; }

      // ---- every page, looked at ------------------------------------------
      const outDir = path.join(stage, row.configurationId, kind);
      const rendered = await rasterizePdf({ file: abs, outDir, scale: SCALE });
      const pages = [];
      for (const page of rendered) {
        const grey = (await sharp(page.file).greyscale().stats()).channels[0];
        pages.push({
          page: page.page,
          renderedWidthPx: page.widthPx,
          renderedHeightPx: page.heightPx,
          croppedToPage: page.croppedToPage === true,
          rendersBlank: page.looksBlank,
          inkRange: grey.max - grey.min,
          meanLuma: Number(grey.mean.toFixed(3)),
          // A page of a filing is mostly white with ink on it.
          predominantlyLight: grey.mean > 160,
          pageImageSha256: sha256(fs.readFileSync(page.file))
        });
      }
      check(`${id}: all five pages rasterise`, pages.length === 5, `${pages.length}`);
      check(`${id}: no page renders blank`, pages.every((p) => !p.rendersBlank));
      check(`${id}: every page carries ink`, pages.every((p) => p.inkRange > 6));
      check(`${id}: every page reads as a document rather than a dark block`,
        pages.every((p) => p.predominantlyLight),
        pages.filter((p) => !p.predominantlyLight).map((p) => `page ${p.page} luma ${p.meanLuma}`).join(", "));
      check(`${id}: every page image is the page and nothing around it`, pages.every((p) => p.croppedToPage));

      // ---- the option boxes, cropped out of the render ---------------------
      const render = await rasterizePageCalibrated({ file: abs, pageIndex: 3 });
      const seen = {};
      try {
        for (const option of ["Option 1", "Option 2", "Option 3"]) {
          const looked = await inspectRect(render, optionBox.get(option));
          seen[option] = {
            borderDarkestLuma: looked.borderDarkestLuma,
            interiorDarkestLuma: looked.interiorDarkestLuma,
            borderVisible: looked.borderVisible,
            interiorCarriesInk: !looked.interiorEmpty
          };
        }
        if (WRITE && kind === "canonical") {
          fs.mkdirSync(path.join(rootDir, IMAGE_DIR), { recursive: true });
          const page4 = rendered.find((r) => r.page === 4);
          fs.copyFileSync(page4.file, path.join(rootDir, IMAGE_DIR, `${row.configurationId}-canonical-page-04.png`));
        }
      } finally {
        render.dispose();
      }

      const marked = configuration.formOption;
      check(`${id}: every option box is still drawn and visible`,
        ["Option 1", "Option 2", "Option 3"].every((o) => seen[o].borderVisible));
      check(`${id}: ${marked} reads as marked`, seen[marked].interiorCarriesInk,
        `interior darkest ${seen[marked].interiorDarkestLuma}`);
      for (const other of ["Option 1", "Option 2", "Option 3"].filter((o) => o !== marked)) {
        check(`${id}: ${other} reads as unmarked`, !seen[other].interiorCarriesInk,
          `interior darkest ${seen[other].interiorDarkestLuma}`);
      }

      reviewed.push({
        configurationId: row.configurationId,
        fixture: kind,
        artifact: rel,
        artifactSha256: row.fixtures[kind].sha256,
        statutoryAuthority: configuration.statutoryAuthority,
        optionMarked: marked,
        optionBoxesAsSeen: seen,
        pageCount: pages.length,
        pages,
        pageImage: kind === "canonical" ? `${IMAGE_DIR}/${row.configurationId}-canonical-page-04.png` : null
      });
    }
  }
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}

// Across the three: a marked Option 2 on the acquittal artifact and a marked
// Option 2 on the dismissal artifact are the same picture in that one respect,
// and must not be the same picture overall.
const canonicalImages = reviewed.filter((r) => r.fixture === "canonical")
  .map((r) => r.pages.find((p) => p.page === 4)?.pageImageSha256);
check("no two configurations produce the same page 4",
  new Set(canonicalImages).size === canonicalImages.length);

const doc = {
  schemaVersion: "rcap-oregon-disposition-visual-review/v1",
  generatedBy: "scripts/verify-rcap-oregon-disposition-visual-review.mjs",
  rasterScale: SCALE,
  method:
    "Every page is rendered from the artifact bytes, one clean page per image at the requested scale. The three option boxes are then cropped out of a render of page 4 through a page-to-pixel mapping checked against stamped calibration marks, so 'this box has ink in it' is measured rather than assumed.",
  claim:
    "For each artifact: all three option boxes are still drawn, the box for that configuration's own option carries ink, and the boxes for the other two do not.",
  independentOf:
    "scripts/verify-rcap-oregon-disposition-artifacts.mjs, which answers the same question from the content streams. Both must agree; neither is derived from the other.",
  artifactsReviewed: reviewed.length,
  pagesReviewed: reviewed.reduce((n, r) => n + r.pageCount, 0),
  reviewed
};

const serialized = `${JSON.stringify(doc, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);
console.log("");
if (failures.length) {
  console.error(`Oregon disposition visual review: ${failures.length} problem(s).`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
if (WRITE) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`  wrote ${OUT}`);
} else if (fs.existsSync(outPath) && fs.readFileSync(outPath, "utf8") !== serialized) {
  console.error(`${OUT} is not what this run derives. Re-run with --write.`);
  process.exit(1);
}
console.log(`\nOregon disposition visual review: ${doc.pagesReviewed} page(s) across ${reviewed.length} artifact(s); every option reads as its configuration says.`);
