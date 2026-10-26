import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register,createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const root=process.cwd();
process.env.RCAP_EVALUATOR_TODAY='2026-10-23';
globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN');};
register(pathToFileURL(root+'/scripts/lib/ts-esm-loader.mjs'));
const ts=createRequire(root+'/package.json')('typescript'),load=p=>import(pathToFileURL(root+'/'+p).href);
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {composablePacketSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const profile=getProfileByJurisdiction('VA'),route='regime-1-expungement-available-now',fact='offense_category';
const witness=JSON.parse(fs.readFileSync('data/rcap-ledger/public-witness-answer-sets.json')).witnesses.find(x=>x.jurisdiction==='VA'&&x.pathwayId===route);assert(witness);
const answers={...witness.finalAnswers,case_outcome:'Pardoned conviction',pardon_status:'Yes'};
const records=new Map(),ids=['synthetic-q8718-literal','synthetic-q8718-unknown'];
const values=['SYNTHETIC original court category',{unknown:true,value:''}],originalCharge='SYNTHETIC charge A';
for(const [index,id]of ids.entries()){
 const authoritative=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:id,answers});
 const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:answers,
  packetAnswers:{charge:originalCharge,court:'SYNTHETIC case court',disposition_date:'2020-01-01',pardonType:'Yes',[fact]:values[index]},
  dependencies:{},capturedAt:'2026-10-23T00:00:00Z'});assert(seed);
 records.set(id,{status:'unverified',revision:0,draftSnapshot:seed.snapshot,draftHash:seed.hash});
}
// The adopted held context changes collection only; original plans and gates stay intact.
const absent=structuredClone(records.get(ids[0]));delete absent.draftSnapshot.packetAnswers[fact];
absent.draftHash=P.protectedPacketDraftHash(absent.draftSnapshot);
const missing=P.protectedPacketInformationModelFor(absent);assert(missing);
assert.equal(missing.missingInputIds.includes(fact),false,'held pardon must not require a fresh generic category');
assert.equal(missing.builderQuestions.some(q=>q.id===fact),false);
assert.equal(Object.hasOwn(missing.initialAnswers,fact),false,'offense level must not synthesize category');
const originalPlan=structuredClone(absent.draftSnapshot.packetPlan),originalRequired=[...absent.draftSnapshot.requiredInputIds];
for(const [map,raw]of [['screeningAnswers','SYNTHETIC screening category'],['prefilledAnswers','SYNTHETIC prefilled category'],
 ['packetAnswers','SYNTHETIC amended category'],['packetAnswers',{unknown:true,value:'SYNTHETIC earlier category'}]]){
 const held=structuredClone(absent);held.draftSnapshot[map][fact]=raw;held.draftHash=P.protectedPacketDraftHash(held.draftSnapshot);
 const before=structuredClone(held),model=P.protectedPacketInformationModelFor(held);assert(model);
 assert.equal(model.missingInputIds.includes(fact),false);assert.equal(model.builderQuestions.find(q=>q.id===fact)?.required,false);
 assert.deepEqual(model.initialAnswers[fact],raw);assert.equal(P.editablePacketInputIds(model).has(fact),true);
 const noop=P.packetInformationPatch({existingItem:itemForTest(ids[0]),protectedVerification:held,answers:{}});
 assert(noop);assert.deepEqual(noop.protectedTransition.nextVerification,before);assert.equal(noop.readyToGenerate,false);
 assert.deepEqual(held.draftSnapshot.packetPlan,originalPlan);assert.deepEqual(held.draftSnapshot.requiredInputIds,originalRequired);
 assert.deepEqual(P.evaluateProtectedPacketFacts(held.draftSnapshot,undefined,ids[0]).evaluation,
  P.evaluateProtectedPacketFacts(absent.draftSnapshot,undefined,ids[0]).evaluation);
}
function itemForTest(id){return {id,jurisdiction:'VA',artifactRefs:{}};}
const originalAuthority=evaluate({jurisdiction:'VA',profileVersion:profile.profileVersion,matterId:ids[0],answers:witness.finalAnswers});
const originalSeed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:originalAuthority,screeningAnswers:witness.finalAnswers,dependencies:{},capturedAt:'2026-10-23T00:00:00Z'});assert(originalSeed);
const generic=P.protectedPacketInformationModelFor({status:'unverified',revision:0,draftSnapshot:originalSeed.snapshot,draftHash:originalSeed.hash});assert(generic);
assert.equal(generic.missingInputIds.includes(fact),true,'generic nonpardon regime1 stays required');
assert.equal(generic.builderQuestions.find(q=>q.id===fact)?.required,true);
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const spec=packetSpecificationFor('VA:'+route);
const input={jurisdiction:'VA',pathwayId:route,requiredInputIds:[fact],serverFacts:{},screeningAnswers:answers,
 savedAnswers:{[fact]:'SYNTHETIC retained category'},specification:spec,routeDecidingFactIds:new Set([fact])};
assert.equal(resolvePacketCollection(input).facts[0].source,'va_pardon_category_history');
for(const changed of [{...input,specification:{...spec,specificationVersion:'changed'}},
 {...input,specification:{...spec,legalSectionsBound:true}},
 {...input,screeningAnswers:{...answers,pardon_status:'I am not sure'}},
 {...input,screeningAnswers:{...answers,case_outcome:'Acquitted or found not guilty'}},
 {...input,override:{classes:{[fact]:'render_required'}}},
 {...input,override:{needsHumanClassification:[fact]}},
 {...input,recordOwnQuestionIds:new Set([fact])}])assert.notEqual(resolvePacketCollection(changed).facts[0].source,'va_pardon_category_history');
let authenticated=true,verified=true,owner='synthetic-q8718-owner',saves=0;
const itemFor=id=>({id,jurisdiction:'VA',artifactRefs:{}});
globalThis.__q8718Transport={
 getRcapBriefcaseAuthState:async()=>({isAuthenticated:authenticated,isVerified:verified,userId:owner}),
 getBriefcaseItem:async(user,id)=>user==='synthetic-q8718-owner'&&records.has(id)?itemFor(id):null,
 readProtectedPacketVerification:async({consumerAuthUserId,briefcaseItemId})=>{assert.equal(consumerAuthUserId,'synthetic-q8718-owner');return {ok:true,value:structuredClone(records.get(briefcaseItemId))};},
 persistProtectedPacketVerification:async({consumerAuthUserId,briefcaseItemId,transition})=>{assert.equal(consumerAuthUserId,'synthetic-q8718-owner');assert.equal(transition.expectedPriorRevision,records.get(briefcaseItemId).revision);records.set(briefcaseItemId,structuredClone(transition.nextVerification));saves++;return {ok:true,value:structuredClone(records.get(briefcaseItemId))};},
 decorateBriefcaseItemForPresentation:async()=>({commercialActions:{}}),
 protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('No substitute source');},readTrustedBriefcasePresentationSource:()=>{throw Error('No substitute source');}
};
const apiFile=pathToFileURL(root+'/src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts').href,apiUrl=apiFile+'?q8718-measurement';
const original=fs.readFileSync(new URL(apiFile),'utf8');let apiSource=original;
for(const [bindings,module]of [
 [['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],
 [['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],
 [['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']]){
 const pattern=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(pattern.test(apiSource));
 apiSource=apiSource.replace(pattern,bindings.map(name=>`const ${name}=(...args:unknown[])=>(globalThis as any).__q8718Transport.${name}(...args);`).join('\n'));
}
register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),
 {data:{url:apiUrl,source:ts.transpileModule(apiSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText}});
const API=await import(apiUrl),checks=[];
const post=(id,delta,extra={})=>API.POST(new Request('http://isolated.invalid/api/expungement-ai/briefcase/'+id+'/packet-information',
 {method:'POST',body:JSON.stringify({expectedRevision:records.get(id).revision,answers:delta,...extra})}),{params:Promise.resolve({itemId:id})});
// Save the actual offered memo ID through POST; a preseeded value never exercised parsing.
const pardonId=ids[0],pardonPeerBefore=structuredClone(records.get(ids[1]));
delete records.get(pardonId).draftSnapshot.packetAnswers.pardonType;
records.get(pardonId).draftHash=P.protectedPacketDraftHash(records.get(pardonId).draftSnapshot);
for(const value of ['No','I am not sure','Yes']){
 const response=await post(pardonId,{pardonType:value});assert.equal(response.status,200,'offered pardonType '+JSON.stringify(value)+' must pass the protected POST: '+await response.text());
 assert.deepEqual(records.get(pardonId).draftSnapshot.packetAnswers.pardonType,value);
 assert.deepEqual(records.get(ids[1]),pardonPeerBefore);
 assert.equal(P.protectedPacketInformationModelFor(records.get(pardonId)).reviewSafety.safe,false);
 assert.equal(composablePacketSpecificationFor('VA:'+route),undefined);
}
const beforeRefusals=structuredClone([...records]),savesBeforeRefusals=saves;
assert.equal((await post(pardonId,{arbitraryCamelCase:'Yes'})).status,400);
assert.equal((await post(pardonId,{pardonType:{unexpected:true}})).status,400);
assert.equal((await post(pardonId,{pardonType:{unknown:true,value:''}})).status,422,'yes/no/unsure keeps its offered scalar contract');
assert.equal((await post(pardonId,{pardonType:'No'},{expectedRevision:records.get(pardonId).revision-1})).status,409);
const nonpardonId='synthetic-q8718-nonpardon';
records.set(nonpardonId,{status:'unverified',revision:0,draftSnapshot:structuredClone(originalSeed.snapshot),draftHash:originalSeed.hash});
assert.equal((await post(nonpardonId,{pardonType:'Yes'})).status,422,'exact ID does not authorize an unoffered field');
records.delete(nonpardonId);
owner='other-owner';assert.equal((await post(pardonId,{pardonType:'Yes'})).status,404);owner='synthetic-q8718-owner';
verified=false;assert.equal((await post(pardonId,{pardonType:'Yes'})).status,403);verified=true;
authenticated=false;assert.equal((await post(pardonId,{pardonType:'Yes'})).status,401);authenticated=true;
assert.equal(saves,savesBeforeRefusals);assert.deepEqual([...records],beforeRefusals);
const marker=id=>records.get(id).draftSnapshot.dependencies.recordFactConfirmations?.pardonType?.status;
for(const id of ids){const response=await post(id,{}, {confirmRecordFacts:['pardonType']});assert.equal(response.status,200);assert.equal(marker(id),'confirmed');}
for(const [index,id]of ids.entries()){
 const peer=ids[1-index],peerBefore=structuredClone(records.get(peer)),before=structuredClone(records.get(id));
 const collection=P.packetCollectionFor({jurisdiction:'VA',pathwayId:route,requiredInputIds:before.draftSnapshot.requiredInputIds,
  serverFacts:before.draftSnapshot.serverFacts,screeningAnswers:before.draftSnapshot.screeningAnswers,prefilledAnswers:before.draftSnapshot.prefilledAnswers,savedAnswers:before.draftSnapshot.packetAnswers,
  recordFactConfirmations:before.draftSnapshot.dependencies.recordFactConfirmations});
 for(const [dependency,changed,originalValue]of [['charge','SYNTHETIC amended charge B',originalCharge],
  ['court','SYNTHETIC amended case court','SYNTHETIC case court'],['disposition_date','2021-01-01','2020-01-01']]){
  for(const value of [changed,originalValue]){
   const response=await post(id,{[dependency]:value});assert.equal(response.status,200);assert.equal(marker(id),'unconfirmed');
   assert.deepEqual(records.get(id).draftSnapshot.packetAnswers[fact],values[index]);assert.deepEqual(records.get(peer),peerBefore);
   assert.equal(P.protectedPacketInformationModelFor(records.get(id)).reviewSafety.safe,false);
  }
  const confirm=await post(id,{}, {confirmRecordFacts:['pardonType']});assert.equal(confirm.status,200);assert.equal(marker(id),'confirmed');
 }
 const amendedCategory=index===0?'SYNTHETIC corrected category wording':{unknown:true,value:'SYNTHETIC prior category wording'};
 const edit=await post(id,{[fact]:amendedCategory});assert.equal(edit.status,200);
 assert.deepEqual(records.get(id).draftSnapshot.packetAnswers[fact],amendedCategory);assert.deepEqual(records.get(peer),peerBefore);
 assert.equal(marker(id),'confirmed','category wording is not a pardon qualification input');
 assert.equal(P.protectedPacketInformationModelFor(records.get(id)).missingInputIds.includes(fact),false);
 assert.equal(composablePacketSpecificationFor('VA:'+route),undefined);
 checks.push({case:id,category:values[index],collection:collection.facts.find(x=>x.factId===fact),chargeCourtDateAwayBackRequireFreshConfirmation:true,
  literalOrUnknownRetained:true,categoryEditPersisted:true,peerUnchanged:true,outputStillHeld:true});
}
const savedBefore=saves,allBefore=structuredClone([...records]);owner='other-owner';const denied=await post(ids[0],{[fact]:'SYNTHETIC stranger'});assert.equal(denied.status,404);
authenticated=false;const anonymous=await post(ids[0],{[fact]:'SYNTHETIC anonymous'});assert.equal(anonymous.status,401);assert.equal(saves,savedBefore);assert.deepEqual([...records],allBefore);
delete globalThis.__q8718Transport;
const report={status:'PASS',cases:checks,ownerDenial:denied.status,anonymousDenial:anonymous.status,saves,
 sourceApiSha256:createHash('sha256').update(original).digest('hex'),
 originalQuestion:'Q-8718d5f66d46558b1744',collectionCases:6,scopeNegatives:7,transportPattern:'Existing test-va-pardon-location-history.mjs actual API.POST with synthetic auth/read/CAS boundaries; route body unchanged except imports replaced by same transport pattern.',
 limits:['In-memory owner/read/save transport; not actual hosted auth, database/RLS/CAS or persistent customer journey.','Synthetic reported pardon and case facts; no actual legal qualification, court output or payment.','Local regression only; no final Q8718 acceptance or live operation.']};
const output=process.argv.find(arg=>arg.startsWith('--output='))?.slice(9);
if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:checks.length,saves,denied:denied.status,anonymous:anonymous.status}));
