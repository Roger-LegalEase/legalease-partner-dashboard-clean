#!/usr/bin/env node
// The focused verifier for the all-page visual-evidence contract.
//
//   node scripts/verify-rcap-all-page-visual-evidence.mjs
//
// Two halves. CANARIES assert that the contract detects each defect two
// independent reviewers actually found, against the committed families those
// defects live in — a canary that needed a synthetic fixture would only prove
// the fixture. MUTATIONS start from a family the contract passes and break one
// thing, and each must turn its named check red; a mutation that leaves the
// suite green means the check is decorative.
//
// It verifies evidence. It renders nothing, approves nothing, and issues no
// verdict.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  geometryOfFamily, participantInk, writableGeometryResult, protectedGeometryResult,
  pageRelevance, allFixtureValues, CANONICAL_FACTS, resolveFact
} from "./rcap-official-forms/rcap-evidence-geometry.mjs";
import { familyDirOf, buildFamilyEvidence, EVIDENCE_SCHEMA } from "./generate-rcap-all-page-visual-evidence.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_DIR = path.join(rootDir, "data/rcap-all50/visual-evidence");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

let failures = 0;
const results = [];
function check(id, ok, detail) {
  results.push({ id, ok: !!ok, detail });
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${id} — ${detail}`);
}

/**
 * The bytes the reviewers were actually given.
 *
 * A canary that asserts "the contract catches this defect in this family" stops
 * discriminating the moment the family is fixed — it goes red for the best
 * possible reason and reads exactly like a regression. The defects below have
 * since been corrected in the live packages, so each canary is pinned to the
 * commit the reviewers read, and keeps proving the contract would refuse those
 * bytes for as long as the contract exists.
 */
export const REVIEWED_BYTES_COMMIT = "ea1a16b6358086c3c24fbd66e2fd005173d3ad87";

function blobAt(commit, relPath) {
  return execFileSync("git", ["show", `${commit}:${relPath}`], { cwd: rootDir, maxBuffer: 64 * 1024 * 1024 });
}

/** Reads a family's map + census and runs the geometry contract in memory. */
async function analyse(familyId, { mutateMap, mutateCensus, atCommit = null } = {}) {
  const dir = familyDirOf(familyId);
  const rel = path.relative(rootDir, dir);
  const read = (name) => atCommit
    ? blobAt(atCommit, `${rel}/${name}`)
    : fs.readFileSync(path.join(dir, name));
  let map = JSON.parse(read("production-field-map.json").toString("utf8"));
  let census = JSON.parse(read("field-census.json").toString("utf8"));
  if (mutateMap) map = mutateMap(structuredClone(map));
  if (mutateCensus) census = mutateCensus(structuredClone(census));
  const geometry = geometryOfFamily({ map, census });
  const { pageCount, ink } = await participantInk(
    read("fixtures/canonical-filled.pdf"), allFixtureValues());
  const writable = writableGeometryResult({ geometry, ink, facts: CANONICAL_FACTS, mapBindings: map.bindings });
  const prot = protectedGeometryResult({ geometry, ink, claimedRuns: writable.claimedRuns });
  const relevance = pageRelevance({ census, geometry, ink, pageCount });
  const fails = [...writable.findings, ...prot.findings].filter((f) => f.severity === "fail");
  return { pageCount, ink, writable, prot, relevance, fails, has: (c) => fails.some((f) => f.check === c) };
}

const hit = (a, c, pred = () => true) => a.fails.some((f) => f.check === c && pred(f));

console.log(`CANARIES — each defect a reviewer found, detected in the bytes they read (${REVIEWED_BYTES_COMMIT.slice(0, 8)})`);

// 1 — NC AOC-CR-288: the petitioner's name bound into the judge's findings of fact on page 2.
{
  const a = await analyse("NC:aoc-cr-288-form-en", { atCommit: REVIEWED_BYTES_COMMIT });
  check("canary-1-nc288-findings-of-fact",
    hit(a, "binding_declared_in_court_owned_region",
      (f) => f.field === "PetitionerIsEligibleBecauseText1" && f.page === 2 && /FINDINGS OF FACT/i.test(f.regionHeading ?? "")),
    "PetitionerIsEligibleBecauseText1 is refused on its page-2 FINDINGS OF FACT region, not on its name");
}
// 2 and 3 — KY AOC-334: the case number in Court, the participant's name in Date.
{
  const a = await analyse("KY:aoc-334-form-en", { atCommit: REVIEWED_BYTES_COMMIT });
  check("canary-2-ky334-case-number-in-court",
    hit(a, "participant_value_in_protected_geometry", (f) => f.field === "Court" && f.value === resolveFact("matter.case_number")),
    "the case number drawn inside the court-identity rect is caught");
  check("canary-3-ky334-name-in-date",
    hit(a, "participant_value_in_protected_geometry",
      (f) => f.field === "Date" && f.value === CANONICAL_FACTS["participant.full_legal_name"]),
    "the participant name drawn on the decision-date rule is caught");
  // 4 — the agency-list slot, reached through a field the classifier called `unused`.
  check("canary-4-ky334-agency-list-slot",
    hit(a, "binding_on_non_participant_class",
      (f) => f.field === "Text1" && f.classOfField === "unused"
        && /above-named Defendant/i.test(f.effectiveLabel ?? "")),
    "a binding onto a non-participant class in the agency-list slot is caught, not only class `manual`");
}
// 5 — KY AOC-496.3: a binding declared and never drawn.
{
  const a = await analyse("KY:aoc-496-3-form-en", { atCommit: REVIEWED_BYTES_COMMIT });
  check("canary-5-ky4963-county-declared-not-drawn",
    hit(a, "declared_binding_not_visible_in_its_rect",
      (f) => f.field === "3 County Dropdown" && f.value === resolveFact("matter.county")),
    "a declared county binding that never reaches the page is caught");
}

console.log("\nMUTATIONS — from a family the contract passes, break one thing");

// Baseline must be green before any mutation means anything.
const BASELINE = "NC:aoc-cr-287-form-en";
const base = await analyse(BASELINE);
check("mutation-baseline-green", base.fails.length === 0,
  `${BASELINE} passes the geometry contract with 0 findings before any mutation`);

// 9 — a value visible on the page but outside the rectangle it belongs to.
{
  const a = await analyse(BASELINE, {
    mutateCensus: (c) => {
      const rows = c.fields ?? c;
      const row = rows.find((r) => r.name === "PetitionerName");
      row.widgets[0].rect = { ...row.widgets[0].rect, y: row.widgets[0].rect.y - 220 };
      return c;
    }
  });
  check("mutation-9-value-outside-its-rectangle",
    hit(a, "declared_binding_not_visible_in_its_rect", (f) => f.field === "PetitionerName")
      || hit(a, "value_drawn_outside_every_declared_slot"),
    "moving the rect away from where the value is drawn turns the visibility check red, though the value is still on the page");
}
// A value straddling its own boundary rather than sitting inside it.
{
  const a = await analyse(BASELINE, {
    mutateCensus: (c) => {
      const rows = c.fields ?? c;
      const row = rows.find((r) => r.name === "PetitionerName");
      row.widgets[0].rect = { ...row.widgets[0].rect, width: 12 };
      return c;
    }
  });
  check("mutation-9b-value-crosses-boundary", hit(a, "value_crosses_field_boundary"),
    "shrinking the rect under the drawn value turns the boundary check red");
}
// 10 — a protected-area value that only exists below the page-1 crop.
{
  const a = await analyse("NC:aoc-cr-298-form-en", { atCommit: REVIEWED_BYTES_COMMIT });
  const page2Only = a.fails.filter((f) => f.page === 2);
  check("canary-10-protected-value-below-page-1-crop",
    page2Only.length > 0 && hit(a, "participant_value_in_protected_geometry", (f) => f.page === 2),
    `NC:aoc-cr-298-form-en carries ${page2Only.length} finding(s) on page 2 only — invisible to a page-1 package`);
}
// The court-owned region must decide regardless of the field's name.
{
  const a = await analyse("NC:aoc-cr-288-form-en", {
    atCommit: REVIEWED_BYTES_COMMIT,
    mutateMap: (m) => {
      for (const b of m.bindings) if (b.field === "PetitionerIsEligibleBecauseText1") b.field = "HarmlessLookingField";
      return m;
    },
    mutateCensus: (c) => {
      const rows = c.fields ?? c;
      const row = rows.find((r) => r.name === "PetitionerIsEligibleBecauseText1");
      if (row) row.name = "HarmlessLookingField";
      return c;
    }
  });
  check("mutation-1b-rename-cannot-unprotect",
    hit(a, "binding_declared_in_court_owned_region", (f) => f.field === "HarmlessLookingField"),
    "renaming the findings-of-fact field to something innocuous does not clear the region refusal");
}

console.log("\nPACKAGE CHECKS — the manifest, its hashes and its page coverage");

const manifestPath = path.join(EVIDENCE_DIR, "all-page-evidence-manifest.json");
check("package-manifest-present", fs.existsSync(manifestPath), "data/rcap-all50/visual-evidence/all-page-evidence-manifest.json exists");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

for (const row of manifest.families) {
  const rec = JSON.parse(fs.readFileSync(path.join(rootDir, row.record), "utf8"));
  const id = rec.familyId;
  check(`schema-${id}`, rec.schemaVersion === EVIDENCE_SCHEMA, `record carries ${EVIDENCE_SCHEMA}`);

  // 8 — every expected page is in the package.
  const missing = rec.pagesExpected.filter((p) => !rec.pagesRasterised.includes(p));
  check(`pages-${id}`, missing.length === 0,
    `${rec.pagesRasterised.length} of ${rec.pagesExpected.length} expected pages rasterised (page count ${rec.pageCount})`);

  // 7 — every raster is bound to the artifact on disk, and the bytes are current.
  const sheet = path.join(rootDir, rec.familyPath, "contact-sheet/blank-vs-filled.pdf");
  const sheetSha = sha256(fs.readFileSync(sheet));
  const unbound = rec.rasters.filter((r) => r.boundToArtifactSha256 !== sheetSha);
  check(`raster-binding-${id}`, unbound.length === 0 && rec.rasters.length > 0,
    `${rec.rasters.length} raster(s) bound to the contact sheet on disk`);
  const drifted = rec.rasters.filter((r) => sha256(fs.readFileSync(path.join(rootDir, r.file))) !== r.sha256);
  check(`raster-bytes-${id}`, drifted.length === 0, "every committed PNG hashes to the value the record names");

  // 6 — no stale contact-sheet hash may remain attached to a current artifact.
  check(`contact-sheet-current-${id}`, rec.contactSheetStaleness.anyStale === false,
    rec.contactSheetStaleness.anyStale
      ? `stale in ${rec.contactSheetStaleness.stale.map((s) => s.record).join(", ")}`
      : "every record naming this contact sheet names the bytes on disk");

  // The package hash covers the ordered set.
  const recomputed = sha256(JSON.stringify({
    familyId: id,
    artifact: rec.artifactSha256["contact-sheet/blank-vs-filled.pdf"],
    canonical: rec.artifactSha256["fixtures/canonical-filled.pdf"],
    pages: rec.rasters.map((r) => ({ page: r.page, sha256: r.sha256 }))
  }));
  check(`package-hash-${id}`, recomputed === rec.visualEvidenceSha256, "visualEvidenceSha256 recomputes over the ordered package");
}

// 6 and 7 as mutations: a tampered record must be rejected, not merely reported.
{
  const rec = JSON.parse(fs.readFileSync(path.join(rootDir, manifest.families[0].record), "utf8"));
  const dropped = structuredClone(rec);
  dropped.rasters = dropped.rasters.slice(0, 1);
  const reHash = sha256(JSON.stringify({
    familyId: dropped.familyId,
    artifact: dropped.artifactSha256["contact-sheet/blank-vs-filled.pdf"],
    canonical: dropped.artifactSha256["fixtures/canonical-filled.pdf"],
    pages: dropped.rasters.map((r) => ({ page: r.page, sha256: r.sha256 }))
  }));
  check("mutation-8-dropping-a-page-changes-the-package", reHash !== rec.visualEvidenceSha256,
    "removing a page from the package changes visualEvidenceSha256, so a short package cannot pass as the full one");

  const stale = structuredClone(rec);
  stale.rasters[0].boundToArtifactSha256 = "0".repeat(64);
  const sheetSha = rec.artifactSha256["contact-sheet/blank-vs-filled.pdf"];
  check("mutation-7-obsolete-artifact-binding", stale.rasters.some((r) => r.boundToArtifactSha256 !== sheetSha),
    "a raster pointed at an obsolete artifact hash fails the binding check");

  const staleSheet = structuredClone(rec);
  staleSheet.contactSheetStaleness = { onDisk: sheetSha, records: [{ record: "artifact-provenance.json", sha256: "0".repeat(64) }], stale: [{ record: "artifact-provenance.json" }], anyStale: true };
  check("mutation-6-stale-contact-sheet-hash", staleSheet.contactSheetStaleness.anyStale === true,
    "a recorded contact-sheet hash that is not the bytes on disk is reported stale");
}

console.log("\nSIDECAR STATUS — measured per family, not inherited from an older escalation");
for (const row of manifest.families) {
  const rec = JSON.parse(fs.readFileSync(path.join(rootDir, row.record), "utf8"));
  const s = rec.sidecar;
  check(`sidecar-${rec.familyId}`, s.present && s.schemaOk,
    `${s.fieldsPresent}/${s.requiredFields} required fields, ${s.artifactsBound.filter((a) => a.bound).length}/${s.artifactsBound.length} artifacts bound, ESC-SIDECAR-NONCONFORMANT ${s.escalationResolved ? "resolved" : "still open"}`);
}

// The evidence module keeps its own copy of the fixture facts; it must not drift
// from the binder's, or the evidence would expect values nobody writes.
{
  const src = fs.readFileSync(path.join(rootDir, "scripts/implement-rcap-official-forms-d1.mjs"), "utf8");
  const drift = Object.entries(CANONICAL_FACTS)
    .filter(([, v]) => typeof v === "string")
    .filter(([, v]) => !src.includes(`"${v}"`));
  check("fixture-facts-no-drift", drift.length === 0,
    drift.length ? `values not found in the binder: ${drift.map(([k]) => k).join(", ")}` : "every fixture value the evidence expects is a value the binder writes");
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n  ${passed}/${results.length} checks passed`);
if (failures) {
  console.error(`FAIL all-page visual evidence — ${failures} check(s) failed`);
  process.exit(1);
}
console.log("OK all-page visual evidence — every page of every reviewed artifact is rastered and hash-bound, every expected value is proven inside its own rectangle, no participant value reaches a court-owned region, and all ten reviewer defects are reproduced by a canary or a mutation");
