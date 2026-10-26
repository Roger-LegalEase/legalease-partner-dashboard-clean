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
const P=await load('src/lib/expungement-ai/packet-information.ts');
const {PacketInformationBuilder}=await load('src/components/expungement-ai/PacketInformationBuilder.tsx');
const T=await load('src/lib/expungement-ai/ny-16059-transaction-associations.ts');
const C=await load('src/lib/expungement-ai/ny-16059-case-records.ts');
const {verificationSummary}=await load('src/components/expungement-ai/verification-summary.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const captured=process.env.NY_REVIEW_CAPTURE;
const bytes=captured?fs.readFileSync(captured):null;
if(captured)assert.equal(createHash('sha256').update(bytes).digest('hex'),process.env.NY_REVIEW_CAPTURE_SHA256);
const original=captured?JSON.parse(bytes):JSON.parse(fs.readFileSync(file('scripts/fixtures/ny-16059-pre-case-records.json'))).rows[0].verifiedRecord;
let stored=structuredClone(original),owner='synthetic-ny-owner';
const item={id:'synthetic-ny-review-correction',jurisdiction:'NY',artifactRefs:{}};
if(!captured){
 const Class=await load('src/lib/expungement-ai/ny-16059-case-classification.ts');
 const Q=await load('src/lib/expungement-ai/ny-16059-case-questions.ts');
 const caseFor=(id,number,county)=>{const c={...C.emptyNyCourtCaseRecord(id),caseNumbers:number,courtName:county+' City Court',courtCounty:county,certificateStatus:'request_needed',convictions:[{...C.emptyNyConvictionRecord(id+'-conviction'),charge:'Petit larceny',section:'PL 155.25',grade:'Misdemeanor',convictionDate:'2009-12-01',sentences:[{...C.emptyNySentenceEvent(id+'-sentence'),sentenceDate:'2010-01-01',sentenceTerms:'Fine; no imprisonment',postSentenceCustody:'no'}]}]};for(const v of c.convictions){v.classification=Class.withNyClassificationAnswer(v,'recordClass','misdemeanor');v.classification=Class.withNyClassificationAnswer(v,'excluded',['none']);}return c;};
 const first=caseFor('first',original.snapshot.packetAnswers.ny_16059_first_case_numbers,'Albany');first.priorCaseReference='first';
 const second=caseFor('second','00002-A','Kings');
 stored=P.packetInformationPatch({existingItem:item,protectedVerification:stored,answers:{ny_16059_requested_total:2,ny_16059_requested_felonies:0,ny_16059_history_total:2,ny_16059_additional_cases:'Yes',ny_16059_additional_case_numbers:second.caseNumbers,[C.NY_CASE_RECORDS_ID]:C.encodeNyCourtCaseRecords([first,second]),[Q.NY_FILING_CASE_ID]:'case:first'}}).protectedTransition.nextVerification;
}

const present=()=>decorate({consumerAuthUserId:'synthetic-ny-owner',item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:true,value:{jurisdiction:'NY',profileVersion:(original.draftSnapshot??original.snapshot).profileVersion,matterId:item.id,answers:(original.draftSnapshot??original.snapshot).screeningAnswers,product:'expungement_ai_dtc',sourceSessionId:'synthetic-transport-only',claimedAt:'2026-10-14T00:00:00.000Z',partnerBenefitActive:false,partnerSlug:null}}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__nyReviewTransport={requireConsumerBriefcaseSession:async()=>({userId:owner}),getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:owner}),getBriefcaseItem:async(user,id)=>user==='synthetic-ny-owner'&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),decorateBriefcaseItemForPresentation:present,persistProtectedPacketVerification:async({transition})=>{assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored}},protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no substitute seed')},readTrustedBriefcasePresentationSource:()=>{throw Error('no substitute source')}};
const substitute=(source,bindings,module)=>{const regex=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(regex.test(source),module);return source.replace(regex,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__nyReviewTransport.'+b+'(...args);').join('\n'));};
const page=async(path,correction=false)=>{const name=file(path);let source=fs.readFileSync(name,'utf8');source=source.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'import { decorateBriefcaseItemForPresentation } from "@/lib/expungement-ai/briefcase-presentation-authority";');source=source.replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],...(correction?[['readProtectedPacketVerification','verification-cas']]:[])])source=substitute(source,[b],'@/lib/expungement-ai/'+m);compile(name,source);return(await import(pathToFileURL(name).href)).default;};
const Matter=await page('src/app/briefcase/[packetId]/page.tsx');
const Review=await page('src/app/briefcase/[packetId]/review/page.tsx'),Edit=await page('src/app/briefcase/[packetId]/packet-information/page.tsx',true);
const apiFile=file('src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts');let source=fs.readFileSync(apiFile,'utf8');for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);compile(apiFile,source);const API=await import(pathToFileURL(apiFile).href);
const params=Promise.resolve({packetId:item.id}),context={params:Promise.resolve({itemId:item.id})},url='http://local.test/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const post=(answers,extra={},query='')=>API.POST(new Request(url+query,{method:'POST',body:JSON.stringify({expectedRevision:stored.revision,answers,...extra})}),context);
const save=async answers=>{const response=await post(answers);assert.equal(response.status,200,await response.clone().text());const body=await response.json();assert.equal(body.readyToGenerate,false);assert(Object.values(body.commercialActions).every(x=>x===false));return body;};
const html=(tree,locale)=>renderToStaticMarkup(React.createElement(AppRouterContext.Provider,{value:{push(){},replace(){},refresh(){}}},React.createElement(LocalizationContext.Provider,{value:{locale,setLocale(){},t:(key,fallback,vars)=>t(locale,key,fallback,vars),text:(text,opts)=>resolveRuntimeText(locale,text,opts)}},tree)));
const nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);return out;}if(e.props){out.push(e);nodes(e.props.children,out);}return out;};
let checks=0;const check=fn=>{fn();checks++;};
const model=P.protectedPacketInformationModelFor(stored);assert(model);
const summary=verificationSummary({...model,editableInputIds:[...P.reviewEditablePacketInputIds(model)]});assert(summary);
const grouping=summary.screeningAnswers.find(x=>x.id==='ny_16059_grouping');assert(grouping);
const beforeProof={classification:captured?'ACTUAL_V4_OWNER_CAPTURE_READ_ONLY_REPLAY':'PORTABLE_RETAINED_FIXTURE',captureSha256:bytes?createHash('sha256').update(bytes).digest('hex'):null,modelAllows:P.reviewEditablePacketInputIds(model).has('ny_16059_grouping'),source:grouping.source,editId:grouping.editId,locales:[]};
for(const locale of ['en','es']){const rendered=html(await Review({params}),locale);beforeProof.locales.push({locale,reviewAvailable:rendered.includes('data-accuracy-review="true"'),groupingEdit:rendered.includes('?edit=ny_16059_grouping')});}
if(process.argv.includes('--diagnose-only')){if(captured)assert.deepEqual(stored,original);console.log(JSON.stringify(beforeProof));process.exit(0);}
check(()=>assert.equal(grouping.editId,'ny_16059_grouping'));
for(const locale of ['en','es']){
 const rendered=html(await Review({params}),locale);check(()=>{assert(rendered.includes('?edit=ny_16059_grouping'));assert(rendered.includes(locale==='es'?'>Editar<':'>Edit<'));});
 const tree=await Edit({params,searchParams:Promise.resolve({edit:'ny_16059_grouping'})}),builder=nodes(tree).find(n=>n.type===PacketInformationBuilder);
 check(()=>{assert(builder);assert.deepEqual(builder.props.questions.map(q=>q.id),['ny_16059_grouping']);assert.equal(builder.props.editingFromReview,true);assert(html(tree,locale).includes('value="connected"'));});
}
// Exactly one existing screening answer gains a link; source ownership and all
// unrelated default restrictions remain unchanged, including invalid manifests.
for(const stateCode of ['CA','KS','NY'])for(const pathwayId of [model.pathwayId,'wrong-route']){
 const changed=structuredClone(model);changed.stateCode=stateCode;changed.pathwayId=pathwayId;
 for(const f of changed.verificationContext){if(f.key==='jurisdiction')f.value=stateCode;if(f.key==='pathwayId')f.value=pathwayId;}
 const view=verificationSummary({...changed,editableInputIds:[...P.reviewEditablePacketInputIds(model)]});assert(view);
 check(()=>assert.equal(view.screeningAnswers.find(x=>x.id==='ny_16059_grouping').editId,stateCode==='NY'&&pathwayId===model.pathwayId?'ny_16059_grouping':null));
}
check(()=>assert.equal(verificationSummary({...model,editableInputIds:[]}).screeningAnswers.find(x=>x.id==='ny_16059_grouping').editId,null));
check(()=>{const s=verificationSummary({...model,editableInputIds:Object.keys(model.screeningAnswers)});for(const row of s.screeningAnswers)if(row.id!=='ny_16059_grouping')assert.equal(row.editId,null);});
check(()=>{const bad=structuredClone(model);bad.verificationManifest.factKeys.pop();assert.equal(verificationSummary({...bad,editableInputIds:['ny_16059_grouping']}),null);});
// Follow the remaining offered-control route through the actual page and handler.
await save({ny_16059_grouping:'connected'});
const cases=C.parseNyCourtCaseRecords(stored.draftSnapshot.packetAnswers[C.NY_CASE_RECORDS_ID]);assert(cases?.length);
const a={...T.emptyNyTransactionAssociations(),groups:[{...T.emptyNyTransactionGroup('actual-record-supported-group'),members:cases.flatMap(c=>c.convictions.map(v=>({...T.nyTransactionMemberFor(c,v),conductStart:'2008-01-01',conductEnd:'2008-01-01',conductDescription:'Acts during the same described incident.',chargingRecordReference:'Charging narrative, incident description.',dispositionRecordReference:'Final judgment for the listed count.'}))),timeCircumstance:'one_incident',purposeRelation:'unknown',relationshipDescription:'The records describe these acts occurring together in the same incident.',sharedProceedingOnly:'no',victims:'multiple',victimRelationship:'The same incident involved the property of the identified owners.',recordSupport:'record_describes_acts',disputed:'no'}]};
const stages=[['complete',a],['unknown',(()=>{const x=structuredClone(a);x.groups[0].recordSupport='unknown';return x;})()],['unavailable_en',(()=>{const x=structuredClone(a);x.groups[0].members[0].chargingRecordReference='records unavailable';return x;})()],['unavailable_es',(()=>{const x=structuredClone(a);x.groups[0].members[0].chargingRecordReference='no disponible';return x;})()],['missing_member',(()=>{const x=structuredClone(a);x.groups[0].members.pop();return x;})()],['restored',a]];
for(const [stage,value]of stages){await save({[T.NY_TRANSACTION_ASSOCIATIONS_ID]:T.encodeNyTransactionAssociations(value)});const m=P.protectedPacketInformationModelFor(stored);assert(m);for(const locale of ['en','es']){
 const tree=await Edit({params,searchParams:Promise.resolve({edit:T.NY_TRANSACTION_ASSOCIATIONS_ID})}),builder=nodes(tree).find(n=>n.type===PacketInformationBuilder);
 check(()=>{assert(builder,stage+'/'+locale);assert(builder.props.questions.some(q=>q.id===T.NY_TRANSACTION_ASSOCIATIONS_ID));const output=html(tree,locale);assert(output.includes('data-ny-transaction-associations'),stage+'/'+locale);assert(!output.includes('data-review-branch="unavailable"'));const leave=locale==='es'?'Guardar y salir':'Save and leave';assert(new RegExp('<button(?![^>]*\\sdisabled(?:[\\s=>]))[^>]*>'+leave+'</button>').test(output));assert(output.includes('data-packet-question="'+T.NY_TRANSACTION_ASSOCIATIONS_ID+'"'));if(value.groups[0].members.length>1){assert(output.includes('-recordSupport'));assert(output.includes('-0-chargingRecordReference'));}else assert(!output.includes('-recordSupport'));});
 const overview=html(await Edit({params,searchParams:Promise.resolve({})}),locale),review=html(await Review({params}),locale);
 const matter=html(await Matter({params}),locale);
 check(()=>{assert(matter.includes('data-briefcase-matter-id="'+item.id+'"'));assert(matter.includes('/briefcase/'+item.id+'/packet-information')||matter.includes('/briefcase/'+item.id+'/review'));});
 check(()=>assert(overview.includes('edit='+T.NY_TRANSACTION_ASSOCIATIONS_ID)||review.includes('edit='+T.NY_TRANSACTION_ASSOCIATIONS_ID)||m.builderQuestions.some(q=>q.id===T.NY_TRANSACTION_ASSOCIATIONS_ID),stage+' offered surface'));
 }
 check(()=>assert.equal(T.ny16059TransactionAssociationPreparation(stored).coveredTransactionCount,['complete','restored'].includes(stage)?1:null));
 check(()=>{assert.deepEqual(stored.draftSnapshot.packetAnswers[T.NY_TRANSACTION_ASSOCIATIONS_ID],T.encodeNyTransactionAssociations(value));if(stage!=='complete')assert(stored.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId===T.NY_TRANSACTION_ASSOCIATIONS_ID));});
 if(stage==='unavailable_en'){const old=structuredClone(stored.draftSnapshot.packetAnswers),r=await post({},{verify:true});check(()=>assert.equal(r.status,200));const body=await r.json();check(()=>{assert.equal(body.readyToGenerate,false);assert.notEqual(stored.status,'verified');assert.deepEqual(stored.draftSnapshot.packetAnswers,old);});}
}
const final=structuredClone(stored);
for(const query of ['?preparation=ga-pardon','?preparation=mt-deferred','?preparation=ca-prop64-juvenile']){const r=await post({ny_16059_grouping:'separate'},{},query);check(()=>{assert.notEqual(r.status,200);assert.deepEqual(stored,final);});const tree=await Edit({params,searchParams:Promise.resolve({preparation:new URL('http://local.test'+query).searchParams.get('preparation'),edit:'ny_16059_grouping'})});check(()=>assert(!nodes(tree).some(n=>n.type===PacketInformationBuilder)));}
let response=await post({ny_16059_grouping:'separate'},{expectedRevision:stored.revision-1});check(()=>{assert.equal(response.status,409);assert.deepEqual(stored,final);});
owner='other-owner';response=await post({ny_16059_grouping:'separate'});check(()=>{assert.equal(response.status,404);assert.deepEqual(stored,final);});const otherReview=html(await Review({params}),'en');check(()=>assert(!otherReview.includes('?edit=ny_16059_grouping')));
console.log(JSON.stringify({status:'PASS_NY_GROUPING_REVIEW_CORRECTION',checks,beforeProof,remainingSurfaceStages:stages.map(([s])=>s),scope:'actual review/edit server components and ordinary handler with transport-only seams',databaseRuns:0,browserRuns:0,qualifiedSpanishReview:'pending'}));
