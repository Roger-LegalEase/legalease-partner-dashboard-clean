import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
const mutation=process.argv.find(arg=>arg.startsWith('--mutation='))?.slice(11);
const mutations={
 context:['export function arBoundCategoryIsHistory(profile, pathwayId, specification) {','export function arBoundCategoryIsHistory(profile, pathwayId, specification) { return true;'],
 collection:['if ((arCategoryHistory || alCategoryHistory','if ((false || alCategoryHistory'],
 ownership:['factId === "offense_category" && !overrideClass','factId === "offense_category"'],
 question:['"ar_bound_category_history", "al_three_route_category_history"','"disabled_ar_category_history", "al_three_route_category_history"'],
 history:['arBoundCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))','false'],
 loss:['const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);','const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds); delete shapesPreserved.packetAnswers.offense_category;'],
 priority:['const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds);','const shapesPreserved = preserveProtectedLegacyShapes(seeded, legacy.inspection, replacedLegacyIds); shapesPreserved.packetAnswers.offense_category = "Inferred category";']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`import {writeSync}from 'node:fs';let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith(d[2])){if(!r.source.includes(d[0]))throw Error('mutation target absent');writeSync(2,'APPLIED '+d[3]+'\\n');return {...r,source:r.source.replace(d[0],d[1])}}return r}`),{data:[...mutations[mutation],['collection','context','ownership'].includes(mutation)?'/packet-collection.ts':'/packet-information.ts',mutation]});}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const {packetFulfillmentAuthority}=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const {createConsumerPaymentPlaceholder}=await import('../src/lib/expungement-ai/payment-adapter.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { arBoundCategoryIsHistory: historyContext, resolvePacketCollection } = await import('../src/lib/expungement-ai/packet-collection.ts');

// GA-12 / QD-bd6b15fff22cbe1501cb: three source-bound AR category consumers.
const cases = [
  [
    "Q-5669a607a2c263da9210",
    "situation-a-non-convictions"
  ],
  [
    "Q-1a4aa8d2344a31d564ec",
    "situation-b-misdemeanor-convictions"
  ],
  [
    "Q-3ab723a5bbe4701b2309",
    "situation-c-felony-convictions"
  ]
];
const fixtures=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures;
const profile = getProfileByJurisdiction('AR');
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
  try { fn(); checks++; } catch (error) { console.error(JSON.stringify({failedCheck:name,checks})); throw error; }
}
for (const [questionRecordId, route] of cases) {
  const witness=fixtures.find(f=>f.pathwayKey===`AR:${route}`);assert(witness);
  const answers=structuredClone(witness.answers), historicalGate=route!=='situation-b-misdemeanor-convictions';
  const [resultCode,reason]=route==='situation-a-non-convictions'?['not_covered_yet','ar.intentional_unsupported_route']:route==='situation-b-misdemeanor-convictions'?['guidance_only','ar.waiting_rule_not_executed']:['needs_review','ar.waiting_rule_not_executed'];
  const authoritative = evaluate({ jurisdiction: 'AR', profileVersion: profile.profileVersion,
    matterId: `synthetic-${questionRecordId}`, answers });
  check(`${route}: exact conditional information authority`, () => {
    assert.equal(authoritative.evaluation.pathwayId, route);
    assert.equal(authoritative.evaluation.resultCode,resultCode);
    assert.equal(authoritative.evaluation.reasons[0].code, reason);
    assert.equal(authoritative.evaluation.paymentAllowed, false);
    assert.equal(profile.questions.some(q=>q.id===category),false);
  });
  const seed = P.protectedPacketDraftSeedFromAuthoritative({ authoritative, screeningAnswers: answers,
    packetAnswers: {}, dependencies: {}, capturedAt: '2026-10-17T00:00:00.000Z' });
  assert(seed);
  const original = { status: 'unverified', reason: 'synthetic_current_source_witness', revision: 0,
    draftHash: seed.hash, draftSnapshot: seed.snapshot };
  records.set(`synthetic-${questionRecordId}`, structuredClone(original));
  check(`${route}: actual fulfillment refusal`,()=>{
    const refusal=packetFulfillmentAuthority('AR',route,'checkout creation');assert.equal(refusal.allowed,false);
    assert.equal(refusal.reason,`AR:${route}: NO_RECORD. No Grade-A fulfillment record binds AR:${route}; a route nobody has written a record for fails closed.`);
    const price=createConsumerPaymentPlaceholder({...seed.snapshot,state:'AR'},route);assert.equal(price.enabled,false);assert.equal(price.amountCents,undefined);
  });
  for(const [label,delta,result,code]of [
    ['federal',{jurisdiction_scope:'Federal'},'hard_stop','ar.federal_or_out_of_scope'],
    ['excluded',{ar_record_origin:'other_state'},route==='situation-b-misdemeanor-convictions'?'guidance_only':'likely_not_eligible','ar.record_origin_outside'],
    ['uncertain',{case_outcome:'I am not sure'},route==='situation-b-misdemeanor-convictions'?'guidance_only':'needs_review','ar.source_fact_unknown']
  ])check(`${route}: ${label} keeps predecessor outcome and saved history`,()=>{
    const input={...answers,...delta};
    const a=evaluate({jurisdiction:'AR',profileVersion:profile.profileVersion,matterId:'synthetic-boundary-'+questionRecordId,answers:input});
    assert.equal(a.evaluation.resultCode,result);assert.equal(a.evaluation.reasons[0].code,code);assert.equal(a.evaluation.paymentAllowed,false);
    assert.throws(()=>evaluate({jurisdiction:'AR',profileVersion:profile.profileVersion,answers:{...input,offense_category:'Injected category'}}),/Unknown question ids: offense_category/);
    if(label==='uncertain'){
      const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:input,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
      for(const raw of [undefined,'Literal court category',{unknown:true},['Earlier category','Another category']]){
        const snapshot=structuredClone(seed.snapshot);if(raw!==undefined)snapshot.packetAnswers.offense_category=structuredClone(raw);
        const record={status:'unverified',revision:0,draftSnapshot:snapshot,draftHash:P.protectedPacketDraftHash(snapshot)};
        const evaluated=P.evaluateProtectedPacketFacts(snapshot).evaluation;
        assert.equal(evaluated.resultCode,result);assert.equal(evaluated.reasons[0].code,code);assert.equal(evaluated.paymentAllowed,false);
        assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,record);
      }
    }
  });
  const model = record => P.protectedPacketInformationModelFor(record);
  check(`${route}: no new category gate or inferred classification`, () => {
    const m = model(original);
    assert(m);
    assert(!m.builderQuestions.some(q => q.id === category));
    assert(!m.missingInputIds.includes(category));
    for (const map of maps) assert(!Object.hasOwn(seed.snapshot[map], category));
  });
  check(`${route}: existing saved-item model retains optional literal context`, () => {
    const item = { id: `synthetic-${questionRecordId}`, state: 'AR', resultCode, artifactRefs: {
      commercialFlow: { screening: { profileVersion: profile.profileVersion, pathwayId: route,
        packetPlan: seed.snapshot.packetPlan, answers }, packetInformation: { answers: { [category]: 'Saved court category' } } }
    } };
    const before = structuredClone(item), m = P.packetInformationModelFor(item);
    assert(m);
    assert.equal(m.questions.find(q => q.id === category)?.required, historicalGate?false:undefined);
    assert.equal(m.builderQuestions.find(q => q.id === category)?.required, historicalGate?false:undefined);
    assert.equal(m.initialAnswers[category], 'Saved court category');
    assert.deepEqual(item, before);
  });
  for (const map of maps) for (const raw of ['Literal court category', { value: 'Amended literal category', unknown: false },
    { unknown: true }, null, ['Old incompatible category shape']]) {
    const record = structuredClone(original);
    record.draftSnapshot[map][category] = structuredClone(raw);
    record.draftHash = P.protectedPacketDraftHash(record.draftSnapshot);
    const before = structuredClone(record);
    check(`${route}: optional raw history ${map}/${JSON.stringify(raw)}`, () => {
      const m = model(record);
      assert(m);
      assert.equal(m.questions.find(q => q.id === category)?.required, historicalGate?false:undefined);
      assert.equal(m.builderQuestions.find(q => q.id === category)?.required, historicalGate?false:undefined);
      assert(!m.missingInputIds.includes(category));
      assert.deepEqual(record, before);
      assert.deepEqual(safety(record.draftSnapshot), safety(seed.snapshot));
      const patch = P.packetInformationPatch({ existingItem: { id: `synthetic-${questionRecordId}`, jurisdiction: 'AR', artifactRefs: {} },
        answers: {}, protectedVerification: record });
      assert(patch);
      assert.deepEqual(patch.protectedTransition.nextVerification, before);
    });
  }
  check(`${route}: source, route and new consumer refusals`, () => {
    assert.equal(historyContext(profile, route, null),historicalGate);
    for (const mutate of [p => p.jurisdiction.code = 'NY', p => p.profileVersion = 'changed',
      p => p.source.sourceCorpusSha256 = 'changed',
      p => p.pathways.find(row => row.id === route).automatic = 'changed',
      p => p.packetGenerator.pathways.find(row => row.pathwayId === route).formCandidates.push('new-form'),
      p => p.questions.push({ id: category, type: 'text_or_unknown' })]) {
      const changed = structuredClone(profile); mutate(changed);
      assert.equal(historyContext(changed, route, null), false);
    }
    assert.equal(historyContext(profile, route, { routeKey: `AR:${route}` }), false);
    for (const sibling of profile.pathways.filter(row => !cases.some(c => c[1] === row.id))) {
      assert.equal(historyContext(profile, sibling.id, null), false);
    }
  });
  if(historicalGate)check(`${route}: exact collection dispositions and explicit overrides`, () => {
    const input = { jurisdiction: 'AR', pathwayId: route, requiredInputIds: [category, 'offense_level'],
      serverFacts: {}, screeningAnswers: answers, savedAnswers: {}, specification: null, questionById: new Map() };
    const resolved = resolvePacketCollection(input);
    assert.deepEqual(resolved.facts.find(f => f.factId === category), {
      factId: category, collection: 'conditional', phase: 'known', group: null, active: false, optional: true,
      source: 'ar_bound_category_history',
      reason: 'These source-bound Arkansas consumers do not bind a generic offense category to a document or a value-level rule. Earlier answers remain optional literal history; record origin, disposition, offense level, timing and exclusion facts remain separate.'
    });
    assert.equal(resolved.derivedFacts[category], undefined);
    for (const extra of [
      { recordOwnQuestionIds: new Set([category]) },
      { override: { routeKey: `AR:${route}`, classes: { [category]: 'render_required' } } },
      { override: { routeKey: `AR:${route}`, needsHumanClassification: [category] } }
    ]) assert.notEqual(resolvePacketCollection({ ...input, ...extra }).facts.find(f => f.factId === category).source,
      'ar_bound_category_history');
  });
}

// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-ar-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'AR', artifactRefs: {} });
globalThis.__arCategoryTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-ar-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-ar-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-ar-owner');
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
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__arCategoryTransport.${name}(...args);`).join('\n'));
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
  if(original.draftSnapshot.pathwayId==='situation-b-misdemeanor-convictions'){
    response=await post(id,{[category]:'Unsupported new classification'});
    const refusal=await response.json();
    check(`${id}: no invented category editor on the existing guidance-only route`,()=>{assert.equal(response.status,422);assert.equal(refusal.error,'invalid_packet_answers');assert(refusal.invalidFactIds.includes(category));assert.deepEqual(records.get(id),stored);});
    continue;
  }
  response = await post(id, { [category]: { value: 'Participant amendment', unknown: false } });
  const body = await response.json();
  check(`${id}: explicit amendment archives raw history without authority`, () => {
    assert.equal(response.status, 200);
    const next = records.get(id);
    assert.deepEqual(next.draftSnapshot.packetAnswers[category], { value: 'Participant amendment', unknown: false });
    assert(Array.isArray(next.draftSnapshot.dependencies.semanticAnswerHistory),'amendment history array retained');
    for (const map of maps) {
      const history = next.draftSnapshot.dependencies.semanticAnswerHistory.find(h =>
        h.factId === category && h.source === map && h.meaning === 'prior_factual_pathway_answer');
      assert(history, `${map} history retained`);
      assert.deepEqual(history.value, stored.draftSnapshot[map][category]);
      assert.equal(history.routeKey, `AR:${original.draftSnapshot.pathwayId}`);
    }
    assert.deepEqual(safety(next.draftSnapshot), safety(original.draftSnapshot));
    assert.equal(next.draftSnapshot.paymentAllowed, false);
    assert.equal(next.draftSnapshot.resultCode, original.draftSnapshot.resultCode);
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
  });
  const incomplete=['New category','Other category'];
  response=await post(id,{[category]:incomplete});
  const incompleteBody=await response.json();
  check(`${id}: incomplete text draft remains literal and nonpayable`,()=>{
    assert.equal(response.status,200);assert.deepEqual(records.get(id).draftSnapshot.packetAnswers[category],incomplete);
    assert.equal(records.get(id).draftSnapshot.paymentAllowed,false);assert.equal(incompleteBody.readyToGenerate,false);
  });
  const stable=structuredClone(records.get(id));
  response=await post(id,{[category]:{unexpected:true}});
  check(`${id}: unsupported draft object refused`,()=>{assert.equal(response.status,400);assert.deepEqual(records.get(id),stable);});
  const before = structuredClone(records.get(id)), savesBefore = saves;
  for (const [kind, status, error] of [['stale', 409, 'revision_conflict'], ['anonymous', 401, 'auth_required'],
    ['unverified', 403, 'verified_account_required'], ['other-owner', 404, 'matter_not_found']]) {
    authenticated = kind !== 'anonymous'; verified = kind !== 'unverified';
    owner = kind === 'other-owner' ? 'another-owner' : 'synthetic-ar-owner';
    response = await post(id, { [category]: 'Forbidden amendment' }, kind === 'stale' ? { expectedRevision: 0 } : {});
    const denial = await response.json();
    check(`${id}: ${kind} refusal`, () => {
      assert.equal(response.status, status); assert.equal(denial.error, error);
      assert.deepEqual(records.get(id), before); assert.equal(saves, savesBefore);
    });
  }
  authenticated = true; verified = true; owner = 'synthetic-ar-owner';
}
delete globalThis.__arCategoryTransport;
console.log(JSON.stringify({ status: 'PASS_AR_CATEGORY_HISTORY', checks, originalIds: cases.map(row => row[0]),
  scope: 'isolated collection/protected transitions/HTTP transport; no hosted owner, database or delivery proof' }));
