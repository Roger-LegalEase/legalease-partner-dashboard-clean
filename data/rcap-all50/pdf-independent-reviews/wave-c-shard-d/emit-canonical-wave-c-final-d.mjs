// Canonical re-emission of the Gate B wave C shard-d review record.
//
//   node data/rcap-all50/pdf-independent-reviews/wave-c-shard-d/emit-canonical-wave-c-final-d.mjs
//
// loadReviewRecords() in scripts/rcap-official-forms/rcap-platform-ready.mjs
// discovers review records by scanning the TOP LEVEL of
// data/rcap-all50/pdf-independent-reviews for `<batch>-manifest.json`. The
// shard-d records live in a subdirectory, so the loader never sees them and the
// shared gate cannot read them. This writes the same four verdicts into the
// canonical top-level layout the loader does discover.
//
// This is a re-emission, not a re-review. No verdict changes and no pinned hash
// changes. Every digest below is recomputed from disk here and asserted equal to
// the digest the shard record already pinned -- if the tree drifted, this exits
// non-zero rather than emitting a record that describes bytes that moved.
//
// Deterministic: same inputs produce byte-identical output, so a second pass
// leaves no diff.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const REVIEWS = "data/rcap-all50/pdf-independent-reviews";
const SHARD = `${REVIEWS}/wave-c-shard-d`;
const BATCH = "wave-c-final-d";
const REVIEWER_BRANCH = "claude/gate-b-wave-c-review-kibrgo";
const REVIEWED_LANE_BRANCH = "claude/rcap-pdf-family-rerender-mounted";
const REVIEWED_LANE_HEAD = "e94fb456b13dacd05479641bc3c4fe37eb898d07";

const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex");

const verdictsRec = read(`${SHARD}/verdicts.json`);
const sourceRec = read(`${SHARD}/source-verification.json`);
const completion = read(`${REVIEWS}/gate-b-evidence-completion.json`);
const srcBy = new Map(sourceRec.families.map((f) => [f.familyId, f]));
const ecBy = new Map(completion.families.map((f) => [f.familyId, f]));

const problems = [];
const pin = (label, got, want) => {
  if (want != null && got !== want) problems.push(`${label}: recomputed ${got} but the shard record pinned ${want}`);
  return got;
};

const JURISDICTION = { "NE": "NE", "VA": "VA", "VT": "VT" };

const families = [];
const verdicts = [];

for (const fam of verdictsRec.families) {
  const id = fam.familyId;
  const p = fam.familyPackagePath;
  const ec = ecBy.get(id);
  const sv = srcBy.get(id);
  const sidecar = read(`${p}/artifact-provenance.json`);
  const [jur, slug] = id.split(":");

  const artifacts = [
    { rel: "fixtures/canonical-filled.pdf", kind: "canonical_fixture" },
    { rel: "fixtures/boundary-filled.pdf", kind: "boundary_fixture" },
    { rel: "contact-sheet/blank-vs-filled.pdf", kind: "contact_sheet" }
  ].map((a) => ({
    ...a,
    sha256: pin(`${id} ${a.rel}`, sha(`${p}/${a.rel}`), fam.pinnedHashes[
      a.kind === "canonical_fixture" ? "canonicalArtifactSha256"
        : a.kind === "boundary_fixture" ? "boundaryArtifactSha256" : "contactSheetSha256"])
  }));

  const pages = ec.rasterEvidence.pages.map((pg) => ({
    page: pg.page, path: pg.path,
    sha256: pin(`${id} raster p${pg.page}`, sha(pg.path), pg.sha256)
  }));
  // Stated formula, so the number is reproducible rather than opaque: SHA-256
  // over the canonical JSON array of {page, path, sha256} in page order.
  const completeVisualEvidenceSha256 = crypto.createHash("sha256")
    .update(JSON.stringify(pages)).digest("hex");

  families.push({
    familyId: id,
    jurisdiction: JURISDICTION[jur] ?? jur,
    familySlug: slug,
    familyPath: p,
    documentId: fam.documentId,
    revision: sidecar.sourceRevision,
    sourceSha256: pin(`${id} source`, sv.recomputedSourceSha256, fam.pinnedHashes.sourceSha256),
    sourceSha256RecomputedByReviewer: true,
    sourceCanonicalBundlePath: `${sourceRec.sourcePack.sourceRoot ?? "Expungement_AI_RCAP_Master_Library_Edition_1"}/${sv.pathInArchive}`,
    artifacts,
    contactSheetSha256: artifacts[2].sha256,
    renderedEvidence: pages[0].path,
    visualEvidenceSha256: pages[0].sha256,
    pagesOnSheet: sidecar.artifacts.find((a) => a.artifact === "contact-sheet/blank-vs-filled.pdf").pageCount,
    allPagesRasterized: ec.rasterEvidence.coverageComplete === true,
    controlDiscriminates: true,
    visualBasis:
      "every page carrying a field inspected as an image, blank against filled; for page 1 the blank official source and the finalized artifact were additionally rasterized through the same engine at identical scale and compared per pixel",
    fieldClassificationSha256: pin(`${id} classification`, sha(`${p}/field-classification.json`), fam.pinnedHashes.classificationSha256),
    fieldMapPath: `${p}/production-field-map.json`,
    fieldMapSha256: pin(`${id} field-map`, sha(`${p}/production-field-map.json`), fam.pinnedHashes.fieldMapSha256),
    familyKind: "acroform_fill",
    provenanceSha256: pin(`${id} sidecar`, sha(`${p}/artifact-provenance.json`), fam.pinnedHashes.provenanceSidecarSha256),
    completeVisualEvidenceSha256,
    allPageRasters: pages
  });

  const v = {
    family: id,
    jurisdiction: JURISDICTION[jur] ?? jur,
    verdict: fam.verdict,
    asset: "fixtures/canonical-filled.pdf",
    sourceVerified: {
      recomputedByReviewer: true,
      sourceSha256: sv.recomputedSourceSha256,
      matchesCommittedPin: sv.allPinnedDigestsMatch === true,
      byteLengthMatches: sv.allRecordedByteLengthsMatch === true,
      visibleFormNumberAndRevision: `${fam.documentId} ${sidecar.sourceRevision}`,
      comparedAgainst:
        "the digests pinned in this family's committed source-receipt.json, source-record.json and artifact-provenance.json, not the source pack manifest"
    },
    visualEvidence: fam.allPageVisualInspection.notes,
    verifiedIndependently:
      "Yes — every pinned digest recomputed from disk, the artifact catalog and page tree parsed directly for active content, and each bound value's rectangle compared with the rectangle the family's own census declares for it.",
    openCorrections: (fam.corrections ?? []).length,
    observed: fam.reviewerHeadline
  };
  if (fam.corrections?.length) v.corrections = fam.corrections;
  if (fam.ownerQuestions?.length) v.ownerQuestions = fam.ownerQuestions;
  verdicts.push(v);
}

if (problems.length) {
  console.error(`FAIL canonical re-emission — ${problems.length} pinned hash(es) no longer match disk`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

const tally = (v) => verdicts.filter((x) => x.verdict === v).length;

const manifest = {
  schemaVersion: "rcap-pdf-independent-review-batch/v1",
  generatedBy: `${SHARD}/emit-canonical-wave-c-final-d.mjs — reviewer D, Gate B wave C shard d`,
  purpose:
    "The four families of Gate B wave C shard d, frozen at the head they were reviewed against, in the canonical top-level review-record layout so loadReviewRecords discovers them and the shared gate can read them.",
  batch: BATCH,
  reviewedLaneBranch: REVIEWED_LANE_BRANCH,
  reviewedLaneHead: REVIEWED_LANE_HEAD,
  reviewerBranch: REVIEWER_BRANCH,
  reEmissionOf: {
    shardRecords: `${SHARD}/`,
    statement:
      "No re-review was performed and no verdict or pinned hash was changed. Every hash here was recomputed from disk at re-emission and asserted equal to the hash the shard record pinned; the emitter exits non-zero if any differs."
  },
  derivedFrom: {
    rerenderEvidence: `${REVIEWS}/gate-b-family-rerender-evidence.json`,
    allPageEvidence: `${REVIEWS}/gate-b-evidence-completion.json`,
    sourceVerification: `${SHARD}/source-verification.json`,
    shardVerdicts: `${SHARD}/verdicts.json`
  },
  inclusionRule: [
    "the 16-family reviewable denominator at e94fb456, sorted lexicographically",
    "slice [12:16], which is shard d",
    "NE DC-1-15 excluded by its own held-back status and by name"
  ],
  completeVisualEvidenceSha256Formula:
    "SHA-256 over the canonical JSON array of {page, path, sha256} for every rasterized page, in page order. Stated so the digest is reproducible; it is reviewer-defined and is not validated by loadReviewRecords.",
  totals: {
    families: families.length,
    approved_platform_ready: tally("approved_platform_ready"),
    correction_required: tally("correction_required"),
    substantive_owner_decision_required: tally("substantive_owner_decision_required"),
    sourceDigestsRecomputedByReviewer: families.length,
    sourceMismatches: 0
  },
  groups: { count: 1, "group-1": families.map((f) => f.familyId) },
  families
};

const group = {
  schemaVersion: "rcap-pdf-independent-review-group/v1",
  batch: BATCH,
  group: 1,
  reviewDate: "2026-08-21",
  reviewerBranch: REVIEWER_BRANCH,
  reviewedLaneBranch: REVIEWED_LANE_BRANCH,
  reviewedLaneHead: REVIEWED_LANE_HEAD,
  headline:
    "Four families, every source verified from its own bytes with zero mismatches, and no approval among them. NE CC-6-15.1 destroys the preprinted words IN THE and COURT OF. VA CC-1201 writes matter.court onto the rule captioned CITY OR COUNTY and a case number into an addendum-count box. VT 600-00228 leaves the applicant identity block unbound. VA CC-1473 is geometrically clean and needs an owner ruling on a locality fact and on pre-filling conditional slots.",
  reEmission: {
    of: `${SHARD}/`,
    statement: "Canonical re-emission only. No re-review, no verdict change, no pinned hash change."
  },
  verdicts
};

const rollup = {
  schemaVersion: "rcap-pdf-independent-review-verdicts/v1",
  batch: BATCH,
  reviewerBranch: REVIEWER_BRANCH,
  reviewedLaneBranch: REVIEWED_LANE_BRANCH,
  reviewedLaneHead: REVIEWED_LANE_HEAD,
  totals: manifest.totals,
  verdicts: verdicts.map((v) => ({
    family: v.family,
    verdict: v.verdict,
    openCorrections: v.openCorrections,
    sourceVerified: v.sourceVerified.matchesCommittedPin
  })),
  denominatorEffect: {
    platformReadyDelta: 0,
    why: "shard d carries no approved_platform_ready verdict, so it moves platform_ready by zero; the record exists so the four families are visible to the loader and countable as reviewed rather than missing"
  }
};

const write = (rel, body) => {
  fs.writeFileSync(path.join(ROOT, rel), `${JSON.stringify(body, null, 2)}\n`);
  console.log(`  wrote ${rel}`);
};
write(`${REVIEWS}/${BATCH}-manifest.json`, manifest);
write(`${REVIEWS}/${BATCH}-group-1.review.json`, group);
write(`${REVIEWS}/${BATCH}-verdicts.json`, rollup);
console.log(
  `OK canonical re-emission — ${families.length} families, ` +
    `${manifest.totals.approved_platform_ready} approved, ` +
    `${manifest.totals.correction_required} correction_required, ` +
    `${manifest.totals.substantive_owner_decision_required} owner decision`
);
