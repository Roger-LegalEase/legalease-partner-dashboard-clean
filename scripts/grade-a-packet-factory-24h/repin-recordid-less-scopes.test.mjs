import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
