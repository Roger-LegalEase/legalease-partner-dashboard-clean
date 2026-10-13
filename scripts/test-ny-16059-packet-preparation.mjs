import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const {contactRepresentationHash:hash}=await import('../src/lib/expungement-ai/contact-representation.ts');
const {ny16059ProtectedDocumentPreparation:prepare}=await import('../src/lib/expungement-ai/ny-16059-document-preparation.ts');
const {NY_PACKET_QUESTIONS:questions,NY_PACKET_FACT_IDS:ids,NY_PACKET_CONDITIONS:conditions,nyPacketTextAnswerState}=await import('../src/lib/expungement-ai/ny-16059-packet-facts.ts');
const {NY_CURRENT_COMPONENTS:components}=await import('../src/lib/expungement-ai/ny-16059-current-components.ts');
const {getProfileByJurisdiction}=await import('../src/lib/rcap-engine/profile-registry.ts');
const {projectPublicProfile}=await import('../src/lib/rcap-engine/public-profile-projection.ts');
const {parseJurisdictionProfile}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {nyCompletionDeclaration,nyCompletionApplicability}=await import('./lib/ny-16059-completion-conditions.mjs');
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/ny-16059-precollection.json',import.meta.url)));
const checks=[];const check=(id,pass)=>checks.push({id,pass:!!pass});const same=(a,b)=>{try{assert.deepEqual(a,b);return true;}catch{return false;}};
const maps=['screeningAnswers','prefilledAnswers','packetAnswers'];
const facts={ny_16059_first_case_numbers:'0000123 / SCI-004',ny_16059_additional_cases:'No',ny_16059_case_alias:'No',ny_16059_nysid_known:'No',ny_16059_future_application:'No'};
const details={ny_16059_additional_case_numbers:'Case B: 0000456; Case C: 0000789',ny_16059_case_alias_names:'Synthetic Alex Example',ny_16059_nysid_number:'00123456X',ny_16059_future_case_numbers:'0000900',ny_16059_future_court:'Synthetic Albany County Court'};
const item={id:'synthetic-ny-preparation',jurisdiction:'NY',artifactRefs:{}};
const patch=(record,answers)=>P.packetInformationPatch({existingItem:item,protectedVerification:record,answers})?.protectedTransition.nextVerification;
check('all14pages exactly once',same(components.flatMap(c=>c.pages),Array.from({length:14},(_,i)=>i+1)));
check('nine distinct logical components',components.length===9&&new Set(components.map(c=>c.id)).size===9);
const pub=projectPublicProfile(getProfileByJurisdiction('NY'));
check('packet facts not screening questions',ids.every(id=>!pub.questions.some(q=>q.id===id)));
check('strict frontend accepts packet question contract',parseJurisdictionProfile({...pub,questions:[...pub.questions,...questions]}).ok);
for(const q of questions){check(q.id+'/ENES',q.prompt&&q.helperText&&q.translations?.es?.prompt&&q.translations?.es?.helperText);if(q.answerContract)for(const [raw,expected]of [[0,'invalid'],[['0001'],'invalid'],[{value:'0001',unknown:false},'known_valid'],[{value:'0001',unknown:true},'uncertain'],[{value:'0001',unknown:'false'},'invalid'],[{value:'0001',unowned:true},'invalid'],['0001\nother','invalid'],['0001','known_valid'],['unknown','uncertain']])check(q.id+'/shape/'+JSON.stringify(raw),nyPacketTextAnswerState(q.id,raw)===expected);}
for(const row of fixture.rows)for(const kind of ['initialRecord','completeRecord','verifiedRecord']){
 const old=structuredClone(row[kind]),before=structuredClone(old),prefix=row.variant+'/'+kind,model=P.protectedPacketInformationModelFor(old),p=prepare(old);
 check(prefix+'/readable',!!model&&!!p);if(!model||!p)continue;
 check(prefix+'/no inherited readiness',!model.reviewSafety.safe&&model.stage!=='ready_to_generate');
 check(prefix+'/controls reachable',ids.every(id=>model.questions.some(q=>q.id===id)&&P.editablePacketInputIds(model,true).has(id)));
 check(prefix+'/read preserves source',same(old,before));
 check(prefix+'/broadcounts no secondcase',p.conditions.second_covered_case.value===null);
 check(prefix+'/broadaliases no case alias',p.conditions.covered_case_alias_exists.value===null);
 check(prefix+'/priorgrant not future',p.conditions.future_sealing_application_intended.value===null);
 check(prefix+'/source still unresolved',!p.sourceVerified&&!p.conditionalBlankAcceptance&&!p.generationAllowed&&p.source.binarySha256===null&&!p.source.historicalGeometryReusable);
 const noop=P.packetInformationPatch({existingItem:item,protectedVerification:old,answers:{}});check(prefix+'/noop preserves original',same(noop?.protectedTransition.nextVerification,old));
 check(prefix+'/cannot inherit verification',!P.packetInformationPatch({existingItem:item,protectedVerification:old,answers:{},verify:true})?.readyToGenerate);
 let current=patch(old,facts);check(prefix+'/explicit correction',current&&current.revision===old.revision+1&&current.status!=='verified');if(!current)continue;
 const snap=current.draftSnapshot;for(const source of maps)for(const[id,raw]of Object.entries((old.status==='verified'?old.snapshot:old.draftSnapshot)[source]))if(!(id in facts))check(prefix+'/preserved/'+source+'/'+id,same(snap[source][id],raw));
 let prepared=prepare(current);check(prefix+'/No actual secondcase',prepared.conditions.second_covered_case.value===false);check(prefix+'/no extra details demanded',Object.keys(details).every(id=>!P.protectedPacketInformationModelFor(current).missingInputIds.includes(id)&&!P.reviewEditablePacketInputIds(P.protectedPacketInformationModelFor(current)).has(id)));
 check(prefix+'/exact leading zero preserved',prepared.availableFacts.ny_16059_first_case_numbers.value==='0000123 / SCI-004');
 for(const id of Object.keys(details))check(prefix+'/inactive value not projected/'+id,!Object.hasOwn(prepared.availableFacts,id));
 const positive={...Object.fromEntries(Object.values(conditions).map(id=>[id,'Yes'])),...details};const positiveRecord=patch(current,positive);check(prefix+'/positive save',!!positiveRecord);if(!positiveRecord)continue;current=positiveRecord;prepared=prepare(current);
 for(const id of Object.keys(details)){check(prefix+'/owned positive/'+id,prepared.availableFacts[id]?.value===details[id]);const e=prepared.availableFacts[id];check(prefix+'/provenance/'+id,e?.source==='packetAnswers'&&e?.revision===current.revision&&e?.recordHash===current.draftHash&&same(e?.raw,current.draftSnapshot.packetAnswers[id]));}
 check(prefix+'/no grant from positive facts',!prepared.generationAllowed&&!prepared.sourceVerified);
 const reverted=patch(current,Object.fromEntries(Object.values(conditions).map(id=>[id,'No'])));check(prefix+'/reversal save',!!reverted);if(!reverted)continue;
 for(const id of Object.keys(details))check(prefix+'/inactive raw retained/'+id,same(reverted.draftSnapshot.packetAnswers[id],details[id])&&!Object.hasOwn(prepare(reverted).availableFacts,id));
 for(const id of Object.values(conditions))check(prefix+'/explicit change history/'+id,reverted.draftSnapshot.dependencies.semanticAnswerHistory.some(e=>e.factId===id&&e.source==='packetAnswers'&&e.value==='Yes'));
 for(const value of ['denied','pending','none']){const history=patch(reverted,{ny_16059_application_status:value});check(prefix+'/history save/'+value,!!history);if(!history)continue;const prev=reverted.draftSnapshot;const key=maps.find(source=>Object.hasOwn(prev[source],'ny_16059_application_status'));check(prefix+'/original application archived/'+value,value===prev[key]?.ny_16059_application_status||history.draftSnapshot.dependencies.semanticAnswerHistory.some(e=>e.factId==='ny_16059_application_status'&&e.source===key&&e.value===prev[key].ny_16059_application_status));const hp=prepare(history);check(prefix+'/prior application reuse/'+value,hp?.priorApplications.cpl16059.occurred===(value!=='none'));check(prefix+'/16058 no grant not no application/'+value,hp?.priorApplications.cpl16058.occurred===null);}
}
const verified=fixture.rows[0].verifiedRecord;
const current=patch(verified,facts);
for(const[key,value]of Object.entries({serverFacts:{jurisdiction:'NY',pathway_id:current.draftSnapshot.pathwayId,ny_16059_first_case_numbers:'SERVER-FAKE'},packetFamilyIdentifiers:{mode:'wrong',sourceFormIds:[]}})){
 const bad=structuredClone(current);bad.draftSnapshot[key]=value;bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);
 check('current rehashed tuple/'+key,prepare(bad)===null&&P.protectedPacketInformationModelFor(bad)===null&&P.protectedPacketScreeningAnswers(bad.draftSnapshot)===null);
}
for(const[key,value]of Object.entries({profileVersion:'wrong',profileSourceFingerprint:'wrong',profileAuthorityFingerprint:'wrong',pathwayId:'wrong',packetPlan:null,requiredInputIds:[],serverFacts:{jurisdiction:'NY'},packetFamilyIdentifiers:{mode:null,sourceFormIds:[]}})){const bad=structuredClone(verified);bad.snapshot[key]=value;bad.hash=hash(bad.snapshot);check('rehash tamper/'+key,prepare(bad)===null);}
const s=prepare(patch(verified,facts));const factValues=Object.fromEntries(Object.entries(s.conditions).map(([k,v])=>[k,v.value]));
const custody=JSON.parse(fs.readFileSync(s.source.candidateCustody.receipt,'utf8'));
for(const [kind,filename] of [['paper','cpl160.59sealingapplication.pdf'],['fillable','cpl160.59sealingapplication-fillable.pdf']]) {
 const pin=custody.sources.find(row=>row.filename===filename), candidate=s.source.candidateCustody[kind];
 check('current candidate exact custody/'+kind,candidate.sha256===pin.sha256&&candidate.byteLength===pin.bytes&&candidate.widgetCount===pin.interactiveWidgetCount);
 const mapping=JSON.parse(fs.readFileSync(candidate.mapping,'utf8'));
 check('current candidate distinct map/'+kind,mapping.sourceSha256===candidate.sha256&&!mapping.generationAllowed&&!mapping.runtimeSelectable&&mapping.qualifiedApproval===null);
}
check('owner intake never becomes runtime source or approval',s.source.candidateCustody.runtimeByteVerificationRequired&&s.source.candidateCustody.hostedByteEquivalence==='NOT_VERIFIED'&&!s.source.sourceVerified&&s.source.qualifiedApproval===null&&s.source.widgetBindings===null);
check('paper and fillable candidates not interchangeable',s.source.candidateCustody.paper.mapping!==s.source.candidateCustody.fillable.mapping&&s.source.candidateCustody.paper.sha256!==s.source.candidateCustody.fillable.sha256);
for(const[doc,field,want]of [['NY-CPL-160.59-PRO-SE-PACKET','AKAs','inactive'],['NY-CPL-160.59-PRO-SE-PACKET','NYSID','inactive'],['NY-CPL-160.59-APPLICATION','Applicant_AKA','unknown'],['NY-CPL-160.59-APPLICATION','NYSID','unresolved_source_revision'],['NY-CPL-160.59-COD-REQUEST','AKA(s)','unknown'],['NY-CPL-160.59-APPLICATION','Release_Date_1','unknown'],['NY-CPL-160.59-APPLICATION','Court_Name_2','inactive'],['NY-CPL-160.59-APPLICATION','Law_Section_Subsection_1','active']])check('typed meaning only/'+doc+'/'+field,nyCompletionApplicability(nyCompletionDeclaration(doc,field),factValues)===want);
const report={status:checks.every(c=>c.pass)?'PASS':'FAIL',checks:checks.length,failed:checks.filter(c=>!c.pass),details:checks,limits:['Pure protected functions and source meaning only; no authenticated DB/browser or actual source-byte acceptance. No qualified approval, release, state or finding completion.']};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:report.checks,failed:report.failed},null,2));assert.equal(report.failed.length,0);
