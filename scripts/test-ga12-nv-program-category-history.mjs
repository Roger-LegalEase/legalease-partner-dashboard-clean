import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

register('./lib/ts-esm-loader.mjs', import.meta.url);
const mutation=process.argv.find(a=>a.startsWith('--mutation='))?.slice(11);
const mutations={
 history:['packet-collection.ts','const nvProgramCategoryHistory = nvProgramCategoryIsHistory(getProfileByJurisdiction(input.jurisdiction), input.pathwayId, specification);','const nvProgramCategoryHistory = false;'],
 preservation:['packet-information.ts','nvProgramCategoryIsHistory(profile, pathway, packetSpecificationFor(`${state}:${pathway}`))','false']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let m;export function initialize(x){m=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/'+m[0])){if(!r.source.includes(m[1]))throw Error('mutation target absent');return {...r,source:r.source.replace(m[1],m[2])}}return r}`),{data:mutations[mutation]});}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { getProfileByJurisdiction } = await import('../src/lib/rcap-engine/profile-registry.ts');
const { nvProgramCategoryIsHistory: historyContext, resolvePacketCollection } = await import('../src/lib/expungement-ai/packet-collection.ts');

// GA-12 / Q-f739580167b3303bcdcf / QD-bd6b15fff22cbe1501cb.
// Two synthetic matters exercise isolation, not two original obligations.
const routeId = 'probation-or-specialty-court-dismissal-set-aside-sealing';
const NV=await import('../src/lib/rcap-engine/nevada-176a-branch.ts');
const {packetFulfillmentAuthority}=await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
// Reuse the retained base/branch case in verify-nevada-176a-branch.mjs, not the historical GA12 mismatch.
const retainedBase={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',offense_level:'Misdemeanor',possible_pathway_context:'Probation or specialty-court dismissal / set-aside sealing',disposition_date:'2015-01-05',resolved_timing_bucket:'gt_10_years',pending_cases:'No',pardon_status:'No',[NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]:NV.NEVADA_176A_EXCLUDED_CHARGE_NO};
const fixture={sourceEstablishedAnswers:{...retainedBase,[NV.NEVADA_176A_CHARGE_FACT_ID]:NV.NEVADA_176A_CHARGE_NAMED,[NV.NEVADA_176A_DISPOSITION_FACT_ID]:NV.NEVADA_176A_DISPOSITION_CONDITIONAL_DISMISSAL}};
const cases = ['first', 'second'].map(id => [id, routeId]);
const profile = getProfileByJurisdiction('NV');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
const specification = packetSpecificationFor(`NV:${routeId}`);
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
for (const [questionRecordId, route] of cases) {
  const answers = structuredClone(fixture.sourceEstablishedAnswers);
  const authoritative = evaluate({ jurisdiction: 'NV', profileVersion: profile.profileVersion,
    matterId: `synthetic-${questionRecordId}`, answers });
  check(`${route}: exact retained petition branch and source facts`, () => {
    assert.equal(authoritative.evaluation.pathwayId,route);
    assert.equal(authoritative.evaluation.resultCode,'packet_ready_with_caution');
    assert.equal(authoritative.evaluation.paymentAllowed,false);
    assert.equal(NV.nevada176ABranch(answers),'subsection_2_petition');
    assert.equal(NV.nevada176ASubsection3(answers),'not_barred');
    assert(!specification.requiredFacts.some(f=>f.factId===category));
    for(const id of NV.NEVADA_176A_ROUTE_SAFETY_FACT_IDS)assert(authoritative.evaluation.packetPlan.requiredInputIds.includes(id));
    for(const [value,code] of [[NV.NEVADA_176A_EXCLUDED_CHARGE_YES,'likely_not_eligible'],[NV.NEVADA_176A_EXCLUDED_CHARGE_UNSURE,'needs_review']]){
      const r=evaluate({jurisdiction:'NV',profileVersion:profile.profileVersion,answers:{...answers,[NV.NEVADA_176A_EXCLUDED_CHARGE_FACT_ID]:value}}).evaluation;
      assert.equal(r.resultCode,code);assert.equal(r.paymentAllowed,false);
      assert.equal(r.reasons[0].code,value===NV.NEVADA_176A_EXCLUDED_CHARGE_YES?'nv.nv_176a_subsection_3_not_eligible':'nv.nv_176a_subsection_3_not_established');
    }
    const unknown=evaluate({jurisdiction:'NV',profileVersion:profile.profileVersion,answers:{...answers,[NV.NEVADA_176A_CHARGE_FACT_ID]:'I am not sure'}}).evaluation;
    assert.equal(unknown.resultCode,'needs_more_info');assert.equal(unknown.paymentAllowed,false);assert.equal(unknown.reasons[0].code,'nv.nv_176a_branch_not_established');
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
    const item = { id: `synthetic-${questionRecordId}`, state: 'NV', resultCode: 'packet_ready_with_caution', artifactRefs: {
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
      const patch = P.packetInformationPatch({ existingItem: { id: `synthetic-${questionRecordId}`, jurisdiction: 'NV', artifactRefs: {} },
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
      p => p.orderedDecisionRules.push({id:'new-category-consumer',when:{fieldsReferenced:[category]}}),
      p => p.exclusionRules.push({condition:{factId:category,equals:'new'}}),
      p => p.questionLifecycle = { routeConsumers: { [category]: [route] } }]) {
      const changed = structuredClone(profile); mutate(changed);
      assert.equal(historyContext(changed, route, specification), false);
    }
    assert.equal(historyContext(profile, route, null), false);
    for (const mutate of [s => s.specificationSha256 = 'changed', s => s.routeKey = 'DC:other',
      s => s.requiredFacts.push({ factId: category }),
      s => s.documents.push({ documentId: 'new-category-consumer', sections: [{template:'{{offense_category}}'}] })]) {
      const changed = structuredClone(specification); mutate(changed);
      assert.equal(historyContext(profile, route, changed), false);
    }
    for (const sibling of profile.pathways.filter(row => row.id !== route))
      assert.equal(historyContext(profile, sibling.id, specification), false);
  });
  check(`${route}: exact collection dispositions and explicit overrides`, () => {
    const input = { jurisdiction: 'NV', pathwayId: route, requiredInputIds: [category, 'offense_level', 'charge', ...NV.NEVADA_176A_ROUTE_SAFETY_FACT_IDS],
      serverFacts: {}, screeningAnswers: answers, savedAnswers: {}, specification, questionById: new Map() };
    const resolved = resolvePacketCollection(input);
    assert.deepEqual(resolved.facts.find(f => f.factId === category), {
      factId: category, collection: 'conditional', phase: 'known', group: null, active: false, optional: true,
      source: 'nv_program_category_history',
      reason: 'This program family uses its separate named-charge, final-disposition and subsection 3 facts. Earlier broad categories remain optional literal history; they establish neither program participation, the branch, a statutory bar nor the waiting period.'
    });
    assert.equal(resolved.derivedFacts[category], undefined);
    for (const id of ['offense_level', 'charge', ...NV.NEVADA_176A_ROUTE_SAFETY_FACT_IDS])
      assert.notEqual(resolved.facts.find(f => f.factId === id)?.optional, true);
    for (const extra of [
      { recordOwnQuestionIds: new Set([category]) },
      { override: { routeKey: `NV:${route}`, classes: { [category]: 'render_required' } } },
      { override: { routeKey: `NV:${route}`, needsHumanClassification: [category] } }
    ]) assert.notEqual(resolvePacketCollection({ ...input, ...extra }).facts.find(f => f.factId === category).source,
      'nv_program_category_history');
  });
}

check('original witness is not forced into a positive branch',()=>{
 const original=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-fixtures.json')).fixtures.find(f=>f.pathwayKey===NV.NEVADA_176A_ROUTE_KEY);assert(original);
 const before=structuredClone(original),r=evaluate({jurisdiction:'NV',profileVersion:profile.profileVersion,answers:original.answers}).evaluation;
 assert.equal(r.resultCode,'likely_not_eligible');assert.equal(r.paymentAllowed,false);assert.deepEqual(original,before);
});
check('automatic branch retains no-sale guidance under category history',()=>{
 const answers={...retainedBase,[NV.NEVADA_176A_CHARGE_FACT_ID]:NV.NEVADA_176A_CHARGE_OTHER,[NV.NEVADA_176A_DISPOSITION_FACT_ID]:NV.NEVADA_176A_DISPOSITION_PROBATION_DISCHARGE};
 const authoritative=evaluate({jurisdiction:'NV',profileVersion:profile.profileVersion,answers});assert.equal(authoritative.evaluation.resultCode,'guidance_only');assert.equal(authoritative.evaluation.paymentAllowed,false);
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 for(const raw of ['Amended charge',{value:'Old category',unknown:true}]){
  const record={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:structuredClone(seed.snapshot)};record.draftSnapshot.packetAnswers[category]=raw;record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);
  const before=structuredClone(record),m=P.protectedPacketInformationModelFor(record);assert(!m.missingInputIds.includes(category));assert.equal(m.questions.find(q=>q.id===category)?.required,false);
  const r=P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;assert.equal(r.resultCode,'guidance_only');assert.equal(r.paymentAllowed,false);assert.deepEqual(r.packetPlan,authoritative.evaluation.packetPlan);
  assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
 }
});
check('exact missing authority still refuses the petition',()=>{
 const result=packetFulfillmentAuthority('NV',routeId,'checkout creation',{trackId:'nv_seal_probation_family'});assert.equal(result.allowed,false);assert.equal(result.reason,`NV:${routeId}: NO_RECORD. No Grade-A fulfillment record binds NV:${routeId}; a route nobody has written a record for fails closed.`);
});

// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-nv-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'NV', artifactRefs: {} });
globalThis.__nvCategoryTransport = {
  getRcapBriefcaseAuthState: async () => ({ isAuthenticated: authenticated, isVerified: verified, userId: owner }),
  getBriefcaseItem: async (user, id) => user === 'synthetic-nv-owner' && records.has(id) ? itemFor(id) : null,
  readProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId }) => {
    assert.equal(consumerAuthUserId, 'synthetic-nv-owner');
    return { ok: true, value: structuredClone(records.get(briefcaseItemId)) };
  },
  persistProtectedPacketVerification: async ({ consumerAuthUserId, briefcaseItemId, transition }) => {
    assert.equal(consumerAuthUserId, 'synthetic-nv-owner');
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
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__nvCategoryTransport.${name}(...args);`).join('\n'));
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
      for (const fact of [...NV.NEVADA_176A_ROUTE_SAFETY_FACT_IDS, 'charge', 'offense_level', 'record_type'])
        assert.deepEqual(next.draftSnapshot[map][fact], stored.draftSnapshot[map][fact]);
      const history = next.draftSnapshot.dependencies.semanticAnswerHistory.find(h =>
        h.factId === category && h.source === map && h.meaning === 'prior_factual_pathway_answer');
      assert(history, `${map} history retained`);
      assert.deepEqual(history.value, stored.draftSnapshot[map][category]);
      assert.equal(history.routeKey, `NV:${original.draftSnapshot.pathwayId}`);
    }
    assert.deepEqual(safety(next.draftSnapshot), safety(original.draftSnapshot));
    assert.equal(next.draftSnapshot.paymentAllowed, false);
    assert.equal(next.draftSnapshot.resultCode, 'packet_ready_with_caution');
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
  const before = structuredClone(records.get(id)), savesBefore = saves;
  for (const [kind, status, error] of [['stale', 409, 'revision_conflict'], ['anonymous', 401, 'auth_required'],
    ['unverified', 403, 'verified_account_required'], ['other-owner', 404, 'matter_not_found']]) {
    authenticated = kind !== 'anonymous'; verified = kind !== 'unverified';
    owner = kind === 'other-owner' ? 'another-owner' : 'synthetic-nv-owner';
    response = await post(id, { [category]: 'Forbidden amendment' }, kind === 'stale' ? { expectedRevision: 0 } : {});
    const denial = await response.json();
    check(`${id}: ${kind} refusal`, () => {
      assert.equal(response.status, status); assert.equal(denial.error, error);
      assert.deepEqual(records.get(id), before); assert.equal(saves, savesBefore);
    });
  }
  authenticated = true; verified = true; owner = 'synthetic-nv-owner';
}
delete globalThis.__nvCategoryTransport;
console.log(JSON.stringify({ status: 'PASS', checks, originalIds: ['Q-f739580167b3303bcdcf', 'QD-bd6b15fff22cbe1501cb'],
  scope: 'existing Nevada branch/category history and isolated HTTP; historical GA12 mismatch retained, no composition rerun, hosted owner, database or delivery proof' }));
