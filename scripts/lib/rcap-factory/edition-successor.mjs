/**
 * Incremental successor-edition planning.
 *
 * The adopted Master Library edition is immutable and the successor is
 * currently one gate: Edition 1.3 depends on every authority job in the plan,
 * so a Hawaii application whose bytes, identity, role, scope and structure are
 * all settled waits on an unrelated Massachusetts retrieval that nobody has
 * been able to attend. Official-PDF work is the critical path and that gate is
 * what holds it.
 *
 * The model here replaces one gate with a sequence of closed ones:
 *
 *   1. Each published edition stays immutable. A tranche is a new edition, not
 *      an amendment to an old one.
 *   2. A successor edition may carry a closed, verified tranche rather than
 *      everything outstanding.
 *   3. An unresolved asset moves to the next successor rather than blocking
 *      every resolved asset beside it.
 *   4. A row is admitted only on exact authority, exact source identity, exact
 *      bytes where bytes apply, exact role, exact scope, a resolved licence,
 *      a deterministic manifest and predecessor lineage. Any one of those
 *      missing defers the row; nothing is admitted on a near miss.
 *   5. No unresolved row is silently omitted. Everything not admitted is named
 *      in the backlog with the exact thing that is missing.
 *   6. Runtime stays disabled. Publishing an edition establishes identity; it
 *      does not make a packet ready and does not enable anything.
 *
 * This module plans. It does not publish, does not write an archive, does not
 * touch an adopted edition and does not enable runtime.
 */

import fs from "node:fs";
import path from "node:path";

import { canonicalSha256 } from "./canonical-json.mjs";

export const EDITION_SUCCESSOR_PLAN_PATH =
  "data/record-clearing/master-library/edition-successor-plan.json";

const SOURCE_ACQUISITION_DIR =
  "data/record-clearing/production-factory/source-acquisition";
const AMENDMENT_HANDOFF_PATH =
  "data/record-clearing/production-factory/legal-design-decisions/authority-edition-amendment-handoff.json";
const ADOPTED_EDITION_PATH =
  "data/record-clearing/master-library/edition-1-2/edition.json";

const SHA256 = /^[0-9a-f]{64}$/u;

/** The eight conditions a row satisfies before it may be published. */
export const TRANCHE_ADMISSION_CRITERIA = Object.freeze([
  "exact_authority",
  "exact_source_identity",
  "exact_bytes_where_applicable",
  "exact_role",
  "exact_scope",
  "license_resolved",
  "deterministic_manifest",
  "predecessor_lineage"
]);

function readJsonIfPresent(rootDir, relativePath) {
  const absolute = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolute)) return null;
  try {
    return JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Every integrated decision that says something about the successor edition.
 *
 * Read from the decision records themselves rather than from a hand-kept list,
 * so a decision that lands later joins the plan by existing and a decision that
 * is reopened leaves it the same way.
 */
function readEditionDecisions(rootDir) {
  const directory = path.join(rootDir, SOURCE_ACQUISITION_DIR);
  if (!fs.existsSync(directory)) return [];
  const decisions = [];
  for (const name of fs.readdirSync(directory).sort()) {
    if (!name.endsWith(".json")) continue;
    let decision;
    try {
      decision = JSON.parse(
        fs.readFileSync(path.join(directory, name), "utf8")
      );
    } catch {
      continue;
    }
    const impact = decision.edition13Impact ?? null;
    const assetSpecification = decision.edition13AssetSpecification ?? null;
    if (!impact && !assetSpecification) continue;
    decisions.push({
      jobId: decision.jobId ?? name.replace(/\.json$/u, ""),
      jurisdiction: decision.jurisdiction ?? null,
      recordPath: `${SOURCE_ACQUISITION_DIR}/${name}`,
      impact,
      assetSpecification
    });
  }
  return decisions;
}

function assetRowFrom(decision) {
  const row = decision.assetSpecification?.assetRow;
  if (!row) return null;
  // Field names vary between decision records because each one was written by
  // the worker who measured it. The alternatives below are the names actually
  // used, not a speculative superset: a row is read or it is deferred, and a
  // row deferred because this function looked for the wrong key would be a
  // false blocker on real closed work.
  return {
    jurisdiction: decision.jurisdiction,
    canonicalIdentifier:
      row.canonicalIdentifier ?? row.documentId ?? row.identifier ?? null,
    workflowKey: row.workflowKey ?? row.proposedWorkflowKey ?? null,
    officialTitle: row.officialTitle ?? row.title ?? null,
    issuer: row.issuer ?? row.issuingAuthority ?? null,
    issuingOffice: row.issuingOffice ?? null,
    role: row.role ?? row.documentRole ?? null,
    scope: row.scope ?? null,
    revision: row.revision ?? null,
    language: row.language ?? null,
    assetClass: row.assetClass ?? null,
    canonicalPath:
      row.canonicalPath ??
      row.canonicalRelativePath ??
      row.canonicalAuthorityPath ??
      row.canonicalAuthorityPathProposal ??
      null,
    sourceUrl: row.sourceUrl ?? row.officialBinaryUrl ?? null,
    sha256: row.sha256 ?? null,
    bytes: row.bytes ?? null,
    mediaType: row.mediaType ?? null,
    pdfVersion: row.pdfVersion ?? null,
    pageCount: row.pageCount ?? null,
    structuralClass: row.structuralClass ?? null,
    licenseDisposition: row.licenseDisposition ?? null,
    supersedes: decision.assetSpecification?.supersessionRow ?? null
  };
}

/**
 * Evaluates one candidate against the eight criteria.
 *
 * Returns the criteria it meets and the exact things it is missing. A caller
 * never sees "not ready"; it sees which condition failed and why.
 */
function evaluateCandidate(candidate, lineage) {
  const missing = [];
  const impact = candidate.decision.impact ?? {};
  const spec = candidate.decision.assetSpecification ?? {};

  if (impact.publicationPerformed === true || spec.publicationPerformed === true) {
    missing.push({
      criterion: "exact_authority",
      detail: "the decision records a publication that this plan did not perform"
    });
  }

  const amendmentRequired =
    impact.editionAmendmentRequired === true ||
    impact.editionCorrectionRequired === true ||
    spec.editionAmendmentRequired === true;
  if (!amendmentRequired) {
    missing.push({
      criterion: "exact_authority",
      detail: "the decision does not require an edition amendment"
    });
  }

  const needsBytes =
    impact.requiresNewBytes === true || spec.requiresNewBytes === true;
  const row = candidate.assetRow;

  if (needsBytes) {
    if (!row) {
      missing.push({
        criterion: "exact_bytes_where_applicable",
        detail:
          "the decision requires new bytes and supplies no measured asset row; the measurement belongs to a technical-structure job"
      });
    } else {
      if (!SHA256.test(row.sha256 ?? "")) {
        missing.push({
          criterion: "exact_bytes_where_applicable",
          detail: "asset row carries no sha256"
        });
      }
      if (!Number.isSafeInteger(row.bytes) || row.bytes <= 0) {
        missing.push({
          criterion: "exact_bytes_where_applicable",
          detail: "asset row carries no positive byte count"
        });
      }
      if (!row.canonicalPath) {
        missing.push({
          criterion: "exact_source_identity",
          detail: "asset row carries no canonical path"
        });
      }
      if (!row.workflowKey && !row.canonicalIdentifier) {
        missing.push({
          criterion: "exact_source_identity",
          detail: "asset row carries no workflow key or canonical identifier"
        });
      }
      if (!row.role) {
        missing.push({ criterion: "exact_role", detail: "asset row carries no role" });
      }
      if (!row.scope) {
        missing.push({ criterion: "exact_scope", detail: "asset row carries no scope" });
      }
      if (!row.revision) {
        missing.push({
          criterion: "exact_source_identity",
          detail: "asset row carries no issuer revision"
        });
      }
      if (!row.assetClass) {
        missing.push({
          criterion: "exact_source_identity",
          detail: "asset row carries no asset class"
        });
      }
    }
  } else {
    // A metadata, mapping, role, scope or asset-class correction carries no
    // bytes and must instead name exactly which manifest rows it corrects.
    const handoff = candidate.handoffItems;
    if (handoff.length === 0) {
      missing.push({
        criterion: "exact_source_identity",
        detail:
          "a no-bytes correction must name the manifest rows it corrects; none were recorded"
      });
    }
    for (const item of handoff) {
      if (!item.from || !item.to) {
        missing.push({
          criterion: "exact_source_identity",
          detail: `${item.item ?? "handoff item"} does not record both the current and corrected value`
        });
      }
    }
  }

  if (
    impact.requiresLicenseDisposition === true ||
    spec.requiresLicenseDisposition === true
  ) {
    missing.push({
      criterion: "license_resolved",
      detail:
        impact.requiresLicenseDispositionNote ??
        spec.requiresLicenseDispositionNote ??
        "the publisher's commercial-use terms are unresolved"
    });
  }

  if (!lineage.parentEdition || !SHA256.test(lineage.parentArchiveSha256 ?? "")) {
    missing.push({
      criterion: "predecessor_lineage",
      detail: "the adopted edition record does not pin a parent edition and archive digest"
    });
  }

  return missing;
}

/**
 * Builds the successor-edition plan.
 *
 * `firstTrancheJobId` names the owner of the first incremental publication.
 * Naming it here rather than leaving it implied is the difference between a
 * plan and a wish.
 */
export function buildEditionSuccessorPlan(rootDir = process.cwd()) {
  const adopted = readJsonIfPresent(rootDir, ADOPTED_EDITION_PATH) ?? {};
  const handoff = readJsonIfPresent(rootDir, AMENDMENT_HANDOFF_PATH) ?? {};
  const decisions = readEditionDecisions(rootDir);

  const lineage = {
    parentEdition: adopted.edition ?? null,
    parentArchivePath: adopted.outputArchivePath ?? null,
    parentArchiveSha256: handoff.adoptedArchiveSha256 ?? null,
    parentArchiveRetained: adopted.outputArchivePath
      ? fs.existsSync(adopted.outputArchivePath)
      : false,
    grandparentArchivePath: adopted.parentArchivePath ?? null,
    grandparentArchiveRetained: adopted.parentArchivePath
      ? fs.existsSync(adopted.parentArchivePath)
      : false
  };

  const handoffByJob = new Map();
  for (const item of handoff.amendmentHandoffItems ?? []) {
    const key = item.establishedBy ?? item.jobId ?? null;
    if (!key) continue;
    handoffByJob.set(key, [...(handoffByJob.get(key) ?? []), item]);
  }

  const candidates = decisions.map((decision) => {
    const assetRow = assetRowFrom(decision);
    const handoffItems = [
      ...(handoffByJob.get(decision.jobId) ?? []),
      ...((decision.impact?.amendmentHandoffItems ?? []).filter(Boolean))
    ];
    const candidate = { decision, assetRow, handoffItems };
    const missing = evaluateCandidate(candidate, lineage);
    return {
      jobId: decision.jobId,
      jurisdiction: decision.jurisdiction,
      recordPath: decision.recordPath,
      requiresNewBytes:
        decision.impact?.requiresNewBytes === true ||
        decision.assetSpecification?.requiresNewBytes === true,
      assetRow,
      correctedManifestRows: handoffItems.flatMap((item) =>
        item.manifestRows ?? (item.manifestRow ? [item.manifestRow] : [])
      ),
      admitted: missing.length === 0,
      unmetCriteria: [...new Set(missing.map((entry) => entry.criterion))].sort(),
      blockers: missing
    };
  });

  const admitted = candidates
    .filter((candidate) => candidate.admitted)
    .sort((left, right) => left.jobId.localeCompare(right.jobId));
  const deferred = candidates
    .filter((candidate) => !candidate.admitted)
    .sort((left, right) => left.jobId.localeCompare(right.jobId));

  const tranche = {
    trancheId: "master-library-edition-1-3-tranche-1",
    successorEdition: "1.3",
    predecessorEdition: lineage.parentEdition,
    rows: admitted.map((candidate) => ({
      jobId: candidate.jobId,
      jurisdiction: candidate.jurisdiction,
      kind: candidate.requiresNewBytes ? "new_bytes" : "metadata_correction",
      assetRow: candidate.assetRow,
      correctedManifestRows: candidate.correctedManifestRows
    }))
  };

  return {
    schemaVersion: "rcap-master-library-edition-successor-plan/v1",
    generatedBy: "npm run rcap:plan-edition-successor",
    policy: {
      model: "incremental_immutable_successor_editions",
      publishedEditionsAreImmutable: true,
      trancheMustBeClosedAndVerified: true,
      unresolvedAssetsMoveToNextSuccessor: true,
      admissionCriteria: [...TRANCHE_ADMISSION_CRITERIA],
      noUnresolvedRowSilentlyOmitted: true,
      runtimeRemainsDisabledUntilPacketGatesPass: true,
      failClosed:
        "A row is admitted only when every admission criterion is satisfied exactly. A near miss defers; it never publishes."
    },
    lineage,
    firstTrancheJobId:
      "rcap-nationwide-master-library-edition-1-3-tranche-1-publication",
    terminalEditionJobId: "rcap-nationwide-master-library-edition-1-3-publication",
    publicationPerformed: false,
    editionMutated: false,
    runtimeStatus: "runtime_disabled",
    packetReady: false,
    totals: {
      candidatesRead: candidates.length,
      admitted: admitted.length,
      deferred: deferred.length,
      admittedNewBytes: admitted.filter((entry) => entry.requiresNewBytes).length,
      admittedMetadataCorrections: admitted.filter(
        (entry) => !entry.requiresNewBytes
      ).length,
      byUnmetCriterion: Object.fromEntries(
        TRANCHE_ADMISSION_CRITERIA.map((criterion) => [
          criterion,
          deferred.filter((entry) => entry.unmetCriteria.includes(criterion))
            .length
        ]).filter(([, count]) => count > 0)
      )
    },
    candidateTranche: tranche,
    trancheManifestSha256: canonicalSha256(tranche),
    successorBacklog: deferred.map((candidate) => ({
      jobId: candidate.jobId,
      jurisdiction: candidate.jurisdiction,
      recordPath: candidate.recordPath,
      unmetCriteria: candidate.unmetCriteria,
      blockers: candidate.blockers
    }))
  };
}

/** Fail-closed validation of a generated plan. */
export function validateEditionSuccessorPlan(plan) {
  const issues = [];
  if (plan.schemaVersion !== "rcap-master-library-edition-successor-plan/v1") {
    issues.push("unexpected schema version");
  }
  if (plan.publicationPerformed !== false) issues.push("a plan may not publish");
  if (plan.editionMutated !== false) issues.push("a plan may not mutate an edition");
  if (plan.runtimeStatus !== "runtime_disabled") issues.push("runtime must stay disabled");
  if (plan.packetReady !== false) issues.push("a plan may not make a packet ready");
  if (plan.totals.candidatesRead !== plan.totals.admitted + plan.totals.deferred) {
    issues.push("a candidate was neither admitted nor deferred; rows may not be dropped");
  }
  if (plan.candidateTranche.rows.length !== plan.totals.admitted) {
    issues.push("tranche row count does not match the admitted count");
  }
  if (plan.successorBacklog.length !== plan.totals.deferred) {
    issues.push("backlog length does not match the deferred count");
  }
  for (const entry of plan.successorBacklog) {
    if (!Array.isArray(entry.blockers) || entry.blockers.length === 0) {
      issues.push(`${entry.jobId} is deferred without an exact blocker`);
    }
  }
  for (const row of plan.candidateTranche.rows) {
    if (row.kind === "new_bytes") {
      if (!SHA256.test(row.assetRow?.sha256 ?? "")) {
        issues.push(`${row.jobId} is admitted with no digest`);
      }
      if (!Number.isSafeInteger(row.assetRow?.bytes) || row.assetRow.bytes <= 0) {
        issues.push(`${row.jobId} is admitted with no byte count`);
      }
    } else if (row.correctedManifestRows.length === 0) {
      issues.push(`${row.jobId} is admitted as a correction naming no manifest row`);
    }
  }
  if (canonicalSha256(plan.candidateTranche) !== plan.trancheManifestSha256) {
    issues.push("the tranche manifest digest does not match the tranche");
  }
  return issues;
}
