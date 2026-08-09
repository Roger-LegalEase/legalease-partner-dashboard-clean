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

import crypto from "node:crypto";
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
const CONTAINER_LOSS_DETERMINATION_PATH =
  "data/record-clearing/master-library/edition-1-1-container-loss-determination.json";

/**
 * Finds the bytes an asset row describes, or reports that they are absent.
 *
 * Searches the sealed materialization root for a file of the recorded size, then
 * confirms its digest. Size first because hashing every candidate is wasteful
 * and a size mismatch already settles it.
 */
function locateAssetBytes(row) {
  const rootDir =
    typeof process.env.RCAP_SOURCE_MATERIALIZATION_ROOT === "string" &&
    process.env.RCAP_SOURCE_MATERIALIZATION_ROOT.trim() !== ""
      ? process.env.RCAP_SOURCE_MATERIALIZATION_ROOT
      : null;
  if (!rootDir || !fs.existsSync(rootDir)) return null;
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(next);
        continue;
      }
      if (!entry.isFile()) continue;
      let size;
      try {
        size = fs.statSync(next).size;
      } catch {
        continue;
      }
      if (size !== row.bytes) continue;
      const digest = crypto
        .createHash("sha256")
        .update(fs.readFileSync(next))
        .digest("hex");
      if (digest === row.sha256) return next;
    }
  }
  return null;
}

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
    // `edition13Impact` is the usual name. Delaware's 281E correction records
    // the identical thing under `editionCorrection`, because the worker who
    // measured it named the field after what it is rather than after the
    // edition it lands in. Reading only the first name would make a closed,
    // fully evidenced correction invisible to the successor plan — the same
    // false-blocker failure `assetRowFrom` already guards against.
    const impact =
      decision.edition13Impact ?? decision.editionCorrection ?? null;
    const assetSpecification = decision.edition13AssetSpecification ?? null;
    if (!impact && !assetSpecification) continue;
    decisions.push({
      jobId: decision.jobId ?? name.replace(/\.json$/u, ""),
      jurisdiction: decision.jurisdiction ?? null,
      recordPath: `${SOURCE_ACQUISITION_DIR}/${name}`,
      impact,
      assetSpecification,
      raw: decision
    });
  }
  return decisions;
}

/**
 * Handoff items a record states structurally rather than as a handoff list.
 *
 * A no-bytes correction is admissible only if it names both the current and
 * the corrected value for every manifest row it touches. Most records say that
 * in `amendmentHandoffItems`. Delaware's 281E correction says exactly the same
 * thing in `roleDefect` — the wrong role and workflow key it measured on the
 * live edition row, and the corrected role it established with five pieces of
 * cited evidence — because the job was written as a defect report.
 *
 * This reads those pairs and nothing else. Where a record does not state both
 * sides, nothing is produced and the candidate defers on the existing
 * criterion; no value is inferred, completed or supplied on a worker's behalf.
 */
function derivedHandoffItems(decision) {
  const defect = decision.raw?.roleDefect ?? null;
  const correction = decision.impact ?? null;
  if (!defect || !correction) return [];
  const current = defect.editionRecords ?? {};
  const items = [];

  if (correction.requiresRoleCorrection === true && current.documentRole && defect.correctRole) {
    items.push({
      item: "document_role",
      from: current.documentRole,
      to: defect.correctRole,
      manifestRow: current.workflowKey ?? null,
      evidence: defect.evidenceForTheCorrectRole ?? null
    });
  }
  if (
    correction.requiresWorkflowKeyCorrection === true &&
    current.workflowKey &&
    defect.correctedWorkflowKey
  ) {
    items.push({
      item: "workflow_key",
      from: current.workflowKey,
      to: defect.correctedWorkflowKey,
      manifestRow: current.workflowKey
    });
  }
  if (
    correction.requiresCanonicalPathRegeneration === true &&
    current.workflowKey &&
    defect.canonicalPathConsequence
  ) {
    items.push({
      item: "canonical_path",
      from: "the path generated from the uncorrected role",
      to: defect.canonicalPathConsequence,
      manifestRow: current.workflowKey
    });
  }
  if (
    correction.requiresTitleQualification === true &&
    correction.requiresTitleQualificationDetail
  ) {
    // Explicitly not a title replacement: the form-face caption stays, and the
    // issuer's own role-bearing index title is recorded alongside it.
    items.push({
      item: "title_qualification",
      from: "the form-face caption alone",
      to: correction.requiresTitleQualificationDetail,
      manifestRow: current.workflowKey ?? null
    });
  }
  if (correction.requiresPrimaryFilingGuard === true) {
    const guard = decision.raw?.primaryFilingSatisfactionFinding ?? null;
    items.push({
      item: "primary_filing_guard",
      from: "no bar recorded; the row is reachable for a primary_filing component",
      to:
        correction.requiresPrimaryFilingGuardDetail ??
        "the row may not satisfy a primary_filing component",
      manifestRow: current.workflowKey ?? null,
      componentAtRisk: guard?.componentAtRisk ?? null
    });
  }
  return items;
}

/**
 * Every asset row a decision carries, in a deterministic order.
 *
 * One decision described one asset, so the reader took `assetRow`, singular.
 * A record that measures five documents in one pass then had two ways to be
 * read and both were wrong: name one of the five and four disappear without a
 * trace, or name none and the whole record defers as though it supplied no
 * measurement at all. Massachusetts hit the second — five rows, all correct,
 * all invisible — and the worker refused to nominate one, which was right.
 *
 * A record may now carry `assetRows` and be read whole. Singular records are
 * untouched and still yield exactly one row. Order is the record's own, so the
 * plan is byte-stable; anything malformed fails closed rather than shrinking
 * the set quietly.
 */
function assetRowsFrom(decision) {
  const spec = decision.assetSpecification ?? {};
  const declared = Array.isArray(spec.assetRows)
    ? spec.assetRows
    : spec.assetRow
      ? [spec.assetRow]
      : [];
  if (declared.length === 0) return { rows: [], failures: [] };

  const failures = [];
  const rows = [];
  const seenIdentifiers = new Set();
  const seenPaths = new Set();
  for (const [index, raw] of declared.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      failures.push(`asset row ${index} is not an object`);
      continue;
    }
    const row = normalizeAssetRow(decision, raw);
    if (!row.canonicalIdentifier) {
      failures.push(`asset row ${index} carries no canonical identifier`);
      continue;
    }
    // A repeated identifier or canonical path means two rows claim one asset.
    // Whichever is right, the record cannot say, and silently keeping the first
    // would publish an identity nobody chose.
    if (seenIdentifiers.has(row.canonicalIdentifier)) {
      failures.push(
        `asset row ${index} repeats canonical identifier ${row.canonicalIdentifier}`
      );
      continue;
    }
    if (row.canonicalPath && seenPaths.has(row.canonicalPath)) {
      failures.push(
        `asset row ${index} repeats canonical path ${row.canonicalPath}`
      );
      continue;
    }
    seenIdentifiers.add(row.canonicalIdentifier);
    if (row.canonicalPath) seenPaths.add(row.canonicalPath);
    rows.push(row);
  }
  return { rows, failures };
}

function normalizeAssetRow(decision, row) {
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
    supersedes:
      row.supersedes ?? decision.assetSpecification?.supersessionRow ?? null
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
      // A measurement is evidence about an asset; it is not the asset. Admitting
      // a row on its recorded sha and byte count alone means admitting a row
      // whose bytes may not exist anywhere the publisher can reach — and the
      // publisher has to write a file, not a hash. Hawaii is the case: HCJDC
      // 159(b) is measured exactly and its bytes were never materialized here,
      // so the row passed every recorded check and could not have been
      // published. Require that the bytes are locatable and match.
      if (SHA256.test(row.sha256 ?? "") && !locateAssetBytes(row)) {
        missing.push({
          criterion: "exact_bytes_where_applicable",
          detail:
            `the asset row is measured exactly but its bytes are not retrievable in this ` +
            `environment: no file matching sha256 ${row.sha256} was found beneath the ` +
            `materialization root. A row cannot be published into an archive from its ` +
            `measurement alone.`
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

  // Retention is a digest question, not a filesystem question.
  //
  // This read `fs.existsSync` alone, which means any file at the canonical path
  // counted as the retained archive. That is the possession-for-permission
  // error wearing different clothes: a published edition is identified by its
  // bytes, and a path is not a byte. It surfaced when a re-compressed copy of
  // Edition 1.1 — authentic content, `__MACOSX` resource forks, a different
  // container and therefore a different digest — was placed at the canonical
  // location and the plan immediately reported the grandparent as retained.
  //
  // `verified` is the only field a caller may treat as lineage. `present` is
  // kept because "absent" and "present but not the pinned archive" are
  // different problems with different fixes, and collapsing them would send
  // someone hunting for a missing file that is sitting right there.
  const containerLoss = readJsonIfPresent(
    rootDir,
    CONTAINER_LOSS_DETERMINATION_PATH
  );
  const archiveState = (archivePath, expectedSha256) => {
    if (!archivePath) {
      return { path: null, present: false, verified: false, reason: "no path recorded" };
    }
    if (!fs.existsSync(archivePath)) {
      return { path: archivePath, present: false, verified: false, reason: "archive absent" };
    }
    if (!SHA256.test(expectedSha256 ?? "")) {
      return {
        path: archivePath,
        present: true,
        verified: false,
        reason: "no expected digest recorded to verify against"
      };
    }
    const actual = crypto
      .createHash("sha256")
      .update(fs.readFileSync(archivePath))
      .digest("hex");
    if (actual === expectedSha256) {
      return {
        path: archivePath,
        present: true,
        verified: true,
        actualSha256: actual,
        expectedSha256,
        reason: null
      };
    }
    // A published archive can be lost while its content survives. Where the
    // project owner has recorded that and named this exact substitute digest,
    // lineage stands on the substitute — and says so on every row, so no reader
    // mistakes it for the published container. Any other file still fails.
    if (
      containerLoss &&
      containerLoss.substitute?.sha256 === actual &&
      containerLoss.pinnedArchive?.sha256 === expectedSha256 &&
      containerLoss.authorization?.authorizedBy &&
      containerLoss.substitute?.contentVerification?.entriesFailed === 0
    ) {
      return {
        path: archivePath,
        present: true,
        verified: true,
        verifiedOnSubstitute: true,
        publishedContainerLost: true,
        actualSha256: actual,
        expectedSha256,
        contentChecksumsPassed:
          containerLoss.substitute.contentVerification.entriesPassed,
        authorizedBy: containerLoss.authorization.authorizedBy,
        determinationPath: CONTAINER_LOSS_DETERMINATION_PATH,
        reason:
          "published container lost; standing on the content-verified substitute recorded by the project owner"
      };
    }
    return {
      path: archivePath,
      present: true,
      verified: false,
      actualSha256: actual,
      expectedSha256,
      reason:
        "archive present but its digest is not the published edition's; a re-archived copy is not the archive"
    };
  };

  const parentState = archiveState(
    adopted.outputArchivePath ?? null,
    handoff.adoptedArchiveSha256 ?? null
  );
  const grandparentState = archiveState(
    adopted.parentArchivePath ?? null,
    adopted.parentArchiveSha256 ?? null
  );

  const lineage = {
    parentEdition: adopted.edition ?? null,
    parentArchivePath: adopted.outputArchivePath ?? null,
    parentArchiveSha256: handoff.adoptedArchiveSha256 ?? null,
    parentArchivePresent: parentState.present,
    parentArchiveRetained: parentState.verified,
    parentArchiveState: parentState,
    grandparentArchivePath: adopted.parentArchivePath ?? null,
    grandparentArchiveSha256: adopted.parentArchiveSha256 ?? null,
    grandparentArchivePresent: grandparentState.present,
    grandparentArchiveRetained: grandparentState.verified,
    grandparentArchiveState: grandparentState
  };

  const handoffByJob = new Map();
  for (const item of handoff.amendmentHandoffItems ?? []) {
    const key = item.establishedBy ?? item.jobId ?? null;
    if (!key) continue;
    handoffByJob.set(key, [...(handoffByJob.get(key) ?? []), item]);
  }

  // One candidate per asset row, and one row-less candidate for a decision that
  // measures nothing — a metadata correction is still a candidate. A decision
  // carrying five rows is therefore five candidates, evaluated on their own
  // merits, and a row that fails takes no sibling with it.
  const candidates = decisions.flatMap((decision) => {
    const { rows, failures } = assetRowsFrom(decision);
    const handoffItems = [
      ...(handoffByJob.get(decision.jobId) ?? []),
      ...((decision.impact?.amendmentHandoffItems ?? []).filter(Boolean)),
      ...derivedHandoffItems(decision)
    ];
    const correctedManifestRows = handoffItems.flatMap((item) =>
      item.manifestRows ?? (item.manifestRow ? [item.manifestRow] : [])
    );
    const requiresNewBytes =
      decision.impact?.requiresNewBytes === true ||
      decision.assetSpecification?.requiresNewBytes === true;
    const build = (assetRow, extraBlockers = []) => {
      const missing = [
        ...extraBlockers,
        ...evaluateCandidate({ decision, assetRow, handoffItems }, lineage)
      ];
      return {
        jobId: decision.jobId,
        // A decision that emits more than one row needs more than one
        // candidate key, or two rows collide in every downstream report.
        candidateId: assetRow?.canonicalIdentifier
          ? `${decision.jobId}::${assetRow.canonicalIdentifier}`
          : decision.jobId,
        jurisdiction: decision.jurisdiction,
        recordPath: decision.recordPath,
        requiresNewBytes,
        assetRow,
        correctedManifestRows,
        admitted: missing.length === 0,
        unmetCriteria: [...new Set(missing.map((entry) => entry.criterion))].sort(),
        blockers: missing
      };
    };
    // A malformed row is reported against the decision that carries it and
    // never removes a sibling that is well formed.
    const malformed = failures.map((detail) => ({
      criterion: "exact_source_identity",
      detail
    }));
    if (rows.length === 0) {
      return [build(null, malformed)];
    }
    const built = rows.map((row) => build(row));
    if (malformed.length > 0) {
      built.push({
        jobId: decision.jobId,
        candidateId: `${decision.jobId}::malformed-rows`,
        jurisdiction: decision.jurisdiction,
        recordPath: decision.recordPath,
        requiresNewBytes,
        assetRow: null,
        correctedManifestRows,
        admitted: false,
        unmetCriteria: ["exact_source_identity"],
        blockers: malformed
      });
    }
    return built;
  });

  const byCandidateId = (left, right) =>
    left.candidateId.localeCompare(right.candidateId);
  const admitted = candidates.filter((candidate) => candidate.admitted).sort(byCandidateId);
  const deferred = candidates.filter((candidate) => !candidate.admitted).sort(byCandidateId);

  const tranche = {
    trancheId: "master-library-edition-1-3-tranche-1",
    successorEdition: "1.3",
    predecessorEdition: lineage.parentEdition,
    // Deliberately not carrying candidateId. Tranche 1 is published and its
    // publication record pins this manifest digest; adding a field to an
    // admitted row would move the digest and make a published tranche read as
    // outstanding work. The backlog carries the identifier instead, which is
    // where a multi-row decision actually needs telling apart.
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
      candidateId: candidate.candidateId,
      ...(candidate.assetRow?.canonicalIdentifier
        ? { canonicalIdentifier: candidate.assetRow.canonicalIdentifier }
        : {}),
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
