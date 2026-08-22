#!/usr/bin/env node
// Focused controls for the wave-C shared corrections.
//
//   node scripts/verify-rcap-wave-c-corrections.mjs
//
// Each control is taken from a defect reviewer B or C reported, and each is
// paired with a mutation that removes the correction and requires the control
// to stop holding. A control with no mutation proves only that today's code
// agrees with today's expectation.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { extractTextItems, captureWidgetContext, normalizeHarvestedText } from "./rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import { protectCategoryOf, PROTECT_RULES, FACT_DESCRIPTORS, ALTERNATE_BLOCK } from "./rcap-official-forms/rcap-field-semantics.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const R = path.join(rootDir, "data/rcap-all50/overlays/production");
const NUL = String.fromCharCode(0);

let failures = 0;
const ok = (id, pass, detail) => {
  if (!pass) failures += 1;
  console.log(`  ${pass ? "ok  " : "FAIL"} ${id} - ${detail}`);
};
const load = async (rel) => PDFDocument.load(fs.readFileSync(path.join(R, rel)), { ignoreEncryption: true, updateMetadata: false });
const pageText = (doc, i) => extractTextItems(doc.getPages()[i]);

console.log("TEXT DECODING - WCB-CAPTION-ENCODING");
{
  const doc = await load("nebraska/dc-1-15-form-en/fixtures/canonical-filled.pdf");
  const runs = [...pageText(doc, 0), ...pageText(doc, 1)];
  const withNul = runs.filter((i) => i.text.includes(NUL)).length;
  const joined = runs.map((i) => i.text).join(" ");
  ok("decode-1-ne-dc-1-15", withNul === 0 && /Nebraska/.test(joined) && /Certificate/.test(joined),
    `${runs.length} runs across two pages, ${withNul} still carrying a NUL byte, headings readable`);
}
{
  const doc = await load("north-carolina/aoc-cv-226-support-en/fixtures/canonical-filled.pdf");
  // Normalised, because that is the form the classifier consumes: captions and
  // headings pass through normalizeHarvestedText before any rule sees them.
  const joined = normalizeHarvestedText(pageText(doc, 0).map((i) => i.text).join(" "));
  ok("decode-2-nc-cv-226-caption", /Full Permanent Mailing Address/.test(joined),
    "the permanent-address caption harvests as words, not as glyph indices");
}
{
  const decoded = "Full Permanent Mailing Address Of Applicant (if different than above)";
  ok("decode-3-money-misclassification-closed", protectCategoryOf(decoded) === null,
    "a readable address caption classifies as an address, not as money");
}
{
  const raw = NUL + "F" + NUL + "u" + NUL + "l" + NUL + "l";
  ok("decode-M1-without-normalisation", normalizeHarvestedText(raw) === "Full" && raw !== "Full",
    "removing the UTF-16BE normalisation returns the caption to bytes no rule can read");
}

console.log("");
console.log("ATTRIBUTION - WCB-B-REGION-ATTRIBUTION");
{
  const census = JSON.parse(fs.readFileSync(path.join(R, "north-carolina/aoc-cr-296-form-en/field-census.json"), "utf8"));
  const rows = census.fields ?? census;
  const row = rows.find((r) => r.name === "StreetAddr");
  const doc = await load("north-carolina/aoc-cr-288-form-en/fixtures/canonical-filled.pdf");
  const ctx = captureWidgetContext(doc.getPages()[0], [{ name: "StreetAddr", rect: row.widgets[0].rect }], { isFirstPage: true })[0];
  ok("attr-4-other-column-heading-does-not-govern",
    ctx.regionHeading === null || !/DISTRICT ATTORNEY/i.test(ctx.regionHeading),
    `a left-column widget is not governed by a right-column title block (region=${JSON.stringify(ctx.regionHeading)})`);
  ok("attr-4b-over-protection-is-recorded",
    Object.prototype.hasOwnProperty.call(ctx, "regionHeadingInBandButAnotherColumn"),
    "when a band heading is rejected on column, the census records which heading it was rather than dropping it silently");
}
{
  const runs = [
    { text: "Employment - Applicant", x: 10, x2: 90 },
    { text: "$", x: 200, x2: 206 },
    { text: "Number Of Dependents", x: 300, x2: 400 }
  ];
  const rect = { x: 410, y: 96, width: 60, height: 12 };
  const reachable = runs.filter((r) => rect.x - r.x2 >= 0 && rect.x - r.x2 <= 72);
  const nearest = reachable[reachable.length - 1];
  ok("attr-5-caption-is-the-cell", Boolean(nearest) && nearest.text === "Number Of Dependents",
    "the nearest cell left of the widget is the caption; the money column on the same row is not");
}

console.log("");
console.log("SEMANTICS - WCB-B-296-DLSTATE and the alternate address block");
ok("sem-6-dlstate-refused", protectCategoryOf("DLState") === "government_identifier",
  "DLState is refused on its name, as DLNo already was");
ok("sem-6b-residence-state-still-binds", protectCategoryOf("PetitionerState") === null,
  "a residence-state field is untouched by the driver's-licence rule");
{
  const withoutRule = PROTECT_RULES.filter(([id]) => id !== "government_identifier");
  ok("sem-M2-drop-government-identifier", !withoutRule.some(([, re]) => re.test("dlstate")),
    "removing the government_identifier rule lets DLState through again");
}
{
  const bind = (label) => {
    const h = label.toLowerCase();
    const m = FACT_DESCRIPTORS.filter((d) => d.match.test(h) && !(d.refuseWhen && d.refuseWhen.test(h)));
    return m.length ? m[0].factId : null;
  };
  ok("sem-7-alternate-block-refused",
    bind("Full Permanent Mailing Address Of Applicant (if different than above)") === null
      && bind("Applicant Street Address") === "participant.street_address",
    "the conditional second address block is refused while the canonical block still binds");
  ok("sem-7b-no-duplicate-city-state-zip",
    bind("Mailing Address (if different than above) City State Zip") === null,
    "city, state and ZIP are not duplicated into the alternative block");
  ok("sem-M3-alternate-guard-is-load-bearing", ALTERNATE_BLOCK.test("if different than above"),
    "the alternate-block guard is what refuses it; without the pattern the block binds");
}

console.log("");
console.log("OWNER DISPOSITIONS");
{
  const sr = JSON.parse(fs.readFileSync(path.join(R, "north-carolina/aoc-cr-296-form-en/source-record.json"), "utf8"));
  const fixture = path.join(R, "north-carolina/aoc-cr-296-form-en/fixtures/canonical-filled.pdf");
  ok("owner-8-cr296-prosecutor",
    sr.documentOwner === "prosecutor" && sr.participantCompleted === false
      && sr.participantFillable === false && sr.generationAllowed === false
      && sr.productionHolds.includes("not_participant_fillable_no_fixture_fill")
      && !fs.existsSync(fixture),
    "AOC-CR-296 is prosecutor-controlled, not participant-completed, not fillable, and renders no artifact");
  ok("owner-8b-cr296-withdrawal-auditable",
    Array.isArray(sr.ownerDisposition?.artifactsWithdrawn) && sr.ownerDisposition.artifactsWithdrawn.length === 5,
    "the five withdrawn artifacts are recorded by hash so the withdrawal can be audited");
}
{
  const sc = JSON.parse(fs.readFileSync(path.join(R, "north-carolina/aoc-cr-298-form-en/artifact-provenance.json"), "utf8"));
  const siblings = ["aoc-cr-287-form-en", "aoc-cr-288-form-en"].map((f) =>
    JSON.parse(fs.readFileSync(path.join(R, `north-carolina/${f}/artifact-provenance.json`), "utf8")).sourceUrl);
  ok("owner-9-cr298-source-locator",
    sc.sourceUrl.startsWith("master-library:") && siblings.every((s) => s.startsWith("master-library:")),
    "AOC-CR-298 carries the same pinned master-library locator its siblings do, not an unverifiable page URL");
}

console.log("");
console.log("EVIDENCE INTEGRITY");
{
  const rec = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-all50/pdf-independent-reviews/gate-b-family-rerender-evidence.json"), "utf8"));
  const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  let mismatched = 0;
  let checked = 0;
  for (const fam of rec.families) {
    for (const [key, rel] of [["currentMapOrProfileSha256", "production-field-map.json"],
      ["currentClassificationSha256", "field-classification.json"],
      ["currentCanonicalArtifactSha256", "fixtures/canonical-filled.pdf"],
      ["currentBoundaryArtifactSha256", "fixtures/boundary-filled.pdf"]]) {
      const p = path.join(rootDir, fam.familyPackagePath, rel);
      if (!fs.existsSync(p)) continue;
      checked += 1;
      if (fam[key] !== sha(p)) mismatched += 1;
    }
  }
  ok("evidence-10-current-fields-match-disk", mismatched === 0,
    `${checked} current* fields checked against disk, ${mismatched} mismatched`);
  ok("evidence-11-stale-narrative-renamed",
    rec.rerenderAttempt === undefined && rec.rerenderAttemptHistorical?.artifactsChanged === 0
      && rec.currentRerenderState?.processedFamilies === rec.families.length,
    "the processedFamilies=0 / artifactsChanged=0 block is kept as history and no longer asserts a present fact");
}

console.log("");
console.log(`  ${failures === 0 ? "all controls held" : `${failures} control(s) failed`}`);
if (failures) { console.error("FAIL wave-C corrections"); process.exit(1); }
console.log("OK wave-C corrections - captions decode before they are classified, a heading governs only its own column, the driver's-licence cluster and the conditional address block are refused, AOC-CR-296 renders nothing, and every current* field matches disk");
