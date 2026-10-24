import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
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
const packetInformationFile=file('src/lib/expungement-ai/packet-information.ts');
compile(packetInformationFile,fs.readFileSync(packetInformationFile,'utf8')+'\nexport {packetCollectionFor,validatePacketAnswer,protectedPacketDraftReviewSafety,evaluateProtectedPacketFacts};');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {PacketInformationBuilder}=await load('src/components/expungement-ai/PacketInformationBuilder.tsx');
const {getProfileByJurisdiction}=await load('src/lib/rcap-engine/profile-registry.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const route='first-offense-possession-sealing';
const witness=JSON.parse(fs.readFileSync(file('data/rcap-ledger/public-witness-fixtures.json'))).fixtures.find(row=>row.pathwayKey==='ND:'+route);
const legacy='Earlier contact prose retained as history';
const sourceAnswers={...witness.answers,case_outcome:'Misdemeanor conviction',offense_level:'Misdemeanor',contact_information:legacy,residency_or_location:'Earlier judicial district answer'};
const {contact_information:_contact,residency_or_location:_location,...legalAnswers}=sourceAnswers;
const authoritative=evaluate({jurisdiction:'ND',profileVersion:witness.profileVersion,matterId:'synthetic-nd-contact',answers:legalAnswers});
const seed=P.protectedPacketDraftSeedFromAuthoritative({authoritative,screeningAnswers:sourceAnswers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});assert(seed);
const original={status:'unverified',reason:'synthetic_current_source_witness',revision:0,draftHash:seed.hash,draftSnapshot:seed.snapshot};
let stored=structuredClone(original),owner='synthetic-nd-owner';
const item={id:'synthetic-nd-contact',jurisdiction:'ND',artifactRefs:{}};
const snap=()=>stored.draftSnapshot??stored.snapshot,model=()=>P.protectedPacketInformationModelFor(stored);
let checks=0;const check=(name,fn)=>{try{fn();checks++}catch(error){error.message=name+': '+error.message;throw error}};
const present=()=>decorate({consumerAuthUserId:'synthetic-nd-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'ND',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__ndFactsTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-nd-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__ndFactsTransport.'+b+'(...args);').join('\n'));};
const page=async(path,correction=false)=>{const name=file(path);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],...(correction?[['readProtectedPacketVerification','verification-cas']]:[])])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;};
const Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx',true);
const Matter=await page('src/app/briefcase/[packetId]/page.tsx');
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let source=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);compile(apiFile,source);const API=await import(pathToFileURL(apiFile).href);
const params=Promise.resolve({packetId:item.id}),context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={},query='')=>API.POST(new Request(url+query,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const save=async answers=>{const response=await post(answers);const body=await response.json();assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));return body;};
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};

const H=await load('src/lib/rcap-engine/north-dakota-first-offense-facts.ts');
const {projectPublicProfile}=await load('src/lib/rcap-engine/public-profile-projection.ts');
const {selectScreeningQuestionIds}=await load('src/lib/rcap-engine/screening-question-selection.ts');
const PublicAPI=await load('src/app/api/expungement-ai/evaluate/route.ts');
const profile=getProfileByJurisdiction('ND'),publicProfile=projectPublicProfile(profile),ids=H.ND_FIRST_OFFENSE_FACT_IDS;
const fixed={mjJudgmentDate:'2017-10-03',mjSubstance:'marijuana',mjQuantity:'one ounce',mjFirstOffence:'yes',mjSubsequentConviction:'No',mjOtherCharges:'No'};
const call=async answers=>{const response=await PublicAPI.POST(new Request('http://local.test/api/expungement-ai/evaluate',{method:'POST',body:JSON.stringify({jurisdiction:'ND',profileVersion:profile.profileVersion,matterId:item.id,answers})}));return {status:response.status,body:await response.json()};};
const shape=s=>Object.fromEntries(['pathwayId','selectedTrackId','paymentAllowed','packetPlan','requiredInputIds'].map(k=>[k,s[k]]));
const originalShape=shape(snap());
check('six deciding facts offered without filing or legacy aliases',()=>{const offered=selectScreeningQuestionIds(profile,publicProfile,sourceAnswers);for(const id of ids)assert(offered.includes(id),id);for(const id of ['resolved_timing_bucket','mjOffenceDate','mjCaseNumber','mjCounty','mjCourtType','nd_charged_quantity','nd_first_offense_confirmation'])assert(!offered.includes(id),id);assert(!model().missingInputIds.includes('resolved_timing_bucket'));});
const visibleReason=async code=>{
 const current=await present();check('source-bound presenter reason '+code,()=>assert.equal(current.summary,H.ND_FIRST_OFFENSE_COPY[code][0]));
 const tree=await Matter({params});for(const locale of ['en','es'])check('actual matter displays specific legal consequence '+locale+'/'+code,()=>assert(html(tree,locale).includes(renderToStaticMarkup(React.createElement('span',null,H.ND_FIRST_OFFENSE_COPY[code][locale==='es'?1:0])).slice(6,-7))));
};
const cases=[
 ['one ounce',{},'supported','needs_review'], ['three ounces',{mjQuantity:'3 ounces'},'above_threshold','likely_not_eligible'],
 ['THC two grams',{mjSubstance:'thc',mjQuantity:'2 grams'},'supported','needs_review'],
 ['THC above',{mjSubstance:'thc',mjQuantity:'2.1 grams'},'above_threshold','likely_not_eligible'],
 ['unknown quantity',{mjQuantity:'I am not sure'},'missing','needs_more_info'],
 ['unknown first',{mjFirstOffence:'unknown'},'missing','needs_more_info'],
 ['not first',{mjFirstOffence:'no'},'first_offence','likely_not_eligible'],
 ['later conviction',{mjSubsequentConviction:'Yes'},'subsequent','needs_review'],
 ['other charges',{mjOtherCharges:'Yes'},'other_charges','needs_review'],
 ['no judgment',{mjJudgmentDate:'I am not sure'},'missing','needs_more_info'],
 ['future judgment',{mjJudgmentDate:'2099-01-01'},'missing','needs_more_info'],
 ['impossible judgment',{mjJudgmentDate:'2017-02-30'},'missing','needs_more_info'],
 ['different substance',{mjSubstance:'other'},'substance','likely_not_eligible'],
 ['no conversion',{mjQuantity:'28.35 grams'},'quantity','needs_more_info'],
 ['no negative',{mjQuantity:'-0.5 ounce'},'quantity','needs_more_info'],
 ['multiple amounts',{mjQuantity:'one ounce and 3 ounces'},'quantity','needs_more_info'],
 ['range',{mjQuantity:'0.5-3 ounces'},'quantity','needs_more_info'],
 ['zero denominator',{mjQuantity:'1/0 ounce'},'quantity','needs_more_info'],
 ['ambiguous adjudication',{case_outcome:'Other conviction or adjudication'},'outcome','needs_review'],
 ['dismissed plus supplied facts',{case_outcome:'Dismissed, no-billed, nolle prosequi, or not prosecuted'},'outcome','needs_review']
];
for(const[label,delta,code,resultCode]of cases){const result=await call({...legalAnswers,...fixed,...delta});check('actual public handler '+label,()=>{assert.equal(result.status,200);assert.equal(result.body.resultCode,resultCode);assert.equal(result.body.reasons[0].code,'nd.first_possession_'+code);assert.equal(result.body.pathwayId,route);assert.equal(result.body.paymentAllowed,false);assert.equal(result.body.consumerPacketAvailable,false);assert.equal(result.body.sponsoredPacketAvailable,false);assert.equal(evaluate({jurisdiction:'ND',profileVersion:profile.profileVersion,matterId:item.id,answers:{...legalAnswers,...fixed,...delta}}).selectedTrackId,null);});}
const conditionalCases=[
 ['mjQuantity','3 ounces',{mjSubsequentConviction:'unknown',mjOtherCharges:'unknown'},'above_threshold','likely_not_eligible'],
 ['mjFirstOffence','no',{mjSubsequentConviction:'unknown',mjOtherCharges:'unknown'},'first_offence','likely_not_eligible'],
 ['mjSubstance','other',{mjQuantity:'unknown'},'substance','likely_not_eligible'],
 ['mjSubsequentConviction','Yes',{mjOtherCharges:'unknown'},'subsequent','needs_review']
];
for(const[id,value,later,reason,result]of conditionalCases){
 const answers={...legalAnswers,...fixed,...later,[id]:value},response=await call(answers),offered=selectScreeningQuestionIds(profile,publicProfile,answers);
 check('original source early exit despite later uncertainty '+id,()=>{assert.equal(response.status,200);assert.equal(response.body.resultCode,result);assert.equal(response.body.reasons[0].code,'nd.first_possession_'+reason);assert.equal(response.body.paymentAllowed,false);for(const next of ids.slice(ids.indexOf(id)+1))assert(!offered.includes(next),next);assert(offered.includes(id));});
 const repaired={...answers,[id]:fixed[id]},after=selectScreeningQuestionIds(profile,publicProfile,repaired);
 check('explicit source correction restores downstream questions '+id,()=>{for(const next of ids)assert(after.includes(next),next);});
}
for(const raw of [{unknown:true},{value:'3 ounces',unknown:false},['one ounce'],4]){const result=await call({...legalAnswers,...fixed,mjQuantity:raw});check('public malformed shapes remain unresolved '+JSON.stringify(raw),()=>{assert.equal(result.status,200);assert.equal(result.body.resultCode,'needs_more_info');assert(result.body.missingQuestionIds.includes('mjQuantity'));assert.equal(result.body.paymentAllowed,false);});}
for(const delta of [{nd_charged_quantity:'one ounce'},{nd_first_offense_confirmation:'yes'},{client_track:'nd-marijuana-first-offense-seal'}]){const result=await call({...legalAnswers,...delta});check('no legacy alias or unknown ID bypass',()=>assert.equal(result.status,400));}
for(const mutate of [p=>p.jurisdiction.code='SD',p=>p.profileVersion='other',p=>p.source.sourceCorpusSha256='other',p=>p.pathways.find(p=>p.id===route).sourceRef='other'])check('exact source guard',()=>{const p=structuredClone(profile);mutate(p);assert.equal(H.ndFirstOffenseFacts(p,route,{...legalAnswers,...fixed},'2026-10-15').status,'not_applicable');});
for(const sibling of profile.pathways.filter(p=>p.id!==route))check('sibling predicates untouched '+sibling.id,()=>assert.equal(H.ndFirstOffenseFacts(profile,sibling.id,{...legalAnswers,...fixed},'2026-10-15').status,'not_applicable'));
// The approved parser is reused byte for byte; stricter one-amount input
// handling prevents contradictory prose from being interpreted as a quantity.
const {execFileSync}=await import('node:child_process');
check('original approved parser and nd-to-mj successor reused',()=>{const old=execFileSync('git',['show','69b215d3673600b18ead7422699eb4e6636de6fe:src/lib/rcap/packets/jurisdictions/north-dakota/custom-pleading.ts'],{cwd:root}).toString();const parser=old.slice(old.indexOf('function parseQuantity('),old.indexOf('/** The bare county name')).trim();assert(fs.readFileSync(file('src/lib/rcap-engine/north-dakota-first-offense-facts.ts'),'utf8').includes(parser));const successors=JSON.parse(fs.readFileSync(file('src/lib/expungement-ai/reviewed-packet-contract-successors.json')));const entry=Object.values(successors).find(v=>v&&v['ND:'+route])['ND:'+route];for(const id of ['nd_charged_quantity','nd_first_offense_confirmation'])assert(entry.removedFactIds.includes(id));for(const id of ['mjQuantity','mjFirstOffence'])assert(entry.addedFactIds.includes(id));});
check('current missing model exists with exact controls',()=>{assert(model());for(const id of ids)assert(P.editablePacketInputIds(model()).has(id),id);});
const before=structuredClone(stored);await save({});check('initial no-op protected bytes',()=>assert.deepEqual(stored,before));
await save(fixed);check('known facts reach held supported result without plan or authority drift',()=>{assert.equal(snap().resultCode,'needs_review');assert.deepEqual(shape(snap()),originalShape);for(const[id,value]of Object.entries(fixed))assert.equal(snap().packetAnswers[id],value);});
await save({mjQuantity:{value:'3 ounces',unknown:false}});await visibleReason('above_threshold');check('protected actual known wrapper contrast',()=>{assert.equal(snap().resultCode,'likely_not_eligible');assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId==='mjQuantity'&&h.value==='one ounce'));assert.deepEqual(shape(snap()),originalShape);});
await save({mjQuantity:{unknown:true}});await visibleReason('missing');check('protected explicit uncertainty and raw history',()=>{assert.equal(snap().resultCode,'needs_more_info');assert.deepEqual(snap().packetAnswers.mjQuantity,{unknown:true});assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId==='mjQuantity'&&h.value?.value==='3 ounces'));});
await save({mjQuantity:{value:'one ounce',unknown:false}});check('protected restored source fact',()=>assert.equal(snap().resultCode,'needs_review'));
for (const [raw,code] of [[{value:'2017-10-04',unknown:false},'needs_review'],[{value:'2017-10-04',unknown:true},'needs_more_info'],[{unknown:true},'needs_more_info'],[{value:'2017-10-03',unknown:false},'needs_review']]) {
 await save({mjJudgmentDate:raw});check('actual calendar wrapper '+JSON.stringify(raw),()=>{assert.deepEqual(snap().packetAnswers.mjJudgmentDate,raw);assert.equal(snap().resultCode,code);assert.equal(snap().paymentAllowed,false);});
}
for(const [id,value,code,reason] of [['mjFirstOffence','no','likely_not_eligible','first_offence'],['mjFirstOffence','yes','needs_review','supported'],['mjSubsequentConviction','Yes','needs_review','subsequent'],['mjSubsequentConviction','No','needs_review','supported']]) {
 await save({[id]:value});await visibleReason(reason);check('actual source-choice correction '+id+value,()=>{assert.equal(snap().resultCode,code);assert.equal(P.protectedPacketScreeningAnswers(snap())[id],value);assert.equal(P.evaluateProtectedPacketFacts(snap()).evaluation.reasons[0].code,'nd.first_possession_'+reason);});
}
const currentNoop=structuredClone(stored);await save({mjQuantity:{value:'one ounce',unknown:false}});check('same typed value no-op retains exact protected record',()=>assert.deepEqual(stored,currentNoop));
const typo=await post({mjQuantityGuess:'one ounce'});check('unrecognized camelCase stays rejected',()=>assert.equal(typo.status,400));
const {packetSpecificationFor}=await load('src/lib/rcap/grade-a/packet-specification.ts');
const {composeNdFirstOffenseInternalReview}=await load('src/lib/rcap/grade-a/families/nd-first-offense-possession-set.ts');
const spec=packetSpecificationFor('ND:'+route),matter={routeKey:'ND:'+route,jurisdiction:'ND',pathwayId:route,facts:{participant_full_legal_name:'Explicit Synthetic Person',date_of_birth:'1991-04-17'},verificationHash:'a'.repeat(64),verifiedAt:null,generationPurpose:'internal_review'};
const bare=composeNdFirstOffenseInternalReview(spec,matter);
for(const facts of [fixed,{...fixed,mjQuantity:'3 ounces'},Object.fromEntries(ids.map(id=>[id,{unknown:true}]))])check('all source handbacks unchanged by legal facts '+JSON.stringify(facts),()=>{const current=composeNdFirstOffenseInternalReview(spec,{...matter,facts:{...matter.facts,...facts}});assert.deepEqual(current,bare);});
for (const [id,raw] of [['mjQuantity',{value:'0.5-3 ounces',unknown:false}],['mjQuantity',{value:'28.35 grams',unknown:false}],['mjJudgmentDate',{value:'2099-01-01',unknown:false}]]) {
 await save({[id]:raw});check('source-unresolved value stays raw and missing '+id+raw.value,()=>{assert.equal(snap().resultCode,'needs_more_info');assert.deepEqual(snap().packetAnswers[id],raw);assert(model().missingInputIds.includes(id));});
 for (const locale of ['en','es']) {
  const q=model().questions.find(q=>q.id===id),markup=html(React.createElement(PacketInformationBuilder,{itemId:item.id,stateCode:'ND',pathwayId:route,questions:[q],initialAnswers:model().initialAnswers,initiallyMissing:model().missingInputIds,initialRevision:stored.revision,initialResumeSectionId:q.id,editingFromReview:true}),locale);
  check('source-unresolved actual control status '+locale+'/'+id+raw.value,()=>{assert(markup.includes(locale==='es'?'Necesita atención':'Needs attention'));assert(!markup.includes(locale==='es'?'>Completo<':'>Complete<'));});
 }
 await save({[id]:{value:fixed[id],unknown:false}});
}
for(const locale of ['en','es']){
 const tree=await Edit({params,searchParams:Promise.resolve({edit:'mjQuantity'})}),builder=nodes(tree).find(n=>n.type===PacketInformationBuilder);
 check('actual offered edit and return behavior '+locale,()=>{assert(builder);assert.equal(builder.props.returnToMatterAfterCorrection,true);assert(builder.props.questions.some(q=>q.id==='mjQuantity'));});
 const markup=html(tree,locale);check('actual page distinguishes statutory facts '+locale,()=>assert(markup.includes(locale==='es'?'Revise los hechos de su caso de posesión':'Review your possession case facts')));
 const q=model().questions.find(q=>q.id==='mjQuantity');const control=html(React.createElement(PacketInformationBuilder,{itemId:item.id,stateCode:'ND',pathwayId:route,questions:[q],initialAnswers:{mjQuantity:{value:'one ounce',unknown:false}},initiallyMissing:[],initialRevision:stored.revision,initialResumeSectionId:q.id,editingFromReview:true}),locale);
 check('actual existing text control bilingual source prompt '+locale,()=>{assert(control.includes(locale==='es'?'cantidad figura en la acusación':'What quantity was charged'));assert(control.includes('one ounce'));});
 const reason=H.ND_FIRST_OFFENSE_COPY.supported;check('result translation '+locale,()=>assert.equal(resolveRuntimeText(locale,reason[0]),reason[locale==='es'?1:0]));
}
await save({case_outcome:'I am not sure'});check('unknown outcome keeps all source answers for correction',()=>{assert.equal(snap().packetAnswers.mjQuantity.value,'one ounce');assert(P.editablePacketInputIds(model()).has('case_outcome'));assert.equal(snap().paymentAllowed,false);});
await save({case_outcome:'Misdemeanor conviction'});check('outcome repair restores same held source assessment',()=>assert.equal(snap().resultCode,'needs_review'));
const beforeOutcome=structuredClone(stored);
for(const outcome of ['Dismissed, no-billed, nolle prosequi, or not prosecuted','Other conviction or adjudication','I am not sure']) {
 stored=structuredClone(beforeOutcome);await save({mjQuantity:{unknown:true}});const before=structuredClone(snap());
 await save({case_outcome:outcome});
 check('actual outcome uncertainty hides irrelevant conviction facts '+outcome,()=>{assert.equal(snap().resultCode,'needs_review');assert.equal(P.evaluateProtectedPacketFacts(snap()).evaluation.reasons[0].code,'nd.first_possession_outcome');assert(P.editablePacketInputIds(model()).has('case_outcome'));for(const id of ids){assert(!model().builderQuestions.some(q=>q.id===id),id);assert(!model().missingInputIds.includes(id),id);assert(!P.editablePacketInputIds(model()).has(id),id);for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])assert.deepEqual(snap()[map][id],before[map][id]);}assert.deepEqual(shape(snap()),originalShape);});
 const edit=await Edit({params,searchParams:Promise.resolve({edit:'case_outcome'})}),builder=nodes(edit).find(n=>n.type===PacketInformationBuilder);
 for(const locale of ['en','es'])check('actual outcome repair has statutory meaning and return '+locale+outcome,()=>{assert(builder);assert.equal(builder.props.returnToMatterAfterCorrection,true);assert(builder.props.questions.some(q=>q.id==='case_outcome'));assert(html(edit,locale).includes(locale==='es'?'Revise los hechos de su caso de posesión':'Review your possession case facts'));for(const id of ids)assert(!builder.props.questions.some(q=>q.id===id),id);});
 const held=structuredClone(stored);await save({});check('nonconviction history no-op '+outcome,()=>assert.deepEqual(stored,held));
 await save({case_outcome:'Misdemeanor conviction'});
 check('explicit conviction correction restores source facts without inference '+outcome,()=>{assert.equal(snap().resultCode,'needs_more_info');for(const id of ids){assert(P.editablePacketInputIds(model()).has(id),id);for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])assert.deepEqual(snap()[map][id],before[map][id]);}assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId==='case_outcome'&&h.value===outcome));});
}
stored=structuredClone(beforeOutcome);
const beforeConditional=structuredClone(stored);
for(const[id,value,later,reason,result]of conditionalCases){
 stored=structuredClone(beforeConditional);
 await save(later);const prior=structuredClone(snap());
 await save({[id]:id==='mjQuantity'?{value,unknown:false}:value});
 check('actual protected early exit and inactive downstream '+id,()=>{assert.equal(snap().resultCode,result);assert.equal(P.evaluateProtectedPacketFacts(snap()).evaluation.reasons[0].code,'nd.first_possession_'+reason);for(const next of ids.slice(ids.indexOf(id)+1)){assert(!P.editablePacketInputIds(model()).has(next),next);assert(!model().builderQuestions.some(q=>q.id===next),next);assert(!model().missingInputIds.includes(next),next);for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])assert.deepEqual(snap()[map][next],prior[map][next]);}assert.deepEqual(shape(snap()),originalShape);});
 const held=structuredClone(stored);await save({});check('inactive downstream exact no-op '+id,()=>assert.deepEqual(stored,held));
 await save({[id]:id==='mjQuantity'?{value:fixed[id],unknown:false}:fixed[id]});
 check('actual reappearance with original unknown/raw history '+id,()=>{assert.equal(snap().resultCode,'needs_more_info');for(const next of ids.slice(ids.indexOf(id)+1)){assert(P.editablePacketInputIds(model()).has(next),next);assert(model().builderQuestions.some(q=>q.id===next),next);for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])assert.deepEqual(snap()[map][next],prior[map][next]);}assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&(h.value===value||h.value?.value===value)));});
}
stored=structuredClone(beforeConditional);
const stable=structuredClone(stored);
const foreignWitness=JSON.parse(fs.readFileSync(file('data/rcap-ledger/public-witness-fixtures.json'))).fixtures.find(x=>x.pathwayKey.startsWith('ND:')&&x.pathwayKey!=='ND:'+route);
const foreignAuthority=evaluate({jurisdiction:'ND',profileVersion:profile.profileVersion,matterId:item.id,answers:foreignWitness.answers});
const foreignSeed=P.protectedPacketDraftSeedFromAuthoritative({authoritative:foreignAuthority,screeningAnswers:foreignWitness.answers,dependencies:{},capturedAt:'2026-10-14T00:00:00.000Z'});
assert(foreignSeed);stored={status:'unverified',reason:'explicit_foreign_route_transport_control',revision:0,draftHash:foreignSeed.hash,draftSnapshot:foreignSeed.snapshot};
for(const id of ids){const response=await post({[id]:fixed[id]});check('finite source ID does not authorize foreign route '+id,()=>assert.equal(response.status,422));}
stored=structuredClone(stable);for(const[extra,status]of [[{expectedRevision:0},409]]){const response=await post({mjQuantity:'3 ounces'},extra);check('stale handler refusal',()=>{assert.equal(response.status,status);assert.deepEqual(stored,stable);});}
owner='another-owner';const denied=await post({mjQuantity:'3 ounces'});check('wrong owner refusal',()=>{assert.equal(denied.status,404);assert.deepEqual(stored,stable);});owner='synthetic-nd-owner';
console.log(JSON.stringify({status:'PASS_ND_FIRST_OFFENSE_FACT_BRIDGE',checks,noDatabase:true,noRender:true,noOwnerJourneyClaim:true,qualifiedSpanishReview:'pending'}));
