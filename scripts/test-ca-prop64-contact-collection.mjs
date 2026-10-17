import assert from 'node:assert/strict';
import fs from 'node:fs';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
process.env.RCAP_EVALUATOR_TODAY='2026-10-12';
const P=await import('../src/lib/expungement-ai/packet-information.ts');
const C=await import('../src/lib/expungement-ai/ca-prop64-contact-answer.ts');
const {caProp64ContactQuestions:questions}=await import('../src/lib/expungement-ai/ca-prop64-contact-questions.ts');
const {caProp64ProtectedDocumentPreparation:prepare}=await import('../src/lib/expungement-ai/ca-prop64-document-preparation.ts');
const {questionAnswerState}=await import('../src/lib/expungement-ai/question-answer-state.ts');
const {profileQuestionSchema}=await import('../src/lib/expungement-ai/frontend/schemas.ts');
const {caProp64CaptionBindings:bind}=await import('./lib/ca-prop64-caption-bindings.mjs');
assert.equal(C.CA_CONTACT_CONTRACT,'ca_prop64_contacts_v2');
const rows=JSON.parse(fs.readFileSync('scripts/fixtures/ca-prop64-contact-predecessors.json')).rows;
const checks=[],current=[];const check=(name,a,b)=>checks.push({name,pass:JSON.stringify(a)===JSON.stringify(b),actual:a,expected:b});
for(const {id,verification:original}of rows){
 const before=JSON.stringify(original),m=P.protectedPacketInformationModelFor(original);
 check(id+' genuine verified baseline',original.status,'verified');check(id+' readable successor',Boolean(m),true);if(!m)continue;
 for(const fact of C.CA_CONTACT_IDS){check(id+' required '+fact,m.missingInputIds.includes(fact),true);check(id+' builder '+fact,m.builderQuestions.some(q=>q.id===fact),true);check(id+' editable '+fact,P.editablePacketInputIds(m).has(fact),true);}
 check(id+' no inherited verification',m.stage==='ready_to_generate',false);
 const context=C.caContactContext(m.initialAnswers);
 const filer={...C.emptyCaContact(C.CA_FILER_CONTACT,context),attorneyName:'Alex Counsel',barNumber:'012345',street:'100 Oak Avenue',city:'Woodland',state:'CA',zip:'95695',phone:{status:'known',value:'530-555-0100'},fax:{status:'absent',value:''},email:{status:'known',value:'filing@example.test'},firm:{status:'absent',value:''}};
 const court={...C.emptyCaContact(C.CA_COURT_CONTACT,context),street:'1000 Main Street',cityStateZip:'Woodland, CA 95695',mailingRelationship:'same',mailingAddress:''};
 const answers={[C.CA_FILER_CONTACT]:[JSON.stringify(filer)],[C.CA_COURT_CONTACT]:[JSON.stringify(court)]};
 for(const q of questions(m.initialAnswers)){check(id+' schema '+q.id,profileQuestionSchema.safeParse(q).success,true);check(id+' complete '+q.id,questionAnswerState(q,answers[q.id]),'known_valid');}
 const patch=P.packetInformationPatch({protectedVerification:original,answers});check(id+' saves',Boolean(patch),true);if(!patch)continue;
 const record=patch.protectedTransition.nextVerification,model=P.protectedPacketInformationModelFor(record),prep=prepare(record);
 check(id+' current contacts complete',model.missingInputIds.filter(x=>C.CA_CONTACT_IDS.includes(x)),[]);
 check(id+' save remains unverified',record.status==='verified',false);check(id+' prep incomplete',prep.missingContactFactIds,[]);
 const verified=P.packetInformationPatch({protectedVerification:record,answers:{},verify:true});check(id+' actual final verification',verified?.protectedTransition.nextVerification.status,'verified');
 const actor=filer.representation==='attorney'?'attorney':'participant';
 check(id+' exact actor phone',prep.facts[actor+'.phone'],filer.phone.value);check(id+' known optional obligation',prep.facts[actor+'.email'],filer.email.value);check(id+' explicit absent',prep.absentContactFactIds.includes(actor+'.fax'),true);
 const output=bind({familyId:'ca-prop64-set',facts:prep.facts,absentContactFactIds:prep.absentContactFactIds});check(id+' no missing collected contacts',output.missing,[]);
 check(id+' current self representation',actor==='participant'?prep.facts['participant.represented_party']:prep.facts['attorney.represented_party'],actor==='participant'?'Self-represented':context.defendantName);
 for(const status of ['', 'unknown','absent']){const optional={...filer,email:{status,value:'earlier@example.test'}};const wire=[JSON.stringify(optional)];check(id+' optional state '+status,C.caContactAnswerState(C.CA_FILER_CONTACT,wire,context),'known_valid');const saved=P.packetInformationPatch({protectedVerification:record,answers:{[C.CA_FILER_CONTACT]:wire}})?.protectedTransition.nextVerification;check(id+' optional not printed '+status,prepare(saved)?.facts[actor+'.email'],undefined);check(id+' raw optional preserved '+status,P.protectedPacketInformationModelFor(saved)?.initialAnswers[C.CA_FILER_CONTACT],wire);}
 for(const field of ['phone','street',...(actor==='attorney'?['barNumber','attorneyName']:[])])check(id+' unknown core '+field,C.caContactAnswerState(C.CA_FILER_CONTACT,[JSON.stringify({...filer,[field]:field==='phone'?{status:'unknown',value:'earlier number'}:'unknown'})],context),'uncertain');
 for(const [field,v] of [['ca_prop64_filer_representation',actor==='attorney'?'self_represented':'attorney'],['participant_full_legal_name','New Name'],['ca_prop64_filing_court_county','Alameda']]){
  const change=P.packetInformationPatch({protectedVerification:record,answers:{[field]:v}})?.protectedTransition.nextVerification;check(id+' identity save '+field,Boolean(change),true);if(!change)continue;
  const changed=P.protectedPacketInformationModelFor(change);const stale=field==='ca_prop64_filing_court_county'?C.CA_COURT_CONTACT:C.CA_FILER_CONTACT;
  check(id+' identity invalidates '+field,changed.missingInputIds.includes(stale),true);check(id+' identity keeps raw '+field,changed.initialAnswers[stale],answers[stale]);check(id+' identity no old projection '+field,prepare(change).facts[field==='ca_prop64_filing_court_county'?'court.street_address':actor+'.phone'],undefined);
 }
 for(const phone of [{status:'absent',value:'earlier number'},{status:'',value:''},{status:'unknown',value:'earlier number'},{status:'known',value:''},{status:'known',value:'None'},{status:'known',value:' N/A '},{status:'known',value:'sin teléfono'},{status:'known',value:'530-555-0102 ext 4'}]){
  const wire=[JSON.stringify({...filer,phone})],complete=phone.status==='absent'||phone.value==='530-555-0102 ext 4';
  check(id+' phone completion '+JSON.stringify(phone),C.caContactAnswerState(C.CA_FILER_CONTACT,wire,context),complete?'known_valid':'uncertain');
  const saved=P.packetInformationPatch({protectedVerification:record,answers:{[C.CA_FILER_CONTACT]:wire}})?.protectedTransition.nextVerification;
  const projection=prepare(saved), expected=phone.status==='absent'?'None':phone.value==='530-555-0102 ext 4'?phone.value:undefined;
  check(id+' phone projection '+JSON.stringify(phone),projection?.facts[actor+'.phone'],expected);
  check(id+' raw phone preserved '+JSON.stringify(phone),P.protectedPacketInformationModelFor(saved)?.initialAnswers[C.CA_FILER_CONTACT],wire);
  check(id+' email alternative preserved '+JSON.stringify(phone),projection?.facts[actor+'.email'],filer.email.value);
  check(id+' phone never grants generation '+JSON.stringify(phone),projection?.generationAllowed,false);
  const caption=bind({familyId:'ca-prop64-set',facts:projection.facts,absentContactFactIds:projection.absentContactFactIds});
  for(const form of ['CR-400','CR-401','CR-403']){
   const phoneField=Object.entries(caption.mappings[form]).find(([field])=>field.endsWith('.Phone[0]'));
   check(id+' '+form+' phone binding '+JSON.stringify(phone),Boolean(phoneField),complete);
   if(complete)check(id+' '+form+' literal '+JSON.stringify(phone),caption.facts[phoneField[1]],expected);
   else check(id+' '+form+' missing reason '+JSON.stringify(phone),caption.missing.find(x=>x.formNumber===form&&x.factId===actor+'.phone')?.status,'MISSING_HELD_FACT_APPLICABILITY_REVIEW');
  }
 }
 // The old wire stays old: parsing and read-only saves must not upgrade it.
 for(const phone of ['530-555-0100','None','N/A','unknown','']){
  const legacy={...filer,version:'ca_prop64_contacts_v1',phone},wire=[JSON.stringify(legacy)],before=JSON.stringify(wire);
  check(id+' v1 parse exact '+phone,C.parseCaContact(C.CA_FILER_CONTACT,wire),legacy);
  check(id+' v1 classification '+phone,C.caContactAnswerState(C.CA_FILER_CONTACT,wire,context),phone==='unknown'||phone===''?'uncertain':'known_valid');
  const saved=P.packetInformationPatch({protectedVerification:record,answers:{[C.CA_FILER_CONTACT]:wire}})?.protectedTransition.nextVerification;
  check(id+' v1 saved bytes '+phone,P.protectedPacketInformationModelFor(saved)?.initialAnswers[C.CA_FILER_CONTACT],wire);
  check(id+' v1 noop '+phone,P.packetInformationPatch({protectedVerification:saved,answers:{}})?.protectedTransition.nextVerification,saved);
  check(id+' v1 input untouched '+phone,JSON.stringify(wire),before);
 }
 for(const phone of ['530-555-0100',{status:'absent',value:'',extra:true},{status:'fictional',value:'x'}])check(id+' v2 malformed phone',C.parseCaContact(C.CA_FILER_CONTACT,[JSON.stringify({...filer,phone})]),null);
 const legacyCourt={...court,version:'ca_prop64_contacts_v1'};check(id+' v1 court parse',C.parseCaContact(C.CA_COURT_CONTACT,[JSON.stringify(legacyCourt)]),legacyCourt);
 const replacement=P.packetInformationPatch({protectedVerification:record,answers:{[C.CA_FILER_CONTACT]:[JSON.stringify({...filer,phone:{status:'known',value:'530-555-0101'}})]}})?.protectedTransition.nextVerification;
 check(id+' full old contact history',replacement?.draftSnapshot.dependencies.semanticAnswerHistory.some(h=>h.factId===C.CA_FILER_CONTACT&&JSON.stringify(h.value)===JSON.stringify(answers[C.CA_FILER_CONTACT])),true);
 for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers'])for(const [key,value]of Object.entries(original.snapshot[source]))check(id+' old raw '+source+'/'+key,record.draftSnapshot[source][key],value);
 for(const [name,edit]of [['family',s=>s.packetFamilyIdentifiers.mode='wrong'],['server',s=>s.serverFacts.extra='x'],['plan',s=>s.packetPlan.requiredInputIds.pop()],['required',s=>s.requiredInputIds.pop()],['source',s=>s.profileSourceFingerprint='0'.repeat(64)],['authority',s=>s.profileAuthorityFingerprint='0'.repeat(64)]]){
  const bad=structuredClone(original);bad.status='unverified';bad.snapshot=null;bad.hash=null;edit(bad.draftSnapshot);bad.draftHash=P.protectedPacketDraftHash(bad.draftSnapshot);check(id+' rehashed tuple refuses '+name,P.protectedPacketInformationModelFor(bad),null);
 }
 check(id+' baseline unchanged',JSON.stringify(original),before);check(id+' no authority',prep.generationAllowed,false);current.push({id,record,preparation:prep,verifiedRecord:verified?.protectedTransition.nextVerification});
 for(const raw of [true,42,{},['{}'],[JSON.stringify({...filer,extra:'x'})],[JSON.stringify(filer),JSON.stringify(filer)],[' '+JSON.stringify(filer)], [JSON.stringify({...filer,phone:{status:'known',value:'a\nb'}})]])check(id+' strict shape '+JSON.stringify(raw).slice(0,45),C.parseCaContact(C.CA_FILER_CONTACT,raw),null);
}
// Display translates only enum identities, never an owner's literal facts.
for(const locale of ['en','es']){
 const context={representation:'self_represented',defendantName:'known',county:'same'};
 const base={...C.emptyCaContact(C.CA_FILER_CONTACT,context),street:'same',city:'known',zip:'absent'};
 const formatted=C.formatCaContact(C.CA_FILER_CONTACT,[JSON.stringify(base)],locale);
 for(const key of ['street','city','zip','defendantName'])check(locale+' exact literal '+key,formatted.includes(C.CA_CONTACT_LABELS[key][locale]+': '+base[key]),true);
 for(const key of ['attorneyName','barNumber','firm'])check(locale+' inactive blank omitted '+key,formatted.includes(C.CA_CONTACT_LABELS[key][locale]),false);
 const prior={...base,attorneyName:'Prior Counsel',barNumber:'0009',firm:{status:'known',value:'Prior Firm'},email:{status:'absent',value:'earlier@example.test'}};
 const text=C.formatCaContact(C.CA_FILER_CONTACT,[JSON.stringify(prior)],locale),retained=locale==='es'?'Guardado, no se usará ni imprimirá':'Saved, will not be used or printed';
 for(const value of ['Prior Counsel','0009','earlier@example.test'])check(locale+' retained inactive meaning '+value,text.includes(retained+': '+value),true);
 check(locale+' inactive firm meaning',text.split('\n').find(line=>line.startsWith(C.CA_CONTACT_LABELS.firm[locale]+':')).includes(retained),true);
 const court={...C.emptyCaContact(C.CA_COURT_CONTACT,context),mailingRelationship:'same',mailingAddress:'Earlier court address'};
 check(locale+' inactive court address meaning',C.formatCaContact(C.CA_COURT_CONTACT,[JSON.stringify(court)],locale).includes(retained+': Earlier court address'),true);
}
const failed=checks.filter(x=>!x.pass),report={status:failed.length?'FAIL':'PASS',checks:checks.length,failed,details:checks,current,limits:['Engineering fact collection only. Source/legal/language/visual/fulfillment approvals pending.','Authenticated owner and rendered source PDF acceptance separately required.']};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,checks:checks.length,failed:failed.map(x=>({name:x.name,actual:x.actual,expected:x.expected}))}));assert.equal(failed.length,0);
