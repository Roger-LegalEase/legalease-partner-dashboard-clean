#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
  OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
  buildLegalReviewMaterializationContract,
  buildOfficialPdfSourceProjection,
  stableJson,
  validateLegalReviewMaterializationContract,
  validateOfficialPdfSourceProjection
} from "./lib/rcap-factory/materialization-planning.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

verifyExact(
  LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
  buildLegalReviewMaterializationContract(ROOT),
  validateLegalReviewMaterializationContract
);
verifyExact(
  OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
  buildOfficialPdfSourceProjection(ROOT),
  validateOfficialPdfSourceProjection
);

const projection = readJson(OFFICIAL_PDF_SOURCE_PROJECTION_PATH);
const counts = projection.coverage.countsByDisposition;
const dispositionNames = [
  "deliberately_excluded_commercial_license",
  "exact_worker_assignable",
  // A completed acquisition decision settled the document's identity, but the
  // adopted edition manifests no asset for it, so there is no portable source
  // contract to assign. Distinct from unresolved_identity, which means nobody
  // has established what the document is.
  "identity_resolved_materialization_required",
  "legal_design_or_technical_policy_blocked",
  "local_scope_identity",
  "role_mismatch",
  "source_gated_identity",
  "unresolved_identity"
];
if (
  stableJson(Object.keys(counts).sort()) !==
  stableJson([...dispositionNames].sort()) ||
  dispositionNames.some(
    (disposition) =>
      !Number.isSafeInteger(counts[disposition]) || counts[disposition] < 0
  )
) {
  throw new Error(`Official-PDF disposition partition is invalid: ${JSON.stringify(counts)}.`);
}
const dispositionTotal = Object.values(counts).reduce(
  (total, count) => total + count,
  0
);
const reconciliation = readJson(
  "data/record-clearing/production-factory/official-pdf-source-contract-reconciliation.json"
);
if (
  dispositionTotal !== projection.coverage.queueIdentityCount ||
  dispositionTotal !==
    reconciliation.queueCoverage?.totals?.documentIdentities ||
  counts.exact_worker_assignable !==
    projection.coverage.assignmentEligibleCount ||
  counts.exact_worker_assignable !==
    reconciliation.portableAssignmentProjection?.exactWorkerAssignable
) {
  throw new Error("Official-PDF disposition totals do not reconcile to their source contracts.");
}
if (
  projection.identities.some(
    (identity) =>
      identity.assignmentEligible &&
      identity.disposition !== "exact_worker_assignable"
  )
) {
  throw new Error("A terminal or unresolved official-PDF identity is assignable.");
}
for (const forbidden of [
  "SDSC-CRM-307",
  "JDF-417-ORDER",
  "JDF-2370",
  "JDF-684",
  "FEE102"
]) {
  const row = projection.identities.find(
    (identity) => identity.queueOfficialFormId === forbidden
  );
  if (!row || row.assignmentEligible) {
    throw new Error(`${forbidden} may not be a worker assignment.`);
  }
}
if (
  projection.identities.some(
    (identity) =>
      identity.assignmentEligible &&
      (identity.officialDocument.canonicalAuthorityPath ?? "").includes(
        "JDF-418"
      ) &&
      identity.queueOfficialFormId === "JDF-417-ORDER"
  )
) {
  throw new Error("JDF-418 may not substitute for JDF-417-ORDER.");
}
const serialized = JSON.stringify({
  legalReviewAssignments: readJson(
    LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH
  ).assignmentCount,
  officialPdfIdentities: projection.coverage.queueIdentityCount,
  exactWorkerAssignable: projection.coverage.assignmentEligibleCount,
  unresolved: counts.unresolved_identity,
  result: "materialization_planning_verified"
});
process.stdout.write(`${serialized}\n`);

function verifyExact(relativePath, expected, validate) {
  const actual = readJson(relativePath);
  const issues = validate(actual);
  if (issues.length > 0) {
    throw new Error(`${relativePath} is invalid:\n- ${issues.join("\n- ")}`);
  }
  if (stableJson(actual) !== stableJson(expected)) {
    throw new Error(`${relativePath} is stale or not data-derived.`);
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}
