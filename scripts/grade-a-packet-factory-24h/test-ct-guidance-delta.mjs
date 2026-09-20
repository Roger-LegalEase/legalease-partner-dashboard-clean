import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { FAMILY as provisional } from '../build-census-v1-agency-application-treatment:obligation:track-only:CT:ct-provisional-pardon.mjs';
import { FAMILY as absolute } from '../build-census-v1-agency-application-treatment:obligation:track-pathway:CT:ct-absolute-pardon:absolute-pardon-resulting-in-erasure.mjs';
import { annotationIsSourceBound, carryForwardIdentityRefresh } from '../rcap-packet-completeness/identity-refresh.mjs';

const portal = 'https://epardonportal.ct.gov/portal';
const matrix = [];
for (const family of [provisional, absolute]) {
  const maps = family.maps();
  for (const fixture of ['canonical', 'boundary']) {
    const body = family.composedBody('agency_preparation_guide', family.fixtures[fixture]);
    const instructions = family.participantInstructions([]);
    for (const [path, deliveredText] of [['composedBody', body], ['participantInstructions', instructions]]) {
      assert.ok(deliveredText.includes(portal), 'Actual delivered path must name the portal');
      assert.match(deliveredText, /guide is not (?:that application|a substitute)|preparation guide, not an official form/i);
      assert.match(deliveredText, /sign|signature/i);
      if (family === provisional) {
        assert.match(deliveredText, /more than 90 days of supervision remaining/i);
        assert.match(deliveredText, /apply through your probation officer/i);
        assert.match(deliveredText, /unknown supervision status|supervision status or remaining period is unknown/i);
        assert.match(deliveredText, /Exactly 90 days does not satisfy this more-than-90-day handoff/i);
        assert.match(deliveredText, /does not (?:itself )?establish eligibility/i);
        assert.match(deliveredText, /Background Investigation Authorization/);
        assert.match(deliveredText, /unsigned to a notary/i);
        assert.match(deliveredText, /supervising officer.*complete.*questionnaire/i);
        assert.doesNotMatch(deliveredText, /participant (?:is eligible|has completed|signed|is on probation)/i);
      } else {
        assert.match(deliveredText, /application-process-and-instructions/);
        assert.match(deliveredText, /expedited review without (?:one|a hearing)/i);
        assert.match(deliveredText, /Board decides/);
        assert.doesNotMatch(deliveredText, /It is discretionary and hearing-based/);
      }
      matrix.push({ familyId: family.familyId, fixture, deliveredPath: path, status: 'PASS' });
    }
  }
  if (family === provisional) {
    for (const key of ['canonicalRefusals', 'boundaryRefusals']) {
      const handoffs = maps.flatMap(m => m[key]).filter(r => JSON.stringify(r).includes('supervision_destination'));
      assert.equal(handoffs.length, 1, 'Unknown supervision is an explicit missing-fact entry in each actual map');
      assert.match(JSON.stringify(handoffs[0]), /more than 90/);
    }
  }
  const receipt = JSON.parse(fs.readFileSync(`${family.outDir}/source-receipt.json`));
  const annotated = receipt.compositionSources.filter(p => p.identityRefresh);
  assert.equal(annotated.length, 2, 'Rebuild preserves both source-identity refresh annotations');
  for (const pin of receipt.compositionSources) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(pin.path)).digest('hex'), pin.sha256);
    if (pin.identityRefresh) assert.equal(annotationIsSourceBound(pin.identityRefresh).ok, true);
  }
  const next = structuredClone(receipt);
  for (const p of next.compositionSources) delete p.identityRefresh;
  const carried = carryForwardIdentityRefresh(receipt, next);
  assert.equal(carried.carried.length, 2);
  assert.equal(carried.dropped.length, 0);
}
console.log(JSON.stringify({status: 'PASS', actualInvokingPathCases: matrix, filingPositiveApplicationClaims: 0, scope: 'Guide destinations, unknown supervision, exact90/>90 disclosure, protected roles, current source pins, source-note preservation; no independent review or treatment grant.'}, null, 2));
