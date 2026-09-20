/**
 * The specification-derivation reconciliation, as the build consumes it.
 *
 * `scripts/verify-specification-derivation-reconciliation.mjs` does the
 * expensive proving -- composing and rendering both specifications, rasterising
 * nothing but reading the approved PDF's text, scanning each build host. This
 * module is the cheap, exact side: it reads what that control wrote, holds it
 * to its own bytes, and re-checks the two facts that must still be true at the
 * moment a record is written.
 *
 * Same shape as the MS paid-packet proof: one verifier produces evidence, and
 * the generator consumes it with assertions rather than re-deriving it.
 *
 * WHAT IT PERMITS
 *
 * Exactly one thing: carrying a specification digest forward. It supplies no
 * approval, opens no route, and says nothing about provider or publication
 * proof. A route that delivers a packet composed FROM the specification still
 * needs those exact composed bytes reviewed and approved; this evidence is not
 * that and must never be read as that.
 */

import fs from "node:fs";
import crypto from "node:crypto";

export const DERIVATION_RECONCILIATION_PATH =
  "data/rcap-grade-a/legal-decisions/SPECIFICATION_DERIVATION_RECONCILIATION_2026-09-20.json";

/**
 * The reconciliation's own bytes, pinned.
 *
 * Without this the file could be edited to reconcile a family it never proved,
 * and the generator would believe it. Re-running the verifier with --write
 * moves this pin, which is an edit a reviewer sees.
 */
export const DERIVATION_RECONCILIATION_SHA256 =
  "189a7e9616d8114b540ffcede6372c1794583c67e2136dcfba418b5722ab0043";

const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const insist = (condition, message) => {
  if (!condition) throw new Error(`First-cohort evidence refusal: specification derivation ${message}`);
};

/**
 * The reconciled move for a family, or null where the family has none.
 *
 * Throws when a record exists but does not hold, because a reconciliation that
 * cannot be proven is worse than none: it would be indistinguishable from a
 * silent re-pin.
 *
 * @param {object} input
 * @param {string} input.familyId
 * @param {string} input.routeId
 * @param {string} input.specificationPath
 * @param {Buffer} input.specificationBytes   the specification as it is now
 * @param {string} input.recordSpecificationSha256  the digest the record holds
 * @param {(rel: string) => Buffer} input.readBytes
 */
export function derivationReconciledSpecificationSha256({
  familyId, routeId, specificationPath, specificationBytes, recordSpecificationSha256, readBytes
}) {
  let bytes;
  try { bytes = readBytes(DERIVATION_RECONCILIATION_PATH); }
  catch { return null; }
  insist(digest(bytes) === DERIVATION_RECONCILIATION_SHA256,
    "reconciliation bytes changed; re-run scripts/verify-specification-derivation-reconciliation.mjs and re-pin it");
  return assertDerivationRecord({
    record: JSON.parse(bytes.toString("utf8")),
    familyId, routeId, specificationPath, specificationBytes, recordSpecificationSha256, readBytes
  });
}

/**
 * Every condition past the byte pin, on a record already in hand.
 *
 * Separated so the controls can drive each condition directly. Reached only
 * through the function above, a mutation would be refused by the byte pin
 * first -- which would prove the pin bites and say nothing about the condition,
 * and a control whose label claims more than it tests is worse than no control.
 */
export function assertDerivationRecord({
  record, familyId, routeId, specificationPath, specificationBytes, recordSpecificationSha256, readBytes
}) {
  insist(record.schemaVersion === "rcap-specification-derivation-reconciliation/v1"
    && record.recordId === "SPEC-DERIVATION-RECONCILIATION-2026-09-20"
    && record.createsApproval === false
    && record.changesApprovedArtifacts === false
    && record.approvesComposedOutput === false
    && record.opensAnyRoute === false
    && record.establishesProviderOrPublicationProof === false,
  "record scope mismatch");

  const families = (record.families ?? []).filter((entry) => entry.familyId === familyId);
  if (families.length === 0) return null;
  insist(families.length === 1, `names ${familyId} more than once`);
  const family = families[0];

  insist(Array.isArray(family.routeIds) && family.routeIds.includes(routeId),
    `does not reconcile ${routeId}`);
  insist(family.specificationPath === specificationPath, "names a different specification");
  insist(family.priorSpecificationSha256 === recordSpecificationSha256,
    "starts from a specification digest the record does not hold");
  insist(family.priorSpecificationSha256 !== family.currentSpecificationSha256,
    "reconciles a specification to the same digest");
  insist(digest(specificationBytes) === family.currentSpecificationSha256,
    "the specification on disk is not the one it reconciles to");

  // The two facts that carry the whole argument, re-checked here rather than
  // taken from the record: the build host does not read the specification, and
  // the approved artifacts are still exactly the approved bytes.
  insist(family.buildHostReadsSpecification === false,
    "the build host reads the specification, so only a re-render can say whether the artifact moved");
  for (const providerPath of family.providerPaths ?? []) {
    insist(!readBytes(providerPath).toString("utf8").includes("packet-specifications"),
      `${providerPath} now reads the packet specification`);
  }
  insist(Array.isArray(family.approvedArtifacts) && family.approvedArtifacts.length > 0,
    "names no approved artifact");
  for (const artifact of family.approvedArtifacts) {
    insist(artifact.bytesUnchanged === true, `${artifact.fixture} is recorded as changed`);
    insist(digest(readBytes(artifact.path)) === artifact.sha256,
      `${artifact.fixture} on disk is no longer the approved artifact`);
  }

  // And the finding that makes this a derivation repair rather than a content
  // change: the prior specification could not produce a packet at all.
  insist(family.priorSpecificationProducesAPacket === false,
    "the prior specification could produce a participant packet, so its output may have changed");
  insist(family.currentSpecificationProducesAPacket === true,
    "the current specification cannot produce a participant packet");
  const fidelity = family.transcriptionFidelity ?? {};
  insist((fidelity.notFoundVerbatim ?? []).every((entry) => entry.classification !== "UNEXPLAINED"),
    "the specification carries an assertion that is not in the owner-approved artifact");

  return {
    contract: "rcap-specification-derivation-reconciliation/v1",
    recordId: record.recordId,
    path: DERIVATION_RECONCILIATION_PATH,
    sha256: DERIVATION_RECONCILIATION_SHA256,
    reconciledOn: record.reconciledOn,
    familyId, routeId,
    specificationPath,
    priorSpecificationSha256: family.priorSpecificationSha256,
    specificationSha256: family.currentSpecificationSha256,
    movedIn: family.movedIn ?? [],
    approvedArtifactsUnchanged: true,
    buildHostReadsSpecification: false,
    priorSpecificationProducesAPacket: false,
    transcriptionFidelity: fidelity,
    changesApprovedArtifacts: false,
    approvesComposedOutput: false,
    createsApproval: false
  };
}

/** The reconciled current digest for a family, for controls that only need it. */
export function reconciledSpecificationDigests(readBytes = (rel) => fs.readFileSync(rel)) {
  let bytes;
  try { bytes = readBytes(DERIVATION_RECONCILIATION_PATH); } catch { return new Map(); }
  if (digest(bytes) !== DERIVATION_RECONCILIATION_SHA256) return new Map();
  const record = JSON.parse(bytes.toString("utf8"));
  return new Map((record.families ?? []).flatMap((family) =>
    (family.routeIds ?? []).map((routeId) => [routeId, {
      familyId: family.familyId,
      specificationPath: family.specificationPath,
      priorSpecificationSha256: family.priorSpecificationSha256,
      currentSpecificationSha256: family.currentSpecificationSha256
    }])));
}
