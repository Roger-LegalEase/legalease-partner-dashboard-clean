import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const mutation=process.argv.find(arg=>arg.startsWith('--mutation='))?.slice(11);
const mutations={
 loss:['if (Object.hasOwn(prior[source], id))','if (id !== "record_type" && Object.hasOwn(prior[source], id))'],
 priority:['maps[source][id] = prior[source][id];','maps[source][id] = id === "record_type" && Array.isArray(prior[source][id]) ? "Conviction" : prior[source][id];']
};
if(mutation){assert(mutations[mutation]);register('data:text/javascript,'+encodeURIComponent(`let d;export function initialize(x){d=x}export async function load(u,c,n){const r=await n(u,c);if(u.endsWith('/packet-information.ts')){if(!r.source.includes(d[0]))throw Error('mutation target absent');return {...r,source:r.source.replace(d[0],d[1])}}return r}`),{data:mutations[mutation]});}
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const { evaluateAuthoritativeScreeningResult: evaluate } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
const { packetFulfillmentAuthority } = await import('../src/lib/expungement-ai/packet-fulfillment-authority.ts');
const { packetSpecificationFor } = await import('../src/lib/rcap/grade-a/packet-specification.ts');
// GA-17 Q-acd8e296480ad39c77f5 / QD-fb5a90b4c42ab7e486c1.
// Current held consumer proof; the historical blank builder is not re-certified.
const route='situation-b-misdemeanor-convictions', key=`AR:${route}`;
const read=p=>JSON.parse(fs.readFileSync(p));
const witness=read('data/rcap-ledger/public-witness-fixtures.json').fixtures.find(f=>f.pathwayKey===key);
assert(witness);
const maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
const rawCases=['Arrest or charge','Court case','Conviction','Juvenile matter','I am not sure',
 ['Arrest or charge','Court case','Conviction'],['Juvenile matter','Conviction'],
 {unknown:true,value:'Court case'},null];
const records=new Map();let checks=0, httpCases=0;
const check=(name,fn)=>{try{fn();checks++;}catch(error){console.error(JSON.stringify({failedCheck:name,checks}));error.message=name+': '+error.message;throw error;}};
const safety=s=>Object.fromEntries(['pathwayId','resultCode','paymentAllowed','selectedTrackId','packetPlan','requiredInputIds'].map(k=>[k,s[k]]));
check('exact source purpose and unchanged authority',()=>{
 assert.equal(packetSpecificationFor(key),undefined);
 const track=read('data/record-clearing/legal-design-intake/AR.memo.json').tracks.find(t=>t.trackId==='ar-misdemeanor-seal');
 assert.deepEqual(track.participantInputs.map(q=>q.key),['convictionDetails','convictionDate','sentenceComplete','cdlStatus','registrationRequirement','excusedObligations','countiesInvolved']);
 assert(track.legalDesignDecision.limitations.some(l=>l.statement.includes('Do not auto-complete the CDL')));
 for(const family of ['ar-misdemeanor-seal-set','ar-misdemeanor-dwi-seal-set']){
  const map=read(`data/rcap-all50/overlays/census-v1/ar/${family}--official-pdf-fill/production-field-map.json`);
  assert(!JSON.stringify(map).includes('record_type'));assert.equal(map.generationAllowed,false);
 }
 const authority=packetFulfillmentAuthority('AR',route,'checkout creation');
 assert.equal(authority.allowed,false);
 assert.equal(authority.reason,`${key}: NO_RECORD. No Grade-A fulfillment record binds ${key}; a route nobody has written a record for fails closed.`);
});
for(const [label,outcome] of [['original-witness',witness.answers.case_outcome],['separate-conviction-probe','Misdemeanor conviction']]){
 const answers={...witness.answers,case_outcome:outcome};
 const a=evaluate({jurisdiction:'AR',profileVersion:witness.profileVersion,matterId:'synthetic-'+label,answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:a,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-18T00:00:00Z'});assert(seed);
 const original={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
 records.set('synthetic-'+label,original);
 check(label+': actual held route and absent taxonomy',()=>{
  assert.equal(a.evaluation.pathwayId,route);assert.equal(a.evaluation.resultCode,'guidance_only');assert.equal(a.evaluation.paymentAllowed,false);
  assert.equal(a.evaluation.reasons[0].code,'ar.waiting_rule_not_executed');
  const m=P.protectedPacketInformationModelFor(original);assert(m);
  assert(!m.questions.some(q=>q.id==='record_type'));assert(!m.missingInputIds.includes('record_type'));
  assert(m.builderQuestions.some(q=>q.id==='ar_record_origin'));
 });
 for(const map of maps)for(const raw of rawCases){
  const record=structuredClone(original);record.draftSnapshot[map].record_type=structuredClone(raw);
  record.draftHash=P.protectedPacketDraftHash(record.draftSnapshot);const before=structuredClone(record);
  check(`${label}/${map}/${JSON.stringify(raw)}: no exclusive-value or juvenile inference`,()=>{
   const m=P.protectedPacketInformationModelFor(record);assert(m);assert(!m.questions.some(q=>q.id==='record_type'));
   assert(!m.missingInputIds.includes('record_type'));
   const r=P.evaluateProtectedPacketFacts(record.draftSnapshot).evaluation;
   assert.equal(r.pathwayId,route);assert.equal(r.resultCode,'guidance_only');assert.equal(r.paymentAllowed,false);
   assert.equal(r.reasons[0].code,'ar.waiting_rule_not_executed');
   assert.deepEqual(safety(record.draftSnapshot),safety(seed.snapshot));
   assert.deepEqual(P.packetInformationPatch({protectedVerification:record,answers:{}}).protectedTransition.nextVerification,before);
   assert.deepEqual(record,before);
  });
 }
}
// Run the real HTTP handler with isolated in-memory auth/store boundaries.
// No session, consent, entitlement, network or database fixture is created.
let authenticated = true, verified = true, owner = 'synthetic-ar-owner';
let saves = 0;
const itemFor = id => ({ id, jurisdiction: 'AR', artifactRefs: {} });
globalThis.__arMisdHistoryTransport = {
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
  source = source.replace(pattern, bindings.map(name => `const ${name}=(...args:unknown[])=>(globalThis as any).__arMisdHistoryTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,' + encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
  { data: { url: apiUrl, source: ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText } });
const API = await import(apiUrl);
const post = (id, answers, extra = {}) => API.POST(new Request(`http://isolated.invalid/api/expungement-ai/briefcase/${id}/packet-information`,
  { method: 'POST', body: JSON.stringify({ expectedRevision: records.get(id).revision, answers, ...extra }) }),
{ params: Promise.resolve({ itemId: id }) });
for(const [id,original] of [...records]){
 const stored=structuredClone(original);
 stored.draftSnapshot.screeningAnswers.record_type=['Arrest or charge','Court case','Conviction'];
 stored.draftSnapshot.prefilledAnswers.record_type={unknown:true,value:'Court case'};
 stored.draftSnapshot.packetAnswers.record_type=['Juvenile matter','Conviction'];
 stored.draftHash=P.protectedPacketDraftHash(stored.draftSnapshot);records.set(id,stored);
 const otherMatters=[...records].filter(([k])=>k!==id).map(([k,v])=>[k,structuredClone(v)]);
 let response=await post(id,{});httpCases++;
 check(id+': HTTP no-op keeps overlapping history',()=>{assert.equal(response.status,200);assert.deepEqual(records.get(id),stored);});
 for(const value of ['unknown','arkansas']){
  response=await post(id,{ar_record_origin:value});httpCases++;const body=await response.json();
  check(id+': actual origin amendment '+value+' keeps every raw record label',()=>{
   assert.equal(response.status,200);const next=records.get(id);
   assert.equal(next.draftSnapshot.packetAnswers.ar_record_origin,value);
   for(const map of maps){assert.deepEqual(next.draftSnapshot[map].record_type,stored.draftSnapshot[map].record_type);
    for(const fact of ['case_outcome','offense_level','age_at_offense','age','sentence_completion_date'])assert.deepEqual(next.draftSnapshot[map][fact],stored.draftSnapshot[map][fact]);}
   assert.equal(next.draftSnapshot.paymentAllowed,false);assert.equal(next.status,'unverified');assert.equal(body.readyToGenerate,false);
   assert(!body.missingInputIds.includes('record_type'));
   for(const [k,v]of otherMatters)assert.deepEqual(records.get(k),v);
  });
 }
 const stable=structuredClone(records.get(id));
 response=await post(id,{record_type:'Conviction'});httpCases++;const rejected=await response.json();
 check(id+': unsupported taxonomy rewrite refused without losing historical arrays',()=>{
  assert.equal(response.status,422);assert.equal(rejected.error,'invalid_packet_answers');assert.deepEqual(records.get(id),stable);
 });
 const savesBefore=saves;
 for(const [kind,status,error]of [['stale',409,'revision_conflict'],['anonymous',401,'auth_required'],['unverified',403,'verified_account_required'],['other-owner',404,'matter_not_found']]){
  authenticated=kind!=='anonymous';verified=kind!=='unverified';owner=kind==='other-owner'?'another-owner':'synthetic-ar-owner';
  response=await post(id,{ar_record_origin:'unknown'},kind==='stale'?{expectedRevision:0}:{});httpCases++;const body=await response.json();
  check(id+': '+kind,()=>{assert.equal(response.status,status);assert.equal(body.error,error);assert.deepEqual(records.get(id),stable);assert.equal(saves,savesBefore);});
 }
 authenticated=true;verified=true;owner='synthetic-ar-owner';
}
delete globalThis.__arMisdHistoryTransport;
console.log(JSON.stringify({status:'PASS_CURRENT_HELD_CONSUMER',checks,httpCases,originalIds:['Q-acd8e296480ad39c77f5','QD-fb5a90b4c42ab7e486c1'],route:key,limits:['Historical blank builder not recertified; no whole GA17 closure.','No database, rendering, source change, hosted authorization or commercial delivery.']}));
