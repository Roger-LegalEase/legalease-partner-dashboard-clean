#!/usr/bin/env node
// OD-BR-1: fixed synthetic Y2 witnesses and genuine native Y2 protected drafts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

process.env.RCAP_EVALUATOR_TODAY = '2026-07-01';
globalThis.fetch = () => { throw Error('NETWORK_FORBIDDEN'); };
const url = p => pathToFileURL(`${process.cwd()}/${p}`).href;
register(url('scripts/lib/ts-esm-loader.mjs'));
const mode = process.argv[2] ?? 'candidate';
assert(['candidate', 'remove-own-pair', 'add-md-foreign'].includes(mode));
if (mode !== 'candidate') {
  const anchor = mode === 'remove-own-pair'
    ? '"AR:situation-b-misdemeanor-convictions": ["rule-07-there-is-no-limit-on-how-many-misdemeanors-may-be-seale"],'
    : 'const REVIEWED_OWN_CONTENT_PAYMENT_RULES = {';
  const replacement = mode === 'remove-own-pair' ? '' : anchor + '\n"MD:pardoned-conviction-expungement-under-crim-proc-10-105-a-8": ["rule-44-shieldable-conviction-4-503-petition-shield-3-yrs-once"],';
  register('data:text/javascript,' + encodeURIComponent(`export async function load(u,c,next){const r=await next(u,c);if(!u.endsWith('/src/lib/rcap-engine/evaluator.ts'))return r;const s=String(r.source),anchor=${JSON.stringify(anchor)};if(s.split(anchor).length!==2)throw Error('mutant anchor absent or nonunique');return {...r,source:s.replace(anchor,${JSON.stringify(replacement)})};}`));
}
const { getProfileByJurisdiction } = await import(url('src/lib/rcap-engine/profile-registry.ts'));
const { evaluateScreening } = await import(url('src/lib/rcap-engine/evaluator.ts'));
const { evaluateAuthoritativeScreeningResult } = await import(url('src/lib/expungement-ai/authoritative-screening-result.ts'));
const P = await import(url('src/lib/expungement-ai/packet-information.ts'));
const B = await import(url('src/lib/expungement-ai/briefcase-presentation-authority.ts'));
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/od-br-1-payment-ownership.json', import.meta.url)));
assert.equal(fixture.cases.filter(row => row.borrowedPaid && row.expected.paymentAllowed).length, 27);
assert.equal(fixture.cases.filter(row => row.borrowedPaid && !row.expected.paymentAllowed).length, 16);
assert.equal(new Set(fixture.cases.filter(row => row.borrowedPaid && !row.expected.paymentAllowed)
  .map(row => `${row.jurisdiction}:${row.expected.pathwayId}`)).size, 6);
const failures = [];
let checks = 0;
function check(label, fn) {
  checks++;
  try { fn(); } catch (error) { failures.push({ label, error: error.message }); }
}
for (const row of fixture.cases) {
  const answers = structuredClone(row.answers), before = JSON.stringify(answers);
  const profile = getProfileByJurisdiction(row.jurisdiction);
  const actual = evaluateScreening({ jurisdiction: row.jurisdiction, profileVersion: profile.profileVersion, matterId: `verify3-borrowed-${row.jurisdiction}`, answers });
  check(`evaluation:${row.index}:${row.jurisdiction}:${row.expected.pathwayId}`, () => assert.deepEqual(actual, row.expected));
  check(`saved-answers:${row.index}`, () => assert.equal(JSON.stringify(answers), before));
}

// OD-BR-1 D2: Lead 2026-10-21 18:54:33 adopted these exact own-content pairs.
const publicOwnPairs = {
  "AK:confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40": "rule-10-mechanism-3-confidentiality-of-acquittals-dismissals-as",
  "CA:tool-4-arrest-record-sealing": "rule-15-tool-4-arrest-record-sealing-pc-851-91-factual-innocenc",
  // Lead 2026-10-21 19:53:10: rule-09 is this route's own conversion.
  "HI:first-time-drug-conviction": "rule-09-the-source-identifies-hrs-706-622-5-and-706-622-8-first",
  "HI:nonconviction-arrest-expungement": "rule-04-a-complete-application-valid-government-photo-id-paymen",
  "NC:dismissal-and-not-guilty-expunction-under-g-s-15a-146": "rule-01-family-1-dismissals-and-not-guilty-findings-g-s-15a-146",
  "ND:deferred-imposition-dismissal-and-sealing": "rule-29-path-d-deferred-imposition-of-sentence-dismissal",
  "NE:set-aside-probation-fine-community-service": "rule-05-the-sentence-conditions-must-be-satisfactorily-complete",
  "NH:annulment-after-dismissal-acquittal-or-nonprosecution": "rule-11-for-offenses-disposed-of-before-january-1-2019-a-person",
  "OH:adult-non-conviction-sealing-or-expungement-under-2953-33": "rule-05-grand-jury-no-bill-non-conviction-sealing-or-expungemen",
  "VA:regime-1-expungement-available-now": "rule-01-regime-1-expungement-19-2-392-2-available-now"
};
const publicFixtures = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
const publicAnswerSets = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses;
const { packetFulfillmentAuthority } = await import(url('src/lib/expungement-ai/packet-fulfillment-authority.ts'));
for (const [key, rule] of [...Object.entries(publicOwnPairs),
  ['LA:non-conviction-arrest-expungement', null], ['NE:set-aside-incarceration-one-year-or-less', null]]) {
  check(`${key}:public-rule-ownership`, () => {
    const [jurisdiction, pathwayId] = key.split(':');
    const witness = (jurisdiction === 'VA' ? publicAnswerSets : publicFixtures).find(row => row.pathwayKey === key);
    assert(witness);
    const answers = structuredClone(jurisdiction === 'VA' ? witness.finalAnswers : witness.answers);
    if (key === 'HI:first-time-drug-conviction') answers.hi_court_order_confirmed = 'Yes';
    const before = structuredClone(answers);
    const profile = getProfileByJurisdiction(jurisdiction);
    const actual = evaluateScreening({ jurisdiction, profileVersion: profile.profileVersion, matterId: 'synthetic-public-own-content', answers });
    assert.equal(actual.pathwayId, pathwayId);
    assert.equal(actual.paymentAllowed, rule !== null);
    if (rule) assert.equal(actual.reasons[0].code, `${jurisdiction.toLowerCase()}.compiled_rule_match.${rule}`);
    assert.equal(packetFulfillmentAuthority(jurisdiction, pathwayId, 'checkout creation').allowed, false);
    assert.deepEqual(answers, before);
  });
}

// Remove all route rules only in memory, restoring the shared profile before the next check.
const missingRule = fixture.cases.find(row => row.jurisdiction === 'HI' && row.expected.paymentAllowed);
assert(missingRule);
const profile = getProfileByJurisdiction(missingRule.jurisdiction), rules = profile.orderedDecisionRules;
try {
  profile.orderedDecisionRules = [];
  const answers = structuredClone(missingRule.answers), before = JSON.stringify(answers);
  const actual = evaluateScreening({ jurisdiction: missingRule.jurisdiction, profileVersion: profile.profileVersion, matterId: 'missing-rule', answers });
  check('missing-rule:payment-denied', () => assert.equal(actual.paymentAllowed, false));
  check('missing-rule:saved-answers', () => assert.equal(JSON.stringify(answers), before));
} finally { profile.orderedDecisionRules = rules; }

for (const row of fixture.legacy) {
  const verification = structuredClone(row.verification), answers = structuredClone(row.answers);
  const before = JSON.stringify({ verification, answers });
  const expected = fixture.cases.find(c => c.index === row.index);
  const newlyClosed = row.baselinePaymentAllowed && !expected.expected.paymentAllowed;
  check(`${row.route}:historical-hash`, () => assert.equal(P.protectedPacketDraftHash(verification.draftSnapshot), verification.draftHash));
  // The existing model refuses changed payment authority before presentation. No legacy migration is claimed.
  check(`${row.route}:historical-model`, () => assert.equal(!!P.protectedPacketInformationModelFor(verification), newlyClosed ? false : row.modelAvailable));
  const actual = await B.decorateBriefcaseItemForPresentationWithDependencies({
    consumerAuthUserId: '00000000-0000-4000-8000-000000000037', item: row.item
  }, {
    readProtectedArtifact: async () => ({ ok: true, value: null }),
    readProtectedVerification: async () => ({ ok: true, value: verification }),
    readTrustedPendingSource: async () => ({ ok: true, value: {
      jurisdiction: row.item.jurisdiction, profileVersion: verification.draftSnapshot.profileVersion,
      matterId: row.item.id, answers, product: 'expungement_ai_dtc', sourceSessionId: 'synthetic-only',
      claimedAt: '2026-10-21T00:00:00.000Z', partnerBenefitActive: false, partnerSlug: null
    } }),
    readPaymentAuthority: async () => ({ valid: false, reason: 'unpaid' }),
    evaluateAuthoritative: evaluateAuthoritativeScreeningResult,
    readCommercialActions: async () => ({ fulfillmentAvailable: false, checkoutAllowed: false, generationAllowed: false })
  });
  check(`${row.route}:protected-authority`, () => {
    if (newlyClosed) {
      assert.equal(actual.authorityStatus, 'unavailable');
      assert.equal(actual.unavailableReason, 'protected_packet_draft_invalid');
      assert.equal(actual.packetDraft.status, 'unavailable');
    } else {
      assert.deepEqual({
        authorityStatus: actual.authorityStatus, unavailableReason: actual.unavailableReason ?? null,
        packetDraftStatus: actual.packetDraft.status, resultCode: actual.resultCode,
        paymentState: actual.paymentState, commercialActions: actual.commercialActions
      }, row.baselinePresentation);
    }
  });
  check(`${row.route}:no-commercial-promotion`, () => {
    assert(Object.values(actual.commercialActions).every(value => value === false));
    assert.notEqual(actual.verificationStatus, 'verified');
  });
  check(`${row.route}:raw-preserved`, () => assert.equal(JSON.stringify({ verification, answers }), before));
}
console.log(JSON.stringify({ mode, checks, passed: checks - failures.length, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
