import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractTextItems, extractPathSegments } from "../../../../../scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";

const evidence = path.dirname(fileURLToPath(import.meta.url));
const family = "data/rcap-all50/overlays/census-v1/nh/nh-petition-nonconviction-pre2019-set--official-pdf-fill";
const base = "abeeb0876";
const json = (p) => JSON.parse(fs.readFileSync(`${family}/${p}`, "utf8"));
const maps = json("production-field-map.json");
const proofs = json("reports/actual-writes.json");
const guide = fs.readFileSync(`${family}/participant-instructions.md`, "utf8");
const projected = (page) => extractTextItems(page).map(({ text, x, y, width, size }) => ({ text, x, y, width, size }));
const measurements = [];
for (const fixture of ["canonical", "boundary"]) {
  const file = `${family}/fixtures/${fixture}.pdf`;
  const bytes = fs.readFileSync(file);
  const current = await PDFDocument.load(bytes);
  const before = await PDFDocument.load(execFileSync("git", ["show", `${base}:${file}`]));
  assert.equal(current.getPageCount(), 9);
  const own = proofs.documents.filter((d) => d.fixture === fixture);
  assert.ok(own.flatMap((d) => d.actualWrites).every((w) => w.matchesExpected));
  assert.ok(own.every((d) => d.refusedFieldsWithInk.length === 0));
  const printed = own.find((d) => d.formNumber === "NHJB-2311").actualWrites.find((w) => w.field === "printed-page2-case-number");
  const address = own.find((d) => d.formNumber === "NHJB-2328").actualWrites.find((w) => w.field === "2.1");
  assert.ok(printed && address);
  const helvetica = await current.embedFont(StandardFonts.Helvetica);
  const exactFitWidthsAt11pt = { caseNumber: helvetica.widthOfTextAtSize(printed.expected, 11),
    residenceAddress: helvetica.widthOfTextAtSize(address.expected, 11) };
  assert.ok(exactFitWidthsAt11pt.caseNumber < printed.rect.width);
  assert.ok(exactFitWidthsAt11pt.residenceAddress < address.rect.width);
  assert.match(address.expected, /, (Concord, NH 03301|Portsmouth, NH 03801-2214)$/);
  const unchangedPages = [];
  for (let i = 0; i < 9; i++) {
    const currPage = current.getPage(i), oldPage = before.getPage(i);
    const currItems = projected(currPage), oldItems = projected(oldPage);
    // Drawing paths (including court ruling lines and boxes) do not change.
    assert.deepEqual(extractPathSegments(currPage), extractPathSegments(oldPage), `page ${i + 1} source paths`);
    if (i === 4) {
      const added = currItems.filter((item) => item.text === printed.expected && Math.abs(item.y - printed.rect.y) < 0.2);
      assert.equal(added.length, 1);
      assert.equal(added[0].size, 11);
      assert.ok(added[0].x + added[0].width <= printed.rect.x + printed.rect.width);
      assert.deepEqual(currItems.filter((item) => !added.includes(item)), oldItems);
    } else if (i === 5) {
      const added = currItems.filter((item) => item.text === address.expected);
      const oldStreet = oldItems.filter((item) => item.text === address.expected.split(", ").slice(0, 2).join(", "));
      assert.equal(added.length, 1);
      assert.equal(oldStreet.length, 1);
      assert.equal(added[0].size, 11);
      assert.ok(added[0].x + added[0].width <= address.rect.x + address.rect.width);
      assert.deepEqual(currItems.filter((item) => !added.includes(item)), oldItems.filter((item) => !oldStreet.includes(item)));
    } else {
      assert.deepEqual(currItems, oldItems, `page ${i + 1} existing text`);
      unchangedPages.push(i + 1);
    }
  }
  const required = maps.requiredBeforeFiling.filter((r) => r.field?.endsWith("printed-page2-case-name"));
  assert.equal(required.length, 1);
  assert.ok(guide.includes(required[0].disclosureLabel));
  const conditional = maps.requiredBeforeFiling.filter((r) => r.conditional);
  assert.equal(conditional.length, 6);
  assert.equal(conditional.reduce((n, r) => n + r.widgetLocations.length, 0), 8);
  assert.ok(guide.includes("every mailed request requires both sections completed and Section II notarized"));
  measurements.push({ fixture, sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    pageCount: 9, printedCaseNumber: printed, completeResidenceAddress: address,
    fontSizeReadFromBothChangedPageContentStreams: 11, exactFitWidthsAt11pt,
    unchangedTextAndPathsOnPacketPages: unchangedPages,
    affectedPageChangesOnly: ["p5: added held Case Number above court section", "p6: replaced street with complete held address"],
    sourcePathsUnchangedOnAllPages: true, reportedWritesReadBackMatch: true,
    refusedFieldsWithInk: 0, retainedConditionalMaxLenFields: 6, retainedConditionalMaxLenWidgetInstances: 8 });
}
const result = { status: "PASS", comparisonBase: base, authorMeasurementOnly: true,
  independentVerificationPending: true, requiredBeforeFiling: maps.requiredBeforeFiling.length, measurements };
fs.writeFileSync(path.join(evidence, "measurement.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log("FIX92 exact-page measurement PASS: four targeted writes at 11pt; only p5/p6 text changes; all paths and other pages unchanged; FIX90 refusals/disclosures retained.");
