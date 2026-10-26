import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const root=process.cwd(), file=p=>root+'/'+p, load=p=>import(pathToFileURL(file(p)).href);
register(pathToFileURL(file('scripts/lib/ts-esm-loader.mjs')));
const compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const loc=file('src/components/expungement-ai/LocalizationProvider.tsx');compile(loc,fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};');
const {default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const {LocalizationContext}=await import(pathToFileURL(loc).href);
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {PacketInformationBuilder}=await load('src/components/expungement-ai/PacketInformationBuilder.tsx');
const H=await load('src/lib/rcap-engine/oregon-disposition-identity.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {resolvePacketCollection}=await load('src/lib/expungement-ai/packet-collection.ts');
const route=H.OR_DISPOSITION_CONFIGURATIONS.acquittal.pathwayId,ids=H.OR_DISPOSITION_FACT_IDS;
const sourceAnswers={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Acquitted or found not guilty',pending_cases:'No',state_exclusion_categories:['None of these'],or_no_conviction_in_scope:'yes',contact_information:'Earlier raw contact without component meaning',residency_or_location:'Earlier generic location'};
const witness={profileVersion:H.OR_DISPOSITION_SOURCE.profileVersion,answers:Object.fromEntries(Object.entries(sourceAnswers).filter(([id])=>!['contact_information','residency_or_location'].includes(id)))};
const authoritative=evaluate({jurisdiction:'OR',profileVersion:witness.profileVersion,matterId:'synthetic-or-contact',answers:witness.answers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});assert(seed);
const original={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
let stored=structuredClone(original),owner='synthetic-or-owner';
const item={id:'synthetic-or-contact',jurisdiction:'OR',artifactRefs:{}};
const snap=()=>stored.draftSnapshot??stored.snapshot,model=()=>P.protectedPacketInformationModelFor(stored);
let checks=0;const check=(name,fn)=>{try{fn();checks++}catch(error){error.message=name+': '+error.message;throw error}};

const present=()=>decorate({consumerAuthUserId:'synthetic-or-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'OR',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__orDispositionTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-or-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__orDispositionTransport.'+b+'(...args);').join('\n'));};
const page=async(path,correction=false)=>{const name=file(path);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],...(correction?[['readProtectedPacketVerification','verification-cas']]:[])])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;};
const Matter=await page('src/app/briefcase/[packetId]/page.tsx');
const Review=await page('src/app/briefcase/[packetId]/review/page.tsx'),Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx',true);
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let source=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);compile(apiFile,source);const API=await import(pathToFileURL(apiFile).href);
const params=Promise.resolve({packetId:item.id}),context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={},query='')=>API.POST(new Request(url+query,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const save=async answers=>{const response=await post(answers);assert.equal(response.status,200);const body=await response.json();assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));return body;};
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};

check('current source-bound control surface retains closed authority and raw context',()=>{
 assert(model());assert.equal(model().pathwayId,route);for(const id of ['case_outcome','pending_cases','state_exclusion_categories',H.OR_NO_CONVICTION_SCOPE_ID]){assert(model().questions.some(q=>q.id===id));assert(P.editablePacketInputIds(model()).has(id));assert(P.heldPacketCorrectionInputIds(model(),snap().resultCode).has(id));}
 for(const id of ['ownership_scope','jurisdiction_scope','financial_obligations','sentence_completion_date','contact_information','residency_or_location',H.OR_DECLINATION_DATE_ID])assert(!P.editablePacketInputIds(model()).has(id));
 assert.equal(snap().packetPlan,null);assert.equal(snap().paymentAllowed,false);assert.deepEqual(stored,original);
});
let response=await post({});check('actual handler protected no-op',()=>{assert.equal(response.status,200);assert.deepEqual(stored,original)});
for(const locale of ['en','es']){
 const tree=await Matter({params,searchParams:Promise.resolve({locale})}),body=html(tree,locale);
 check('actual matter offers correction entry '+locale,()=>assert(body.includes('/packet-information')));
 const editor=await Edit({params,searchParams:Promise.resolve({locale,edit:H.OR_NO_CONVICTION_SCOPE_ID})});
 const builder=nodes(editor).find(n=>n.type===PacketInformationBuilder);
 check('actual server page offers source field and localized current meaning '+locale,()=>{assert(builder);assert.equal(builder.props.returnToMatterAfterCorrection,true);assert.equal(builder.props.initialRouteChanged,false);assert(builder.props.questions.some(q=>q.id===H.OR_NO_CONVICTION_SCOPE_ID));const text=html(editor,locale);assert(text.includes(locale==='es'?'condena':'conviction'));assert(text.includes(locale==='es'?'Guardar y volver al caso':'Save and return to matter'));});
}
await save({or_no_conviction_in_scope:'no'});
check('adverse fact remains held and correction reachable with original history',()=>{assert.equal(snap().resultCode,'needs_review');assert.equal(snap().packetPlan,null);assert(P.heldPacketCorrectionInputIds(model(),snap().resultCode).has(H.OR_NO_CONVICTION_SCOPE_ID));assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===H.OR_NO_CONVICTION_SCOPE_ID&&h.value==='yes'));});
await save({or_no_conviction_in_scope:'unknown'});
check('uncertainty remains genuine missing fact',()=>{assert.equal(snap().resultCode,'needs_more_info');assert.equal(snap().packetAnswers.or_no_conviction_in_scope,'unknown');});
await save({or_no_conviction_in_scope:'yes'});
await save({case_outcome:'Arrest or citation with no charge filed'});
check('actual correction selects distinct current identity and conditional declination control',()=>{assert.equal(snap().selectedTrackId,'or_arrest_no_charges');assert(P.editablePacketInputIds(model()).has(H.OR_DECLINATION_ID));assert(!P.editablePacketInputIds(model()).has(H.OR_NO_CONVICTION_SCOPE_ID));assert.equal(snap().packetAnswers.or_no_conviction_in_scope,'yes');});
await save({or_prosecutor_elected_not_to_proceed:'yes'});
check('exact date becomes offered only after actual declination',()=>assert(P.editablePacketInputIds(model()).has(H.OR_DECLINATION_DATE_ID)));
await save({or_prosecutor_declination_date:{value:'2026-01-01',unknown:false}});
check('known date saves raw and never adopts a plan or authority',()=>{assert.deepEqual(snap().packetAnswers.or_prosecutor_declination_date,{value:'2026-01-01',unknown:false});assert.equal(snap().resultCode,'needs_review');assert.equal(snap().packetPlan,null)});
await save({or_prosecutor_elected_not_to_proceed:'no'});
check('inactive exact date preserved',()=>{assert(!P.editablePacketInputIds(model()).has(H.OR_DECLINATION_DATE_ID));assert.deepEqual(snap().packetAnswers.or_prosecutor_declination_date,{value:'2026-01-01',unknown:false});assert.equal(snap().resultCode,'not_yet')});
await save({or_prosecutor_elected_not_to_proceed:'yes'});
await save({or_prosecutor_declination_date:{value:'2026-01-01',unknown:true}});
check('unknown date preserves prior raw value and blocks clock',()=>{assert.equal(snap().resultCode,'needs_more_info');assert.deepEqual(snap().packetAnswers.or_prosecutor_declination_date,{value:'2026-01-01',unknown:true});});
await save({or_prosecutor_declination_date:{value:'2026-01-01',unknown:false}});
await save({case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted'});
check('grouped outcome is never guessed as dismissal',()=>{assert.equal(snap().pathwayId,null);assert.equal(snap().selectedTrackId,null);assert(P.editablePacketInputIds(model()).has(H.OR_DISPOSITION_ID));});
await save({or_disposition_record:'ordinary_dismissal'});
check('actual ordinary dismissal distinct source identity',()=>{assert.equal(snap().selectedTrackId,'or_dismissed_charge');assert(P.editablePacketInputIds(model()).has(H.OR_NO_CONVICTION_SCOPE_ID));assert(!P.editablePacketInputIds(model()).has(H.OR_DECLINATION_ID));});
await save({or_disposition_record:'unknown'});
check('unknown source identity stays held and correction reachable',()=>{assert.equal(snap().pathwayId,null);assert(P.editablePacketInputIds(model()).has(H.OR_DISPOSITION_ID));});
await save({or_disposition_record:'ordinary_dismissal'});
check('all explicit source corrections retain unrelated raw context',()=>{for(const id of ['contact_information','residency_or_location'])assert.equal(snap().screeningAnswers[id],sourceAnswers[id]);assert.equal(snap().packetPlan,null);assert.equal(snap().paymentAllowed,false);assert.notEqual(stored.status,'verified');});
const final=structuredClone(stored);response=await post({}, {verify:true});check('actual verify refuses absent packet',()=>{assert.equal(response.status,422);assert.deepEqual(stored,final);});
response=await post({or_no_conviction_in_scope:'no'},{expectedRevision:stored.revision-1});check('stale correction refused without mutation',()=>{assert.equal(response.status,409);assert.deepEqual(stored,final)});
owner='different-owner';response=await post({or_no_conviction_in_scope:'no'});check('wrong owner refused without mutation',()=>{assert.equal(response.status,404);assert.deepEqual(stored,final)});owner='synthetic-or-owner';

const fixture=JSON.parse(fs.readFileSync(file('scripts/fixtures/or-disposition-null-route-predecessors.json')));
check('synthetic source predecessor custody and actual loaded bytes',()=>{assert.equal(fixture.classification,'FRESH_EXACT_PRIOR_RUNTIME_SYNTHETIC_REPRODUCTION_NOT_OWNER_CAPTURE');assert.equal(fixture.sourceCommit,'0983b7fc34d8fa9299b71d4d8775634d0e4007c2');assert.equal(fixture.loadedSourceModules.length,151);assert.equal(new Set(fixture.loadedSourceModules.map(e=>e.path)).size,151);for(const e of fixture.loadedSourceModules)assert.equal(createHash('sha256').update(execFileSync('git',['show',fixture.sourceCommit+':'+e.path],{maxBuffer:30000000})).digest('hex'),e.sha256);});
for(const predecessor of fixture.records){
 stored=structuredClone(predecessor.record);const before=structuredClone(stored);
 check('prior exact null/no-plan signature '+predecessor.case_outcome,()=>{assert.equal(stored.draftHash,P.protectedPacketDraftHash(snap()));assert.equal(snap().pathwayId,null);assert.equal(snap().packetPlan,null);assert(model());assert(P.editablePacketInputIds(model()).has('case_outcome'));});
 response=await post({});check('prior read and actual no-op retain original bytes '+predecessor.case_outcome,()=>{assert.equal(response.status,200);assert.deepEqual(stored,before)});
 await save({state_exclusion_categories:['None of these']});
 check('explicit current source fact installs only held technical successor '+predecessor.case_outcome,()=>{assert.equal(snap().paymentAllowed,false);assert.equal(snap().packetPlan,null);for(const id of ['contact_information','residency_or_location'])assert.equal(snap().screeningAnswers[id],before.draftSnapshot.screeningAnswers[id]);assert.notEqual(stored.status,'verified');});
 if(predecessor.case_outcome==='Dismissed, no-billed, nolle prosequi, or not prosecuted')await save({or_disposition_record:'ordinary_dismissal'});
 await save({case_outcome:'I am not sure'});
 check('unknown outcome keeps historical correction reachable without selecting prior route '+predecessor.case_outcome,()=>{assert.equal(snap().pathwayId,null);assert.equal(snap().selectedTrackId,null);assert(P.heldPacketCorrectionInputIds(model(),snap().resultCode).has('case_outcome'));assert(snap().dependencies.semanticAnswerHistory.some(e=>e.factId==='case_outcome'&&e.value===predecessor.case_outcome));});
 await save({case_outcome:predecessor.case_outcome});
 check('explicit restored outcome returns current source identity only '+predecessor.case_outcome,()=>{assert(snap().pathwayId);assert.equal(snap().packetPlan,null);assert.equal(snap().paymentAllowed,false)});
}
for(const mutate of [s=>s.profileVersion='other',s=>s.profileSourceFingerprint='0'.repeat(64),s=>s.profileAuthorityFingerprint='0'.repeat(64),s=>s.pathwayId=H.OR_RETIRED_NONCONVICTION_PATH,s=>s.selectedTrackId='or_acquittal',s=>s.packetType='guidance_packet',s=>s.packetPlan={pathwayId:H.OR_RETIRED_NONCONVICTION_PATH},s=>s.requiredInputIds=['invented'],s=>s.paymentAllowed=true,s=>s.packetFamilyIdentifiers.mode='other',s=>s.serverFacts.untrusted='yes',s=>s.deferralComponentIds=['other'],s=>s.treatmentClassification='other',s=>s.prefilledAnswers.case_outcome='Acquitted or found not guilty']){
 stored=structuredClone(fixture.records[0].record);mutate(snap());stored.draftHash=P.protectedPacketDraftHash(snap());check('mismatched prior authority/shape refuses technical successor',()=>assert.equal(model(),null));
}
stored=structuredClone(fixture.records[0].record);stored.draftHash='0'.repeat(64);check('invalid protected signature refuses before compatibility',()=>assert.equal(model(),null));
stored=structuredClone(original);delete snap().screeningAnswers.or_no_conviction_in_scope;stored.draftHash=P.protectedPacketDraftHash(snap());
// Build a genuine current missing-scope seed, not a hand-edited result tuple.
{const a={...witness.answers};delete a.or_no_conviction_in_scope;const next=evaluate({jurisdiction:'OR',profileVersion:witness.profileVersion,matterId:item.id,answers:a});const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:next,screeningAnswers:a,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});stored={status:'unverified',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};}
await save({case_outcome:'I am not sure'});
check('first correction into unknown before any new OR answer remains reachable',()=>{assert.equal(snap().pathwayId,null);assert(model().heldFactualCorrectionIds.includes('case_outcome'));assert(P.editablePacketInputIds(model()).has('case_outcome'))});
for(const locale of ['en','es']){
 const editor=await Edit({params,searchParams:Promise.resolve({locale,edit:'case_outcome'})});const builder=nodes(editor).find(n=>n.type===PacketInformationBuilder);
 check('historical unknown outcome page still returns to matter '+locale,()=>{assert(builder);assert.equal(builder.props.returnToMatterAfterCorrection,true);assert.equal(builder.props.initialRouteChanged,false);assert(builder.props.questions.some(q=>q.id==='case_outcome'));assert(html(editor,locale).includes(locale==='es'?'Guardar y volver al caso':'Save and return to matter'));});
}
await save({case_outcome:'Acquitted or found not guilty'});check('first unknown repair restores offered scope question',()=>assert(P.editablePacketInputIds(model()).has(H.OR_NO_CONVICTION_SCOPE_ID)));

const config=(await load('data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json')).default;
const originalConfig=structuredClone(config);try{config.configurations[0].sourceIdentities[0].sha256='0'.repeat(64);check('changed governed source disables current correction contract',()=>{assert.deepEqual(P.factualPathwayCorrectionIds('OR',route,witness.answers),[]);for(const predecessor of fixture.records){const authority=evaluate({jurisdiction:'OR',profileVersion:witness.profileVersion,matterId:item.id,answers:{ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:predecessor.case_outcome}});assert.equal(P.oregonDispositionDraftSuccessor(predecessor.record.draftSnapshot,authority),null);}});}finally{for(const key of Object.keys(config))delete config[key];Object.assign(config,originalConfig);}
for(const key of ['profileVersion','profileSourceFingerprint','profileAuthorityFingerprint']){stored=structuredClone(original);snap()[key]='stale';stored.draftHash=P.protectedPacketDraftHash(snap());check('current stale source refuses '+key,()=>assert.equal(model(),null));}
stored=structuredClone(original);const refused=structuredClone(stored);for(const answers of [{invented_or_authority:'yes'},{contact_information:'invented automatic component'},{or_disposition_record:'invented_config'}]){response=await post(answers);check('nonoffered/invalid source fact refused '+JSON.stringify(answers),()=>{assert.equal(response.status,422);assert.deepEqual(stored,refused)});}

const {compareAtProtectedSnapshotTime}=await load('src/lib/rcap-engine/evaluator.ts');
const timingAnswers={ownership_scope:'Yes',jurisdiction_scope:'State or local',case_outcome:'Arrest or citation with no charge filed',pending_cases:'No',state_exclusion_categories:['None of these'],or_prosecutor_elected_not_to_proceed:'yes',or_prosecutor_declination_date:{value:'2025-12-31',unknown:false}};
const timingRequest={jurisdiction:'OR',profileVersion:witness.profileVersion,matterId:item.id,answers:timingAnswers};
const timingOld=compareAtProtectedSnapshotTime('2026-01-01T00:00:00.000Z',()=>evaluate(timingRequest)),timingNow=evaluate(timingRequest);
const timingSeed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:timingOld,screeningAnswers:timingAnswers,dependencies:{},capturedAt:'2026-01-01T00:00:00.000Z'});
stored={status:'unverified',revision:0,draftHash:timingSeed.hash,draftSnapshot:timingSeed.snapshot};const exactTiming=structuredClone(stored);
check('elapsed sixty-day source hold remains correctable with no authority',()=>{assert.equal(snap().resultCode,'not_yet');assert.equal(timingNow.evaluation.resultCode,'needs_review');assert(P.oregonDispositionTimingHeldSuccessor(snap(),timingNow));assert(model());assert(P.editablePacketInputIds(model()).has(H.OR_DECLINATION_DATE_ID));assert.deepEqual(stored,exactTiming)});
response=await post({});check('elapsed-clock no-op retains original snapshot bytes',()=>{assert.equal(response.status,200);assert.deepEqual(stored,exactTiming)});
await save({or_prosecutor_declination_date:{value:'2026-01-01',unknown:false}});check('explicit clock correction archives source and stays held',()=>{assert.equal(snap().resultCode,'needs_review');assert.equal(snap().paymentAllowed,false);assert.equal(snap().packetPlan,null);assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===H.OR_DECLINATION_DATE_ID&&h.value.value==='2025-12-31'))});
for(const [day,allowed]of [['2026-02-28',false],['2026-03-01',true]])check('stored hold exact59/60-day boundary '+day,()=>{const value=compareAtProtectedSnapshotTime(day+'T00:00:00.000Z',()=>{const authority=evaluate(timingRequest);return P.oregonDispositionTimingHeldSuccessor(exactTiming.draftSnapshot,authority)});assert.equal(value,allowed)});
for(const changed of [{or_prosecutor_declination_date:{value:'2025-12-31',unknown:true}},{pending_cases:'Yes'},{state_exclusion_categories:['Violent offense']},{or_prosecutor_elected_not_to_proceed:'unknown'}])check('unknown/adverse current fact cannot use elapsed-time successor '+JSON.stringify(changed),()=>{const authority=evaluate({...timingRequest,answers:{...timingAnswers,...changed}});assert.equal(P.oregonDispositionTimingHeldSuccessor(exactTiming.draftSnapshot,authority),false)});
for(const mutate of [s=>s.capturedAt='wrong',s=>s.capturedAt='2999-01-01T00:00:00.000Z',s=>s.capturedAt='2026-03-01T00:00:00.000Z',s=>s.resultCode='needs_more_info',s=>s.pathwayId=route,s=>s.selectedTrackId='or_acquittal',s=>s.paymentAllowed=true,s=>s.serverFacts.extra='invalid']){const changed=structuredClone(exactTiming.draftSnapshot);mutate(changed);check('elapsed-time transition rejects unproven tuple or clock',()=>assert.equal(P.oregonDispositionTimingHeldSuccessor(changed,timingNow),false))}
console.log(JSON.stringify({status:'PASS',checks,scope:'Actual production handler and server-page/SSR with isolated in-memory transport; no owner session, database, PDF or authority claim'}));
