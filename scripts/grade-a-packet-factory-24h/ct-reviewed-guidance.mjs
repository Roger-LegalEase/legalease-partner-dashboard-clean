import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CT_DESTRUCTION, CT_PROVISIONAL, CT_ABSOLUTE } from './treatment-reconciliation.mjs';

export const CT_GUIDANCE_REVIEW = 'data/rcap-grade-a/terminal-treatment-verification/SESSION10_CT_GUIDANCE_ROWS.json';
export const CT_GUIDANCE_CANDIDATE = '52785b1c8d82aae25a92ed03788d037a0c96933d';
export const CT_CURRENT_GUIDANCE_CANDIDATE = 'data/rcap-grade-a/packet-factory-24h/warp-20260912/ct-three-guidance/repair-current/current-candidate.json';
export const CT_CURRENT_GUIDANCE_REVIEW = 'data/rcap-grade-a/packet-factory-24h/warp-20260912/ct-three-guidance/repair-current/independent-review/current-guidance-review.json';
export const CT_GUIDANCE_FAMILIES = Object.freeze([CT_DESTRUCTION, CT_PROVISIONAL, CT_ABSOLUTE]);
const EVIDENCE = 'data/rcap-grade-a/chat-parallel-2026-09-07/chat1-integration/session10/treatment-reconciliation/ct-guidance';
const SHARED = [
  'scripts/rcap-custom-pleading/composed-family-host.mjs',
  'scripts/build-census-v1-agency-application-treatment:obligation:research-decision-route:AL:al-uncharged-arrest:agency_record_challenge.mjs',
  'scripts/rcap-packet-completeness/identity-refresh.mjs',
];
const PRIOR = {
  [CT_DESTRUCTION]: { lane: 'vf03', base: '21d53521ff4d6a1dd24f9d5fb0fd56a6258a6f14', verdict: 'FAIL_REPAIR_REQUIRED' },
  [CT_PROVISIONAL]: { lane: 'vf04', base: '5de917b3574b6e27df362e13b86b4bfaac4915f8', verdict: 'FAIL_REPAIR_REQUIRED' },
  [CT_ABSOLUTE]: { lane: 'vf05', base: '706dbbd2439b2fdd8f5580cef46f7cc448b5c5da', verdict: 'PRODUCT_PATH_PENDING' },
};
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value && typeof value === 'object'
  ? Array.isArray(value) ? value.map(item => JSON.parse(canonical(item)))
    : Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(canonical(value[key]))]))
  : value);
export const ctGuidanceObjectSha256 = value => sha(Buffer.from(canonical(value)));
export const ctGuidanceVerdictIdentity = row => ({ familyId: row.familyId, verdict: row.verdict,
  lane: String(row.lane).toLowerCase(), verifiedAtBase: row.verifiedAtBase ?? null, evidencePath: row.evidencePath ?? null,
  failedObligations: row.failedObligations ?? [], failedObligationNames: row.failedObligationNames ?? [],
  unmeasuredObligations: row.unmeasuredObligations ?? [] });
const isDigest = value => /^[0-9a-f]{64}$/.test(value ?? '');
const safePath = relative => assert(typeof relative === 'string' && !path.isAbsolute(relative)
  && !relative.includes('\\') && !relative.split('/').some(part => ['', '.', '..'].includes(part)), 'Unsafe CT evidence path');
const historicalCache = new Map();
function readers(root, overrides) {
  return {
    read: overrides.readBytes ?? (relative => { safePath(relative); return fs.readFileSync(path.join(root, relative)); }),
    historical: overrides.readHistorical ?? ((commit, relative) => {
      safePath(relative); assert(/^[0-9a-f]{40}$/.test(commit));
      const key = `${root}:${commit}:${relative}`;
      if (!historicalCache.has(key)) historicalCache.set(key, execFileSync('git', ['show', `${commit}:${relative}`],
        { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 2 ** 24 }));
      return historicalCache.get(key);
    }),
  };
}
function priorRow(document, familyId) {
  const prior = PRIOR[familyId], rows = Array.isArray(document) ? document : document.rows;
  const matches = rows.filter(row => (row.itemId ?? row.familyId) === familyId && row.verifiedAtBase === prior.base);
  assert.equal(matches.length, 1, 'Original independent CT row missing or duplicated');
  assert.equal(matches[0].verdict, prior.verdict);
  return matches[0];
}

// Inventory is read from the immutable published candidate. It is review input,
// never a review or a grant. Each family binds only its own outputs and sources.
export function connecticutGuidanceReviewInventory(root, familyId, overrides = {}) {
  assert(CT_GUIDANCE_FAMILIES.includes(familyId), 'Unsupported CT guidance family');
  const { historical } = readers(root, overrides);
  const at = relative => historical(CT_GUIDANCE_CANDIDATE, relative);
  const directory = `data/rcap-all50/overlays/census-v1/ct/${familyId.toLowerCase()}--official-pdf-fill`;
  const routeKeys = [familyId.replace(/^agency-application-treatment:/, '')];
  const builder = `scripts/build-census-v1-${familyId}.mjs`;
  const receiptPath = `${directory}/source-receipt.json`, receipt = JSON.parse(at(receiptPath));
  assert.equal(receipt.familyId, familyId); assert.deepEqual(receipt.routeKeys, routeKeys);
  const reportPath = `${directory}/reports/rendered-artifacts.json`, report = JSON.parse(at(reportPath));
  assert.equal(report.familyId, familyId);
  assert.deepEqual(report.componentSet, ['agency_preparation_guide']);
  assert.deepEqual(report.artifacts.map(item => item.fixture).sort(), ['boundary', 'canonical']);
  const pin = relative => { safePath(relative); const bytes = at(relative); return { path: relative, sha256: sha(bytes), byteLength: bytes.length }; };
  const outputs = report.artifacts.map(item => {
    assert.equal(item.file, `${directory}/fixtures/${item.fixture}.pdf`);
    const bound = pin(item.file); assert.equal(bound.sha256, item.sha256); assert.equal(bound.byteLength, item.byteLength);
    return { ...bound, mediaType: 'application/pdf', fixture: item.fixture, pageCount: item.pageCount };
  });
  outputs.push({ ...pin(`${directory}/participant-instructions.md`), mediaType: 'text/markdown', fixture: 'both' });
  const inputPaths = [builder, ...SHARED, receiptPath, reportPath, `${directory}/production-field-map.json`,
    `${directory}/reports/actual-writes.json`, `${directory}/reports/blanks-left-for-the-participant.json`,
    `${directory}/reports/completeness-counters.json`, ...receipt.compositionSources.map(source => source.path)];
  const inputs = [...new Set(inputPaths)].sort().map(pin);
  for (const source of receipt.compositionSources) {
    const bound = inputs.find(input => input.path === source.path);
    assert.equal(bound.sha256, source.sha256, 'Published CT source receipt is stale');
    assert.equal(bound.byteLength, source.byteLength);
  }
  const prior = PRIOR[familyId], originalPath = `data/rcap-grade-a/packet-factory-24h/${prior.lane}/rows.json`;
  const original = priorRow(JSON.parse(at(originalPath)), familyId);
  const originalIndependentReview = { path: originalPath, lane: prior.lane, verifiedAtBase: prior.base,
    recordedAtCandidate: CT_GUIDANCE_CANDIDATE, rowSha256: ctGuidanceObjectSha256(original) };
  const extracted = JSON.parse(at('data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json')).rows.filter(item =>
    item.familyId === familyId && !item.superseded && String(item.lane).toLowerCase() === prior.lane
    && item.verifiedAtBase === prior.base && item.evidencePath === originalPath);
  assert.equal(extracted.length, 1, 'Original selected independent CT return missing or duplicated');
  const priorSelectedReturn = ctGuidanceVerdictIdentity(extracted[0]);
  const priorFindings = Object.entries(original.proofObligations).filter(([, item]) => item.result !== 'PASS')
    .map(([obligation, item]) => ({ obligation, priorFindingSha256: ctGuidanceObjectSha256(item), priorResult: item.result }));
  const unchangedOriginalOutputs = [];
  if (familyId === CT_DESTRUCTION) {
    // Source-only repair consumes the actual already-reviewed guide, including
    // its prior pagination correction. No rendering or repeated page review.
    for (const file of [builder, ...outputs.map(item => item.path), `${directory}/production-field-map.json`, reportPath]) {
      assert.equal(sha(historical(prior.base, file)), sha(at(file)), 'Destruction guide changed after its original independent review');
      unchangedOriginalOutputs.push(pin(file));
    }
  }
  return { familyId, directory, routeKeys, candidateCommit: CT_GUIDANCE_CANDIDATE,
    reviewedInputs: inputs, reviewedOutputs: outputs, originalIndependentReview, priorFindings,
    priorSelectedReturn, unchangedOriginalOutputs, sourceRefreshEvidence: pin(`${EVIDENCE}/source-identity-refresh.json`) };
}

// A current TREATMENT_CORRECT word is insufficient. Every declared output,
// invoking/source identity, original review and precise failed finding must
// match. This consumes independent static guidance evidence, not packet or
// runtime authority. The reviewer states how the existing criterion is met.
function assessHistoricalConnecticutReviewedGuidance(root, familyId, overrides = {}) {
  if (!CT_GUIDANCE_FAMILIES.includes(familyId)) return null;
  try {
    const { read, historical } = readers(root, overrides);
    const reviewBytes = read(CT_GUIDANCE_REVIEW), review = JSON.parse(reviewBytes);
    const currentIntegrationCommit = overrides.reviewPublicationCommit
      ?? execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const reviewPublicationCommit = overrides.reviewPublicationCommit
      ?? execFileSync('git', ['log', '-1', '--format=%H', '--', CT_GUIDANCE_REVIEW], { cwd: root, encoding: 'utf8' }).trim();
    assert(/^[0-9a-f]{40}$/.test(currentIntegrationCommit));
    assert(/^[0-9a-f]{40}$/.test(reviewPublicationCommit));
    assert.equal(sha(historical(currentIntegrationCommit, CT_GUIDANCE_REVIEW)), sha(reviewBytes), 'CT review is not published at the current integration head');
    assert.equal(sha(historical(reviewPublicationCommit, CT_GUIDANCE_REVIEW)), sha(reviewBytes), 'CT review publication changed');
    assert.equal(review.schemaVersion, 'rcap-terminal-treatment-independent-verification/v1');
    for (const flag of ['authoredByADifferentLaneThanTheTreatmentRecord', 'editsNothingItVerifies', 'createsNoApproval', 'opensNoRoute']) assert.equal(review[flag], true);
    assert(typeof review.reviewer === 'string' && review.reviewer.trim());
    assert(typeof review.lane === 'string' && review.lane.trim());
    assert.equal(review.verifiedAtBase, CT_GUIDANCE_CANDIDATE);
    const rows = review.families?.filter(row => row.familyId === familyId) ?? [];
    assert.equal(rows.length, 1, 'Independent review must name the exact CT family once');
    const row = rows[0], inventory = connecticutGuidanceReviewInventory(root, familyId, overrides);
    assert.equal(row.verdict, 'TREATMENT_CORRECT'); assert.equal(row.recordedTreatment, 'GUIDANCE_READY');
    assert.equal(row.scope, 'static_family_treatment');
    for (const flag of ['runtimeInstalled', 'participantFilesGeneratedOutput', 'participantApplicationDischarged', 'commercialAuthority']) assert.equal(row[flag], false);
    assert.deepEqual(row.routeKeys, inventory.routeKeys);
    assert.deepEqual(row.failedObligations ?? [], []); assert.deepEqual(row.unmeasuredObligations ?? [], []);
    assert(typeof row.verdictScope === 'string' && row.verdictScope.trim().length > 40);
    assert.deepEqual(row.reviewedInputs, inventory.reviewedInputs);
    assert.deepEqual(row.reviewedOutputs, inventory.reviewedOutputs);
    assert.deepEqual(row.originalIndependentReview, inventory.originalIndependentReview);
    assert.deepEqual(row.sourceRefreshEvidence, inventory.sourceRefreshEvidence);
    const currentOriginal = priorRow(JSON.parse(read(inventory.originalIndependentReview.path)), familyId);
    assert.equal(ctGuidanceObjectSha256(currentOriginal), inventory.originalIndependentReview.rowSha256, 'Original independent review attribution/content changed');
    const closed = row.closedPriorFindings ?? [];
    assert.equal(closed.length, inventory.priorFindings.length, 'Every original nonpassing obligation needs an explicit independent closure');
    assert.equal(new Set(closed.map(item => item.obligation)).size, closed.length);
    for (const prior of inventory.priorFindings) {
      const closure = closed.find(item => item.obligation === prior.obligation);
      assert(closure && closure.priorFindingSha256 === prior.priorFindingSha256, 'Closure describes a different prior finding');
      assert.equal(closure.result, 'CLOSED_BY_INDEPENDENT_DELTA');
      assert(typeof closure.finding === 'string' && closure.finding.trim().length > 40);
      assert(Array.isArray(closure.evidence) && closure.evidence.length > 0, 'Finding closure must name actual evidence');
    }
    for (const [items, key] of [[row.closedSourceHolds ?? [], 'holdSha256'], [row.closedCurrentVerdicts ?? [], 'verdictSha256']]) {
      assert.equal(new Set(items.map(item => item[key])).size, items.length);
      for (const item of items) {
        assert(isDigest(item[key])); assert.equal(item.result, 'CLOSED_BY_INDEPENDENT_DELTA');
        assert(typeof item.finding === 'string' && item.finding.trim().length > 40);
        assert(Array.isArray(item.evidence) && item.evidence.length > 0);
      }
    }
    const checked = [];
    const allPins = [...inventory.reviewedInputs, ...inventory.reviewedOutputs, inventory.sourceRefreshEvidence,
      ...(row.reviewedEvidence ?? []), ...closed.flatMap(item => item.evidence), ...(row.closedSourceHolds ?? []).flatMap(item => item.evidence ?? []),
      ...(row.closedCurrentVerdicts ?? []).flatMap(item => item.evidence ?? [])];
    for (const item of allPins) {
      safePath(item.path); assert(isDigest(item.sha256));
      const current = read(item.path);
      assert.equal(sha(current), item.sha256, `CT reviewed identity changed: ${item.path}`);
      assert.equal(sha(historical(currentIntegrationCommit, item.path)), item.sha256, `CT evidence differs from current committed input: ${item.path}`);
      // The immutable inventory already binds candidate files to 52785b1.
      // Root's independent observations may be published with its later review.
      const commit = item.publishedAt ?? reviewPublicationCommit;
      assert(/^[0-9a-f]{40}$/.test(commit));
      assert.equal(sha(historical(commit, item.path)), item.sha256, `CT evidence has no matching immutable publication: ${item.path}`);
      if (item.byteLength !== undefined) assert.equal(current.length, item.byteLength);
      checked.push({ path: item.path, sha256: item.sha256, publishedAt: commit });
    }
    return { eligible: true, familyId, terminalTreatment: 'GUIDANCE_READY', reviewPath: CT_GUIDANCE_REVIEW,
      reviewSha256: sha(reviewBytes), reviewer: review.reviewer, lane: review.lane, reviewedAtBase: review.verifiedAtBase,
      reviewPublicationCommit,
      originalIndependentReview: inventory.originalIndependentReview, closedPriorFindings: closed,
      priorSelectedReturn: inventory.priorSelectedReturn, closedCurrentVerdicts: row.closedCurrentVerdicts ?? [],
      closedSourceHolds: row.closedSourceHolds ?? [], reviewedOutputs: inventory.reviewedOutputs, checked,
      runtimeInstalled: false, participantApplicationDischarged: false, commercialAuthority: false };
  } catch (error) {
    return { eligible: false, familyId, reviewPath: CT_GUIDANCE_REVIEW, reason: error.message };
  }
}

// A changed participant artifact cannot inherit SESSION10's acceptance. The
// implementation lane publishes a versioned, exact-byte candidate; a separate
// reviewer later publishes CT_CURRENT_GUIDANCE_REVIEW after the current raster.
// Until that independent record exists and binds every candidate input/output,
// this path deliberately remains ineligible.
export function connecticutCurrentGuidanceCandidate(root, familyId, overrides = {}) {
  assert(CT_GUIDANCE_FAMILIES.includes(familyId), 'Unsupported CT guidance family');
  const { read } = readers(root, overrides);
  const candidateBytes = read(CT_CURRENT_GUIDANCE_CANDIDATE);
  const candidate = JSON.parse(candidateBytes);
  assert.equal(candidate.schemaVersion, 'rcap-ct-current-guidance-candidate/v1');
  assert.equal(candidate.candidateVersion, 'CT-GUIDANCE-DIRECT-PARTICIPANT-COPY-20260912-V1');
  assert.deepEqual(candidate.families.map(row => row.familyId).sort(), [...CT_GUIDANCE_FAMILIES].sort());
  assert.equal(candidate.historicalTrustAnchor.candidateCommit, CT_GUIDANCE_CANDIDATE);
  assert.equal(candidate.historicalTrustAnchor.reviewPath, CT_GUIDANCE_REVIEW);
  const historicalReview = read(CT_GUIDANCE_REVIEW);
  assert.equal(sha(historicalReview), candidate.historicalTrustAnchor.reviewSha256);
  const failureBytes = read(candidate.currentFailure.path);
  assert.equal(sha(failureBytes), candidate.currentFailure.sha256);
  const failure = JSON.parse(failureBytes);
  const row = candidate.families.find(item => item.familyId === familyId);
  assert(row, 'Current CT candidate omits the family');
  assert.deepEqual(row.routeKeys, [familyId.replace(/^agency-application-treatment:/, '')]);
  const failureRows = failure.rows.filter(item => item.familyId === familyId);
  assert.equal(failureRows.length, 1, 'Current CT failure row missing or duplicated');
  assert.equal(ctGuidanceObjectSha256(failureRows[0]), row.currentFailureRowSha256);
  assert.deepEqual(failureRows[0].failedObligationNames, ['ARTIFACTS']);
  assert.equal(row.currentFailedFindings.length, 1);
  assert.equal(row.currentFailedFindings[0].obligation, 'ARTIFACTS');
  assert.equal(row.currentFailedFindings[0].priorFindingSha256,
    ctGuidanceObjectSha256(failureRows[0].proofObligations.ARTIFACTS));
  for (const pin of [...row.reviewedInputs, ...row.reviewedOutputs, ...row.sourceBindings]) {
    safePath(pin.path); const bytes = read(pin.path);
    assert.equal(sha(bytes), pin.sha256, `Current CT candidate identity changed: ${pin.path}`);
    assert.equal(bytes.length, pin.byteLength);
  }
  return {
    ...row,
    candidatePath: CT_CURRENT_GUIDANCE_CANDIDATE,
    candidateSha256: sha(candidateBytes),
    candidateVersion: candidate.candidateVersion,
    priorSelectedReturn: ctGuidanceVerdictIdentity(failureRows[0]),
    originalIndependentReview: {
      path: candidate.currentFailure.path,
      lane: failureRows[0].lane,
      verifiedAtBase: failureRows[0].verifiedAtBase,
      recordedAtCandidate: candidate.candidateVersion,
      rowSha256: row.currentFailureRowSha256
    },
    priorFindings: row.currentFailedFindings
  };
}

function assessCurrentConnecticutReviewedGuidance(root, familyId, overrides = {}) {
  try {
    const { read, historical } = readers(root, overrides);
    const inventory = connecticutCurrentGuidanceCandidate(root, familyId, overrides);
    const reviewBytes = read(CT_CURRENT_GUIDANCE_REVIEW);
    const review = JSON.parse(reviewBytes);
    assert.equal(review.schemaVersion, 'rcap-ct-current-guidance-independent-review/v1');
    assert.equal(review.reviewedCandidate.path, inventory.candidatePath);
    assert.equal(review.reviewedCandidate.sha256, inventory.candidateSha256);
    assert.equal(review.reviewedCandidate.candidateVersion, inventory.candidateVersion);
    for (const flag of ['authoredByADifferentLaneThanTheCandidate', 'editsNothingItVerifies', 'createsNoApproval', 'opensNoRoute']) {
      assert.equal(review[flag], true);
    }
    assert(typeof review.reviewer === 'string' && review.reviewer.trim());
    assert(typeof review.lane === 'string' && review.lane.trim());
    assert(/^[0-9a-f]{40}$/.test(review.verifiedAtBase));
    const publication = overrides.reviewPublicationCommit
      ?? execFileSync('git', ['log', '-1', '--format=%H', '--', CT_CURRENT_GUIDANCE_REVIEW], { cwd: root, encoding: 'utf8' }).trim();
    assert(/^[0-9a-f]{40}$/.test(publication));
    assert.equal(sha(historical(publication, CT_CURRENT_GUIDANCE_REVIEW)), sha(reviewBytes), 'Current CT review publication changed');
    assert.equal(sha(historical(review.verifiedAtBase, inventory.candidatePath)), inventory.candidateSha256,
      'Current CT candidate was not published at the reviewed base');
    const rows = review.families?.filter(row => row.familyId === familyId) ?? [];
    assert.equal(rows.length, 1, 'Current independent review must name the exact CT family once');
    const row = rows[0];
    assert.equal(row.verdict, 'TREATMENT_CORRECT');
    assert.equal(row.recordedTreatment, 'GUIDANCE_READY');
    assert.equal(row.scope, 'current_static_family_treatment');
    for (const flag of ['runtimeInstalled', 'participantApplicationDischarged', 'commercialAuthority']) assert.equal(row[flag], false);
    assert.deepEqual(row.routeKeys, inventory.routeKeys);
    assert.deepEqual(row.reviewedInputs, inventory.reviewedInputs);
    assert.deepEqual(row.reviewedOutputs, inventory.reviewedOutputs);
    assert.deepEqual(row.sourceBindings, inventory.sourceBindings);
    assert.deepEqual(row.failedObligations ?? [], []);
    assert.deepEqual(row.unmeasuredObligations ?? [], []);
    const closed = row.closedCurrentFindings ?? [];
    assert.equal(closed.length, inventory.currentFailedFindings.length);
    for (const prior of inventory.currentFailedFindings) {
      const closure = closed.find(item => item.obligation === prior.obligation);
      assert(closure && closure.priorFindingSha256 === prior.priorFindingSha256);
      assert.equal(closure.result, 'CLOSED_BY_INDEPENDENT_DELTA');
      assert(typeof closure.finding === 'string' && closure.finding.trim().length > 40);
      assert(Array.isArray(closure.evidence) && closure.evidence.length > 0);
    }
    const checked = [];
    const allPins = [
      { path: inventory.candidatePath, sha256: inventory.candidateSha256, byteLength: read(inventory.candidatePath).length },
      ...inventory.reviewedInputs, ...inventory.reviewedOutputs, ...inventory.sourceBindings,
      ...(row.reviewedEvidence ?? []), ...closed.flatMap(item => item.evidence)
    ];
    for (const item of allPins) {
      safePath(item.path); assert(isDigest(item.sha256));
      const bytes = read(item.path);
      assert.equal(sha(bytes), item.sha256, `Current CT reviewed identity changed: ${item.path}`);
      assert.equal(sha(historical(review.verifiedAtBase, item.path)), item.sha256,
        `Current CT evidence differs from reviewed candidate: ${item.path}`);
      if (item.byteLength !== undefined) assert.equal(bytes.length, item.byteLength);
      checked.push({ path: item.path, sha256: item.sha256, publishedAt: review.verifiedAtBase });
    }
    return {
      eligible: true, familyId, terminalTreatment: 'GUIDANCE_READY', reviewPath: CT_CURRENT_GUIDANCE_REVIEW,
      reviewSha256: sha(reviewBytes), reviewer: review.reviewer, lane: review.lane,
      reviewedAtBase: review.verifiedAtBase, reviewPublicationCommit: publication,
      originalIndependentReview: inventory.originalIndependentReview,
      closedPriorFindings: closed,
      priorSelectedReturn: inventory.priorSelectedReturn,
      closedCurrentVerdicts: row.closedCurrentVerdicts ?? [], closedSourceHolds: row.closedSourceHolds ?? [],
      reviewedOutputs: inventory.reviewedOutputs, checked,
      runtimeInstalled: false, participantApplicationDischarged: false, commercialAuthority: false
    };
  } catch (error) {
    return { eligible: false, familyId, reviewPath: CT_CURRENT_GUIDANCE_REVIEW, reason: error.message };
  }
}

export function assessConnecticutReviewedGuidance(root, familyId, overrides = {}) {
  if (!CT_GUIDANCE_FAMILIES.includes(familyId)) return null;
  const currentExists = overrides.preferHistoricalCandidate === true ? false
    : overrides.preferCurrentCandidate === true || fs.existsSync(path.join(root, CT_CURRENT_GUIDANCE_CANDIDATE));
  return currentExists
    ? assessCurrentConnecticutReviewedGuidance(root, familyId, overrides)
    : assessHistoricalConnecticutReviewedGuidance(root, familyId, overrides);
}

// Separate from treatment-reconciliation.mjs so CT admission cannot change the
// WA manifest's reviewed dependency. Historical failures remain recorded; only
// the exact independently closed old finding stops controlling this treatment.
export function applyConnecticutGuidanceAcceptance(state, assessment, context = {}) {
  if (!assessment?.eligible || !CT_GUIDANCE_FAMILIES.includes(assessment.familyId)) return state;
  if (context.legalBlocked || context.deliveryTypeRefusal || context.nineZero === false
    || context.readiness?.ready !== true || ['LEGAL_BLOCKED', 'WRONG_DELIVERY_TYPE'].includes(state)) return state;
  const selected = context.independentReturn;
  const selectedIdentity = selected ? ctGuidanceVerdictIdentity(selected) : null;
  const isHistorical = selectedIdentity && canonical(selectedIdentity) === canonical(assessment.priorSelectedReturn);
  const currentVerdictExplicitlyClosed = selectedIdentity && assessment.closedCurrentVerdicts.some(item =>
    item.verdictSha256 === ctGuidanceObjectSha256(selectedIdentity));
  if (selected && ['FAIL_REPAIR_REQUIRED', 'PRODUCT_PATH_PENDING', 'BLOCKED_SOURCE'].includes(selected.verdict)) {
    if (!isHistorical && !currentVerdictExplicitlyClosed) return state;
  }
  if (context.verifierSourceHold) {
    const held = assessment.closedSourceHolds.find(item => item.holdSha256 === ctGuidanceObjectSha256(context.verifierSourceHold));
    if (!held || held.result !== 'CLOSED_BY_INDEPENDENT_DELTA' || typeof held.finding !== 'string'
      || held.finding.trim().length <= 40 || !held.evidence?.length) return state;
  }
  if (state === 'FAIL_REPAIR_REQUIRED' && ((!isHistorical && !currentVerdictExplicitlyClosed) || selected?.verdict !== 'FAIL_REPAIR_REQUIRED')) return state;
  if (state === 'SOURCE_BLOCKED' && !context.verifierSourceHold) return state;
  return 'GUIDANCE_READY';
}

// F29 still reads the original negative return. A fresh, independently bound
// static closure can finish that exact finding without erasing its attribution
// or creating a repair dispatch for work already independently closed.
export function connecticutGuidanceClosesReturnedFailure(family, returned, assessment) {
  if (!assessment?.eligible || family?.state !== 'GUIDANCE_READY'
    || family.familyId !== returned?.familyId || family.familyId !== assessment.familyId
    || returned.verdict !== 'FAIL_REPAIR_REQUIRED' || !returned.isIndependentVerification
    || returned.superseded || canonical(ctGuidanceVerdictIdentity(returned)) !== canonical(assessment.priorSelectedReturn)) return false;
  if (applyConnecticutGuidanceAcceptance(returned.verdict, assessment, {
    independentReturn: returned, readiness: family.sourceReadiness,
    nineZero: family.allNineCountersZero === true,
    legalBlocked: family.legalInputStatus !== 'SETTLED',
    deliveryTypeRefusal: family.ownerDeliveryTypeRefusal,
    verifierSourceHold: family.verifierSourceHold
  }) !== 'GUIDANCE_READY') return false;
  const expectedHistory = {
    verdict: returned.verdict, lane: returned.lane, verifiedAtBase: returned.verifiedAtBase,
    evidencePath: returned.evidencePath, failedObligations: returned.failedObligations,
    closedBy: assessment.reviewPath, reviewSha256: assessment.reviewSha256,
    closedPriorFindings: assessment.closedPriorFindings
  };
  return canonical(family.historicalIndependentFailureClosedByGuidanceReview) === canonical(expectedHistory)
    && canonical(family.reviewedTreatmentGuidance) === canonical({ ...assessment, eligible: true, currentTreatmentHold: null })
    && (family.failedObligations ?? []).length === 0 && (family.failedObligationNames ?? []).length === 0;
}
