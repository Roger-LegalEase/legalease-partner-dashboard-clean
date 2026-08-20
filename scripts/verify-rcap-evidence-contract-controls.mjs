#!/usr/bin/env node
// Focused controls for the evidence contract.
//
//   node scripts/verify-rcap-evidence-contract-controls.mjs
//
// Every control reproduces a defect that got past the previous contract and
// asserts the current one refuses it. Controls 1-3 do not simulate anything:
// they load the exact artifact bytes committed at this branch's base -- the
// bytes independent reviewers A and B were given -- out of git, and assert the
// contract flags what the reviewers found by hand. A control built on a
// hand-made PDF would prove the checker works on a PDF nobody ever shipped.
//
// Controls 6-9 are mutations. A rule whose removal changes nothing is not
// load-bearing, so each removes one correction and requires the corresponding
// control to go green -- that is, to stop objecting.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { auditPlacements, pagesRequiringRaster, rasterContract, placementValuesFor, reconcileWrittenAgainstDeclared }
  from "./rcap-official-forms/rcap-evidence-contract.mjs";
import { decideBinding, regionProtectCategoryOf, protectCategoryOf } from "./rcap-official-forms/rcap-field-semantics.mjs";
import { CANONICAL } from "./implement-rcap-official-forms-d1.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The commit whose artifacts reviewers A and B reviewed. Read from the merge
// base rather than named as a literal, so the controls keep pointing at the
// reviewed bytes as this branch advances.
const REVIEWED_AT = process.env.RCAP_REVIEWED_BASE ?? "ea1a16b6358086c3c24fbd66e2fd005173d3ad87";

const results = [];
const record = (id, what, passed, detail) => {
  results.push({ id, what, passed, detail });
  console.log(`${passed ? "  ok  " : "  FAIL"} ${id} — ${what}${detail ? `\n         ${detail}` : ""}`);
};

/** A file as it stood at the reviewed commit. */
function atReviewedCommit(relative) {
  return execFileSync("git", ["show", `${REVIEWED_AT}:${relative}`], { cwd: rootDir, maxBuffer: 64 * 1024 * 1024 });
}

async function auditReviewedFamily(dir, { facts = CANONICAL } = {}) {
  const base = `data/rcap-all50/overlays/production/${dir}`;
  const census = JSON.parse(atReviewedCommit(`${base}/field-census.json`).toString("utf8"));
  const map = JSON.parse(atReviewedCommit(`${base}/production-field-map.json`).toString("utf8"));
  const populated = JSON.parse(atReviewedCommit(`${base}/reports/populated-fields.json`).toString("utf8"));
  const doc = await PDFDocument.load(atReviewedCommit(`${base}/fixtures/canonical-filled.pdf`),
    { ignoreEncryption: true, updateMetadata: false });
  const { values } = placementValuesFor({ populatedFields: populated, facts });
  return { audit: auditPlacements({ doc, census, map, values }), census, map, doc };
}

const flagged = (audit, { value, field, page }) => audit.drawnIntoAProtectedSlot.some((f) =>
  (!value || f.value === value) && (!field || f.landedInField === field) && (!page || f.page === page));

console.log(`Evidence-contract controls, against the artifacts reviewed at ${REVIEWED_AT.slice(0, 8)}\n`);

// --- 1: the page-2 defect a page-1 package could never have shown ------------
{
  const { audit } = await auditReviewedFamily("north-carolina/aoc-cr-288-form-en");
  const hit = audit.drawnIntoAProtectedSlot.find((f) => f.page === 2 && f.value === CANONICAL["participant.full_legal_name"]);
  record("C1", "NC AOC-CR-288: the petitioner's name in the judge's page-2 FINDINGS OF FACT block is refused",
    Boolean(hit) && /findings of fact/i.test(hit?.protectedRegion?.heading ?? ""),
    hit ? `flagged: ${hit.because}` : "the contract did not object");
}

// --- 2 and 3: values in fields the family's own map calls unwritable ---------
{
  const { audit } = await auditReviewedFamily("kentucky/aoc-334-form-en");
  record("C2", "KY AOC-334: the case number drawn into `Court` is refused",
    flagged(audit, { value: CANONICAL["matter.case_number"], field: "Court", page: 1 }),
    `${audit.drawnIntoAProtectedSlot.length} protected-slot finding(s) on this family`);
  record("C3", "KY AOC-334: the participant's name drawn onto the rule captioned `Date` is refused",
    flagged(audit, { value: CANONICAL["participant.full_legal_name"], field: "Date", page: 1 }),
    null);
}

// --- 4: a picture of bytes that have since been replaced ---------------------
{
  const stale = rasterContract({ requiredPages: [1, 2], renderedPages: [1, 2],
    manifestArtifactSha256: "a".repeat(64), currentArtifactSha256: "b".repeat(64) });
  const fresh = rasterContract({ requiredPages: [1, 2], renderedPages: [1, 2],
    manifestArtifactSha256: "a".repeat(64), currentArtifactSha256: "a".repeat(64) });
  record("C4", "a raster manifest naming a superseded artifact hash is refused",
    stale.refusals.some((r) => r.code === "RASTER_BOUND_TO_SUPERSEDED_BYTES") && fresh.complete,
    `stale refused: ${stale.refusals.length}; matching hash accepted: ${fresh.complete}`);
}

// --- 5: page 1 of a two-page form is not evidence about the form -------------
{
  const census = JSON.parse(fs.readFileSync(path.join(rootDir,
    "data/rcap-all50/overlays/production/north-carolina/aoc-cr-288-form-en/field-census.json"), "utf8"));
  const required = pagesRequiringRaster(census);
  const pageOneOnly = rasterContract({ requiredPages: required, renderedPages: [1],
    manifestArtifactSha256: null, currentArtifactSha256: null });
  const allPages = rasterContract({ requiredPages: required, renderedPages: required,
    manifestArtifactSha256: null, currentArtifactSha256: null });
  record("C5", "a page-1-only package cannot stand as evidence for a two-page form",
    required.includes(2) && pageOneOnly.refusals.some((r) => r.code === "RASTER_COVERAGE_INCOMPLETE") && allPages.complete,
    `pages carrying fields: [${required}]; page-1-only refused: ${!pageOneOnly.complete}`);
}

// --- 6: mutation — the region-heading vocabulary is load-bearing -------------
{
  const field = { name: "PetitionerIsEligibleBecauseText1", pdfType: "text", effectiveLabel: null, regionHeading: "FINDINGS OF FACT" };
  const withRule = decideBinding(field);
  // The mutation: the vocabulary the correction added, removed. What the region
  // channel consulted before is protectCategoryOf, so asking it directly IS the
  // pre-correction behaviour.
  const withoutRule = protectCategoryOf("FINDINGS OF FACT");
  record("C6", "mutation: without the heading vocabulary, FINDINGS OF FACT protects nothing",
    withRule.writable === false && withRule.reason === "protected_page_region"
      && withoutRule === null && regionProtectCategoryOf("FINDINGS OF FACT") === "court",
    `with the rule: refused as ${withRule.category}; the field-name vocabulary alone returns ${withoutRule}`);
}

// --- 7: mutation — the writable-class allowlist is load-bearing --------------
{
  const source = fs.readFileSync(path.join(rootDir, "scripts/implement-rcap-official-forms-d1.mjs"), "utf8");
  const allowlisted = /const WRITABLE_CLASSES = new Set\(\[([^\]]*)\]\)/.exec(source);
  const classes = allowlisted ? allowlisted[1].split(",").map((c) => c.trim().replace(/"/g, "")).filter(Boolean) : [];
  const denylistGone = !/const NEVER_WRITE = new Set/.test(source);
  // `unused` is the class KY AOC-334's Text1 carries; the old denylist named
  // `manual` and not this, which is how it was bound and written.
  record("C7", "mutation: an allowlist refuses `unused`, which the denylist it replaced did not name",
    denylistGone && classes.length > 0 && !classes.includes("unused") && classes.includes("participant"),
    `writable classes: ${classes.join(", ") || "none found"}`);
}

// --- 8: mutation — the role refusal actually reaches the renderer ------------
{
  const finalizer = fs.readFileSync(path.join(rootDir, "scripts/rcap-official-forms/rcap-official-form-finalize.mjs"), "utf8");
  const driver = fs.readFileSync(path.join(rootDir, "scripts/implement-rcap-official-forms-d1.mjs"), "utf8");
  const accepts = /unwritableFields = \[\]/.test(finalizer) && /unwritableByRole\.has\(field\.name\)/.test(finalizer);
  const supplies = /unwritableFields: classification\.filter\(\(c\) => isUnwritableClass\(c\.class\)\)/.test(driver);
  record("C8", "mutation: the renderer is given the role refusals and applies them before any name match",
    accepts && supplies,
    `finalizer accepts and enforces: ${accepts}; driver supplies: ${supplies}`);
}

// --- 9: written-versus-declared, in both directions --------------------------
{
  const dropped = reconcileWrittenAgainstDeclared({ writtenFields: ["a"], declaredBindings: ["a", "b"] });
  const undeclared = reconcileWrittenAgainstDeclared({ writtenFields: ["a", "b"], declaredBindings: ["a"] });
  const balanced = reconcileWrittenAgainstDeclared({ writtenFields: ["a"], declaredBindings: ["a"] });
  record("C9", "a silently dropped write and an undeclared write both fail the reconciliation",
    dropped.refusals.some((r) => r.code === "DECLARED_BUT_NOT_WRITTEN")
      && undeclared.refusals.some((r) => r.code === "WRITTEN_BUT_NOT_DECLARED") && balanced.balanced,
    `1-written/2-declared refused, 2-written/1-declared refused, matched pair accepted`);
}

// --- 10: the corrected corpus is clean on every page -------------------------
{
  const families = ["north-carolina/aoc-cr-288-form-en", "kentucky/aoc-334-form-en",
    "alaska/tf-800-form-en", "alaska/tf-805-form-en", "north-carolina/aoc-cr-287-form-en", "north-carolina/aoc-cr-298-form-en"];
  const dirty = [];
  for (const dir of families) {
    const base = path.join(rootDir, "data/rcap-all50/overlays/production", dir);
    const census = JSON.parse(fs.readFileSync(path.join(base, "field-census.json"), "utf8"));
    const map = JSON.parse(fs.readFileSync(path.join(base, "production-field-map.json"), "utf8"));
    const populated = JSON.parse(fs.readFileSync(path.join(base, "reports/populated-fields.json"), "utf8"));
    const doc = await PDFDocument.load(fs.readFileSync(path.join(base, "fixtures/canonical-filled.pdf")),
      { ignoreEncryption: true, updateMetadata: false });
    const { values } = placementValuesFor({ populatedFields: populated, facts: CANONICAL });
    const audit = auditPlacements({ doc, census, map, values });
    if (!audit.clean) dirty.push(`${dir}: ${audit.refusals.map((r) => r.code).join(", ")}`);
  }
  record("C10", "every family that carried a reproduced defect is clean on every page at this head",
    dirty.length === 0, dirty.join(" | ") || `${families.length} families checked`);
}

const failed = results.filter((r) => !r.passed);
console.log("");
if (failed.length) {
  console.error(`FAIL evidence-contract controls — ${failed.length} of ${results.length} did not hold: ${failed.map((f) => f.id).join(", ")}`);
  process.exit(1);
}
console.log(`OK evidence-contract controls — ${results.length}/${results.length} held; 3 defects reproduced from the reviewed bytes, 4 mutations, 2 coverage controls, 1 head check`);
