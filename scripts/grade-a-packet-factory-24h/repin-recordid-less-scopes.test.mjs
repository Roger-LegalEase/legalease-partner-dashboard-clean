import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { ADAPTERS } from './repin-lapsed-source-identities.mjs';
const ROUTES = 'src/lib/legal-authority/routes/single-routes.json';
const routes = ADAPTERS.get(ROUTES);
const routesDoc = JSON.parse(fs.readFileSync(ROUTES, 'utf8'));
const nm = { familyId: 'agency-application-treatment:obligation:runtime-only:NM:dna-sample-profile-expungement', jurisdiction: 'NM', routeKeys: ['obligation:runtime-only:NM:dna-sample-profile-expungement'] };
test('a compositionSources route-contract pin is scoped by the one contract its receipt route keys name', () => {
  const scope = routes.scopeFrom({ receipt: nm, pin: { path: ROUTES, sha256: '0'.repeat(64) }, currentDoc: routesDoc });
  assert.deepEqual(scope.anchorIds, ['NM:dna-sample-profile-expungement']);
  assert.equal(scope.derivation.routeContractFromReceiptRouteKeys, 'route-contract:NM:dna-sample-profile-expungement');
});
test('two named contracts, none, or the committedRecords shape without a recordId still refuse', () => {
  const other = routesDoc.routes.find((r) => r.jurisdiction !== 'NM');
  assert.throws(() => routes.scopeFrom({ receipt: { ...nm, routeKeys: [...nm.routeKeys, `obligation:runtime-only:${other.jurisdiction}:${other.pathwayId}`] }, pin: { path: ROUTES }, currentDoc: routesDoc }), /2 route contracts/);
  assert.throws(() => routes.scopeFrom({ receipt: { ...nm, routeKeys: ['obligation:track-only:NM:x'] }, pin: { path: ROUTES }, currentDoc: routesDoc }), /0 route contracts/);
  assert.throws(() => routes.scopeFrom({ receipt: nm, pin: { pathInRepository: ROUTES }, currentDoc: routesDoc }), /must name one exact recordId/);
});
const DECISIONS = 'data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json';
const decisions = ADAPTERS.get(DECISIONS);
const decisionsDoc = JSON.parse(fs.readFileSync(DECISIONS, 'utf8'));
const ny = { familyId: 'composed-treatment:obligation:research-decision-route:NY:ny_160_55_violation:sentencing_court_transmission_correction_request' };
const lanesWith = (rows) => { const root = fs.mkdtempSync(path.join(os.tmpdir(), 'repin-ny-')); fs.mkdirSync(path.join(root, 'vf09')); fs.writeFileSync(path.join(root, 'vf09', 'rows-test.json'), JSON.stringify({ rows })); return root; };
const measured = lanesWith([{ familyId: ny.familyId, verdict: 'PASS_COMPLETE_INDEPENDENT', sourceIdentity: crypto.createHash('sha256').update(fs.readFileSync(DECISIONS)).digest('hex') }]);
const scopeNy = (recordId, laneReturnRoot = measured) => decisions.scopeFrom({ receipt: ny, pin: { recordId }, currentDoc: decisionsDoc, laneReturnRoot });
test('a legal-decision:2026-08-28-national#<track> pin is scoped to the one decision that carries the track', () => {
  const scope = scopeNy('legal-decision:2026-08-28-national#ny_160_55_violation');
  assert.deepEqual(scope.anchorIds, ['research-track:ny_160_55_violation']);
  assert.equal(scope.derivation.measuredReVerification.length, 1);
});
test('the -national# shape reads only a bare track that exactly one decision carries', () => {
  assert.throws(() => scopeNy('legal-decision:2026-08-28-national#no_such_track'), /which 0 decisions/);
  assert.throws(() => scopeNy('legal-decision:2026-08-28-national#sc_22_5_910'), /which 2 decisions/);
  assert.throws(() => scopeNy('legal-decision:2026-08-28-national#research-track:ny_160_55_violation'), /names no legal-decision/);
  assert.throws(() => scopeNy('legal-decision:2026-08-28-other#ny_160_55_violation'), /names no legal-decision/);
});
test('the -national# shape still needs a measured re-verification at the current digest', () => {
  assert.throws(() => scopeNy('legal-decision:2026-08-28-national#ny_160_55_violation', lanesWith([])), /no independent re-verification row/);
});
