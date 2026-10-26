import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import fs from 'node:fs';
import {register,createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),load=p=>import(pathToFileURL(root+'/'+p).href);
process.env.RCAP_EVALUATOR_TODAY='2026-10-23';
globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN');};
register(pathToFileURL(root+'/scripts/lib/ts-esm-loader.mjs'));
const ts=createRequire(root+'/package.json')('typescript');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const route='retroactive-first-offender-treatment-under-42-8-66';
const ids=['firstOffenderEverUsed','informedOfEligibility','historicalCategory'];
const fixture=JSON.parse(fs.readFileSync(root+'/scripts/fixtures/conviction-fallback-predecessors.json')).rows.find(row=>row.id==='GA-no-original-treatment/omitted');assert(fixture);
const answers={...fixture.answers,ga_record_help:'retroactive_treatment',ga_original_first_offender:'no'};delete answers.possible_pathway_context;
const profile=getProfileByJurisdiction('GA'),request={jurisdiction:'GA',profileVersion:profile.profileVersion,matterId:'synthetic-ga3-factual-record',answers};
const authoritative=evaluate(request);assert.equal(authoritative.evaluation.pathwayId,route);assert.equal(authoritative.evaluation.paymentAllowed,false);
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,dependencies:{},capturedAt:'2026-10-23T00:00:00Z'});assert(seed);
const make=()=>({status:'unverified',revision:0,draftSnapshot:structuredClone(seed.snapshot),draftHash:seed.hash});
const records=new Map([['owner',make()],['peer',make()]]);
for(const id of ids){records.get('peer').draftSnapshot.screeningAnswers[id]='No';records.get('peer').draftSnapshot.prefilledAnswers[id]='I am not sure';records.get('peer').draftSnapshot.packetAnswers[id]='Yes';}
records.get('peer').draftHash=P.protectedPacketDraftHash(records.get('peer').draftSnapshot);
const model=P.protectedPacketInformationModelFor(records.get('owner'));assert(model);
for(const id of ids){
 assert(model.questions.some(q=>q.id===id),'adopted preconsent fact must have a current descriptor: '+id);
 assert(model.builderQuestions.some(q=>q.id===id));assert(P.editablePacketInputIds(model).has(id));
 assert(P.heldPacketCorrectionInputIds(model,model.resultCode).has(id));
 assert(!Object.hasOwn(model.initialAnswers,id),'missing history is not fabricated');
 const q=model.questions.find(q=>q.id===id);assert.equal(q.type,'yes_no_unsure');assert(q.translations?.es?.prompt);
}
const memo=JSON.parse(fs.readFileSync(root+'/data/record-clearing/legal-design-intake/GA.memo.json'));
const source= memo.tracks.find(track=>track.trackId==='ga-rfo').participantInputs;
for(const id of ids)assert.equal(model.questions.find(q=>q.id===id).prompt,source.find(q=>q.key===id).question);
let owner='participant',authenticated=true,verified=true,verificationChanges=0;
const itemFor=id=>({id,jurisdiction:records.get(id).draftSnapshot.jurisdiction,artifactRefs:{}});
globalThis.__ga3HistoryTransport={
 getRcapBriefcaseAuthState:async()=>({isAuthenticated:authenticated,isVerified:verified,userId:owner}),
 getBriefcaseItem:async(user,id)=>user==='participant'&&records.has(id)?itemFor(id):null,
 readProtectedPacketVerification:async({briefcaseItemId})=>({ok:true,value:structuredClone(records.get(briefcaseItemId))}),
 persistProtectedPacketVerification:async({consumerAuthUserId,briefcaseItemId,transition})=>{assert.equal(consumerAuthUserId,'participant');assert.equal(transition.expectedPriorRevision,records.get(briefcaseItemId).revision);if(!isDeepStrictEqual(records.get(briefcaseItemId),transition.nextVerification))verificationChanges++;records.set(briefcaseItemId,structuredClone(transition.nextVerification));return {ok:true,value:structuredClone(records.get(briefcaseItemId))};},
 decorateBriefcaseItemForPresentation:async()=>({commercialActions:{}}),
 protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('No substitute seed');},readTrustedBriefcasePresentationSource:()=>{throw Error('No substitute source');}
};
const apiFile=pathToFileURL(root+'/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts').href,apiUrl=apiFile+'?ga3-history';
let apiSource=fs.readFileSync(new URL(apiFile),'utf8');
for(const [bindings,module]of [
 [['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],
 [['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],
 [['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']]){
 const pattern=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(pattern.test(apiSource));
 apiSource=apiSource.replace(pattern,bindings.map(name=>`const ${name}=(...args:unknown[])=>(globalThis as any).__ga3HistoryTransport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
 {data:{url:apiUrl,source:ts.transpileModule(apiSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}});
const API=await import(apiUrl);
const post=(id,delta,extra={})=>API.POST(new Request('http://isolated.invalid/api/expungement-ai/briefcase/'+id+'/packet-information',{method:'POST',body:JSON.stringify({expectedRevision:records.get(id).revision,answers:delta,...extra})}),{params:Promise.resolve({itemId:id})});
const get=()=>API.GET(new Request('http://isolated.invalid/api/expungement-ai/briefcase/owner/packet-information'),{params:Promise.resolve({itemId:'owner'})});
const peer=structuredClone(records.get('peer')),original=structuredClone(records.get('owner'));
const originalProtectedEvaluation=P.evaluateProtectedPacketFacts(original.draftSnapshot).evaluation;
assert.equal((await post('owner',{})).status,200);assert.deepEqual(records.get('owner'),original);assert.equal(verificationChanges,0,'Skip/no-op does not write or fabricate history');
for(const value of ['No','I am not sure','Yes']){
 const response=await post('owner',Object.fromEntries(ids.map(id=>[id,value])));assert.equal(response.status,200,await response.text());
 for(const id of ids)assert.equal(records.get('owner').draftSnapshot.packetAnswers[id],value);
 assert.deepEqual(P.evaluateProtectedPacketFacts(records.get('owner').draftSnapshot).evaluation,originalProtectedEvaluation,'factual record cannot select eligibility, consent or a packet');
 assert.deepEqual(records.get('peer'),peer);
 const responseGet=await get();assert.equal(responseGet.status,200);const read=await responseGet.json();
 for(const id of ids){assert.equal(read.answers[id],value);assert(read.reviewQuestions.some(q=>q.id===id));}
 assert.equal(read.readyToGenerate,false);
}
const history=records.get('owner').draftSnapshot.dependencies.semanticAnswerHistory;
for(const id of ids)for(const value of ['No','I am not sure'])assert(history.some(row=>row.factId===id&&row.value===value&&row.routeKey==='GA:'+route&&row.source==='packetAnswers'));
const before=structuredClone([...records]),saved=verificationChanges;
assert.equal((await post('owner',{})).status,200);assert.equal((await get()).status,200);assert.equal(verificationChanges,saved);assert.deepEqual([...records],before);
assert.equal((await post('owner',{firstOffenderEverUsed:{unknown:true,value:''}})).status,422);
assert.equal((await post('owner',{unadoptedCamelCase:'Yes'})).status,400);
assert.equal((await post('owner',{firstOffenderEverUsed:'No'},{expectedRevision:0})).status,409);
assert.equal((await post('owner',{}, {verify:true})).status,422);
owner='peer-owner';assert.equal((await post('owner',{firstOffenderEverUsed:'No'})).status,404);owner='participant';
verified=false;assert.equal((await post('owner',{firstOffenderEverUsed:'No'})).status,403);verified=true;
authenticated=false;assert.equal((await post('owner',{firstOffenderEverUsed:'No'})).status,401);authenticated=true;
assert.equal(verificationChanges,saved);assert.deepEqual([...records],before);
assert.equal((await post('peer',{})).status,200);assert.deepEqual(records.get('peer'),peer,'read/Skip preserves every historical raw map');
assert.equal((await post('peer',Object.fromEntries(ids.map(id=>[id,'No'])))).status,200);
const peerHistory=records.get('peer').draftSnapshot.dependencies.semanticAnswerHistory;
for(const id of ids)for(const [source,value]of [['screeningAnswers','No'],['prefilledAnswers','I am not sure'],['packetAnswers','Yes']])assert(peerHistory.some(row=>row.factId===id&&row.source===source&&row.value===value));
const vaProfile=getProfileByJurisdiction('VA');
const vaWitness=JSON.parse(fs.readFileSync(root+'/data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(row=>row.jurisdiction==='VA'&&row.pathwayId==='regime-1-expungement-available-now');assert(vaWitness);
const vaAuthority=evaluate({jurisdiction:'VA',profileVersion:vaProfile.profileVersion,matterId:'offroute',answers:vaWitness.finalAnswers});
const vaSeed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:vaAuthority,screeningAnswers:vaWitness.finalAnswers,dependencies:{},capturedAt:'2026-10-23T00:00:00Z'});assert(vaSeed);
records.set('offroute',{status:'unverified',revision:0,draftSnapshot:vaSeed.snapshot,draftHash:vaSeed.hash});
const offrouteBefore=structuredClone(records.get('offroute')),beforeOffrouteChanges=verificationChanges;
assert.equal((await post('offroute',{firstOffenderEverUsed:'Yes'})).status,422);assert.deepEqual(records.get('offroute'),offrouteBefore);assert.equal(verificationChanges,beforeOffrouteChanges);
assert(!P.factualPathwayCorrectionIds('VA',route,answers).some(id=>ids.includes(id)));
const {gaRetroactiveHistoryQuestions}=await load('src/lib/expungement-ai/georgia-retroactive-history.ts');
assert.deepEqual(gaRetroactiveHistoryQuestions({...profile,profileVersion:'unreviewed'},route),[]);
assert.deepEqual(gaRetroactiveHistoryQuestions({...profile,source:{...profile.source,sourceCorpusSha256:'unreviewed'}},route),[]);

assert(!P.factualPathwayCorrectionIds('GA','youthful-first-offender-restriction-route',answers).some(id=>ids.includes(id)));
assert.deepEqual(P.protectedPacketScreeningAnswers(records.get('owner').draftSnapshot),P.protectedPacketScreeningAnswers(original.draftSnapshot));
delete globalThis.__ga3HistoryTransport;
console.log(JSON.stringify({status:'PASS',facts:ids,verificationChanges,source:'adopted ga-rfo preconsent factual record',scope:'Exported API GET/POST with synthetic Auth/read/CAS transport; no actual HTTP/PG, consent, eligibility, generation or customer delivery.'}));
