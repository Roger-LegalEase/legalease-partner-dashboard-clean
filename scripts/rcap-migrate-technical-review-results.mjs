#!/usr/bin/env node
//
// Captain-only: move legacy combined review results into the technical lane.
//
// The five R1 results were produced under an ownership model where one job
// asked a single worker for a page-by-page visual review *and* a
// completed-output legal review, into one file in the legal-review directory.
// R1 did the technical read and said so — every one of them records
// `reviewKind: technical_and_visual` and leaves the legal status pending — but
// the artifact sits at the legal-review path, where a later reader could count
// it as a legal review that nobody performed.
//
// This migrates the technical content to the technical-review path it belongs
// at, and replaces the legal-path artifact with an explicit marker saying what
// happened. Nothing is invented: the dispositions, packet hashes, page counts
// and provenance are carried across from what R1 actually wrote, and the
// original worker branches and commits are untouched and named in the record.
//
// The legal-review result stays absent, because it is.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEGAL_DIR =
  "data/record-clearing/production-factory/legal-output-reviews/completed-output";
const TECHNICAL_DIR =
  "data/record-clearing/production-factory/technical-visual-reviews/completed-output";

/**
 * The worker branch and commit behind each legacy result, so the migration
 * carries provenance rather than orphaning it.
 */
const R1_PROVENANCE = Object.freeze({
  "rcap-in-custom-pleading": {
    branch:
      "rcap-factory/rcap-in-custom-pleading-completed-output-review-d7e57136-4ebdd0a2",
    commit: "0491d8d5cadcb8ae93f01f55389ccd56be7a2154"
  },
  "rcap-ms-custom-pleading": {
    branch:
      "rcap-factory/rcap-ms-custom-pleading-completed-output-review-f20967d1-a312b2ef",
    commit: "94afccabbfad1618f60096ed5dce3df4f3ce80f9"
  },
  "rcap-nc-guidance-implementation": {
    branch:
      "rcap-factory/rcap-nc-guidance-implementation-completed-output-review-26ecc655-f5c2611c",
    commit: "6207781756b00807f7662ecb9f91d240a38b70b7"
  },
  "rcap-ok-guidance-implementation": {
    branch:
      "rcap-factory/rcap-ok-guidance-implementation-completed-output-review-a68a398b-3db5cd8b",
    commit: "de2f6de0736740618c6bb3e2ed8399c1d15be9a3"
  },
  "rcap-tn-guidance-implementation": {
    branch:
      "rcap-factory/rcap-tn-guidance-implementation-completed-output-review-59205efa-d46a4c57",
    commit: "17ec6733abd81d1685f2defd3d48aa961267085d"
  }
});

const write = process.argv.includes("--write");
const unsupported = process.argv.slice(2).filter((arg) => arg !== "--write");
if (unsupported.length > 0) {
  console.error(`Unsupported arguments: ${unsupported.join(", ")}`);
  process.exit(2);
}

const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;

try {
  const legalAbsolute = path.join(ROOT, LEGAL_DIR);
  const technicalAbsolute = path.join(ROOT, TECHNICAL_DIR);
  const migrated = [];

  for (const [implementationJobId, provenance] of Object.entries(
    R1_PROVENANCE
  )) {
    const legalPath = path.join(legalAbsolute, `${implementationJobId}.json`);
    const technicalPath = path.join(
      technicalAbsolute,
      `${implementationJobId}.json`
    );

    // The legacy artifact is the source of truth for what R1 found. Once the
    // migration has run, the technical record is, and the legacy marker no
    // longer carries the findings.
    let legacy = null;
    if (fs.existsSync(legalPath)) {
      const parsed = JSON.parse(fs.readFileSync(legalPath, "utf8"));
      if (parsed.schemaVersion !== "rcap-legacy-combined-review-migration/v1") {
        legacy = parsed;
      }
    }
    if (!legacy && fs.existsSync(technicalPath)) {
      // Already migrated; the technical record stands.
      migrated.push({ implementationJobId, action: "already_migrated" });
      continue;
    }
    if (!legacy) {
      migrated.push({ implementationJobId, action: "no_legacy_result" });
      continue;
    }

    const technical = {
      schemaVersion: "rcap-technical-visual-review/v1",
      reviewKind: "technical_visual_review",
      reviewShard: legacy.reviewShard ?? "R1",
      reviewSession: legacy.reviewSession ?? "SESSION_R1",
      jobId: `${implementationJobId}-technical-visual-review`,
      implementationJobId,
      jurisdiction: legacy.jurisdiction,
      lane: legacy.lane,
      implementationLane: legacy.implementationLane,
      trackIds: legacy.trackIds,
      implementationCompletionCommit: legacy.implementationCompletionCommit,
      baseCommit: legacy.baseCommit,
      authorityVersion: legacy.authorityVersion,
      authorityEdition: legacy.authorityEdition,
      // What R1 actually read, carried across unchanged.
      inputs: legacy.inputs,
      regeneration: legacy.regeneration,
      packets: legacy.packets,
      totals: legacy.totals,
      structuralChecks: legacy.structuralChecks,
      contentChecks: legacy.contentChecks,
      generatedArtifactTracking: legacy.generatedArtifactTracking,
      reviewManifestVisualChecklistAtReview:
        legacy.reviewManifestVisualChecklistAtReview,
      officialPdfComparison: legacy.officialPdfComparison,
      syntheticData: legacy.syntheticData,
      filingUseAllowed: legacy.filingUseAllowed,
      externalBlockers: legacy.externalBlockers,
      result: legacy.result,
      findings: legacy.findings,
      correctionRequired: legacy.correctionRequired,
      // Gates. Technical approval establishes nothing beyond itself.
      completedOutputLegalReview: "pending",
      counselAdopted: false,
      packetReady: false,
      productionEnabled: false,
      runtimeStatus: "runtime_disabled",
      provenance: {
        migratedFromCombinedArtifact: `${LEGAL_DIR}/${implementationJobId}.json`,
        originalWorkerBranch: provenance.branch,
        originalWorkerCommit: provenance.commit,
        originalReviewKind: legacy.reviewKind ?? null,
        note:
          "Produced by SESSION_R1 as technical and visual review only, before " +
          "technical and legal review had separate owners. The findings, packet " +
          "hashes, page counts and disposition are R1's and are unchanged."
      }
    };

    const marker = {
      schemaVersion: "rcap-legacy-combined-review-migration/v1",
      implementationJobId,
      legacyArtifact: "combined_technical_and_legal_review_path",
      technicalOnly: true,
      migrated: true,
      migratedTo: `${TECHNICAL_DIR}/${implementationJobId}.json`,
      completedOutputLegalReviewPerformed: false,
      completedOutputLegalReview: "pending",
      counselAdopted: false,
      packetReady: false,
      productionEnabled: false,
      runtimeStatus: "runtime_disabled",
      originalWorkerBranch: provenance.branch,
      originalWorkerCommit: provenance.commit,
      originalTechnicalResult: legacy.result,
      note:
        "This path is owned by the completed-output legal review, which has not " +
        "been performed. The artifact that stood here was a technical and visual " +
        "review recorded by SESSION_R1 under an ownership model that could not " +
        "distinguish the two reads. Its content is preserved in full at the " +
        "technical-review path above and in Git history; it is not a legal review " +
        "and must never be counted as one.",
      legacyContentSha256: crypto
        .createHash("sha256")
        .update(stable(legacy))
        .digest("hex")
    };

    if (write) {
      fs.mkdirSync(technicalAbsolute, { recursive: true });
      fs.writeFileSync(technicalPath, stable(technical));
      fs.writeFileSync(legalPath, stable(marker));
    }
    migrated.push({
      implementationJobId,
      action: "migrated",
      result: legacy.result
    });
  }

  for (const entry of migrated) {
    console.log(
      `  ${entry.action.padEnd(18)} ${entry.implementationJobId}${
        entry.result ? ` (${entry.result})` : ""
      }`
    );
  }
  console.log(
    write
      ? "Legacy combined review results migrated. No legal review was performed or claimed."
      : "Dry run. Re-run with --write."
  );
} catch (error) {
  console.error(`RCAP technical-review migration failed: ${error.message}`);
  process.exitCode = 1;
}
