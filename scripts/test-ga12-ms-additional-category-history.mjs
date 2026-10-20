import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

register('./lib/ts-esm-loader.mjs', import.meta.url);
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { msAdditionalCategoryIsHistory: historyContext, resolvePacketCollection } = await import('../src/lib/expungement-ai/packet-collection.ts');

// GA-12 / QD-bd6b15fff22cbe1501cb: distinct justice/municipal obligations.
const cases = [
  ['Q-02b21081ef9ffebfc474', 'additional-justice-court-misdemeanor-relief-9-11-15-3', 'Miss. Code Ann. § 9-11-15(3)'],
  ['Q-59616e6bc8916f7a961f', 'additional-municipal-court-misdemeanor-relief-21-23-7-6', 'Miss. Code Ann. § 21-23-7(6)']
];
const witnesses = JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses;
const profile = getProfileByJurisdiction('MS');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const category = 'offense_category';
const maps = ['screeningAnswers', 'prefilledAnswers', 'packetAnswers'];
const safety = snapshot => ({
  pathwayId: snapshot.pathwayId, resultCode: snapshot.resultCode,
  paymentAllowed: snapshot.paymentAllowed, selectedTrackId: snapshot.selectedTrackId,
  packetPlan: snapshot.packetPlan, requiredInputIds: snapshot.requiredInputIds,
  packetFamilyIdentifiers: snapshot.packetFamilyIdentifiers
});
let checks = 0;
const records = new Map();
function check(name, fn) {
  try { fn(); checks++; } catch (error) { console.error(name); throw error; }
}
for (const [questionRecordId, route, statute] of cases) {
  const witness = witnesses.find(w => w.pathwayKey === `MS:${route}`);
  assert(witness);
  const answers = structuredClone(witness.finalAnswers);
  const specification = packetSpecificationFor(`MS:${route}`);
  const authoritative = evaluate({ jurisdiction: 'MS', profileVersion: profile.profileVersion,
    matterId: `synthetic-${questionRecordId}`, answers });
  check(`${route}: exact branch and existing source hold without category`, () => {
    assert.equal(authoritative.evaluation.pathwayId, route);
    assert.equal(authoritative.evaluation.resultCode, 'guidance_only');
    assert.equal(authoritative.evaluation.reasons[0].code, 'ms.guidance_only_no_user_filed_court_petition');
    assert.equal(authoritative.evaluation.paymentAllowed, false);
    assert.equal(JSON.stringify(specification).includes(category), false);
    for (const id of ['conviction_list', 'last_conviction_any_court_date', 'prosecuting_authority', 'section_branch']) {
      assert(specification.requiredFacts.some(f => f.factId === id));
      assert(authoritative.evaluation.packetPlan.requiredInputIds.includes(id));
    }
    const authority = profile.pathways.find(p => p.id === route).legalAuthority;
    assert.equal(authority.decisionId, 'LD-MS-01'); assert.equal(authority.statute, statute);
    assert.equal(authority.timing.anchorFactId, 'last_conviction_date');
    assert.equal(authority.timing.value, 2); assert.equal(authority.timing.unit, 'years');
    assert.equal(specification.routeKey, `MS:${cases[0][1]}`); // registered shared specification, not branch substitution
    const conviction = evaluate({ jurisdiction: 'MS', profileVersion: profile.profileVersion,
      matterId: `synthetic-${questionRecordId}`, answers: { ...answers, case_outcome: 'Misdemeanor conviction', last_conviction_date: '2018-01-01' } }).evaluation;
    assert.equal(conviction.pathwayId, route); assert.equal(conviction.resultCode, 'guidance_only');
    assert.equal(conviction.reasons[0].code, 'ms.guidance_only_no_user_filed_court_petition');
    assert.equal(conviction.paymentAllowed, false);
  });
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers,
    packetAnswers: {}, dependencies: {}, capturedAt: '2026-10-17T00:00:00.000Z' });
  assert(seed);
  const original = { status: 'unverified', reason: 'synthetic_current_source_witness', revision: 0,
    draftHash: seed.hash, draftSnapshot: seed.snapshot };
  records.set(`synthetic-${questionRecordId}`, structuredClone(original));
  const model = record => P.protectedPacketInformationModelFor(record);
  check(`${route}: no new category gate or inferred classification`, () => {
    const m = model(original);
    assert(m);
    assert(!m.builderQuestions.some(q => q.id === category));
    assert(!m.missingInputIds.includes(category));
    for (const map of maps) assert(!Object.hasOwn(seed.snapshot[map], category));
  });
  check(`${route}: existing saved-item model retains optional literal context`, () => {
    const item = { id: `synthetic-${questionRecordId}`, state: 'MS', resultCode: 'guidance_only', artifactRefs: {
      commercialFlow: { screening: { profileVersion: profile.profileVersion, pathwayId: route,
        packetPlan: seed.snapshot.packetPlan, answers }, packetInformation: { answers: { [category]: 'Saved court category' } } }
    } };
    const before = structuredClone(item), m = P.packetInformationModelFor(item);
    assert(m);
    assert.equal(m.questions.find(q => q.id === category)?.required, false);
    assert.equal(m.builderQuestions.find(q => q.id === category)?.required, false);
    assert.equal(m.initialAnswers[category], 'Saved court category');
    assert.deepEqual(item, before);
  });
  for (const map of maps) for (const raw of ['Literal court category', 'Count 1 possession; count 2 theft', { value: 'Amended literal category', unknown: false },
    { unknown: true }, null, ['Old incompatible category shape']]) {
    const record = structuredClone(original);
    record.draftSnapshot[map][category] = structuredClone(raw);
    record.draftHash = P.protectedPacketDraftHash(record.draftSnapshot);
    const before = structuredClone(record);
    check(`${route}: optional raw history ${map}/${JSON.stringify(raw)}`, () => {
      const m = model(record);
      assert(m);
      assert.equal(m.questions.find(q => q.id === category)?.required, false);
      assert.equal(m.builderQuestions.find(q => q.id === category)?.required, false);
      assert(!m.missingInputIds.includes(category));
      assert.deepEqual(record, before);
      assert.deepEqual(safety(record.draftSnapshot), safety(seed.snapshot));
      assert.deepEqual(P.evaluateProtectedPacketFacts(record.draftSnapshot, undefined, authoritative.evaluation.matterId).evaluation, authoritative.evaluation);
      const patch = P.packetInformationPatch({ existingItem: { id: `synthetic-${questionRecordId}`, jurisdiction: 'MS', artifactRefs: {} },
        answers: {}, protectedVerification: record });
      assert(patch);
      assert.deepEqual(patch.protectedTransition.nextVerification, before);
    });
  }
  check(`${route}: source, route and new consumer refusals`, () => {
    assert(historyContext(profile, route, specification));
    for (const mutate of [p => p.jurisdiction.code = 'NY', p => p.profileVersion = 'changed',
      p => p.source.sourceCorpusSha256 = 'changed', p => p.pathways.find(row => row.id === route).triggerFields.push('new'),
      p => p.packetGenerator.pathways.find(row => row.pathwayId === route).formCandidates.push('new-form'),
      p => p.questions.push({ id: category, type: 'text_or_unknown' }),
      p => p.pathways.find(row => row.id === route).legalAuthority.screeningFactIds.push(category),
      p => p.exclusionRules.push({ id: 'new', condition: { factId: category, equals: 'new' } }),
      p => p.questionLifecycle = { routeConsumers: { [category]: [route] } }]) {
      const changed = structuredClone(profile); mutate(changed);
      assert.equal(historyContext(changed, route, specification), false);
    }
    assert.equal(historyContext(profile, route, null), false);
    for (const mutate of [s => s.specificationSha256 = 'changed', s => s.routeKey = 'MS:other',
      s => s.requiredFacts.push({ factId: category }),
      s => s.documents[0].sections.push({ kind: 'paragraph', template: '{{offense_category}}' })]) {
      const changed = structuredClone(specification); mutate(changed);
      assert.equal(historyContext(profile, route, changed), false);
    }
    for (const sibling of profile.pathways.filter(row => !cases.some(c => c[1] === row.id)))
      assert.equal(historyContext(profile, sibling.id, specification), false);
  });
  check(`${route}: exact collection dispositions and explicit overrides`, () => {
    const input = { jurisdiction: 'MS', pathwayId: route, requiredInputIds: [category, 'conviction_list', 'last_conviction_any_court_date', 'prosecuting_authority'],
      serverFacts: {}, screeningAnswers: answers, savedAnswers: {}, specification, questionById: new Map() };
    const resolved = resolvePacketCollection(input);
    assert.deepEqual(resolved.facts.find(f => f.factId === category), {
      factId: category, collection: 'conditional', phase: 'known', group: null, active: false, optional: true,
      source: 'ms_additional_category_history',
      reason: 'These source-bound lower-court branches use the target court, conviction list and last-conviction facts. Earlier category answers remain optional literal history; they establish neither the court branch, good conduct, timing nor a discretionary finding.'
    });
    assert.equal(resolved.derivedFacts[category], undefined);
    for (const id of ['conviction_list', 'last_conviction_any_court_date', 'prosecuting_authority'])
      assert.notEqual(resolved.facts.find(f => f.factId === id)?.optional, true);
    for (const extra of [
      { recordOwnQuestionIds: new Set([category]) },
      { override: { routeKey: `MS:${route}`, classes: { [category]: 'render_required' } } },
      { override: { routeKey: `MS:${route}`, needsHumanClassification: [category] } }
    ]) assert.notEqual(resolvePacketCollection({ ...input, ...extra }).facts.find(f => f.factId === category).source,
      'ms_additional_category_history');
  });
}

// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-ms-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'MS', artifactRefs: {} });
globalThis.__msCategoryTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-ms-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-ms-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-ms-owner');
    assert.equal(transition.expectedPriorRevision, records.get(briefcaseItemId).revision);
    records.set(briefcaseItemId, structuredClone(transition.nextVerification)); saves++;
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  decorateBriefcaseItemForPresentation: async () => ({ commercialActions: {} }),
  protectedPacketVerificationSeedFromTrustedSource: () => { throw Error('No substitute source'); },
  readTrustedBriefcasePresentationSource: () => { throw Error('No substitute source'); }
};
const apiUrl = pathToFileURL(`${process.cwd()}/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts`).href;
let source = fs.readFileSync(new URL(apiUrl), 'utf8');
for (const [bindings, module] of [
  [['getRcapBriefcaseAuthState'], '@/lib/rcap/briefcase/auth'],
  [['getBriefcaseItem'], '@/lib/expungement-ai/briefcase'],
  [['decorateBriefcaseItemForPresentation', 'protectedPacketVerificationSeedFromTrustedSource', 'readTrustedBriefcasePresentationSource'], '@/lib/expungement-ai/briefcase-presentation-authority'],
  [['persistProtectedPacketVerification', 'readProtectedPacketVerification'], '@/lib/expungement-ai/verification-cas']
]) {
  const pattern = new RegExp('import \\{\\s*' + bindings.join(',\\s*') + '\\s*\\} from "' + module + '";');
  assert(pattern.test(source));
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__msCategoryTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });
for (const [id, original] of [...records]) {
  const stored = structuredClone(original);
  stored.draftSnapshot.screeningAnswers[category] = 'Original court category';
  stored.draftSnapshot.prefilledAnswers[category] = { value: 'Earlier unresolved category', unknown: true };
  stored.draftSnapshot.packetAnswers[category] = 'Independent packet category';
  stored.draftHash = P.protectedPacketDraftHash(stored.draftSnapshot);
  records.set(id, stored);
  const otherMatters = [...records].filter(([key]) => key !== id).map(([key, value]) => [key, structuredClone(value)]);
  let response = await post(id, {});
  check(`${id}: HTTP no-op preserves every raw copy`, () => { assert.equal(response.status, 200); assert.deepEqual(records.get(id), stored); });
  response = await post(id, { [category]: { value: 'Participant amendment', unknown: false } });
  const body = await response.json();
  check(`${id}: explicit amendment archives raw history without authority`, () => {
    assert.equal(response.status, 200);
    const next = records.get(id);
    assert.deepEqual(next.draftSnapshot.packetAnswers[category], { value: 'Participant amendment', unknown: false });
    for (const map of maps) {
      for (const fact of ['conviction_list', 'last_conviction_any_court_date', 'prosecuting_authority', 'charge', 'offense_level', 'record_type'])
        assert.deepEqual(next.draftSnapshot[map][fact], stored.draftSnapshot[map][fact]);
      const history = next.draftSnapshot.dependencies.semanticAnswerHistory.find(h =>
        h.factId === category && h.source === map && h.meaning === 'prior_factual_pathway_answer');
      assert(history, `${map} history retained`);
      assert.deepEqual(history.value, stored.draftSnapshot[map][category]);
      assert.equal(history.routeKey, `MS:${original.draftSnapshot.pathwayId}`);
    }
    assert.deepEqual(safety(next.draftSnapshot), safety(original.draftSnapshot));
    assert.deepEqual(P.evaluateProtectedPacketFacts(next.draftSnapshot).evaluation, P.evaluateProtectedPacketFacts(original.draftSnapshot).evaluation);
    assert.equal(next.draftSnapshot.paymentAllowed, false);
    assert.equal(next.draftSnapshot.resultCode, 'guidance_only');
    assert.equal(next.status, 'unverified');
    assert.equal(body.readyToGenerate, false);
    assert(!body.missingInputIds.includes(category));
    assert.equal(body.reviewQuestions.find(q => q.id === category).required, false);
    for (const [key, value] of otherMatters) assert.deepEqual(records.get(key), value);
  });
  response = await post(id, { [category]: { unknown: true } });
  check(`${id}: explicit unknown stays unknown`, () => {
    assert.equal(response.status, 200);
    assert.deepEqual(records.get(id).draftSnapshot.packetAnswers[category], { unknown: true });
    assert.deepEqual(safety(records.get(id).draftSnapshot), safety(original.draftSnapshot));
    assert.deepEqual(P.evaluateProtectedPacketFacts(records.get(id).draftSnapshot).evaluation, P.evaluateProtectedPacketFacts(original.draftSnapshot).evaluation);
  });
  const before = structuredClone(records.get(id)), savesBefore = saves;
  for (const [kind, status, error] of [['stale', 409, 'revision_conflict'], ['anonymous', 401, 'auth_required'],
    ['unverified', 403, 'verified_account_required'], ['other-owner', 404, 'matter_not_found']]) {
    authenticated = kind !== 'anonymous'; verified = kind !== 'unverified';
    owner = kind === 'other-owner' ? 'another-owner' : 'synthetic-ms-owner';
    response = await post(id, { [category]: 'Forbidden amendment' }, kind === 'stale' ? { expectedRevision: 0 } : {});
    const denial = await response.json();
    check(`${id}: ${kind} refusal`, () => {
      assert.equal(response.status, status); assert.equal(denial.error, error);
      assert.deepEqual(records.get(id), before); assert.equal(saves, savesBefore);
    });
  }
  authenticated = true; verified = true; owner = 'synthetic-ms-owner';
}
delete globalThis.__msCategoryTransport;
console.log(JSON.stringify({ status: 'PASS', checks, originalIds: [...cases.map(c => c[0]), 'QD-bd6b15fff22cbe1501cb'],
  scope: 'isolated collection/protected transitions/HTTP transport; no hosted owner, database or delivery proof' }));
// GA-16-M01508/M01510 location/history checks share this existing CI command.
await import('./test-ms-additional-location-history.mjs');
