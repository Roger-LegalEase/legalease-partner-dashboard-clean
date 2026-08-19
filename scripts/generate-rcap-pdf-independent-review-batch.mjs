#!/usr/bin/env node
// Which families are actually ready for an independent reviewer, and which are not.
//
//   node scripts/generate-rcap-pdf-independent-review-batch.mjs
//   node scripts/generate-rcap-pdf-independent-review-batch.mjs --check
//
// A review batch assembled by hand is a batch nobody can re-derive, and the
// first argument about whether a family belonged in it is unanswerable. So the
// batch is derived from the canonical generated evidence, every family the
// filter drops is recorded with the reason it was dropped, and the manifest is
// frozen before any reviewing starts.
//
// A family is in the batch when all of these hold:
//
//   1. it is not retired from the operational inventory;
//   2. it carries artifacts, and every one of them is present and finalized --
//      which in the audit's own terms means it parses, it is flattened, it is
//      byte-inspectable, it carries no active-content residue, no XFA survives,
//      a provenance record names it and matches its bytes, participant values
//      are in the content stream rather than only in widget appearances, and
//      the factory wrote no protected field;
//   3. a contact-sheet visibility proof exists for it;
//   4. that proof shows the blank and filled panels differ, measured against a
//      control that is known to differ. A sheet whose panels are identical is
//      not visibility-proven no matter how green the rest of the row is, and a
//      measurement whose control does not discriminate proves nothing either
//      way.
//
// Condition 4 is the one that does real work here: it is what separates a
// family whose fixture shows a fill from a family whose "canonical fixture" is
// the blank form.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT = path.join(rootDir, "data/rcap-all50/finalized-artifact-audit.json");
const VISUAL = path.join(rootDir, "data/rcap-all50/contact-sheet-visual-proof.json");
const FAILURES = path.join(rootDir, "data/rcap-all50/remaining-pdf-finalization-failures.json");
const OUT = path.join(rootDir, "data/rcap-all50/pdf-independent-reviews/batch-1-manifest.json");
const checkOnly = process.argv.includes("--check");

const readJson = (file) => {
  if (!fs.existsSync(file)) { console.error(`FAIL review batch — ${path.relative(rootDir, file)} is absent`); process.exit(1); }
  return JSON.parse(fs.readFileSync(file, "utf8"));
};
const sha256 = (file) => fs.existsSync(path.join(rootDir, file))
  ? createHash("sha256").update(fs.readFileSync(path.join(rootDir, file))).digest("hex") : null;

const audit = readJson(AUDIT);
const visual = readJson(VISUAL);
const failures = readJson(FAILURES);

const visualByFamily = new Map((visual.families ?? []).map((row) => [row.familyId, row]));
const failingFamilies = new Set((failures.rows ?? []).map((row) => row.familyId).filter(Boolean));

/**
 * The family's field map, and whether anything can record an approval of it.
 *
 * Two kinds of family package exist. A flat-overlay family carries
 * overlay-profile.json; an AcroForm-fill family carries
 * production-field-map.json. They are equally legitimate and both render.
 *
 * They are not equal in one respect that decides this batch:
 * scripts/rcap-official-forms/rcap-platform-ready.mjs -- the single shared
 * implementation of what "approved" means -- looks only for
 * overlay-profile.json, reads independentReview off it, and returns
 * "no overlay profile carries an independent review for this family" for
 * anything else. production-field-map.json has no independentReview field at
 * all, and nothing outside the D1 builders reads it.
 *
 * So an AcroForm-fill family has nowhere to put an approval, and therefore no
 * route to platform_ready however clean its review comes back. That is recorded
 * per family rather than discovered again by each reviewer.
 */
function fieldMapFor(familyPath) {
  const overlay = path.join(familyPath, "overlay-profile.json");
  const production = path.join(familyPath, "production-field-map.json");
  if (fs.existsSync(path.join(rootDir, overlay))) {
    return { fieldMapPath: overlay, fieldMapSha256: sha256(overlay), familyKind: "flat_overlay", approvalChannel: "overlay_profile.independentReview" };
  }
  if (fs.existsSync(path.join(rootDir, production))) {
    return {
      fieldMapPath: production, fieldMapSha256: sha256(production), familyKind: "acroform_fill",
      approvalChannel: "none_available",
      approvalChannelNote: "production-field-map.json carries no independentReview field, and rcap-platform-ready.mjs reads only overlay-profile.json. This family cannot be recorded as approved by the shared gate."
    };
  }
  return { fieldMapPath: null, fieldMapSha256: null, familyKind: "unknown", approvalChannel: "none_available" };
}

const included = [];
const excluded = [];

for (const family of audit.families ?? []) {
  const artifacts = family.artifacts ?? [];
  const proof = visualByFamily.get(family.familyId) ?? null;

  const drop = (reason, detail) => excluded.push({ familyId: family.familyId, reason, detail });

  if (family.retired) { drop("retired_from_operational_inventory", family.retirementBasis ?? null); continue; }
  if (artifacts.length === 0) { drop("no_artifacts", "the family carries no artifacts to review"); continue; }
  const unfinished = artifacts.filter((a) => !a.present || !a.finalized);
  if (unfinished.length > 0) {
    drop("not_finalized", `${unfinished.length} artifact(s) absent or not finalized: ${unfinished.map((a) => a.rel).join(", ")}`);
    continue;
  }
  if (failingFamilies.has(family.familyId)) { drop("named_in_the_remaining_failure_matrix", "the lane's own failure matrix still names this family"); continue; }
  if (!family.contactSheetProofPresent || !proof) { drop("no_visibility_proof", "no contact-sheet visibility proof exists for this family"); continue; }
  if (proof.panelsAreVisuallyIdentical === true) {
    drop("not_visibility_proven", "the contact sheet's blank and filled panels are visually identical, so the fixture does not demonstrate a fill");
    continue;
  }
  if (proof.controlDiscriminates === false) {
    drop("visual_measurement_does_not_discriminate", "the known-different control did not register as different, so the pixel measurement proves nothing either way");
    continue;
  }

  included.push({
    familyId: family.familyId,
    jurisdiction: family.jurisdiction,
    familySlug: family.familySlug,
    familyPath: family.relativePath,
    documentId: family.documentId,
    sourceSha256: family.sourceSha256,
    artifacts: artifacts.map((a) => ({ rel: a.rel, kind: a.kind, sha256: sha256(path.join(family.relativePath, a.rel)) })),
    contactSheetSha256: proof.contactSheetSha256 ?? null,
    renderedEvidence: proof.renderedEvidence ?? null,
    pagesOnSheet: proof.pagesOnSheet ?? null,
    controlDiscriminates: proof.controlDiscriminates ?? null,
    fieldClassificationSha256: sha256(path.join(family.relativePath, "field-classification.json")),
    ...fieldMapFor(family.relativePath),
    provenanceSha256: sha256(path.join(family.relativePath, "artifact-provenance.json"))
  });
}

included.sort((a, b) => a.familyId.localeCompare(b.familyId));

// Three disjoint groups, assigned round-robin over the sorted list so no
// jurisdiction lands entirely with one reviewer -- a reviewer who sees only one
// state's forms cannot notice that a defect is shared across states.
const groups = [[], [], []];
included.forEach((family, index) => { groups[index % 3].push(family.familyId); });

let reviewedHead = null;
try { reviewedHead = execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir, encoding: "utf8" }).trim(); } catch { /* not a clone */ }

const payload = {
  schemaVersion: "rcap-pdf-independent-review-batch/v1",
  generatedBy: "scripts/generate-rcap-pdf-independent-review-batch.mjs",
  purpose: "The exact set of form families that are automated-green and awaiting independent review, derived from the canonical evidence and frozen before reviewing starts.",
  batch: "batch-1",
  reviewedHead,
  derivedFrom: {
    finalizedArtifactAudit: "data/rcap-all50/finalized-artifact-audit.json",
    contactSheetVisualProof: "data/rcap-all50/contact-sheet-visual-proof.json",
    remainingFinalizationFailures: "data/rcap-all50/remaining-pdf-finalization-failures.json"
  },
  inclusionRule: [
    "not retired from the operational inventory",
    "every artifact present and finalized",
    "not named in the remaining-failure matrix",
    "a contact-sheet visibility proof exists",
    "the proof's blank and filled panels differ",
    "the proof's known-different control discriminates"
  ],
  totals: {
    familiesInspected: (audit.families ?? []).length,
    included: included.length,
    excluded: excluded.length,
    excludedByReason: excluded.reduce((acc, row) => { acc[row.reason] = (acc[row.reason] ?? 0) + 1; return acc; }, {}),
    byFamilyKind: included.reduce((acc, row) => { acc[row.familyKind] = (acc[row.familyKind] ?? 0) + 1; return acc; }, {}),
    withNoApprovalChannel: included.filter((row) => row.approvalChannel === "none_available").length
  },
  approvalChannelFinding: "An AcroForm-fill family has nowhere to record an independent approval. rcap-platform-ready.mjs reads independentReview from overlay-profile.json only, and an AcroForm-fill family carries production-field-map.json instead, which has no such field. Those families cannot reach platform_ready through the shared gate no matter how their review comes back. This is a gate gap, not a defect in any form, and it is the batch's largest single blocker.",
  groups: { group1: groups[0], group2: groups[1], group3: groups[2] },
  families: included,
  excluded: excluded.sort((a, b) => a.familyId.localeCompare(b.familyId))
};

const json = `${JSON.stringify(payload, null, 2)}\n`;
if (checkOnly) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== json) { console.error(`FAIL review batch — ${path.relative(rootDir, OUT)} is stale; re-run this generator`); process.exit(1); }
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
}

console.log(`OK review batch — ${included.length} families in batch-1 (${groups.map((g) => g.length).join("/")} across three reviewers); ${excluded.length} excluded`);
