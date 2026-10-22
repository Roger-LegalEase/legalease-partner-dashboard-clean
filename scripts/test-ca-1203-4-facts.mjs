import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {spawnSync} from 'node:child_process';
const routes=['tool-1-dismissal-set-aside'];
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
const route=process.argv[2];
const witness=JSON.parse(fs.readFileSync(file('data/rcap-ledger/public-witness-fixtures.json'))).fixtures.find(row=>row.pathwayKey==='CA:'+route);
const legacy='Earlier contact prose retained as history';
const legalAnswers={...witness.answers,case_outcome:'Misdemeanor conviction'};
const sourceAnswers={...legalAnswers,contact_information:legacy,residency_or_location:'Earlier judicial district answer'};
const authoritative=evaluate({jurisdiction:'CA',profileVersion:witness.profileVersion,matterId:'synthetic-ca-contact',answers:legalAnswers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});assert(seed);
const original={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
let stored=structuredClone(original),owner='synthetic-ca-owner';
const item={id:'synthetic-ca-contact',jurisdiction:'CA',artifactRefs:{}};
const snap=()=>stored.draftSnapshot??stored.snapshot,model=()=>P.protectedPacketInformationModelFor(stored);
let checks=0;const check=(name,fn)=>{try{fn();checks++}catch(error){error.message=name+': '+error.message;throw error}};
const present=()=>decorate({consumerAuthUserId:'synthetic-ca-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'CA',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:deps.readCommercialActions});
globalThis.__caHistoryTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-ca-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__caHistoryTransport.'+b+'(...args);').join('\n'));};
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



const H=await load('src/lib/rcap-engine/california-1203-4-facts.ts');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const profile=getProfileByJurisdiction('CA');
const fixed={ca_12034_probation_granted:'yes',ca_12034_current_status:['none'],ca_12034_probation_outcome:'fulfilled',ca_12034_relief_election:'fulfilled',ca_12034_offense_sections:'PC 484'};
for(const [name,delta,code,status] of [
 ['fulfilled',{},'preparation','needs_review'],['early',{ca_12034_probation_outcome:'early_discharge',ca_12034_relief_election:'early_discharge'},'preparation','needs_review'],
 ['interests',{ca_12034_probation_outcome:'not_completed',ca_12034_relief_election:'interests_of_justice',ca_12034_interests_narrative:'My own account for the court.'},'preparation','needs_review'],
 ['false completion',{ca_12034_probation_outcome:'not_completed'},'conflict','needs_review'],['no probation',{ca_12034_probation_granted:'no'},'variant','needs_review'],
 ['unknown probation',{ca_12034_probation_granted:'unknown'},'missing','needs_more_info'],['current sentence',{ca_12034_current_status:['serving_sentence']},'current','not_yet'],
 ['current probation',{ca_12034_current_status:['on_probation']},'current','not_yet'],['current charge',{ca_12034_current_status:['charged']},'current','not_yet'],
 ['unknown status',{ca_12034_current_status:['unknown']},'missing','needs_more_info'],['mixed none',{ca_12034_current_status:['none','charged']},'missing','needs_more_info'],
 ['mixed unknown',{ca_12034_current_status:['unknown','serving_sentence']},'missing','needs_more_info'],['missing narrative',{ca_12034_relief_election:'interests_of_justice'},'missing','needs_more_info']]) {
 const a={...legalAnswers,...fixed,...delta}; if(name.startsWith('mixed')) {check(name+' public refuses conflicting exclusive selections',()=>assert.throws(()=>evaluate({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'source-case',answers:a})));check(name+' raw helper remains unknown',()=>assert.equal(H.ca12034Facts(a).status,'missing'));continue;} const r=evaluate({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'source-case',answers:a});
 check(name,()=>{assert.equal(r.evaluation.resultCode,status);assert.equal(r.evaluation.reasons[0].code,'ca.probation_'+code);assert.equal(r.evaluation.paymentAllowed,false);assert.equal(r.selectedTrackId,null);});
}
// Preserve the original arrest/no-charge controls independently of the adopted misdemeanor witness.
const noChargeOutcome='Arrest or citation with no charge filed';
for(const outcome of [noChargeOutcome,'Dismissed, no-billed, nolle prosequi, or not prosecuted','I am not sure']) for(const hint of [true,false]) {
 const a={...legalAnswers,...fixed,case_outcome:outcome};if(!hint)delete a.possible_pathway_context;
 const r=evaluate({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'nonconviction',answers:a});
 check('no incompatible Tool1 '+outcome+'/'+hint,()=>{assert.notEqual(r.evaluation.pathwayId,route);assert.equal(r.evaluation.paymentAllowed,false);});
}
for(const text of ['No estoy seguro','no lo sé','not available','none','unknown','no disponible']) {
 const raw={value:text,unknown:false};const a={...legalAnswers,...fixed,ca_12034_offense_sections:raw};const before=structuredClone(a);
 check('standalone non-fact withheld '+text,()=>{assert.equal(H.ca12034Facts(a).status,'missing');assert.deepEqual(a,before);});
}
check('interests election preserves required known probation outcome',()=>assert.equal(H.ca12034Facts({...legalAnswers,...fixed,ca_12034_probation_outcome:'unknown',ca_12034_relief_election:'interests_of_justice',ca_12034_interests_narrative:'My request'}).status,'missing'));
for(const [id,value,expected]of [['ownership_scope',undefined,'needs_more_info'],['ownership_scope','No','hard_stop'],['ownership_scope',['Yes'],'needs_more_info'],['jurisdiction_scope',undefined,'needs_more_info'],['jurisdiction_scope','Federal','hard_stop'],['jurisdiction_scope','I am not sure','needs_more_info']]) {
 const a={...legalAnswers,...fixed,[id]:value};if(value===undefined)delete a[id];
 const r=evaluate({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'context-boundary',answers:a});
 check('original context boundary '+id+'/'+JSON.stringify(value),()=>{assert.equal(r.evaluation.resultCode,expected);assert(!r.evaluation.pathwayId);assert(!r.evaluation.packetPlan);assert.equal(r.evaluation.paymentAllowed,false);assert.equal(r.selectedTrackId,null);});
}
for(const value of ['No','I am not sure',undefined]){
 const a={...legalAnswers,...fixed,financial_obligations:value};if(value===undefined)delete a.financial_obligations;
 const protectedAnswers={...a,...(value===undefined?{}:{court_requirements_completed:value})};
 const r=evaluate({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'financial-context',answers:a});
 const seeded=P.protectedPacketDraftSeedFromAuthoritative({authoritative:r,screeningAnswers:protectedAnswers,dependencies:{},capturedAt:'2026-10-15T00:00:00Z'});assert(seeded);
 const m=P.protectedPacketInformationModelFor({status:'unverified',reason:'source-fact-test',revision:0,draftHash:seeded.hash,draftSnapshot:seeded.snapshot});
 check('no inherited paid-in-full gate '+JSON.stringify(value),()=>{assert.equal(r.evaluation.resultCode,'needs_review');assert.equal(r.evaluation.reasons[0].code,'ca.probation_preparation');for(const id of ['financial_obligations','court_requirements_completed']){assert(!m.missingInputIds.includes(id));assert(!m.builderQuestions.some(q=>q.id===id));}assert.deepEqual({...seeded.snapshot.screeningAnswers,...seeded.snapshot.prefilledAnswers,...seeded.snapshot.packetAnswers},protectedAnswers);});
}
const tree=await Edit({params,searchParams:Promise.resolve({})});
check('real held editor remains available',()=>assert.equal(nodes(tree).filter(n=>n.type===PacketInformationBuilder).length,1));
const body=await save(fixed);check('ordinary source-fact save reaches held preparation',()=>assert.equal(snap().resultCode,'needs_review'));
for(const locale of ['en','es'])check('actual editor localized source controls '+locale,()=>assert(html(tree,locale).includes(locale==='en'?'probation':'libertad condicional')));

const overview=await Edit({params,searchParams:Promise.resolve({})});
check('held source-fact save returns to matter without route-change trap',()=>{const b=nodes(overview).find(n=>n.type===PacketInformationBuilder);assert(b);assert.equal(b.props.returnToMatterAfterCorrection,true);assert.equal(b.props.initialRouteChanged,false);});
check('taxonomy absent remains inactive',()=>{assert(!model().builderQuestions.some(q=>q.id==='record_type'));assert(!model().missingInputIds.includes('record_type'));});
const noTaxonomyRecord=structuredClone(stored);
for(const value of ['Arrest or charge','Court case','Conviction','Juvenile matter','I am not sure']){
 await save({record_type:value});
 check('original taxonomy stays optional context '+value,()=>{assert.equal(snap().resultCode,'needs_review');assert.equal(snap().paymentAllowed,false);assert.equal(snap().pathwayId,route);assert(!model().missingInputIds.includes('record_type'));const q=model().questions.find(q=>q.id==='record_type');assert(q);assert.equal(q.required,false);assert(q.prompt.includes('optional history'));});
 const previous=structuredClone(stored);await save({});check('taxonomy raw no-op '+value,()=>assert.deepEqual(stored,previous));
}
const typedRaw={unknown:false,value:['Court case'],source:'legacy-retained-shape'};snap().packetAnswers.record_type=structuredClone(typedRaw);stored.draftHash=P.protectedPacketDraftHash(snap());
const typedBefore=structuredClone(stored);await save({});check('typed retained taxonomy no-op is lossless',()=>assert.deepEqual(stored,typedBefore));
await save({record_type:'Court case'});check('ordinary scalar repair archives exact typed taxonomy',()=>assert(snap().dependencies.semanticAnswerHistory.some(x=>x.factId==='record_type'&&JSON.stringify(x.value)===JSON.stringify(typedRaw))));
stored=noTaxonomyRecord;
for(const locale of ['en','es']){const matter=await Matter({params});check('actual matter shows held source consequence '+locale,()=>assert(html(matter,locale).includes(H.CA_12034_COPY.preparation[locale==='en'?0:1])));}
let before=structuredClone(stored);await save({});check('complete current no-op preserves record',()=>assert.deepEqual(stored,before));
await save({financial_obligations:'No'});check('unpaid debt alone never changes source decision',()=>assert.equal(snap().resultCode,'needs_review'));
for(const delta of [{ca_12034_current_status:['charged']},{ca_12034_current_status:['unknown']},{ca_12034_current_status:['none']},
 {ca_12034_probation_outcome:'not_completed'},{ca_12034_relief_election:'interests_of_justice'},
 {ca_12034_interests_narrative:{value:'My own request, without an argument supplied by the app.',unknown:false}},
 {ca_12034_probation_outcome:'early_discharge',ca_12034_relief_election:'early_discharge'}]) {
 const previous=structuredClone(snap());await save(delta);
 check('source transition retains original answer history '+Object.keys(delta).join(','),()=>{for(const id of Object.keys(delta)){for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])if(Object.hasOwn(previous[source],id)&&JSON.stringify(previous[source][id])!==JSON.stringify(delta[id])) assert(snap().dependencies.semanticAnswerHistory.some(x=>x.factId===id&&x.source===source&&JSON.stringify(x.value)===JSON.stringify(previous[source][id])),id);}});
 check('every transition real held editor',()=>assert(P.heldPacketCorrectionInputIds(model(),snap().resultCode).has('ca_12034_current_status')));
}
await save({ca_12034_relief_election:'interests_of_justice',ca_12034_probation_outcome:'unknown'});
check('unknown outcome keeps narrative correction available',()=>{assert.equal(snap().resultCode,'needs_more_info');assert(model().missingInputIds.includes('ca_12034_probation_outcome'));assert(model().builderQuestions.some(q=>q.id==='ca_12034_interests_narrative'));});
await save({ca_12034_interests_narrative:{value:'Participant can continue drafting while the outcome remains unknown.',unknown:false}});
check('ordinary narrative saves under unknown outcome',()=>{assert.equal(snap().resultCode,'needs_more_info');assert.equal(snap().packetAnswers.ca_12034_probation_outcome,'unknown');});
for(const text of ['not available','No lo sé']){
 await save({...fixed,ca_12034_offense_sections:{value:text,unknown:false}});
 check('ordinary non-fact raw is saved but visibly unresolved '+text,()=>{assert.equal(snap().resultCode,'needs_more_info');assert.deepEqual(snap().packetAnswers.ca_12034_offense_sections,{value:text,unknown:false});assert(model().missingInputIds.includes('ca_12034_offense_sections'));assert(model().builderQuestions.find(q=>q.id==='ca_12034_offense_sections').savedAnswerNeedsClarification);});
 await save({ca_12034_offense_sections:{unknown:true}});await save({ca_12034_offense_sections:{value:'Penal Code section 484(a)',unknown:false}});
 check('explicit unknown and known code correction retains exact history '+text,()=>{assert.equal(snap().resultCode,'needs_review');assert(snap().dependencies.semanticAnswerHistory.some(x=>x.factId==='ca_12034_offense_sections'&&x.value?.value===text));assert(snap().dependencies.semanticAnswerHistory.some(x=>x.factId==='ca_12034_offense_sections'&&x.value?.unknown===true));});
}
const fixedRaw=Object.fromEntries(H.CA_12034_FACT_IDS.filter(id=>Object.hasOwn(snap().packetAnswers,id)).map(id=>[id,structuredClone(snap().packetAnswers[id])]));
await save({case_outcome:noChargeOutcome});
check('truthful no-charge removes Tool1 and keeps source facts raw',()=>{assert.equal(snap().pathwayId,null);for(const[id,value]of Object.entries(fixedRaw))assert.deepEqual(snap().packetAnswers[id],value);assert(!model().builderQuestions.some(q=>H.CA_12034_FACT_IDS.includes(q.id)));});
const noCharge=await Edit({params,searchParams:Promise.resolve({edit:'possible_pathway_context'})});
check('actual offered route request can correct no-charge without false conviction',()=>{const b=nodes(noCharge).find(n=>n.type===PacketInformationBuilder);assert(b);assert(b.props.questions.some(q=>q.id==='possible_pathway_context'));assert.equal(b.props.returnToMatterAfterCorrection,true);});
for(const hint of ['None of these / I am not sure','']) {
 await save({possible_pathway_context:hint});
 check('optional hint correction preserves truthful no-charge '+JSON.stringify(hint),()=>{assert.equal(snap().screeningAnswers.case_outcome??snap().packetAnswers.case_outcome,noChargeOutcome);assert.equal(snap().pathwayId,null);assert.equal(snap().resultCode,'needs_review');assert.equal(snap().paymentAllowed,false);for(const[id,value]of Object.entries(fixedRaw))assert.deepEqual(snap().packetAnswers[id],value);});
 const p=await present();check('post-hint correction is available held draft',()=>{assert.equal(p.authorityStatus,'protected_draft');assert.equal(p.packetDraft.status,'available');assert.equal(p.commercialActions.checkoutAllowed,false);});
}

await save({case_outcome:'Misdemeanor conviction',possible_pathway_context:legalAnswers.possible_pathway_context});
check('explicit conviction and Tool1 topic restore only saved factual controls',()=>{assert.equal(snap().pathwayId,route);for(const[id,value]of Object.entries(fixedRaw))assert.deepEqual(snap().packetAnswers[id],value);assert(model().builderQuestions.some(q=>q.id==='ca_12034_offense_sections'));assert.equal(snap().paymentAllowed,false);});
await save({ca_12034_relief_election:'interests_of_justice'});
check('conditional narrative reappears with exact retained words',()=>{assert(model().builderQuestions.some(q=>q.id==='ca_12034_interests_narrative'));assert.deepEqual(snap().packetAnswers.ca_12034_interests_narrative,fixedRaw.ca_12034_interests_narrative);});
const {projectPublicProfile}=await load('src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await load('src/lib/rcap-engine/screening-question-selection.ts');
const {sanitizeAnswersForQuestionIds}=await load('src/components/expungement-ai/screening/screens.ts');
const publicProfile=projectPublicProfile(profile);
for(const hint of [true,false]) {
 const a={...legalAnswers};if(!hint)delete a.possible_pathway_context;
 check('real public source collection '+hint,()=>{const ids=selectScreeningQuestionIds(profile,publicProfile,a);assert(ids.includes('ca_12034_probation_granted'));assert(!ids.includes('financial_obligations'));});
}
check('hidden source facts preserve raw wrappers in public resume',()=>{const a={...fixed,ca_12034_interests_narrative:{unknown:true,value:'retained words'}};assert.deepEqual(sanitizeAnswersForQuestionIds(a,H.CA_12034_FACT_IDS,[],publicProfile),a);});
const serverGuard=await load('src/lib/expungement-ai/ca-1203-4-record-context.ts');
check('exact retained source guard',()=>assert(serverGuard.ca12034RecordIsContext(profile,route,null)));
for(const delta of [{jurisdiction:{...profile.jurisdiction,code:'NY'}},{profileVersion:'drift'},{source:{...profile.source,sourceCorpusSha256:'drift'}}])check('source/route drift refuses '+JSON.stringify(delta),()=>assert(!serverGuard.ca12034RecordIsContext({...profile,...delta},route,null)));
for(const key of ['memo','fieldMap','sourceReceipt'])check('retained dependency drift refuses '+key,()=>assert(!serverGuard.ca12034RecordIsContext(profile,route,null,{[key]:{}})));
const predecessors=JSON.parse(fs.readFileSync(file('scripts/fixtures/ca-1203-4-a386-predecessors.json')));
for(const prior of predecessors.records){
 stored=structuredClone(prior.record);const priorBytes=structuredClone(stored);
 const get=await API.GET(new Request(url),context);const got=await get.json();
 check('actual predecessor GET preserves full stored row '+prior.outcome,()=>{assert.equal(get.status,200);assert.equal(got.ok,true);assert.equal(got.readyToGenerate,false);assert.deepEqual(stored,priorBytes);});
 const m=model();check('actual Git predecessor model '+prior.outcome,()=>assert(m));
 const current=await present();check('actual Git predecessor presenter '+prior.outcome,()=>{assert.equal(current.authorityStatus,'protected_draft');assert.equal(current.packetDraft.status,'available');assert.equal(current.commercialActions.checkoutAllowed,false);});
 const pageTree=await Edit({params,searchParams:Promise.resolve({edit:'case_outcome'})});
 for(const locale of ['en','es'])check('old-source real correction page '+prior.outcome+'/'+locale,()=>{const b=nodes(pageTree).find(n=>n.type===PacketInformationBuilder);assert(b);assert(b.props.questions.some(q=>q.id==='case_outcome'));assert.equal(b.props.returnToMatterAfterCorrection,true);assert(html(pageTree,locale).includes(locale==='en'?'Review conviction and probation facts':'Revise los hechos de la condena'));});
 await save({});check('old whole-record no-op '+prior.outcome,()=>assert.deepEqual(stored,priorBytes));
 await save({case_outcome:'Misdemeanor conviction'});
 check('old ordinary material correction retains raw unrelated facts '+prior.outcome,()=>{assert.equal(snap().pathwayId,route);for(const [key,val]of Object.entries(priorBytes.draftSnapshot.screeningAnswers)){if(key==='case_outcome')continue;assert.deepEqual(snap().screeningAnswers[key]??snap().prefilledAnswers[key]??snap().packetAnswers[key],val,key);}});
}
const predecessor=predecessors.records[1].record.draftSnapshot;
const priorAnswers={...predecessor.screeningAnswers,...predecessor.prefilledAnswers,...predecessor.packetAnswers};
const currentPrior=evaluate({jurisdiction:'CA',profileVersion:profile.profileVersion,matterId:'historical-guard',answers:priorAnswers});
for(const [name,mutate]of [['source',s=>s.profileSourceFingerprint='drift'],['authority',s=>s.profileAuthorityFingerprint='drift'],['plan',s=>s.packetPlan.sourceFormIds=[]],['required ids',s=>s.requiredInputIds=[]],['track',s=>s.selectedTrackId='invented'],['result',s=>s.resultCode='packet_ready'],['payment',s=>s.paymentAllowed=false],['new fact',s=>s.packetAnswers.ca_12034_probation_granted='yes']]){
 const changed=structuredClone(predecessor);mutate(changed);check('strict predecessor refusal '+name,()=>assert.equal(P.californiaProbationDraftSuccessor(changed,currentPrior),null));
}
for(const [name,answers,extra,query,status]of [
 ['wrong field',{arbitrary_ca_fact:'yes'},{},'',422],['source option',{ca_12034_probation_granted:'fabricated'},{},'',422],
 ['stale',{}, {expectedRevision:stored.revision-1},'',409]]) {
 const before=structuredClone(stored),r=await post(answers,extra,query);check(name+' refusal atomic',()=>{assert.equal(r.status,status,name);assert.deepEqual(stored,before);});
}
const beforeVerify=structuredClone(snap());const verificationAttempt=await post({}, {verify:true});
check('existing plan-bearing verification request remains closed',()=>assert.equal(verificationAttempt.status,200));
const verificationBody=await verificationAttempt.json();
check('failed review cannot verify or grant commerce',()=>{assert(isPacketSaveReceipt(verificationBody));assert.equal(verificationBody.readyToGenerate,false);assert.equal(stored.status,'invalidated');assert.equal(stored.reason,'packet_information_incomplete');assert.equal(stored.hash,undefined);assert.equal(stored.snapshot,undefined);assert.equal(stored.draftHash,P.protectedPacketDraftHash(snap()));assert(Object.values(verificationBody.commercialActions).every(v=>v===false));for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])assert.deepEqual(snap()[map],beforeVerify[map]);});
owner='another-owner';const beforeWrong=structuredClone(stored);check('other-owner GET denied',()=>{});assert.equal((await API.GET(new Request(url),context)).status,404);assert.equal((await post({case_outcome:'Felony conviction'})).status,404);assert.deepEqual(stored,beforeWrong);owner='synthetic-ca-owner';
console.log(JSON.stringify({status:'PASS',checks,verificationAttempt:{http:verificationAttempt.status,status:stored.status,reason:stored.reason,verifiedHashPresent:Boolean(stored.hash),verifiedSnapshotPresent:Boolean(stored.snapshot),readyToGenerate:verificationBody.readyToGenerate,draftHashValid:stored.draftHash===P.protectedPacketDraftHash(snap()),draftHashUnchanged:stored.draftHash===P.protectedPacketDraftHash(beforeVerify)},finalTuple:{pathwayId:snap().pathwayId,resultCode:snap().resultCode,paymentAllowed:snap().paymentAllowed}}));
