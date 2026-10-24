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

const C=await load('src/lib/expungement-ai/oregon-disposition-contact.ts');
const map=JSON.parse(fs.readFileSync(file(C.OR_CONTACT_SOURCE.mapPath)));
const projected=()=>C.oregonContactInputs(snap());
const D=await load('src/lib/expungement-ai/oregon-disposition-contact-answer.ts');
const {questionAnswerState}=await load('src/lib/expungement-ai/question-answer-state.ts');
if(!process.argv.includes('--conflict-only')){
const textIds=C.OR_CONTACT_IDS.filter(id=>id!=='or_osp_address_choice');
for(const raw of ['unavailable','not available','no disponible','no lo sé','none','confidential','sin dirección postal'])for(const id of textIds){
 const value={value:raw,unknown:false},q=C.oregonContactQuestions({or_osp_address_choice:'different'},true).find(q=>q.id===id);
 check('exact nonfact decoder/status '+id+'/'+raw,()=>{assert.equal(D.oregonContactKnownText(value),null);assert.equal(D.oregonContactAnswerState('OR',route,id,value,questionAnswerState(q,value)),'invalid');});
}
for(const raw of ['42 Not Available Lane','100 Unknown Avenue','None Such Road','confidential@example.test'])check('real literal containing an unresolved word stays exact '+raw,()=>{
 assert.equal(D.oregonContactKnownText({value:raw,unknown:false}),raw);assert.equal(D.oregonContactAnswerState('OR',route,textIds[0],{value:raw,unknown:false},'known_valid'),'known_valid');
});
for(const raw of [{unknown:true},{value:'previous address',unknown:true},{value:'',unknown:false},undefined,[],{value:'x',unknown:false,other:true}])check('generic uncertain/blank/invalid shapes preserved '+JSON.stringify(raw),()=>{
 const q=C.oregonContactQuestions({})[0],generic=questionAnswerState(q,raw);assert.equal(D.oregonContactKnownText(raw),null);assert.equal(D.oregonContactAnswerState('OR',route,q.id,raw,generic),generic);
});
for(const [state,path,id] of [['AK',route,textIds[0]],['OR',H.OR_RETIRED_NONCONVICTION_PATH,textIds[0]],['OR',route,'contact_information'],['OR',route,'or_osp_address_choice']])check('unrelated display states unchanged '+state+'/'+path+'/'+id,()=>assert.equal(D.oregonContactAnswerState(state,path,id,{value:'unavailable',unknown:false},'known_valid'),'known_valid'));
await save({or_ojd_mailing_street:{value:'42 Maple Street',unknown:false},or_ojd_mailing_city_state_zip:{value:'Portland, OR 97205',unknown:false},or_osp_address_choice:'same'});
for(const raw of ['unavailable','no disponible','not available','no lo sé']){
 await save({or_ojd_mailing_street:{value:raw,unknown:false}});
 check('actual ordinary save preserves unresolved raw without source writes '+raw,()=>{assert.deepEqual(snap().packetAnswers.or_ojd_mailing_street,{value:raw,unknown:false});assert(!projected().writes.some(w=>w.inputIds.includes('or_ojd_mailing_street')));assert(!model().requiredInputIds.includes('or_ojd_mailing_street'));assert(!model().missingInputIds.includes('or_ojd_mailing_street'));assert.equal(snap().packetPlan,null);});
 for(const locale of ['en','es']){
  const editor=await Edit({params,searchParams:Promise.resolve({locale,edit:'or_ojd_mailing_street'})}),body=html(editor,locale);
  check('actual Builder does not claim complete unresolved fact '+locale+'/'+raw,()=>{assert(body.includes('data-packet-section-status="needs_attention"'));assert(body.includes(locale==='es'?'Necesita atención':'Needs attention'));assert(!body.includes('data-packet-section-status="complete"'));assert(body.includes(raw));});
 }
}
for(const [value,status]of [[{unknown:true},'needs_attention'],[{value:'',unknown:false},'not_started'],[{value:'42 Not Available Lane',unknown:false},'complete']]){
 await save({or_ojd_mailing_street:value});
 for(const locale of ['en','es']){
  const body=html(await Edit({params,searchParams:Promise.resolve({locale,edit:'or_ojd_mailing_street'})}),locale);
  check('actual literal/blank/unknown status remains exact '+locale+'/'+status,()=>assert(body.includes('data-packet-section-status="'+status+'"')));
 }
}
check('explicit correction retains unresolved raw history without requiring it as a fact',()=>assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId==='or_ojd_mailing_street'&&h.value?.value==='no lo sé')));
stored=structuredClone(original);
if(process.argv.includes('--unresolved-only')){console.log(`PASS ${checks} exact OR unresolved decoder/actual-handler/ENES Builder controls; no DB or render`);process.exit(0);}
}
const {changedPacketAnswers}=await load('src/lib/expungement-ai/packet-save-contract.ts');
for(const id of ['or_ojd_mailing_street','or_ojd_mailing_city_state_zip','or_ojd_email','or_osp_mailing_street','or_osp_mailing_city_state_zip']){
 stored=structuredClone(original);
 Object.assign(snap().packetAnswers,{or_ojd_mailing_street:{value:'Current Street',unknown:false},or_ojd_mailing_city_state_zip:{value:'Portland, OR 97205',unknown:false},or_osp_address_choice:'different',or_osp_mailing_street:{value:'Agency Street',unknown:false},or_osp_mailing_city_state_zip:{value:'Salem, OR 97301',unknown:false}});
 const prior={value:'Earlier saved '+id,unknown:false},chosen={value:'Current saved '+id,unknown:false};
 snap().prefilledAnswers[id]=prior;snap().packetAnswers[id]=chosen;stored.draftHash=P.protectedPacketDraftHash(snap());
 const before=structuredClone(stored),m=model();
 check('conflicting optional value is withheld without destructive read '+id,()=>{assert.deepEqual(stored,before);assert.equal(m.initialAnswers[id],undefined);assert(m.questions.find(q=>q.id===id).savedAnswerNeedsClarification);assert(!m.requiredInputIds.includes(id));assert(!m.missingInputIds.includes(id));assert(projected().conflictingIds.includes(id));assert(!projected().writes.some(w=>w.inputIds.includes(id)));});
 for(const locale of ['en','es']){
  const editor=await Edit({params,searchParams:Promise.resolve({locale,edit:id})}),body=html(editor,locale);
  check('actual conflict edit requests explicit replacement '+locale+'/'+id,()=>{assert(body.includes(locale==='es'?'Las copias guardadas no coinciden':'Saved copies disagree'));assert(body.includes('data-packet-section-status="needs_attention"'));});
 }
 const reuse=m.questions.find(q=>q.id==='or_osp_address_choice');
 check('reuse helper never presents a disputed address as unambiguous '+id,()=>{if(id.startsWith('or_ojd_mailing_')){assert(!reuse.helperText.includes('Court-form address entered:'));assert(!reuse.translations.es.helperText.includes('Dirección ingresada para el formulario judicial:'));}});
 let r=await post({});check('actual no-op retains every conflicting raw copy '+id,()=>{assert.equal(r.status,200);assert.deepEqual(stored,before)});
 const delta=changedPacketAnswers({...m.initialAnswers,[id]:chosen},m.initialAnswers);
 check('explicit same-precedence-value replacement is a real UI delta '+id,()=>assert.deepEqual(delta,{[id]:chosen}));
 await save(delta);
 check('ordinary replacement resolves source value and archives both originals '+id,()=>{assert(!projected().conflictingIds.includes(id));assert(projected().writes.some(w=>w.inputIds.includes(id)&&w.value.includes(chosen.value)));assert.deepEqual(snap().packetAnswers[id],chosen);assert(!Object.hasOwn(snap().prefilledAnswers,id));for(const value of [prior,chosen])assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId===id&&h.value?.value===value.value&&h.value?.unknown===value.unknown));assert.equal(snap().packetPlan,null);});
}
stored=structuredClone(original);Object.assign(snap().packetAnswers,{or_ojd_mailing_street:{value:'Court Street',unknown:false},or_ojd_mailing_city_state_zip:{value:'Portland, OR 97205',unknown:false},or_osp_address_choice:'different',or_osp_mailing_street:{value:'Agency Street',unknown:false},or_osp_mailing_city_state_zip:{value:'Salem, OR 97301',unknown:false}});snap().prefilledAnswers.or_osp_address_choice='same';stored.draftHash=P.protectedPacketDraftHash(snap());
check('disputed agency choice does not activate a precedence-selected different-address branch',()=>{assert.equal(model().initialAnswers.or_osp_address_choice,undefined);assert(!model().builderQuestions.some(q=>q.id==='or_osp_mailing_street'));assert(!P.editablePacketInputIds(model()).has('or_osp_mailing_street'));assert(!projected().writes.some(w=>w.document==='OR-OSP-SET-ASIDE-CCH'));});
const inactiveResponse=await post({or_osp_mailing_street:{value:'Saved inactive replacement',unknown:false}});
check('actual handler preserves an inactive draft without activating agency output',()=>{assert.equal(inactiveResponse.status,200);assert.deepEqual(snap().packetAnswers.or_osp_mailing_street,{value:'Saved inactive replacement',unknown:false});assert(!projected().writes.some(w=>w.document==='OR-OSP-SET-ASIDE-CCH'));assert(!model().builderQuestions.some(q=>q.id==='or_osp_mailing_street'));assert(P.editablePacketInputIds(model(),true).has('or_osp_mailing_street'));});
const choiceDelta=changedPacketAnswers({...model().initialAnswers,or_osp_address_choice:'different'},model().initialAnswers);await save(choiceDelta);
check('explicit agency choice correction restores retained different address without alias',()=>{assert(P.editablePacketInputIds(model()).has('or_osp_mailing_street'));assert.equal(projected().writes.find(w=>w.document==='OR-OSP-SET-ASIDE-CCH').value,'Saved inactive replacement, Salem, OR 97301');assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId==='or_osp_address_choice'&&h.value==='same'));});
for(const [left,right,conflict]of [['Same Street',{value:'Same Street',unknown:false},false],[{unknown:true},{value:'Same Street',unknown:false},true],[{value:'Same Street',unknown:true},{value:'Same Street',unknown:false},true],[{unknown:true},{unknown:true},false],[{value:'Same Street',unknown:false,extra:true},{value:'Same Street',unknown:false},true]])check('exact typed source-copy comparison '+JSON.stringify([left,right]),()=>assert.equal(C.oregonContactConflictingIds([{or_ojd_mailing_street:left},{or_ojd_mailing_street:right}]).includes('or_ojd_mailing_street'),conflict));
for(const raw of [{unknown:true},{value:'Current Street',unknown:true},{value:'Current Street',unknown:false,extra:true}]){
 stored=structuredClone(original);snap().screeningAnswers.or_ojd_mailing_street=raw;snap().packetAnswers.or_ojd_mailing_street={value:'Current Street',unknown:false};stored.draftHash=P.protectedPacketDraftHash(snap());
 const old=structuredClone(stored),m=model();
 check('typed disagreement is withheld by actual model '+JSON.stringify(raw),()=>{assert.equal(m.initialAnswers.or_ojd_mailing_street,undefined);assert(m.questions.find(q=>q.id==='or_ojd_mailing_street').savedAnswerNeedsClarification);assert(!projected().writes.some(w=>w.factId==='participant.street_address'));assert.deepEqual(stored,old);});
 await save(changedPacketAnswers({...m.initialAnswers,or_ojd_mailing_street:{value:'Current Street',unknown:false}},m.initialAnswers));
 check('explicit typed-disagreement repair retains exact raw history '+JSON.stringify(raw),()=>{assert.equal(projected().writes.find(w=>w.factId==='participant.street_address').value,'Current Street');const entry=snap().dependencies.semanticAnswerHistory.find(h=>h.factId==='or_ojd_mailing_street'&&h.source==='screeningAnswers');assert.deepEqual(entry.value,raw);});
}
stored=structuredClone(original);
if(process.argv.includes('--conflict-only')){console.log(`PASS ${checks} OR protected conflict/source/actual-handler/ENES controls; no DB or render`);process.exit(0);}
check('exact retained map bytes and current source guards',()=>{
 assert.equal(createHash('sha256').update(fs.readFileSync(file(C.OR_CONTACT_SOURCE.mapPath))).digest('hex'),C.OR_CONTACT_SOURCE.mapSha256);
 assert(C.oregonContactContract(getProfileByJurisdiction('OR'),route));
 assert(!C.oregonContactContract(getProfileByJurisdiction('OR'),route,{...map,familyId:'changed'}));
 assert(!C.oregonContactContract({...getProfileByJurisdiction('OR'),profileVersion:'changed'},route));
 assert(!C.oregonContactContract(getProfileByJurisdiction('OR'),H.OR_RETIRED_NONCONVICTION_PATH));
});
check('source contact anchors and separate address composition match the retained map',()=>{
 for(const track of ['or_arrest_no_charges','or_dismissed_charge'])for(const [field,factId]of [['p5.r303.2.x72.rule','participant.street_address'],['p5.r303.2.x72.rule#citystatezip','participant.city_state_zip'],['p5.r340.8.x72.rule','participant.email']])assert(map.maps.some(m=>m.canonicalWrites.some(w=>w.document==='OR-OJD-ADULT-SET-ASIDE-PACKET:'+track&&w.field===field&&w.factId===factId)));
 const osp=map.maps.flatMap(m=>m.canonicalWrites).find(w=>w.document==='OR-OSP-SET-ASIDE-CCH'&&w.field==='Street, City, State, Zip code');
 assert.deepEqual(osp.derivedFromFacts,['participant.street_address','participant.city_state_zip']);
});
check('existing generic contact is not inferred into source destinations',()=>{assert.deepEqual(projected().writes,[]);assert.deepEqual(stored,original);});
for(const locale of ['en','es']){
 const editor=await Edit({params,searchParams:Promise.resolve({locale,edit:C.OR_CONTACT_IDS[0]})});
 const builder=nodes(editor).find(n=>n.type===PacketInformationBuilder),body=html(editor,locale);
 check('actual ENES optional held edit '+locale,()=>{assert(builder);assert.equal(builder.props.returnToMatterAfterCorrection,true);assert(body.includes(locale==='es'?'dirección postal':'mailing street address'));assert(body.includes(locale==='es'?'Guardar y volver al caso':'Save and return to matter'));});
}
check('optional collection has no new filing gate or mandatory phone',()=>{
 for(const id of C.OR_CONTACT_IDS.slice(0,4)){assert(P.editablePacketInputIds(model()).has(id));assert(model().questions.some(q=>q.id===id&&!q.required));assert(!model().requiredInputIds.includes(id));assert(!model().missingInputIds.includes(id));}
 assert(!P.editablePacketInputIds(model()).has(C.OR_CONTACT_IDS[4]));assert(!model().questions.some(q=>q.id.startsWith('or_')&&q.id.includes('phone')));
});
let response=await post({});check('unchanged read/no-op retains all raw protected bytes',()=>{assert.equal(response.status,200);assert.deepEqual(stored,original)});
await save({or_ojd_mailing_street:{value:'42 Maple Street',unknown:false},or_ojd_mailing_city_state_zip:{value:'Portland, OR 97205',unknown:false},or_ojd_email:{value:'record@example.test',unknown:false}});
check('actual handler saves exact OJD facts without automatic OSP composition',()=>{const p=projected();assert.equal(p.writes.length,3);assert(p.writes.every(w=>w.document==='OR-OJD-ADULT-SET-ASIDE-PACKET'));assert.equal(p.writes[0].value,'42 Maple Street');assert.equal(p.generationAllowed,false);assert.equal(p.admissionGranted,false);assert.equal(snap().packetPlan,null);});
check('address-reuse question displays the exact entered values in EN and ES',()=>{
 const q=C.oregonContactQuestions(snap().packetAnswers).find(q=>q.id==='or_osp_address_choice');
 assert(q.helperText.includes('42 Maple Street, Portland, OR 97205'));assert(q.translations.es.helperText.includes('42 Maple Street, Portland, OR 97205'));
 const absent=C.oregonContactQuestions({...snap().packetAnswers,or_ojd_mailing_street:{unknown:true}}).find(q=>q.id==='or_osp_address_choice');assert(!absent.helperText.includes('42 Maple Street'));
});
await save({or_osp_address_choice:'same'});
check('explicit same-address selection alone enables exact two-part OSP composition',()=>{const w=projected().writes.find(w=>w.document==='OR-OSP-SET-ASIDE-CCH');assert.equal(w.value,'42 Maple Street, Portland, OR 97205');assert.deepEqual(w.inputIds,C.OR_CONTACT_IDS.slice(0,2));});
await save({or_osp_address_choice:'different'});
check('different selection requires actual separate facts for any OSP output',()=>{assert(!projected().writes.some(w=>w.document==='OR-OSP-SET-ASIDE-CCH'));assert(P.editablePacketInputIds(model()).has('or_osp_mailing_street'));});
await save({or_osp_mailing_street:{value:'90 Agency Reply Lane',unknown:false},or_osp_mailing_city_state_zip:{value:'Salem, OR 97301',unknown:false}});
check('distinct OSP address never changes OJD address or service destination',()=>{const p=projected();assert.equal(p.writes.find(w=>w.document==='OR-OSP-SET-ASIDE-CCH').value,'90 Agency Reply Lane, Salem, OR 97301');assert.equal(p.writes[0].value,'42 Maple Street');assert(!p.writes.some(w=>/phone|prosecut|signature|mailing_date/.test(w.field)));});
for(const choice of ['not_preparing','unknown','same']){
 await save({or_osp_address_choice:choice});
 check('inactive OSP history preserved '+choice,()=>{assert.deepEqual(snap().packetAnswers.or_osp_mailing_street,{value:'90 Agency Reply Lane',unknown:false});assert(!P.editablePacketInputIds(model()).has('or_osp_mailing_street'));if(choice!=='same')assert(!projected().writes.some(w=>w.document==='OR-OSP-SET-ASIDE-CCH'));});
}
const inactive=structuredClone(stored);
response=await post({or_osp_mailing_street:{value:'unoffered replacement',unknown:false}});
check('inactive different address cannot be edited through an unoffered current control',()=>{assert.equal(response.status,422);assert.deepEqual(stored,inactive)});
await save({or_osp_address_choice:'different'});
check('reentry restores same source-owned different address',()=>assert.equal(projected().writes.find(w=>w.document==='OR-OSP-SET-ASIDE-CCH').value,'90 Agency Reply Lane, Salem, OR 97301'));
await save({or_osp_mailing_street:{unknown:true}});
check('explicit unknown withholds OSP composition, retaining known predecessor history',()=>{assert(!projected().writes.some(w=>w.document==='OR-OSP-SET-ASIDE-CCH'));assert(snap().dependencies.semanticAnswerHistory.some(h=>h.factId==='or_osp_mailing_street'&&h.value.value==='90 Agency Reply Lane'));});
await save({or_osp_mailing_street:{value:'90 Agency Reply Lane',unknown:false}});
for(const [key,value] of [['profileVersion','bad'],['profileSourceFingerprint','bad'],['profileAuthorityFingerprint','bad'],['selectedTrackId','or_dismissed_charge'],['pathwayId',H.OR_RETIRED_NONCONVICTION_PATH],['jurisdiction','AK']])check('projection refuses wrong '+key,()=>assert.equal(C.oregonContactInputs({...snap(),[key]:value}),null));
for(const id of C.OR_CONTACT_IDS.slice(0,3)){
 const changed=structuredClone(snap());changed.prefilledAnswers[id]={value:'conflicting source value',unknown:false};
 check('protected-map conflict withheld '+id,()=>assert(!C.oregonContactInputs(changed).writes.some(w=>w.inputIds.includes(id))));
}
for(const raw of [{unknown:true},{value:'retained',unknown:true},[],{value:'x',unknown:false,extra:true},'unknown','none','confidential']){
 const changed=structuredClone(snap());changed.packetAnswers.or_ojd_mailing_street=raw;changed.packetAnswers.or_osp_address_choice='same';
 check('unknown/malformed/nonfact cannot print or compose '+JSON.stringify(raw),()=>{const p=C.oregonContactInputs(changed);assert(!p.writes.some(w=>w.inputIds.includes('or_ojd_mailing_street')));});
}
for(const config of Object.values(H.OR_DISPOSITION_CONFIGURATIONS)){
 const changed=structuredClone(snap());changed.pathwayId=config.pathwayId;changed.selectedTrackId=config.trackId;
 changed.screeningAnswers.case_outcome=config.trackId==='or_acquittal'?'Acquitted or found not guilty':config.trackId==='or_arrest_no_charges'?'Arrest or citation with no charge filed':'Dismissed, no-billed, nolle prosequi, or not prosecuted';
 if(config.trackId==='or_dismissed_charge')changed.packetAnswers.or_disposition_record='ordinary_dismissal';
 check('distinct configuration retained '+config.configurationId,()=>assert.equal(C.oregonContactInputs(changed).configuration.configurationId,config.configurationId));
}
const beforeIdentityHold=structuredClone(snap().packetAnswers);
await save({case_outcome:'I am not sure'});
check('uncertain disposition hides new contact preparation without deleting saved source facts',()=>{assert.equal(snap().pathwayId,null);assert.equal(projected(),null);for(const id of C.OR_CONTACT_IDS)assert.deepEqual(snap().packetAnswers[id],beforeIdentityHold[id]);assert(!P.editablePacketInputIds(model()).has(C.OR_CONTACT_IDS[0]));});
await save({case_outcome:'Acquitted or found not guilty'});
check('repaired actual disposition restores the same optional source-owned contact answers',()=>{for(const id of C.OR_CONTACT_IDS)assert.deepEqual(snap().packetAnswers[id],beforeIdentityHold[id]);assert.equal(projected().configuration.configurationId,'or-acquittal-137-225-1-d');assert(P.editablePacketInputIds(model()).has(C.OR_CONTACT_IDS[0]));});
check('all original raw context and closed authority preserved',()=>{for(const id of ['contact_information','residency_or_location'])assert.equal(snap().screeningAnswers[id],sourceAnswers[id]);assert.equal(snap().paymentAllowed,false);assert.equal(snap().packetPlan,null);});
const final=structuredClone(stored);response=await post({}, {verify:true});check('actual handler still refuses verification without plan',()=>{assert.equal(response.status,422);assert.deepEqual(stored,final)});
response=await post({or_ojd_email:{value:'changed@example.test',unknown:false}},{expectedRevision:stored.revision-1});check('stale contact save refused unchanged',()=>{assert.equal(response.status,409);assert.deepEqual(stored,final)});
owner='different-owner';response=await post({or_ojd_email:{value:'changed@example.test',unknown:false}});check('wrong owner refused unchanged',()=>{assert.equal(response.status,404);assert.deepEqual(stored,final)});
console.log(`PASS ${checks} Oregon source-owned contact mapping/actual-handler/ENES controls; no DB or render`);
