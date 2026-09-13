import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pdfPageCount} from './de-guidance-binding.mjs';

export const WA_SUD_FAMILY = 'wa_vac_substance_use_disorder-set';
export const WA_SUD_ROUTE = 'obligation:track-only:WA:wa_vac_substance_use_disorder';
export const WA_SUD_DIRECTORY = 'data/rcap-all50/overlays/census-v1/wa/wa-vac-substance-use-disorder-set--custom-pleading';
export const WA_SUD_REVIEW = 'data/rcap-grade-a/packet-factory-24h/vfwasud1/rows-vfwasud1-wa-sud-repair-semantic-pass-20260913.json';
export const WA_SUD_REVIEW_SHA256 = '2763787f73e340e1443e4fc8c2c6f420daf7d7d776a3bdbbcca4e327854de4c7';
const DECISION_PATH = 'data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json';
const DECISION_ID = 'WA-SUD-VACATUR-CUSTOM-96060-6';
const CANDIDATE = '6632fd3b9471791d3748e895fdb00a54c7448c8d';
const COMPONENTS = ['petition-1', 'declaration-2', 'notice-order-3', 'program-evidence-4', 'filing-instructions-5'].map(x => `wa-96060-6-${x}`);
const OBLIGATIONS = ['ROUTE_IDENTITY','SOURCE_IDENTITY','COMPONENT_SET','KNOWN_PREFILLS','REQUIRED_BEFORE_FILING','ROUTE_OPTIONS','REPEATING_ROWS','PROTECTED_FIELDS','ARTIFACTS','PAGE_ORDER','CLIPPING_AND_OVERLAP','FILING_DESTINATION','FEE_AND_WAIVER','SERVICE','SELF_HELP_STOP'];
const COUNTERS = ['knownRequiredFieldsMissing','requiredFactsNotCollected','unclassifiedBlanks','incompleteRows','requiredOptionsMissing','requiredComponentsMissing','invisibleWrites','protectedWrites','visualDefects'];
const HISTORICAL_MAPPING = {
  familyId: WA_SUD_FAMILY,
  stateOverride: 'PRODUCT_PATH_PENDING', executionOwner: 'CAPTAIN',
  nextExecutableAction: 'Map RCW 9.96.060(6) to the correct vehicle without selecting the unrelated DUI option, keep generation fail-closed, and treat the local fee as a clerk lookup.',
  ownerDecision: 'This is route-to-vehicle mapping plus an operational fee lookup.'
};
const hash = b => crypto.createHash('sha256').update(b).digest('hex');

// This is vehicle selection, not acceptance. A frozen independent semantic
// return authenticates the existing custom outputs. Later selected reviews
// retain their own verdict and all ordinary raster/final-review gates.
// Throw on an invalid exact-family certificate: falling back to the historical
// official overlay could accidentally dispatch or accept the wrong vehicle.
export function assessWaSudCustomMapping(root, input, overrides = {}) {
  if (input.familyId !== WA_SUD_FAMILY) return null;
  assert.equal(input.treatment ?? null, null, 'WA SUD acquired a conflicting treatment reconciliation');
  const read = overrides.readBytes ?? (relative => {
    assert(!path.isAbsolute(relative) && !relative.split('/').some(x => x === '..' || x === '.' || !x), 'Unconfined mapping evidence path');
    let cursor = root;
    for (const part of relative.split('/')) { cursor = path.join(cursor, part); assert(!fs.lstatSync(cursor).isSymbolicLink(), 'Mapping evidence must not be a symlink'); }
    return fs.readFileSync(cursor);
  });
  const git = overrides.git ?? (args => execFileSync('git', args, {cwd: root, stdio: ['ignore','pipe','ignore'], maxBuffer: 1 << 26}));
  const json = p => JSON.parse(read(p));
  const atBase = (base, p, bytes) => {
    assert.match(base ?? '', /^[a-f0-9]{40}$/);
    assert.equal(hash(git(['show', `${base}:${p}`])), hash(bytes), `Review/publication bytes changed: ${p}`);
  };
  assert.deepEqual(input.routes.map(r => r.routeKey), [WA_SUD_ROUTE], 'WA SUD route scope changed');
  assert.deepEqual(input.executionReclassification, HISTORICAL_MAPPING, 'WA SUD owner mapping instruction changed');
  assert.equal(input.legalResolution?.disposition, 'LEGAL_CLEAR');
  assert.equal(input.legalResolution?.decisionId, DECISION_ID);
  assert.equal(input.legalResolution?.decisionRecord, DECISION_PATH);
  const reviewBytes = read(WA_SUD_REVIEW);
  assert.equal(hash(reviewBytes), WA_SUD_REVIEW_SHA256, 'WA SUD independent semantic certificate changed');
  const doc = JSON.parse(reviewBytes), row = doc.rows.find(r => r.familyId === WA_SUD_FAMILY);
  assert(row && doc.rows.length === 1);
  assert.equal(doc.laneKind, 'independent-verification');
  assert.equal(doc.familyOutput, WA_SUD_DIRECTORY);
  assert.equal(row.independence.independentOfImplementer, true);
  assert.equal(row.independence.buildOrRegenerationPerformed, false);
  assert.equal(row.verdict, 'PASS');
  assert.equal(row.candidateCodeCommit, CANDIDATE);
  assert.deepEqual(Object.keys(row.proofObligations).sort(), [...OBLIGATIONS].sort());
  for (const obligation of OBLIGATIONS.filter(x => x !== 'CLIPPING_AND_OVERLAP')) {
    assert.equal(row.proofObligations[obligation].result, 'PASS');
    assert.equal(row.proofObligations[obligation].measured, true);
  }
  assert.equal(row.proofObligations.CLIPPING_AND_OVERLAP.measured, false);
  assert.equal(row.finalAcceptance, false);
  const selected = input.independentReturn;
  assert(selected?.evidencePath && selected?.verifiedAtBase, 'WA SUD has no selected independent review');
  if (selected.evidencePath === WA_SUD_REVIEW) {
    assert.equal(selected.verdict, row.verdict);
    assert.equal(selected.lane.toLowerCase(), row.lane.toLowerCase());
    assert.equal(selected.verifiedAtBase, row.verifiedAtBase);
  } else {
    // Mapping remains valid after a subsequent independent visual/final read,
    // including a negative read. Never replace that read's verdict with PASS.
    git(['merge-base', '--is-ancestor', row.verifiedAtBase, selected.verifiedAtBase]);
    const next = json(selected.evidencePath);
    assert.equal(next.laneKind, 'independent-verification');
    const matches = next.rows.filter(r => (r.familyId ?? r.itemId) === WA_SUD_FAMILY);
    assert.equal(matches.length, 1, 'Later selected review is ambiguous');
    const later = matches[0];
    assert.equal(later.verifiedAtBase ?? next.verifiedAtBase, selected.verifiedAtBase);
    assert.equal(later.verdict, selected.verdict);
    assert.equal((later.lane ?? next.lane).toLowerCase(), selected.lane.toLowerCase());
  }
  const bindings = row.currentCandidateBindings;
  assert.equal(bindings.length, 14);
  assert.equal(new Set(bindings.map(b => b.path)).size, bindings.length);
  for (const b of bindings) {
    const bytes = read(b.path);
    assert.equal(hash(bytes), b.sha256, `Custom candidate changed: ${b.path}`);
    assert.equal(bytes.length, b.bytes);
    atBase(CANDIDATE, b.path, bytes);
    atBase(row.verifiedAtBase, b.path, bytes);
    atBase(selected.verifiedAtBase, b.path, bytes);
  }
  const receipt = json(`${WA_SUD_DIRECTORY}/source-receipt.json`);
  assert.equal(receipt.familyId, WA_SUD_FAMILY);
  assert.equal(receipt.implementationStrategy, 'custom_pleading');
  assert.deepEqual(receipt.routeKeys, [WA_SUD_ROUTE]);
  assert.deepEqual(receipt.composedComponentsAuthoredByThisBuild, COMPONENTS);
  assert.equal(receipt.commercialRoutesOpened, 0);
  assert.equal(receipt.committedRecords.length, 5);
  for (const source of receipt.committedRecords) {
    const bytes = read(source.pathInRepository);
    assert.equal(hash(bytes), source.sha256, `Custom authority changed: ${source.pathInRepository}`);
    assert.equal(bytes.length, source.byteLength);
    atBase(row.verifiedAtBase, source.pathInRepository, bytes);
    atBase(selected.verifiedAtBase, source.pathInRepository, bytes);
  }
  const decision = json(DECISION_PATH).decisions.find(d => d.decisionId === DECISION_ID);
  assert.equal(decision.disposition, 'LEGAL_CLEAR');
  assert.deepEqual(decision.familyIds, [WA_SUD_FAMILY]);
  assert.equal(input.legalResolution.bindingProductRule, decision.bindingProductRule);
  const report = json(`${WA_SUD_DIRECTORY}/reports/rendered-artifacts.json`);
  assert.equal(report.familyId, WA_SUD_FAMILY);
  assert.equal(report.schemaVersion, 'rcap-rendered-artifacts/v1');
  assert.deepEqual(report.componentSet, COMPONENTS);
  assert.equal(report.pdfs.length, 2); assert.equal(report.artifacts.length, 2); assert.equal(report.packets.length, 2);
  const documents = ['canonical','boundary'].map(fixture => {
    const output = report.pdfs.filter(p => p.fixture === fixture);
    const artifacts = report.artifacts.filter(p => p.fixture === fixture);
    assert.equal(output.length, 1); assert.equal(artifacts.length, 1);
    const pdf = output[0], artifact = artifacts[0], relative = `${WA_SUD_DIRECTORY}/fixtures/${fixture}.pdf`;
    assert.equal(pdf.file, relative); assert.equal(artifact.file, relative);
    const bytes = read(relative);
    assert.equal(hash(bytes), pdf.sha256); assert.equal(bytes.length, pdf.byteLength);
    assert.equal((overrides.pageCount ?? pdfPageCount)(bytes), 10); assert.equal(pdf.pageCount, 10);
    assert.equal(artifact.sha256, pdf.sha256);
    assert.deepEqual(artifact.pageManifest, row.currentArtifacts.find(p => p.fixture === fixture).pageManifest);
    assert.equal(artifact.pageManifest.length, 10);
    return {fixture, path: relative, sha256: pdf.sha256, byteLength: pdf.byteLength, pageCount: 10};
  });
  // Additional fixture outputs are never silently left outside the raster set.
  const fixtureNames = (overrides.fixtureNames ?? (() => fs.readdirSync(path.join(root, WA_SUD_DIRECTORY, 'fixtures'))))();
  assert.deepEqual([...fixtureNames].sort(), ['boundary.pdf','canonical.pdf']);
  const authorBytes = read(doc.sourceBuildReturn.path);
  assert.equal(hash(authorBytes), doc.sourceBuildReturn.sha256);
  const author = JSON.parse(authorBytes).rows.find(r => r.familyId === WA_SUD_FAMILY);
  assert.equal(author.status, 'COMPLETED'); assert.equal(author.completenessResult, 'PASS_COMPLETE');
  assert.equal(author.overlayDirectory, WA_SUD_DIRECTORY);
  const counterReport = json(`${WA_SUD_DIRECTORY}/reports/completeness-counters.json`);
  assert.deepEqual(Object.keys(counterReport.counters).sort(), [...COUNTERS].sort());
  assert(COUNTERS.every(k => counterReport.counters[k] === 0 && row.nineCounters.authorReported[k] === 0));
  return {
    familyId: WA_SUD_FAMILY, directory: WA_SUD_DIRECTORY, implementationStrategy: 'custom_pleading',
    routes: input.routes.map(r => ({...r, currentOutputStrategy: 'custom_pleading',
      participantFacingInstrument: 'RCW 9.96.060(6) petition/declaration, notice/order, program evidence and filing instructions',
      requiredSourceIds: COMPONENTS.map(c => `component:${c}`)})),
    completeness: {familyId: WA_SUD_FAMILY, directory: WA_SUD_DIRECTORY, result: author.completenessResult,
      auditable: true, counters: counterReport.counters, findings: [], failedCounters: [],
      measurementProvenance: {authorReturn: doc.sourceBuildReturn, semanticReview: WA_SUD_REVIEW,
        customFieldsPerFixture: 53, customWritesPerFixture: 10, visualMeasuredIndependently: false}},
    sourceReconciliation: {implementationStrategyOverride: 'custom_pleading',
      disposition: 'SOURCE_READY', additionalRequiredSourceIds: [],
      satisfiedWithoutStandaloneBinary: ['official-form:CrRLJ-09.0100','official-form:CrRLJ-09.0200'],
      authorityBindings: [{sourceId:'official-authority:RCW-9.96.060-6', title:'RCW 9.96.060(6)',
        issuingAuthority:'Washington State Legislature', officialUrl:'https://app.leg.wa.gov/RCW/default.aspx?cite=9.96.060'}],
      requireBoundAuthority:true},
    executionReclassification: {...input.executionReclassification, stateOverride: null,
      historicalStateOverride: input.executionReclassification.stateOverride,
      historicalNextExecutableAction: input.executionReclassification.nextExecutableAction,
      nextExecutableAction: 'Raster the exact two reviewed custom packets (20 pages), then obtain independent final visual review.'},
    evidence: {semanticReview: WA_SUD_REVIEW, semanticReviewSha256: WA_SUD_REVIEW_SHA256,
      candidateCommit: CANDIDATE, reviewBase: row.verifiedAtBase, selectedReviewBase: selected.verifiedAtBase,
      documents, historicalMapping: structuredClone(input.executionReclassification),
      mappingOnly: true, finalAcceptance: false, grantsCommercialAuthority: false}
  };
}
