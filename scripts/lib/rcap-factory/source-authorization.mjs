/**
 * Whether a source may be *used*, as distinct from whether we hold it.
 *
 * Colorado exposed the model error. Twelve JDF receipts are real: the bytes
 * are materialized, the hashes and sizes verify, the files are mode 444 under
 * a sealed root. The controlling licence decision is equally real and terminal
 * — `written_permission_required`, `licenseAdopted: false`,
 * `generationAllowed: false`. Both statements are true at once, and the
 * factory had no way to say so, because byte verification alone produced
 * `worker_ready`. Possession was being read as permission.
 *
 * They are different kinds of fact and they come from different places:
 *
 *   - materialization is evidence custody, established by measuring bytes;
 *   - generation authorization is a legal decision, established by counsel;
 *   - worker assignment is a production-planning decision;
 *   - runtime enablement is a release decision.
 *
 * This module owns the second one only, and answers it from the integrated
 * decision corpus rather than from a jurisdiction list. A Colorado-only branch
 * would have fixed Colorado and left the next jurisdiction to be discovered by
 * accident — which is exactly how Colorado was found.
 *
 * Nothing here deletes, rewrites or invalidates a receipt. A receipt records
 * what was measured; this records what is permitted.
 */

import fs from "node:fs";
import path from "node:path";

const SOURCE_ACQUISITION_DIR =
  "data/record-clearing/production-factory/source-acquisition";
const PENDING_EDITION_AMENDMENTS_PATH =
  "data/record-clearing/master-library/pending-edition-amendments.json";
const SOURCE_ACQUISITION_QUEUE_PATH =
  "data/record-clearing/master-library/source-acquisition-queue.json";

/**
 * Every verdict this layer can reach. Two permit use; three withhold it.
 */
export const SOURCE_AUTHORIZATION_VERDICTS = Object.freeze([
  "authorized",
  "no_license_restriction",
  "written_permission_required",
  "deliberately_excluded_commercial_license",
  "license_unresolved"
]);

/**
 * The only verdicts under which a verified source may become worker-ready.
 * Everything else withholds, including "we have not decided" — absence of a
 * decision is never permission.
 */
const PERMITTING_VERDICTS = new Set(["authorized", "no_license_restriction"]);

export function permitsGeneration(verdict) {
  return PERMITTING_VERDICTS.has(verdict);
}

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
 * Classifies one integrated licence decision.
 *
 * Read from the decision's own terminal disposition, so a decision that says
 * what it means is honoured and one that does not falls closed rather than
 * being guessed into a permission.
 */
function verdictFor(decision) {
  const disposition = String(decision.terminalDisposition ?? "");
  const adopted = decision.licenseAdopted;
  const generationAllowed = decision.generationAllowed;

  if (adopted === true && generationAllowed === true) return "authorized";
  if (/deliberately_excluded/iu.test(disposition)) {
    return "deliberately_excluded_commercial_license";
  }
  if (/written_permission_required/iu.test(disposition)) {
    return "written_permission_required";
  }
  if (adopted === false || generationAllowed === false) {
    // Refused, but not in a vocabulary this layer recognises. Withhold.
    return "license_unresolved";
  }
  return "license_unresolved";
}

/**
 * Builds the authorization index from the integrated corpus.
 *
 * `licenseRequiredJurisdictions` is the set where the repository has already
 * recorded that a commercial-use question is open — an edition amendment held
 * for commercial use, or an acquisition row dispositioned `commercial_use_hold`.
 * In those jurisdictions the absence of a decision is an unanswered question,
 * not the absence of a restriction, and it fails closed. Everywhere else, no
 * recorded question means no gate to apply: this layer does not invent
 * blockers for jurisdictions nobody has raised a licence question about.
 */
export function buildSourceAuthorizationIndex(rootDir = process.cwd()) {
  const decisions = new Map();
  const directory = path.join(rootDir, SOURCE_ACQUISITION_DIR);
  if (fs.existsSync(directory)) {
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
      const carriesLicenceFinding =
        decision?.strategyFamily === "commercial_license" ||
        typeof decision?.licenseAdopted === "boolean" ||
        typeof decision?.generationAllowed === "boolean";
      if (!carriesLicenceFinding) continue;
      if (typeof decision.jurisdiction !== "string") continue;

      // A decision may scope itself to named documents (Kansas lists the nine
      // Judicial Council forms) or cover a family with no list (Colorado's JDF
      // licence names no documents because it covers all of them).
      const scopedDocumentIds = Array.isArray(decision.excludedDocuments)
        ? new Set(
            decision.excludedDocuments
              .map((entry) => entry?.documentId)
              .filter(Boolean)
          )
        : null;

      decisions.set(decision.jurisdiction, {
        jurisdiction: decision.jurisdiction,
        decisionJobId: decision.jobId ?? name.replace(/\.json$/u, ""),
        verdict: verdictFor(decision),
        licenseAdopted: decision.licenseAdopted === true,
        generationAllowed: decision.generationAllowed === true,
        terminalDisposition: decision.terminalDisposition ?? null,
        scopedDocumentIds:
          scopedDocumentIds && scopedDocumentIds.size > 0
            ? scopedDocumentIds
            : null
      });
    }
  }

  const licenseRequired = new Set();
  const amendments = readJsonIfPresent(rootDir, PENDING_EDITION_AMENDMENTS_PATH);
  for (const candidate of amendments?.candidates ?? []) {
    if (candidate?.disposition === "hold_commercial_use" && candidate.jurisdiction) {
      licenseRequired.add(candidate.jurisdiction);
    }
  }
  const queue = readJsonIfPresent(rootDir, SOURCE_ACQUISITION_QUEUE_PATH);
  for (const row of queue?.rows ?? []) {
    if (row?.edition12Disposition === "commercial_use_hold" && row.jurisdiction) {
      licenseRequired.add(row.jurisdiction);
    }
  }

  return {
    schemaVersion: "rcap-source-authorization/v1",
    decisions,
    licenseRequiredJurisdictions: licenseRequired
  };
}

/**
 * The authorization verdict for one source.
 *
 * `documentId` matters only where a decision scopes itself to named documents.
 */
export function authorizationFor(index, { jurisdiction, documentId = null } = {}) {
  const decision = index?.decisions?.get(jurisdiction) ?? null;
  if (decision) {
    const inScope =
      decision.scopedDocumentIds === null ||
      (documentId !== null && decision.scopedDocumentIds.has(documentId));
    if (inScope) {
      return {
        verdict: decision.verdict,
        generationAllowed: permitsGeneration(decision.verdict),
        licenseAdopted: decision.licenseAdopted,
        workerReadAuthorized: permitsGeneration(decision.verdict),
        blocker: permitsGeneration(decision.verdict)
          ? null
          : decision.verdict === "written_permission_required"
            ? "written_permission_required"
            : decision.verdict,
        decisionJobId: decision.decisionJobId
      };
    }
    // A scoped decision that does not reach this document leaves it to the
    // jurisdiction-level question below rather than silently permitting it.
  }

  if (index?.licenseRequiredJurisdictions?.has(jurisdiction)) {
    return {
      verdict: "license_unresolved",
      generationAllowed: false,
      licenseAdopted: false,
      workerReadAuthorized: false,
      blocker: "license_unresolved",
      decisionJobId: null
    };
  }

  return {
    verdict: "no_license_restriction",
    generationAllowed: true,
    licenseAdopted: false,
    workerReadAuthorized: true,
    blocker: null,
    decisionJobId: null
  };
}

/**
 * The seven lifecycle facts, derived and kept apart.
 *
 * `receiptVerified` is evidence: bytes, hash, size and identity measured.
 * `authorization` is permission. `otherGatesPass` is everything else the
 * production planner already requires. None of the three is inferred from
 * either of the others.
 */
export function deriveSourceLifecycle({
  receiptVerified = false,
  authorization,
  otherGatesPass = true
} = {}) {
  const permitted = authorization?.workerReadAuthorized === true;
  const workerReady = receiptVerified && permitted && otherGatesPass;
  return {
    // 1-4: evidence custody. True on their own terms, whatever permission says.
    sourceIdentityExact: receiptVerified,
    binaryMaterialized: receiptVerified,
    binaryHashVerified: receiptVerified,
    internalEvidenceRetained: receiptVerified,
    // 5-7: permission, planning and release. Each independently withheld.
    generationAllowed: permitted,
    licenseAdopted: authorization?.licenseAdopted === true,
    workerReadAuthorized: permitted,
    workerReady,
    implementationAssignable: workerReady,
    runtimeEnabled: false,
    disposition:
      receiptVerified && !permitted
        ? "materialized_evidence_generation_permission_required"
        : workerReady
          ? "materialized_evidence_worker_ready"
          : "binary_materialization_required",
    blocker: authorization?.blocker ?? null
  };
}
