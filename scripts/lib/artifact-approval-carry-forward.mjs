#!/usr/bin/env node
/**
 * A packet specification whose approved-artifact pins were carried forward.
 *
 * The successor record is built from a frozen historical registry entry, so it
 * carries the specification digest as it stood when the family was last
 * productized. That is deliberate: a specification whose bytes move is, by
 * default, a specification whose legal content may have moved, and the
 * successor refuses it rather than guessing.
 *
 * But one kind of move is not a legal change at all. A family's specification
 * records the shipping artifacts an owner approved. When the owner approves a
 * new pair and directs that the pins be carried into the specification, the
 * specification's bytes move for exactly that reason and for no other. Refusing
 * it would mean the only way to honour an owner's approval is to revoke the
 * route it approves — the old shape defeating the newer decision.
 *
 * So the refusal is kept, and one exit is opened through it, narrow enough that
 * it cannot pass anything else:
 *
 *   - a dated owner carry-forward record must exist, at bytes this module
 *     pins, naming this family and this route;
 *   - it must carry forward a named prior owner approval, and approve the
 *     identical artifacts that approval approved — a carry-forward that
 *     approves different bytes is a new approval wearing the wrong name;
 *   - it must name the exact prior and current specification digests, and the
 *     prior one must be the digest the successor record already holds;
 *   - the current specification on disk must hash to the current digest;
 *   - and the delta between the two specifications, recomputed here from the
 *     prior bytes in Git rather than read from the record, must be exactly the
 *     approved-artifact pins and the content digest that contains them.
 *
 * That last condition is the one that matters. The record states its delta, and
 * this module does not believe it: it reconstructs the prior specification,
 * walks both documents leaf by leaf, and refuses if a single other value moved,
 * or if any field was added or removed. A carry-forward that touched a statute,
 * a document, a field map, a fee or a filing rule fails here no matter what its
 * own `exactDelta` claims.
 */

import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const insist = (condition, message) => {
  if (!condition) throw new Error(`First-cohort evidence refusal: artifact carry-forward ${message}`);
};

/**
 * Carry-forward records, pinned by family.
 *
 * Pinned rather than discovered: a directory scan would let a new file grant
 * itself this exit. Adding a family here is an edit a reviewer sees.
 */
export const CARRY_FORWARD_RECORDS = Object.freeze({
  'il-prostitution-j-vacate-set': Object.freeze({
    path: 'data/rcap-grade-a/legal-decisions/OWNER_ARTIFACT_APPROVAL_IL_VACATUR_2026-09-19.json',
    sha256: 'e7b21f1d79c4991fc9313b78b4cc25e60575be8f0c9ce999864c75eca642e01f',
    recordId: 'OWN-ARTIFACT-APPROVAL-IL-VACATUR-2026-09-19',
    carriesForwardRecordId: 'OWN-ARTIFACT-REREVIEW-IL-VACATUR-2026-09-14'
  })
});

/** The leaves a carry-forward is allowed to move, and nothing else. */
const PERMITTED_DELTA = new Set([
  '.approvedArtifacts[0].sha256',
  '.approvedArtifacts[0].byteLength',
  '.approvedArtifacts[1].sha256',
  '.approvedArtifacts[1].byteLength',
  '.specificationSha256'
]);

/**
 * The delta rule, on its own.
 *
 * Exported so it can be driven directly. Reached through
 * `carriedForwardSpecificationSha256` a mutation must first get past the
 * record's byte pin, which means the two mutations that matter most -- a
 * specification that moved by more than its pins, and one that grew a field --
 * would be refused for the wrong reason and prove nothing about this rule.
 */
export function assertDeltaIsTheApprovedPinsAlone({ rootDir, specificationPath, specificationBytes, priorFileSha256 }) {
  const prior = priorSpecificationBytes(rootDir, specificationPath, priorFileSha256);
  insist(prior, 'the prior specification is not in this history at the digest the record names');
  const before = Object.fromEntries(leaves(JSON.parse(prior.toString('utf8'))));
  const after = Object.fromEntries(leaves(JSON.parse(specificationBytes.toString('utf8'))));
  const added = Object.keys(after).filter((key) => !(key in before));
  const removed = Object.keys(before).filter((key) => !(key in after));
  insist(added.length === 0 && removed.length === 0,
    `changed the specification's shape (${[...added.map((k) => `+${k}`), ...removed.map((k) => `-${k}`)].join(', ')})`);
  const moved = Object.keys(before).filter((key) => before[key] !== after[key]).sort();
  const disallowed = moved.filter((key) => !PERMITTED_DELTA.has(key));
  insist(disallowed.length === 0, `moved more than the approved-artifact pins: ${disallowed.join(', ')}`);
  insist(moved.length > 0, 'changed nothing, so it is not a carry-forward');
  return moved;
}

function* leaves(value, path = '') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) yield* leaves(child, `${path}.${key}`);
  } else if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) yield* leaves(child, `${path}[${index}]`);
  } else {
    yield [path, value];
  }
}

/**
 * The prior specification, as Git holds it at the digest the record names.
 *
 * Found by walking the file's own history rather than trusting a commit id in
 * the record, so the record cannot point the comparison at a document that was
 * never this specification.
 */
export function specificationBytesAtDigest(rootDir, specificationPath, sha256) {
  return priorSpecificationBytes(rootDir, specificationPath, sha256);
}

function priorSpecificationBytes(rootDir, specificationPath, priorSha256) {
  const log = execFileSync('git', ['-C', rootDir, 'log', '--format=%H', '--', specificationPath],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim().split('\n').filter(Boolean);
  for (const commit of log) {
    try {
      const bytes = execFileSync('git', ['-C', rootDir, 'show', `${commit}:${specificationPath}`],
        { encoding: null, maxBuffer: 64 * 1024 * 1024 });
      if (digest(bytes) === priorSha256) return bytes;
    } catch { /* the path did not exist at that commit */ }
  }
  return null;
}

/**
 * Validate a carry-forward and return the specification digest it establishes.
 *
 * Returns null when the family has no carry-forward record, which leaves the
 * caller's original refusal in place. Throws when a record exists but does not
 * hold, because a carry-forward that cannot be proven is worse than none: it
 * would otherwise be indistinguishable from a silent re-pin.
 *
 * @param {object} input
 * @param {string} input.rootDir
 * @param {string} input.familyId
 * @param {string} input.routeId
 * @param {string} input.specificationPath
 * @param {Buffer} input.specificationBytes  the specification as it is now
 * @param {string} input.recordSpecificationSha256  the digest the successor holds
 * @param {Array<{fixture: string, sha256: string}>} input.approvedArtifacts  from the owner approval
 * @param {(rel: string) => Buffer} input.readBytes
 */
export function carriedForwardSpecificationSha256({
  rootDir, familyId, routeId, specificationPath, specificationBytes,
  recordSpecificationSha256, approvedArtifacts, readBytes
}) {
  const pinned = CARRY_FORWARD_RECORDS[familyId];
  if (!pinned) return null;

  const bytes = readBytes(pinned.path);
  insist(digest(bytes) === pinned.sha256, 'record bytes changed; a new owner record is required');
  const record = JSON.parse(bytes.toString('utf8'));

  insist(record.recordId === pinned.recordId
    && record.decision === 'CARRY_FORWARD_APPROVED_SHIPPING_ARTIFACTS'
    && record.decisionOwner === 'Roger Roman'
    && record.familyId === familyId
    && Array.isArray(record.routeIds) && record.routeIds.includes(routeId),
  'record scope mismatch');
  insist(record.carriesForward?.recordId === pinned.carriesForwardRecordId,
    'record does not carry forward the owner approval it claims');
  insist(digest(readBytes(record.carriesForward.path)) === record.carriesForward.sha256,
    'the carried-forward owner approval bytes changed');

  // A carry-forward approves nothing new. It must name the identical artifacts
  // the approval it carries already approved.
  const approvedByFixture = new Map(approvedArtifacts.map((entry) => [entry.fixture, entry.sha256]));
  insist(Array.isArray(record.approvedArtifacts) && record.approvedArtifacts.length === approvedByFixture.size,
    'record does not bind the same number of artifacts as the approval it carries');
  for (const artifact of record.approvedArtifacts) {
    insist(approvedByFixture.get(artifact.fixture) === artifact.sha256,
      `${artifact.fixture} is not the artifact the carried-forward approval approved`);
    insist(digest(readBytes(artifact.file)) === artifact.sha256,
      `${artifact.fixture} on disk is not the approved artifact`);
  }

  const forward = record.packetSpecificationCarryForward ?? {};
  insist(forward.path === specificationPath, 'record names a different specification');
  insist(forward.priorFileSha256 === recordSpecificationSha256,
    'record starts from a specification digest the successor record does not hold');
  insist(digest(specificationBytes) === forward.currentFileSha256,
    'the specification on disk is not the one the record carries forward to');
  insist(forward.priorFileSha256 !== forward.currentFileSha256, 'record carries forward to the same digest');

  // The delta, recomputed. The record's own account of it is not consulted.
  const moved = assertDeltaIsTheApprovedPinsAlone({
    rootDir, specificationPath, specificationBytes, priorFileSha256: forward.priorFileSha256
  });

  // The pins it moved must be the approved ones, read from the specification
  // itself rather than from the record.
  const specification = JSON.parse(specificationBytes.toString('utf8'));
  for (const artifact of specification.approvedArtifacts ?? []) {
    insist(approvedByFixture.get(artifact.fixture) === artifact.sha256,
      `the specification's ${artifact.fixture} pin is not the owner-approved artifact`);
  }

  return {
    specificationSha256: forward.currentFileSha256,
    contentSha256: forward.currentContentSha256 ?? null,
    priorSpecificationSha256: forward.priorFileSha256,
    priorContentSha256: forward.priorContentSha256 ?? null,
    movedLeaves: moved,
    record: {
      recordId: record.recordId, path: pinned.path, sha256: pinned.sha256, decidedOn: record.decidedOn,
      carriesForward: { recordId: record.carriesForward.recordId, path: record.carriesForward.path, sha256: record.carriesForward.sha256 }
    }
  };
}
