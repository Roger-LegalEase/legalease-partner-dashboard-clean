import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {spawnSync} from 'node:child_process';
const routes=['adult-non-conviction-expungement-w-s-7-13-1401'];
if(!process.argv[2]){
 let failed=false;
 for(const route of routes){const r=spawnSync(process.execPath,[process.argv[1],route],{cwd:process.cwd(),encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);if(r.status!==0)failed=true;}
 process.exit(failed?1:0);
}
assert(routes.includes(process.argv[2]),'exact test route');
const root=process.cwd(), file=p=>root+'/'+p, load=p=>import(pathToFileURL(file(p)).href);
register(pathToFileURL(file('scripts/lib/ts-esm-loader.mjs')));
const compile=(name,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}'),{data:{url:pathToFileURL(name).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
const loc=file('src/components/expungement-ai/LocalizationProvider.tsx');compile(loc,fs.readFileSync(loc,'utf8')+'\nexport {LocalizationContext};');
const {default:React}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const {LocalizationContext}=await import(pathToFileURL(loc).href);
const {t,resolveRuntimeText}=await load('src/lib/expungement-ai/localization.ts');
const {AppRouterContext}=await import(pathToFileURL(fs.realpathSync(file('node_modules/next/dist/shared/lib/app-router-context.shared-runtime.js'))).href);
const packetInformationFile=file('src/lib/expungement-ai/packet-information.ts');
compile(packetInformationFile,fs.readFileSync(packetInformationFile,'utf8')+'\nexport {packetCollectionFor,validatePacketAnswer,protectedPacketDraftReviewSafety};');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {PacketInformationBuilder}=await load('src/components/expungement-ai/PacketInformationBuilder.tsx');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const presenter=file('src/lib/expungement-ai/briefcase-presentation-authority.ts');compile(presenter,fs.readFileSync(presenter,'utf8')+'\nexport {DEFAULT_PRESENTATION_DEPENDENCIES};');const {decorateBriefcaseItemForPresentationWithDependencies:decorate,DEFAULT_PRESENTATION_DEPENDENCIES:deps}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');

const profileVersion='2026-06-19-source-conversion-1';
const legalAnswers={ownership_scope:'Yes',jurisdiction_scope:'State or local',offense_level:'Misdemeanor',age_at_offense:'30',possible_pathway_context:'Adult non-conviction expungement - W.S. 7-13-1401',case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted',pending_cases:'No',financial_obligations:'No',sentence_completion_date:'Yes',special_preconditions_confirmed:'Yes',resolved_timing_bucket:'gt_10_years',disposition_date:'2010-01-01'};
const sourceAnswers={...legalAnswers,contact_information:'Earlier contact raw history',residency_or_location:'Earlier location raw history'};
const authoritative=evaluate({jurisdiction:'WY',profileVersion,matterId:'synthetic-wy1401',answers:legalAnswers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{},capturedAt:'2026-10-15T00:00:00.000Z'});assert(seed);
const original={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
let stored=structuredClone(original),owner='synthetic-wy-owner';
const item={id:'synthetic-wy1401',jurisdiction:'WY',artifactRefs:{}};
const snap=()=>stored.draftSnapshot??stored.snapshot,model=()=>P.protectedPacketInformationModelFor(stored);
let checks=0;const check=(name,fn)=>{try{fn();checks++}catch(error){error.message=name+': '+error.message;throw error}};
const present=()=>decorate({consumerAuthUserId:'synthetic-wy-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'WY',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:deps.readCommercialActions});
globalThis.__wyHistoryTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-wy-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__wyHistoryTransport.'+b+'(...args);').join('\n'));};
const page=async(path,correction=false)=>{const name=file(path);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],...(correction?[['readProtectedPacketVerification','verification-cas']]:[])])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;};
const Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx',true);
const Matter=await page('src/app/briefcase/[packetId]/page.tsx');
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let source=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);compile(apiFile,source);const API=await import(pathToFileURL(apiFile).href);
const params=Promise.resolve({packetId:item.id}),context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={},query='')=>API.POST(new Request(url+query,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const {isPacketSaveReceipt}=await load('src/lib/expungement-ai/packet-save-contract.ts');
const save=async answers=>{const response=await post(answers);assert.equal(response.status,200);const body=await response.json();assert(isPacketSaveReceipt(body),'strict real save receipt');assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));return body;};
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};



const H=await load('src/lib/rcap-engine/wyoming-1401-facts.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await load('src/lib/rcap-engine/public-profile-projection.ts');

const profile=getProfileByJurisdiction('WY'), fixed={wy_1401_incident_result:'dismissed_by_court',wy_1401_listed_deferral:'no',wy_1401_repository_record:'yes'};
const evalWith=a=>evaluate({jurisdiction:'WY',profileVersion,matterId:item.id,answers:a});
for(const [label,delta,code,status]of [
 ['dismissed',{},'review','needs_review'],['no charges',{case_outcome:'Arrest or citation with no charge filed',wy_1401_incident_result:'no_charges_filed',arrest_date:'2010-01-01'},'review','needs_review'],
 ['acquitted',{case_outcome:'Acquitted',wy_1401_incident_result:'not_convicted',arrest_date:'2010-01-01'},'review','needs_review'],
 ['same incident deferral',{wy_1401_listed_deferral:'yes'},'deferral','likely_not_eligible'],['unknown deferral',{wy_1401_listed_deferral:'unknown'},'missing','needs_more_info'],
 ['pending',{pending_cases:'Yes'},'pending','not_yet'],['unknown pending',{pending_cases:'I am not sure'},'missing','needs_more_info'],
 ['repository outside',{wy_1401_repository_record:'no'},'repository','needs_review'],['unknown repository',{wy_1401_repository_record:'unknown'},'missing','needs_more_info'],
 ['conviction',{wy_1401_incident_result:'conviction'},'conviction','likely_not_eligible'],['contradictory case',{case_outcome:'Misdemeanor conviction'},'outcome','needs_review'],
 ['no charge conflict',{case_outcome:'Arrest or citation with no charge filed'},'outcome','needs_review'],['unknown incident',{wy_1401_incident_result:'unknown'},'missing','needs_more_info'],
 ['unknown date',{disposition_date:'unknown'},'missing','needs_more_info'],['invalid calendar',{disposition_date:'2026-02-30'},'missing','needs_more_info'],['future date',{disposition_date:'2099-01-01'},'missing','needs_more_info']]) {
 const answers={...legalAnswers,...fixed,...delta},r=evalWith(answers);
 check(label,()=>{assert.equal(r.evaluation.resultCode,status);assert.equal(r.evaluation.reasons[0].code,'wy.nonconviction_'+code);assert.equal(r.evaluation.paymentAllowed,false);assert.equal(r.selectedTrackId,null);assert.equal(r.evaluation.packetPlan.mode,'state_specific_custom_packet_from_source_rules');});
}
for(const result of ['no_charges_filed','not_convicted','dismissed_by_court','dismissed_by_prosecutor']) for(const [date,status]of [['2026-04-18','review'],['2026-04-19','not_yet'],['2026-04-17','review']]) {
 const a={...legalAnswers,...fixed,wy_1401_incident_result:result,case_outcome:result==='no_charges_filed'?'Arrest or citation with no charge filed':result==='not_convicted'?'Acquitted':legalAnswers.case_outcome,arrest_date:date,disposition_date:date};
 check(result+' exact180 '+date,()=>assert.equal(H.wy1401Facts(a,'2026-10-15').status,status));
 const irrelevant=result.startsWith('dismissed')?'arrest_date':'disposition_date';a[irrelevant]='2099-01-01';check(result+' other date cannot move clock',()=>assert.equal(H.wy1401Facts(a,'2026-10-15').status,status));
}
check('historical source profile stays automatic but exact runtime repaired',()=>{const old=JSON.parse(fs.readFileSync(file('src/lib/rcap-engine/compiled/profiles/WY-wyoming.json')));assert.equal(old.pathways[0].automatic,true);assert.equal(profile.pathways[0].automatic,false);assert.deepEqual(profile.pathways[0].lawrenceRatification,old.pathways[0].lawrenceRatification);const route1501='misdemeanor-conviction-expungement-w-s-7-13-1501';
 const expected1501={...old.pathways.find(p=>p.id===route1501),automatic:false,filingRequired:true,routeType:'court_filing',suggestedResultCode:'needs_review',summary:'W.S. 7-13-1501 requires a verified petition to the convicting court. State-statute misdemeanor and completed misdemeanor-deferral cases use the source-specific one- or five-year period after all sentence, probation and court-ordered program terms expire. Relief is not automatic.'};
 expected1501.frontendBranch={...expected1501.frontendBranch,matchedResult:'needs_review',paymentAllowed:false};
 assert.deepEqual(profile.pathways.slice(1),old.pathways.slice(1).map(p=>p.id===route1501?expected1501:p));
 assert.deepEqual(profile.packetGenerator.pathways.slice(1),old.packetGenerator.pathways.slice(1).map(p=>p.pathwayId===route1501?{...p,mode:'state_specific_custom_packet_from_source_rules',formMappingStatus:'custom_or_manual_mapping_required'}:p));});
for(const mutate of [p=>p.jurisdiction.code='CO',p=>p.profileVersion='wrong',p=>p.source.sourceCorpusSha256='wrong',p=>p.pathways[0].sourceRef='wrong',p=>p.pathways[0].lawrenceRatification.status='ratified_deployable',p=>p.pathways[0].filingRequired=false])check('strict source guard',()=>{const p=structuredClone(profile);mutate(p);assert(!H.wy1401Contract(p));assert.deepEqual(H.withWyoming1401Procedure(p),p);});
for(const value of ['Yes','No','I am not sure',undefined]) {
 const a={...legalAnswers,...fixed};if(value===undefined)delete a.financial_obligations;else a.financial_obligations=value;
 const r=evalWith(a),d=P.protectedPacketDraftSeedFromAuthoritative({authoritative:r,screeningAnswers:a,dependencies:{},capturedAt:seed.snapshot.capturedAt}),m=P.protectedPacketInformationModelFor({status:'unverified',revision:0,reason:'synthetic',draftHash:d.hash,draftSnapshot:d.snapshot});
 check('literal financial non-effect '+value,()=>{assert.equal(r.evaluation.reasons[0].code,'wy.nonconviction_review');assert(!m.missingInputIds.includes('financial_obligations'));assert(!m.builderQuestions.some(q=>q.id==='financial_obligations'));assert.deepEqual({...d.snapshot.screeningAnswers,...d.snapshot.prefilledAnswers,...d.snapshot.packetAnswers},a);});
}
await save(fixed);
check('real save held review',()=>{assert.equal(snap().resultCode,'needs_review');assert.equal(snap().paymentAllowed,false);assert.equal(snap().selectedTrackId,null);});
for(const locale of ['en','es']) {
 const tree=await Edit({params,searchParams:Promise.resolve({edit:'wy_1401_listed_deferral'})});
 check('actual editor '+locale,()=>{const b=nodes(tree).find(n=>n.type===PacketInformationBuilder);assert(b);assert.equal(b.props.returnToMatterAfterCorrection,true);assert.equal(b.props.initialRouteChanged,false);const text=html(tree,locale);assert(text.includes('7-13-301'));assert(text.includes(locale==='en'?'different or lesser':'diferente o menor'));});
 const matter=await Matter({params});check('source consequence visible '+locale,()=>assert(html(matter,locale).includes(locale==='en'?'Relief is not automatic':'La reparación no es automática')));
}
const before=structuredClone(stored);await save({});check('complete no-op',()=>assert.deepEqual(stored,before));await save(fixed);check('same-value no-op',()=>assert.deepEqual(stored,before));
for(const [answers,reason,hidden]of [[{wy_1401_listed_deferral:'yes'},'deferral',['pending_cases','wy_1401_repository_record','disposition_date']],[{wy_1401_listed_deferral:'unknown'},'missing',[]],[{wy_1401_listed_deferral:'no'},'review',[]],[{pending_cases:'Yes'},'pending',['wy_1401_repository_record','disposition_date']],[{pending_cases:'No'},'review',[]]]) {
 const old=structuredClone(snap());await save(answers);
 check('actual saved transition '+reason,()=>{assert.equal(evalWith({...legalAnswers,...fixed,...Object.fromEntries(Object.entries(snap().packetAnswers).map(([k,v])=>[k,v&&typeof v==='object'&&!Array.isArray(v)?v.unknown?'unknown':v.value:v]))}).evaluation.reasons[0].code,'wy.nonconviction_'+reason);for(const id of hidden)assert(!P.heldPacketCorrectionInputIds(model(),snap().resultCode).has(id));assert.equal(snap().screeningAnswers.financial_obligations,old.screeningAnswers.financial_obligations);});
}
check('date reappears with preserved raw',()=>{assert(model().builderQuestions.some(q=>q.id==='disposition_date'));assert.equal(model().initialAnswers.disposition_date,'2010-01-01');});
await save({disposition_date:{unknown:true}});check('explicit date uncertainty',()=>assert.equal(snap().resultCode,'needs_more_info'));await save({disposition_date:{value:'2010-01-01',unknown:false}});
check('history preserves exact earlier deferral and date',()=>{const h=snap().dependencies.semanticAnswerHistory;assert(h.some(x=>x.factId==='wy_1401_listed_deferral'&&x.value==='yes'));assert(h.some(x=>x.factId==='disposition_date'&&x.value?.unknown===true));});
const denied=await post({}, {expectedRevision:stored.revision-1});check('stale refusal',()=>assert.equal(denied.status,409));
owner='wrong';const foreign=await post({wy_1401_listed_deferral:'yes'});check('wrong owner refusal',()=>assert.equal(foreign.status,404));owner='synthetic-wy-owner';
const weird=await post({wy1401Arbitrary:'yes'});check('unexpected key refusal',()=>assert.equal(weird.status,400));
for(const raw of [{value:'no',unknown:false},{value:'no',unknown:true},{value:['no'],unknown:false},{value:'no',unknown:false,extra:'unsafe'},false])check('typed source deferral decoding '+JSON.stringify(raw),()=>assert.equal(H.wy1401Facts({...legalAnswers,...fixed,wy_1401_listed_deferral:raw},'2026-10-15').code,raw?.value==='no'&&raw.unknown===false&&!raw.extra?'review':'missing'));
for(const [id,value,status] of [['ownership_scope','No','hard_stop'],['ownership_scope',undefined,'needs_more_info'],['jurisdiction_scope','Federal','hard_stop'],['jurisdiction_scope',undefined,'needs_more_info']]){const a={...legalAnswers,...fixed,[id]:value};if(value===undefined)delete a[id];check('scope held '+id+String(value),()=>{const r=evalWith(a);assert.equal(r.evaluation.resultCode,status);assert.equal(r.evaluation.paymentAllowed,false);assert(!r.evaluation.pathwayId);});}
const verificationBefore=structuredClone(stored),verifyResponse=await post({}, {verify:true}),verifyBody=await verifyResponse.json();check('ordinary verification remains unsuccessful',()=>{assert.equal(verifyResponse.status,200);assert(isPacketSaveReceipt(verifyBody));assert.equal(verifyBody.readyToGenerate,false);assert.equal(stored.hash,undefined);assert.equal(stored.snapshot,undefined);assert.equal(stored.status,'invalidated');assert.equal(stored.reason,'packet_information_incomplete');assert(Object.values(verifyBody.commercialActions).every(x=>x===false));assert.equal(snap().paymentAllowed,false);assert.deepEqual(snap().screeningAnswers,verificationBefore.draftSnapshot.screeningAnswers);assert.deepEqual(snap().packetAnswers,verificationBefore.draftSnapshot.packetAnswers);});
const currentRecord=structuredClone(stored);
const predecessors=JSON.parse(fs.readFileSync(file('scripts/fixtures/wy-1401-560-predecessors.json')));
check('all retained predecessor source pins',()=>{for(const entry of [...predecessors.loadedSourceInputs,...predecessors.fileReadInputs]){const old=spawnSync('git',['show',predecessors.sourceCommit+':'+entry.path],{cwd:root});assert.equal(old.status,0);assert.equal(createHash('sha256').update(old.stdout).digest('hex'),entry.sha256);}});
for(const prior of predecessors.records){
 stored=structuredClone(prior.record);const priorBytes=structuredClone(stored);
 const get=await API.GET(new Request(url),context);const got=await get.json();
 check('old draft actual GET '+prior.outcome+'/'+prior.financial,()=>{assert.equal(get.status,200);assert.equal(got.ok,true);assert.equal(got.readyToGenerate,false);assert.deepEqual(stored,priorBytes);assert(model());});
 const presented=await present();check('old draft current held presenter '+prior.financial,()=>{assert.equal(presented.authorityStatus,'protected_draft');assert.equal(presented.packetDraft.status,'available');assert.equal(presented.commercialActions.checkoutAllowed,false);});
 const oldTree=await Edit({params,searchParams:Promise.resolve({edit:'wy_1401_listed_deferral'})});check('old draft actual offered edit '+prior.financial,()=>assert(nodes(oldTree).some(n=>n.type===PacketInformationBuilder)));
 await save({});check('old stored byte no-op '+prior.financial,()=>assert.deepEqual(stored,priorBytes));
 await save({wy_1401_listed_deferral:'no'});check('old maps preserved after explicit source correction '+prior.financial,()=>{assert.deepEqual(snap().screeningAnswers,priorBytes.draftSnapshot.screeningAnswers);assert.deepEqual(snap().prefilledAnswers,priorBytes.draftSnapshot.prefilledAnswers);assert.equal(snap().packetAnswers.wy_1401_listed_deferral,'no');assert.equal(snap().paymentAllowed,false);});
}
const prior=predecessors.records[0].record.draftSnapshot;
const priorAnswers={...prior.screeningAnswers};delete priorAnswers.court_requirements_completed;
const currentPrior=evalWith(priorAnswers);
for(const [name,mutate]of [['source',s=>s.profileSourceFingerprint='wrong'],['authority',s=>s.profileAuthorityFingerprint='wrong'],['route',s=>s.pathwayId='felony-conviction-expungement-w-s-7-13-1502'],['plan',s=>s.packetPlan.mode='state_specific_custom_packet_from_source_rules'],['payment',s=>s.paymentAllowed=true],['track',s=>s.selectedTrackId='invented'],['new fact',s=>s.packetAnswers.wy_1401_listed_deferral='no'],['verified',s=>s.schemaVersion='expungement-ai/final-verification/v1']]) {const changed=structuredClone(prior);mutate(changed);check('strict predecessor refusal '+name,()=>assert.equal(P.wyoming1401DraftSuccessor(changed,currentPrior),null));}
stored=currentRecord;
const Selection=await load('src/lib/rcap-engine/screening-question-selection.ts');
for(const hint of [true,false]){const a={...legalAnswers,...fixed};if(!hint)delete a.possible_pathway_context;const ids=Selection.selectScreeningQuestionIds(profile,projectPublicProfile(profile),a);check('public source controls offered '+hint,()=>{for(const id of H.WY_1401_NEW_IDS)assert(ids.includes(id));assert(!ids.includes('disposition_date'));assert(!ids.includes('arrest_date'));assert(!ids.includes('financial_obligations'));});}
const missingDate={...legalAnswers,...fixed};delete missingDate.disposition_date;
check('anonymous source facts without protected date remain held',()=>{const a=evalWith(missingDate);assert.equal(a.evaluation.resultCode,'needs_more_info');assert.deepEqual(a.evaluation.missingQuestionIds,['disposition_date']);assert.equal(a.evaluation.paymentAllowed,false);});
await save({disposition_date:{value:'2099-01-01',unknown:false}});
for(const locale of ['en','es']){const tree=await Edit({params,searchParams:Promise.resolve({edit:'disposition_date'})});check('source-invalid date actual localized needs attention '+locale,()=>{assert(model().missingInputIds.includes('disposition_date'));const q=model().builderQuestions.find(q=>q.id==='disposition_date');assert(q.savedAnswerNeedsClarification);const text=html(tree,locale);assert(text.includes(locale==='en'?'Needs attention':'Necesita atención'));});}
await save({disposition_date:{value:'2010-01-01',unknown:false}});
for(const [state,path,id,current,initial,flag,base,expected]of [
 ['WY',H.WY_1401_ROUTE,'disposition_date','2099-01-01','2099-01-01',true,'known_valid','invalid'],
 ['WY',H.WY_1401_ROUTE,'arrest_date','2099-01-01','2099-01-01',true,'known_valid','invalid'],
 ['WY',H.WY_1401_ROUTE,'disposition_date','2010-01-01','2099-01-01',true,'known_valid','known_valid'],
 ['WY',H.WY_1401_ROUTE,'disposition_date',{unknown:true},'2099-01-01',true,'uncertain','uncertain'],
 ['WY',H.WY_1401_ROUTE,'disposition_date',undefined,undefined,true,'unanswered','unanswered'],
 ['WY',H.WY_1401_ROUTE,'disposition_date','2099-01-01','2099-01-01',false,'known_valid','known_valid'],
 ['WY','other','disposition_date','2099-01-01','2099-01-01',true,'known_valid','known_valid'],
 ['NM',H.WY_1401_ROUTE,'disposition_date','2099-01-01','2099-01-01',true,'known_valid','known_valid'],
 ['WY',H.WY_1401_ROUTE,'other_date','2099-01-01','2099-01-01',true,'known_valid','known_valid']])check('server-bound date display '+[state,path,id,base,expected].join('/'),()=>assert.equal(H.wy1401DateAnswerState(state,path,id,current,initial,flag,base),expected));
check('source order no irrelevant later fact blocks known deferral',()=>assert.equal(H.wy1401Facts({wy_1401_listed_deferral:'yes'},'2026-10-15').code,'deferral'));
check('source order pending before unknown incident',()=>assert.equal(H.wy1401Facts({wy_1401_listed_deferral:'no',pending_cases:'Yes'},'2026-10-15').code,'pending'));
const targetRecord=structuredClone(stored);
const siblingWitness=JSON.parse(fs.readFileSync(file('data/rcap-ledger/public-witness-fixtures.json'))).fixtures.find(w=>w.pathwayKey==='WY:felony-conviction-expungement-w-s-7-13-1502');
const siblingAuthority=evalWith(siblingWitness.answers),siblingSeed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:siblingAuthority,screeningAnswers:siblingWitness.answers,dependencies:{},capturedAt:seed.snapshot.capturedAt});
stored={status:'unverified',reason:'synthetic_wrong_route_control',revision:0,draftHash:siblingSeed.hash,draftSnapshot:siblingSeed.snapshot};
const wrongRouteBefore=structuredClone(stored),wrongRouteResponse=await post({wy_1401_listed_deferral:'no'});
check('foreign route source fact refused without mutation',()=>{assert.equal(wrongRouteResponse.status,422);assert.deepEqual(stored,wrongRouteBefore);});
stored=targetRecord;
console.log(JSON.stringify({status:'PASS',checks,scope:'WY1401 source facts, public/evaluator/actual protected HTTP and EN/ES SSR; synthetic storage only; no DB/browser/render or authority'}));
