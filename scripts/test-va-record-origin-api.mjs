import assert from 'node:assert/strict';import fs from 'node:fs';import{register,createRequire}from'node:module';import{pathToFileURL}from'node:url';
const root=process.cwd(),require=createRequire(root+'/package.json'),ts=require('typescript'),out=process.env.VA_ORIGIN_API_EVIDENCE;
assert(out&&!fs.existsSync(out),'fresh external output required');
register(pathToFileURL(root+'/scripts/lib/ts-esm-loader.mjs'));
const load=p=>import(pathToFileURL(root+'/'+p)),fixtures=(await load('scripts/test-va-record-origin-fixtures.mjs')).default;
const {decorateBriefcaseItemForPresentationWithDependencies:decorate}=await load('src/lib/expungement-ai/briefcase-presentation-authority.ts');
const {evaluateAuthoritativeScreeningResult:evaluate}=await load('src/lib/expungement-ai/authoritative-screening-result.ts');
const P=await load('src/lib/expungement-ai/packet-information.ts');
const compile=(file,source)=>register('data:text/javascript,'+encodeURIComponent('let d;export function initialize(x){d=x}export async function load(u,c,n){return u===d.url?{format:"module",source:d.source,shortCircuit:true}:n(u,c)}')+'#'+Buffer.from(file).toString('hex'),{data:{url:pathToFileURL(file).href,source:ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}});
let stored,owner='synthetic-va-owner',requestOwner=owner,casConflict=false;const item={id:'synthetic-va-origin',jurisdiction:'VA',artifactRefs:{}},http=[],checks=[];
const present=()=>decorate({consumerAuthUserId:owner,item},{readProtectedArtifact:async()=>({ok:true,value:null}),readProtectedVerification:async()=>({ok:true,value:stored}),readTrustedPendingSource:async()=>({ok:false,reason:'no_source'}),readPaymentAuthority:async()=>({valid:false,reason:'unpaid'}),evaluateAuthoritative:evaluate,readCommercialActions:async()=>({fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false})});
globalThis.__vaOrigin={getRcapBriefcaseAuthState:async()=>({isAuthenticated:true,isVerified:true,userId:requestOwner}),requireConsumerBriefcaseSession:async()=>({userId:requestOwner}),getBriefcaseItem:async(user,id)=>user===owner&&id===item.id?item:null,readProtectedPacketVerification:async()=>({ok:true,value:stored}),persistProtectedPacketVerification:async({transition})=>{if(casConflict)return{ok:false,reason:'protected_verification_transition_refused'};assert.equal(transition.expectedPriorRevision,stored.revision);stored=structuredClone(transition.nextVerification);return{ok:true,value:stored};},decorateBriefcaseItemForPresentation:present,protectedPacketVerificationSeedFromTrustedSource:()=>{throw Error('no synthetic source authority')},readTrustedBriefcasePresentationSource:()=>{throw Error('no synthetic source authority')}};
const substitute=(source,bindings,module)=>{const re=new RegExp('import \\{\\s*'+bindings.join(',\\s*')+'\\s*\\} from "'+module+'";');assert(re.test(source),module);return source.replace(re,bindings.map(b=>'const '+b+'=(...args:unknown[])=>(globalThis as any).__vaOrigin.'+b+'(...args);').join('\n'));};
const apiFile='src/app/api/expungement-ai/briefcase/[itemId]/packet-information/route.ts';let source=fs.readFileSync(root+'/'+apiFile,'utf8');
for(const[b,m]of [[['getRcapBriefcaseAuthState'],'@/lib/rcap/briefcase/auth'],[['getBriefcaseItem'],'@/lib/expungement-ai/briefcase'],[['decorateBriefcaseItemForPresentation','protectedPacketVerificationSeedFromTrustedSource','readTrustedBriefcasePresentationSource'],'@/lib/expungement-ai/briefcase-presentation-authority'],[['persistProtectedPacketVerification','readProtectedPacketVerification'],'@/lib/expungement-ai/verification-cas']])source=substitute(source,b,m);
compile(root+'/'+apiFile,source);const API=await load(apiFile),context={params:Promise.resolve({itemId:item.id})},url='https://va-origin.invalid/api/expungement-ai/briefcase/'+item.id+'/packet-information';
const check=(name,fn)=>{try{fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}};
async function request(method='GET',body){const response=await API[method](new Request(url,{method,...(method==='POST'?{headers:{'content-type':'application/json'},body:JSON.stringify({expectedRevision:stored.revision,answers:{},...body})}:{})}),context),value=await response.json();http.push({method,status:response.status,body,value});return{status:response.status,value};}
const pageFile='src/app/briefcase/[packetId]/packet-information/page.tsx';let pageSource=fs.readFileSync(root+'/'+pageFile,'utf8').replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['decorateBriefcaseItemForPresentation','briefcase-presentation-authority'],['readProtectedPacketVerification','verification-cas']])pageSource=substitute(pageSource,[b],'@/lib/expungement-ai/'+m);
compile(root+'/'+pageFile,pageSource);const Page=(await load(pageFile)).default,nodes=(e,out=[])=>{if(!e||typeof e!=='object')return out;if(Array.isArray(e)){for(const x of e)nodes(x,out);}else if(e.props){out.push(e);nodes(e.props.children,out);}return out;};
const matterFile='src/app/briefcase/[packetId]/page.tsx';let matterSource=fs.readFileSync(root+'/'+matterFile,'utf8').replace('import { BriefcaseShell } from "@/components/expungement-ai/BriefcaseShell";','const BriefcaseShell=({children}:any)=>children;');
for(const[b,m]of [['requireConsumerBriefcaseSession','auth'],['getBriefcaseItem','briefcase'],['readProtectedPacketVerification','verification-cas']])matterSource=substitute(matterSource,[b],'@/lib/expungement-ai/'+m);
matterSource=matterSource.replace(/import \{\s*decorateBriefcaseItemForPresentation,\s*type BriefcasePresentationArtifact,\s*type BriefcasePresentationItem\s*\} from "@\/lib\/expungement-ai\/briefcase-presentation-authority";/,'const decorateBriefcaseItemForPresentation=(...args:any[])=>(globalThis as any).__vaOrigin.decorateBriefcaseItemForPresentation(...args);');
compile(root+'/'+matterFile,matterSource);const Matter=(await load(matterFile)).default;
const V=await load('src/lib/expungement-ai/virginia-record-context.ts');
for(const raw of [{value:'virginia',unknown:true},{value:'virginia',extra:true},'unknown'])check('uncertain or malformed origin cannot activate context '+JSON.stringify(raw),()=>assert.equal(V.virginiaRecordContextApplies('VA','petition-based-sealing',{va_record_origin:raw}),false));
for(const row of fixtures.rows){
 stored=structuredClone(row.record);const initial=structuredClone(stored),first=await request();
 check(row.route+' actual GET offers origin without writes',()=>{assert.equal(first.status,200);assert(first.value.questions.some(q=>q.id==='va_record_origin'));assert.deepEqual(stored,initial);});
 const tree=await Page({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:'va_record_origin'})});
 check(row.route+' actual page forwards origin edit',()=>{const builder=nodes(tree).find(n=>n.props.itemId===item.id&&n.props.questions);assert(builder);assert.deepEqual(builder.props.questions.map(q=>q.id),['va_record_origin']);});
 for(const origin of ['unknown','other_state','federal','virginia']){
  const before=structuredClone(stored),response=await request('POST',{answers:{va_record_origin:origin}});
  check(row.route+' actual POST '+origin,()=>{assert.equal(response.status,200,JSON.stringify(response.value));assert.equal(stored.draftSnapshot.packetAnswers.va_record_origin,origin);assert.equal(response.value.readyToGenerate,false);assert.deepEqual(response.value.commercialActions,{fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false});for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const[id,raw]of Object.entries(before.draftSnapshot[map]))if(id!=='va_record_origin')assert.deepEqual(stored.draftSnapshot[map][id],raw);});
  const saved=structuredClone(stored),noOp=await request('POST');check(row.route+' exact no-op '+origin,()=>{assert.equal(noOp.status,200);assert.deepEqual(stored,saved);});
 }
 const ids=['va_disposition_locality','va_court_level'];
 const beforeContext=P.protectedPacketInformationModelFor(stored);
 const offered=await request();
 check(row.route+' optional source context after explicit VA origin',()=>{
  for(const id of ids){const q=offered.value.questions.find(q=>q.id===id);assert(q,id);assert.equal(q.required,false);assert.equal(q.contextOnly,true);assert(!beforeContext.requiredInputIds.includes(id));assert(!beforeContext.missingInputIds.includes(id));}
 });
 const matterTree=await Matter({params:Promise.resolve({packetId:item.id})});
 check(row.route+' matter offers accurately labelled context link',()=>{assert(nodes(matterTree).some(n=>n.props.href==='/briefcase/'+item.id+'/packet-information'&&nodes(n.props.children).some(c=>c.props.en==='Review optional record context'&&c.props.es==='Revise el contexto opcional del expediente')));});
 for(const id of ids){
  const before=structuredClone(stored),tree=await Page({params:Promise.resolve({packetId:item.id}),searchParams:Promise.resolve({edit:id})});
  check(row.route+' actual owner page permits context '+id,()=>{const builder=nodes(tree).find(n=>n.props.itemId===item.id&&n.props.questions);assert(builder);assert.deepEqual(builder.props.questions.map(q=>q.id),[id]);assert.equal(builder.props.questions[0].required,false);assert.equal(builder.props.returnToMatterAfterCorrection,true);assert.deepEqual(stored,before);});
 }
 for(const answers of [
  {va_disposition_locality:'Richmond city',va_court_level:'general_district'},
  {va_disposition_locality:{unknown:true},va_court_level:'unknown'},
  {va_disposition_locality:'Prefer not to say',va_court_level:'Prefer not to say'},
  {va_disposition_locality:'Fairfax County',va_court_level:'juvenile_domestic_relations'},
  {va_disposition_locality:'Alexandria city',va_court_level:'circuit'}
 ]){
  const previous=structuredClone(stored),saved=await request('POST',{answers});
  check(row.route+' optional context saves '+JSON.stringify(answers),()=>{
   assert.equal(saved.status,200,JSON.stringify(saved.value));for(const id of ids)assert.deepEqual(stored.draftSnapshot.packetAnswers[id],answers[id]);
   for(const map of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const[id,raw]of Object.entries(previous.draftSnapshot[map]))if(!ids.includes(id))assert.deepEqual(stored.draftSnapshot[map][id],raw);
   const model=P.protectedPacketInformationModelFor(stored);assert.deepEqual(model.requiredInputIds,beforeContext.requiredInputIds);assert.deepEqual(model.missingInputIds,beforeContext.missingInputIds);assert.equal(stored.draftSnapshot.resultCode,previous.draftSnapshot.resultCode);assert.equal(stored.draftSnapshot.paymentAllowed,previous.draftSnapshot.paymentAllowed);assert.deepEqual(saved.value.commercialActions,{fulfillmentAvailable:false,checkoutAllowed:false,generationAllowed:false});assert.notEqual(stored.status,'verified');assert.equal(saved.value.readyToGenerate,false);
  });
  const snapshot=structuredClone(stored),noOp=await request('POST'),reload=await request();
  check(row.route+' context no-op and reload '+JSON.stringify(answers),()=>{assert.equal(noOp.status,200);assert.deepEqual(stored,snapshot);assert.equal(reload.status,200);for(const id of ids)assert.deepEqual(reload.value.answers[id],answers[id]);});
 }
 const retained=structuredClone(stored.draftSnapshot.packetAnswers);
 for(const origin of ['unknown','other_state','federal']){
  await request('POST',{answers:{va_record_origin:origin}});const hidden=await request(),unchanged=structuredClone(stored),denied=await request('POST',{answers:{va_disposition_locality:'Unsupported new locality',va_court_level:'circuit'}});
  check(row.route+' context stays inactive for '+origin,()=>{assert(ids.every(id=>!hidden.value.questions.some(q=>q.id===id)));assert.equal(denied.status,422);assert.deepEqual(stored,unchanged);for(const id of ids)assert.deepEqual(stored.draftSnapshot.packetAnswers[id],retained[id]);});
 }
 await request('POST',{answers:{va_record_origin:'virginia'}});
 const restored=await request();check(row.route+' exact owned context resumes',()=>{for(const id of ids)assert.deepEqual(restored.value.answers[id],retained[id]);});
 const unchanged=structuredClone(stored),malformedContext=await request('POST',{answers:{va_court_level:'invented_court'}});
 check(row.route+' unsupported court level refused without loss',()=>{assert.equal(malformedContext.status,422);assert.deepEqual(stored,unchanged);});
 const before=structuredClone(stored);casConflict=true;const stale=await request('POST',{answers:{va_record_origin:'other_state'}});casConflict=false;
 check(row.route+' CAS refusal preserves record',()=>{assert.equal(stale.status,409);assert.deepEqual(stored,before);});
 requestOwner='synthetic-other-owner';const denied=await request('POST',{answers:{va_record_origin:'other_state'}});requestOwner=owner;
 check(row.route+' foreign owner cannot write',()=>{assert.equal(denied.status,404);assert.deepEqual(stored,before);});
 const verify=await request('POST',{verify:true});check(row.route+' no fulfillment authority inferred',()=>{assert.notEqual(verify.value.readyToGenerate,true);assert.notEqual(stored.status,'verified');});
 const beforeWrapper=structuredClone(stored),wrapped=await request('POST',{answers:{va_record_origin:{value:'virginia',unknown:false}}});check(row.route+' existing known-wrapper contract preserves no-op',()=>{assert.equal(wrapped.status,200);assert.deepEqual(stored,beforeWrapper);});
 const malformed=await request('POST',{answers:{va_record_origin:{value:'unsupported-origin',unknown:false}}});check(row.route+' malformed categorical answer refused',()=>assert.equal(malformed.status,422));
 check(row.route+' saved history retained',()=>assert(stored.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId==='va_record_origin'&&h.value==='unknown')));
}
const failed=checks.filter(c=>!c.pass),result={status:failed.length?'FAIL':'PASS',checks:checks.length,failed,details:checks,http,scope:'Actual protected API and server page, synthetic storage/owner/CAS; no DB, running service, delivery or review authority.'};fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,checks:checks.length,http:http.length,failed}));assert.equal(failed.length,0);
